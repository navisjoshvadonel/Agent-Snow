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
  subtaskProgress
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
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 h-full font-mono text-xs text-zinc-300">
      {/* Column 1 & 2: Main Dynamic Monitor Dashboard & DAG Visualizer */}
      <div className="xl:col-span-3 bg-zinc-950/70 border border-zinc-805 rounded-xl p-4 flex flex-col justify-between h-full shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div>
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-zinc-805 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <div>
                <span className="font-semibold text-zinc-100 uppercase tracking-widest text-[11px]">SnowOS Executive Orchestrator</span>
                <span className="block text-[8px] text-zinc-550 font-bold tracking-widest mt-0.5">MULTI-AGENT COORDINATOR CORE</span>
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
            <div className="flex flex-col items-center justify-center py-24 text-zinc-550 text-center space-y-3">
              <Activity className="w-14 h-14 text-zinc-805 animate-pulse" />
              <div>
                <p className="font-bold text-zinc-400 uppercase tracking-widest text-[11px]">System Idle. Standby Mode.</p>
                <p className="text-[10px] max-w-sm mt-2 text-zinc-500 font-sans leading-relaxed">
                  Submit a prompt in the <strong>Nyx Console</strong> workspace (e.g. "Create beautifulscraper modules") to orchestrate a priority pipeline.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Objective Summary Card */}
              <div className="bg-zinc-900/60 border border-zinc-805 p-3.5 rounded-lg flex flex-wrap gap-4 items-center justify-between">
                <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] bg-cyan-950 text-cyan-400 font-bold px-1.5 py-0.5 rounded tracking-widest border border-cyan-500/20">TARGET_OBJECTIVE</span>
                    <span className="text-zinc-650">•</span>
                    <span className="text-zinc-505 text-[9px]">ID: #{currentPlan.id}</span>
                  </div>
                  <div className="text-[13px] font-bold text-zinc-100 uppercase tracking-tight">{currentPlan.goal}</div>
                </div>

                <div className="flex items-center gap-2.5 text-[9px] uppercase font-bold text-zinc-405">
                  <div className="bg-zinc-950 border border-zinc-850 px-2.5 py-1.5 rounded">
                    PRIORITY: <span className="text-zinc-200">{currentPlan.priority}</span>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-850 px-2.5 py-1.5 rounded">
                    CRITICALITY: <span className={`${
                      currentPlan.riskLevel === 'HIGH' || currentPlan.riskLevel === 'CRITICAL' ? 'text-rose-450 font-bold' : 'text-emerald-400'
                    }`}>{currentPlan.riskLevel}</span>
                  </div>
                </div>
              </div>

              {/* Phase 7: Explicit Security Approval Matrix Overlay */}
              {currentPlan.status === 'waiting_authorization' && (
                <div className="bg-rose-950/20 border border-rose-500/30 rounded-lg p-4 space-y-3.5">
                  <div className="flex items-start space-x-3">
                    <ShieldAlert className="w-5.5 h-5.5 text-rose-450 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-rose-300 uppercase tracking-wider">TACTILE PERMISSION SHIELD AUDIT HIGH_RISK</div>
                      <p className="text-[10px] text-rose-200/80 mt-1 font-sans leading-relaxed">
                        Security core assessed executing payload command has high-risk criteria. Execution is locked until terminal approval overrides are acknowledged.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-2 border-t border-rose-500/10">
                    <button
                      onClick={() => onAuthorizePlan(currentPlan.id)}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded flex items-center transition cursor-pointer text-[10px] uppercase tracking-wider"
                    >
                      <Shield className="w-3.5 h-3.5 mr-1.5" /> Override Approved (Grant execution key)
                    </button>
                    <button
                      onClick={() => onHaltPlan(currentPlan.id)}
                      className="border border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-white px-3.5 py-2 rounded transition cursor-pointer text-[10px] uppercase tracking-wider"
                    >
                      Halt Safe Thread
                    </button>
                  </div>
                </div>
              )}

              {/* Phase 2: Dependency-Aware DAG Graph Canvas */}
              <div className="bg-zinc-900/30 border border-zinc-805/80 p-3.5 rounded-lg space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-950 pb-2 mb-1 text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-zinc-350">
                    <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
                    Dependency DAG Graph Execution Pipeline
                  </span>
                  <span className="text-cyan-400">STATUS: {currentPlan.status === 'running' ? 'RESOLVING PARALLEL NODES' : 'COMPILED'}</span>
                </div>

                <div className="relative flex flex-col space-y-2 max-h-[190px] overflow-y-auto pr-1">
                  {currentPlan.subtasks.map((task, idx) => {
                    const isCurrent = currentPlan.currentStepIndex === idx && currentPlan.status === 'running';
                    const isSuccess = idx < currentPlan.currentStepIndex || currentPlan.status === 'success';
                    const isPending = idx > currentPlan.currentStepIndex && currentPlan.status !== 'success';
                    
                    // Simulated dependency mapping: step 2 depends on 1, step 3 depends on 2 etc.
                    const dependencies = idx > 0 ? [`Step ${idx}`] : null;

                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-lg border transition-all duration-300 relative ${
                          isCurrent 
                            ? 'bg-cyan-950/20 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.06)]' 
                            : isSuccess 
                              ? 'bg-emerald-950/5 border-emerald-500/10 opacity-70' 
                              : 'bg-zinc-900/30 border-zinc-900/60'
                        }`}
                      >
                        {/* Connecting Line to next step visually */}
                        {idx < currentPlan.subtasks.length - 1 && (
                          <div className={`absolute bottom-[-10px] left-[23px] w-[1px] h-[10px] ${
                            isSuccess ? 'bg-emerald-500/30' : 'bg-zinc-800'
                          }`} />
                        )}

                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center space-x-3 shrink-1 min-w-0">
                            {/* Animated Engine Status Ticks */}
                            {isSuccess ? (
                              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : isCurrent ? (
                              <div className="relative">
                                <Cpu className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                                <span className="absolute inset-0 rounded-full border border-cyan-500/30 animate-ping" />
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-zinc-800 flex items-center justify-center text-[8px] text-zinc-550 font-bold shrink-0">
                                {task.id}
                              </div>
                            )}

                            <div className="min-w-0">
                              <h4 className={`font-bold transition ${isCurrent ? 'text-cyan-450 text-[11px]' : 'text-zinc-300'}`}>
                                {task.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 text-[8px] font-mono select-none">
                                <span className="text-zinc-650">EXEC:</span>
                                <span className="text-zinc-400 truncate max-w-[280px] font-semibold bg-zinc-950 px-1 py-0.5 rounded border border-zinc-900">{task.actionText}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 text-right">
                            {/* Shows parent depend targets */}
                            {dependencies && (
                              <div className="text-[8px] text-zinc-550 border border-zinc-850 px-1.5 py-0.5 rounded font-bold">
                                DEPENDS: {dependencies.join(', ')}
                              </div>
                            )}
                            <div className="text-[8px] text-zinc-450 select-none bg-zinc-900 px-1.5 py-0.5 rounded">
                              AGENT: <span className="text-zinc-300">{setAssignedAgentName(task.actionText)}</span>
                            </div>
                            {isCurrent && (
                              <div className="w-16 bg-zinc-900 rounded-full h-1 overflow-hidden hidden sm:block border border-zinc-850">
                                <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${subtaskProgress}%` }} />
                              </div>
                            )}
                            <span className="text-[9px] font-mono text-zinc-500 whitespace-nowrap">{(task.duration / 1000).toFixed(1)}s</span>
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
        <div className="mt-4 pt-3.5 border-t border-zinc-900">
          <div className="flex items-center justify-between text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              Observability Diagnostics Log
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[7.5px] text-zinc-500">PHASE 4 ENGINE</span>
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
                className={`px-2 py-0.5 rounded border text-[8px] font-bold select-none ${
                  !currentPlan || currentPlan.status !== 'running' || isFailureSimulated
                    ? 'bg-zinc-950 border-zinc-900 text-zinc-700 cursor-not-allowed'
                    : 'bg-rose-955/20 hover:bg-rose-955/40 border-rose-500/20 text-rose-400 cursor-pointer animate-pulse'
                }`}
              >
                Simulate Repair Cycle
              </button>
            </div>
          </div>
          <div className="w-full bg-zinc-950 p-2.5 rounded border border-zinc-900 text-[9px] font-mono text-zinc-400 max-h-[85px] overflow-y-auto space-y-1 select-text scrollbar-thin">
            {diagnosticLogs.map((log, index) => (
              <div key={index} className="flex items-start">
                <span className="text-zinc-600 mr-2 select-none">[{index}]</span>
                <span className={
                  log.includes('[SUCCESS') || log.includes('[REPAIR') || log.includes('[SYSTEM_HEALED') ? 'text-emerald-400' :
                  log.includes('[FAILURE') ? 'text-rose-450 font-bold' :
                  log.includes('[VERIFY') ? 'text-amber-450' : 'text-zinc-400'
                }>{log}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Column 3: Multi-agent statuses, plugins, and environment constraints */}
      <div className="space-y-4 h-full xl:col-span-1 flex flex-col justify-between">
        {/* Phase 1: Real-time Multi-Agent Network Status */}
        <div className="bg-zinc-950/70 border border-zinc-805 rounded-xl p-4 flex flex-col shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between border-b border-zinc-808 pb-2.5 mb-3">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="font-bold text-zinc-100 uppercase tracking-wider text-[10px]">Agents Directory</span>
            </div>
            <span className="text-[8px] bg-cyan-950/60 border border-cyan-800/20 text-cyan-400 px-1.5 py-0.5 rounded uppercase font-bold">4 ONLINE</span>
          </div>

          <div className="space-y-2.5">
            {agentsList.map((agent) => (
              <div key={agent.id} className="p-2.5 rounded-lg bg-zinc-900/65 border border-zinc-850 flex items-center justify-between hover:border-zinc-700 transition">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-zinc-200">{agent.name}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      agent.health === 'Healthy' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`} />
                  </div>
                  <span className="text-[8px] text-zinc-500 font-medium tracking-tight block uppercase">{agent.role}</span>
                </div>

                <div className="text-right text-[8px] font-mono text-zinc-400 uppercase leading-normal font-bold">
                  <div>TASKS: <span className={agent.activeTasks > 0 ? 'text-cyan-400 animate-pulse' : 'text-zinc-500'}>{agent.activeTasks}</span></div>
                  <div>WEIGHT: <span className="text-zinc-350">{agent.priorityWeight}x</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Phase 8: Dynamic Extensible Plugins Registry */}
        <div className="bg-zinc-950/70 border border-zinc-805 rounded-xl p-4 flex flex-col shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between border-b border-zinc-808 pb-2.5 mb-3">
            <div className="flex items-center space-x-1.5">
              <Settings className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-zinc-100 uppercase tracking-wider text-[10px]">Plugins Registry</span>
            </div>
            <span className="text-[8px] text-zinc-500 font-mono tracking-tight font-bold">v1.2 ACTIVE</span>
          </div>

          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-0.5 pr-1">
            {pluginsList.map((plg) => (
              <div key={plg.id} className={`p-2.5 rounded-lg border transition ${
                plg.enabled ? 'bg-zinc-900 border-zinc-805' : 'bg-zinc-950 border-zinc-900 opacity-40'
              }`}>
                <div className="flex items-center justify-between select-none">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="font-bold text-zinc-200 text-[11px] truncate max-w-[120px]">{plg.name}</span>
                    <span className="text-[8px] text-zinc-500 font-mono">{plg.version}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plg.enabled}
                      onChange={() => togglePlugin(plg.id)}
                      className="sr-only peer"
                    />
                    <div className="w-6 h-3 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[1.5px] after:bg-zinc-450 after:border-zinc-550 after:border after:rounded-full after:h-2 after:w-2 after:transition-all peer-checked:bg-purple-500" />
                  </label>
                </div>
                <p className="text-[8.5px] text-zinc-500/90 font-sans leading-relaxed mt-1">{plg.description}</p>
                <div className="flex justify-between items-center mt-2 border-t border-zinc-950/60 pt-1.5 text-[8px] font-mono text-zinc-505 uppercase">
                  <span>SCOPE: <strong className="text-zinc-300 font-semibold">{plg.permissionScope}</strong></span>
                  <span>TIME: <strong className="text-zinc-400 font-semibold">{plg.loadTimeMs}ms</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Phase 5: World State Environment Monitoring Constraints */}
        <div className="bg-zinc-950/70 border border-zinc-805 rounded-xl p-4 flex flex-col justify-between shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
          <div>
            <div className="flex items-center space-x-1.5 border-b border-zinc-808 pb-2.5 mb-2.5">
              <Layers className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="font-bold text-zinc-100 uppercase tracking-wider text-[10px]">World State Rules</span>
            </div>
            <p className="text-[9px] text-zinc-505 font-sans leading-relaxed">
              Environment feedback dynamically scales task duration speeds during active spikes to prevent pipeline core freezes.
            </p>

            <div className="space-y-2 mt-3 select-none">
              <div className="flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-850">
                <span className="text-[9px] text-zinc-350">CPU spikes safety throttle</span>
                <button
                  type="button"
                  onClick={() => setThrottleActive(!throttleActive)}
                  className={`px-2 py-1 rounded text-[8px] font-bold font-mono transition uppercase ${
                    throttleActive 
                      ? 'bg-amber-950/40 border border-amber-500/30 text-amber-400 animate-pulse'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                  }`}
                >
                  {throttleActive ? 'THROTTLE_ACTIVE' : 'STANDBY'}
                </button>
              </div>
              <div className="flex items-center justify-between text-[8px] text-zinc-550 border-t border-zinc-900 pt-2 font-mono">
                <span>HEAP DRAIN LIMIT: <strong className="text-zinc-400">128MB</strong></span>
                <span>FAILOVER RETRIES: <strong className="text-zinc-400">MAX_3</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
