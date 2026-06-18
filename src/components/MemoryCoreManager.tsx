/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Layers, Brain, User, Save, RefreshCw, Key, HelpCircle, HardDrive, Star, Sliders, Hash, Download, Zap, TrendingUp } from 'lucide-react';
import { MemoryCore, UserModel, MemoryItem, LearningState } from '../types';

interface MemoryCoreManagerProps {
  memoryCore: MemoryCore;
  onUpdateUserModel: (updatedModel: UserModel) => void;
  onClearShortTerm: () => void;
  indexedMemories: MemoryItem[];
  setIndexedMemories: React.Dispatch<React.SetStateAction<MemoryItem[]>>;
  learningStats: LearningState;
  setLearningStats: React.Dispatch<React.SetStateAction<LearningState>>;
  simplifiedMode?: boolean;
}

export default function MemoryCoreManager({
  memoryCore,
  onUpdateUserModel,
  onClearShortTerm,
  indexedMemories,
  setIndexedMemories,
  learningStats,
  setLearningStats,
  simplifiedMode = false
}: MemoryCoreManagerProps) {
  const [userName, setUserName] = useState(memoryCore.userModel.name);
  const [userRole, setUserRole] = useState(memoryCore.userModel.role);
  const [userPref, setUserPref] = useState(memoryCore.userModel.preferences.join(', '));
  const [userSkills, setUserSkills] = useState(memoryCore.userModel.skills.join(', '));
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  const [searchMemoryQuery, setSearchMemoryQuery] = useState('');
  const [importanceThreshold, setImportanceThreshold] = useState(5);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserModel = {
      ...memoryCore.userModel,
      name: userName,
      role: userRole,
      preferences: userPref.split(',').map((p) => p.trim()).filter(Boolean),
      skills: userSkills.split(',').map((s) => s.trim()).filter(Boolean),
    };
    onUpdateUserModel(updated);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 3000);

    // Dynamic Phase 9 learning update
    setLearningStats(prev => ({
      ...prev,
      optimizedCycles: prev.optimizedCycles + 1
    }));
  };

  // Phase 3: Simulated dynamic context compression routine
  const handleContextCompression = () => {
    if (memoryCore.shortTerm.length === 0) return;
    setIsCompressing(true);
    setCompressionProgress(10);

    const timer = setInterval(() => {
      setCompressionProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          // Transition shortTerm memories above importance threshold to Indexed Long-Term Memory
          const newIndexed: MemoryItem[] = memoryCore.shortTerm.map((text, idx) => ({
            id: `mem_compressed_${Date.now()}_${idx}`,
            text: text,
            importance: Math.floor(Math.random() * 4) + 6, // default high value 6-9
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
            category: 'workflow',
            retrievalCount: 1
          }));

          setIndexedMemories(prevList => [...newIndexed, ...prevList]);
          onClearShortTerm(); // clear the volatile shortTerm stack
          setIsCompressing(false);
          setCompressionProgress(0);

          // Phase 9 Learning Increment
          setLearningStats(l => ({
            ...l,
            optimizedCycles: l.optimizedCycles + 1
          }));

          return 0;
        }
        return prev + 30;
      });
    }, 150);
  };

  const filteredIndexed = indexedMemories.filter(m => {
    const matchesKeyword = m.text.toLowerCase().includes(searchMemoryQuery.toLowerCase()) || 
                           m.category.toLowerCase().includes(searchMemoryQuery.toLowerCase());
    const matchesScore = m.importance >= importanceThreshold;
    return matchesKeyword && matchesScore;
  });

  return (
    <div className={`grid grid-cols-1 xl:grid-cols-4 gap-4 h-full text-xs ${
      simplifiedMode ? 'font-sans text-slate-700' : 'font-mono text-zinc-300'
    }`}>
      {/* Column 1: User Profile Core */}
      <div className={`border p-4 flex flex-col justify-between rounded-2xl transition-all duration-300 ${
        simplifiedMode 
          ? 'bg-white border-slate-200/80 shadow-sm hover:shadow-md' 
          : 'bg-zinc-950/70 border-zinc-805 shadow-md xl:col-span-1'
      }`}>
        <form onSubmit={handleProfileSave} className="flex flex-col space-y-3.5 h-full justify-between">
          <div>
            <div className={`flex items-center space-x-2 border-b pb-3 mb-4 ${
              simplifiedMode ? 'border-slate-100' : 'border-zinc-800'
            }`}>
              <User className={`w-4 h-4 ${simplifiedMode ? 'text-blue-650' : 'text-cyan-400'}`} />
              <span className={`font-semibold uppercase tracking-wider text-[11px] ${
                simplifiedMode ? 'text-slate-850 font-extrabold' : 'text-zinc-100'
              }`}>
                {simplifiedMode ? 'User profile information' : 'User Identity Core'}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className={`block text-[9px] mb-1 tracking-wider uppercase font-bold ${
                  simplifiedMode ? 'text-slate-400' : 'text-zinc-500'
                }`}>OPERATOR_ID</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Navis Donel"
                  className={`w-full border rounded-lg px-2.5 py-1.5 focus:outline-none text-xs font-medium ${
                    simplifiedMode 
                      ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 placeholder-slate-400' 
                      : 'bg-zinc-900 border-zinc-800 focus:border-cyan-500 text-zinc-100 placeholder-zinc-650'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[9px] mb-1 tracking-wider uppercase font-bold ${
                  simplifiedMode ? 'text-slate-400' : 'text-zinc-500'
                }`}>CLASSIFIED_ROLE</label>
                <input
                  type="text"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  placeholder="e.g. DevOps Lead, Architect"
                  className={`w-full border rounded-lg px-2.5 py-1.5 focus:outline-none text-xs font-medium ${
                    simplifiedMode 
                      ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 placeholder-slate-400' 
                      : 'bg-zinc-900 border-zinc-800 focus:border-cyan-500 text-zinc-100 placeholder-zinc-650'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[9px] mb-1 tracking-wider uppercase font-bold ${
                  simplifiedMode ? 'text-slate-400' : 'text-zinc-500'
                }`}>PREFERENCES</label>
                <textarea
                  rows={2}
                  value={userPref}
                  onChange={(e) => setUserPref(e.target.value)}
                  placeholder="e.g. Offline-First, Swiss-Design, Auto-Approvals"
                  className={`w-full border rounded-lg px-2.5 py-1.5 focus:outline-none text-xs resize-none ${
                    simplifiedMode 
                      ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 placeholder-slate-400 font-sans' 
                      : 'bg-zinc-900 border-zinc-800 focus:border-cyan-500 text-zinc-100 placeholder-zinc-650 font-mono'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[9px] mb-1 tracking-wider uppercase font-bold ${
                  simplifiedMode ? 'text-slate-400' : 'text-zinc-500'
                }`}>DURABLE_SKILLS</label>
                <textarea
                  rows={2}
                  value={userSkills}
                  onChange={(e) => setUserSkills(e.target.value)}
                  placeholder="e.g. python, scripting, devops, react"
                  className={`w-full border rounded-lg px-2.5 py-1.5 focus:outline-none text-xs resize-none ${
                    simplifiedMode 
                      ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 placeholder-slate-400 font-sans' 
                      : 'bg-zinc-900 border-zinc-800 focus:border-cyan-500 text-zinc-100 placeholder-zinc-650 font-mono'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className={`pt-4 border-t flex flex-wrap gap-2 items-center justify-between ${
            simplifiedMode ? 'border-slate-100' : 'border-zinc-900'
          }`}>
            <span className={`text-[9px] uppercase tracking-widest font-bold ${
              isSavedNotice 
                ? 'text-emerald-500' 
                : simplifiedMode ? 'text-slate-400' : 'text-cyan-455'
            }`}>
              {isSavedNotice ? '✓ FACT_MUTATION_MERGED' : 'DIRECTORY LOCK ACTIVE'}
            </span>
            <button
              type="submit"
              className={`flex items-center px-3 py-1.5 rounded-lg cursor-pointer transition uppercase text-[10px] tracking-widest font-bold border ${
                simplifiedMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-650 shadow-sm'
                  : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/40 hover:border-cyan-500 text-cyan-300'
              }`}
            >
              <Save className="w-3.5 h-3.5 mr-1" /> Commit Profile
            </button>
          </div>
        </form>
      </div>

      {/* Column 2: Cognitive Session Stack (Short Term and Compactor) */}
      <div className={`border p-4 flex flex-col justify-between rounded-2xl transition-all duration-300 ${
        simplifiedMode 
          ? 'bg-white border-slate-200/80 shadow-sm hover:shadow-md' 
          : 'bg-zinc-950/70 border-zinc-805 shadow-md xl:col-span-1'
      }`}>
        <div>
          <div className={`flex items-center justify-between border-b pb-3 mb-4 ${
            simplifiedMode ? 'border-slate-100' : 'border-zinc-800'
          }`}>
            <div className="flex items-center space-x-2">
              <Brain className={`w-4 h-4 ${simplifiedMode ? 'text-purple-600' : 'text-purple-400'}`} />
              <span className={`font-semibold uppercase tracking-wider text-[11px] ${
                simplifiedMode ? 'text-slate-850 font-extrabold' : 'text-zinc-100'
              }`}>Short-Term Heap</span>
            </div>
            <button
              onClick={onClearShortTerm}
              className={`text-[10px] flex items-center cursor-pointer uppercase tracking-wider font-bold transition ${
                simplifiedMode ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Flush current working memory chunk"
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Flush
            </button>
          </div>

          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {memoryCore.shortTerm.length === 0 ? (
              <div className={`text-center py-8 font-sans leading-relaxed text-[10px] ${
                simplifiedMode ? 'text-slate-400' : 'text-zinc-500'
              }`}>
                Volatile context stream empty.<br />Prompts will append events.
              </div>
            ) : (
              memoryCore.shortTerm.map((concept, index) => (
                <div
                  key={index}
                  className={`border-l-2 border-purple-500 p-2.5 rounded-lg text-[10px] font-mono ${
                    simplifiedMode
                      ? 'bg-purple-50/50 text-slate-700'
                      : 'bg-zinc-900/30 text-zinc-300'
                  }`}
                >
                  <span className="text-purple-550 font-bold mr-2">[{index}]</span>
                  {concept}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dynamic Context Compressor Engine panel */}
        <div className={`pt-3 border-t mt-4 p-2.5 rounded-xl border ${
          simplifiedMode 
            ? 'border-slate-150 bg-slate-50/50' 
            : 'border-zinc-800/40 bg-zinc-900/10'
        }`}>
          <div className={`flex items-center justify-between text-[9px] uppercase font-bold mb-2 ${
            simplifiedMode ? 'text-slate-605' : 'text-zinc-400'
          }`}>
            <span>Core Context Compressor</span>
            <span className={`${simplifiedMode ? 'text-purple-650' : 'text-purple-400'} flex items-center gap-1`}>
              <Zap className="w-3 h-3" /> Auto Compression
            </span>
          </div>
          <p className={`text-[9px] font-sans leading-relaxed mb-3 ${
            simplifiedMode ? 'text-slate-500' : 'text-zinc-500'
          }`}>
            Evolve volatile short-term observations into durable, prioritized long-term indices, maintaining structural integrity.
          </p>
          <button
            onClick={handleContextCompression}
            disabled={memoryCore.shortTerm.length === 0 || isCompressing}
            className={`w-full py-2 px-3 rounded-lg text-[10px] uppercase font-bold flex items-center justify-center gap-1.5 transition border ${
              memoryCore.shortTerm.length === 0 
                ? simplifiedMode
                  ? 'bg-slate-100 border-slate-205 text-slate-400 cursor-not-allowed'
                  : 'bg-zinc-900/60 border border-zinc-808 text-zinc-650 cursor-not-allowed'
                : isCompressing
                  ? 'bg-purple-950/40 border border-purple-505/50 text-purple-400 animate-pulse'
                  : simplifiedMode
                    ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-650 cursor-pointer shadow-sm'
                    : 'bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/40 hover:border-purple-505 text-purple-300 cursor-pointer'
            }`}
          >
            {isCompressing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Consolidating {compressionProgress}%
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" /> Compress Context Heap ({memoryCore.shortTerm.length})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Column 3: Durable Memory Index & Retrieval Ranking (Advanced Phase 3 Integration) */}
      <div className={`border p-4 flex flex-col justify-between rounded-2xl transition-all duration-300 ${
        simplifiedMode 
          ? 'bg-white border-slate-200/80 shadow-sm hover:shadow-md' 
          : 'bg-zinc-950/70 border-zinc-805 shadow-md xl:col-span-1'
      }`}>
        <div>
          <div className={`flex flex-col space-y-2 border-b pb-3 mb-3 ${
            simplifiedMode ? 'border-slate-100' : 'border-zinc-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5 ${
                simplifiedMode ? 'text-slate-850 font-extrabold' : 'text-zinc-100'
              }`}>
                <Sliders className={`w-4 h-4 ${simplifiedMode ? 'text-amber-600' : 'text-amber-500'}`} /> Memory Index & Ranking
              </span>
              <span className={`text-[10px] font-mono tracking-tight font-bold ${
                simplifiedMode ? 'text-slate-400' : 'text-zinc-500'
              }`}>TOTAL: {indexedMemories.length}</span>
            </div>

            {/* Quick Index Filter Controls */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Find index key..."
                value={searchMemoryQuery}
                onChange={(e) => setSearchMemoryQuery(e.target.value)}
                className={`flex-1 border rounded px-2 py-1 text-[10px] font-mono outline-none ${
                  simplifiedMode 
                    ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500' 
                    : 'bg-zinc-900 border-zinc-805/80 text-zinc-200 focus:border-amber-500'
                }`}
              />
              <div className={`flex items-center gap-1 border px-1.5 py-1 rounded ${
                simplifiedMode ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-805/80'
              }`}>
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <select
                  value={importanceThreshold}
                  onChange={(e) => setImportanceThreshold(Number(e.target.value))}
                  className={`bg-transparent border-none text-[9px] font-bold outline-none cursor-pointer ${
                    simplifiedMode ? 'text-amber-705' : 'text-amber-400'
                  }`}
                >
                  <option value={1} className={simplifiedMode ? 'bg-white text-slate-800' : 'bg-zinc-950 text-amber-450'}>★ 1+</option>
                  <option value={5} className={simplifiedMode ? 'bg-white text-slate-800' : 'bg-zinc-950 text-amber-450'}>★ 5+</option>
                  <option value={8} className={simplifiedMode ? 'bg-white text-slate-800' : 'bg-zinc-950 text-amber-450'}>★ 8+</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {filteredIndexed.length === 0 ? (
              <div className={`text-center py-10 font-sans leading-relaxed text-[10px] ${
                simplifiedMode ? 'text-slate-400' : 'text-zinc-550'
              }`}>
                No structured memories<br />match key selection filters.
              </div>
            ) : (
              filteredIndexed.map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-xl p-2.5 text-[10px] flex flex-col space-y-1.5 hover:border-zinc-700 transition ${
                    simplifiedMode 
                      ? 'bg-slate-50 border-slate-200/80 hover:border-slate-350' 
                      : 'bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[9px]">
                    <span className={`px-1.5 py-0.5 rounded uppercase font-bold text-[8px] tracking-widest ${
                      item.category === 'technical' ? 'bg-cyan-950/50 border border-cyan-550/30 text-cyan-400' :
                      item.category === 'preference' ? 'bg-amber-950/50 border border-amber-550/30 text-amber-450' :
                      item.category === 'workflow' ? 'bg-purple-950/50 border border-purple-550/30 text-purple-400' :
                      'bg-zinc-800 border border-zinc-700 text-zinc-350'
                    }`}>
                      {item.category}
                    </span>
                    <span className={simplifiedMode ? 'text-slate-400 font-mono' : 'text-zinc-600 font-mono tracking-tight'}>({item.timestamp})</span>
                  </div>

                  <p className={simplifiedMode ? 'text-slate-700 leading-normal font-medium' : 'text-zinc-200 leading-normal'}>{item.text}</p>

                  <div className={`flex items-center justify-between border-t pt-1.5 text-[8px] uppercase font-bold tracking-wider ${
                    simplifiedMode ? 'border-slate-200/60 text-slate-400' : 'border-zinc-950 pt-1.5 text-zinc-550'
                  }`}>
                    <span className="flex items-center gap-0.5 font-bold">
                      <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" />
                      SCORE: <strong className="text-amber-500 font-mono text-[9px]">{item.importance}/10</strong>
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Hash className="w-2.5 h-2.5 text-zinc-500" />
                      RETRIEVALS: <strong className={simplifiedMode ? 'text-slate-700 font-mono text-[9px]' : 'text-zinc-300 font-mono text-[9px]'}>{item.retrievalCount}</strong>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`text-[10px] pt-3 border-t flex items-center select-none font-mono ${
          simplifiedMode ? 'border-slate-100 text-slate-400' : 'border-zinc-900 text-zinc-500'
        }`}>
          <HardDrive className="w-3.5 h-3.5 mr-1.5 text-amber-500 shrink-0" /> Persistent index database online.
        </div>
      </div>

      {/* Column 4: Adaptive Learning Board & Analytics (Phase 9 Integration) */}
      <div className={`border p-4 flex flex-col justify-between rounded-2xl transition-all duration-300 ${
        simplifiedMode 
          ? 'bg-white border-slate-200/80 shadow-sm hover:shadow-md' 
          : 'bg-zinc-950/70 border-zinc-805 shadow-md xl:col-span-1'
      }`}>
        <div>
          <div className={`flex items-center space-x-2 border-b pb-3 mb-4 ${
            simplifiedMode ? 'border-slate-100' : 'border-zinc-800'
          }`}>
            <TrendingUp className={`w-4 h-4 animate-pulse ${simplifiedMode ? 'text-emerald-600' : 'text-emerald-400'}`} />
            <span className={`font-semibold uppercase tracking-wider text-[11px] ${
              simplifiedMode ? 'text-slate-850 font-extrabold' : 'text-zinc-100'
            }`}>Adaptive Learning board</span>
          </div>

          <div className="space-y-3">
            {/* Grid statistics */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className={`border p-2 rounded-lg ${
                simplifiedMode ? 'bg-slate-50 border-slate-150' : 'bg-zinc-900 border-zinc-805'
              }`}>
                <span className={`block text-[8px] uppercase font-bold tracking-wider ${simplifiedMode ? 'text-slate-400' : 'text-zinc-500'}`}>SUCCESS_LOGS</span>
                <span className="text-[14px] font-bold text-emerald-500 font-mono">{learningStats.successfulWorkflows}</span>
              </div>
              <div className={`border p-2 rounded-lg ${
                simplifiedMode ? 'bg-slate-50 border-slate-150' : 'bg-zinc-900 border-zinc-805'
              }`}>
                <span className={`block text-[8px] uppercase font-bold tracking-wider ${simplifiedMode ? 'text-slate-400' : 'text-zinc-500'}`}>RECOVERY_HEALS</span>
                <span className="text-[14px] font-bold text-cyan-500 font-mono">{learningStats.optimizedCycles}</span>
              </div>
            </div>

            {/* Frequent action list */}
            <div>
              <span className={`block text-[9px] uppercase font-bold tracking-wider mb-1.5 ${
                simplifiedMode ? 'text-slate-450' : 'text-zinc-500'
              }`}>Aesthetic Workflows frequency</span>
              <div className={`border p-2.5 rounded-xl ${
                simplifiedMode ? 'bg-slate-50/50 border-slate-150' : 'bg-zinc-900/30 border-zinc-800/40'
              }`}>
                {learningStats.frequentActions.map((f, i) => {
                  const maxFreq = Math.max(...learningStats.frequentActions.map(x => x.frequency));
                  const widthPercent = Math.min((f.frequency / maxFreq) * 100, 100);
                  return (
                    <div key={i} className="space-y-0.5">
                      <div className="flex justify-between text-[9px] font-mono font-bold uppercase">
                        <span className={`truncate max-w-[120px] ${simplifiedMode ? 'text-slate-700' : 'text-zinc-350'}`}>{f.action}</span>
                        <span className={simplifiedMode ? 'text-slate-400' : 'text-zinc-500'}>{f.frequency}x</span>
                      </div>
                      <div className={`w-full rounded-full h-1 overflow-hidden ${
                        simplifiedMode ? 'bg-slate-200' : 'bg-zinc-800'
                      }`}>
                        <div className={`h-full rounded-full ${simplifiedMode ? 'bg-blue-600' : 'bg-cyan-500'}`} style={{ width: `${widthPercent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Observed User Affinities */}
            <div>
              <span className={`block text-[9px] uppercase font-bold tracking-wider mb-1 ${
                simplifiedMode ? 'text-slate-450' : 'text-zinc-500'
              }`}>Inferred User Affinities</span>
              <div className={`border p-2 rounded-xl space-y-1 max-h-[85px] overflow-y-auto ${
                simplifiedMode ? 'bg-slate-50 border-slate-150' : 'bg-zinc-900 border-zinc-805'
              }`}>
                {learningStats.userAffinities.map((aff, i) => (
                  <div key={i} className={`text-[10px] flex items-start gap-1 font-sans ${
                    simplifiedMode ? 'text-slate-650' : 'text-zinc-400'
                  }`}>
                    <span className="text-cyan-500 mt-0.5 select-none text-[9px] font-mono font-bold shrink-0">▪</span>
                    <span className="leading-tight shrink-1">{aff}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={`text-[9px] border-t pt-3 flex items-center justify-between select-none ${
          simplifiedMode ? 'border-slate-100 text-slate-400' : 'border-zinc-900 text-zinc-500'
        }`}>
          <span>*Optimizations index updated: Real-time</span>
          <span>Security status: Armed</span>
        </div>
      </div>
    </div>
  );
}
