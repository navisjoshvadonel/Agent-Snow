const SETTINGS_KEY = "agent-snow-settings";
const VAULT_KEY = "agent-snow-vault"; // Default vault
let currentVaultKey = VAULT_KEY;
const VAULT_SECRET_KEY = "agent-snow-vault-secret";
const DEFAULT_PROMPT = "Act as my coding mentor and help me improve this project step by step.";

const DEFAULT_SETTINGS = {
  themeMode: "night",
  rolePreference: "auto",
  focusMode: "auto",
  permissions: {
    workspaceAccess: false,
    cloudAccess: true,
    rememberSession: true,
    encryptedStorage: true,
  },
};

const modeDetails = {
  "Snow Guide": "Snow Guide is active because the request benefits from teaching, clarity, or onboarding support.",
  "Snow Builder": "Snow Builder is active because the request points toward implementation, debugging, or concrete output.",
  "Snow Thinker": "Snow Thinker is active because the request needs comparison, strategy, or deeper decision quality.",
  "Snow Planner": "Snow Planner is active because the next best move is to map the work into clear steps and milestones.",
  "Snow Executor": "Snow Executor is active because the request is ready for a finishable, outcome-focused push.",
};

const modeColors = {
  "Snow Guide": { background: "rgba(35, 104, 209, 0.12)", color: "#2368d1" },
  "Snow Builder": { background: "rgba(17, 126, 128, 0.12)", color: "#117e80" },
  "Snow Thinker": { background: "rgba(181, 106, 22, 0.12)", color: "#b56a16" },
  "Snow Planner": { background: "rgba(61, 94, 210, 0.12)", color: "#3d5ed2" },
  "Snow Executor": { background: "rgba(114, 185, 78, 0.16)", color: "#4f8d2f" },
};

const focusNotes = {
  auto: "Auto mode lets Snow detect whether this mission is best treated as Explore, Build, Ship, Learn, or Debug.",
  Explore: "Explore mode compares options, maps tradeoffs, and delays commitment until the path is clearer.",
  Build: "Build mode aims for the smallest useful implementation slice with a verification path.",
  Ship: "Ship mode narrows the scope to the next finishable outcome and protects the release boundary.",
  Learn: "Learn mode teaches clearly, layers concepts, and adds an exercise or recap.",
  Debug: "Debug mode isolates failures, traces root causes, and prefers minimal safe fixes.",
};

const state = {
  settings: loadSettings(),
  nickname: localStorage.getItem("agent-snow-nickname") || null,
  history: [],
  audit: [],
  runtime: null,
  effectiveTheme: "night",
  lastMeta: null,
  lastResponse: null,
};

// ── Selectors ──────────────────────────────────────────────────
const taskForm          = document.querySelector("#task-form");
const taskInput         = document.querySelector("#task-input");
const submitButton      = document.querySelector("#submit-button");
const clearMemoryButton = document.querySelector("#clear-memory");
const bootScreen        = document.querySelector("#boot-screen");
const bootMessage       = document.querySelector("#boot-message");
const loadingOverlay    = document.querySelector("#loading-overlay");
const loadingText       = document.querySelector("#loading-text");
const chatHistory       = document.querySelector("#chat-history");
const runtimeWarning    = document.querySelector("#runtime-warning");
const ambientSnowLayer  = document.querySelector("#ambient-snow");
const bootSnowLayer     = document.querySelector("#boot-snow");
// Hidden backend slots
const memoryList        = document.querySelector("#memory-list");
const auditList         = document.querySelector("#audit-list");
const workspaceList     = document.querySelector("#workspace-list");
const hotspotList       = document.querySelector("#hotspot-list");
const filetypeList      = document.querySelector("#filetype-list");
const capabilityList    = document.querySelector("#capability-list");
const workspaceProfile  = document.querySelector("#workspace-profile");
const memoryCount       = document.querySelector("#memory-count");
const engineLabel       = document.querySelector("#engine-label");
const apiKeyStatus      = document.querySelector("#api-key-status");
const modelStatus       = document.querySelector("#model-status");
const reasoningStatus   = document.querySelector("#reasoning-status");
const workspaceRoot     = document.querySelector("#workspace-root");
const runtimeNote       = document.querySelector("#runtime-note");
const runtimeCommand    = document.querySelector("#runtime-command");
const themeLabel        = document.querySelector("#theme-label");
const activeRoleLabel   = document.querySelector("#active-role-label");
const activeFocusLabel  = document.querySelector("#active-focus-label");
const themeNote         = document.querySelector("#theme-note");
const roleNote          = document.querySelector("#role-note");
const focusNote         = document.querySelector("#focus-note");
const privacyNote       = document.querySelector("#privacy-note");
const sourcePill        = document.querySelector("#source-pill");
const confirmationState = document.querySelector("#confirmation-state");
const workspacePermission = document.querySelector("#workspace-permission");
const cloudPermission   = document.querySelector("#cloud-permission");
const memoryPermission  = document.querySelector("#memory-permission");
const vaultPermission   = document.querySelector("#vault-permission");
// Hidden bg chips (still needed for renderControls active-class logic)
const themeButtons      = Array.from(document.querySelectorAll("[data-theme-mode]"));
const roleButtons       = Array.from(document.querySelectorAll("[data-role]"));
const focusButtons      = Array.from(document.querySelectorAll("[data-focus-mode]"));
const promptButtons     = Array.from(document.querySelectorAll("[data-prompt]"));
// New visible UI elements
const sidebar           = document.querySelector("#sidebar");
const sidebarHistory    = document.querySelector("#sidebar-history");
const settingsPanel     = document.querySelector("#settings-panel");
const topbarSourcePill  = document.querySelector("#topbar-source-pill");
const topbarModePill    = document.querySelector("#topbar-mode-pill");
const runtimeStatusDot  = document.querySelector("#runtime-status-dot");
const runtimeStatusLabel= document.querySelector("#runtime-status-label");
const modeStatusLabel   = document.querySelector("#mode-status-label");
// UI elements logic cleaned up.

// Settings panel info
const uiApiStatus       = document.querySelector("#ui-api-status");
const uiModel           = document.querySelector("#ui-model");
const uiEngine          = document.querySelector("#ui-engine");
const uiRoot            = document.querySelector("#ui-root");
const uiWorkspaceToggle = document.querySelector("#ui-workspace-toggle");
const uiCloudToggle     = document.querySelector("#ui-cloud-toggle");
const uiMemoryToggle    = document.querySelector("#ui-memory-toggle");
const uiVaultToggle     = document.querySelector("#ui-vault-toggle");

