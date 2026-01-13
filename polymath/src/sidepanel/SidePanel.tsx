import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { useSettingsStore } from '../store/settingsStore';
import { SeminarEngine } from '../services/engine';
import { SeminarState, AgentProfile, SeminarConfig } from '../types';
import { Play, RotateCcw, User, Users, Settings, FileText } from 'lucide-react';
import { create } from 'zustand';
import Markdown from 'react-markdown';
import '../../src/index.css';

// --- Local Store for Seminar UI State ---
const useSeminarStore = create<SeminarState>((set, get) => ({
  topic: '',
  rounds: [],
  status: 'idle',
  currentRoundIndex: 0,
  config: {
    maxRounds: 5,
    consensusThreshold: 0.8,
    arbiterModelId: '',
    activeAgentIds: []
  },
  error: undefined
}));

// --- Main Panel Component ---
const SidePanel = () => {
  const settings = useSettingsStore();
  const seminar = useSeminarStore();
  const [engine] = useState(() => new SeminarEngine(
    useSeminarStore.setState,
    useSeminarStore.getState
  ));

  const [topicInput, setTopicInput] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    settings.loadSettings();
  }, []);

  useEffect(() => {
    // Scroll to bottom on updates
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [seminar.rounds.length, seminar.status]);

  const handleStart = async () => {
    if (!topicInput.trim() || selectedAgents.length < 2) return;

    // Find best arbiter (fallback to first selected if none specific, though in real app user should pick)
    // For now, we default the arbiter to the first selected agent for simplicity, or look for a 'gpt-4' like model.
    const arbiterId = selectedAgents[0];

    const config: SeminarConfig = {
      maxRounds: 4,
      consensusThreshold: 0.85,
      arbiterModelId: arbiterId,
      activeAgentIds: selectedAgents
    };

    await engine.startSeminar(topicInput, config);
  };

  if (seminar.status === 'idle') {
    return (
      <div className="flex flex-col h-full p-6 bg-white">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Polymath</h1>
          <p className="text-sm text-gray-500">Deep Emergent Consensus Engine</p>
        </div>

        <div className="space-y-6 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Research Topic</label>
            <textarea
              className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="e.g. Is strong AI achievable with transformer architecture alone?"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Participants ({selectedAgents.length})
            </label>
            <div className="space-y-2">
              {settings.agents.length === 0 && (
                <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                  No agents found. Please configure them in Settings.
                </div>
              )}
              {settings.agents.map(agent => (
                <div
                  key={agent.id}
                  onClick={() => {
                    setSelectedAgents(prev =>
                      prev.includes(agent.id)
                        ? prev.filter(id => id !== agent.id)
                        : [...prev, agent.id]
                    );
                  }}
                  className={`
                    flex items-center p-3 rounded-lg border cursor-pointer transition-colors
                    ${selectedAgents.includes(agent.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}
                  `}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${agent.color || 'bg-gray-200'}`}>
                    <User className="w-4 h-4 text-gray-700" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{agent.name}</div>
                    <div className="text-xs text-gray-500">{agent.modelString} • T{agent.parameters.temperature}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t flex gap-2">
          <button
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            disabled={!topicInput || selectedAgents.length < 2}
            onClick={handleStart}
          >
            <Play className="w-4 h-4" /> Start Seminar
          </button>
          <button
            className="p-3 bg-gray-100 rounded-lg hover:bg-gray-200"
            onClick={() => chrome.runtime.openOptionsPage()}
            title="Settings"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    );
  }

  // Running State
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm z-10">
        <div>
          <h2 className="font-semibold text-gray-900 truncate max-w-[200px]">{seminar.topic}</h2>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${seminar.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
            {seminar.status === 'running' ? 'Session Active' : 'Session Completed'}
          </div>
        </div>
        <button onClick={() => useSeminarStore.setState({ status: 'idle' })} className="p-2 hover:bg-gray-100 rounded-full">
          <RotateCcw className="w-4 h-4 text-gray-600" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
        {seminar.rounds.map((round, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
              <span className="font-mono text-xs font-bold text-gray-500 uppercase">Round {round.roundIndex}</span>
              {round.arbitration && (
                <span className="text-xs font-medium text-blue-600">
                  Convergence: {Math.round(round.arbitration.convergenceScore * 100)}%
                </span>
              )}
            </div>

            <div className="p-4 space-y-4">
              {/* Clusters View */}
              {round.arbitration?.clusters.length > 0 ? (
                <div className="space-y-3">
                  {round.arbitration.clusters.map((cluster, cIdx) => (
                    <div key={cIdx} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                         <h4 className="font-bold text-sm text-slate-800">{cluster.label}</h4>
                         <span className="text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-600">{cluster.strength}% Strength</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">{cluster.coreArgument}</p>
                      <div className="flex gap-1">
                        {cluster.supportingAgentIds.map(id => {
                           const agent = settings.agents.find(a => a.id === id);
                           return (
                             <div key={id} className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-gray-700 border border-white shadow-sm ${agent?.color || 'bg-gray-200'}`} title={agent?.name}>
                               {agent?.name[0]}
                             </div>
                           )
                        })}
                      </div>
                    </div>
                  ))}

                  {round.arbitration.consensusFacts.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-dashed">
                      <h5 className="text-xs font-bold text-green-700 mb-2 uppercase tracking-wide">Consensus Established</h5>
                      <ul className="list-disc pl-4 space-y-1">
                        {round.arbitration.consensusFacts.map((fact, i) => (
                          <li key={i} className="text-xs text-gray-600">{fact}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {round.arbitration.nextRoundFocus && seminar.status !== 'completed' && (
                     <div className="mt-4 bg-yellow-50 p-3 rounded border border-yellow-100">
                        <span className="text-xs font-bold text-yellow-800 uppercase block mb-1">Next Focus</span>
                        <p className="text-sm text-yellow-900 font-medium">{round.arbitration.nextRoundFocus}</p>
                     </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-400 text-sm animate-pulse">
                  Agents are researching and debating...
                </div>
              )}
            </div>
          </div>
        ))}

        {seminar.status === 'completed' && (
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
             <div className="bg-green-50 p-4 border-b border-green-100 flex items-center gap-3">
               <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                 <Users className="w-5 h-5 text-green-600" />
               </div>
               <div>
                  <h3 className="font-bold text-green-900">Consensus Report</h3>
                  <p className="text-green-700 text-xs">Generated by Polymath Engine</p>
               </div>
             </div>
             <div className="p-6 prose prose-sm max-w-none text-gray-700">
               <Markdown>
{`# Final Consensus: ${seminar.topic}

## Executive Summary
After ${seminar.rounds.length} rounds of debate, the panel has reached a convergence score of **${Math.round((seminar.rounds[seminar.rounds.length-1]?.arbitration?.convergenceScore || 0) * 100)}%**.

## Agreed Facts
${seminar.rounds[seminar.rounds.length-1]?.arbitration?.consensusFacts.map(f => `- ${f}`).join('\n') || 'No complete consensus facts recorded.'}

## Key Perspectives
${seminar.rounds[seminar.rounds.length-1]?.arbitration?.clusters.map(c => `### ${c.label}\n${c.coreArgument}`).join('\n\n') || ''}

## Conclusion
The seminar has concluded that the topic requires... (Synthesis).
`}
               </Markdown>
             </div>
             <div className="bg-gray-50 p-3 border-t flex justify-end">
               <button
                 onClick={() => {
                   const md = `# Final Consensus: ${seminar.topic}\n\n## Executive Summary\nAfter ${seminar.rounds.length} rounds of debate, the panel has reached a convergence score of **${Math.round((seminar.rounds[seminar.rounds.length-1]?.arbitration?.convergenceScore || 0) * 100)}%**.\n\n## Agreed Facts\n${seminar.rounds[seminar.rounds.length-1]?.arbitration?.consensusFacts.map(f => `- ${f}`).join('\n') || 'No complete consensus facts recorded.'}\n\n## Key Perspectives\n${seminar.rounds[seminar.rounds.length-1]?.arbitration?.clusters.map(c => `### ${c.label}\n${c.coreArgument}`).join('\n\n') || ''}\n\n## Conclusion\nThe seminar has concluded.`;
                   const blob = new Blob([md], { type: 'text/markdown' });
                   const url = URL.createObjectURL(blob);
                   const a = document.createElement('a');
                   a.href = url;
                   a.download = `Polymath_Report_${new Date().toISOString().slice(0,10)}.md`;
                   a.click();
                 }}
                 className="text-blue-600 text-xs font-bold uppercase flex items-center gap-1 hover:underline"
               >
                 <FileText className="w-3 h-3" /> Export Markdown
               </button>
             </div>
          </div>
        )}

        {seminar.error && (
           <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">
             <strong>Error:</strong> {seminar.error}
           </div>
        )}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<SidePanel />);
