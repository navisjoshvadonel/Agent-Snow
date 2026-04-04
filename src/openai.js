const { buildHeuristicResponse } = require("./intelligence");

const DEFAULT_MODEL = "gemini-1.5-flash";
const MAX_JSON_OUTPUT_TOKENS = 2048;

const AGENT_SNOW_PROMPT = `You are Agent Snow, a world-class AI assistant powered by Google Gemini.

Personality:
- Warm, calm, and highly capable.
- Honest and precise. Never invent file details or runtime behavior.
- Adapt to the user's tone while staying professional and helpful.
- Prefer concise markdown that is easy to scan.
- Sound like a sharp human operator, not system text.

Operating rules:
- You are replying inside a structured agent runtime, not a plain chat window.
- Keep plans concrete, grounded, and finish-oriented.
- Only suggest shell commands that are safe preview or verification commands.
- Never suggest destructive commands unless the user explicitly asks for them.
- If the workspace context is partial, say so instead of guessing.
- Open by responding to the user's actual query, not by describing yourself.
- Never use filler such as "I'm ready to help", "I've optimized this response", or similar meta phrasing.
- For greetings or vague prompts, invite the next useful detail in elegant, confident language.
- For specific prompts, provide a meaningful answer immediately and include the clearest next move.
- Make replies feel distinct across coding, writing, strategy, creative, troubleshooting, and advisory requests.
- Mention cloud or permission state only when it materially changes the answer.
- Return only valid JSON that matches the requested response contract.`;

const GEMINI_SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
];