let motionSyncTimer;

// Init
if (taskInput) { taskInput.value = ""; }
boot();

async function boot() {
  syncMotionProfile();
  bindMotionProfile();
  primeBootSequence();
  renderAmbientEffects();
  bindControls();
  applyTheme();
  renderControls();
  await loadRuntime();
  renderUI();
  dismissBootScreen();
  // Check login
  const appShell = document.querySelector("#app-shell");
  const loginOverlay = document.querySelector("#login-overlay");
  setTimeout(() => {
    appShell.style.visibility = "visible";
    const storedUser = localStorage.getItem("agent-snow-user");
    if (storedUser) {
      const u = JSON.parse(storedUser);
      state.nickname = u.name;
      currentVaultKey = `agent-snow-vault-${u.sub || btoa(u.name)}`;
      if (loginOverlay) loginOverlay.classList.add("hidden");
      completeInitialization();
    } else {
      if (loginOverlay) loginOverlay.classList.remove("hidden");
    }
  }, 700); // Wait for boot screen animation
}

async function completeInitialization() {
  await hydrateVault();
  renderMemory();
  renderAudit();
  initializeGreeting();
}

function initializeGreeting() {
  if (chatHistory && !chatHistory.querySelector(".chat-message")) {
    setChatGreeting();
  } else if (chatHistory && chatHistory.children.length === 1 && chatHistory.querySelector('.welcome-message')) {
      setChatGreeting(); // Replace default greeting if needed
  }
}

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  let timeGreeting = "Good evening";
  if (hour < 12) timeGreeting = "Good morning";
  else if (hour < 18) timeGreeting = "Good afternoon";
  const name = state.nickname ? `, ${state.nickname}` : "";
  return `${timeGreeting}${name}. Bring me the problem, the idea, or the rough draft.`;
}

function setChatGreeting() {
  if (!chatHistory) return;
  chatHistory.innerHTML = `
    <div class="chat-message agent-message welcome-message">
      <div class="snow-logo-mark avatar" aria-hidden="true" style="animation: shimmer 3s infinite, scaleUpBlurIn 0.8s both;">S</div>
      <div class="message-content">
        <p class="welcome-greeting">${getTimeBasedGreeting()}</p>
        <p class="welcome-subcopy">I will help turn it into something clear, strong, and useful.</p>
        <div class="quick-actions">
          <button class="chip" type="button" data-prompt="Review this codebase like a strong engineering partner. Show me the biggest risks, the strongest parts, and the smartest next move." style="animation-delay: 0.1s; animation-fill-mode: both;">Code review</button>
          <button class="chip" type="button" data-prompt="Turn this idea into a sharp execution plan with milestones, tradeoffs, and the first concrete action." style="animation-delay: 0.2s; animation-fill-mode: both;">Execution plan</button>
          <button class="chip" type="button" data-prompt="Help me improve this project step by step as a thoughtful coding mentor, starting with the highest-leverage change." style="animation-delay: 0.3s; animation-fill-mode: both;">Build with me</button>
          <button class="chip" type="button" data-prompt="Trace the most likely fault line in this codebase and show me the smallest safe fix path." style="animation-delay: 0.4s; animation-fill-mode: both;">Debug path</button>
        </div>
      </div>
    </div>`;
  chatHistory.querySelectorAll("[data-prompt]").forEach(b => b.addEventListener("click", async () => {
    if (taskInput) { taskInput.value = b.dataset.prompt; await submitPrompt(); }
  }));
}

function bindMotionProfile() {
  const mediaQueries = [
    window.matchMedia("(prefers-reduced-motion: reduce)"),
    window.matchMedia("(pointer: coarse)"),
    window.matchMedia("(max-width: 900px)"),
  ];

  mediaQueries.forEach((query) => {
    const handler = () => handleMotionProfileChange();
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", handler);
    } else if (typeof query.addListener === "function") {
      query.addListener(handler);
    }
  });

  document.addEventListener("visibilitychange", () => {
    state.motionProfile = {
      ...state.motionProfile,
      paused: document.hidden,
    };
    applyMotionAttributes();
  });

  window.addEventListener(
    "resize",
    () => {
      window.clearTimeout(motionSyncTimer);
      motionSyncTimer = window.setTimeout(() => {
        handleMotionProfileChange();
      }, 140);
    },
    { passive: true }
  );
}

function handleMotionProfileChange() {
  const previousPreset = state.motionProfile?.snowPreset;
  syncMotionProfile();
  if (previousPreset !== state.motionProfile.snowPreset) {
    renderAmbientEffects();
  }
}

function syncMotionProfile() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const compact = window.matchMedia("(max-width: 900px)").matches;
  const lowPower = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4;

  state.motionProfile = {
    reduced,
    coarse,
    compact,
    lowPower,
    paused: document.hidden,
    snowPreset: reduced ? "minimal" : compact || coarse || lowPower ? "light" : "full",
  };
  applyMotionAttributes();
}

function applyMotionAttributes() {
  document.documentElement.dataset.motion = state.motionProfile?.reduced ? "reduced" : "full";
  document.documentElement.dataset.motionState = state.motionProfile?.paused ? "paused" : "running";
  document.documentElement.dataset.touch = state.motionProfile?.coarse ? "coarse" : "fine";
  document.documentElement.dataset.viewport = state.motionProfile?.compact ? "compact" : "wide";
}

function renderAmbientEffects() {
  createSnow(ambientSnowLayer, getSnowflakeCount(22, false), false);
  createSnow(bootSnowLayer, getSnowflakeCount(52, true), true);
}

function getSnowflakeCount(baseCount, isBoot) {
  // Always keep animation active and rich as requested
  return isBoot ? 40 : 25;
}

