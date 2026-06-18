/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Cpu, AlertTriangle, CheckCircle, ShieldAlert, XCircle, ArrowRight, Play, Square, Settings, Calendar, HelpCircle, Shield, Radio, Key, Activity, Shuffle, Terminal, Zap, RefreshCw, Sparkles, Layers } from 'lucide-react';
import { TaskPlan, Subtask, OSPlugin, RiskLevel } from '../types';

interface SimulatedAgent {
  id: string;
  name: string;
  role: string;
  health: 'Healthy' | 'Degraded' | 'Paused';
  activeTasks: number;
  priorityWeight: number;
}

interface TaskEngineConsoleProps {
  currentPlan: TaskPlan | null;
  onAuthorizePlan: (planId: string) => void;
  onHaltPlan: (planId: string) => void;
  // Lifted Up States
  agentsList: SimulatedAgent[];
  setAgentsList: React.Dispatch<React.SetStateAction<SimulatedAgent[]>>;
  pluginsList: OSPlugin[];
  setPluginsList: React.Dispatch<React.SetStateAction<OSPlugin[]>>;
  diagnosticLogs: string[];
  setDiagnosticLogs: React.Dispatch<React.SetStateAction<string[]>>;
  throttleActive: boolean;
  setThrottleActive: React.Dispatch<React.SetStateAction<boolean>>;
  isFailureSimulated: boolean;
  setIsFailureSimulated: React.Dispatch<React.SetStateAction<boolean>>;
  retryCounter: number;
  setRetryCounter: React.Dispatch<React.SetStateAction<number>>;
  correctionPhase: 'IDLE' | 'OBSERVING' | 'VERIFYING' | 'REPAIR_TRIGGERED' | 'HEALED';
  setCorrectionPhase: React.Dispatch<React.SetStateAction<'IDLE' | 'OBSERVING' | 'VERIFYING' | 'REPAIR_TRIGGERED' | 'HEALED'>>;
  subtaskProgress: number;
  simplifiedMode?: boolean;
}

