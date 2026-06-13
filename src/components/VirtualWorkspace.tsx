/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Folder, File, Code, FileText, ChevronRight, CornerDownRight, Save, Plus, Trash2, Edit3, ArrowLeft, Search, Sparkles } from 'lucide-react';
import { VirtualFile } from '../types';

interface VirtualWorkspaceProps {
  virtualFiles: VirtualFile[];
  onAddFile: (name: string, content: string, path: string) => void;
  onDeleteFile: (path: string) => void;
  onUpdateFileContent: (path: string, content: string) => void;
  modelName?: string;
  thinkingEnabled?: boolean;
  simplifiedMode?: boolean;
}

export default function VirtualWorkspace({
  virtualFiles,
  onAddFile,
  onDeleteFile,
  onUpdateFileContent,
  modelName = "gemini-3.5-flash",
  thinkingEnabled = false,
  simplifiedMode = false,
}: VirtualWorkspaceProps) {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const selectedFile = virtualFiles.find((f) => f.path === selectedFilePath);

  const [editorContent, setEditorContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // AI Assistant Integration States
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [optimizedCode, setOptimizedCode] = useState<string | null>(null);
  const [aiActiveOperation, setAiActiveOperation] = useState<'analyze' | 'optimize' | null>(null);
  const [activeModelUsed, setActiveModelUsed] = useState('');

  // Reset AI panel on selection changes
  useEffect(() => {
    setAiActiveOperation(null);
    setAiResult(null);
    setOptimizedCode(null);
    setActiveModelUsed('');
  }, [selectedFilePath]);

  const handleAiOperation = async (op: 'analyze' | 'optimize') => {
    if (!selectedFile) return;
    setAiRunning(true);
    setAiResult(null);
    setOptimizedCode(null);
    setAiActiveOperation(op);
    
    try {
      const response = await fetch('/api/snow-agent/ai-operation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: selectedFile.path,
          name: selectedFile.name,
          content: selectedFile.content, // Analyze the original committed content
          operation: op,
          modelName,
          thinkingEnabled
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setAiResult(data.analysis);
        if (op === 'optimize' && data.optimizedCode) {
          setOptimizedCode(data.optimizedCode);
        }
        setActiveModelUsed(data.usedModel);
      } else {
        setAiResult(`### AI Framework Error\n\n${data.error || 'The system could not compile your prompt. Validate credentials.'}`);
      }
    } catch (err: any) {
      setAiResult(`### Data Link Dropped\n\n${err.message || 'Network interface pipeline reported timeout. Reconnecting...'}`);
    } finally {
      setAiRunning(false);
    }
  };

  // New file creation modal state
  const [newFileName, setNewFileName] = useState('');
  const [newFilePath, setNewFilePath] = useState('/');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleSelectFile = (file: VirtualFile) => {
    setSelectedFilePath(file.path);
    setEditorContent(file.content);
    setIsEditing(false);
  };

  const handleSaveChanges = () => {
    if (selectedFilePath) {
      onUpdateFileContent(selectedFilePath, editorContent);
      setIsEditing(false);
    }
  };

  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName) return;
    const pathVal = newFilePath.endsWith('/') ? `${newFilePath}${newFileName}` : `${newFilePath}/${newFileName}`;
    onAddFile(newFileName, "# Generated via SnowOS workspace creator.\n\nprint('Kernel active.')\n", pathVal);
    setNewFileName('');
    setShowCreateModal(false);
    setSelectedFilePath(pathVal);
    setEditorContent("# Generated via SnowOS workspace creator.\n\nprint('Kernel active.')\n");
  };

  const filteredFiles = virtualFiles.filter((file) => {
    if (!searchQuery) return true;
    const query = searchQuery.trim().toLowerCase();
    return (
      file.name.toLowerCase().includes(query) ||
      file.path.toLowerCase().includes(query) ||
      (file.content && file.content.toLowerCase().includes(query))
    );
  });

  const getLanguageIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['py'].includes(ext)) {
      return (
        <span className="p-1 rounded bg-emerald-500/10 text-emerald-400 shrink-0 border border-emerald-500/20" title="Python Script">
          <Code className="w-3.5 h-3.5" />
        </span>
      );
    }
    if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
      return (
        <span className="p-1 rounded bg-sky-500/10 text-sky-400 shrink-0 border border-sky-500/20" title="TypeScript/JavaScript Source">
          <Code className="w-3.5 h-3.5" />
        </span>
      );
    }
    if (['json'].includes(ext)) {
      return (
        <span className="p-1 rounded bg-amber-500/10 text-amber-400 shrink-0 border border-amber-500/20" title="JSON Configuration">
          <Code className="w-3.5 h-3.5" />
        </span>
      );
    }
    if (['md'].includes(ext)) {
      return (
        <span className="p-1 rounded bg-purple-500/10 text-purple-400 shrink-0 border border-purple-500/20" title="Markdown Documentation">
          <FileText className="w-3.5 h-3.5" />
        </span>
      );
    }
    if (['cfg', 'env', 'config', 'yml', 'yaml', 'toml', 'ini'].includes(ext)) {
      return (
        <span className="p-1 rounded bg-pink-500/10 text-pink-400 shrink-0 border border-pink-500/20" title="System Settings">
          <FileText className="w-3.5 h-3.5" />
        </span>
      );
    }
    if (['sh', 'bash', 'zsh', 'bat', 'cmd'].includes(ext)) {
      return (
        <span className="p-1 rounded bg-rose-500/10 text-rose-400 shrink-0 border border-rose-500/20" title="Executable Shell Script">
          <Code className="w-3.5 h-3.5" />
        </span>
      );
    }
    return (
      <span className="p-1 rounded bg-zinc-800/60 text-zinc-400 shrink-0 border border-zinc-700/30" title="Text/Other File">
        <File className="w-3.5 h-3.5" />
      </span>
    );
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 h-full ${simplifiedMode ? 'font-sans text-slate-700' : 'font-mono text-zinc-300'}`}>
      
      {/* Column 1: Workspace Files Explorer */}
      <div className={`border p-4 flex flex-col justify-between h-full min-h-[350px] rounded-2xl transition-all duration-300 ${
        simplifiedMode 
          ? 'bg-white border-slate-200/80 shadow-sm text-slate-705' 
          : 'bg-zinc-950/70 backdrop-blur-md border-zinc-805 shadow-[0_4px_30px_rgba(0,0,0,0.4)] text-zinc-300'
      }`}>
        <div>
          <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-80) pb-3 mb-4 select-none">
            <div className="flex items-center space-x-2">
              <Folder className={`w-4 h-4 ${simplifiedMode ? 'text-blue-500' : 'text-amber-505'}`} />
              <span className={`font-bold uppercase tracking-wider ${simplifiedMode ? 'text-slate-800' : 'text-zinc-100'}`}>
                {simplifiedMode ? 'Files & Documents' : 'Virtual File System'}
              </span>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className={`text-[10px] flex items-center px-2 py-1 select-none rounded cursor-pointer uppercase tracking-wider font-bold transition-all ${
                simplifiedMode 
                  ? 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]' 
                  : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:text-cyan-300'
              }`}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> {simplifiedMode ? 'New Document' : 'Touch'}
            </button>
          </div>

          {/* Directory creation form popup */}
          {showCreateModal && (
            <form onSubmit={handleCreateFileSubmit} className={`border rounded-xl p-3 mb-4 space-y-3 shadow-md ${
              simplifiedMode ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/80 backdrop-blur-md border border-zinc-800'
            }`}>
              <div>
                <label className={`block text-[10px] mb-1 font-bold ${simplifiedMode ? 'text-slate-500' : 'text-zinc-550'}`}>Folder Location</label>
                <input
                  type="text"
                  value={newFilePath}
                  onChange={(e) => setNewFilePath(e.target.value)}
                  className={`w-full border rounded px-2.5 py-1 focus:outline-none focus:border-blue-500 text-xs ${
                    simplifiedMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-zinc-950 border-zinc-850 text-zinc-200'
                  }`}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="e.g. sample.py, config.env"
                  className={`w-full border rounded px-2.5 py-1 focus:outline-none focus:border-blue-500 text-xs ${
                    simplifiedMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-zinc-950 border-zinc-850 text-zinc-200'
                  }`}
                  required
                />
                <button
                  type="submit"
                  className={`uppercase font-bold px-3.5 py-1.5 rounded cursor-pointer text-[10px] tracking-wider transition ${
                    simplifiedMode ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : 'bg-cyan-500 text-zinc-950'
                  }`}
                >
                  Create
                </button>
              </div>
            </form>
          )}

          {/* Real-time search query input */}
          <div className={`relative mb-3.5 flex items-center border rounded-xl overflow-hidden transition-all duration-200 ${
            simplifiedMode 
              ? 'bg-slate-50 border-slate-200/80 focus-within:border-blue-400/50 focus-within:bg-white shadow-[0_1px_2px_rgba(0,0,0,0.015)]' 
              : 'bg-zinc-950 border-zinc-900'
          }`}>
            <div className={`pl-3 flex items-center justify-center pointer-events-none ${simplifiedMode ? 'text-slate-400' : 'text-zinc-550'}`}>
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              placeholder={simplifiedMode ? "Search documents by name..." : "Filter by name or content..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-transparent border-0 outline-none px-2.5 py-2 text-xs placeholder-slate-400 focus:ring-0 ${
                simplifiedMode ? 'text-slate-800' : 'text-zinc-100 font-mono tracking-wide'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`px-2.5 h-full flex items-center justify-center font-sans font-medium text-[11px] cursor-pointer transition ${
                  simplifiedMode ? 'text-slate-400 hover:text-slate-650 hover:bg-slate-100' : 'text-zinc-505 hover:text-zinc-300 hover:bg-zinc-900/50'
                }`}
                title="Clear filter text"
              >
                ✕
              </button>
            )}
          </div>

          {/* File Lists */}
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {virtualFiles.length === 0 ? (
              <div className={`text-center py-6 text-xs ${simplifiedMode ? 'text-slate-400' : 'text-zinc-500'}`}>Workspace directory empty.</div>
            ) : filteredFiles.length === 0 ? (
              <div className={`text-center py-6 text-xs ${simplifiedMode ? 'text-slate-400' : 'text-zinc-500'}`}>No files match search.</div>
            ) : (
              filteredFiles.map((file) => {
                const isSelected = selectedFilePath === file.path;
                const pathParts = file.path.split('/').filter(Boolean);
                const hasFolder = pathParts.length > 1;
                const folderName = hasFolder ? pathParts[0] : null;
                const baseName = file.name;

                return (
                  <div
                    key={file.path}
                    onClick={() => handleSelectFile(file)}
                    className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer border border-transparent transition-all select-none ${
                      isSelected
                        ? simplifiedMode
                          ? 'bg-blue-50 border-blue-200/60 text-blue-800 shadow-sm'
                          : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.06)]'
                        : simplifiedMode
                          ? 'hover:bg-slate-50 hover:border-slate-150 text-slate-600'
                          : 'hover:bg-zinc-900/60 hover:border-zinc-800/60 text-zinc-350'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {hasFolder && (
                        <span className={`px-1.5 py-0.5 rounded flex items-center font-bold text-[8px] uppercase tracking-wider space-x-1 shrink-0 ${
                          simplifiedMode
                            ? 'bg-blue-50 border border-blue-105 text-blue-600'
                            : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                        }`}>
                          <Folder className="w-2.5 h-2.5" />
                          <span>{folderName}</span>
                        </span>
                      )}
                      <div className="flex items-center space-x-2 min-w-0">
                        {getLanguageIcon(file.name)}
                        <span className={`truncate ${
                          simplifiedMode 
                            ? 'text-slate-850 font-semibold' 
                            : 'font-mono font-medium text-zinc-200 group-hover:text-cyan-300'
                        } transition-colors duration-150`}>
                          {baseName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 px-1.5 shrink-0 select-none">
                      <span className={`text-[9px] px-1.5 py-0.2 rounded ${
                        simplifiedMode 
                          ? 'text-slate-500 bg-slate-100 border border-slate-150 font-sans' 
                          : 'text-zinc-500 bg-zinc-900 border border-zinc-800/80 font-mono font-semibold'
                      }`}>{file.size}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (file.path === selectedFilePath) setSelectedFilePath(null);
                          onDeleteFile(file.path);
                        }}
                        className={`p-1 rounded transition cursor-pointer opacity-0 group-hover:opacity-100 ${
                          simplifiedMode 
                            ? 'text-slate-400 hover:text-red-500 hover:bg-red-50' 
                            : 'text-zinc-500 hover:text-rose-450 hover:bg-rose-500/10'
                        }`}
                        title={simplifiedMode ? "Delete document" : "Delete system file"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className={`text-[10px] pt-3 border-t transition-all ${simplifiedMode ? 'text-slate-400 border-slate-150' : 'text-zinc-550 border-zinc-900'}`}>
          {simplifiedMode ? '✨ Real-time updates: Live edits are saved on the fly.' : '*Autonomous sandbox volume. Files generated persist purely across runtime state.'}
        </div>
      </div>

      {/* Column 2 & 3: Selected File Editor Panel */}
      <div className={`lg:col-span-2 border rounded-xl overflow-hidden p-4 flex flex-col justify-between h-full min-h-[350px] transition-all duration-300 ${
        simplifiedMode 
          ? 'bg-white border-slate-200/85 shadow-sm text-slate-705' 
          : 'bg-zinc-950/70 backdrop-blur-md border-zinc-805 shadow-[0_4px_30px_rgba(0,0,0,0.4)] text-zinc-305'
      }`}>
        {!selectedFile ? (
          <div className="flex flex-col items-center justify-center py-24 text-center h-full">
            <File className={`w-12 h-12 mb-2 animate-pulse ${simplifiedMode ? 'text-slate-200' : 'text-zinc-850'}`} />
            <div className={`font-bold uppercase tracking-wider text-[10px] ${simplifiedMode ? 'text-slate-400' : 'text-zinc-500'}`}>
              {simplifiedMode ? 'Select a Document' : 'No Register Selected'}
            </div>
            <div className={`text-[11px] max-w-xs mt-2 leading-relaxed ${simplifiedMode ? 'text-slate-450' : 'text-zinc-550 font-sans'}`}>
              {simplifiedMode 
                ? 'Select any item from the left navigator list to inspect, edit, or optimize it with AI.' 
                : 'Select any simulated workspace file from the left navigator to inspect and compile source parameters.'}
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-between h-full">
            <div>
              {/* Target File details */}
              <div className={`flex items-center justify-between border-b pb-3 mb-3 border-dashed ${simplifiedMode ? 'border-slate-200' : 'border-zinc-800'}`}>
                <div className="flex items-center space-x-2">
                  <Edit3 className={`w-4 h-4 ${simplifiedMode ? 'text-blue-500' : 'text-cyan-400'}`} />
                  <div>
                    <span className={`font-bold ${simplifiedMode ? 'text-slate-800 text-xs' : 'text-zinc-100'}`}>{selectedFile.name}</span>
                    <span className={`text-[9.5px] block mt-0.5 ${simplifiedMode ? 'text-slate-400 font-semibold' : 'text-zinc-500'}`}>{selectedFile.path}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!isEditing && (
                    <>
                      <button
                        onClick={() => handleAiOperation('analyze')}
                        disabled={aiRunning}
                        className={`font-semibold px-2.5 py-1 rounded-lg flex items-center cursor-pointer text-[10px] transition uppercase tracking-wider disabled:opacity-50 ${
                          simplifiedMode
                            ? aiActiveOperation === 'analyze'
                              ? 'bg-blue-100 border border-blue-400 text-blue-800 font-bold'
                              : 'bg-blue-50/50 border border-blue-200/70 hover:bg-blue-100/50 text-blue-700'
                            : aiActiveOperation === 'analyze' 
                              ? 'bg-cyan-950/40 border border-cyan-500 text-cyan-400 font-bold border-1 shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                              : 'border border-cyan-500/30 hover:border-cyan-500/70 hover:bg-cyan-500/5 text-cyan-400'
                        }`}
                      >
                        <Sparkles className="w-3 h-3 mr-1 animate-pulse" /> AI Analyze
                      </button>
                      <button
                        onClick={() => handleAiOperation('optimize')}
                        disabled={aiRunning}
                        className={`font-semibold px-2.5 py-1 rounded-lg flex items-center cursor-pointer text-[10px] transition uppercase tracking-wider disabled:opacity-50 ${
                          simplifiedMode
                            ? aiActiveOperation === 'optimize'
                              ? 'bg-indigo-100 border border-indigo-400 text-indigo-805 font-bold'
                              : 'bg-indigo-50/50 border border-indigo-200/70 hover:bg-indigo-100/50 text-indigo-700'
                            : aiActiveOperation === 'optimize' 
                              ? 'bg-amber-950/40 border-amber-500 text-amber-400 font-bold border-1 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                              : 'border border-amber-500/30 hover:border-amber-500/70 hover:bg-amber-505/5 text-amber-450'
                        }`}
                      >
                        <Save className="w-3 h-3 mr-1" /> AI Optimize
                      </button>
                    </>
                  )}

                  {isEditing ? (
                    <button
                      onClick={handleSaveChanges}
                      className={`font-semibold px-2.5 py-1 rounded-lg flex items-center cursor-pointer transition text-[10px] uppercase tracking-wider ${
                        simplifiedMode
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                          : 'bg-cyan-500/15 border border-cyan-455 text-cyan-300 hover:bg-cyan-500/25'
                      }`}
                    >
                      <Save className="w-3 h-3 mr-1" /> {simplifiedMode ? 'Save Edits' : 'Save registers'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className={`font-semibold px-2.5 py-1 rounded-lg flex items-center cursor-pointer text-[10px] transition uppercase tracking-wider ${
                        simplifiedMode
                          ? 'bg-slate-100 hover:bg-slate-205/65 text-slate-700 border border-slate-300/80 shadow-sm'
                          : 'border border-zinc-700 hover:border-zinc-500 text-zinc-350'
                      }`}
                    >
                      Edit Content
                    </button>
                  )}
                </div>
              </div>

              {/* Code Panel Display / Input */}
              <div className={`border rounded-xl flex overflow-hidden min-h-[220px] max-h-[300px] transition ${
                simplifiedMode ? 'border-slate-200 bg-slate-50' : 'border-zinc-900 bg-zinc-950'
              }`}>
                {/* Line number rail */}
                <div className={`px-3 py-2.5 text-right select-none font-mono text-[10px] border-r shrink-0 ${
                  simplifiedMode ? 'bg-slate-100/75 text-slate-450 border-slate-200' : 'bg-zinc-900/50 text-zinc-650 border-zinc-900'
                }`}>
                  {editorContent.split('\n').map((_, i) => (
                    <div key={i} className="h-5">{i + 1}</div>
                  ))}
                </div>

                {/* Editor Content Area */}
                {isEditing ? (
                  <textarea
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    className={`w-full font-mono p-2.5 text-xs focus:outline-none resize-none leading-5 overflow-y-auto ${
                      simplifiedMode ? 'bg-white text-slate-800' : 'bg-black text-zinc-200'
                    }`}
                    rows={12}
                  />
                ) : (
                  <pre className={`w-full font-mono p-2.5 text-xs overflow-auto leading-5 select-text ${
                    simplifiedMode ? 'bg-white text-slate-800' : 'bg-black text-zinc-300'
                  }`}>
                    <code>{selectedFile.content}</code>
                  </pre>
                )}
              </div>

              {/* Collapsible Gemini AI Assist results Console */}
              {aiActiveOperation && (
                <div className={`mt-4 border rounded-xl p-4 text-left overflow-hidden shadow-sm transition ${
                  simplifiedMode ? 'bg-slate-50 border-slate-200/90' : 'bg-zinc-950/90 border-zinc-800'
                }`}>
                  <div className="flex items-center justify-between border-b pb-2 mb-2.5 border-slate-200/50 select-none">
                    <div className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[8px] font-mono tracking-wider font-semibold uppercase border ${
                      simplifiedMode
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    }`}>
                      <Sparkles className="w-2.5 h-2.5 mr-1" />
                      <span>{aiActiveOperation === 'analyze' ? 'SECURITY & METRICS AUDIT' : 'PERFORMANCE REFACTORING LOG'}</span>
                    </div>
                    {activeModelUsed && (
                      <span className={`text-[8.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        simplifiedMode ? 'bg-slate-200/60 text-slate-600' : 'bg-zinc-900 text-zinc-550'
                      }`}>
                        ENGINE: {activeModelUsed}
                      </span>
                    )}
                  </div>

                  {aiRunning ? (
                    <div className="py-8 flex flex-col items-center justify-center space-y-2 select-none">
                      <div className={`w-5 h-5 rounded-full border-2 border-t-transparent animate-spin ${
                        simplifiedMode ? 'border-blue-600' : 'border-cyan-500'
                      }`} />
                      <span className={`text-[9.5px] tracking-wide uppercase font-bold animate-pulse ${
                        simplifiedMode ? 'text-blue-700' : 'text-cyan-400/80 font-mono'
                      }`}>
                        {simplifiedMode ? 'Smart AI agent is reading file details...' : 'Interrogating server kernel pipeline...'}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="max-h-[160px] overflow-y-auto pr-1">
                        <pre className={`font-sans text-[11px] leading-relaxed whitespace-pre-wrap select-text ${
                          simplifiedMode ? 'text-slate-700' : 'text-zinc-300'
                        }`}>
                          {aiResult}
                        </pre>
                      </div>

                      {optimizedCode && (
                        <div className={`flex flex-col space-y-2 border-t pt-2.5 select-none ${simplifiedMode ? 'border-slate-250/60' : 'border-zinc-900'}`}>
                          <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-1 rounded border ${
                            simplifiedMode
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-805'
                              : 'bg-amber-500/5 border-amber-500/10 text-amber-400'
                          }`}>
                            {simplifiedMode ? '✓ Beautifully optimized block generated below!' : '*Refactored code prepared. Review optimized block above if needed.'}
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                onUpdateFileContent(selectedFile.path, optimizedCode);
                                setEditorContent(optimizedCode);
                                setAiActiveOperation(null);
                                setOptimizedCode(null);
                              }}
                              className={`font-semibold px-3 py-1.5 rounded cursor-pointer text-[9.5px] uppercase tracking-wider transition-all shadow-sm ${
                                simplifiedMode
                                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                  : 'bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-400 font-bold'
                              }`}
                            >
                              {simplifiedMode ? 'Apply Changes' : 'Apply Refactored Code'}
                            </button>
                            <button
                              onClick={() => {
                                setAiActiveOperation(null);
                                setOptimizedCode(null);
                              }}
                              className={`px-3 py-1.5 cursor-pointer text-[9.5px] uppercase tracking-wider font-bold transition ${
                                simplifiedMode
                                  ? 'text-slate-450 hover:text-slate-700'
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              Discard
                            </button>
                          </div>
                        </div>
                      )}

                      {!optimizedCode && (
                        <div className={`border-t pt-2 mt-1.5 flex justify-end select-none ${simplifiedMode ? 'border-slate-200' : 'border-zinc-900'}`}>
                          <button
                            onClick={() => setAiActiveOperation(null)}
                            className={`font-bold px-2.5 py-1 cursor-pointer text-[9px] uppercase tracking-wider transition ${
                              simplifiedMode ? 'text-slate-450 hover:text-slate-700' : 'text-zinc-500 hover:text-zinc-305'
                            }`}
                          >
                            {simplifiedMode ? 'Dismiss Audit' : 'Close Audit drawer'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer details */}
            <div className={`flex items-center justify-between text-[10px] border-t pt-3.5 select-none ${
              simplifiedMode ? 'text-slate-400 border-slate-150' : 'text-zinc-500 border-zinc-900'
            }`}>
              <span>SIZE: {selectedFile.size}</span>
              <span>Updated: {selectedFile.updatedAt}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
