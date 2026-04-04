const {
  clamp,
  fallbackReasonText,
  lemmatize,
  lowercaseFirst,
  pickTopTokens,
  tokenizeText,
  uniqueStrings,
} = require("./utils");

const ROLE_GUIDANCE = {
  Developer: "Optimize for coding help, debugging, implementation flow, and concrete verification.",
  Student: "Optimize for simple explanations, layered learning, and confidence building.",
  Analyst: "Optimize for structured reasoning, comparison, and decision quality.",
  Mentor: "Optimize for guidance, prioritization, and sustainable progress.",
  Executor: "Optimize for momentum, decisiveness, and finishable actions.",
};

const FOCUS_GUIDANCE = {
  Explore: "Map the space, compare options, and reduce uncertainty before commitment.",
  Build: "Create a concrete output in the smallest useful slice.",
  Ship: "Reduce scope to a finishable result and emphasize readiness.",
  Learn: "Teach clearly, sequence concepts, and avoid overwhelming detail.",
  Debug: "Find the failure edge, isolate the root cause, and propose a narrow fix.",
};

const ROLE_KEYWORDS = {
  Developer: ["code", "build", "app", "api", "bug", "debug", "refactor", "fix", "implement", "deploy", "script", "project", "agent"],
  Student: ["learn", "explain", "teach", "beginner", "understand", "lesson", "practice", "study", "guide"],
  Analyst: ["analyze", "analysis", "compare", "tradeoff", "risk", "evaluate", "metrics", "review", "strategy"],
  Mentor: ["improve", "mentor", "coach", "step", "career", "habit", "roadmap", "sustainable", "advice"],
  Executor: ["do", "ship", "launch", "finish", "deliver", "execute", "asap", "urgent", "now"],
};

const FOCUS_KEYWORDS = {
  Explore: ["compare", "brainstorm", "explore", "idea", "option", "investigate", "research", "analyze"],
  Build: ["build", "create", "make", "implement", "prototype", "design", "feature"],
  Ship: ["ship", "launch", "release", "deliver", "finish", "production", "deploy"],
  Learn: ["learn", "explain", "teach", "understand", "tutorial", "lesson", "beginner"],
  Debug: ["debug", "fix", "error", "issue", "broken", "bug", "failing", "trace"],
};

const RISK_PATTERNS = [
  { match: /delete|remove|erase|purge|drop\b/, reason: "Potential destructive action detected." },
  { match: /overwrite|replace all|force\b/, reason: "Existing work could be overwritten." },
  { match: /deploy|release|ship to prod|production/, reason: "This affects release quality and should be double-checked." },
  { match: /secret|token|key|credential|password/, reason: "Sensitive data handling is involved." },
];

function buildCapabilityMatrix({ permissions, apiKeyConfigured }) {
  const localOnly = permissions.cloudAccess ? (apiKeyConfigured ? "Live" : "Waiting") : "Local";
  return [
    {
      name: "Adaptive role engine",
      state: "Live",
      detail: "Auto-switches between developer, student, analyst, mentor, and executor behavior.",
    },
    {
      name: "Focus mode director",
      state: "Live",
      detail: "Lets Snow operate in Explore, Build, Ship, Learn, or Debug mode.",
    },
    {
      name: "Mission pulse",
      state: "Live",
      detail: "Scores intent, urgency, complexity, autonomy, and confidence for every prompt.",
    },
    {
      name: "Prompt upgrade engine",
      state: "Live",
      detail: "Suggests sharper prompts you can rerun with one click.",
    },
    {
      name: "Alternative path planner",
      state: "Live",
      detail: "Generates a second strategy so the agent feels more like a strategist than a chatbot.",
    },
    {
      name: "Explainability trace",
      state: "Live",
      detail: "Explains why Snow chose a role, mode, and data scope.",
    },
    {
      name: "Workspace hotspot mapper",
      state: permissions.workspaceAccess ? "Live" : "Locked",
      detail: permissions.workspaceAccess
        ? "Surfaces the most active folders and file types in the workspace."
        : "Unlock by allowing workspace access in the privacy controls.",
    },
    {
      name: "Session pattern memory",
      state: permissions.rememberSession ? "Live" : "Off",
      detail: permissions.rememberSession
        ? "Detects repeated themes across recent prompts."
        : "Turn on local memory to unlock recurring-mission insights.",
    },
    {
      name: "Encrypted vault",
      state: permissions.encryptedStorage ? "Live" : "Off",
      detail: permissions.encryptedStorage
        ? "Protects saved session history with browser crypto."
        : "Local history is still available but not encrypted at rest.",
    },
    {
      name: "Cloud reasoning bridge",
      state: localOnly,
      detail: permissions.cloudAccess
        ? apiKeyConfigured
          ? "Google Gemini responses are available when you want deeper cloud reasoning."
          : "Cloud use is allowed, but an API key is still missing."
        : "Snow remains local-first until cloud access is explicitly allowed.",
    },
  ];
}