function bindControls() {
  // Form submit
  if (taskForm) {
    taskForm.addEventListener("submit", async (e) => { e.preventDefault(); await submitPrompt(); });
  }

  // Auto-grow textarea
  if (taskInput) {
    taskInput.addEventListener("input", () => {
      taskInput.style.height = "auto";
      taskInput.style.height = Math.min(taskInput.scrollHeight, 160) + "px";
    });
    taskInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); await submitPrompt(); }
    });
  }

  // Prompt chips
  promptButtons.forEach(b => b.addEventListener("click", async () => {
    if (taskInput) { taskInput.value = b.dataset.prompt; await submitPrompt(); }
  }));

  // Sidebar collapse
  const collapseBtn = document.querySelector("#sidebar-toggle");
  if (collapseBtn && sidebar) {
    collapseBtn.addEventListener("click", () => sidebar.classList.toggle("collapsed"));
  }
  const mobileMenuBtn = document.querySelector("#sidebar-toggle-mobile");
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener("click", () => sidebar.classList.toggle("mobile-open"));
  }
  // New session
  const newChatBtn = document.querySelector("#new-chat-btn");
  if (newChatBtn) {
    newChatBtn.addEventListener("click", () => {
      if (chatHistory) {
        setChatGreeting();
      }
      state.history = []; state.audit = []; persistVault();
      updateSidebarHistory();
    });
  }

  // Login form
  const loginForm = document.querySelector("#login-form");
  const nicknameInput = document.querySelector("#nickname-input");
  const loginOverlay = document.querySelector("#login-overlay");
  if (loginForm && nicknameInput) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = nicknameInput.value.trim();
      if (name) {
        state.nickname = name;
        currentVaultKey = `agent-snow-vault-${btoa(name)}`;
        localStorage.setItem("agent-snow-user", JSON.stringify({ name, sub: btoa(name) }));
        if (loginOverlay) loginOverlay.classList.add("hidden");
        completeInitialization();
      }
    });
  }

  // Settings panel open / close
  const settingsToggle = document.querySelector("#settings-toggle");
  const settingsClose  = document.querySelector("#settings-close");
  if (settingsToggle && settingsPanel) {
    settingsToggle.addEventListener("click", () => settingsPanel.classList.toggle("open"));
  }
  if (settingsClose && settingsPanel) {
    settingsClose.addEventListener("click", () => settingsPanel.classList.remove("open"));
  }

  // Settings panel refresh / clear
  const settingsRefresh = document.querySelector("#settings-refresh-runtime");
  if (settingsRefresh) settingsRefresh.addEventListener("click", () => loadRuntime());
  const settingsClear = document.querySelector("#settings-clear-memory");
  if (settingsClear) {
    settingsClear.addEventListener("click", async () => {
      state.history = []; state.audit = [];
      await persistVault();
      renderMemory(); renderAudit(); updateSidebarHistory();
      settingsPanel?.classList.remove("open");
    });
  }

  // Settings panel theme chips
  document.querySelectorAll("[data-theme-mode-ui]").forEach(btn => {
    btn.addEventListener("click", async () => {
      state.settings.themeMode = btn.dataset.themeModeUi;
      persistSettings(); applyTheme(); renderUI(); await loadRuntime();
    });
  });
  // Settings panel focus chips
  document.querySelectorAll("[data-focus-mode-ui]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.settings.focusMode = btn.dataset.focusModeUi;
      persistSettings(); renderUI();
    });
  });
  // Settings panel role chips
  document.querySelectorAll("[data-role-ui]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.settings.rolePreference = btn.dataset.roleUi;
      persistSettings(); renderUI();
    });
  });

  // Toggle switches
  if (uiWorkspaceToggle) {
    uiWorkspaceToggle.addEventListener("click", async () => {
      state.settings.permissions.workspaceAccess = !state.settings.permissions.workspaceAccess;
      if (workspacePermission) workspacePermission.checked = state.settings.permissions.workspaceAccess;
      persistSettings(); renderUI(); await loadRuntime();
    });
  }
  if (uiCloudToggle) {
    uiCloudToggle.addEventListener("click", async () => {
      state.settings.permissions.cloudAccess = !state.settings.permissions.cloudAccess;
      if (cloudPermission) cloudPermission.checked = state.settings.permissions.cloudAccess;
      persistSettings(); renderUI(); await loadRuntime();
    });
  }
  if (uiMemoryToggle) {
    uiMemoryToggle.addEventListener("click", async () => {
      state.settings.permissions.rememberSession = !state.settings.permissions.rememberSession;
      if (!state.settings.permissions.rememberSession) { state.history = []; state.audit = []; }
      if (memoryPermission) memoryPermission.checked = state.settings.permissions.rememberSession;
      persistSettings(); await persistVault(); renderMemory(); renderAudit(); renderUI();
    });
  }
  if (uiVaultToggle) {
    uiVaultToggle.addEventListener("click", async () => {
      state.settings.permissions.encryptedStorage = !state.settings.permissions.encryptedStorage;
      if (vaultPermission) vaultPermission.checked = state.settings.permissions.encryptedStorage;
      persistSettings(); await persistVault(); renderUI();
    });
  }

  if (bootScreen) bootScreen.addEventListener("click", () => bootScreen.classList.add("dismissed"));
}

async function hydrateVault() {
  if (!state.settings.permissions.rememberSession) {
    state.history = [];
    state.audit = [];
    return;
  }
  try {
    const raw = localStorage.getItem(currentVaultKey);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const payload = await decodeVault(parsed);
    state.history = Array.isArray(payload.history) ? payload.history : [];
    state.audit = Array.isArray(payload.audit) ? payload.audit : [];
    if (state.history[0]?.response) {
      state.lastMeta = state.history[0].meta || null;
      state.lastResponse = state.history[0].response || null;
      renderResponse(state.history[0].response, state.lastMeta);
    }
  } catch (error) {
    state.history = [];
    state.audit = [];
  }
}

async function persistVault() {
  if (!state.settings.permissions.rememberSession) {
    localStorage.removeItem(currentVaultKey);
    return;
  }
  const payload = {
    history: state.history.slice(0, 8),
    audit: state.audit.slice(0, 12),
  };
  const encoded = await encodeVault(payload);
  localStorage.setItem(currentVaultKey, JSON.stringify(encoded));
}

