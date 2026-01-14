import { create } from 'zustand';
import {
  SeminarConfig,
  SeminarState,
  SeminarRound,
  SemanticCluster,
  AgentProfile
} from '../types';
import { useSettingsStore } from '../store/settingsStore';
import { LLMService } from './llm';

// Helper to generate a unique ID
const uuid = () => Math.random().toString(36).substring(2, 9);

export class SeminarEngine {
  private updateState: (partial: Partial<SeminarState>) => void;
  private getState: () => SeminarState;

  constructor(
    updateState: (partial: Partial<SeminarState>) => void,
    getState: () => SeminarState
  ) {
    this.updateState = updateState;
    this.getState = getState;
  }

  /**
   * Starts a new Seminar.
   */
  async startSeminar(topic: string, config: SeminarConfig) {
    this.updateState({
      topic,
      config,
      status: 'running',
      rounds: [],
      currentRoundIndex: 0,
      error: undefined
    });

    await this.runRound(1);
  }

  /**
   * Executes a single round of the seminar.
   */
  private async runRound(roundIndex: number) {
    const state = this.getState();
    const settings = useSettingsStore.getState();

    // 1. Identify Active Agents
    const activeAgents = settings.agents.filter(a => state.config.activeAgentIds.includes(a.id));
    if (activeAgents.length === 0) {
      this.updateState({ status: 'completed', error: 'No active agents selected.' });
      return;
    }

    // Initialize Round State
    const newRound: SeminarRound = {
      roundIndex,
      inputs: [],
      arbitration: {
        clusters: [],
        consensusFacts: [],
        nextRoundFocus: '',
        convergenceScore: 0
      },
      status: 'processing'
    };

    const updatedRounds = [...state.rounds, newRound];
    this.updateState({
      rounds: updatedRounds,
      currentRoundIndex: roundIndex
    });

    try {
      // 2. Parallel Generation (Agents Speak)
      const inputs = await Promise.all(activeAgents.map(async (agent) => {
        const prompt = this.constructAgentPrompt(agent, state, roundIndex);
        const content = await LLMService.generateCompletion(
          this.getProviderForAgent(agent, settings.providers),
          agent,
          [{ role: 'user', content: prompt }]
        );
        return { agentId: agent.id, content };
      }));

      // Update Round with Inputs
      newRound.inputs = inputs;
      this.updateRoundInState(roundIndex, newRound);

      // 3. Arbitration (The Synthesizer)
      const arbitration = await this.performArbitration(inputs, state.config.arbiterModelId, roundIndex);

      newRound.arbitration = arbitration;
      newRound.status = 'completed';
      this.updateRoundInState(roundIndex, newRound);

      // 4. Convergence Check
      if (
        arbitration.convergenceScore >= state.config.consensusThreshold ||
        roundIndex >= state.config.maxRounds
      ) {
        this.updateState({ status: 'completed' });
      } else {
        // Schedule next round
        await this.runRound(roundIndex + 1);
      }

    } catch (error: any) {
      console.error('Seminar Round Failed:', error);
      newRound.status = 'failed';
      this.updateRoundInState(roundIndex, newRound);
      this.updateState({ status: 'paused', error: error.message });
    }
  }

  private updateRoundInState(index: number, data: SeminarRound) {
    const rounds = [...this.getState().rounds];
    const existingIndex = rounds.findIndex(r => r.roundIndex === index);
    if (existingIndex !== -1) {
      rounds[existingIndex] = data;
    } else {
      rounds.push(data);
    }
    this.updateState({ rounds });
  }

  private getProviderForAgent(agent: AgentProfile, providers: any[]) {
    const provider = providers.find(p => p.id === agent.providerId);
    if (!provider) throw new Error(`Provider not found for agent ${agent.name}`);
    return provider;
  }

