/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cpu, HardDrive, Network, Layers, ShieldAlert, CheckCircle, Activity, Info, FileText } from 'lucide-react';
import { ResourceMetric, SystemStatus } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface SystemMonitorWidgetProps {
  metricsHistory: ResourceMetric[];
  status: SystemStatus;
  simplifiedMode?: boolean;
}

const CustomTooltip = ({ active, payload, simplifiedMode }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={`border p-2.5 rounded-lg shadow-md text-[10px] min-w-[120px] ${
        simplifiedMode
          ? 'bg-white border-slate-205 text-slate-800 font-sans'
          : 'bg-zinc-950/90 backdrop-blur-md border-zinc-800 text-zinc-300 font-mono shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
      }`}>
        <p className={`font-semibold mb-1 border-b pb-1 ${simplifiedMode ? 'text-slate-400 border-slate-100' : 'text-zinc-500 border-zinc-900'}`}>
          {payload[0].payload.timeString}
        </p>
        <p className="font-bold flex justify-between text-blue-600 dark:text-cyan-400">
          <span>{simplifiedMode ? 'SYSTEM LOAD:' : 'CPU LOAD:'}</span>
          <span>{payload[0].value}%</span>
        </p>
        {payload[0].payload.memory && (
          <p className="font-semibold flex justify-between text-indigo-600 dark:text-purple-400">
            <span>{simplifiedMode ? 'MEMORY:' : 'MEM:'}</span>
            <span>{payload[0].payload.memory}%</span>
          </p>
        )}
        {payload[0].payload.network !== undefined && (
          <p className="font-semibold flex justify-between text-emerald-600 dark:text-emerald-400">
            <span>{simplifiedMode ? 'CONNECTION:' : 'NET:'}</span>
            <span>{payload[0].payload.network} Kb/s</span>
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function SystemMonitorWidget({ metricsHistory, status, simplifiedMode = false }: SystemMonitorWidgetProps) {
  const latestMetric = metricsHistory[metricsHistory.length - 1] || { cpu: 0, memory: 0, disk: 0, network: 0 };

  // Format historical metrics with timing variables for 60-second span
  const chartData = metricsHistory.map((metric, index) => {
    const secondsAgo = (metricsHistory.length - 1 - index) * 3;
    const timeString = new Date(metric.timestamp || Date.now()).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return {
      ...metric,
      label: secondsAgo === 0 ? 'now' : `-${secondsAgo}s`,
      timeString,
    };
  });

  // Helper to generate SVG polyline path coordinates
  const getSvgPathStr = (key: 'cpu' | 'memory' | 'disk' | 'network', width: number, height: number) => {
    if (metricsHistory.length < 2) return '';
    const maxVal = key === 'network' ? Math.max(...metricsHistory.map(m => m.network), 150) : 100;
    
    return metricsHistory
      .map((metric, index) => {
        const x = (index / (metricsHistory.length - 1)) * width;
        const y = height - (metric[key] / maxVal) * (height - 8) - 4; // margin padding
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const currentCpuPath = getSvgPathStr('cpu', 120, 40);
  const currentMemoryPath = getSvgPathStr('memory', 120, 40);
  const currentNetworkPath = getSvgPathStr('network', 120, 40);

  if (simplifiedMode) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col h-full font-sans text-xs text-slate-700 shadow-sm hover:shadow-md transition-all duration-300">
        {/* Simplified Title block */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4 select-none">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <div>
              <span className="font-extrabold text-slate-900 text-xs md:text-sm tracking-tight block">Assistant Status</span>
              <span className="text-[9px] text-slate-450 font-medium block">All local core processors running healthy</span>
            </div>
          </div>
          <div>
            <span className="flex items-center text-emerald-700 text-[10px] bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full font-bold shadow-sm">
              <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Active & Safe
            </span>
          </div>
        </div>

        {/* Simplified indicators columns */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase font-bold tracking-tight mb-1">
              <span>Workload</span>
              <span className="text-blue-600 font-extrabold">{latestMetric.cpu}%</span>
            </div>
            <div className="w-full bg-slate-200 h-1 rounded-full my-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${latestMetric.cpu}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-400 font-medium">Core AI utilization</span>
          </div>

          <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase font-bold tracking-tight mb-1">
              <span>Assistant Memory</span>
              <span className="text-indigo-600 font-extrabold">{latestMetric.memory}%</span>
            </div>
            <div className="w-full bg-slate-200 h-1 rounded-full my-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${latestMetric.memory}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-400 font-medium">Active memory buffer</span>
          </div>

          <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex flex-col justify-between col-span-2">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-tight text-slate-500 mb-1">
              <span>Web Speed Response</span>
              <span className="text-emerald-600 font-extrabold">{latestMetric.network} Kb/s</span>
            </div>
            <div className="text-[10px] text-slate-650 flex items-center mt-1 bg-white border border-slate-200/50 p-1.5 rounded-lg">
              <Network className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
              <span>Network diagnostics stable</span>
            </div>
          </div>
        </div>

        {/* Real-time Uptime and process logs row */}
        <div className="border-t border-slate-100 pt-3.5 grid grid-cols-2 gap-2 text-[10px] text-slate-500 select-none">
          <div className="flex items-center">
            <span className="font-semibold text-slate-400 mr-1">SESSION STREAK:</span>
            <span className="text-slate-700 font-bold">{status.uptime}</span>
          </div>
          <div className="flex items-center justify-end">
            <span className="font-semibold text-slate-400 mr-1">PROCESSES:</span>
            <span className="text-slate-705 font-bold">{status.activeProcesses} running</span>
          </div>
        </div>
      </div>
    );
  }

  // Developer Standard View
  return (
    <div className="bg-zinc-950/70 backdrop-blur-md border border-zinc-805 rounded-xl p-5 flex flex-col h-full font-mono text-xs text-zinc-300 select-none shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-zinc-100 uppercase tracking-wider">OS Resource Monitor</span>
        </div>
        <div className="flex items-center space-x-1">
          {status.health === 'Healthy' ? (
            <span className="flex items-center text-emerald-400 text-[10px] bg-emerald-950/20 border border-emerald-500/20 px-2 py-0.5 rounded">
              <CheckCircle className="w-3 h-3 mr-1" /> SYSTEM_ONLINE
            </span>
          ) : (
            <span className="flex items-center text-rose-400 text-[10px] bg-rose-950/20 border border-rose-500/20 px-2 py-0.5 rounded animate-pulse">
              <ShieldAlert className="w-3 h-3 mr-1" /> CORE_SPIKE ALERT
            </span>
          )}
        </div>
      </div>

      {/* Grid of indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* CPU */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] mb-1">
            <span>CPU LOAD</span>
            <span className="text-cyan-400 font-bold">{latestMetric.cpu}%</span>
          </div>
          {/* Progress Mini-Bar */}
          <div className="w-full bg-zinc-950 rounded-full h-1 my-1.5 overflow-hidden">
            <div
              className="bg-cyan-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${latestMetric.cpu}%` }}
            />
          </div>
          {/* Sparkline mini-graph */}
          <div className="h-8 flex mt-2 justify-center items-end">
            <svg className="w-full h-full overflow-visible">
              <polyline
                fill="none"
                stroke="rgba(6, 182, 212, 1)"
                strokeWidth="1.5"
                points={currentCpuPath}
              />
            </svg>
          </div>
        </div>

        {/* MEMORY */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] mb-1">
            <span>MEMORY</span>
            <span className="text-purple-400 font-bold">{latestMetric.memory}%</span>
          </div>
          {/* Progress Mini-Bar */}
          <div className="w-full bg-zinc-950 rounded-full h-1 my-1.5 overflow-hidden">
            <div
              className="bg-purple-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${latestMetric.memory}%` }}
            />
          </div>
          {/* Sparkline */}
          <div className="h-8 flex mt-2 justify-center items-end">
            <svg className="w-full h-full overflow-visible">
              <polyline
                fill="none"
                stroke="rgba(168, 85, 247, 1)"
                strokeWidth="1.5"
                points={currentMemoryPath}
              />
            </svg>
          </div>
        </div>

        {/* DISK ACCESS */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] mb-1">
            <span>DISK_R</span>
            <span className="text-amber-400 font-bold">{latestMetric.disk}%</span>
          </div>
          {/* Progress Mini-Bar */}
          <div className="w-full bg-zinc-950 rounded-full h-1 my-1.5 overflow-hidden">
            <div
              className="bg-amber-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${latestMetric.disk}%` }}
            />
          </div>
          <div className="mt-2 text-[9px] text-zinc-550 text-center flex items-center justify-center">
            <HardDrive className="w-3 h-3 mr-1 text-amber-500/60" /> File IO Stabilized
          </div>
        </div>

        {/* NETWORK THROUPUT */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] mb-1">
            <span>NET_IO</span>
            <span className="text-emerald-400 font-bold">{latestMetric.network} Kb/s</span>
          </div>
          {/* Sparkline for Network */}
          <div className="h-10 mt-2 flex items-end justify-center">
            <svg className="w-full h-full overflow-visible">
              <polyline
                fill="none"
                stroke="rgba(16, 185, 129, 1)"
                strokeWidth="1.5"
                points={currentNetworkPath}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Historical CPU Trend Analysis */}
      <div className="bg-zinc-900/30 border border-zinc-800/60 p-3.5 rounded-lg mb-4 flex flex-col h-44">
        <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase tracking-widest font-semibold border-b border-zinc-900 pb-1.5 mb-2">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            CPU PERFORMANCE HISTORY (60s WINDOW)
          </span>
          <span className="text-cyan-400 text-[10px] font-bold">
            AVG: {metricsHistory.length > 0 ? Math.round(metricsHistory.reduce((acc, m) => acc + m.cpu, 0) / metricsHistory.length) : 0}%
          </span>
        </div>
        <div className="flex-1 min-h-0 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgba(6, 182, 212, 0.45)" />
                  <stop offset="95%" stopColor="rgba(6, 182, 212, 0)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(63, 63, 70, 0.15)" vertical={false} />
              <XAxis 
                dataKey="label" 
                stroke="#52525b" 
                fontSize={8} 
                tickLine={false} 
                axisLine={false} 
                dy={3}
              />
              <YAxis 
                domain={[0, 100]} 
                stroke="#52525b" 
                fontSize={8} 
                tickLine={false} 
                axisLine={false} 
                dx={-2}
              />
              <Tooltip content={<CustomTooltip simplifiedMode={false} />} cursor={{ stroke: 'rgba(6, 182, 212, 0.25)', strokeWidth: 1 }} />
              <Area 
                type="monotone" 
                dataKey="cpu" 
                stroke="rgba(6, 182, 212, 1)" 
                strokeWidth={1.5}
                fillOpacity={1} 
                fill="url(#cpuGrad)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid of operating statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] text-zinc-400 pt-3 border-t border-zinc-900">
        <div>
          <span className="text-zinc-550">HEALTH_STATION:</span>{' '}
          <span className={status.health === 'Healthy' ? 'text-emerald-400' : 'text-rose-400'}>
            {status.health.toUpperCase()}
          </span>
        </div>
        <div>
          <span className="text-zinc-550">SYS_UPTIME:</span> <span className="text-zinc-200">{status.uptime}</span>
        </div>
        <div>
          <span className="text-zinc-550">VM_PROCESSES:</span>{' '}
          <span className="text-zinc-200">{status.activeProcesses} Active</span>
        </div>
        <div>
          <span className="text-zinc-550">SECURITY_CORE:</span>{' '}
          <span className="text-cyan-450 hover:underline cursor-pointer">{status.securityCoreStatus}</span>
        </div>
      </div>
    </div>
  );
}