// ── renderUI: update all visible controls to reflect current state ──
function renderUI() {
  // Topbar badges
  const cloudAllowed = state.settings.permissions.cloudAccess;
  const apiReady = state.runtime?.apiKeyConfigured;
  if (topbarSourcePill) {
    topbarSourcePill.textContent = cloudAllowed ? (apiReady ? "Gemini" : "Cloud (no key)") : "Local-first";
  }
  if (topbarModePill) {
    const role = state.lastMeta?.role || state.settings.rolePreference;
    const focus = state.lastMeta?.focus || state.settings.focusMode;
    topbarModePill.textContent = (focus === "auto" ? "Auto" : focus) + " · " + (role === "auto" ? "Auto" : role);
  }
  // Sidebar status
  if (runtimeStatusDot) {
    runtimeStatusDot.className = "status-dot " + (state.runtime ? (apiReady && cloudAllowed ? "online" : "online") : "error");
  }
  if (runtimeStatusLabel) {
    runtimeStatusLabel.textContent = state.runtime ? (cloudAllowed && apiReady ? `Gemini · ${state.runtime.model}` : "Local Snow Engine") : "Server offline";
  }
  if (modeStatusLabel) {
    const f = state.settings.focusMode === "auto" ? "Auto" : state.settings.focusMode;
    const r = state.settings.rolePreference === "auto" ? "auto role" : state.settings.rolePreference;
    modeStatusLabel.textContent = `${f} · ${r}`;
  }
  // Settings panel toggle states
  if (uiWorkspaceToggle) uiWorkspaceToggle.classList.toggle("active", state.settings.permissions.workspaceAccess);
  if (uiCloudToggle)     uiCloudToggle.classList.toggle("active", state.settings.permissions.cloudAccess);
  if (uiMemoryToggle)    uiMemoryToggle.classList.toggle("active", state.settings.permissions.rememberSession);
  if (uiVaultToggle)     uiVaultToggle.classList.toggle("active", state.settings.permissions.encryptedStorage);
  // Settings panel runtime info
  if (uiApiStatus) { uiApiStatus.textContent = apiReady ? "✓ Configured" : "Missing"; uiApiStatus.style.color = apiReady ? "var(--success)" : "var(--danger)"; }
  if (uiModel)  uiModel.textContent  = state.runtime?.model  || "—";
  if (uiEngine) uiEngine.textContent = cloudAllowed ? (apiReady ? "Gemini" : "Local fallback") : "Local-only";
  if (uiRoot)   uiRoot.textContent   = state.runtime?.workspace?.root || "—";
  // Settings chips active state
  document.querySelectorAll("[data-theme-mode-ui]").forEach(b => b.classList.toggle("active", b.dataset.themeModeUi === state.settings.themeMode));
  document.querySelectorAll("[data-focus-mode-ui]").forEach(b => b.classList.toggle("active", b.dataset.focusModeUi === state.settings.focusMode));
  document.querySelectorAll("[data-role-ui]").forEach(b => b.classList.toggle("active", b.dataset.roleUi === state.settings.rolePreference));
  // Runtime warning
  if (runtimeWarning) {
    const warn = cloudAllowed && !apiReady;
    runtimeWarning.textContent = warn ? "Cloud access is enabled but GEMINI_API_KEY is not set, so Snow is running in local mode." : "";
    runtimeWarning.classList.toggle("hidden", !warn);
  }
  // Update sidebar history
  updateSidebarHistory();
}

function updateSidebarHistory() {
  if (!sidebarHistory) return;
  if (!state.history.length) {
    sidebarHistory.innerHTML = `<div class="sidebar-history-empty">Your conversations will appear here</div>`;
    return;
  }
  sidebarHistory.innerHTML = state.history.slice(0, 8).map((entry, i) => {
    const label = truncate(entry.prompt || "Session", 42);
    const mode = entry.mode ? `<span style="font-size:0.7rem;color:var(--text-faint)">${entry.mode}</span>` : "";
    return `<div class="sidebar-history-item ${i === 0 ? "active" : ""}" title="${entry.prompt}">${label}${mode ? "<br>" + mode : ""}</div>`;
  }).join("");
}

async function loadRuntime() {
  const params = new URLSearchParams({
    workspaceAccess: state.settings.permissions.workspaceAccess ? "1" : "0",
    cloudAccess: state.settings.permissions.cloudAccess ? "1" : "0",
    rememberSession: state.settings.permissions.rememberSession ? "1" : "0",
    encryptedStorage: state.settings.permissions.encryptedStorage ? "1" : "0",
  });
  try {
    const response = await fetch(`/api/status?${params.toString()}`);
    if (!response.ok) throw new Error(`Runtime request failed with ${response.status}`);
    state.runtime = await response.json();
    renderRuntime();
  } catch (error) {
    state.runtime = null;
    renderRuntimeError(error);
  }
}

