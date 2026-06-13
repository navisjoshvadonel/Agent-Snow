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
}

export default function MemoryCoreManager({
  memoryCore,
  onUpdateUserModel,
  onClearShortTerm,
  indexedMemories,
  setIndexedMemories,
  learningStats,
  setLearningStats,
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
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 h-full font-mono text-xs text-zinc-300">
      {/* Column 1: User Profile Core */}
      <div className="bg-zinc-950/70 border border-zinc-805 rounded-xl p-4 flex flex-col justify-between shadow-md xl:col-span-1">
        <form onSubmit={handleProfileSave} className="flex flex-col space-y-3.5 h-full justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-zinc-800 pb-3 mb-4">
              <User className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-zinc-100 uppercase tracking-wider text-[11px]">User Identity Core</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[9px] text-zinc-500 mb-1 tracking-wider uppercase font-bold">OPERATOR_ID</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Navis Donel"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 text-zinc-100 placeholder-zinc-650"
                />
              </div>

              <div>
                <label className="block text-[9px] text-zinc-500 mb-1 tracking-wider uppercase font-bold">CLASSIFIED_ROLE</label>
                <input
                  type="text"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  placeholder="e.g. DevOps Lead, Architect"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 text-zinc-100 placeholder-zinc-650"
                />
              </div>

              <div>
                <label className="block text-[9px] text-zinc-500 mb-1 tracking-wider uppercase font-bold">PREFERENCES</label>
                <textarea
                  rows={2}
                  value={userPref}
                  onChange={(e) => setUserPref(e.target.value)}
                  placeholder="e.g. Offline-First, Swiss-Design, Auto-Approvals"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 text-zinc-100 resize-none font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-[9px] text-zinc-500 mb-1 tracking-wider uppercase font-bold">DURABLE_SKILLS</label>
                <textarea
                  rows={2}
                  value={userSkills}
                  onChange={(e) => setUserSkills(e.target.value)}
                  placeholder="e.g. python, scripting, devops, react"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 text-zinc-100 resize-none font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-900 flex flex-wrap gap-2 items-center justify-between">
            <span className="text-[9px] text-cyan-450 uppercase tracking-widest font-bold">
              {isSavedNotice ? '✓ FACT_MUTATION_MERGED' : 'DIRECTORY LOCK ACTIVE'}
            </span>
            <button
              type="submit"
              className="flex items-center bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 hover:border-cyan-500 text-cyan-300 px-3 py-1.5 rounded cursor-pointer transition uppercase text-[10px] tracking-widest font-bold"
            >
              <Save className="w-3.5 h-3.5 mr-1" /> Commit Profile
            </button>
          </div>
        </form>
      </div>

      {/* Column 2: Cognitive Session Stack (Short Term and Compactor) */}
      <div className="bg-zinc-950/70 border border-zinc-805 rounded-xl p-4 flex flex-col justify-between shadow-md xl:col-span-1">
        <div>
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="font-semibold text-zinc-100 uppercase tracking-wider text-[11px]">Short-Term Heap</span>
            </div>
            <button
              onClick={onClearShortTerm}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center cursor-pointer uppercase tracking-wider font-bold"
              title="Flush current working memory chunk"
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Flush
            </button>
          </div>

          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {memoryCore.shortTerm.length === 0 ? (
              <div className="text-zinc-500 text-center py-8 font-sans leading-relaxed text-[10px]">
                Volatile context stream empty.<br />Prompts will append events.
              </div>
            ) : (
              memoryCore.shortTerm.map((concept, index) => (
                <div
                  key={index}
                  className="bg-zinc-900/30 border-l-2 border-purple-500 p-2.5 rounded text-[10px] font-mono text-zinc-300"
                >
                  <span className="text-purple-400 font-bold mr-2">[{index}]</span>
                  {concept}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dynamic Context Compressor Engine panel */}
        <div className="pt-3 border-t border-zinc-900 mt-4 bg-zinc-900/10 p-2.5 rounded-lg border border-zinc-800/40">
          <div className="flex items-center justify-between text-[9px] text-zinc-400 uppercase font-bold mb-2">
            <span>Core Context Compressor</span>
            <span className="text-purple-400 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Auto Compression
            </span>
          </div>
          <p className="text-[9px] text-zinc-500 font-sans leading-relaxed mb-3">
            Evolve volatile short-term observations into durable, prioritized long-term indices, maintaining structural integrity.
          </p>
          <button
            onClick={handleContextCompression}
            disabled={memoryCore.shortTerm.length === 0 || isCompressing}
            className={`w-full py-2 px-3 rounded text-[10px] uppercase font-bold flex items-center justify-center gap-1.5 transition ${
              memoryCore.shortTerm.length === 0 
                ? 'bg-zinc-900/60 border border-zinc-800 text-zinc-650 cursor-not-allowed'
                : isCompressing
                  ? 'bg-purple-950/40 border border-purple-500/50 text-purple-400 animate-pulse'
                  : 'bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/40 hover:border-purple-500 text-purple-300 cursor-pointer'
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
      <div className="bg-zinc-950/70 border border-zinc-805 rounded-xl p-4 flex flex-col justify-between shadow-md xl:col-span-1">
        <div>
          <div className="flex flex-col space-y-2 border-b border-zinc-800 pb-3 mb-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-500" /> Memory Index & Ranking
              </span>
              <span className="text-[10px] text-zinc-500 font-mono tracking-tight font-bold">TOTAL: {indexedMemories.length}</span>
            </div>

            {/* Quick Index Filter Controls */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Find index key..."
                value={searchMemoryQuery}
                onChange={(e) => setSearchMemoryQuery(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-805/80 rounded px-2 py-1 text-[10px] font-mono text-zinc-200 outline-none focus:border-amber-500"
              />
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-805/80 px-1.5 py-1 rounded">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <select
                  value={importanceThreshold}
                  onChange={(e) => setImportanceThreshold(Number(e.target.value))}
                  className="bg-transparent border-none text-[9px] text-amber-400 font-bold outline-none cursor-pointer"
                >
                  <option value={1} className="bg-zinc-950 text-amber-400">★ 1+</option>
                  <option value={5} className="bg-zinc-950 text-amber-400">★ 5+</option>
                  <option value={8} className="bg-zinc-950 text-amber-400">★ 8+</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {filteredIndexed.length === 0 ? (
              <div className="text-zinc-550 text-center py-10 font-sans leading-relaxed text-[10px]">
                No structured memories<br />match key selection filters.
              </div>
            ) : (
              filteredIndexed.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-2.5 text-[10px] flex flex-col space-y-1.5 hover:border-zinc-700 transition"
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
                    <span className="text-zinc-600 font-mono tracking-tight">({item.timestamp})</span>
                  </div>

                  <p className="text-zinc-200 leading-normal">{item.text}</p>

                  <div className="flex items-center justify-between border-t border-zinc-950 pt-1.5 text-[8px] text-zinc-550 uppercase font-bold tracking-wider">
                    <span className="flex items-center gap-0.5 font-bold">
                      <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" />
                      SCORE: <strong className="text-amber-400 font-mono text-[9px]">{item.importance}/10</strong>
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Hash className="w-2.5 h-2.5 text-zinc-500" />
                      RETRIEVALS: <strong className="text-zinc-300 font-mono text-[9px]">{item.retrievalCount}</strong>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-[10px] text-zinc-500 pt-3 border-t border-zinc-900 flex items-center select-none font-mono">
          <HardDrive className="w-3.5 h-3.5 mr-1.5 text-amber-500 shrink-0" /> Persistent index database online.
        </div>
      </div>

      {/* Column 4: Adaptive Learning Board & Analytics (Phase 9 Integration) */}
      <div className="bg-zinc-950/70 border border-zinc-805 rounded-xl p-4 flex flex-col justify-between shadow-md xl:col-span-1">
        <div>
          <div className="flex items-center space-x-2 border-b border-zinc-800 pb-3 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-semibold text-zinc-100 uppercase tracking-wider text-[11px]">Adaptive Learning board</span>
          </div>

          <div className="space-y-3">
            {/* Grid statistics */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-zinc-900 border border-zinc-805 p-2 rounded">
                <span className="block text-[8px] text-zinc-500 uppercase font-bold tracking-wider">SUCCESS_LOGS</span>
                <span className="text-[14px] font-bold text-emerald-400 font-mono">{learningStats.successfulWorkflows}</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-805 p-2 rounded">
                <span className="block text-[8px] text-zinc-500 uppercase font-bold tracking-wider">RECOVERY_HEALS</span>
                <span className="text-[14px] font-bold text-cyan-400 font-mono">{learningStats.optimizedCycles}</span>
              </div>
            </div>

            {/* Frequent action list */}
            <div>
              <span className="block text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1.5">Aesthetic Workflows frequency</span>
              <div className="space-y-1.5 bg-zinc-900/30 border border-zinc-800/40 p-2.5 rounded-lg">
                {learningStats.frequentActions.map((f, i) => {
                  const maxFreq = Math.max(...learningStats.frequentActions.map(x => x.frequency));
                  const widthPercent = Math.min((f.frequency / maxFreq) * 100, 100);
                  return (
                    <div key={i} className="space-y-0.5">
                      <div className="flex justify-between text-[9px] text-zinc-350 font-mono font-bold uppercase">
                        <span className="truncate max-w-[120px]">{f.action}</span>
                        <span className="text-zinc-500">{f.frequency}x</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
                        <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${widthPercent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Observed User Affinities */}
            <div>
              <span className="block text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Inferred User Affinities</span>
              <div className="bg-zinc-900 border border-zinc-805 p-2 rounded-lg space-y-1 max-h-[85px] overflow-y-auto">
                {learningStats.userAffinities.map((aff, i) => (
                  <div key={i} className="text-[10px] text-zinc-400 flex items-start gap-1 font-sans">
                    <span className="text-cyan-400 mt-0.5 select-none text-[9px] font-mono font-bold shrink-0">▪</span>
                    <span className="leading-tight shrink-1">{aff}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="text-[9px] text-zinc-500 border-t border-zinc-900 pt-3 flex items-center justify-between select-none">
          <span>*Optimizations index updated: Real-time</span>
          <span>Security status: Armed</span>
        </div>
      </div>
    </div>
  );
}