export default function TaskEngineConsole({
  currentPlan,
  onAuthorizePlan,
  onHaltPlan,
  agentsList,
  setAgentsList,
  pluginsList,
  setPluginsList,
  diagnosticLogs,
  setDiagnosticLogs,
  throttleActive,
  setThrottleActive,
  isFailureSimulated,
  setIsFailureSimulated,
  retryCounter,
  setRetryCounter,
  correctionPhase,
  setCorrectionPhase,
  subtaskProgress,
  simplifiedMode = false
}: TaskEngineConsoleProps) {

  const setAssignedAgentName = (arg: string) => {
    if (arg.includes('mkdir') || arg.includes('touch') || arg.includes('create_file')) return 'FileOracle';
    if (arg.includes('install') || arg.includes('pip') || arg.includes('npm')) return 'KernelCore';
    return 'HeuristicsPlanner';
  };

  const togglePlugin = (id: string) => {
    setPluginsList(plg =>
      plg.map(p => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  return (
    <div className={`grid grid-cols-1 xl:grid-cols-4 gap-4 h-full text-xs ${
      simplifiedMode ? 'font-sans text-slate-700' : 'font-mono text-zinc-300'
    }`}>
      {/* Column 1 & 2: Main Dynamic Monitor Dashboard & DAG Visualizer */}
      <div className={`xl:col-span-3 border p-4 flex flex-col justify-between h-full rounded-2xl transition-all duration-300 ${
        simplifiedMode 
          ? 'bg-white border-slate-200/80 shadow-sm hover:shadow-md' 
          : 'bg-zinc-950/70 border-zinc-805 shadow-[0_4px_30px_rgba(0,0,0,0.4)]'
      }`}>
        <div>
          {/* Header Bar */}
          <div className={`flex items-center justify-between border-b pb-3 mb-4 ${
            simplifiedMode ? 'border-slate-100' : 'border-zinc-805'
          }`}>
            <div className="flex items-center space-x-2">
              <Cpu className={`w-5 h-5 ${simplifiedMode ? 'text-blue-600' : 'text-cyan-400'}`} />
              <div>
                <span className={`font-bold uppercase tracking-widest text-[11px] ${
                  simplifiedMode ? 'text-slate-850 font-extrabold' : 'text-zinc-100'
                }`}>
                  {simplifiedMode ? 'Action checklist' : 'SnowOS Executive Orchestrator'}
                </span>
                <span className={`block text-[8px] font-bold tracking-widest mt-0.5 ${
                  simplifiedMode ? 'text-slate-400' : 'text-zinc-550'
                }`}>
                  {simplifiedMode ? 'AI PIPELINE CHECKLIST' : 'MULTI-AGENT COORDINATOR CORE'}
                </span>
              </div>
            </div>
            {currentPlan && (
              <span className={`text-[10px] px-2.5 py-1 rounded border uppercase tracking-widest font-bold ${
                currentPlan.status === 'success' ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400' :
                currentPlan.status === 'running' ? 'bg-cyan-950/40 border-cyan-500/20 text-cyan-400 animate-pulse' :
                currentPlan.status === 'waiting_authorization' ? 'bg-amber-950/40 border-amber-500/20 text-amber-400' :
                'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}>
                {currentPlan.status.toUpperCase()}
              </span>
            )}
          </div>

          {!currentPlan ? (
            <div className={`flex flex-col items-center justify-center py-24 text-center space-y-3 ${
              simplifiedMode ? 'text-slate-400' : 'text-zinc-555'
            }`}>
              <Activity className={`w-14 h-14 animate-pulse ${simplifiedMode ? 'text-slate-200' : 'text-zinc-805'}`} />
              <div>
                <p className={`font-bold uppercase tracking-widest text-[11px] ${
                  simplifiedMode ? 'text-slate-700' : 'text-zinc-400'
                }`}>
                  System Idle. Standby Mode.
                </p>
                <p className={`text-[10px] max-w-sm mt-2 font-sans leading-relaxed ${
                  simplifiedMode ? 'text-slate-500' : 'text-zinc-500'
                }`}>
                  Submit a prompt in the <strong>AI Assistant</strong> workspace (e.g. "Create beautifulscraper modules") to orchestrate a priority pipeline.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Objective Summary Card */}
              <div className={`border p-3.5 rounded-xl flex flex-wrap gap-4 items-center justify-between transition-all duration-300 ${
                simplifiedMode 
                  ? 'bg-slate-50 border-slate-150' 
                  : 'bg-zinc-900/60 border-zinc-805'
              }`}>
                <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded tracking-widest border ${
                      simplifiedMode 
                        ? 'bg-blue-50 text-blue-600 border-blue-200/50' 
                        : 'bg-cyan-955 text-cyan-400 border-cyan-500/20'
                    }`}>TARGET_OBJECTIVE</span>
                    <span className={simplifiedMode ? 'text-slate-300' : 'text-zinc-650'}>•</span>
                    <span className={`text-[9px] ${simplifiedMode ? 'text-slate-400' : 'text-zinc-505'}`}>ID: #{currentPlan.id}</span>
                  </div>
                  <div className={`text-[13px] font-bold uppercase tracking-tight ${
                    simplifiedMode ? 'text-slate-800' : 'text-zinc-105'
                  }`}>{currentPlan.goal}</div>
                </div>

                <div className="flex items-center gap-2.5 text-[9px] uppercase font-bold text-zinc-405">
                  <div className={`border px-2.5 py-1.5 rounded-lg ${
                    simplifiedMode ? 'bg-white border-slate-200 text-slate-700' : 'bg-zinc-950 border-zinc-850 text-zinc-400'
                  }`}>
                    PRIORITY: <span className={simplifiedMode ? 'text-blue-600' : 'text-zinc-200'}>{currentPlan.priority}</span>
                  </div>
                  <div className={`border px-2.5 py-1.5 rounded-lg ${
                    simplifiedMode ? 'bg-white border-slate-200 text-slate-700' : 'bg-zinc-950 border-zinc-850 text-zinc-400'
                  }`}>
                    CRITICALITY: <span className={`${
                      currentPlan.riskLevel === 'HIGH' || currentPlan.riskLevel === 'CRITICAL' 
                        ? 'text-rose-600 font-bold' 
                        : simplifiedMode ? 'text-emerald-600' : 'text-emerald-400'
                    }`}>{currentPlan.riskLevel}</span>
                  </div>
                </div>
              </div>

              {/* Phase 7: Explicit Security Approval Matrix Overlay */}
              {currentPlan.status === 'waiting_authorization' && (
                <div className={`border rounded-xl p-4 space-y-3.5 ${
                  simplifiedMode 
                    ? 'bg-rose-50 border-rose-200 text-rose-800' 
                    : 'bg-rose-955/20 border-rose-500/30'
                }`}>
                  <div className="flex items-start space-x-3">
                    <ShieldAlert className={`w-5.5 h-5.5 shrink-0 mt-0.5 ${simplifiedMode ? 'text-rose-600' : 'text-rose-450'}`} />
                    <div>
                      <div className={`text-xs font-bold uppercase tracking-wider ${simplifiedMode ? 'text-rose-805' : 'text-rose-300'}`}>
                        TACTILE PERMISSION SHIELD AUDIT HIGH_RISK
                      </div>
                      <p className={`text-[10px] mt-1 font-sans leading-relaxed ${simplifiedMode ? 'text-rose-700' : 'text-rose-200/80'}`}>
                        Security core assessed executing payload command has high-risk criteria. Execution is locked until terminal approval overrides are acknowledged.
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center space-x-2 pt-2 border-t ${simplifiedMode ? 'border-rose-200' : 'border-rose-500/10'}`}>
                    <button
                      onClick={() => onAuthorizePlan(currentPlan.id)}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded flex items-center transition cursor-pointer text-[10px] uppercase tracking-wider"
                    >
                      <Shield className="w-3.5 h-3.5 mr-1.5" /> Override Approved (Grant execution key)
                    </button>
                    <button
                      onClick={() => onHaltPlan(currentPlan.id)}
                      className={`border px-3.5 py-2 rounded transition cursor-pointer text-[10px] uppercase tracking-wider ${
                        simplifiedMode 
                          ? 'border-slate-300 hover:bg-slate-100 text-slate-600' 
                          : 'border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Halt Safe Thread
                    </button>
                  </div>
                </div>
              )}

              {/* Phase 2: Dependency-Aware DAG Graph Canvas */}
              <div className={`border p-3.5 rounded-xl space-y-3 ${
                simplifiedMode ? 'bg-slate-50/50 border-slate-200/60' : 'bg-zinc-900/30 border-zinc-805/80'
              }`}>
                <div className={`flex items-center justify-between border-b pb-2 mb-1 text-[9px] font-bold uppercase tracking-wider ${
                  simplifiedMode ? 'border-slate-200/40 text-slate-400' : 'border-zinc-950 text-zinc-500'
                }`}>
                  <span className={`flex items-center gap-1.5 ${simplifiedMode ? 'text-slate-600' : 'text-zinc-350'}`}>
                    <Shuffle className={`w-3.5 h-3.5 ${simplifiedMode ? 'text-blue-600' : 'text-cyan-400'}`} />
                    Dependency DAG Graph Execution Pipeline
                  </span>
                  <span className={simplifiedMode ? 'text-blue-600' : 'text-cyan-400'}>
                    STATUS: {currentPlan.status === 'running' ? 'RESOLVING PARALLEL NODES' : 'COMPILED'}
                  </span>
                </div>

                <div className="relative flex flex-col space-y-2 max-h-[190px] overflow-y-auto pr-1">
                  {currentPlan.subtasks.map((task, idx) => {
                    const isCurrent = currentPlan.currentStepIndex === idx && currentPlan.status === 'running';
                    const isSuccess = idx < currentPlan.currentStepIndex || currentPlan.status === 'success';
                    
                    // Simulated dependency mapping: step 2 depends on 1, step 3 depends on 2 etc.
                    const dependencies = idx > 0 ? [`Step ${idx}`] : null;

                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-lg border transition-all duration-300 relative ${
                          simplifiedMode
                            ? isCurrent
                              ? 'bg-blue-50/70 border-blue-300 shadow-sm'
                              : isSuccess
                                ? 'bg-emerald-50/30 border-emerald-250/50 opacity-70'
                                : 'bg-white border-slate-200/80'
                            : isCurrent 
                              ? 'bg-cyan-950/20 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.06)]' 
                              : isSuccess 
                                ? 'bg-emerald-950/5 border-emerald-500/10 opacity-70' 
                                : 'bg-zinc-900/30 border-zinc-900/60'
                        }`}
                      >
                        {/* Connecting Line to next step visually */}
                        {idx < currentPlan.subtasks.length - 1 && (
                          <div className={`absolute bottom-[-10px] left-[23px] w-[1px] h-[10px] ${
                            isSuccess ? 'bg-emerald-500/30' : simplifiedMode ? 'bg-slate-200' : 'bg-zinc-800'
                          }`} />
                        )}

                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center space-x-3 shrink-1 min-w-0">
                            {/* Animated Engine Status Ticks */}
                            {isSuccess ? (
                              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : isCurrent ? (
                              <div className="relative">
                                <Cpu className={`w-4 h-4 animate-spin shrink-0 ${simplifiedMode ? 'text-blue-600' : 'text-cyan-400'}`} />
                                <span className={`absolute inset-0 rounded-full border animate-ping ${simplifiedMode ? 'border-blue-400/30' : 'border-cyan-500/30'}`} />
                              </div>
                            ) : (
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-bold shrink-0 ${
                                simplifiedMode ? 'border-slate-300 text-slate-500' : 'border-zinc-800 text-zinc-550'
                              }`}>
                                {task.id}
                              </div>
                            )}

                            <div className="min-w-0">
                              <h4 className={`font-bold transition ${
                                isCurrent 
                                  ? simplifiedMode ? 'text-blue-650 text-[11px]' : 'text-cyan-450 text-[11px]' 
                                  : simplifiedMode ? 'text-slate-800' : 'text-zinc-300'
                              }`}>
                                {task.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 text-[8px] font-mono select-none">
                                <span className={simplifiedMode ? 'text-slate-400' : 'text-zinc-650'}>EXEC:</span>
                                <span className={`truncate max-w-[280px] font-semibold px-1 py-0.5 rounded border ${
                                  simplifiedMode 
                                    ? 'bg-slate-100 border-slate-200 text-slate-600' 
                                    : 'bg-zinc-950 border-zinc-900 text-zinc-400'
                                }`}>{task.actionText}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 text-right">
                            {/* Shows parent depend targets */}
                            {dependencies && (
                              <div className={`text-[8px] border px-1.5 py-0.5 rounded font-bold ${
                                simplifiedMode ? 'border-slate-200 text-slate-500' : 'border-zinc-850 text-zinc-550'
                              }`}>
                                DEPENDS: {dependencies.join(', ')}
                              </div>
                            )}
                            <div className={`text-[8px] select-none px-1.5 py-0.5 rounded ${
                              simplifiedMode ? 'bg-slate-100 text-slate-500' : 'bg-zinc-900 text-zinc-450'
                            }`}>
                              AGENT: <span className={simplifiedMode ? 'text-slate-700' : 'text-zinc-300'}>{setAssignedAgentName(task.actionText)}</span>
                            </div>
                            {isCurrent && (
                              <div className={`w-16 rounded-full h-1 overflow-hidden hidden sm:block border ${
                                simplifiedMode ? 'bg-slate-200 border-slate-300' : 'bg-zinc-900 border-zinc-850'
                              }`}>
                                <div className={`h-full rounded-full ${simplifiedMode ? 'bg-blue-600' : 'bg-cyan-400'}`} style={{ width: `${subtaskProgress}%` }} />
                              </div>
                            )}
                            <span className={`text-[9px] font-mono whitespace-nowrap ${simplifiedMode ? 'text-slate-400' : 'text-zinc-500'}`}>
                              {(task.duration / 1000).toFixed(1)}s
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Phase 6 Observability Diagnostics Console Panel */}
        <div className={`mt-4 pt-3.5 border-t ${simplifiedMode ? 'border-slate-100' : 'border-zinc-905'}`}>
          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider mb-2">
            <span className={`flex items-center gap-1 ${simplifiedMode ? 'text-slate-505' : 'text-zinc-500'}`}>
              <Terminal className={`w-3.5 h-3.5 ${simplifiedMode ? 'text-blue-600' : 'text-cyan-400'}`} />
              Observability Diagnostics Log
            </span>
            <div className="flex items-center gap-2">
              <span className={simplifiedMode ? 'text-slate-400 text-[8px]' : 'text-zinc-500 text-[7.5px]'}>PHASE 4 ENGINE</span>
              <button
                type="button"
                onClick={() => {
                  setIsFailureSimulated(true);
                  setRetryCounter(0);
                  setDiagnosticLogs(prev => [
                    ...prev,
                    `[TEST_TRIGGER] Operator initiated simulated container crash event to observe self-rectifying operations.`,
                  ]);
                }}
                disabled={!currentPlan || currentPlan.status !== 'running' || isFailureSimulated}
                className={`px-2 py-0.5 rounded border text-[8px] font-bold select-none cursor-pointer ${
                  !currentPlan || currentPlan.status !== 'running' || isFailureSimulated
                    ? simplifiedMode 
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-zinc-950 border-zinc-900 text-zinc-700 cursor-not-allowed'
                    : simplifiedMode
                      ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600 animate-pulse'
                      : 'bg-rose-955/20 hover:bg-rose-955/40 border-rose-500/20 text-rose-400 animate-pulse'
                }`}
              >
                Simulate Repair Cycle
              </button>
            </div>
          </div>
          <div className={`w-full p-2.5 rounded border text-[9px] font-mono max-h-[85px] overflow-y-auto space-y-1 select-text scrollbar-thin ${
            simplifiedMode
              ? 'bg-slate-900 border-slate-950 text-slate-300'
              : 'bg-zinc-950 border-zinc-900 text-zinc-400'
          }`}>
            {diagnosticLogs.map((log, index) => (
              <div key={index} className="flex items-start">
                <span className="text-zinc-650 mr-2 select-none">[{index}]</span>
                <span className={
                  log.includes('[SUCCESS') || log.includes('[REPAIR') || log.includes('[SYSTEM_HEALED') ? 'text-emerald-400' :
                  log.includes('[FAILURE') ? 'text-rose-400 font-bold' :
                  log.includes('[VERIFY') ? 'text-amber-450' : 'text-zinc-300'
                }>{log}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Column 3: Multi-agent statuses, plugins, and environment constraints */}
      <div className="space-y-4 h-full xl:col-span-1 flex flex-col justify-between">
        {/* Phase 1: Real-time Multi-Agent Network Status */}
        <div className={`border p-4 flex flex-col rounded-2xl transition-all duration-300 ${
          simplifiedMode 
            ? 'bg-white border-slate-200/80 shadow-sm hover:shadow-md' 
            : 'bg-zinc-950/70 border-zinc-805 shadow-[0_4px_30px_rgba(0,0,0,0.4)]'
        }`}>
          <div className={`flex items-center justify-between border-b pb-2.5 mb-3 ${
            simplifiedMode ? 'border-slate-100' : 'border-zinc-808'
          }`}>
            <div className="flex items-center space-x-1.5">
              <Sparkles className={`w-4 h-4 animate-pulse ${simplifiedMode ? 'text-blue-605' : 'text-cyan-400'}`} />
              <span className={`font-bold uppercase tracking-wider text-[10px] ${
                simplifiedMode ? 'text-slate-800' : 'text-zinc-100'
              }`}>Agents Directory</span>
            </div>
            <span className={`text-[8px] border px-1.5 py-0.5 rounded uppercase font-bold ${
              simplifiedMode 
                ? 'bg-blue-50 border-blue-200/50 text-blue-600' 
                : 'bg-cyan-950/60 border border-cyan-800/20 text-cyan-400'
            }`}>4 ONLINE</span>
          </div>

          <div className="space-y-2.5">
            {agentsList.map((agent) => (
              <div key={agent.id} className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                simplifiedMode 
                  ? 'bg-slate-50 border-slate-150 hover:border-slate-300' 
                  : 'bg-zinc-900/65 border-zinc-850 hover:border-zinc-700'
              }`}>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-bold ${simplifiedMode ? 'text-slate-800 font-extrabold' : 'text-zinc-200'}`}>{agent.name}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      agent.health === 'Healthy' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`} />
                  </div>
                  <span className={`text-[8px] font-medium tracking-tight block uppercase ${
                    simplifiedMode ? 'text-slate-450' : 'text-zinc-500'
                  }`}>{agent.role}</span>
                </div>

                <div className={`text-right text-[8px] font-mono uppercase leading-normal font-bold ${
                  simplifiedMode ? 'text-slate-500' : 'text-zinc-400'
                }`}>
                  <div>TASKS: <span className={agent.activeTasks > 0 ? (simplifiedMode ? 'text-blue-600 font-extrabold' : 'text-cyan-400 animate-pulse') : 'text-zinc-500'}>{agent.activeTasks}</span></div>
                  <div>WEIGHT: <span className={simplifiedMode ? 'text-slate-700' : 'text-zinc-350'}>{agent.priorityWeight}x</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Phase 8: Dynamic Extensible Plugins Registry */}
        <div className={`border p-4 flex flex-col rounded-2xl transition-all duration-300 ${
          simplifiedMode 
            ? 'bg-white border-slate-200/80 shadow-sm hover:shadow-md' 
            : 'bg-zinc-950/70 border-zinc-805 shadow-[0_4px_30px_rgba(0,0,0,0.4)]'
        }`}>
          <div className={`flex items-center justify-between border-b pb-2.5 mb-3 ${
            simplifiedMode ? 'border-slate-100' : 'border-zinc-808'
          }`}>
            <div className="flex items-center space-x-1.5">
              <Settings className={`w-4 h-4 ${simplifiedMode ? 'text-purple-600' : 'text-purple-400'}`} />
              <span className={`font-bold uppercase tracking-wider text-[10px] ${
                simplifiedMode ? 'text-slate-800' : 'text-zinc-100'
              }`}>Plugins Registry</span>
            </div>
            <span className={`text-[8px] font-mono tracking-tight font-bold ${
              simplifiedMode ? 'text-slate-400' : 'text-zinc-500'
            }`}>v1.2 ACTIVE</span>
          </div>

          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {pluginsList.map((plg) => (
              <div key={plg.id} className={`p-2.5 rounded-xl border transition ${
                simplifiedMode
                  ? plg.enabled ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100 opacity-40'
                  : plg.enabled ? 'bg-zinc-900 border-zinc-805' : 'bg-zinc-950 border-zinc-900 opacity-40'
              }`}>
                <div className="flex items-center justify-between select-none">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className={`font-bold text-[11px] truncate max-w-[120px] ${
                      simplifiedMode ? 'text-slate-800 font-extrabold' : 'text-zinc-200'
                    }`}>{plg.name}</span>
                    <span className={`text-[8px] font-mono ${simplifiedMode ? 'text-slate-400' : 'text-zinc-500'}`}>{plg.version}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plg.enabled}
                      onChange={() => togglePlugin(plg.id)}
                      className="sr-only peer"
                    />
                    <div className={`w-6 h-3 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[1.5px] after:rounded-full after:h-2 after:w-2 after:transition-all ${
                      simplifiedMode
                        ? 'bg-slate-200 after:bg-slate-400 after:border-slate-400 peer-checked:bg-purple-600'
                        : 'bg-zinc-800 after:bg-zinc-450 after:border-zinc-550 after:border peer-checked:bg-purple-500'
                    }`} />
                  </label>
                </div>
                <p className={`text-[8.5px] font-sans leading-relaxed mt-1 ${
                  simplifiedMode ? 'text-slate-500' : 'text-zinc-500/90'
                }`}>{plg.description}</p>
                <div className={`flex justify-between items-center mt-2 border-t pt-1.5 text-[8px] font-mono uppercase ${
                  simplifiedMode ? 'border-slate-200/50 text-slate-400' : 'border-zinc-950/60 text-zinc-505'
                }`}>
                  <span>SCOPE: <strong className={simplifiedMode ? 'text-slate-700 font-semibold' : 'text-zinc-305'}>{plg.permissionScope}</strong></span>
                  <span>TIME: <strong className={simplifiedMode ? 'text-slate-600 font-semibold' : 'text-zinc-400 font-semibold'}>{plg.loadTimeMs}ms</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Phase 5: World State Environment Monitoring Constraints */}
        <div className={`border p-4 flex flex-col justify-between rounded-2xl transition-all duration-300 ${
          simplifiedMode 
            ? 'bg-white border-slate-200/80 shadow-sm hover:shadow-md' 
            : 'bg-zinc-950/70 border-zinc-805 shadow-[0_4px_30px_rgba(0,0,0,0.4)]'
        }`}>
          <div>
            <div className={`flex items-center space-x-1.5 border-b pb-2.5 mb-2.5 ${
              simplifiedMode ? 'border-slate-100' : 'border-zinc-808'
            }`}>
              <Layers className={`w-4 h-4 animate-pulse ${simplifiedMode ? 'text-emerald-605' : 'text-emerald-400'}`} />
              <span className={`font-bold uppercase tracking-wider text-[10px] ${
                simplifiedMode ? 'text-slate-800' : 'text-zinc-100'
              }`}>World State Rules</span>
            </div>
            <p className={`text-[9px] font-sans leading-relaxed ${
              simplifiedMode ? 'text-slate-500' : 'text-zinc-505'
            }`}>
              Environment feedback dynamically scales task duration speeds during active spikes to prevent pipeline core freezes.
            </p>

            <div className="space-y-2 mt-3 select-none">
              <div className={`flex items-center justify-between p-2 rounded-lg border ${
                simplifiedMode ? 'bg-slate-50 border-slate-150' : 'bg-zinc-900 border-zinc-850'
              }`}>
                <span className={`text-[9px] ${simplifiedMode ? 'text-slate-600' : 'text-zinc-350'}`}>CPU spikes safety throttle</span>
                <button
                  type="button"
                  onClick={() => setThrottleActive(!throttleActive)}
                  className={`px-2 py-1 rounded text-[8px] font-bold font-mono transition uppercase cursor-pointer ${
                    throttleActive 
                      ? simplifiedMode
                        ? 'bg-amber-100 border border-amber-300 text-amber-700 animate-pulse font-extrabold'
                        : 'bg-amber-955/40 border border-amber-500/30 text-amber-400 animate-pulse'
                      : simplifiedMode
                        ? 'bg-slate-200 border-slate-300 text-slate-500'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                  }`}
                >
                  {throttleActive ? 'THROTTLE_ACTIVE' : 'STANDBY'}
                </button>
              </div>
              <div className={`flex items-center justify-between text-[8px] border-t pt-2 font-mono ${
                simplifiedMode ? 'border-slate-150 text-slate-400' : 'border-zinc-900 text-zinc-550'
              }`}>
                <span>HEAP DRAIN LIMIT: <strong className={simplifiedMode ? 'text-slate-600' : 'text-zinc-400'}>128MB</strong></span>
                <span>FAILOVER RETRIES: <strong className={simplifiedMode ? 'text-slate-600' : 'text-zinc-400'}>MAX_3</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