async function submitPrompt() {
  const prompt = taskInput?.value.trim();
  if (!prompt) return;

  appendUserMessage(prompt);
  const focusLabel = state.settings.focusMode === "auto" ? "adaptive focus" : `${state.settings.focusMode.toLowerCase()} focus`;
  const loadingId = appendAgentLoading(focusLabel);
  setBusy(true);

  try {
    const response = await fetch("/api/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        rolePreference: state.settings.rolePreference,
        focusMode: state.settings.focusMode,
        permissions: state.settings.permissions,
        memory: state.settings.permissions.rememberSession ? state.history.slice(0, 6).map(e => ({ prompt: e.prompt, mode: e.mode, followUp: e.followUp })) : [],
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Request failed with ${response.status}`);

    state.runtime = payload.runtime;
    renderRuntime();
    renderUI();

    const meta = {
      source: payload.source,
      model: payload.model || state.runtime?.model || "",
      relevantFiles: payload.workspace.relevantFiles,
      role: payload.assistantRole,
      roleSource: payload.roleSource,
      focus: payload.assistantFocus,
      focusSource: payload.focusSource,
      privacy: payload.privacy,
    };

    state.lastMeta = meta;
    state.lastResponse = payload.response;
    document.getElementById(loadingId)?.remove();
    renderResponse(payload.response, meta);
    addAuditEntry(prompt, meta);

    if (state.settings.permissions.rememberSession) {
      state.history.unshift({ prompt, mode: payload.response.mode, followUp: payload.response.followUp, response: payload.response, meta, timestamp: new Date().toISOString() });
      state.history = state.history.slice(0, 8);
      await persistVault();
      renderMemory();
      renderAudit();
      updateSidebarHistory();
    }
  } catch (error) {
    document.getElementById(loadingId)?.remove();
    appendErrorMessage(error.message);
  } finally {
    setBusy(false);
  }
}

function appendUserMessage(text) {
  const container = document.createElement("div");
  container.className = "chat-message user-message";
  container.innerHTML = `<div class="user-avatar">US</div><div class="message-content">${text}</div>`;
  if (chatHistory) {
    chatHistory.appendChild(container);
    chatHistory.scrollTo(0, chatHistory.scrollHeight);
  }
  if (taskInput) taskInput.value = "";
}

function appendAgentLoading(focusLabel) {
  const id = "loading-" + Date.now();
  const container = document.createElement("div");
  container.className = "chat-message agent-message";
  container.id = id;
  container.innerHTML = `
    <div class="snow-logo-mark avatar" aria-hidden="true" style="animation: shimmer 3s infinite;">S</div>
    <div class="message-content" style="color: var(--text-dim); font-style: italic;">Agent Snow is thinking...</div>
  `;
  if (chatHistory) {
    chatHistory.appendChild(container);
    chatHistory.scrollTo(0, chatHistory.scrollHeight);
  }
  return id;
}

function appendErrorMessage(msg) {
  const container = document.createElement("div");
  container.className = "chat-message agent-message";
  container.innerHTML = `<div class="snow-logo-mark avatar" aria-hidden="true">S</div><div class="message-content" style="color: var(--danger)">⚠️ ${msg}</div>`;
  if (chatHistory) {
    chatHistory.appendChild(container);
    chatHistory.scrollTo(0, chatHistory.scrollHeight);
  }
}

function renderResponse(response, meta = {}) {
  state.lastResponse = response;
  const container = document.createElement("div");
  container.className = "chat-message agent-message";

  // Use marked.js for full markdown rendering, fallback to plain text
  const rawText = response.understanding || "I'm here! How can I help?";
  let formattedHtml;
  try {
    formattedHtml = typeof marked !== "undefined"
      ? marked.parse(rawText)
      : `<p>${rawText.replace(/\n/g, "<br>")}</p>`;
  } catch {
    formattedHtml = `<p>${rawText.replace(/\n/g, "<br>")}</p>`;
  }

  const coreMessage = `<div class="markdown-body">${formattedHtml}</div>`;

  // Source footer
  const isGemini = meta.source === "gemini";
  const footerHtml = `<div style="margin-top: 14px; font-size: 0.75rem; color: var(--text-faint); display:flex; gap:8px; align-items:center;">
    <span style="width:6px;height:6px;border-radius:50%;background:${isGemini ? 'var(--success)' : 'var(--warning)'};flex-shrink:0;"></span>
    <span>${isGemini ? '✦ Agent Snow · Gemini' : 'Local engine'}</span>
  </div>`;

  container.innerHTML = `<div class="snow-logo-mark avatar" aria-hidden="true">S</div><div class="message-content">${coreMessage}${footerHtml}</div>`;

  if (chatHistory) {
    chatHistory.appendChild(container);
    chatHistory.scrollTo(0, chatHistory.scrollHeight);
  }
  renderControls();
}

function renderRuntime() {
  if (!state.runtime) return;
  const apiReady = state.runtime.apiKeyConfigured;
  const cloudAllowed = state.settings.permissions.cloudAccess;
  if (engineLabel) engineLabel.textContent = cloudAllowed ? (apiReady ? "Gemini-backed" : "API key missing") : "Local-only";
  if (apiKeyStatus) { apiKeyStatus.textContent = apiReady ? "Configured" : "Missing"; apiKeyStatus.className = `info-value ${apiReady ? "success" : "warning"}`; }
  if (modelStatus) modelStatus.textContent = state.runtime.model;
  if (reasoningStatus) reasoningStatus.textContent = state.runtime.reasoningEffort;
  if (workspaceRoot) workspaceRoot.textContent = state.runtime.workspace.root;
  if (runtimeCommand) runtimeCommand.textContent = state.settings.permissions.cloudAccess ? '$env:GEMINI_API_KEY="YOUR_KEY"\nnpm start' : "npm start";
  if (runtimeNote) runtimeNote.textContent = buildRuntimeNote({ apiReady, cloudAllowed, workspaceAllowed: state.settings.permissions.workspaceAccess });
  if (runtimeWarning) { runtimeWarning.textContent = cloudAllowed && !apiReady ? "Cloud access is enabled, but no `GEMINI_API_KEY` is configured yet." : ""; runtimeWarning.classList.toggle("hidden", !(cloudAllowed && !apiReady)); }
  if (sourcePill) { sourcePill.textContent = cloudAllowed ? (apiReady ? `Gemini allowed | ${state.runtime.model}` : "Cloud allowed | key missing") : "Local-first mode"; sourcePill.className = `source-pill ${cloudAllowed && apiReady ? "ready" : "fallback"}`; }
  renderWorkspace(state.runtime.workspace);
  renderWorkspaceSignals(state.runtime.workspace || {});
  renderCapabilities(state.runtime.capabilities || []);
  renderControls();
}

function renderRuntimeError(error) {
  if (engineLabel) engineLabel.textContent = "Server offline";
  if (runtimeNote) runtimeNote.textContent = "The browser could not contact `/api/status`. Start the local Node server.";
  if (runtimeWarning) { runtimeWarning.textContent = `Runtime error: ${error.message}`; runtimeWarning.classList.remove("hidden"); }
  renderWorkspace({ access: "locked", entries: [] });
  renderCapabilities([]);
}

function renderControls() {
  themeButtons.forEach(b => b.classList.toggle("active", state.settings.themeMode === b.dataset.themeMode));
  roleButtons.forEach(b => b.classList.toggle("active", state.settings.rolePreference === b.dataset.role));
  focusButtons.forEach(b => b.classList.toggle("active", state.settings.focusMode === b.dataset.focusMode));
  if (workspacePermission) workspacePermission.checked = state.settings.permissions.workspaceAccess;
  if (cloudPermission) cloudPermission.checked = state.settings.permissions.cloudAccess;
  if (memoryPermission) memoryPermission.checked = state.settings.permissions.rememberSession;
  if (vaultPermission) vaultPermission.checked = state.settings.permissions.encryptedStorage;
  if (themeLabel) themeLabel.textContent = state.settings.themeMode === "auto" ? `Auto | ${capitalize(state.effectiveTheme)}` : capitalize(state.settings.themeMode);
  if (activeRoleLabel) activeRoleLabel.textContent = state.lastMeta?.role ? `${state.lastMeta.role} | ${state.lastMeta.roleSource}` : (state.settings.rolePreference === "auto" ? "Auto detect" : state.settings.rolePreference);
  if (activeFocusLabel) activeFocusLabel.textContent = state.lastMeta?.focus ? `${state.lastMeta.focus} | ${state.lastMeta.focusSource}` : (state.settings.focusMode === "auto" ? "Auto detect" : state.settings.focusMode);
  if (themeNote) themeNote.textContent = state.settings.themeMode === "auto" ? `Auto mode is using ${state.effectiveTheme} styling.` : `${capitalize(state.settings.themeMode)} mode is pinned.`;
  if (roleNote) roleNote.textContent = state.settings.rolePreference === "auto" ? "Auto mode infers role from prompt." : `${state.settings.rolePreference} mode is locked.`;
  if (focusNote) focusNote.textContent = focusNotes[state.settings.focusMode] || focusNotes.auto;
  if (privacyNote) privacyNote.textContent = buildPrivacyNote();
}

function renderWorkspace(workspace) {
  if (!workspaceList) return;
  workspaceList.innerHTML = "";
  if (!workspace || workspace.access === "locked") { appendEmptyState(workspaceList, "Workspace access is locked."); return; }
  if (!workspace.entries.length) { appendEmptyState(workspaceList, "No entries available."); return; }
  workspace.entries.forEach(e => { const li = document.createElement("li"); li.textContent = e; workspaceList.appendChild(li); });
}

function renderWorkspaceSignals(workspace) {
  if (workspaceProfile) workspaceProfile.textContent = workspace?.profile || "Workspace signals will appear here.";
  if (hotspotList) renderSignalList(hotspotList, workspace?.hotspots, "Hotspots unavailable.");
  if (filetypeList) renderSignalList(filetypeList, workspace?.fileTypes, "File types unavailable.");
}

function renderCapabilities(capabilities) {
  if (!capabilityList) return;
  capabilityList.innerHTML = "";
  if (!capabilities.length) { appendEmptyState(capabilityList, "Intelligence pending."); return; }
  capabilities.forEach(c => {
    const li = document.createElement("li"); li.className = "capability-item";
    li.innerHTML = `<div class="capability-head"><strong>${c.name}</strong><span class="capability-state ${c.state.toLowerCase()}">${c.state}</span></div><p>${c.detail}</p>`;
    capabilityList.appendChild(li);
  });
}

function renderMemory() {
  if (!memoryList) return;
  memoryList.innerHTML = "";
  if (!state.history.length) { appendEmptyState(memoryList, "No stored goals yet."); }
  else { state.history.forEach(e => { const li = document.createElement("li"); li.textContent = `${e.mode}: ${truncate(e.prompt, 88)}`; memoryList.appendChild(li); }); }
  if (memoryCount) memoryCount.textContent = `${state.history.length} goals tracked`;
}

function renderAudit() {
  if (!auditList) return;
  auditList.innerHTML = "";
  if (!state.audit.length) { appendEmptyState(auditList, "No audit events."); }
  else { state.audit.forEach(e => { const li = document.createElement("li"); li.textContent = e; auditList.appendChild(li); }); }
}

function renderSignalList(target, items, emptyText) {
  if (!target) return;
  target.innerHTML = "";
  if (!items?.length) { appendEmptyState(target, emptyText); return; }
  items.forEach(i => { const li = document.createElement("li"); li.textContent = `${i.label} - ${i.count}`; target.appendChild(li); });
}

function addAuditEntry(prompt, meta) {
  if (!state.settings.permissions.rememberSession) return;
  const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const files = meta.relevantFiles?.length ? meta.relevantFiles.join(", ") : "no files";
  state.audit.unshift(`${timestamp} | ${meta.role || "Auto"} | ${meta.focus || "Auto"} | ${labelForSource(meta.source)} | ${meta.privacy?.usedWorkspace ? files : "locked"} | ${truncate(prompt, 42)}`);
  state.audit = state.audit.slice(0, 12);
}

function setBusy(isBusy) {
  if (submitButton) {
    submitButton.disabled = isBusy;
    submitButton.innerHTML = isBusy ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>` : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
  }
  if (loadingOverlay) { loadingOverlay.classList.toggle("hidden", !isBusy); loadingOverlay.setAttribute("aria-hidden", isBusy ? "false" : "true"); }
  if (!isBusy && loadingText) loadingText.textContent = "Snow will guide you from now. Gathering the calmest path forward.";
}

function applyTheme() {
  const effective = "night";
  state.effectiveTheme = effective;
  document.documentElement.dataset.theme = effective;
}

function dismissBootScreen() {
  const delay = state.motionProfile?.reduced ? 400 : (state.motionProfile?.compact ? 3000 : 4200);
  window.setTimeout(() => { if (bootScreen) bootScreen.classList.add("dismissed"); }, delay);
}

function primeBootSequence() {
  if (state.motionProfile?.reduced) { if (bootMessage) bootMessage.textContent = "Snow will guide you from now."; return; }
  const steps = ["Snow will guide you from now.", "Preparing a calm, intelligent workspace.", "Aligning intent, privacy, and execution."];
  steps.forEach((m, i) => window.setTimeout(() => { if (bootMessage) bootMessage.textContent = m; }, i * 780));
}

function createSnow(container, count, isBoot) {
  if (!container) return;
  container.innerHTML = "";
  if (count <= 0) return;
  for (let i = 0; i < count; i++) {
    const f = document.createElement("span"); f.className = "snowflake";
    f.style.setProperty("--left", `${Math.random() * 100}%`);
    f.style.setProperty("--delay", `${Math.random() * (isBoot ? 5 : 12)}s`);
    f.style.setProperty("--size", `${(isBoot ? 4 : 3) + Math.random() * (isBoot ? 7 : 5)}px`);
    f.style.setProperty("--opacity", `${0.35 + Math.random() * 0.6}`);
    f.style.setProperty("--blur", `${Math.random() * (isBoot ? 1.5 : 0.8)}px`);
    f.style.setProperty("--fall-duration", `${8 + Math.random() * (isBoot ? 8 : 12)}s`);
    f.style.setProperty("--sway-duration", `${3 + Math.random() * 4}s`);
    container.appendChild(f);
  }
}

function buildRuntimeNote({ apiReady, cloudAllowed, workspaceAllowed }) {
  if (!cloudAllowed && !workspaceAllowed) return "Local-first mode is active.";
  if (cloudAllowed && apiReady && workspaceAllowed) return "Cloud and workspace access allowed.";
  if (cloudAllowed && !apiReady) return "Cloud allowed, API key missing.";
  return "Workspace allowed, cloud off.";
}

function buildPrivacyNote() {
  const p = state.settings.permissions;
  return `Local data first: ${p.workspaceAccess ? "workspace on" : "workspace off"}, ${p.cloudAccess ? "cloud on" : "cloud off"}, ${p.rememberSession ? "memory on" : "memory off"}.`;
}

function formatCommands(cmds) { return (!cmds || !cmds.length) ? "# No command preview" : cmds.join("\n"); }
function labelForSource(s) { return s === "gemini" ? "Gemini bridge" : (s === "local" || s === "fallback" ? "Local Snow Engine" : "Runtime pending"); }
function appendEmptyState(t, txt) { const li = document.createElement("li"); li.className = "memory-empty"; li.textContent = txt; t.appendChild(li); }
function truncate(v, l) { return v.length > l ? `${v.slice(0, l - 3)}...` : v; }
function capitalize(v) { return v.charAt(0).toUpperCase() + v.slice(1); }

function buildMissionBrief() {
  const r = state.lastResponse; const m = state.lastMeta || {};
  if (!r) return "No briefing available.";
  return [`Mode: ${r.mode}`, `Role: ${m.role || "Auto"}`, `Focus: ${m.focus || "Auto"}`, `Intent: ${r.missionProfile?.intent || "Unknown"}`, "", "Plan:", ...(r.plan || []).map((p, i) => `${i + 1}. ${p}`), "", "Follow-up: ${r.followUp}"].join("\n");
}

function loadSettings() {
  try {
    const p = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    const merged = { ...DEFAULT_SETTINGS, ...p, permissions: { ...DEFAULT_SETTINGS.permissions, ...(p?.permissions || {}) } };
    // Respect the saved cloud permission choice.
    return merged;
  } catch (e) { return structuredClone(DEFAULT_SETTINGS); }
}

function persistSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); }

