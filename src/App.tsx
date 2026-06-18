/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import DesktopHeader from './components/DesktopHeader';
import SystemMonitorWidget from './components/SystemMonitorWidget';
import MemoryCoreManager from './components/MemoryCoreManager';
import TaskEngineConsole from './components/TaskEngineConsole';
import VirtualWorkspace from './components/VirtualWorkspace';
import NyxShell from './components/NyxShell';
import { Message, ResourceMetric, SystemStatus, MemoryCore, UserModel, TaskPlan, VirtualFile, MemoryItem, LearningState, OSPlugin, Subtask } from './types';

// Baseline seed workspace files
const SEED_WORKSPACE: VirtualFile[] = [
  {
    name: "README_KERNEL.md",
    path: "/README_KERNEL.md",
    type: "file",
    language: "markdown",
    size: "1.2 KB",
    updatedAt: "2026-06-11 08:00:00",
    content: `# SnowOS Active Kernel v1.2.0

Welcome, Operator Navis Donel. SnowOS is a fully autonomous AI-native operating system designed to bridge human intent with immediate computational layouts.

## Core Directives
1. **Explainable Audits**: Every plan is parsed, estimated, and rated by security danger rules.
2. **Context Retention**: Working memories are updated dynamically in coordination with conversation contexts.
3. **Workspace Autonomy**: Executed tasks write physical assets into your local directory tree.

## Available Shell Directives:
- \`neofetch\` : Displays current hardware profile logo.
- \`ls\`       : List directories and file nodes.
- \`cat <file>\` : Dump code file contents directly here.
- \`memory\`   : Displays compiled cognitive variables.
- \`system\`   : Print diagnostic and thread counts.
`
  },
  {
    name: "sys_config.json",
    path: "/sys_config.json",
    type: "file",
    language: "json",
    size: "340 bytes",
    updatedAt: "2026-06-11 08:15:00",
    content: `{
  "kernel": "snow-agent-11.2.6",
  "security": "TACTILE_ENFORCED",
  "isolatedThreads": true,
  "automation": {
    "optimizeHeap": "enabled",
    "cacheCleaning": "manual_only"
  },
  "visuals": {
    "defaultTheme": "CosmicSlate",
    "terminalFont": "JetBrains Mono"
  }
}`
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('shell');
  const [serverConnected, setServerConnected] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [modelName, setModelName] = useState<string>('gemini-3.5-flash');
  const [thinkingEnabled, setThinkingEnabled] = useState<boolean>(false);
  const [simplifiedMode, setSimplifiedMode] = useState<boolean>(true);

  // Manage WebSocket connection
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    console.log(`[SnowOS Client] Connecting to WebSocket at ${wsUrl}`);
    
    let socket: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;
    
    const connect = () => {
      socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        console.log('[SnowOS Client] WebSocket connection established.');
      };

      socket.onclose = () => {
        console.log('[SnowOS Client] WebSocket connection closed. Retrying in 3s...');
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.error('[SnowOS Client] WebSocket error:', err);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'file_changed') {
            const { file } = payload;
            setVirtualFiles((files) => {
              const fileExists = files.some(f => f.path === file.path);
              if (fileExists) {
                return files.map(f => f.path === file.path ? file : f);
              } else {
                return [...files, file];
              }
            });
          } else if (payload.type === 'file_deleted') {
            const { path } = payload;
            setVirtualFiles((files) => files.filter(f => f.path !== path));
          }
        } catch (err) {
          // ignore or log non-JSON messages
        }
      };

      wsRef.current = socket;
    };

    connect();

    return () => {
      if (socket) {
        socket.close();
      }
      clearTimeout(reconnectTimeout);
      wsRef.current = null;
    };
  }, []);

  // Fetch initial files from physical workspace
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch('/api/snow-agent/files');
        const data = await res.json();
        if (data.success && Array.isArray(data.files)) {
          setVirtualFiles(data.files);
        }
      } catch (err) {
        console.error('[SnowOS Client] Failed to fetch workspace files:', err);
      }
    };
    fetchFiles();
  }, []);

  // System Status State
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    health: 'Healthy',
    uptime: '00:00:00',
    activeProcesses: 18,
    portsBlocked: false,
    securityCoreStatus: 'Armed'
  });

  // Resource metrics slider history
  const [metricsHistory, setMetricsHistory] = useState<ResourceMetric[]>([]);

  // User Profile Metadata Model
  const [userModel, setUserModel] = useState<UserModel>({
    name: "Donel",
    role: "Architect & Core DevOps",
    skills: ["Docker", "Python", "Kubernetes", "React", "Rust"],
    interests: ["Robotics", "Secure OS", "HCI Designs"],
    active_projects: ["SnowOS Kernel Core", "Nyx Assistant Platform"],
    preferences: ["Offline-First", "High Contrast Minimalist", "Tactile Overrides"]
  });

  // Tri-layer Cognitive Memory state
  const [memoryCore, setMemoryCore] = useState<MemoryCore>({
    shortTerm: [
      "Registered operator Donel into index register",
      "Initialized SnowOS virtual directory volumes",
      "Armed Security permission systems"
    ],
    workingMemory: [
      "Awaiting direct visual operator instructions"
    ],
    longTerm: [
      "User favors Swiss typography and Space Grotesk displays",
      "Deploys code structure securely in offline environments",
      "Requires explicit authorisation keys for caching wipes"
    ],
    userModel: {
      name: "Donel",
      role: "Architect & Core DevOps",
      skills: ["Docker", "Python", "Kubernetes", "React", "Rust"],
      interests: ["Robotics", "Secure OS", "HCI Designs"],
      active_projects: ["SnowOS Kernel Core", "Nyx Assistant Platform"],
      preferences: ["Offline-First", "High Contrast Minimalist", "Tactile Overrides"]
    }
  });

  // Simulated local storage directories
  const [virtualFiles, setVirtualFiles] = useState<VirtualFile[]>(SEED_WORKSPACE);

  // Active Task plan being scheduled
  const [currentPlan, setCurrentPlan] = useState<TaskPlan | null>(null);

  // --- PERSISTENT LIFTED-UP DATA STORES ---
  interface SimulatedAgent {
    id: string;
    name: string;
    role: string;
    health: 'Healthy' | 'Degraded' | 'Paused';
    activeTasks: number;
    priorityWeight: number;
  }

  const [agentsList, setAgentsList] = useState<SimulatedAgent[]>([
    { id: 'agt_core', name: 'KernelCore', role: 'Thread Execution Server', health: 'Healthy', activeTasks: 0, priorityWeight: 10 },
    { id: 'agt_secure', name: 'SecurityGuardian', role: 'Heuristics Auditing', health: 'Healthy', activeTasks: 0, priorityWeight: 9 },
    { id: 'agt_file', name: 'FileOracle', role: 'Workspace File Broker', health: 'Healthy', activeTasks: 0, priorityWeight: 8 },
    { id: 'agt_llm', name: 'HeuristicsPlanner', role: 'Generative Compiler', health: 'Healthy', activeTasks: 0, priorityWeight: 7 }
  ]);

  const [pluginsList, setPluginsList] = useState<OSPlugin[]>([
    { id: 'plg_fs', name: 'Virtual File System Oracle', version: 'v1.12.0', description: 'Coordinates directory generation and file sync caches.', enabled: true, permissionScope: 'filesystem', riskRating: 'MEDIUM', loadTimeMs: 4 },
    { id: 'plg_net', name: 'Socket Traffic Interceptor', version: 'v1.4.2', description: 'Monitors outbound requests and download dependencies securely.', enabled: true, permissionScope: 'network', riskRating: 'HIGH', loadTimeMs: 9 },
    { id: 'plg_sec', name: 'Tactile Audits Shield', version: 'v1.0.0', description: 'Enforces permissions, blocks critical folder modification.', enabled: true, permissionScope: 'system_monitor', riskRating: 'CRITICAL', loadTimeMs: 2 },
    { id: 'plg_llm', name: 'Gemini Generative Proxies', version: 'v1.3.1', description: 'Handles remote API queries, TTS audio, and structured parsing.', enabled: true, permissionScope: 'llm_generative', riskRating: 'MEDIUM', loadTimeMs: 14 }
  ]);

  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([
    'SYSTEM: Self-Verification and Diagnostics channels operational.',
    'SYSTEM: Real-time healing loops locked at 100ms.'
  ]);

  const [throttleActive, setThrottleActive] = useState<boolean>(false);
  const [isFailureSimulated, setIsFailureSimulated] = useState<boolean>(false);
  const [retryCounter, setRetryCounter] = useState<number>(0);
  const [correctionPhase, setCorrectionPhase] = useState<'IDLE' | 'OBSERVING' | 'VERIFYING' | 'REPAIR_TRIGGERED' | 'HEALED'>('IDLE');
  const [subtaskProgress, setSubtaskProgress] = useState<number>(0);

  const [indexedMemories, setIndexedMemories] = useState<MemoryItem[]>([
    { id: 'mem_1', text: 'Operator favors Swiss high-contrast typography displays', importance: 9, timestamp: '10:04:15', category: 'preference', retrievalCount: 14 },
    { id: 'mem_2', text: 'Enforcing offline-first autonomous loopback sandbox environments', importance: 8, timestamp: '10:12:00', category: 'workflow', retrievalCount: 8 },
    { id: 'mem_3', text: 'Armed security core permission guards against pipeline execution risk', importance: 10, timestamp: '10:15:30', category: 'technical', retrievalCount: 22 },
    { id: 'mem_4', text: 'Compiling custom web scraping libraries in python BS4/requests', importance: 7, timestamp: '10:19:42', category: 'technical', retrievalCount: 5 },
    { id: 'mem_5', text: 'Operator name registered securely to DevOps directory indices', importance: 6, timestamp: '10:20:00', category: 'conversational', retrievalCount: 3 }
  ]);

  const [learningStats, setLearningStats] = useState<LearningState>({
    successfulWorkflows: 18,
    failedWorkflows: 1,
    unauthorizedPlansWiped: 3,
    optimizedCycles: 42,
    frequentActions: [
      { action: 'Create Work Directories', frequency: 12 },
      { action: 'Generate Script Code', frequency: 9 },
      { action: 'Run Security Audits', frequency: 8 },
      { action: 'Clear Systems Cache', frequency: 4 }
    ],
    userAffinities: [
      'Favors Space Grotesk / Inter fonts pair',
      'Requires explicit Auth permissions override',
      'Prefers lightweight python-based parsers'
    ]
  });

  const getAgentNameForTask = (actionText: string) => {
    if (actionText.includes('mkdir') || actionText.includes('touch') || actionText.includes('create_file')) {
      return 'FileOracle';
    }
    if (actionText.includes('install') || actionText.includes('pip') || actionText.includes('npm')) {
      return 'KernelCore';
    }
    if (actionText.includes('security') || actionText.includes('audit') || actionText.includes('perm')) {
      return 'SecurityGuardian';
    }
    return 'HeuristicsPlanner';
  };

  // General terminal dialogue strings
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: "init_1",
      role: 'kernel',
      text: "SnowOS Kernel successfully spawned on container loop. Active port: [3000].",
      timestamp: "08:56:52"
    },
    {
      id: "init_2",
      role: 'assistant',
      text: "Nyx cognitive engine online. Standby for human input interface.",
      timestamp: "08:56:53"
    }
  ]);

  // Periodic metrics heartbeat loop
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/snow-agent/metrics');
        if (res.ok) {
          const data = await res.json();
          setServerConnected(true);
          setSystemStatus(data.status);
          
          // Modify baseline load during active subtask pipelines
          let adjustedMetric = { ...data.metrics };
          if (currentPlan && currentPlan.status === 'running') {
            const index = currentPlan.currentStepIndex;
            const subtask = currentPlan.subtasks[index];
            if (subtask) {
              if (subtask.actionText.includes('install') || subtask.actionText.includes('pip')) {
                adjustedMetric.cpu = Math.min(82 + Math.floor(Math.random() * 8), 98);
                adjustedMetric.network = 1200 + Math.floor(Math.random() * 400); // 1.2MB-1.6MB/s spike
              } else if (subtask.actionText.includes('touch') || subtask.actionText.includes('create_file') || subtask.actionText.includes('cat')) {
                adjustedMetric.disk = 78;
                adjustedMetric.cpu = 45;
              } else {
                adjustedMetric.cpu = 60 + Math.floor(Math.random() * 15);
              }
            }
          }

          setMetricsHistory((history) => {
            const nextHist = [...history, adjustedMetric];
            if (nextHist.length > 20) nextHist.shift(); // keep last 20 points (60 seconds)
            return nextHist;
          });
        } else {
          setServerConnected(false);
          simulateLocalMetrics();
        }
      } catch (err) {
        setServerConnected(false);
        simulateLocalMetrics();
      }
    };

    // Immediate invoke, then run interval
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, [currentPlan?.id, currentPlan?.status, currentPlan?.currentStepIndex]);

  // Offline/Sandbox metric fallback simulator
  const simulateLocalMetrics = () => {
    const cpu = Math.floor(12 + Math.random() * 18);
    const memory = 42;
    const disk = 28;
    const network = Math.floor(15 + Math.random() * 50);
    
    setMetricsHistory((history) => {
      const nextHist = [...history, { cpu, memory, disk, network, timestamp: Date.now() }];
      if (nextHist.length > 20) nextHist.shift();
      return nextHist;
    });

    setSystemStatus((prev) => ({
      ...prev,
      uptime: "Local Loopback Only",
      activeProcesses: 14
    }));
  };

  // Memory clearing callback
  const handleClearShortTerm = () => {
    setMemoryCore((prev) => ({
      ...prev,
      shortTerm: []
    }));
  };

  // User Profile manual save callback
  const handleUpdateUserModel = (updatedModel: UserModel) => {
    setUserModel(updatedModel);
    setMemoryCore((prev) => ({
      ...prev,
      userModel: updatedModel,
      shortTerm: [...prev.shortTerm, `Manually re-coded operator facts: ${updatedModel.name}`]
    }));
  };

  // Dynamic failure simulation healing routine
  const runFailureSimulationLoop = (index: number) => {
    setCorrectionPhase('OBSERVING');
    setDiagnosticLogs((prev) => [
      ...prev,
      `[FAILURE_OBSERVED] Command returned exit code 1. Buffer corrupt!`,
      `[VERIFY] Launching structural verification rule: "Verify file parameters safety"`,
    ]);

    setTimeout(() => {
      setCorrectionPhase('VERIFYING');
      setDiagnosticLogs((prev) => [
        ...prev,
        `[VERIFY_LOG] Assertion failure: write directory permission blocks.`,
        `[REPAIR] Formulating healing strategy: "Fallback to safe offline container path"`,
      ]);

      setTimeout(() => {
        setCorrectionPhase('REPAIR_TRIGGERED');
        setDiagnosticLogs((prev) => [
          ...prev,
          `[REPAIR_ACTION] Appending custom bypass flags. Clean terminal log outputs.`,
          `[SYSTEM_HEALED] Automated repair applied. Retrying task thread with high stability.`,
        ]);
        
        // Phase 9: Real-time learning database metrics
        setLearningStats((prev) => ({
          ...prev,
          optimizedCycles: prev.optimizedCycles + 1
        }));

        setRetryCounter(1);
        setCorrectionPhase('HEALED');
        setIsFailureSimulated(false);
      }, 1200);

    }, 1250);
  };

  // Integrated, unified real-time subtask scheduler & Phase 4 self-healing loop
  useEffect(() => {
    if (!currentPlan || currentPlan.status !== 'running') {
      setSubtaskProgress(0);
      return;
    }

    const index = currentPlan.currentStepIndex;
    const subtask = currentPlan.subtasks[index];
    
    if (!subtask) {
      // Finished all subtasks! Success loop!
      const finalMsgId = Date.now().toString();
      setChatMessages((msgs) => [
        ...msgs,
        {
          id: finalMsgId,
          role: 'kernel',
          text: `OPERATION COMPLETED SUCCESSFULLY: Task Plan #${currentPlan.id} verified. Safe thread tear-down completed.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        }
      ]);

      // Write artifacts based on intent
      if (currentPlan.intent === 'create_project') {
        const scraperCode = `#!/usr/bin/env python
# SnowOS Synthesized BeautifulSoup Web Scraper Module
import requests
from bs4 import BeautifulSoup
import sys

def run_scraper(target_url="https://news.ycombinator.com"):
    print(f"[*] Booting scraper thread for URL: {target_url}")
    try:
        response = requests.get(target_url, timeout=5)
        soup = BeautifulSoup(response.text, 'html.parser')
        articles = soup.find_all('span', class_='titleline')
        print(f"[+] Scraped {len(articles)} nodes successfully.\\n")
        
        for idx, item in enumerate(articles[:5]):
            link_node = item.find('a')
            if link_node:
                print(f"{idx+1}. {link_node.text} -> {link_node['href']}")
    except Exception as e:
        print(f"[!] Thread failure compiling connection: {e}")

if __name__ == '__main__':
    run_scraper()
`;
        const configCode = `[scrapers_profile]
user_agent = "SnowOS-Agent/v1.2.0 (compatible; NyxCore)"
request_timeout = 5
max_article_nodes = 25
db_sync = true
`;
        // Inject files
        setVirtualFiles((files) => [
          ...files,
          {
            name: "scraper.py",
            path: "/web_scraper/src/scraper.py",
            type: "file",
            language: "python",
            size: "720 bytes",
            updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
            content: scraperCode
          },
          {
            name: "env.cfg",
            path: "/web_scraper/env.cfg",
            type: "file",
            language: "ini",
            size: "180 bytes",
            updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
            content: configCode
          }
        ]);

        // Toggle memory core factors
        setMemoryCore((prev) => ({
          ...prev,
          workingMemory: ["Active directory contains: /web_scraper"],
          longTerm: [...prev.longTerm, "Constructed fully functional web scraper framework in python"]
        }));

        setLearningStats((prev) => ({
          ...prev,
          successfulWorkflows: prev.successfulWorkflows + 1
        }));

      } else if (currentPlan.intent === 'directory_wipe') {
        // High risk file removal simulation
        setVirtualFiles((files) => files.filter(f => !f.path.startsWith('/tmp')));
        setMemoryCore((prev) => ({
          ...prev,
          workingMemory: ["Cache directory clean of artifacts."],
          longTerm: [...prev.longTerm, "Purged systems caching directory nodes manually."]
        }));
        setLearningStats((prev) => ({
          ...prev,
          successfulWorkflows: prev.successfulWorkflows + 1
        }));
      } else {
        setLearningStats((prev) => ({
          ...prev,
          successfulWorkflows: prev.successfulWorkflows + 1
        }));
      }

      setCurrentPlan((prev) => prev ? { ...prev, status: 'success' } : null);
      return;
    }

    setSubtaskProgress(0);
    const assignedAgent = getAgentNameForTask(subtask.actionText);

    // Map agents actively
    setAgentsList((prev) => prev.map((a) => (
      a.name === assignedAgent ? { ...a, activeTasks: 1 } : { ...a, activeTasks: 0 }
    )));

    // Define simulation runner fallback function
    const runSimulatedStep = () => {
      const intervalTime = 100;
      const effectiveDuration = throttleActive ? subtask.duration * 1.8 : subtask.duration;
      const steps = effectiveDuration / intervalTime;
      let currentStep = 0;

      const timer = setInterval(() => {
        if (isFailureSimulated && index === 1 && retryCounter < 1) {
          clearInterval(timer);
          runFailureSimulationLoop(index);
          return;
        }

        currentStep++;
        const percent = Math.min((currentStep / steps) * 100, 100);
        setSubtaskProgress(percent);

        if (currentStep >= steps) {
          clearInterval(timer);

          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
          const completedSubtaskLog = `[SUCCESS] PID ${1000 + index} -> Executed action (Simulated): "${subtask.actionText}"`;
          
          setChatMessages((msgs) => [
            ...msgs,
            {
              id: `step_${index}_${Date.now()}`,
              role: 'kernel',
              text: completedSubtaskLog,
              timestamp
            }
          ]);

          setDiagnosticLogs((prev) => [
            ...prev,
            `[VERIFY] Rule: "Check exit code == 0 & artifact existence" -> PASSED`,
            `[REPAIR] State verified. Continuing to future nodes.`
          ]);

          setCurrentPlan((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              currentStepIndex: prev.currentStepIndex + 1
            };
          });
        }
      }, intervalTime);

      return () => {
        clearInterval(timer);
      };
    };

    // Dynamic Observability log start
    setDiagnosticLogs((prev) => [
      ...prev,
      `[EXECUTE] Thread assigned PID ${4000 + index} to Agent: ${assignedAgent}`,
      `[OBSERVE] Running real shell command: "${subtask.actionText}"`
    ]);

    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn('[SnowOS Client] WebSocket offline. Falling back to simulated run.');
      const cleanupSim = runSimulatedStep();
      return cleanupSim;
    }

    const handleSocketMessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        const { type, planId, stepId, stream, data, exitCode, error } = payload;

        if (planId !== currentPlan.id || stepId !== subtask.id) {
          return;
        }

        if (type === 'log') {
          const lines = data.split('\n');
          setDiagnosticLogs((prev) => [
            ...prev,
            ...lines.filter((l: string) => l.trim() !== "").map((l: string) => `[${stream.toUpperCase()}] ${l}`)
          ]);
        }

        else if (type === 'status') {
          if (exitCode === 0) {
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            const completedSubtaskLog = `[SUCCESS] PID ${4000 + index} -> Executed action: "${subtask.actionText}"`;
            
            setChatMessages((msgs) => [
              ...msgs,
              {
                id: `step_${index}_${Date.now()}`,
                role: 'kernel',
                text: completedSubtaskLog,
                timestamp
              }
            ]);

            setDiagnosticLogs((prev) => [
              ...prev,
              `[VERIFY] Rule: "Check exit code == 0" -> PASSED`,
              `[REPAIR] State verified. Continuing to future nodes.`
            ]);

            setSubtaskProgress(100);

            setCurrentPlan((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                currentStepIndex: prev.currentStepIndex + 1
              };
            });
          } else {
            setDiagnosticLogs((prev) => [
              ...prev,
              `[FAILURE] PID ${4000 + index} exited with code ${exitCode}. Error: ${error || 'Unknown error'}`
            ]);

            if (isFailureSimulated && retryCounter < 1) {
              runFailureSimulationLoop(index);
            } else {
              setChatMessages((msgs) => [
                ...msgs,
                {
                  id: `err_step_${index}_${Date.now()}`,
                  role: 'kernel',
                  text: `[DANGER] PID ${4000 + index} failed with exit code ${exitCode}. Thread paused.`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
                }
              ]);
              setCurrentPlan((prev) => prev ? { ...prev, status: 'waiting_authorization' } : null);
            }
          }
        }
      } catch (err) {
        console.error('[SnowOS Client] Failed parsing socket message:', err);
      }
    };

    socket.addEventListener('message', handleSocketMessage);

    socket.send(JSON.stringify({
      type: 'execute',
      planId: currentPlan.id,
      stepId: subtask.id,
      command: subtask.actionText
    }));

    let prog = 0;
    const progInterval = setInterval(() => {
      prog = Math.min(prog + 5, 95);
      setSubtaskProgress(prog);
    }, 200);

    return () => {
      socket.removeEventListener('message', handleSocketMessage);
      clearInterval(progInterval);
      setAgentsList((prev) => prev.map((a) => ({ ...a, activeTasks: 0 })));
    };
  }, [currentPlan?.id, currentPlan?.status, currentPlan?.currentStepIndex, isFailureSimulated, retryCounter, throttleActive]);

  // Terminal Send Command central hub
  const handleSendMessage = async (text: string, isCommand: boolean = false) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const userMsgId = Date.now().toString();

    // Append user input
    setChatMessages((msgs) => [
      ...msgs,
      { id: userMsgId, role: 'user', text, timestamp }
    ]);

    // Handle classic Terminal commands synchronously
    if (isCommand) {
      handleLocalTerminalSyntax(text.trim());
      return;
    }

    // Natural Language API loop
    setIsGenerating(true);
    try {
      const response = await fetch('/api/snow-agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: chatMessages,
          userModel,
          memoryCore,
          virtualFiles,
          modelName,
          thinkingEnabled,
          thinkingLevel: thinkingEnabled ? "HIGH" : undefined
        })
      });

      if (response.ok) {
        const payload = await response.json();
        
        // Append conversational response from Nyx
        const botMsgId = `bot_${Date.now()}`;
        setChatMessages((msgs) => [
          ...msgs,
          {
            id: botMsgId,
            role: 'assistant',
            text: payload.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
          }
        ]);

        // Process Direct Workspace file updates returned by Snow Agent compiler
        if (payload.workspaceUpdate) {
          const { action, path: rawPath, name, content } = payload.workspaceUpdate;
          if (action === 'create' || action === 'edit') {
            if (action === 'create') {
              handleAddFile(name, content, rawPath);
            } else {
              handleUpdateFileContent(rawPath, content);
            }
            
            // Append visual kernel notification
            setChatMessages((msgs) => [
              ...msgs,
              {
                id: `sys_work_${Date.now()}`,
                role: 'kernel',
                text: `WORKSPACE DIRECTIVE: File ${action === 'edit' ? 're-written' : 'created'} at path "${rawPath}". Buffer size: ${content?.length || 0} bytes. Check the files tab!`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
              }
            ]);
          } else if (action === 'delete') {
            handleDeleteFile(rawPath);
            setChatMessages((msgs) => [
              ...msgs,
              {
                id: `sys_work_${Date.now()}`,
                role: 'kernel',
                text: `WORKSPACE DIRECTIVE: Purged file path "${rawPath}" from OS directories.`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
              }
            ]);
          }
        }

        // Process Plan setup if returned by Snow Agent compiler
        if (payload.plan) {
          const planId = `plan_${Math.floor(Math.random() * 100000)}`;
          const parsedPlan: TaskPlan = {
            id: planId,
            intent: payload.plan.intent,
            goal: payload.plan.goal,
            priority: payload.plan.priority || 'normal',
            riskLevel: payload.plan.riskLevel || 'LOW',
            subtasks: payload.plan.subtasks,
            status: (payload.plan.riskLevel === 'HIGH' || payload.plan.riskLevel === 'CRITICAL') ? 'waiting_authorization' : 'running',
            currentStepIndex: 0
          };

          // Append kernel register notification
          setChatMessages((msgs) => [
            ...msgs,
            {
              id: `sys_plan_${Date.now()}`,
              role: 'kernel',
              text: `TASK PLAN REGISTERED: [${parsedPlan.goal}]. Danger Scale: ${parsedPlan.riskLevel}. Triggering pipeline.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
            }
          ]);

          setCurrentPlan(parsedPlan);
          
          // Force screen navigate to monitor actions
          setActiveTab('tasks');
        }

        // Apply metadata user-learn updates
        if (payload.userUpdate) {
          setUserModel((prev) => ({
            ...prev,
            ...payload.userUpdate
          }));
        }

        if (payload.memoryUpdate) {
          setMemoryCore((prev) => {
            const shortTerm = payload.memoryUpdate.shortTerm 
              ? [...prev.shortTerm, ...payload.memoryUpdate.shortTerm]
              : prev.shortTerm;
            const workingMemory = payload.memoryUpdate.workingMemory || prev.workingMemory;
            const longTerm = payload.memoryUpdate.longTerm
              ? [...prev.longTerm, ...payload.memoryUpdate.longTerm]
              : prev.longTerm;

            return {
              ...prev,
              shortTerm,
              workingMemory,
              longTerm
            };
          });
        }

      } else {
        throw new Error("Unable to establish remote cognitive context");
      }
    } catch (err) {
      console.error(err);
      // Append failure alert text
      const errorMsgId = `err_${Date.now()}`;
      setChatMessages((msgs) => [
        ...msgs,
        {
          id: errorMsgId,
          role: 'kernel',
          text: "[DANGER] Heuristics connection timeout. Attempting failover connection.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Synchronous terminal commands evaluator
  const handleLocalTerminalSyntax = (cmdInput: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const parts = cmdInput.split(' ');
    const commandName = parts[0].toLowerCase();

    let kernelReply = '';

    switch (commandName) {
      case 'clear':
        setChatMessages([]);
        return;
      case 'help':
        kernelReply = `SnowOS Core Terminal API. Registered Commands:
- neofetch : Displays current ASCII hardware profile specifications.
- ls       : List current directory directory and code nodes.
- cat <f>  : Dump files content buffer on screen.
- memory   : Print synthesized tri-layer memory registers.
- system   : Display processes details and thread safety counts.
- clear    : Purge shell diagnostics cache.`;
        break;
      case 'neofetch':
        kernelReply = `     /\\                  SnowOS v1.2.0-Alpha
    /  \\                 Kernel: 11.2.6-snow-agent
   /____\\                Heuristic Layer: Nyx AI Core v1.2
  | N  Y |               Uptime: ${systemStatus.uptime}
  |  X   |               CPU Load: ${metricsHistory[metricsHistory.length-1]?.cpu || 15}%
   \\____/                RAM Commit: ${metricsHistory[metricsHistory.length-1]?.memory || 42}%
                         User Domain: Navis Donel [DevOps Architect]
                         Active Environment: Isolated Secure Container Node`;
        break;
      case 'ls':
        const fileNames = virtualFiles.map(f => f.path).join('\n');
        kernelReply = `Listing working nodes filesystem:\n${fileNames}`;
        break;
      case 'cat':
        const filePath = parts[1];
        if (!filePath) {
          kernelReply = "Error: Syntactical missing variable. Practice: cat <file_path>";
        } else {
          const target = virtualFiles.find(f => f.path === filePath || f.name === filePath);
          if (target) {
            kernelReply = `--- DUMPING BUFFER FOR: ${target.path} ---\n${target.content}`;
          } else {
            kernelReply = `Error: Path nodes resolve failure: "${filePath}". Try using 'ls' to audit directory paths.`;
          }
        }
        break;
      case 'memory':
        kernelReply = `--- SYNTHESIZED COGNITIVE RECOVERY REGISTER ---
[Short-Term]: ${JSON.stringify(memoryCore.shortTerm, null, 2)}
[Working]: ${JSON.stringify(memoryCore.workingMemory, null, 2)}
[Long-Term Principles]: ${JSON.stringify(memoryCore.longTerm, null, 2)}`;
        break;
      case 'system':
        kernelReply = `--- SYSTEM PROCESSES REGISTERS DIAGNOSTIC ---
- Processes spawned: ${systemStatus.activeProcesses} threads count
- Safety constraints: Armed (AESTHETIC_ONLY = false)
- Kernel connection: SECURE (Secure Shell TLS-1.3)
- Subtask planner state: ${currentPlan ? `PLANNING_ACTIVE (Task #${currentPlan.id})` : 'THREAD_IDLE'}`;
        break;
      default:
        // Try passing it to the chat-bot as a conversational request
        handleSendMessage(cmdInput, false);
        return;
    }

    setChatMessages((msgs) => [
      ...msgs,
      {
        id: `local_reply_${Date.now()}`,
        role: 'kernel',
        text: kernelReply,
        timestamp
      }
    ]);
  };

  const handleRunSuggestion = (promptText: string) => {
    handleSendMessage(promptText, false);
  };

  // Security approval callbacks
  const handleAuthorizePlan = (planId: string) => {
    if (currentPlan && currentPlan.id === planId) {
      setCurrentPlan({
        ...currentPlan,
        status: 'running'
      });
      // Print notification
      setChatMessages((msgs) => [
        ...msgs,
        {
          id: `auth_notify_${Date.now()}`,
          role: 'kernel',
          text: `Tactile physical key approved. Resuming Task Plan Executions #${currentPlan.id}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        }
      ]);
    }
  };

  const handleHaltPlan = (planId: string) => {
    if (currentPlan && currentPlan.id === planId) {
      const index = currentPlan.currentStepIndex;
      const subtask = currentPlan.subtasks[index];
      if (subtask && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'kill',
          planId: currentPlan.id,
          stepId: subtask.id
        }));
      }

      setCurrentPlan(null);
      // Print notification
      setChatMessages((msgs) => [
        ...msgs,
        {
          id: `halt_notify_${Date.now()}`,
          role: 'kernel',
          text: `Operator triggered THREAD_HALT request. Wiping incomplete task pipelines context records.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        }
      ]);
      setActiveTab('shell');
    }
  };

  // Workspace filesystem modify APIs
  const handleAddFile = async (name: string, content: string, path: string) => {
    try {
      await fetch('/api/snow-agent/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content })
      });
      setMemoryCore((prev) => ({
        ...prev,
        shortTerm: [...prev.shortTerm, `Created custom node register: ${path}`]
      }));
    } catch (err) {
      console.error('[SnowOS Client] Failed to add file:', err);
    }
  };

  const handleDeleteFile = async (path: string) => {
    try {
      await fetch('/api/snow-agent/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      setMemoryCore((prev) => ({
        ...prev,
        shortTerm: [...prev.shortTerm, `De-registered node path: ${path}`]
      }));
    } catch (err) {
      console.error('[SnowOS Client] Failed to delete file:', err);
    }
  };

  const handleUpdateFileContent = async (path: string, content: string) => {
    try {
      await fetch('/api/snow-agent/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content })
      });
      setMemoryCore((prev) => ({
        ...prev,
        shortTerm: [...prev.shortTerm, `Modified register buffers: ${path}`]
      }));
    } catch (err) {
      console.error('[SnowOS Client] Failed to update file content:', err);
    }
  };
  
  const handleSynthesizeSpeech = async (text: string) => {
    try {
      const response = await fetch('/api/snow-agent/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'Zephyr' })
      });

      if (!response.ok) {
        throw new Error('TTS server responded with an error');
      }

      const data = await response.json();
      const base64Audio = data.audio;
      if (!base64Audio) {
        throw new Error('No audio data found in response');
      }

      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const bufferLength = len / 2;
      const floatData = new Float32Array(bufferLength);
      const dataView = new DataView(bytes.buffer);
      for (let i = 0; i < bufferLength; i++) {
        floatData[i] = dataView.getInt16(i * 2, true) / 32768.0;
      }

      const audioBuffer = audioCtx.createBuffer(1, bufferLength, 24000);
      audioBuffer.copyToChannel(floatData, 0);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start(0);
    } catch (err) {
      console.warn('Gemini high-fidelity synthesis bypassed. Using native OS voice synthesis...', err);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(v => v.lang.startsWith('en'));
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  return (
    <div className={`h-screen theme-transition flex flex-col font-sans select-none antialiased ${
      simplifiedMode ? 'bg-slate-50 text-slate-850' : 'bg-zinc-950 text-zinc-300'
    }`}>
      {/* Top Header Menubar */}
      <DesktopHeader
        status={systemStatus}
        metrics={metricsHistory[metricsHistory.length - 1] || { cpu: 0, memory: 0, disk: 0, network: 0, timestamp: Date.now() }}
        serverConnected={serverConnected}
        onRefreshMetrics={() => {}}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userModelName={userModel.name}
        simplifiedMode={simplifiedMode}
        onToggleSimplifiedMode={setSimplifiedMode}
      />

      {/* Main OS Window Frame Desktop Workspace Area */}
      <main className="flex-1 w-full p-4 flex flex-col space-y-4 min-h-0 justify-between">
        
        {/* Top visual Bento row containing the tab views */}
        <div className={`flex-1 min-h-0 border rounded-2xl p-1 transition-all duration-300 relative ${
          simplifiedMode ? 'bg-white border-slate-205 shadow-sm' : 'bg-zinc-950/40 border-zinc-800/80 backdrop-blur-sm shadow-xl'
        }`}>
          
          {/* Active Route tabs rendering */}
          <div className="h-full p-3 min-h-0">
            {activeTab === 'shell' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-h-0">
                <div className="lg:col-span-2 h-full min-h-0">
                  <NyxShell
                    chatMessages={chatMessages}
                    onSendMessage={handleSendMessage}
                    onClearHistory={() => setChatMessages([])}
                    userModel={userModel}
                    onRunSuggestion={handleRunSuggestion}
                    isGenerating={isGenerating}
                    modelName={modelName}
                    onChangeModel={(m) => setModelName(m)}
                    onSynthesizeSpeech={handleSynthesizeSpeech}
                    thinkingEnabled={thinkingEnabled}
                    onToggleThinking={(t) => setThinkingEnabled(t)}
                    simplifiedMode={simplifiedMode}
                  />
                </div>
                {/* Visual sidebar resource display in shell frame */}
                <div className="flex flex-col h-full gap-4 min-h-0">
                  <div className="flex-1 min-h-0">
                    <SystemMonitorWidget
                      metricsHistory={metricsHistory}
                      status={systemStatus}
                      simplifiedMode={simplifiedMode}
                    />
                  </div>
                  <div className={`p-4 shrink-0 rounded-2xl space-y-3.5 select-none transition-all duration-300 ${
                    simplifiedMode 
                      ? 'bg-white border border-slate-250/90 shadow-sm text-slate-707' 
                      : 'bg-zinc-950/70 backdrop-blur-md border border-zinc-805 rounded-xl text-zinc-300 font-mono shadow-[0_4px_30px_rgba(0,0,0,0.4)]'
                  }`}>
                    <div className={`font-bold border-b pb-2 uppercase tracking-wide text-xs ${
                      simplifiedMode ? 'text-slate-800 border-slate-100' : 'text-zinc-200 border-zinc-805'
                    }`}>
                      {simplifiedMode ? 'User Profile Context' : 'Active Registers Context'}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className={`block text-xs font-bold tracking-wider uppercase mb-0.5 ${simplifiedMode ? 'text-slate-400' : 'text-zinc-500'}`}>
                          {simplifiedMode ? 'OPERATOR_ROLE:' : 'CLASSIFIED_ROLE:'}
                        </span>
                        <span className={`font-bold ${simplifiedMode ? 'text-blue-600' : 'text-cyan-455'}`}>{userModel.role}</span>
                      </div>
                      <div>
                        <span className={`block text-xs font-bold tracking-wider uppercase mb-0.5 ${simplifiedMode ? 'text-slate-400' : 'text-zinc-500'}`}>
                          {simplifiedMode ? 'ACTIVE_DIRECTIVE:' : 'SYS_DIRECTIVES (Active):'}
                        </span>
                        <span className={simplifiedMode ? 'text-slate-600 font-medium' : 'text-zinc-305'}>
                          {memoryCore.workingMemory[0] || 'Idle'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <TaskEngineConsole
                currentPlan={currentPlan}
                onAuthorizePlan={handleAuthorizePlan}
                onHaltPlan={handleHaltPlan}
                agentsList={agentsList}
                setAgentsList={setAgentsList}
                pluginsList={pluginsList}
                setPluginsList={setPluginsList}
                diagnosticLogs={diagnosticLogs}
                setDiagnosticLogs={setDiagnosticLogs}
                throttleActive={throttleActive}
                setThrottleActive={setThrottleActive}
                isFailureSimulated={isFailureSimulated}
                setIsFailureSimulated={setIsFailureSimulated}
                retryCounter={retryCounter}
                setRetryCounter={setRetryCounter}
                correctionPhase={correctionPhase}
                setCorrectionPhase={setCorrectionPhase}
                subtaskProgress={subtaskProgress}
                simplifiedMode={simplifiedMode}
              />
            )}

            {activeTab === 'memory' && (
              <MemoryCoreManager
                memoryCore={memoryCore}
                onUpdateUserModel={handleUpdateUserModel}
                onClearShortTerm={handleClearShortTerm}
                indexedMemories={indexedMemories}
                setIndexedMemories={setIndexedMemories}
                learningStats={learningStats}
                setLearningStats={setLearningStats}
                simplifiedMode={simplifiedMode}
              />
            )}

            {activeTab === 'files' && (
              <VirtualWorkspace
                virtualFiles={virtualFiles}
                onAddFile={handleAddFile}
                onDeleteFile={handleDeleteFile}
                onUpdateFileContent={handleUpdateFileContent}
                modelName={modelName}
                thinkingEnabled={thinkingEnabled}
                simplifiedMode={simplifiedMode}
              />
            )}
          </div>
        </div>

        {/* Small bottom system health strip */}
        <footer className="flex items-center justify-between text-[10px] select-none border px-4 py-2.5 rounded-xl transition-all duration-300 bg-zinc-950 border-zinc-805 text-zinc-500 font-mono shadow-md">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse mr-1 bg-cyan-500" />
            <span className="font-bold tracking-wide text-zinc-400 uppercase">
              {simplifiedMode ? 'ASSISTANT STATUS: ONLINE & READY' : 'CORE SYSTEM STATUS: OPERATIONAL'}
            </span>
          </div>
          <div>
            {simplifiedMode 
              ? 'Powered by Gemini AI Companion • SnowOS Agent v1.2' 
              : 'Powered by Gemini-3.5-Flash • SnowOS Secure Kernel Loop v1.2'
            }
          </div>
        </footer>
      </main>
    </div>
  );
}
