/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Terminal, HelpCircle, Activity, Key, CornerDownRight, Trash2, Cpu, Volume2, Brain, Sparkles, User, Info, CheckCircle } from 'lucide-react';
import { Message, UserModel } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface NyxShellProps {
  chatMessages: Message[];
  onSendMessage: (text: string, isCommand?: boolean) => void;
  onClearHistory: () => void;
  userModel: UserModel;
  onRunSuggestion: (prompt: string) => void;
  isGenerating: boolean;
  modelName?: string;
  onChangeModel?: (model: string) => void;
  onSynthesizeSpeech?: (text: string) => void;
  thinkingEnabled?: boolean;
  onToggleThinking?: (enabled: boolean) => void;
  simplifiedMode?: boolean;
}

export default function NyxShell({
  chatMessages,
  onSendMessage,
  onClearHistory,
  userModel,
  onRunSuggestion,
  isGenerating,
  modelName,
  onChangeModel,
  onSynthesizeSpeech,
  thinkingEnabled = false,
  onToggleThinking,
  simplifiedMode = false,
}: NyxShellProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isGenerating]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const trimmed = inputText.trim();
    // In simplified mode, never mark it as command to keep it purely conversational
    const isCommand = !simplifiedMode && (trimmed.startsWith('/') || ['ls', 'help', 'clear', 'neofetch', 'system', 'memory'].some(c => trimmed.startsWith(c)));
    
    onSendMessage(trimmed, isCommand);
    setInputText('');
  };

  const suggestions = simplifiedMode ? [
    { title: '📝 Write Python Code', prompt: 'Create a Python BeautifulSoup scraper' },
    { title: '🧹 Clear System Cache', prompt: 'Wipe all cache logs structures (HIGH Risk delete)' },
    { title: '⚡ Boost System Memory', prompt: 'Run local memory systems diagnostic sweep' },
  ] : [
    { title: 'Build Web Scraper', prompt: 'Create a Python BeautifulSoup scraper' },
    { title: 'Wipe Cache Logs', prompt: 'Wipe all cache logs structures (HIGH Risk delete)' },
    { title: 'Optimize Heap', prompt: 'Run local memory systems diagnostic sweep' },
  ];

  if (simplifiedMode) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl flex flex-col h-full font-sans text-sm text-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
        
        {/* Simplified Header */}
        <div className="bg-slate-50/85 px-4 py-3 border-b border-slate-200/80 flex flex-wrap gap-2 items-center justify-between select-none">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-slate-850 text-xs md:text-sm tracking-tight block">AI Smart Assistant</span>
              <span className="text-[9px] text-slate-400 font-medium block">Ask questions, generate scripts, or run tasks in plain English</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 ml-auto">
            {onChangeModel && modelName && (
              <div className="flex items-center space-x-2">
                {/* Simplified Model Dropdown */}
                <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg px-2 py-1 select-none shadow-sm">
                  <span className="text-[9px] text-slate-400 font-bold mr-1">AI BRAIN:</span>
                  <select
                    value={modelName}
                    onChange={(e) => onChangeModel(e.target.value)}
                    className="bg-transparent border-none text-[10px] text-blue-600 font-bold outline-none cursor-pointer"
                  >
                    <option value="gemini-3.5-flash">Standard Helper</option>
                    <option value="gemini-3.1-pro-preview">Advanced Thinker</option>
                    <option value="gemini-3.1-flash-lite">Basic Mode</option>
                  </select>
                </div>

                {onToggleThinking && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !thinkingEnabled;
                      onToggleThinking(nextVal);
                      if (nextVal && onChangeModel) {
                        onChangeModel("gemini-3.1-pro-preview");
                      }
                    }}
                    className={`flex items-center space-x-1 text-[10px] px-2 py-1.5 select-none rounded-lg border transition-all cursor-pointer font-bold ${
                      thinkingEnabled
                        ? 'bg-amber-500/10 border-amber-300 text-amber-700 shadow-sm animate-pulse'
                        : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
                    }`}
                    title={thinkingEnabled ? "Reasoning core running at full capacity (HIGH)" : "Enable high thinking mode"}
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>{thinkingEnabled ? 'THINKING: HIGH' : 'THINKING: OFF'}</span>
                  </button>
                )}
              </div>
            )}

            <button
              onClick={onClearHistory}
              className="text-[10px] text-slate-400 hover:text-slate-700 font-bold flex items-center cursor-pointer transition uppercase"
            >
              <Trash2 className="w-3 h-3 mr-1" /> Clear Chat
            </button>
          </div>
        </div>

        {/* Chat History Area */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/30 space-y-4 scrollbar-thin">
          
          {/* Friendly Novice Intro Card */}
          <div className="border border-blue-100 p-4 rounded-xl bg-gradient-to-r from-blue-50/50 to-indigo-50/20 text-slate-700 leading-relaxed border-l-4 border-l-blue-500 shadow-sm select-none">
            <div className="font-extrabold text-blue-800 mb-1 flex items-center text-xs tracking-tight uppercase">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-blue-600" />
              Your Personal AI Assistant
            </div>
            <span className="text-[11.5px] block text-slate-650 font-normal">
              Need to write code, design files, or run system actions? Simply write your request below. 
              The assistant will formulate a clear checklist of actions to let you review first.
            </span>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-blue-800 font-bold bg-white/70 border border-blue-50 rounded-lg p-2 max-w-fit">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Tip: Click on any of the quick action buttons below to test immediate AI tasks!</span>
            </div>
          </div>

          {/* Messages */}
          {chatMessages.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400 select-none">
              <HelpCircle className="w-8 h-8 text-slate-300 mb-2 animate-bounce" />
              <p className="font-semibold text-[11px]">No active conversation. Type below to begin!</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {chatMessages.map((msg) => {
                const isUser = msg.role === 'user';
                if (isUser) {
                  return (
                    <motion.div
                      key={msg.id}
                      layout="position"
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="flex flex-col items-end w-full"
                    >
                      <div className="flex items-center text-slate-400 mb-1 text-[9.5px]">
                        <span className="font-bold text-slate-500">You</span>
                        <span className="mx-1.5">•</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div className="max-w-[85%] bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-none shadow-sm whitespace-pre-wrap text-[11.5px] leading-relaxed select-text font-medium">
                        {msg.text}
                      </div>
                    </motion.div>
                  );
                }

                // System / Assistant is left aligned
                const isKernel = msg.role === 'kernel';
                return (
                  <motion.div
                    key={msg.id}
                    layout="position"
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="flex flex-col items-start w-full"
                  >
                    <div className="flex items-center text-slate-400 mb-1 text-[9.5px] w-full justify-between select-none">
                      <div className="flex items-center space-x-1.5">
                        <span className={`font-bold uppercase tracking-wider ${isKernel ? 'text-indigo-600' : 'text-blue-600'}`}>
                          {isKernel ? 'System Notice' : 'Assistant Reponse'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      
                      {!isKernel && onSynthesizeSpeech && (
                        <button
                          type="button"
                          onClick={() => onSynthesizeSpeech(msg.text)}
                          className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded cursor-pointer transition flex items-center space-x-1 border border-slate-200 bg-white"
                          title="Read out loud"
                        >
                          <Volume2 className="w-3 h-3 text-slate-500" />
                          <span className="text-[8.5px] font-semibold">Speak text</span>
                        </button>
                      )}
                    </div>

                    <div className={`max-w-[90%] px-4 py-3 rounded-2xl rounded-tl-none border shadow-sm whitespace-pre-wrap text-[11.5px] leading-relaxed select-text ${
                      isKernel 
                        ? 'bg-indigo-50/50 border-indigo-100 text-indigo-900 font-mono text-[10.5px]' 
                        : 'bg-white border-slate-200/90 text-slate-850'
                    }`}>
                      {msg.text}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {/* Loading status */}
          {isGenerating && (
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-blue-50/50 border border-blue-100/50 text-blue-800 animate-pulse w-fit max-w-[85%]">
              <Sparkles className="w-4 h-4 animate-spin text-blue-500" />
              <div>
                <span className="font-bold block text-[10.5px]">AI is crafting your solution...</span>
                <span className="text-[9.5px] block text-blue-600/80">Analyzing request steps safely</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Quick Chips */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200/80 flex flex-wrap gap-2 select-none items-center">
          <span className="text-[9.5px] text-slate-400 font-bold tracking-tight mr-1">QUICK ACTIONS:</span>
          {suggestions.map((s) => (
            <button
              key={s.title}
              onClick={() => onRunSuggestion(s.prompt)}
              className="bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-[10px] text-slate-600 font-bold px-3 py-1.5 rounded-full border border-slate-200 cursor-pointer shadow-sm transition"
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* Simple Input Form */}
        <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask AI or say 'Write a website python file'..."
            className="flex-1 bg-slate-50/60 hover:bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 outline-none text-slate-800 text-[11px] placeholder-slate-400 transition focus:border-blue-500/50 focus:bg-white focus:ring-0"
          />

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl cursor-pointer shadow-md transition flex items-center justify-center shrink-0"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </form>
      </div>
    );
  }

  // Fallback / Advanced Mode Traditional Shell View
  return (
    <div className="bg-zinc-950/70 backdrop-blur-md border border-zinc-805 rounded-xl flex flex-col h-full font-mono text-sm text-zinc-300 overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
      
      {/* Shell Header Bar */}
      <div className="bg-zinc-900 px-4 py-2.5 border-b border-zinc-805 flex flex-wrap gap-2 items-center justify-between select-none">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-cyan-400 font-bold" />
          <span className="font-semibold text-zinc-100 uppercase tracking-wider text-[10px] md:text-[11px]">Nyx OS Interactive Shell</span>
        </div>
        <div className="flex items-center space-x-3.5 ml-auto">
          {onChangeModel && modelName && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 bg-zinc-950/80 border border-zinc-800 rounded-md px-2 py-1 select-none">
                <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <select
                  value={modelName}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChangeModel(val);
                  }}
                  className="bg-transparent border-none text-[10px] text-cyan-400 font-bold outline-none cursor-pointer tracking-wider uppercase pr-1"
                  title="Select generative engine core"
                >
                  <option value="gemini-3.5-flash" className="bg-zinc-950 text-cyan-400 font-bold">Fast Flash Core</option>
                  <option value="gemini-3.1-pro-preview" className="bg-zinc-950 text-cyan-400 font-bold">Deep Pro Core</option>
                  <option value="gemini-3.1-flash-lite" className="bg-zinc-950 text-cyan-400 font-bold">Lite Kernel</option>
                </select>
              </div>

              {onToggleThinking && (
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !thinkingEnabled;
                    onToggleThinking(nextVal);
                    if (nextVal && onChangeModel) {
                      onChangeModel("gemini-3.1-pro-preview");
                    }
                  }}
                  className={`flex items-center space-x-1 text-[10px] px-2 py-1 select-none rounded-md border transition-all cursor-pointer font-bold ${
                    thinkingEnabled
                      ? 'bg-amber-500/10 border-amber-400/50 text-amber-400 font-bold animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.2)]'
                      : 'bg-zinc-950/50 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                  title={thinkingEnabled ? "Reasoning core running at full capacity (HIGH)" : "Enable high thinking mode"}
                >
                  <Brain className={`w-3.5 h-3.5 ${thinkingEnabled ? 'text-amber-400 font-bold' : 'text-zinc-500'}`} />
                  <span className="uppercase tracking-wider">
                    {thinkingEnabled ? 'THINKING: HIGH' : 'THINKING: OFF'}
                  </span>
                </button>
              )}
            </div>
          )}
          <button
            onClick={onClearHistory}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center cursor-pointer transition uppercase tracking-wider"
          >
            <Trash2 className="w-3 h-3 mr-1" /> Clear terminal
          </button>
          <div className="flex space-x-1.5 items-center">
            <div className="w-2 h-2 rounded-full bg-zinc-800" />
            <div className="w-2 h-2 rounded-full bg-zinc-800" />
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Terminal History / Output stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        
        {/* Welcome message banner */}
        <div className="border border-zinc-805 p-3.5 rounded-lg bg-zinc-900/40 text-zinc-400 leading-relaxed border-l-2 border-l-cyan-500 select-none">
          <div className="font-bold text-zinc-200 mb-1 tracking-widest text-xs">SNOWOS COGNITIVE SYSTEM v1.2</div>
          <span className="text-sm block text-zinc-400">
            Welcome to the Nyx secure shell terminal context. Here, you communicate directly with SnowOS. 
            Inputs can be standard shell syntax or natural human objectives.
          </span>
          <span className="font-bold text-cyan-400 text-xs mt-2 block">
            Suggested directives: "Build Python BeautifulSoup scraper" | "Wipe system build logs"
          </span>
        </div>

        {/* Message Iteration */}
        <AnimatePresence initial={false}>
          {chatMessages.map((msg) => {
            if (msg.role === 'user') {
              return (
                <motion.div
                  key={msg.id}
                  layout="position"
                  initial={{ opacity: 0, y: 8, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex flex-col text-sm w-full"
                >
                  <div className="flex items-center text-cyan-400/85 mb-1 select-none font-bold">
                    <span>snow-agent@snowos:~$</span>
                    <span className="text-zinc-550 font-normal ml-2 text-xs">{msg.timestamp}</span>
                  </div>
                  <div className="text-zinc-100 pl-4 border-l border-zinc-800 whitespace-pre-wrap text-sm">{msg.text}</div>
                </motion.div>
              );
            }

            // System / Agent response block
            const isKernel = msg.role === 'kernel';
            return (
              <motion.div
                key={msg.id}
                layout="position"
                initial={{ opacity: 0, y: 8, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex flex-col text-sm bg-zinc-900/20 p-2.5 border border-zinc-900 rounded-lg w-full"
              >
                <div className="flex items-center justify-between mb-1.5 select-none font-bold">
                  <div className="flex items-center">
                    <span className={isKernel ? 'text-purple-400' : 'text-cyan-400'}>
                      {isKernel ? '● [System Logs]' : '● [Nyx Agent]'}
                    </span>
                    <span className="text-zinc-555 font-normal ml-3 text-xs">{msg.timestamp}</span>
                  </div>
                  {!isKernel && onSynthesizeSpeech && (
                    <button
                      type="button"
                      onClick={() => onSynthesizeSpeech(msg.text)}
                      className="text-zinc-505 hover:text-cyan-400 p-0.5 rounded cursor-pointer transition flex items-center space-x-1"
                      title="Speak text with Gemini Voice synth"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-normal font-sans uppercase tracking-[0.05em]">Speak</span>
                    </button>
                  )}
                </div>
                <div className="pl-1.5 text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                  {msg.text}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Generative loader pending loop */}
        {isGenerating && (
          <div className="flex flex-col text-[11px] text-zinc-500 italic pb-2">
            <div className="flex items-center text-zinc-505 font-semibold mb-1">
              <Terminal className="w-3.5 h-3.5 mr-2 animate-spin text-cyan-400" />
              <span>Nyx Agent Calculating...</span>
            </div>
            <span className="pl-5 text-[10px]">Evaluating parameters against core risk protocols...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      <div className="px-4 py-2 bg-zinc-900/30 border-t border-zinc-900 flex flex-wrap gap-2 select-none items-center">
        <span className="text-[10px] text-zinc-550 uppercase mr-1">Quick Actions:</span>
        {suggestions.map((s) => (
          <button
            key={s.title}
            onClick={() => onRunSuggestion(s.prompt)}
            className="bg-zinc-900 hover:bg-zinc-850 hover:text-cyan-300 text-[10px] text-zinc-400 font-semibold px-2.5 py-1 rounded-md border border-zinc-800 cursor-pointer transition uppercase"
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Input Action Form */}
      <form onSubmit={handleSubmit} className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center space-x-2">
        <div className="text-cyan-400 font-bold select-none pl-1 text-sm">
          snow-agent@snowos:~$
        </div>
        
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter shell commands or ask Snow Agent..."
          className="flex-1 bg-transparent border-0 outline-none text-zinc-100 font-mono text-sm placeholder-zinc-650 focus:ring-0"
        />

        <button
          type="submit"
          className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 p-2 rounded-lg cursor-pointer transition flex items-center justify-center shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