async function callGemini({
  prompt,
  memory,
  workspace,
  permissions,
  env,
  nickname,
  roleMeta,
  focusMeta,
}) {
  const baseline = buildHeuristicResponse({
    prompt,
    memory,
    workspace,
    permissions,
    roleMeta,
    focusMeta,
    reason: "",
  });

  const apiKey = env?.GEMINI_API_KEY;
  const model = env?.AGENT_SNOW_MODEL || DEFAULT_MODEL;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    systemInstruction: {
      parts: [
        {
          text: buildSystemInstruction({ nickname, workspace }),
        },
      ],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: buildUserMessage({
              prompt,
              memory,
              workspace,
              roleMeta,
              focusMeta,
              baseline,
            }),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: resolveTemperature(env?.AGENT_SNOW_REASONING_EFFORT),
      topP: 0.9,
      maxOutputTokens: MAX_JSON_OUTPUT_TOKENS,
      responseMimeType: "application/json",
    },
    safetySettings: GEMINI_SAFETY_SETTINGS,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  const payload = safeJsonParse(raw);

  if (!response.ok) {
    throw new Error(buildGeminiHttpError(response.status, payload, raw));
  }

  if (payload?.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the request: ${payload.promptFeedback.blockReason}.`);
  }

  const candidate = payload?.candidates?.[0];
  if (!candidate) {
    throw new Error("Gemini returned no candidates.");
  }

  if (candidate.finishReason === "SAFETY") {
    throw new Error("Gemini blocked the response for safety reasons. Please rephrase the request.");
  }

  const text = extractCandidateText(candidate);
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  const parsed = safeJsonParse(stripCodeFence(text));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ...baseline,
      understanding: text,
    };
  }

  return mergeStructuredResponse({ base: baseline, candidate: parsed });
}

function buildFallbackResponse({ prompt, memory, workspace, permissions, roleMeta, focusMeta, reason, error }) {
  return buildHeuristicResponse({ prompt, memory, workspace, permissions, roleMeta, focusMeta, reason, error });
}

function buildSystemInstruction({ nickname, workspace }) {
  const nameLine = nickname
    ? `The user's nickname is ${nickname}. Use it naturally when it helps.`
    : "";
  const workspaceLine = workspace?.access === "granted"
    ? `Workspace access is granted. Keep file references grounded in the provided workspace summary and snippets.`
    : "Workspace access is locked. Do not pretend you inspected files you were not shown.";

  return [AGENT_SNOW_PROMPT, nameLine, workspaceLine].filter(Boolean).join("\n\n");
}

function buildUserMessage({ prompt, memory, workspace, roleMeta, focusMeta, baseline }) {
  const memorySummary = summarizeMemory(memory);
  const workspaceSummary = summarizeWorkspace(workspace);
  const responseContract = {
    understanding: "string",
    promptUpgrades: ["string"],
    mode: "string",
    plan: ["string"],
    action: ["string"],
    commands: ["string"],
    suggestions: ["string"],
    requiresConfirmation: false,
    confirmationReason: "string",
    missionProfile: {
      intent: "string",
      focusMode: "string",
      urgency: "string",
      complexity: "string",
      autonomy: "string",
      confidence: "string",
    },
    risks: ["string"],
    checkpoints: ["string"],
    artifacts: ["string"],
    explainability: ["string"],
    sessionInsight: "string",
    alternativePath: {
      title: "string",
      summary: "string",
      steps: ["string"],
    },
    followUp: "string",
    successCriteria: ["string"],
  };

  return [
    "User request:",
    prompt,
    "",
    `Adaptive role: ${roleMeta?.role || "Mentor"} (${roleMeta?.source || "adaptive"})`,
    `Adaptive focus: ${focusMeta?.focusMode || "Build"} (${focusMeta?.source || "adaptive"})`,
    "",
    "Recent session context:",
    memorySummary,
    "",
    "Workspace context:",
    workspaceSummary,
    "",
    "Local planner draft to refine:",
    JSON.stringify(baseline, null, 2),
    "",
    "Return only JSON with this shape:",
    JSON.stringify(responseContract, null, 2),
    "",
    "Rules for the JSON:",
    "- Keep arrays concise, usually 2-4 items.",
    "- Keep `understanding` as the main user-facing markdown reply.",
    "- Make `understanding` feel premium, query-aware, and meaningfully useful.",
    "- Never make `understanding` sound like system copy or a status banner.",
    "- Do not say things like 'I'm ready to help' or 'I've optimized this response'.",
    "- For specific requests, answer directly and include the clearest next move.",
    "- For greetings or vague prompts, respond elegantly and invite the next useful detail.",
    "- Keep `mode` aligned with the task; prefer the existing Snow mode naming from the draft.",
    "- Keep `commands` limited to safe preview, inspection, or verification commands.",
    "- Preserve confirmation gating when risk is non-trivial.",
    "- Improve the local draft, do not throw away useful structure.",
  ].join("\n");
}

function summarizeMemory(memory = []) {
  if (!Array.isArray(memory) || !memory.length) {
    return "No saved session context.";
  }

  return memory
    .slice(0, 4)
    .map((entry, index) => {
      const prompt = oneLine(entry?.prompt || "No prior prompt recorded.");
      const mode = oneLine(entry?.mode || "Unknown mode");
      const followUp = oneLine(entry?.followUp || "No follow-up recorded.");
      return `${index + 1}. Prompt: ${prompt}\n   Mode: ${mode}\n   Follow-up: ${followUp}`;
    })
    .join("\n");
}

function summarizeWorkspace(workspace = {}) {
  if (workspace?.access !== "granted") {
    return "Workspace access is locked.";
  }

  const lines = [
    `Root: ${workspace.root || "unknown"}`,
    `Profile: ${workspace.profile || "No workspace profile available."}`,
  ];

  if (Array.isArray(workspace.hotspots) && workspace.hotspots.length) {
    lines.push(`Hotspots: ${workspace.hotspots.map((entry) => `${entry.label} (${entry.count})`).join(", ")}`);
  }

  if (Array.isArray(workspace.fileTypes) && workspace.fileTypes.length) {
    lines.push(`File types: ${workspace.fileTypes.map((entry) => `${entry.label} (${entry.count})`).join(", ")}`);
  }

  if (Array.isArray(workspace.fileSnippets) && workspace.fileSnippets.length) {
    lines.push("Relevant file excerpts:");
    workspace.fileSnippets.slice(0, 4).forEach((snippet) => {
      lines.push(`File: ${snippet.path}`);
      lines.push(truncateText(snippet.content, 1400));
    });
  }

  return lines.join("\n");
}

function resolveTemperature(reasoningEffort) {
  switch (String(reasoningEffort || "").toLowerCase()) {
    case "low":
      return 0.25;
    case "high":
      return 0.65;
    case "medium":
    default:
      return 0.45;
  }
}

function buildGeminiHttpError(status, payload, raw) {
  const message = payload?.error?.message || payload?.message || raw;
  const cleanMessage = oneLine(String(message || `Gemini API error: ${status}`)).slice(0, 240);
  return cleanMessage || `Gemini API error: ${status}`;
}

function extractCandidateText(candidate) {
  const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function mergeStructuredResponse({ base, candidate }) {
  const requiresConfirmation = typeof candidate.requiresConfirmation === "boolean"
    ? candidate.requiresConfirmation
    : base.requiresConfirmation;

  return {
    ...base,
    understanding: pickString(candidate.understanding, base.understanding),
    promptUpgrades: pickStringArray(candidate.promptUpgrades, base.promptUpgrades, 4),
    mode: pickString(candidate.mode, base.mode),
    plan: pickStringArray(candidate.plan, base.plan, 4),
    action: pickStringArray(candidate.action, base.action, 4),
    commands: pickStringArray(candidate.commands, base.commands, 4),
    suggestions: pickStringArray(candidate.suggestions, base.suggestions, 4),
    requiresConfirmation,
    confirmationReason: pickString(
      candidate.confirmationReason,
      requiresConfirmation ? base.confirmationReason : ""
    ),
    missionProfile: mergeMissionProfile(base.missionProfile, candidate.missionProfile),
    risks: pickStringArray(candidate.risks, base.risks, 4),
    checkpoints: pickStringArray(candidate.checkpoints, base.checkpoints, 4),
    artifacts: pickStringArray(candidate.artifacts, base.artifacts, 4),
    explainability: pickStringArray(candidate.explainability, base.explainability, 5),
    sessionInsight: pickString(candidate.sessionInsight, base.sessionInsight),
    alternativePath: mergeAlternativePath(base.alternativePath, candidate.alternativePath),
    followUp: pickString(candidate.followUp, base.followUp),
    successCriteria: pickStringArray(candidate.successCriteria, base.successCriteria, 4),
  };
}

function mergeMissionProfile(base = {}, candidate = {}) {
  return {
    intent: pickString(candidate?.intent, base.intent),
    focusMode: pickString(candidate?.focusMode, base.focusMode),
    urgency: pickString(candidate?.urgency, base.urgency),
    complexity: pickString(candidate?.complexity, base.complexity),
    autonomy: pickString(candidate?.autonomy, base.autonomy),
    confidence: pickString(candidate?.confidence, base.confidence),
  };
}

function mergeAlternativePath(base = {}, candidate = {}) {
  return {
    title: pickString(candidate?.title, base.title),
    summary: pickString(candidate?.summary, base.summary),
    steps: pickStringArray(candidate?.steps, base.steps, 4),
  };
}

function pickString(value, fallback = "") {
  const clean = typeof value === "string" ? value.trim() : "";
  return clean || fallback || "";
}

function pickStringArray(value, fallback = [], limit = 4) {
  const values = Array.isArray(value) ? value : fallback;
  return values
    .map((entry) => pickString(entry))
    .filter(Boolean)
    .slice(0, limit);
}

function truncateText(value, maxLength) {
  const clean = String(value || "").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 3)}...`;
}

function oneLine(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripCodeFence(value) {
  return String(value || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

module.exports = { callGemini, buildFallbackResponse };
