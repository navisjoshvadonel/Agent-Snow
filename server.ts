/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

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

// REST Endpoint: Get System Metrics
app.get('/api/snow-agent/metrics', (req, res) => {
  // Simulate active system logs with dynamic seed variation
  const cpu = Math.floor(15 + Math.random() * 25); // 15-40% baseline
  const memory = Math.floor(40 + Math.random() * 10); // 40-50%
  const disk = 28; // 28% static usage
  const network = Math.floor(20 + Math.random() * 150); // in kbps
  
  res.json({
    metrics: { cpu, memory, disk, network, timestamp: Date.now() },
    status: {
      health: cpu > 85 ? 'Degraded' : 'Healthy',
      uptime: formatUptime(process.uptime()),
      activeProcesses: 18 + Math.floor(cpu / 10),
      portsBlocked: false,
      securityCoreStatus: 'Armed'
    }
  });
});

// Full-featured conversational task engine
app.post('/api/snow-agent/chat', async (req, res) => {
  const { message, history, userModel, memoryCore, virtualFiles, modelName, thinkingEnabled, thinkingLevel } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: "Missing prompt input message" });
  }

  // --- INTERPOLATE OFFLINE sandbox heuristics if Gemini client is unavailable ---
  if (!ai) {
    const response = handleOfflineSandbox(message, userModel, virtualFiles);
    return res.json(response);
  }

  // Choose the requested model or default based on thinking mode / request
  // Use gemini-3.1-pro-preview as requested if high thinking is enabled or explicitly requested
  let activeModel = modelName || "gemini-3.5-flash";
  const isHighThinking = thinkingEnabled || thinkingLevel === "HIGH" || modelName === "gemini-3.1-pro-preview-thinking";

  if (isHighThinking) {
    activeModel = "gemini-3.1-pro-preview";
  }

  try {
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

    // Configure run parameters
    const runConfig: any = {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json"
    };

    if (isHighThinking && activeModel === "gemini-3.1-pro-preview") {
      runConfig.thinkingConfig = {
        thinkingLevel: ThinkingLevel.HIGH
      };
      // Do NOT set maxOutputTokens!
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
    console.error(`Gemini runtime error using model ${activeModel}, falling back to offline planner:`, error);
    const fallbackResponse = handleOfflineSandbox(message, userModel, virtualFiles);
    // Include a little notice in the message
    fallbackResponse.message = `[Sandboxed Core] ${fallbackResponse.message}`;
    res.json(fallbackResponse);
  }
});

// High Quality Gemini Voice Text-to-Speech Endpoint
app.post('/api/snow-agent/tts', async (req, res) => {
  const { text, voice } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: "Missing text input for voice synthesis" });
  }

  if (!ai) {
    return res.status(503).json({ error: "Gemini AI core offline. Real-time synthesis unavailable." });
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
            prebuiltVoiceConfig: { voiceName: voice || 'Zephyr' }, // Prebuilt voice options: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
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
    console.error("Gemini TTS synthesis failed:", error);
    return res.status(500).json({ error: error.message || "Synthesis pipeline failed" });
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

  // --- INTERPOLATE OFFLINE sandbox heuristics if Gemini client is unavailable ---
  if (!ai) {
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

  // Choose the requested model or default based on thinking mode / request
  let activeModel = modelName || "gemini-3.5-flash";
  const isHighThinking = thinkingEnabled || thinkingLevel === "HIGH" || modelName === "gemini-3.1-pro-preview-thinking";

  if (isHighThinking) {
    activeModel = "gemini-3.1-pro-preview";
  }

  let promptText = "";
  let systemInstruction = "";

  if (operation === "analyze") {
    systemInstruction = `You are a Senior Systems Architect and Security Code Auditor.
Provide a comprehensive, high-quality, professional markdown analysis of the user's code.
Focus on:
1. Architectural Layout & Cleanliness
2. Performance & Memory Bottlenecks (e.g. infinite loops, unoptimized searches, file I/O delays)
3. Direct Security Vulnerabilities (e.g. credential leaks, raw command injection)
4. Concrete actionable advice.
Maintain a professional, helpful, objective tone. Do not use unrequired technical jargon.`;

    promptText = `Please analyze the file named "${name || 'untitled'}" at path "${path || '/'}" with the following contents:
\`\`\`
${content}
\`\`\`
`;
  } else if (operation === "optimize") {
    systemInstruction = `You are a Senior Software Performance Engineer.
Optimize and refactor the user's code.
Your output MUST be a valid JSON with the following schema:
{
  "explanation": "Markdown description of modifications made, performance or clean-code benefits, and actionable insights.",
  "optimizedCode": "The complete, optimized, updated version of the code file. Keep variable naming consistent with the original unless it violates clear standards."
}`;

    promptText = `Please optimize, refactor and clean the file named "${name || 'untitled'}" at path "${path || '/'}" with the following contents:
\`\`\`
${content}
\`\`\``;
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
      // Do NOT set maxOutputTokens!
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
    console.error(`AI Operation ${operation} failed:`, error);
    return res.status(500).json({ error: error.message || "Pipeline processor failed." });
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

// Assemble Express/Vite Dev Pipeline
async function startServer() {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SnowOS kernel service running on endpoint http://localhost:${PORT}`);
  });
}

startServer();
