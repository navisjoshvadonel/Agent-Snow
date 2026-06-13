/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'kernel';
  text: string;
  timestamp: string;
  isCommand?: boolean;
  planId?: string;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Subtask {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  duration: number; // in milliseconds
  actionText: string; // The virtual bash command / action being executed
  assignedAgent?: string; // Phase 1: Multi-agent coordination
  dependsOn?: string[]; // Phase 2: Task DAG dependencies
  retryCount?: number; // Phase 4: Self-correction automatic retries
  maxRetries?: number;
  verificationRule?: string; // Phase 4: Verification assertion Rule
  riskScore?: number; // Phase 7: Step risk level score
}

export interface TaskPlan {
  id: string;
  intent: string;
  goal: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  subtasks: Subtask[];
  riskLevel: RiskLevel;
  status: 'pending' | 'analyzing' | 'running' | 'paused' | 'waiting_authorization' | 'authorized' | 'success' | 'failed';
  currentStepIndex: number;
  // Advanced Upgrade properties
  delegationAgent?: string; // Phase 1
  dagGraphEnabled?: boolean; // Phase 2
  verificationLogs?: string[]; // Phase 4
  environmentConstraint?: string; // Phase 5
}

export interface UserModel {
  name: string;
  role: string;
  skills: string[];
  interests: string[];
  active_projects: string[];
  preferences: string[];
}

export interface MemoryCore {
  shortTerm: string[]; // Recent conversation goals / activities
  workingMemory: string[]; // Active tasks and immediate directives
  longTerm: string[]; // Established facts about the user / workflows
  userModel: UserModel;
  indexedMemories?: MemoryItem[]; // Phase 3: Memory indexing & ranking
}

export interface MemoryItem {
  id: string;
  text: string;
  importance: number; // 1-10 importance rating
  timestamp: string;
  category: 'workflow' | 'preference' | 'technical' | 'conversational';
  retrievalCount: number;
}

export interface SecurityLevel {
  level: RiskLevel;
  requiredApproval: 'auto' | 'tactile' | 'mfa_biometric';
  sandboxEnforced: boolean;
  isolationLevel: 'high_process' | 'low_process';
}

export interface OSPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  permissionScope: 'filesystem' | 'network' | 'system_monitor' | 'llm_generative';
  riskRating: RiskLevel;
  loadTimeMs: number;
}

export interface LearningState {
  successfulWorkflows: number;
  failedWorkflows: number;
  unauthorizedPlansWiped: number;
  optimizedCycles: number;
  frequentActions: { action: string; frequency: number }[];
  userAffinities: string[];
}

export interface VirtualFile {
  name: string;
  path: string; // full path, e.g. "/scraper.py"
  content: string;
  type: 'file' | 'folder';
  language?: string;
  size: string;
  updatedAt: string;
}

export interface ResourceMetric {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  timestamp: number;
}

export interface SystemStatus {
  health: 'Healthy' | 'Degraded' | 'Critical';
  uptime: string;
  activeProcesses: number;
  portsBlocked: boolean;
  securityCoreStatus: 'Armed' | 'Bypassed';
}
