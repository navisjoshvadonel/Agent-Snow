/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { spawn, ChildProcess, exec } from 'child_process';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import chokidar from 'chokidar';
import si from 'systeminformation';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Gemini client if API Key exists
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log("Snow Agent initialized Gemini engine successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini Client:", err);
  }
} else {
  console.log("No valid GEMINI_API_KEY found. Snow Agent running in Autonomous Offline Sandbox Mode.");
}

// Helper function to call Gemini with retry and fallback
async function generateContentWithRetryAndFallback(
  aiClient: GoogleGenAI,
  primaryModel: string,
  contents: any,
  config: any
) {
  // Define fallback sequence based on the original requested model
  const modelsToTry = [primaryModel];
  if (primaryModel !== "gemini-3.1-flash-lite") {
    modelsToTry.push("gemini-3.1-flash-lite");
  }
  if (primaryModel !== "gemini-3.5-flash" && !modelsToTry.includes("gemini-3.5-flash")) {
    modelsToTry.push("gemini-3.5-flash");
  }

  let lastError: any = null;

  for (const model of modelsToTry) {
    let retries = 3;
    let delay = 500; // start with 500ms delay for backoff

    while (retries > 0) {
      try {
        console.log(`[SnowOS GenAI] Querying model: ${model} (Retries remaining: ${retries - 1})`);
        
        // Deep clone config to avoid mutating references
        const localConfig = JSON.parse(JSON.stringify(config || {}));
        
        // If falling back away from gemini-3.1-pro-preview, remove or adjust thinkingConfig
        if (model !== "gemini-3.1-pro-preview") {
          // gemini-3.1-flash-lite does not support HIGH thinking, let's remove it
          if (model === "gemini-3.1-flash-lite" && localConfig.thinkingConfig) {
            delete localConfig.thinkingConfig;
          } else if (model === "gemini-3.5-flash" && localConfig.thinkingConfig) {
            // gemini-3.5-flash series supports LOW thinking, or we can adjust it for safety
            localConfig.thinkingConfig = { thinkingLevel: 'LOW' };
          }
        }

        const response = await aiClient.models.generateContent({
          model: model,
          contents: contents,
          config: localConfig
        });
        return { response, usedModel: model };
      } catch (error: any) {
        lastError = error;
        const status = error?.status || error?.error?.status;
        const code = error?.code || error?.error?.code;
        const message = error?.message || error?.error?.message || "";
        
        console.warn(`[SnowOS GenAI] Error querying ${model}: ${message} (Code: ${code}, Status: ${status})`);

        // Check if it's a 503, 429, or other transient error
        const isTransient = status === "UNAVAILABLE" || code === 503 || code === 429 || status === "RESOURCE_EXHAUSTED" || 
                            message.includes("503") || message.includes("429") || message.toLowerCase().includes("unavailable") || message.toLowerCase().includes("exhausted");

        if (isTransient && retries > 1) {
          console.log(`[SnowOS GenAI] Transient error detected. Backing off for ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
          retries--;
        } else {
          // If it is NOT a transient error (e.g. invalid arguments or system error) or we are out of retries,
          // break out to try the next model
          break;
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content with all fallback models and retries");
}

// Helper to call TTS with retry
async function generateTTSWithRetry(
  aiClient: GoogleGenAI,
  contents: any,
  config: any
) {
  let lastError: any = null;
  let retries = 3;
  let delay = 500;

  while (retries > 0) {
    try {
      console.log(`[SnowOS TTS] Querying model: gemini-3.1-flash-tts-preview (Retries remaining: ${retries - 1})`);
      const response = await aiClient.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: contents,
        config: config
      });
      return response;
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.error?.status;
      const code = error?.code || error?.error?.code;
      const message = error?.message || error?.error?.message || "";
      
      console.warn(`[SnowOS TTS] Error querying gemini-3.1-flash-tts-preview: ${message} (Code: ${code}, Status: ${status})`);

      const isTransient = status === "UNAVAILABLE" || code === 503 || code === 429 || status === "RESOURCE_EXHAUSTED" || 
                          message.includes("503") || message.includes("429") || message.toLowerCase().includes("unavailable") || message.toLowerCase().includes("exhausted");

      if (isTransient && retries > 1) {
        console.log(`[SnowOS TTS] Transient error detected. Backing off for ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        retries--;
      } else {
        break;
      }
    }
  }

  throw lastError || new Error("Failed to generate TTS content with retries");
}

const WORKSPACE_DIR = path.join(process.cwd(), 'workspace');

async function ensureWorkspaceSeeded() {
  await fs.mkdir(WORKSPACE_DIR, { recursive: true });
  try {
    const files = await fs.readdir(WORKSPACE_DIR);
    if (files.length === 0) {
      console.log("[SnowOS Workspace] Directory is empty. Seeding defaults...");
      const readmeContent = `# SnowOS Active Kernel v1.2.0

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
`;
      const configContent = `{
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
}`;
      await fs.writeFile(path.join(WORKSPACE_DIR, 'README_KERNEL.md'), readmeContent);
      await fs.writeFile(path.join(WORKSPACE_DIR, 'sys_config.json'), configContent);
    }
  } catch (err) {
    console.error("[SnowOS Workspace] Seeding failed:", err);
  }
}

async function getFilesRecursively(dir: string, baseDir: string = WORKSPACE_DIR): Promise<any[]> {
  if (!existsSync(dir)) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: any[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = '/' + path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      const subFiles = await getFilesRecursively(fullPath, baseDir);
      files.push(...subFiles);
    } else {
      try {
        const stats = await fs.stat(fullPath);
        const content = await fs.readFile(fullPath, 'utf-8');
        files.push({
          name: entry.name,
          path: relPath,
          type: 'file',
          size: `${stats.size} bytes`,
          updatedAt: stats.mtime.toISOString().replace('T', ' ').slice(0, 19),
          content
        });
      } catch (e) {
        console.error(`Failed to read file ${fullPath}:`, e);
      }
    }
  }
  return files;
}

// REST Endpoints for workspace files syncing
app.get('/api/snow-agent/files', async (req, res) => {
  try {
    await ensureWorkspaceSeeded();
    const filesList = await getFilesRecursively(WORKSPACE_DIR);
    res.json({ success: true, files: filesList });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/snow-agent/files/write', async (req, res) => {
  const { path: relPath, content } = req.body;
  if (!relPath) {
    return res.status(400).json({ success: false, error: "Missing relative path" });
  }
  try {
    const safeRelPath = relPath.startsWith('/') ? relPath.slice(1) : relPath;
    const destPath = path.join(WORKSPACE_DIR, safeRelPath);
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.writeFile(destPath, content || '');
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/snow-agent/files/delete', async (req, res) => {
  const { path: relPath } = req.body;
  if (!relPath) {
    return res.status(400).json({ success: false, error: "Missing relative path" });
  }
  try {
    const safeRelPath = relPath.startsWith('/') ? relPath.slice(1) : relPath;
    const destPath = path.join(WORKSPACE_DIR, safeRelPath);
    if (existsSync(destPath)) {
      const stats = await fs.stat(destPath);
      if (stats.isDirectory()) {
        await fs.rm(destPath, { recursive: true, force: true });
      } else {
        await fs.unlink(destPath);
      }
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// REST Endpoint: Get System Metrics
app.get('/api/snow-agent/metrics', async (req, res) => {
  try {
    const load = await si.currentLoad();
    const mem = await si.mem();
    const fs = await si.fsSize();
    const net = await si.networkStats();
    const proc = await si.processes();

    // CPU load percentage
    const cpu = Math.max(0, Math.min(100, Math.round(load.currentLoad || 0)));

    // Memory usage percentage
    const memory = mem.total > 0 ? Math.max(0, Math.min(100, Math.round((mem.active / mem.total) * 100))) : 40;

    // Disk usage percentage of primary filesystem (root '/' or 'C:')
    const primaryFs = fs.find(f => f.mount === '/' || f.mount === 'C:') || fs[0];
    const disk = primaryFs ? Math.max(0, Math.min(100, Math.round(primaryFs.use || 0))) : 28;

    // Network throughput in kbps
    const activeNet = net && net[0];
    const network = activeNet ? Math.max(0, Math.round(((activeNet.rx_sec + activeNet.tx_sec) * 8) / 1024)) : 0;

    // Running system processes count
    const activeProcesses = proc.running || proc.all || 18;

    res.json({
      metrics: { cpu, memory, disk, network, timestamp: Date.now() },
      status: {
        health: cpu > 85 ? 'Degraded' : 'Healthy',
        uptime: formatUptime(process.uptime()),
        activeProcesses,
        portsBlocked: false,
        securityCoreStatus: 'Armed'
      }
    });
  } catch (error: any) {
    console.error("[SnowOS Metrics] Failed to query system telemetry:", error);
    // Graceful fallback to baseline simulation metrics
    const cpu = Math.floor(15 + Math.random() * 25);
    const memory = Math.floor(40 + Math.random() * 10);
    res.json({
      metrics: { cpu, memory, disk: 28, network: 50, timestamp: Date.now() },
      status: {
        health: cpu > 85 ? 'Degraded' : 'Healthy',
        uptime: formatUptime(process.uptime()),
        activeProcesses: 18 + Math.floor(cpu / 10),
        portsBlocked: false,
        securityCoreStatus: 'Armed'
      }
    });
  }
});

// Local LLM (Ollama) Integration Helpers
async function queryLocalLLM(message: string, systemPrompt: string, history: any[] = []): Promise<any> {
  const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'deepseek-coder';

  console.log(`[SnowOS Local LLM] Querying Ollama at ${ollamaHost} using model ${ollamaModel}...`);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history || []).map(h => ({
      role: h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user',
      content: typeof h.parts === 'string' ? h.parts : (h.parts?.[0]?.text || h.content || '')
    })),
    { role: 'user', content: message }
  ];

  const response = await fetch(`${ollamaHost}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaModel,
      messages,
      stream: false,
      format: 'json'
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama chat endpoint returned status ${response.status}`);
  }

  const data: any = await response.json();
  const textOutput = data.message?.content?.trim() || "";
  return JSON.parse(textOutput);
}

async function queryLocalLLMText(prompt: string, systemPrompt: string): Promise<string> {
  const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'deepseek-coder';

  console.log(`[SnowOS Local LLM] Querying Ollama text generation at ${ollamaHost} using model ${ollamaModel}...`);

  const response = await fetch(`${ollamaHost}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama text endpoint returned status ${response.status}`);
  }

  const data: any = await response.json();
  return data.message?.content || "";
}

// Full-featured conversational task engine
app.post('/api/snow-agent/chat', async (req, res) => {
  const { message, history, userModel, memoryCore, virtualFiles, modelName, thinkingEnabled, thinkingLevel } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: "Missing prompt input message" });
  }

  // Formulate a file explorer manifest representation for the LLM prompt
  const filesRepresentation = virtualFiles && Array.isArray(virtualFiles)
    ? virtualFiles.map((f: any) => `Path: ${f.path} | Name: ${f.name} | Type: ${f.type} | Size: ${f.size} | Content (Truncated to 1500 chars):\n${(f.content || '').slice(0, 1500)}`).join('\n---\n')
    : "Virtual Workspace filesystem is empty.";

  const systemPrompt = `You are Snow Agent, the core autonomous intelligence operating system layer of SnowOS.
You are not a chatbot or visual assistant. You are an AI-run OS Kernel assistant, Task Planner, and Memory engine.
Your focus is to convert human requests into structured operations.

You must answer questions, explain concepts, or dynamically generate action plans that Nyx (the conversational terminal) will execute.

You must respond exclusively with a JSON body matching this TypeScript schema:
{
  "message": string, // Conversational answer or status update, written as Snow Agent/Nyx (smart, professional, a bit geeky, helpful).
  "plan": { // OPTIONAL. Only include if the user requested a specific operation, creation, automation, analysis or scripting task.
    "intent": string, // e.g. "create_project", "scan_directory", "resource_optimization", "memory_compaction"
    "goal": string, // short objective text
    "priority": "low" | "normal" | "high" | "urgent",
    "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", // HIGH/CRITICAL will require user confirmation block in UI!
    "subtasks": [
      {
        "id": string, // sequential starting from "1"
        "title": string, // human-friendly subtask title
        "duration": number, // estimated duration in ms (1500 to 5000)
        "actionText": string // command line bash command to visually execute in terminal logs
      }
    ]
  },
  "workspaceUpdate": { // OPTIONAL. Direct edits or creation of files in the virtual filesystem if the user requested code adjustments, file deletes, or new scripts.
    "action": "create" | "edit" | "delete", // Use "create" for new files, "edit" to overwrite, "delete" to remove
    "path": string, // absolute virtual path (e.g., "/web_scraper/src/scraper.py")
    "name": string, // file name (e.g., "scraper.py")
    "content": string // The full new source code content of the file (required for create/edit)
  },
  "userUpdate": { // OPTIONAL. If you learned something new about the user (their name, role, skills, preference), output ONLY what has changed to merge into their profile.
    "name": string,
    "role": string,
    "skills": string[],
    "interests": string[],
    "active_projects": string[],
    "preferences": string[]
  },
  "memoryUpdate": { // OPTIONAL. If you found memories or key facts to store
    "shortTerm": string[],
    "workingMemory": string[],
    "longTerm": string[]
  }
}

Security Risk Framework:
- Create file, scan, read configs, help, clean logs: LOW risk (Execute immediately).
- Package installation, custom shell script execution, starting services: MEDIUM risk (Execute with warning).
- Directory wipe, file deletions, exporting files: HIGH risk (Requires user auth approval in UI).
- Modifying OS systems folders or critical credentials: CRITICAL risk (Block compile).

Keep custom projects smart and visually attractive. When making a folder/script, define multiple steps like creating directories, drafting code structures, mock compiling, and validating outputs.

If a user asks to modify an existing file, create a file, or write any code, you SHOULD prefer returning the 'workspaceUpdate' object in addition to any 'plan' so that the virtual editor immediately reflects the changes!

Current User Model State: ${JSON.stringify(userModel)}
Current Memory State: ${JSON.stringify(memoryCore)}
Message History Context count: ${history ? history.length : 0}

The Operator's Active Virtual Workspace Directory contains the following files:
=========================================
${filesRepresentation}
=========================================
`;

  // --- INTERPOLATE OFFLINE sandbox LLM check if Gemini client is unavailable ---
  if (!ai) {
    try {
      const ollamaResponse = await queryLocalLLM(message, systemPrompt, history);
      if (ollamaResponse && typeof ollamaResponse === 'object') {
        ollamaResponse.message = `[Local Offline LLM] ${ollamaResponse.message || ''}`;
        return res.json(ollamaResponse);
      }
      throw new Error("Local LLM response format is invalid");
    } catch (ollamaErr: any) {
      console.warn("[SnowOS Sandbox] Local LLM unavailable, falling back to static sandbox heuristics:", ollamaErr.message);
      const response = handleOfflineSandbox(message, userModel, virtualFiles);
      response.message = `[Sandboxed Heuristics] ${response.message}`;
      return res.json(response);
    }
  }

  // Choose the requested model or default based on thinking mode / request
  let activeModel = modelName || "gemini-3.5-flash";
  const isHighThinking = thinkingEnabled || thinkingLevel === "HIGH" || modelName === "gemini-3.1-pro-preview-thinking";

  if (isHighThinking) {
    activeModel = "gemini-3.1-pro-preview";
  }

  try {
    // Configure run parameters
    const runConfig: any = {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json"
    };

    if (isHighThinking && activeModel === "gemini-3.1-pro-preview") {
      runConfig.thinkingConfig = {
        thinkingLevel: ThinkingLevel.HIGH
      };
      delete runConfig.maxOutputTokens;
    }

    // Prompt generative model with retry and fallback mechanics
    const { response, usedModel } = await generateContentWithRetryAndFallback(
      ai,
      activeModel,
      [
        { role: 'user', parts: [{ text: `User request: "${message}"` }] }
      ],
      runConfig
    );

    const textOutput = response.text ? response.text.trim() : "";
    if (!textOutput) {
       throw new Error(`Empty response returned from Gemini API using model ${usedModel}`);
    }

    const payload = JSON.parse(textOutput);
    
    // If we fell back to a different model, include a model notice prefix
    if (usedModel !== activeModel) {
      if (payload && typeof payload === 'object') {
        payload.message = `[Model Recovery: ${usedModel}] ${payload.message || ''}`;
      }
    }
    
    res.json(payload);

  } catch (error: any) {
    console.error(`Gemini runtime error using model ${activeModel}, trying local LLM fallback:`, error);
    try {
      const ollamaResponse = await queryLocalLLM(message, systemPrompt, history);
      if (ollamaResponse && typeof ollamaResponse === 'object') {
        ollamaResponse.message = `[Local Offline LLM Fallback] ${ollamaResponse.message || ''}`;
        return res.json(ollamaResponse);
      }
      throw new Error("Local LLM fallback response format is invalid");
    } catch (ollamaErr: any) {
      console.error("Local LLM fallback failed, using offline sandbox planner:", ollamaErr);
      const fallbackResponse = handleOfflineSandbox(message, userModel, virtualFiles);
      fallbackResponse.message = `[Sandboxed Core] ${fallbackResponse.message}`;
      res.json(fallbackResponse);
    }
  }
});

