import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SeminarEngine } from '../services/engine';
import { useSettingsStore } from '../store/settingsStore';
import { LLMService } from '../services/llm';

// Mock Dependencies
vi.mock('../services/llm');
vi.mock('../store/settingsStore');

describe('SeminarEngine', () => {
  let engine: SeminarEngine;
  let mockUpdateState: any;
  let mockGetState: any;

  const mockState = {
    topic: 'Test Topic',
    config: {
      maxRounds: 2,
      consensusThreshold: 0.8,
      arbiterModelId: 'arbiter',
      activeAgentIds: ['a1', 'a2']
    },
    rounds: [],
    status: 'idle',
    currentRoundIndex: 0
  };

  const mockSettings = {
    agents: [
      { id: 'a1', name: 'Agent 1', providerId: 'p1' },
      { id: 'a2', name: 'Agent 2', providerId: 'p1' },
      { id: 'arbiter', name: 'Arbiter', providerId: 'p1' }
    ],
    providers: [{ id: 'p1', type: 'openai' }]
  };

  beforeEach(() => {
    mockUpdateState = vi.fn((partial) => Object.assign(mockState, partial));
    mockGetState = vi.fn(() => mockState);
    engine = new SeminarEngine(mockUpdateState, mockGetState);

    // Mock Store
    (useSettingsStore.getState as any).mockReturnValue(mockSettings);

    // Mock LLM
    (LLMService.generateCompletion as any).mockImplementation(async (provider: any, agent: any, msgs: any, json: boolean) => {
      if (json) {
        // Arbiter Response
        return JSON.stringify({
          clusters: [{ label: 'Cluster A', coreArgument: 'Arg A', supportingAgentIds: ['a1'], strength: 50 }],
          consensusFacts: ['Fact 1'],
          nextRoundFocus: 'Focus?',
          convergenceScore: 0.5
        });
      }
      return `Response from ${agent.name}`;
    });
  });

  it('should run a full round successfully', async () => {
    await engine.startSeminar('Test Topic', mockState.config);

    // Check status
    expect(mockUpdateState).toHaveBeenCalledWith(expect.objectContaining({ status: 'running' }));

    // Check Round 1 creation
    expect(mockUpdateState).toHaveBeenCalledWith(expect.objectContaining({
      currentRoundIndex: 1
    }));

    // Check Inputs (Agents called)
    // Round 1 (2 Agents + 1 Arbiter) + Round 2 (2 Agents + 1 Arbiter) = 6 calls
    // It runs round 2 because convergence 0.5 < 0.8
    expect(LLMService.generateCompletion).toHaveBeenCalledTimes(6);

    // Check Arbitration Result in State
    // Since mockUpdateState modifies the local mockState object in place (via Object.assign in the mock),
    // we can inspect mockState.rounds
    expect(mockState.rounds.length).toBeGreaterThan(0);
    const round1 = mockState.rounds[0] as any;
    expect(round1.inputs).toHaveLength(2);
    expect(round1.arbitration.convergenceScore).toBe(0.5);
  });

  it('should handle markdown wrapped JSON from Arbiter', async () => {
    // Mock Arbiter returning markdown
    (LLMService.generateCompletion as any).mockImplementation(async (provider: any, agent: any, msgs: any, json: boolean) => {
      if (json) {
        return "Here is the JSON:\n```json\n" + JSON.stringify({
          clusters: [],
          consensusFacts: ['Markdown Fact'],
          nextRoundFocus: 'Focus?',
          convergenceScore: 0.9
        }) + "\n```";
      }
      return "Agent response";
    });

    await engine.startSeminar('Topic', { ...mockState.config, maxRounds: 1 });

    const round = mockState.rounds[0] as any;
    expect(round.arbitration.consensusFacts).toContain('Markdown Fact');
    expect(round.arbitration.convergenceScore).toBe(0.9);
  });
});
