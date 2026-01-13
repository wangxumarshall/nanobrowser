// 1. LLM Provider Configuration
export interface LLMProvider {
  id: string;             // UUID
  name: string;           // Display Name (e.g., "OpenAI", "Local Ollama")
  type: "openai" | "anthropic" | "ollama";
  baseUrl: string;        // e.g., "https://api.openai.com/v1" or "http://localhost:11434/v1"
  apiKey?: string;        // Optional for local models
}

// 2. Agent Profile (The "Debater")
export interface AgentProfile {
  id: string;             // UUID
  name: string;           // Display Name (e.g., "High Temp GPT-4")
  providerId: string;     // Links to LLMProvider.id
  modelString: string;    // e.g., "gpt-4o", "llama3"
  parameters: {
    temperature: number;  // 0.0 - 2.0
    top_p: number;
    max_tokens: number;
  };
  customSystemPrompt?: string; // Optional user override
  color?: string;         // UI decoration color
  avatar?: string;        // Optional avatar URL/emoji
}

// 3. Seminar Configuration
export interface SeminarConfig {
  maxRounds: number;          // Default 5
  consensusThreshold: number; // 0.0 - 1.0 (e.g., 0.8)
  arbiterModelId: string;     // The ID of the AgentProfile used as Arbiter (must be a profile ID to link to provider/model)
                              // Note: We use the Profile's connection info, but FORCE temp=0.
  activeAgentIds: string[];   // IDs of agents participating in the current session
}

// 4. Runtime: Semantic Cluster
export interface SemanticCluster {
  id: string;
  label: string;            // Short tag (e.g., "Technical Infeasibility")
  coreArgument: string;     // Summary of the argument
  supportingAgentIds: string[]; // Who agrees with this?
  strength: number;         // 0-100 confidence/strength
}

// 5. Runtime: Seminar Round
export interface SeminarRound {
  roundIndex: number;       // 1-based index
  inputs: {
    agentId: string;
    content: string;      // The raw output from the agent
  }[];
  arbitration: {
    clusters: SemanticCluster[];
    consensusFacts: string[];
    nextRoundFocus: string;
    convergenceScore: number; // 0.0 - 1.0
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// 6. Runtime: Full Seminar State
export interface SeminarState {
  topic: string;
  rounds: SeminarRound[];
  status: 'idle' | 'running' | 'paused' | 'completed';
  currentRoundIndex: number;
  config: SeminarConfig;
  error?: string;
}