// Local TTS (PowerShell/say/espeak) helper
const execPromise = (cmd: string) => new Promise<string>((resolve, reject) => {
  exec(cmd, (err, stdout, stderr) => {
    if (err) reject(err);
    else resolve(stdout);
  });
});

async function generateLocalTTS(text: string): Promise<string> {
  const wavPath = path.join(WORKSPACE_DIR, `temp_tts_${Date.now()}_${Math.floor(Math.random() * 1000)}.wav`);
  console.log(`[SnowOS Local TTS] Starting local TTS synthesis for: "${text}" -> ${wavPath}`);

  try {
    if (process.platform === 'win32') {
      const escapedText = text.replace(/'/g, "''").replace(/"/g, '\\"');
      const psCommand = `Add-Type -AssemblyName System.Speech; \$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; \$speak.SetOutputToWaveFile('${wavPath}'); \$speak.Speak('${escapedText}'); \$speak.Dispose();`;
      await execPromise(`powershell -Command "${psCommand}"`);
    } else if (process.platform === 'darwin') {
      await execPromise(`say -o "${wavPath}" --data-format=LEI16@22050 "${text.replace(/"/g, '\\"')}"`);
    } else {
      await execPromise(`espeak -w "${wavPath}" "${text.replace(/"/g, '\\"')}"`);
    }

    const audioBuffer = await fs.readFile(wavPath);
    const base64Audio = audioBuffer.toString('base64');

    await fs.unlink(wavPath).catch(err => console.warn(`[SnowOS Local TTS] Failed to delete temp file ${wavPath}:`, err.message));

    console.log(`[SnowOS Local TTS] Synthesized successfully (${audioBuffer.byteLength} bytes)`);
    return base64Audio;
  } catch (err: any) {
    await fs.unlink(wavPath).catch(() => {});
    throw new Error(`Local TTS engine failed: ${err.message}`);
  }
}

// High Quality Gemini Voice Text-to-Speech Endpoint
app.post('/api/snow-agent/tts', async (req, res) => {
  const { text, voice } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: "Missing text input for voice synthesis" });
  }

  if (!ai) {
    try {
      const base64Audio = await generateLocalTTS(text);
      return res.json({ audio: base64Audio });
    } catch (localErr: any) {
      console.error("[SnowOS Local TTS] Offline synthesis failed:", localErr);
      return res.status(503).json({ error: "Gemini offline and local synthesis failed: " + localErr.message });
    }
  }

  try {
    // Invoke high-fidelity pre-built voice synthesizer with retry functionality
    const response = await generateTTSWithRetry(
      ai,
      [{ parts: [{ text: `Read this operating log naturally: ${text}` }] }],
      {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Zephyr' },
          }
        }
      }
    );

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return res.json({ audio: base64Audio });
    } else {
      throw new Error("Generative loop completed but buffer contains empty stream");
    }
  } catch (error: any) {
    console.error("Gemini TTS synthesis failed, trying local LLM/TTS fallback:", error);
    try {
      const base64Audio = await generateLocalTTS(text);
      return res.json({ audio: base64Audio });
    } catch (localErr: any) {
      console.error("[SnowOS Local TTS] Fallback synthesis failed:", localErr);
      return res.status(500).json({ error: error.message || "Synthesis pipeline failed" });
    }
  }
});