function resolveFocusMeta({ prompt, memory = [], focusPreference }) {
  if (focusPreference && focusPreference !== "auto") {
    return {
      focusMode: focusPreference,
      source: "locked",
      evidence: [`Pinned to ${focusPreference} mode.`],
    };
  }

  const rawScope = [prompt, ...memory.slice(0, 3).map((entry) => entry.prompt || "")]
    .join(" ")
    .toLowerCase();
  // Lemmatize every word in the scope so "building" hits "build", etc.
  const lemmaScope = rawScope
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .split(/\s+/)
    .map(lemmatize)
    .join(" ");

  const evidence = [];
  const scores = {
    Explore: 0,
    Build: 0,
    Ship: 0,
    Learn: 0,
    Debug: 0,
  };

  Object.entries(FOCUS_KEYWORDS).forEach(([focusMode, keywords]) => {
    keywords.forEach((keyword) => {
      if (scopeHasKeyword(lemmaScope, lemmatize(keyword)) || scopeHasKeyword(rawScope, keyword)) {
        scores[focusMode] += keyword.length >= 6 ? 3 : 2;
        if (evidence.length < 4) {
          evidence.push(`Matched "${keyword}" for ${focusMode.toLowerCase()} mode.`);
        }
      }
    });
  });

  if (/plan|roadmap|milestone|strategy/.test(lemmaScope)) scores.Explore += 2;
  if (/today|now|asap|urgent/.test(lemmaScope)) scores.Ship += 2;
  if (/error|fail|bug|fix/.test(lemmaScope)) scores.Debug += 2;

  const focusMode = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
    : "Build";

  return {
    focusMode,
    source: "adaptive",
    evidence: evidence.length ? evidence : ["No strong keyword signal was found, so Snow defaulted to build mode."],
  };
}

function resolveRoleMeta({ prompt, memory = [], rolePreference, focusMode }) {
  if (rolePreference && rolePreference !== "auto") {
    return {
      role: rolePreference,
      source: "locked",
      evidence: [`Pinned to ${rolePreference}.`],
    };
  }

  const rawScope = [prompt, ...memory.slice(0, 4).map((entry) => entry.prompt || "")]
    .join(" ")
    .toLowerCase();
  // Lemmatize so "implementing" hits "implement", "debugging" hits "debug", etc.
  const lemmaScope = rawScope
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .split(/\s+/)
    .map(lemmatize)
    .join(" ");

  const evidence = [];
  const scores = {
    Developer: 0,
    Student: 0,
    Analyst: 0,
    Mentor: 0,
    Executor: 0,
  };

  Object.entries(ROLE_KEYWORDS).forEach(([role, keywords]) => {
    keywords.forEach((keyword) => {
      if (scopeHasKeyword(lemmaScope, lemmatize(keyword)) || scopeHasKeyword(rawScope, keyword)) {
        scores[role] += keyword.length >= 6 ? 3 : 2;
        if (evidence.length < 5) {
          evidence.push(`Matched "${keyword}" for ${role.toLowerCase()} behavior.`);
        }
      }
    });
  });

  if (focusMode === "Learn") scores.Student += 4;
  if (focusMode === "Debug" || focusMode === "Build") scores.Developer += 3;
  if (focusMode === "Explore") scores.Analyst += 3;
  if (focusMode === "Ship") scores.Executor += 4;

  if (/step by step|guide me|help me improve/.test(lemmaScope)) scores.Mentor += 3;
  if (/analyz|compar|risk|tradeoff/.test(lemmaScope)) scores.Analyst += 2;
  if (/explain|teach|learn/.test(lemmaScope)) scores.Student += 2;
  if (/ship|finish|launch|deliver/.test(lemmaScope)) scores.Executor += 2;

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const role = ranked[0][1] > 0 ? ranked[0][0] : "Mentor";

  return {
    role,
    source: "adaptive",
    evidence: evidence.length ? evidence : ["No strong role lock-in was found, so Snow defaulted to mentor behavior."],
  };
}

