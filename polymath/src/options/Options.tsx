import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useSettingsStore } from '../store/settingsStore';
import { AgentProfile, LLMProvider } from '../types';
import { Plus, Trash2, Save, ExternalLink } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import '../../src/index.css';

// Utils
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Components
const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("bg-white border rounded-lg shadow-sm p-4", className)}>{children}</div>
);

const Button = ({ children, onClick, variant = 'primary', className, ...props }: any) => {
  const base = "px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    destructive: "bg-red-50 text-red-600 hover:bg-red-100",
    outline: "border border-gray-300 bg-transparent hover:bg-gray-50"
  };
  return (
    <button onClick={onClick} className={cn(base, variants[variant as keyof typeof variants], className)} {...props}>
      {children}
    </button>
  );
};

const Input = ({ label, ...props }: any) => (
  <div className="space-y-1">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
    <input className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" {...props} />
  </div>
);

const Select = ({ label, options, ...props }: any) => (
  <div className="space-y-1">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
    <select className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" {...props}>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// Main App
const OptionsApp = () => {
  const {
    providers, agents, loadSettings, isLoaded,
    updateProvider, addProvider, deleteProvider,
    updateAgent, addAgent, deleteAgent
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'providers' | 'agents'>('agents');

  useEffect(() => {
    loadSettings();
  }, []);

  if (!isLoaded) return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Polymath Configuration</h1>
          <p className="text-gray-500">Manage your Multi-Agent Seminar Environment</p>
        </div>
        <div className="flex gap-2">
          <Button variant={activeTab === 'agents' ? 'primary' : 'secondary'} onClick={() => setActiveTab('agents')}>Agents</Button>
          <Button variant={activeTab === 'providers' ? 'primary' : 'secondary'} onClick={() => setActiveTab('providers')}>Providers</Button>
        </div>
      </header>

      {activeTab === 'providers' && (
        <div className="space-y-6">
          <div className="flex justify-end">
             <Button onClick={() => addProvider({
               id: Math.random().toString(36).substring(7),
               name: 'New Provider',
               type: 'openai',
               baseUrl: 'https://api.openai.com/v1',
               apiKey: ''
             })}>
               <Plus className="w-4 h-4" /> Add Provider
             </Button>
          </div>

          <div className="grid gap-4">
            {providers.map(p => (
              <Card key={p.id}>
                <div className="flex justify-between items-start mb-4 border-b pb-2 border-black/5">
                  <div className="flex-1 mr-4">
                    <Input
                      label="Provider Name"
                      value={p.name}
                      onChange={(e: any) => updateProvider(p.id, { name: e.target.value })}
                      placeholder="e.g. OpenAI"
                    />
                  </div>
                  <Button variant="destructive" className="mt-5 px-2 py-1 h-auto text-xs" onClick={() => deleteProvider(p.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Select
                    label="Type"
                    value={p.type}
                    onChange={(e: any) => updateProvider(p.id, { type: e.target.value })}
                    options={[
                      { value: 'openai', label: 'OpenAI Compatible' },
                      { value: 'ollama', label: 'Ollama' },
                      { value: 'anthropic', label: 'Anthropic' }
                    ]}
                  />
                  <Input
                    label="Base URL"
                    value={p.baseUrl}
                    onChange={(e: any) => updateProvider(p.id, { baseUrl: e.target.value })}
                  />
                  <Input
                    label="API Key"
                    type="password"
                    placeholder={p.apiKey ? '••••••••' : 'Enter API Key'}
                    onChange={(e: any) => updateProvider(p.id, { apiKey: e.target.value })}
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'agents' && (
        <div className="space-y-6">
          <div className="flex justify-end">
             <Button onClick={() => addAgent({
               id: Math.random().toString(36).substring(7),
               name: 'New Researcher',
               providerId: providers[0]?.id || '',
               modelString: 'gpt-3.5-turbo',
               parameters: { temperature: 0.7, top_p: 1, max_tokens: 1000 },
               color: 'bg-green-100'
             })}>
               <Plus className="w-4 h-4" /> Create New Agent
             </Button>
          </div>

          <div className="grid gap-4">
            {agents.map(agent => (
              <Card key={agent.id} className={agent.color || 'bg-white'}>
                <div className="flex justify-between items-center mb-4 border-b pb-2 border-black/5">
                  <input
                    className="font-bold text-lg bg-transparent focus:outline-none focus:underline"
                    value={agent.name}
                    onChange={(e) => updateAgent(agent.id, { name: e.target.value })}
                  />
                  <Button variant="destructive" className="px-2 py-1 h-auto text-xs" onClick={() => deleteAgent(agent.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Select
                    label="Provider"
                    value={agent.providerId}
                    onChange={(e: any) => updateAgent(agent.id, { providerId: e.target.value })}
                    options={providers.map(p => ({ value: p.id, label: p.name }))}
                  />
                  <Input
                    label="Model ID"
                    value={agent.modelString}
                    onChange={(e: any) => updateAgent(agent.id, { modelString: e.target.value })}
                    placeholder="e.g. gpt-4"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <Input
                    label="Temperature"
                    type="number" step="0.1" min="0" max="2"
                    value={agent.parameters.temperature}
                    onChange={(e: any) => updateAgent(agent.id, { parameters: { ...agent.parameters, temperature: parseFloat(e.target.value) } })}
                  />
                  <Input
                    label="Max Tokens"
                    type="number"
                    value={agent.parameters.max_tokens}
                    onChange={(e: any) => updateAgent(agent.id, { parameters: { ...agent.parameters, max_tokens: parseInt(e.target.value) } })}
                  />
                </div>

                <div>
                   <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Custom System Persona</label>
                   <textarea
                     className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-20"
                     value={agent.customSystemPrompt || ''}
                     onChange={(e) => updateAgent(agent.id, { customSystemPrompt: e.target.value })}
                     placeholder="You are a helpful assistant..."
                   />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<OptionsApp />);