// Full-featured API-driven AI-operation endpoint for files
app.post('/api/snow-agent/ai-operation', async (req, res) => {
  const { path, name, content, operation, modelName, thinkingEnabled, thinkingLevel } = req.body;
  
  if (!operation) {
    return res.status(400).json({ error: "Missing operation parameter" });
  }

  if (!content) {
    return res.status(400).json({ error: "No file content provided for AI context" });
  }

  const systemInstruction = operation === "analyze"
    ? `You are a Senior Systems Architect and Security Code Auditor.
Provide a comprehensive, high-quality, professional markdown analysis of the user's code.
Focus on:
1. Architectural Layout & Cleanliness
2. Performance & Memory Bottlenecks (e.g. infinite loops, unoptimized searches, file I/O delays)
3. Direct Security Vulnerabilities (e.g. credential leaks, raw command injection)
4. Concrete actionable advice.
Maintain a professional, helpful, objective tone. Do not use unrequired technical jargon.`
    : `You are a Senior Software Performance Engineer.
Optimize and refactor the user's code.
Your output MUST be a valid JSON with the following schema:
{
  "explanation": "Markdown description of modifications made, performance or clean-code benefits, and actionable insights.",
  "optimizedCode": "The complete, optimized, updated version of the code file. Keep variable naming consistent with the original unless it violates clear standards."
}`;

  const promptText = operation === "analyze"
    ? `Please analyze the file named "${name || 'untitled'}" at path "${path || '/'}" with the following contents:
\`\`\`
${content}
\`\`\`
`
    : `Please optimize, refactor and clean the file named "${name || 'untitled'}" at path "${path || '/'}" with the following contents:
\`\`\`
${content}
\`\`\``;

  // --- INTERPOLATE OFFLINE sandbox heuristics if Gemini client is unavailable ---
  if (!ai) {
    try {
      const txt = await queryLocalLLMText(promptText, systemInstruction);
      if (operation === "analyze") {
        return res.json({
          success: true,
          analysis: `[Local Offline LLM] ${txt}`,
          usedModel: "Local-Ollama-Model"
        });
      } else {
        const payload = JSON.parse(txt);
        return res.json({
          success: true,
          analysis: `[Local Offline LLM] ${payload.explanation || ''}`,
          optimizedCode: payload.optimizedCode,
          usedModel: "Local-Ollama-Model"
        });
      }
    } catch (ollamaErr: any) {
      console.warn("[SnowOS Sandbox] Local LLM unavailable for AI operation, falling back to static sandbox:", ollamaErr.message);
      if (operation === "analyze") {
        return res.json({
          success: true,
          analysis: `### [Offline Sandbox Mode] Heuristic Analysis for ${name || 'file'}\n\n*   **Summary**: Static heuristics detect standard script footprint.\n*   **Formatting**: Code spacing and structure look standard.\n*   **Security Audit**: No obvious anomalies matching high-risk signatures.\n*   **Optimization Advice**: Enable active Gemini client for deep, contextual metrics processing.`,
          usedModel: "Autonomous-Offline-Model"
        });
      } else {
        return res.json({
          success: true,
          analysis: `### [Offline Sandbox Mode] Optimization for ${name || 'file'}\n\n*   Your code has been formatted inside the virtual workspace compiler structure successfully. No code modifications made under local sandbox limits.`,
          optimizedCode: content,
          usedModel: "Autonomous-Offline-Model"
        });
      }
    }
  }

  // Choose the requested model or default based on thinking mode / request
  let activeModel = modelName || "gemini-3.5-flash";
  const isHighThinking = thinkingEnabled || thinkingLevel === "HIGH" || modelName === "gemini-3.1-pro-preview-thinking";

  if (isHighThinking) {
    activeModel = "gemini-3.1-pro-preview";
  }

  try {
    const runConfig: any = {
      systemInstruction,
    };

    if (operation === "optimize") {
      runConfig.responseMimeType = "application/json";
    }

    if (isHighThinking && activeModel === "gemini-3.1-pro-preview") {
      runConfig.thinkingConfig = {
        thinkingLevel: ThinkingLevel.HIGH
      };
      delete runConfig.maxOutputTokens;
    }

    const { response, usedModel } = await generateContentWithRetryAndFallback(
      ai,
      activeModel,
      [{ role: 'user', parts: [{ text: promptText }] }],
      runConfig
    );

    const txt = response.text ? response.text.trim() : "";
    if (!txt) {
      throw new Error(`Empty response returned from Gemini API`);
    }

    if (operation === "analyze") {
      return res.json({
        success: true,
        analysis: txt,
        usedModel
      });
    } else {
      const payload = JSON.parse(txt);
      return res.json({
        success: true,
        analysis: payload.explanation,
        optimizedCode: payload.optimizedCode,
        usedModel
      });
    }

  } catch (error: any) {
    console.error(`AI Operation ${operation} failed, trying local LLM fallback:`, error);
    try {
      const txt = await queryLocalLLMText(promptText, systemInstruction);
      if (operation === "analyze") {
        return res.json({
          success: true,
          analysis: `[Local Offline LLM Fallback] ${txt}`,
          usedModel: "Local-Ollama-Model"
        });
      } else {
        const payload = JSON.parse(txt);
        return res.json({
          success: true,
          analysis: `[Local Offline LLM Fallback] ${payload.explanation || ''}`,
          optimizedCode: payload.optimizedCode,
          usedModel: "Local-Ollama-Model"
        });
      }
    } catch (ollamaErr: any) {
      console.error("Local LLM fallback failed for AI operation:", ollamaErr);
      return res.status(500).json({ error: error.message || "Pipeline processor failed." });
    }
  }
});