function getUserInitials() {
  const name = String(state.nickname || "You").trim();
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return "YO";
  return parts.map((part) => (part[0] || "").toUpperCase()).join("").slice(0, 2) || "YO";
}

function renderUI() {
  const cloudAllowed = state.settings.permissions.cloudAccess;
  const apiReady = state.runtime?.apiKeyConfigured;

  if (topbarSourcePill) {
    topbarSourcePill.textContent = cloudAllowed ? (apiReady ? "Gemini" : "Cloud (no key)") : "Local-first";
  }

  if (topbarModePill) {
    const role = state.lastMeta?.role || state.settings.rolePreference;
    const focus = state.lastMeta?.focus || state.settings.focusMode;
    topbarModePill.textContent = `${focus === "auto" ? "Auto" : focus} | ${role === "auto" ? "Auto" : role}`;
  }

  if (runtimeStatusDot) {
    runtimeStatusDot.className = `status-dot ${state.runtime ? "online" : "error"}`;
  }

  if (runtimeStatusLabel) {
    runtimeStatusLabel.textContent = state.runtime
      ? (cloudAllowed && apiReady ? `Gemini | ${state.runtime.model}` : "Local Snow Engine")
      : "Server offline";
  }

  if (modeStatusLabel) {
    const focus = state.settings.focusMode === "auto" ? "Auto" : state.settings.focusMode;
    const role = state.settings.rolePreference === "auto" ? "auto role" : state.settings.rolePreference;
    modeStatusLabel.textContent = `${focus} | ${role}`;
  }

  if (uiWorkspaceToggle) uiWorkspaceToggle.classList.toggle("active", state.settings.permissions.workspaceAccess);
  if (uiCloudToggle) uiCloudToggle.classList.toggle("active", state.settings.permissions.cloudAccess);
  if (uiMemoryToggle) uiMemoryToggle.classList.toggle("active", state.settings.permissions.rememberSession);
  if (uiVaultToggle) uiVaultToggle.classList.toggle("active", state.settings.permissions.encryptedStorage);

  if (uiApiStatus) {
    uiApiStatus.textContent = apiReady ? "Configured" : "Missing";
    uiApiStatus.style.color = apiReady ? "var(--success)" : "var(--danger)";
  }
  if (uiModel) uiModel.textContent = state.runtime?.model || "-";
  if (uiEngine) uiEngine.textContent = cloudAllowed ? (apiReady ? "Gemini" : "Local fallback") : "Local-only";
  if (uiRoot) uiRoot.textContent = state.runtime?.workspace?.root || "-";

  document.querySelectorAll("[data-theme-mode-ui]").forEach((button) => {
    button.classList.toggle("active", button.dataset.themeModeUi === state.settings.themeMode);
  });
  document.querySelectorAll("[data-focus-mode-ui]").forEach((button) => {
    button.classList.toggle("active", button.dataset.focusModeUi === state.settings.focusMode);
  });
  document.querySelectorAll("[data-role-ui]").forEach((button) => {
    button.classList.toggle("active", button.dataset.roleUi === state.settings.rolePreference);
  });

  if (runtimeWarning) {
    const warn = cloudAllowed && !apiReady;
    runtimeWarning.textContent = warn
      ? "Cloud access is enabled but GEMINI_API_KEY is not set, so Snow is running in local mode."
      : "";
    runtimeWarning.classList.toggle("hidden", !warn);
  }

  updateSidebarHistory();
}

