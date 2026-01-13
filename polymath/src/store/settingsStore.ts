import { create } from 'zustand';
import { AgentProfile, LLMProvider, SeminarConfig } from '../types';

interface SettingsState {
  providers: LLMProvider[];
  agents: AgentProfile[];

  // Actions
  addProvider: (provider: LLMProvider) => void;
  updateProvider: (id: string, updates: Partial<LLMProvider>) => void;
  deleteProvider: (id: string) => void;

  addAgent: (agent: AgentProfile) => void;
  updateAgent: (id: string, updates: Partial<AgentProfile>) => void;
  deleteAgent: (id: string) => void;

  // Hydration
  loadSettings: () => Promise<void>;
  isLoaded: boolean;
}

// Default Data for onboarding
const DEFAULT_PROVIDERS: LLMProvider[] = [
  {
    id: 'default-openai',
    name: 'OpenAI (Official)',
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '' // User must fill
  },
  {
    id: 'default-ollama',
    name: 'Ollama (Local)',
    type: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: 'ollama' // Not needed but standard
  }
];

const DEFAULT_AGENTS: AgentProfile[] = [
  {
    id: 'agent-skeptic',
    name: 'The Skeptic (GPT-3.5)',
    providerId: 'default-openai',
    modelString: 'gpt-3.5-turbo',
    parameters: { temperature: 0.3, top_p: 1, max_tokens: 500 },
    customSystemPrompt: 'You are a highly skeptical researcher. Question every assumption.',
    color: 'bg-red-100'
  },
  {
    id: 'agent-visionary',
    name: 'The Visionary (GPT-4)',
    providerId: 'default-openai',
    modelString: 'gpt-4-turbo',
    parameters: { temperature: 0.9, top_p: 1, max_tokens: 500 },
    customSystemPrompt: 'You are a visionary futurist. Imagine the impossible.',
    color: 'bg-blue-100'
  }
];

export const useSettingsStore = create<SettingsState>((set, get) => ({
  providers: [],
  agents: [],
  isLoaded: false,

  addProvider: (provider) => {
    const newProviders = [...get().providers, provider];
    set({ providers: newProviders });
    saveToStorage({ providers: newProviders });
  },

  updateProvider: (id, updates) => {
    const newProviders = get().providers.map(p => p.id === id ? { ...p, ...updates } : p);
    set({ providers: newProviders });
    saveToStorage({ providers: newProviders });
  },

  deleteProvider: (id) => {
    const newProviders = get().providers.filter(p => p.id !== id);
    set({ providers: newProviders });
    saveToStorage({ providers: newProviders });
  },

  addAgent: (agent) => {
    const newAgents = [...get().agents, agent];
    set({ agents: newAgents });
    saveToStorage({ agents: newAgents });
  },

  updateAgent: (id, updates) => {
    const newAgents = get().agents.map(a => a.id === id ? { ...a, ...updates } : a);
    set({ agents: newAgents });
    saveToStorage({ agents: newAgents });
  },

  deleteAgent: (id) => {
    const newAgents = get().agents.filter(a => a.id !== id);
    set({ agents: newAgents });
    saveToStorage({ agents: newAgents });
  },

  loadSettings: async () => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      // Dev mode fallback
      set({ providers: DEFAULT_PROVIDERS, agents: DEFAULT_AGENTS, isLoaded: true });
      return;
    }

    // Load structure from sync, keys from local
    const syncData = await chrome.storage.sync.get(['providers', 'agents']);
    const localData = await chrome.storage.local.get(['apiKeys']);

    let providers: LLMProvider[] = syncData.providers || DEFAULT_PROVIDERS;
    let agents: AgentProfile[] = syncData.agents || DEFAULT_AGENTS;

    // Merge API keys from local storage
    if (localData.apiKeys) {
      providers = providers.map(p => ({
        ...p,
        apiKey: localData.apiKeys[p.id] || p.apiKey || ''
      }));
    }

    set({ providers, agents, isLoaded: true });
  }
}));

// Helper to save persistence
const saveToStorage = async (data: { providers?: LLMProvider[], agents?: AgentProfile[] }) => {
  if (typeof chrome === 'undefined' || !chrome.storage) return;

  if (data.providers) {
    // Separate API keys for local storage security
    const apiKeys: Record<string, string> = {};
    const safeProviders = data.providers.map(p => {
      if (p.apiKey) {
        apiKeys[p.id] = p.apiKey;
      }
      // Return provider without key for sync storage
      const { apiKey, ...safeProvider } = p;
      return safeProvider;
    });

    await chrome.storage.sync.set({ providers: safeProviders });

    // Update existing keys map
    const currentLocal = await chrome.storage.local.get(['apiKeys']);
    const newKeys = { ...currentLocal.apiKeys, ...apiKeys };
    await chrome.storage.local.set({ apiKeys: newKeys });
  }

  if (data.agents) {
    await chrome.storage.sync.set({ agents: data.agents });
  }
};