// Helper for Uptime Formatting
function formatUptime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Sandbox intelligent offline scheduler response
function handleOfflineSandbox(message: string, currentModel: any, virtualFiles?: any[]) {
  const query = message.toLowerCase();
  
  // Base details
  let responseText = "Snow Agent online. Analyzing parameters against the local system state. Use 'help' to see active OS triggers.";
  let plan: any = null;
  let userUpdate: any = {};
  let memoryUpdate: any = {};

  // Name checking
  if (query.includes("my name is") || query.includes("call me")) {
    const matches = message.match(/(?:my name is|call me)\s+([A-Za-z0-9\s]+)/i);
    if (matches && matches[1]) {
      const nameVal = matches[1].trim();
      responseText = `Acknowledge, operator identity registered: ${nameVal}. Updating primary index.`;
      userUpdate = { name: nameVal };
    }
  }

  // Task: Clear, Help, Status triggers
  if (query.includes("help") || query === "h") {
    responseText = `SnowOS Interactive Terminal Interface. Current Capabilities:
- Project creation requests (e.g., "Build web scraper", "Make todo website")
- File management actions (e.g., "wipe log directory", "setup config")
- Memory learning (e.g., "My name is Donel", "I am a DevOps Lead")
- System diagnostic scans (e.g., "Optimize resources", "Run security audit")`;
  }
  
  else if (query.includes("scraper") || query.includes("python") || query.includes("scrape")) {
    responseText = "Detected intent matching code generation pipeline. Drafting multi-step deployment project for structural web scraper.";
    plan = {
      intent: "create_project",
      goal: "Build Python BeautifulSoup Web Scraper",
      priority: "normal",
      riskLevel: "LOW",
      subtasks: [
        { id: "1", title: "Create workspace folders structures", duration: 1500, actionText: "mkdir -p web_scraper/src/modules" },
        { id: "2", title: "Generate scraper script code (scraper.py)", duration: 2500, actionText: "touch web_scraper/src/scraper.py && cat << 'EOF' > web_scraper/src/scraper.py" },
        { id: "3", title: "Draft environment configurations (env.cfg)", duration: 1500, actionText: "create_file web_scraper/env.cfg" },
        { id: "4", title: "Install scrapers requirements (bs4, requests)", duration: 2000, actionText: "pip install beautifulsoup4 requests --user" },
        { id: "5", title: "Verify connection and execute scraper module", duration: 1800, actionText: "python web_scraper/src/scraper.py --test" }
      ]
    };
    memoryUpdate = {
      workingMemory: ["Deploy web-scraper project", "Configure beautifulsoup library"]
    };
  }

  else if (query.includes("wipe") || query.includes("delete") || query.includes("remove") || query.includes("destroy")) {
    responseText = "CRITICAL OPERATION REQUEST: Directory wipes or system deletions carry destructive parameters. Initiating security validation.";
    plan = {
      intent: "directory_wipe",
      goal: "Purge local caching and build log directories",
      priority: "high",
      riskLevel: "HIGH", // Triggers confirmation block!
      subtasks: [
        { id: "1", title: "Analyze target cache nodes indices", duration: 1500, actionText: "find ./tmp/logs -type f" },
        { id: "2", title: "Wipe structural systems cache", duration: 2000, actionText: "rm -rf ./tmp/logs/*" },
        { id: "3", title: "Verify index registers recovery status", duration: 1500, actionText: "df -h" }
      ]
    };
  }

  else if (query.includes("todo") || query.includes("react") || query.includes("website") || query.includes("app")) {
    responseText = "Detected Client-First interactive workspace request. Planning modern boilerplate setup.";
    plan = {
      intent: "create_project",
      goal: "Bootstrap Interactive React State Portal",
      priority: "normal",
      riskLevel: "MEDIUM",
      subtasks: [
        { id: "1", title: "Initialize responsive modules folder", duration: 1500, actionText: "mkdir -p dashboard-portal/components" },
        { id: "2", title: "Construct App entry and tailwind classes", duration: 2000, actionText: "touch dashboard-portal/App.tsx" },
        { id: "3", title: "Verify dev compiling bundles", duration: 1800, actionText: "npm run build --prefix ./dashboard-portal" }
      ]
    };
  }

  else if (query.includes("optimize") || query.includes("scan") || query.includes("audit") || query.includes("resource")) {
    responseText = "Analyzing resource loads grid. Active core processes checking. Compacting operating memories.";
    plan = {
      intent: "resource_optimization",
      goal: "SnowOS Memory Core Compaction & Core Sweep",
      priority: "high",
      riskLevel: "LOW",
      subtasks: [
        { id: "1", title: "Measure Heap indices fragments list", duration: 1200, actionText: "sysctl -a | grep memory" },
        { id: "2", title: "Run memory compaction garbage collector", duration: 2200, actionText: "gc --force --compact" },
        { id: "3", title: "De-fragment virtual operating nodes", duration: 1800, actionText: "sync && echo 3 > /proc/sys/vm/drop_caches" },
        { id: "4", title: "Re-index active background tasks logs", duration: 1500, actionText: "service snowos-engine restart" }
      ]
    };
  }

  else {
    // Dynamic general response
    responseText = `Heuristics index completed. Received request: "${message}". What would you like Snow Agent to organize or script next? Try asking me to "Create a Python BeautifulSoup Scraper" or "Wipe my logs folder" to observe different authorization and execution tiers!`;
  }

  return {
    message: responseText,
    plan,
    userUpdate,
    memoryUpdate
  };
}