  /**
   * Prompts
   */
  private constructAgentPrompt(agent: AgentProfile, state: SeminarState, roundIndex: number): string {
    const topic = state.topic;

    if (roundIndex === 1) {
      return `
Topic: "${topic}"

Task: Analyze this topic from first principles.
- Provide your unique perspective based on your persona.
- Identify key challenges, facts, and uncertainties.
- Do not hedge; be decisive.
`;
    } else {
      // Previous Round Context
      const prevRound = state.rounds.find(r => r.roundIndex === roundIndex - 1);
      if (!prevRound) return 'Error: Previous round missing.';

      const { clusters, consensusFacts, nextRoundFocus } = prevRound.arbitration;

      return `
Topic: "${topic}"

Current Seminar Status (Round ${roundIndex - 1}):
- Consensus Established: ${JSON.stringify(consensusFacts)}
- Viewpoint Clusters: ${JSON.stringify(clusters.map(c => ({ label: c.label, argument: c.coreArgument })))}

The Conflict Focus for this Round: "${nextRoundFocus}"

Task:
1. Critically evaluate the conflicting clusters.
2. Defend or refute the current viewpoints.
3. If you agree with the consensus, expand on it. If you disagree, prove why.
`;
    }
  }

  // --- JSON Cleaning Helper ---
  private cleanJsonOutput(text: string): string {
    let clean = text.trim();

    // Remove Markdown code blocks if present
    // Matches ```json ... ``` or just ``` ... ```
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const match = clean.match(codeBlockRegex);
    if (match && match[1]) {
      clean = match[1].trim();
    }

    // Attempt to find the first '{' and last '}' to handle any remaining preamble
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }

    return clean;
  }

  private async performArbitration(
    inputs: { agentId: string, content: string }[],
    arbiterId: string,
    roundIndex: number
  ) {
    const settings = useSettingsStore.getState();
    const arbiterProfile = settings.agents.find(a => a.id === arbiterId);

    // Fallback if arbiter not found (should be validated before start)
    if (!arbiterProfile) throw new Error('Arbiter Agent not found in settings.');

    // Force strict JSON mode params for the arbiter call, but keep the model
    // We create a temporary profile clone
    const strictArbiter = {
      ...arbiterProfile,
      parameters: { ...arbiterProfile.parameters, temperature: 0 }
    };

    const prompt = `
You are the Semantic Arbiter of a research seminar.
Analyze the following inputs from ${inputs.length} researchers.

Inputs:
${inputs.map(i => `[Agent ${i.agentId}]: ${i.content}`).join('\n\n')}

Task:
1. Cluster similar arguments together.
2. Extract facts everyone agrees on.
3. Identify the core question that still divides the group ("nextRoundFocus").
4. Rate convergence (0.0 = chaos, 1.0 = total agreement).

Return strictly valid JSON:
{
  "clusters": [
    { "label": "Short Tag", "coreArgument": "Summary...", "supportingAgentIds": ["id..."], "strength": 80 }
  ],
  "consensusFacts": ["fact1", "fact2"],
  "nextRoundFocus": "Question...?",
  "convergenceScore": 0.5
}
`;

    const rawOutput = await LLMService.generateCompletion(
      this.getProviderForAgent(strictArbiter, settings.providers),
      strictArbiter,
      [{ role: 'user', content: prompt }],
      true // JSON Mode
    );

    const jsonStr = this.cleanJsonOutput(rawOutput);

    try {
      const result = JSON.parse(jsonStr);
      // Ensure IDs are mapped correctly?
      // The LLM sees Agent IDs in input, it should put them in output.
      return {
        clusters: result.clusters.map((c: any) => ({ ...c, id: uuid() })),
        consensusFacts: result.consensusFacts || [],
        nextRoundFocus: result.nextRoundFocus || 'Continue discussion',
        convergenceScore: result.convergenceScore || 0
      };
    } catch (e) {
      console.error('Failed to parse Arbiter JSON', jsonStr, e);
      throw new Error('Arbiter failed to produce valid JSON.');
    }
  }
}