async function loadRuntime() {
  const params = new URLSearchParams({
    workspaceAccess: state.settings.permissions.workspaceAccess ? "1" : "0",
    cloudAccess: state.settings.permissions.cloudAccess ? "1" : "0",
    rememberSession: state.settings.permissions.rememberSession ? "1" : "0",
    encryptedStorage: state.settings.permissions.encryptedStorage ? "1" : "0",
  });

  try {
    const response = await fetch(`/api/status?${params.toString()}`);
    if (!response.ok) throw new Error(`Runtime request failed with ${response.status}`);
    state.runtime = await response.json();
    renderRuntime();
    renderUI();
  } catch (error) {
    state.runtime = null;
    renderRuntimeError(error);
    renderUI();
  }
}

async function submitPrompt() {
  const prompt = taskInput?.value.trim();
  if (!prompt) return;

  appendUserMessage(prompt);
  const focusLabel = state.settings.focusMode === "auto" ? "adaptive focus" : `${state.settings.focusMode.toLowerCase()} focus`;
  const loadingId = appendAgentLoading(focusLabel);
  setBusy(true);

  try {
    const response = await fetch("/api/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        rolePreference: state.settings.rolePreference,
        focusMode: state.settings.focusMode,
        permissions: state.settings.permissions,
        nickname: state.nickname,
        memory: state.settings.permissions.rememberSession
          ? state.history.slice(0, 6).map((entry) => ({
              prompt: entry.prompt,
              mode: entry.mode,
              followUp: entry.followUp,
            }))
          : [],
      }),
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Request failed with ${response.status}`);

    state.runtime = payload.runtime;
    renderRuntime();
    renderUI();

    const meta = {
      source: payload.source,
      model: payload.model || payload.runtime?.model || "",
      relevantFiles: payload.workspace.relevantFiles,
      role: payload.assistantRole,
      roleSource: payload.roleSource,
      focus: payload.assistantFocus,
      focusSource: payload.focusSource,
      privacy: payload.privacy,
    };

    state.lastMeta = meta;
    state.lastResponse = payload.response;
    document.getElementById(loadingId)?.remove();
    renderResponse(payload.response, meta);
    addAuditEntry(prompt, meta);

    if (state.settings.permissions.rememberSession) {
      state.history.unshift({
        prompt,
        mode: payload.response.mode,
        followUp: payload.response.followUp,
        response: payload.response,
        meta,
        timestamp: new Date().toISOString(),
      });
      state.history = state.history.slice(0, 8);
      await persistVault();
      renderMemory();
      renderAudit();
      updateSidebarHistory();
    }
  } catch (error) {
    document.getElementById(loadingId)?.remove();
    appendErrorMessage(error.message);
  } finally {
    setBusy(false);
  }
}

function appendUserMessage(text) {
  const container = document.createElement("div");
  container.className = "chat-message user-message";

  const avatar = document.createElement("div");
  avatar.className = "user-avatar";
  avatar.textContent = getUserInitials();

  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = text;

  container.append(avatar, content);

  if (chatHistory) {
    chatHistory.appendChild(container);
    chatHistory.scrollTo(0, chatHistory.scrollHeight);
  }
  if (taskInput) taskInput.value = "";
}

function appendErrorMessage(msg) {
  const container = document.createElement("div");
  container.className = "chat-message agent-message";
  container.innerHTML = `<div class="snow-logo-mark avatar" aria-hidden="true">S</div><div class="message-content" style="color: var(--danger)">Warning: ${msg}</div>`;
  if (chatHistory) {
    chatHistory.appendChild(container);
    chatHistory.scrollTo(0, chatHistory.scrollHeight);
  }
}

function renderResponse(response, meta = {}) {
  state.lastResponse = response;
  const container = document.createElement("div");
  container.className = "chat-message agent-message";

  const rawText = response.understanding || "I'm here! How can I help?";
  let formattedHtml;
  try {
    formattedHtml = typeof marked !== "undefined"
      ? marked.parse(rawText)
      : `<p>${rawText.replace(/\n/g, "<br>")}</p>`;
  } catch {
    formattedHtml = `<p>${rawText.replace(/\n/g, "<br>")}</p>`;
  }

  const isGemini = meta.source === "gemini";
  const providerLabel = isGemini ? `Agent Snow | ${meta.model || "Gemini"}` : "Local engine";
  const footerHtml = `<div style="margin-top: 14px; font-size: 0.75rem; color: var(--text-faint); display:flex; gap:8px; align-items:center;">
    <span style="width:6px;height:6px;border-radius:50%;background:${isGemini ? "var(--success)" : "var(--warning)"};flex-shrink:0;"></span>
    <span>${providerLabel}</span>
  </div>`;

  container.innerHTML = `<div class="snow-logo-mark avatar" aria-hidden="true">S</div><div class="message-content"><div class="markdown-body">${formattedHtml}</div>${footerHtml}</div>`;

  if (chatHistory) {
    chatHistory.appendChild(container);
    chatHistory.scrollTo(0, chatHistory.scrollHeight);
  }
  renderControls();
}

function buildMissionBrief() {
  const response = state.lastResponse;
  const meta = state.lastMeta || {};
  if (!response) return "No briefing available.";

  return [
    `Mode: ${response.mode}`,
    `Role: ${meta.role || "Auto"}`,
    `Focus: ${meta.focus || "Auto"}`,
    `Intent: ${response.missionProfile?.intent || "Unknown"}`,
    "",
    "Plan:",
    ...(response.plan || []).map((step, index) => `${index + 1}. ${step}`),
    "",
    `Follow-up: ${response.followUp}`,
  ].join("\n");
}

function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      permissions: {
        ...DEFAULT_SETTINGS.permissions,
        ...(parsed?.permissions || {}),
      },
    };
  } catch (error) {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

async function encodeVault(payload) {
  if (!state.settings.permissions.encryptedStorage || !window.crypto?.subtle) return { format: "plain", data: payload };
  const key = await getVaultCryptoKey(); const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return { format: "aes-gcm", iv: toBase64(iv), data: toBase64(new Uint8Array(encrypted)) };
}

async function decodeVault(payload) {
  if (!payload || payload.format === "plain") return payload?.data || { history: [], audit: [] };
  const key = await getVaultCryptoKey();
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(payload.iv) }, key, fromBase64(payload.data));
  return JSON.parse(new TextDecoder().decode(decrypted));
}

async function getVaultCryptoKey() {
  let s = localStorage.getItem(VAULT_SECRET_KEY);
  if (!s) { s = toBase64(crypto.getRandomValues(new Uint8Array(32))); localStorage.setItem(VAULT_SECRET_KEY, s); }
  return crypto.subtle.importKey("raw", fromBase64(s), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function toBase64(b) { let bin = ""; b.forEach(v => { bin += String.fromCharCode(v); }); return btoa(bin); }
function fromBase64(v) { const bin = atob(v); const b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; }