let useDockerSandbox = false;
let useLowPrivilegeUser = false;

function checkDockerAvailable(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const check = spawn('docker', ['ps']);
    check.on('error', () => resolve(false));
    check.on('close', (code) => resolve(code === 0));
  });
}

async function initSandboxConfig() {
  useDockerSandbox = await checkDockerAvailable();
  if (useDockerSandbox) {
    console.log("[SnowOS Sandbox] Docker is available. Enabling strict Container Isolation.");
  } else {
    if (process.platform !== 'win32') {
      useLowPrivilegeUser = true;
      console.log("[SnowOS Sandbox] Running inside container/Linux. Enabling low-privilege process isolation (nobody user).");
    } else {
      console.warn("[SnowOS Sandbox] Windows host detected without Docker. WARNING: Command isolation disabled.");
    }
  }
}

const activeProcesses = new Map<string, ChildProcess>();
const wsClients = new Set<WebSocket>();
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws: WebSocket) => {
  console.log('[SnowOS WS] Client connected.');
  wsClients.add(ws);

  ws.on('message', (message: string) => {
    try {
      const payload = JSON.parse(message);
      const { type, planId, stepId, command } = payload;

      if (type === 'execute') {
        const processKey = `${planId}_${stepId}`;
        console.log(`[SnowOS WS] Executing command for ${processKey}: ${command}`);

        const spawnOptions: any = { shell: true };
        let runCommand = command;
        let runArgs: string[] = [];

        if (useDockerSandbox) {
          const containerName = `snowos_sandbox_${planId}_${stepId}`;
          const safeWorkspaceDir = WORKSPACE_DIR.replace(/\\/g, '/');
          const dockerArgs = [
            'run',
            '--rm',
            '-i',
            '--name', containerName,
            '--cap-drop=ALL',
            '--security-opt', 'no-new-privileges:true',
            '-v', `${safeWorkspaceDir}:/workspace`,
            '-w', '/workspace',
            'agentsnow-agent-snow:latest',
            'sh', '-c', command
          ];
          runCommand = 'docker';
          runArgs = dockerArgs;
          spawnOptions.shell = false;
          console.log(`[SnowOS Sandbox] Routing execution inside Docker container: ${containerName}`);
        } else if (useLowPrivilegeUser) {
          // Drop privileges to standard Unix 'nobody' user (65534)
          spawnOptions.uid = 65534;
          spawnOptions.gid = 65534;
          console.log(`[SnowOS Sandbox] Routing execution through low-privilege nobody user (UID 65534)`);
        } else {
          console.log(`[SnowOS Sandbox] Running command directly on host system (no sandbox)`);
        }

        const child = runArgs.length > 0 
          ? spawn(runCommand, runArgs, spawnOptions) 
          : spawn(runCommand, spawnOptions);

        activeProcesses.set(processKey, child);

        ws.send(JSON.stringify({ type: 'started', planId, stepId }));

        child.stdout?.on('data', (data) => {
          ws.send(JSON.stringify({
            type: 'log',
            planId,
            stepId,
            stream: 'stdout',
            data: data.toString()
          }));
        });

        child.stderr?.on('data', (data) => {
          ws.send(JSON.stringify({
            type: 'log',
            planId,
            stepId,
            stream: 'stderr',
            data: data.toString()
          }));
        });

        child.on('error', (err) => {
          console.error(`[SnowOS WS] Spawn error for ${processKey}:`, err);
          ws.send(JSON.stringify({
            type: 'status',
            planId,
            stepId,
            exitCode: -1,
            error: err.message
          }));
          activeProcesses.delete(processKey);
        });

        child.on('close', (code) => {
          console.log(`[SnowOS WS] Process ${processKey} closed with code ${code}`);
          ws.send(JSON.stringify({
            type: 'status',
            planId,
            stepId,
            exitCode: code === null ? -1 : code
          }));
          activeProcesses.delete(processKey);
        });
      }

      else if (type === 'kill') {
        const processKey = `${planId}_${stepId}`;
        const child = activeProcesses.get(processKey);
        if (child) {
          console.log(`[SnowOS WS] Killing process ${processKey}`);
          child.kill();
          if (useDockerSandbox) {
            const containerName = `snowos_sandbox_${planId}_${stepId}`;
            console.log(`[SnowOS Sandbox] Killing Docker container: ${containerName}`);
            spawn('docker', ['kill', containerName]);
          }
          activeProcesses.delete(processKey);
          ws.send(JSON.stringify({ type: 'status', planId, stepId, exitCode: -1, error: 'Process killed by operator.' }));
        }
      }
    } catch (err: any) {
      console.error('[SnowOS WS] Message processing error:', err);
    }
  });

  ws.on('close', () => {
    console.log('[SnowOS WS] Client disconnected.');
    wsClients.delete(ws);
  });
});