function detectMode({ prompt, focusMode }) {
  const scope = String(prompt || "").toLowerCase();
  if (focusMode === "Learn") return "Snow Guide";
  if (focusMode === "Explore") {
    return /plan|roadmap|milestone|sequence|next step/.test(scope) ? "Snow Planner" : "Snow Thinker";
  }
  if (focusMode === "Ship") return "Snow Executor";
  if (focusMode === "Debug" || focusMode === "Build") return "Snow Builder";
  if (/plan|roadmap|milestone|sequence|next step/.test(scope)) return "Snow Planner";
  return "Snow Builder";
}

function detectRisk(prompt) {
  // Split camelCase (e.g. deleteRecord → delete Record) before scanning
  const scope = String(prompt || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .toLowerCase();
  const matches = RISK_PATTERNS.filter((entry) => entry.match.test(scope));

  if (!matches.length) {
    return { requiresConfirmation: false, reason: "" };
  }

  return {
    requiresConfirmation: true,
    reason: uniqueStrings(matches.map((entry) => entry.reason)).join(" "),
  };
}

function buildMissionProfile({ prompt, workspace, roleMeta, focusMeta }) {
  const scope = String(prompt || "").toLowerCase();
  const tokenCount = tokenizeText(prompt).length;
  const multiClause = (prompt.match(/,| and | then | after | also /gi) || []).length;
  const specificity = tokenCount + multiClause * 2 + (workspace?.access === "granted" ? 3 : 0);

  const urgency = /urgent|asap|now|today|immediately|quickly/.test(scope)
    ? "High"
    : /soon|next|priority|ship/.test(scope)
      ? "Medium"
      : "Calm";

  const complexityScore = tokenCount + multiClause * 3 + (/architecture|system|full|entire|end to end/.test(scope) ? 5 : 0);
  const complexity = complexityScore >= 20 ? "High" : complexityScore >= 12 ? "Medium" : "Focused";

  const autonomy = /do it|handle it|implement|build it|fix it|ship it/.test(scope)
    ? "Hands-on"
    : /guide|help me|step by step|show me/.test(scope)
      ? "Collaborative"
      : "Advisory";

  const confidenceIndex = clamp(
    specificity
      + (focusMeta.source === "locked" ? 2 : 0)
      + (roleMeta.source === "locked" ? 1 : 0),
    0,
    24
  );
  const confidence = confidenceIndex >= 16 ? "High" : confidenceIndex >= 10 ? "Medium" : "Emerging";

  const intent = buildIntentLabel(scope, focusMeta.focusMode);

  return {
    intent,
    focusMode: focusMeta.focusMode,
    urgency,
    complexity,
    autonomy,
    confidence,
  };
}

function buildIntentLabel(scope, focusMode) {
  if (focusMode === "Debug") return "Stabilize a failing or uncertain part of the system";
  if (focusMode === "Learn") return "Turn the task into a teachable, understandable path";
  if (focusMode === "Explore") return "Compare options before committing to one direction";
  if (focusMode === "Ship") return "Reduce the task to a finishable, delivery-ready outcome";
  if (/plan|roadmap|milestone/.test(scope)) return "Map the work into a calm, sequenced execution plan";
  return "Convert the request into a concrete buildable outcome";
}

function buildUnderstandingCopy({ prompt, permissions, workspace, roleMeta, focusMeta, missionProfile, playbook }) {
  const archetype = classifyQueryArchetype({ prompt, focusMeta, roleMeta });
  const opening = buildOpeningLine({ archetype, prompt });
  const guidance = buildGuidanceLine({ archetype, prompt, playbook });
  const context = buildContextLine({ archetype, permissions, workspace, focusMeta });

  return [opening, guidance, context].filter(Boolean).join("\n\n");
}

function classifyQueryArchetype({ prompt, focusMeta, roleMeta }) {
  const scope = String(prompt || "").trim().toLowerCase().replace(/\s+/g, " ");
  const tokenCount = tokenizeText(prompt).length;

  if (/^(hi|hello|hey|good morning|good afternoon|good evening|namaste|hola)\b(?:\s+agent\s+snow)?[!.?\s]*$/.test(scope)) {
    return "greeting";
  }

  if (tokenCount <= 3 && /\bhelp\b/.test(scope)) {
    return "vague_help";
  }

  if (/should i|i feel|i'm feeling|i am feeling|life|relationship|career|habit|anxious|stuck|confused|advice/.test(scope)) {
    return "personal";
  }

  if (focusMeta.focusMode === "Debug" || /error|bug|broken|failing|not working|issue|trace|stack|crash|debug|fix\b/.test(scope)) {
    return "troubleshooting";
  }

  if (/email|caption|proposal|essay|bio|copy|reply|message|cover letter|linkedin|tweet|post|draft|rewrite|reword/.test(scope)) {
    return "writing";
  }

  if (/story|poem|script|lyric|tagline|slogan|brainstorm|concept|brand name|creative|campaign/.test(scope)) {
    return "creative";
  }

  if (/strategy|roadmap|priorit|plan|go to market|business|growth|position|decision|tradeoff|opportunity/.test(scope)) {
    return "strategy";
  }

  if (/research|analy[sz]e|review|compare|summarize|summary|break down|explain/.test(scope) || focusMeta.focusMode === "Explore") {
    return "research";
  }

  if (
    roleMeta.role === "Developer"
    || focusMeta.focusMode === "Build"
    || /code|repo|project|app|api|function|component|frontend|backend|database|sql|json|react|node|python|javascript|typescript/.test(scope)
  ) {
    return "coding";
  }

  return tokenCount <= 5 ? "general" : "general_specific";
}

function buildOpeningLine({ archetype, prompt }) {
  const detailed = hasDetailedPrompt(prompt);
  const variants = {
    greeting: {
      general: "Hi. Bring me the problem, the idea, or the rough draft, and I'll help turn it into something clear, strong, and useful.",
    },
    vague_help: {
      general: "Tell me what you're trying to do, fix, create, or understand, and I'll help shape it into the clearest next move.",
    },
    coding: {
      detailed: "Let's turn this into a clean implementation path with the smallest useful first step.",
      general: "Show me the code, the error, or the target behavior, and I'll help turn it into a clean fix or a solid implementation path.",
    },
    troubleshooting: {
      detailed: "Let's isolate the failure, confirm the cause, and keep the fix narrow.",
      general: "Describe what should happen, what is happening instead, and any error details. I'll help pinpoint the fault line fast.",
    },
    writing: {
      detailed: "Let's shape this into something sharper, clearer, and more deliberate.",
      general: "Send the draft, audience, or tone you want, and I'll help shape it into something sharp, clear, and memorable.",
    },
    strategy: {
      detailed: "Let's make the decision clearer before we make it bigger.",
      general: "Give me the goal, constraints, and tradeoffs that matter, and I'll help you choose the strongest path.",
    },
    creative: {
      detailed: "Let's make it distinct, intentional, and worth remembering.",
      general: "Bring the rough idea, mood, or purpose, and I'll help turn it into something distinct rather than generic.",
    },
    personal: {
      detailed: "Let's slow this down and get to the clearest, most honest next move.",
      general: "Tell me what's going on and what feels unclear, and I'll help you think it through honestly and calmly.",
    },
    research: {
      detailed: "Let's break this down into the key question, the evidence, and the strongest conclusion.",
      general: "Ask the question directly or drop the material here, and I'll break it down into a clear, useful answer.",
    },
    general: {
      general: "You don't need perfect wording. Give me the rough version, and I'll help make it clear, strong, and actionable.",
    },
    general_specific: {
      detailed: "Let's turn this into something clear, useful, and well thought through.",
      general: "You don't need perfect wording. Give me the rough version, and I'll help make it clear, strong, and actionable.",
    },
  };

  const selected = variants[archetype] || variants.general_specific;
  return detailed ? (selected.detailed || selected.general) : selected.general;
}

function buildGuidanceLine({ archetype, prompt, playbook }) {
  if (archetype === "greeting") {
    return "I can help you build, fix, write, plan, or pressure-test the next move.";
  }

  if (archetype === "vague_help") {
    return "If the thought is still rough, send it rough. I'll help turn it into something clear and actionable.";
  }

  const customFirstMoves = {
    writing: "Lock the audience, intent, and tone before polishing the wording.",
    strategy: "Separate the outcome, constraints, and tradeoffs before choosing a direction.",
    creative: "Lock the mood, purpose, and edge so the idea does not drift into something generic.",
    personal: "Clarify what the real decision is and what pressure is distorting it.",
    research: "Define the core question and separate evidence from assumption before concluding.",
  };

  const firstMove = customFirstMoves[archetype] || playbook?.plan?.[0] || "";
  return firstMove ? `First move: ${firstMove}` : "";
}

function buildContextLine({ archetype, permissions, workspace, focusMeta }) {
  const technical = archetype === "coding"
    || archetype === "troubleshooting"
    || focusMeta.focusMode === "Build"
    || focusMeta.focusMode === "Debug";

  if (!technical) return "";

  if (permissions.workspaceAccess && workspace?.access === "granted") {
    return "I'll keep it grounded in the current workspace rather than answer in the abstract.";
  }

  return "If you want file-level guidance, turn on workspace access and I'll anchor the answer to the actual project.";
}

function hasDetailedPrompt(prompt) {
  const text = String(prompt || "").trim();
  return tokenizeText(text).length >= 6 || text.length >= 48 || /[,;:]/.test(text);
}

function buildHeuristicResponse({ prompt, memory = [], workspace, permissions, roleMeta, focusMeta, reason, error }) {
  const mode = detectMode({ prompt, focusMode: focusMeta.focusMode });
  const risk = detectRisk(prompt);
  const missionProfile = buildMissionProfile({ prompt, workspace, roleMeta, focusMeta });
  const workspaceLabel = workspace?.hotspots?.[0]?.label || "the current workspace";
  const fileTypeLabel = workspace?.fileTypes?.[0]?.label || "local files";
  const searchTerm = escapeSearchPattern(pickTopTokens(prompt, 1)[0] || focusMeta.focusMode.toLowerCase());
  const locationHint = workspace?.hotspots?.[0]?.label && workspace.hotspots[0].label !== "root"
    ? workspace.hotspots[0].label
    : ".";
  const privacySummary = buildPrivacySummary({ permissions, workspace, reason, error });
  const sessionInsight = buildSessionInsight(memory, focusMeta);
  const playbook = buildFocusPlaybook({
    prompt,
    memory,
    workspace,
    permissions,
    roleMeta,
    focusMeta,
    missionProfile,
    risk,
  });

  return {
    mode,
    understanding: buildUnderstandingCopy({
      prompt,
      permissions,
      workspace,
      roleMeta,
      focusMeta,
      missionProfile,
      playbook,
    }),
    plan: playbook.plan,
    action: playbook.action,
    commands: permissions.workspaceAccess
      ? [
          "# Preview only",
          `rg -n "${searchTerm}" ${locationHint}`,
          `# Focus: ${focusMeta.focusMode} | Role: ${roleMeta.role}`,
        ]
      : [
          "# Preview only",
          `# Focus: ${focusMeta.focusMode} | Role: ${roleMeta.role}`,
          "# Enable workspace access if you want grounded local file analysis.",
        ],
    suggestions: playbook.suggestions,
    requiresConfirmation: risk.requiresConfirmation,
    confirmationReason: risk.reason,
    followUp: playbook.followUp,
    missionProfile,
    successCriteria: playbook.successCriteria,
    risks: uniqueStrings([
      ...playbook.risks,
      !permissions.workspaceAccess ? "Snow is operating without local files, so the plan stays more generic." : "",
      permissions.cloudAccess ? "" : "Cloud reasoning is disabled, so the reply stays on the local planning engine.",
      risk.reason,
    ], 4),
    checkpoints: playbook.checkpoints,
    artifacts: uniqueStrings([
      ...playbook.artifacts,
      permissions.workspaceAccess ? `A workspace-grounded path anchored around ${workspaceLabel}.` : "A prompt-only guidance path.",
      `A ${fileTypeLabel}-aware execution lens.`,
    ], 4),
    promptUpgrades: buildPromptUpgrades(prompt, workspace, focusMeta, roleMeta),
    alternativePath: buildAlternativePath({ prompt, workspace, focusMeta, roleMeta }),
    explainability: uniqueStrings([
      `Role: ${roleMeta.role} (${roleMeta.source}) because ${roleMeta.evidence[0].toLowerCase()}`,
      `Focus: ${focusMeta.focusMode} (${focusMeta.source}) because ${focusMeta.evidence[0].toLowerCase()}`,
      `Mode: ${mode} because Snow maps ${focusMeta.focusMode.toLowerCase()} work into ${mode.replace("Snow ", "").toLowerCase()} behavior.`,
      `Data scope: ${privacySummary}`,
      workspace?.profile ? `Workspace signal: ${workspace.profile}` : "",
    ], 5),
    sessionInsight,
  };
}

function buildFocusPlaybook({ prompt, workspace, permissions, roleMeta, focusMeta, missionProfile, risk }) {
  const workspaceAnchor = workspace?.hotspots?.[0]?.label || "the current project";
  const hasWorkspace = permissions.workspaceAccess && workspace?.access === "granted";

  const playbooks = {
    Explore: {
      plan: [
        `Frame the decision around the outcome hidden inside "${truncatePrompt(prompt)}".`,
        hasWorkspace
          ? `Inspect ${workspaceAnchor} to see which option fits the existing codebase best.`
          : "Separate assumptions from facts before choosing a direction.",
        "Compare two or three viable paths, then recommend the calmest one.",
      ],
      action: [
        "Keep the first pass comparative instead of overcommitting too early.",
        hasWorkspace ? `Use workspace clues from ${workspaceAnchor} as tie-breakers.` : "Stay prompt-first until local context is allowed.",
      ],
      suggestions: [
        "Ask Snow to score two options against speed, risk, and maintainability.",
        "Turn the chosen option into a build plan right after the comparison.",
      ],
      successCriteria: [
        "The viable options are clearly separated.",
        "A recommended path is justified with tradeoffs.",
        "The next concrete move is obvious.",
      ],
      risks: [
        "Broad prompts can create too many options and slow decision quality.",
        "Choosing without local constraints may produce abstract guidance.",
      ],
      checkpoints: [
        "Now: define the decision and constraints.",
        "Next: compare options and expose tradeoffs.",
        "Then: commit to one path and convert it into execution.",
      ],
      artifacts: [
        "Option matrix",
        "Decision memo",
        "Recommended next move",
      ],
      followUp: "Compare the top two approaches and tell me which one you recommend for this agent.",
    },
    Build: {
      plan: [
        `Translate "${truncatePrompt(prompt)}" into the smallest shippable slice.`,
        hasWorkspace
          ? `Use ${workspaceAnchor} as the first implementation zone.`
          : "Define the interfaces and success shape before touching code.",
        "Pair the change with a lightweight verification step.",
      ],
      action: [
        "Bias toward a thin vertical slice instead of a broad rewrite.",
        hasWorkspace ? "Ground the solution in existing files and patterns." : "Keep the implementation path generic until file access is allowed.",
      ],
      suggestions: [
        "Ask Snow for the first patch instead of the whole system at once.",
        "Request a verification checklist after the implementation outline.",
      ],
      successCriteria: [
        "A concrete feature slice is defined.",
        "The next edit target is identified.",
        "Verification is planned before expansion.",
      ],
      risks: [
        "Scope can balloon if the first slice is not constrained.",
        "Implementation speed may hide verification gaps.",
      ],
      checkpoints: [
        "Now: define the smallest useful outcome.",
        "Next: implement the first bounded slice.",
        "Then: verify, refine, and expand only if needed.",
      ],
      artifacts: [
        "Implementation brief",
        "Target file shortlist",
        "Verification checklist",
      ],
      followUp: "Take the strongest idea and break it into the first implementation slice for this agent.",
    },
    Ship: {
      plan: [
        "Strip the mission down to the outcome that can actually be delivered next.",
        hasWorkspace
          ? `Check ${workspaceAnchor} for the final polish or missing handoff step.`
          : "Define the release boundary before adding anything else.",
        "Create a finish checklist that protects quality without slowing momentum.",
      ],
      action: [
        "Prefer removal of optional scope over adding more features late.",
        risk.requiresConfirmation
          ? "Keep any risky operation behind an explicit approval gate."
          : "Treat the current task as delivery-focused, not exploratory.",
      ],
      suggestions: [
        "Ask Snow for a release checklist and cut list.",
        "Request the fastest safe path to a demo-ready version.",
      ],
      successCriteria: [
        "The deliverable is narrow and finishable.",
        "Quality gates are clear.",
        "The next ship decision is explicit.",
      ],
      risks: [
        "Late-stage scope creep can dilute the finish line.",
        "Rushing delivery may skip verification or handoff clarity.",
      ],
      checkpoints: [
        "Now: define the exact thing being shipped.",
        "Next: remove optional scope and confirm quality gates.",
        "Then: prepare handoff, demo, or deployment notes.",
      ],
      artifacts: [
        "Release checklist",
        "Cut list",
        "Demo brief",
      ],
      followUp: "Reduce this to a finishable shipping checklist for Agent Snow.",
    },
    Learn: {
      plan: [
        "Reframe the task into concepts, not just steps.",
        hasWorkspace
          ? `Use ${workspaceAnchor} as the teaching anchor so the lesson stays grounded.`
          : "Teach the core idea without assuming hidden project context.",
        "End with a small exercise or self-check to lock the idea in.",
      ],
      action: [
        "Prefer simpler explanations before advanced detail.",
        "Turn jargon into concrete examples whenever possible.",
      ],
      suggestions: [
        "Ask Snow to explain the same topic at beginner or intermediate depth.",
        "Request a quiz, exercise, or recap after the explanation.",
      ],
      successCriteria: [
        "The core idea is understandable in plain language.",
        "The explanation is grounded in an example.",
        "There is a practice step or recap.",
      ],
      risks: [
        "Dense explanations can overwhelm the user.",
        "Without examples, the lesson may stay abstract.",
      ],
      checkpoints: [
        "Now: explain the concept clearly.",
        "Next: connect it to the project or a concrete example.",
        "Then: test understanding with one exercise.",
      ],
      artifacts: [
        "Plain-language explanation",
        "Worked example",
        "Practice prompt",
      ],
      followUp: "Teach me the next concept I need for this agent and give me one exercise.",
    },
    Debug: {
      plan: [
        "Isolate the failing behavior or uncertainty before proposing a fix.",
        hasWorkspace
          ? `Trace the likely fault line inside ${workspaceAnchor}.`
          : "Capture the reproduction steps and boundary conditions first.",
        "Propose the smallest change that removes the failure without widening risk.",
      ],
      action: [
        "Treat reproduction and root cause as separate steps.",
        hasWorkspace ? "Stay narrow and patch only the proven failure edge." : "Avoid speculative fixes until more context appears.",
      ],
      suggestions: [
        "Ask Snow for a root-cause checklist before the patch.",
        "Request regression risks and verification steps with the fix.",
      ],
      successCriteria: [
        "The likely root cause is identified.",
        "The fix stays minimal and targeted.",
        "A regression check is included.",
      ],
      risks: [
        "Changing multiple things at once can hide the real cause.",
        "Missing reproduction details can create false confidence.",
      ],
      checkpoints: [
        "Now: define the failing behavior and how to reproduce it.",
        "Next: isolate the fault line and propose a minimal fix.",
        "Then: verify the fix and check nearby regressions.",
      ],
      artifacts: [
        "Root-cause note",
        "Minimal fix plan",
        "Regression checklist",
      ],
      followUp: "Trace the likely root cause in this agent and show the smallest safe fix path.",
    },
  };

  return playbooks[focusMeta.focusMode] || playbooks.Build;
}

function buildPromptUpgrades(prompt, workspace, focusMeta, roleMeta) {
  const workspaceUpgrade = workspace?.access === "granted"
    ? "Use the current workspace files as evidence."
    : "Stay local-first and explain what extra context would sharpen the answer.";

  return uniqueStrings([
    appendInstruction(prompt, "Also define success criteria in three bullets."),
    appendInstruction(prompt, workspaceUpgrade),
    appendInstruction(prompt, "Give me a fast path, a safe path, and recommend one."),
    appendInstruction(
      prompt,
      `Stay in ${focusMeta.focusMode.toLowerCase()} mode and answer like ${withArticle(roleMeta.role.toLowerCase())} companion.`
    ),
  ], 4);
}

function buildAlternativePath({ prompt, workspace, focusMeta }) {
  const workspaceAnchor = workspace?.hotspots?.[0]?.label || "the current project";

  if (focusMeta.focusMode === "Build" || focusMeta.focusMode === "Debug") {
    return {
      title: "Alternative: prototype or patch in a narrower slice first",
      summary: `Instead of tackling the whole mission at once, test the idea inside ${workspaceAnchor} so the next move stays reversible.`,
      steps: [
        "Choose one visible slice instead of the whole system.",
        "Validate the slice with a quick verification step.",
        "Expand only after the first slice behaves correctly.",
      ],
    };
  }

  if (focusMeta.focusMode === "Ship") {
    return {
      title: "Alternative: ship a thinner version sooner",
      summary: "Reduce polish or optional features and aim for a tighter, demonstrable release boundary.",
      steps: [
        "Mark optional work explicitly.",
        "Define the smallest demo-ready package.",
        "Prepare handoff notes before adding more scope.",
      ],
    };
  }

  if (focusMeta.focusMode === "Learn") {
    return {
      title: "Alternative: learn by reverse engineering the current agent",
      summary: `Use ${workspaceAnchor} as the textbook instead of learning the topic in the abstract.`,
      steps: [
        "Pick one file or subsystem as the lesson anchor.",
        "Explain what it does in plain language.",
        "Turn that explanation into one exercise or recap.",
      ],
    };
  }

  return {
    title: "Alternative: compare two options before committing",
    summary: `Use "${truncatePrompt(prompt)}" as a decision prompt and score the best two paths against risk, speed, and flexibility.`,
    steps: [
      "Capture two strong options.",
      "Score them against the real constraints.",
      "Choose one and convert it into execution steps.",
    ],
  };
}

function buildPrivacySummary({ permissions, workspace, reason, error }) {
  const pieces = [];

  if (permissions.workspaceAccess && workspace?.access === "granted") {
    const fileCount = workspace.fileSnippets?.length || 0;
    pieces.push(`Prompt + workspace access (${fileCount} relevant file excerpt${fileCount === 1 ? "" : "s"})`);
  } else {
    pieces.push("Prompt only");
  }

  pieces.push(permissions.cloudAccess ? "cloud allowed" : "local only");
  if (reason) {
    pieces.push(`fallback${fallbackReasonText(reason, error)}`.trim());
  }

  return pieces.join(" | ");
}

function buildSessionInsight(memory = [], focusMeta) {
  if (!memory.length) {
    return "No recurring mission trail yet. After a few prompts Snow will start surfacing patterns in what you repeatedly ask it to do.";
  }

  const tokenCounts = new Map();
  memory.forEach((entry) => {
    tokenizeText(entry.prompt || "").forEach((token) => {
      tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
    });
  });

  const repeaters = Array.from(tokenCounts.entries())
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([token]) => token);

  if (!repeaters.length) {
    return `Recent prompts are still broad, so Snow is leaning on ${focusMeta.focusMode.toLowerCase()} mode rather than a stronger recurring pattern.`;
  }

  return `Your recent prompts cluster around ${repeaters.join(", ")}. Snow can use that pattern to keep the next response tighter and more consistent.`;
}

function escapeSearchPattern(value) {
  return String(value || "snow").replace(/"/g, '\\"');
}

function withArticle(value) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return "";
  return /^[aeiou]/i.test(cleaned) ? `an ${cleaned}` : `a ${cleaned}`;
}

function appendInstruction(prompt, addition) {
  const trimmedPrompt = String(prompt || "").trim().replace(/\s+$/, "");
  const suffix = /[.!?]$/.test(trimmedPrompt) ? "" : ".";
  return `${trimmedPrompt}${suffix} ${addition}`.trim();
}

function scopeHasKeyword(scope, keyword) {
  if (/^[a-z0-9]+$/.test(keyword)) {
    return new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i").test(scope);
  }

  return scope.includes(keyword.toLowerCase());
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function truncatePrompt(prompt) {
  const trimmed = String(prompt || "").trim();
  if (trimmed.length <= 74) return trimmed;
  return `${trimmed.slice(0, 71)}...`;
}

module.exports = {
  ROLE_GUIDANCE,
  FOCUS_GUIDANCE,
  buildCapabilityMatrix,
  buildHeuristicResponse,
  buildPrivacySummary,
  detectMode,
  resolveFocusMeta,
  resolveRoleMeta,
};
