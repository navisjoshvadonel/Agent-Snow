/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shield, Cpu, RefreshCw, Layers, Radio, HelpCircle, Activity, User, Sparkles, Terminal, CheckCircle } from 'lucide-react';
import { SystemStatus, ResourceMetric } from '../types';

interface DesktopHeaderProps {
  status: SystemStatus;
  metrics: ResourceMetric;
  serverConnected: boolean;
  onRefreshMetrics: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userModelName: string;
  simplifiedMode: boolean;
  onToggleSimplifiedMode: (val: boolean) => void;
}

export default function DesktopHeader({
  status,
  metrics,
  serverConnected,
  onRefreshMetrics,
  activeTab,
  setActiveTab,
  userModelName,
  simplifiedMode,
  onToggleSimplifiedMode,
}: DesktopHeaderProps) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabs = simplifiedMode ? [
    { id: 'shell', label: 'AI Assistant', icon: Sparkles },
    { id: 'tasks', label: 'Action Checklist', icon: CheckCircle },
    { id: 'memory', label: 'AI Memory & Profile', icon: User },
    { id: 'files', label: 'My Saved Documents', icon: Shield },
  ] : [
    { id: 'shell', label: 'Nyx Console', icon: Activity },
    { id: 'tasks', label: 'Task Engine', icon: Cpu },
    { id: 'memory', label: 'Memory Core', icon: Layers },
    { id: 'files', label: 'Workspace Files', icon: Shield },
  ];

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 border-b ${
      simplifiedMode 
        ? 'border-slate-200 bg-white/95 backdrop-blur-md shadow-sm text-slate-800' 
        : 'border-zinc-800 bg-zinc-950/80 backdrop-blur-md text-zinc-300'
    } px-6 py-3 flex flex-col md:flex-row gap-3 items-center justify-between text-xs font-sans`}>
      
      {/* OS Branding / Logo */}
      <div className="flex items-center space-x-3 select-none">
        <div className="relative">
          {simplifiedMode ? (
            <div className="w-5.5 h-5.5 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-[11px] text-white shadow-md">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-cyan-400 via-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-[10px] text-white shadow-[0_0_8px_rgba(6,182,212,0.6)] animate-pulse">
              S
            </div>
          )}
          <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border ${simplifiedMode ? 'border-white' : 'border-zinc-950'} bg-emerald-500`} />
        </div>
        <div>
          <span className={`font-mono tracking-widest font-bold ${simplifiedMode ? 'text-slate-900 text-sm' : 'text-zinc-105'}`}>
            {simplifiedMode ? 'SnowOS Agent' : 'SNOWOS'}
          </span>
          <span className={`text-[9px] font-mono ml-2 px-1.5 py-0.5 select-none border rounded ${
            simplifiedMode 
              ? 'border-blue-200 text-blue-600 bg-blue-50 font-bold' 
              : 'border-cyan-500/20 text-cyan-400 bg-cyan-500/5'
          }`}>
            {simplifiedMode ? 'Friendly Edition' : 'v1.2.0-Alpha'}
          </span>
        </div>
      </div>

      {/* Center Segment View Mode Selector Toggle */}
      <div className={`flex items-center p-1 rounded-xl border select-none ${
        simplifiedMode ? 'bg-slate-100 border-slate-250' : 'bg-zinc-900 border-zinc-800'
      }`}>
        <button
          onClick={() => onToggleSimplifiedMode(false)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-semibold transition-all duration-200 cursor-pointer ${
            !simplifiedMode
              ? 'bg-cyan-500 text-zinc-950 shadow-sm font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          title="Switch to detailed developer console with shell telemetry"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Advanced</span>
        </button>
        <button
          onClick={() => onToggleSimplifiedMode(true)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-semibold transition-all duration-200 cursor-pointer ${
            simplifiedMode
              ? 'bg-blue-600 text-white shadow-md font-bold'
              : 'text-zinc-505 hover:text-zinc-200'
          }`}
          title="Switch to simplified human-readable AI assistant interface"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Simplified</span>
        </button>
      </div>

      {/* Navigation tabs */}
      <nav className={`flex space-x-1 border p-0.5 rounded-lg select-none ${
        simplifiedMode ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900/60 border-zinc-805'
      }`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-3 py-1.5 rounded-md transition-all duration-200 cursor-pointer text-[10.5px] uppercase tracking-wider font-semibold ${
                isActive
                  ? simplifiedMode
                    ? 'bg-white text-blue-600 shadow-sm border-b-2 border-blue-650'
                    : 'bg-cyan-950/35 border-b border-cyan-505 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.1)]'
                  : simplifiedMode
                    ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 mr-1.5 ${isActive ? (simplifiedMode ? 'text-blue-600' : 'text-cyan-400') : 'text-zinc-505'}`} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Resource widget and Quick Clock */}
      <div className="flex items-center space-x-4">
        {/* Connection Pulse */}
        <div className={`flex items-center space-x-1.5 ${simplifiedMode ? 'text-slate-500' : 'text-zinc-500'}`}>
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              serverConnected ? 'bg-cyan-400' : 'bg-amber-400'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              serverConnected ? 'bg-cyan-500' : 'bg-amber-500'
            }`}></span>
          </span>
          <span className={`hidden md:inline text-[9.5px] font-mono select-none tracking-tight ${simplifiedMode ? 'text-slate-500 font-bold' : ''}`}>
            {simplifiedMode 
              ? (serverConnected ? 'AI Connected' : 'Local Safe Mode') 
              : (serverConnected ? 'Agent Live' : 'Sandbox Mode')
            }
          </span>
        </div>

        {/* Live system monitoring preview */}
        {!simplifiedMode && (
          <div className="hidden lg:flex items-center space-x-3 pr-2 border-r border-zinc-800 select-none">
            <div className="flex items-center space-x-1 font-mono">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-zinc-200 font-medium">{metrics.cpu}%</span>
              <span className="text-zinc-500 text-[9px]">CPU</span>
            </div>
            <div className="flex items-center space-x-1 font-mono">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-zinc-200 font-medium">{metrics.memory}%</span>
              <span className="text-zinc-500 text-[9px]">RAM</span>
            </div>
          </div>
        )}

        {/* User Identity widget */}
        <div className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-[11px] select-none border ${
          simplifiedMode 
            ? 'bg-slate-100 border-slate-200 text-slate-700' 
            : 'bg-zinc-900 border-zinc-800 text-zinc-400'
        }`}>
          <User className={`w-3.5 h-3.5 ${simplifiedMode ? 'text-slate-500' : 'text-zinc-550'}`} />
          <span className={`font-medium tracking-tight truncate max-w-[80px] ${simplifiedMode ? 'text-slate-800' : 'text-zinc-200'}`}>
            {userModelName || 'User'}
          </span>
        </div>

        {/* Active Clock */}
        <div className={`font-mono tracking-widest font-semibold tabular-nums select-none border px-2.5 py-1.5 rounded shadow-[0_0_8px_rgba(6,182,212,0.15)] ${
          simplifiedMode 
            ? 'bg-slate-50 border-slate-200 text-blue-650' 
            : 'bg-zinc-900 border-zinc-800 text-cyan-400'
        }`}>
          {timeStr || '00:00:00'}
        </div>
      </div>
    </header>
  );
}