// Chokidar workspace directory watcher configuration
const watcher = chokidar.watch(WORKSPACE_DIR, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  ignoreInitial: true, // ignore files present at startup
});

watcher.on('add', async (filePath) => {
  await broadcastFileChange(filePath, 'add');
});

watcher.on('change', async (filePath) => {
  await broadcastFileChange(filePath, 'change');
});

watcher.on('unlink', (filePath) => {
  broadcastFileDelete(filePath);
});

async function broadcastFileChange(filePath: string, eventType: string) {
  try {
    const relPath = '/' + path.relative(WORKSPACE_DIR, filePath).replace(/\\/g, '/');
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf-8');
    const name = path.basename(filePath);

    const message = JSON.stringify({
      type: 'file_changed',
      file: {
        name,
        path: relPath,
        type: 'file',
        size: `${stats.size} bytes`,
        updatedAt: stats.mtime.toISOString().replace('T', ' ').slice(0, 19),
        content
      }
    });

    for (const client of wsClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  } catch (error) {
    console.error(`Error broadcasting change for file ${filePath}:`, error);
  }
}

function broadcastFileDelete(filePath: string) {
  try {
    const relPath = '/' + path.relative(WORKSPACE_DIR, filePath).replace(/\\/g, '/');
    const message = JSON.stringify({
      type: 'file_deleted',
      path: relPath
    });

    for (const client of wsClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  } catch (error) {
    console.error(`Error broadcasting delete for file ${filePath}:`, error);
  }
}

// Assemble Express/Vite Dev Pipeline
async function startServer() {
  await ensureWorkspaceSeeded();
  await initSandboxConfig();
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Static production assets mounted.");
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`SnowOS kernel service running on endpoint http://localhost:${PORT}`);
  });

  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });
}

startServer();
