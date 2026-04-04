require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("node:path");

const { callGemini, buildFallbackResponse } = require("./openai");
const {
  buildCapabilityMatrix,
  buildPrivacySummary,
  resolveFocusMeta,
  resolveRoleMeta,
} = require("./intelligence");
const { getWorkspaceSnapshot, getRelevantFileSnippets } = require("./workspace");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(PUBLIC));

const DEFAULT_PERMISSIONS = {
  workspaceAccess: false,
  cloudAccess: false,
  rememberSession: true,
  encryptedStorage: true,
};

app.get("/api/status", async (req, res) => {
  try {
    const permissions = {
      workspaceAccess: req.query.workspaceAccess === "1",
      cloudAccess: req.query.cloudAccess === "1",
      rememberSession: req.query.rememberSession !== "0",
      encryptedStorage: req.query.encryptedStorage !== "0",
    };

    const workspace = permissions.workspaceAccess
      ? await getWorkspaceSnapshot(ROOT)
      : {
          root: ROOT,
          fileCount: 0,
          entries: [],
          hotspots: [],
          fileTypes: [],
          profile: "Workspace access is locked.",
          access: "locked",
        };

    res.json({
      apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      model: process.env.AGENT_SNOW_MODEL || "gemini-1.5-flash",
      reasoningEffort: process.env.AGENT_SNOW_REASONING_EFFORT || "medium",
      security: { localFirst: true, permissionGate: true, encryptedVaultRecommended: true },
      permissions: { ...DEFAULT_PERMISSIONS, ...permissions },
      workspace,
      capabilities: buildCapabilityMatrix({
        permissions: { ...DEFAULT_PERMISSIONS, ...permissions },
        apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      }),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/respond", async (req, res) => {
  try {
    const { prompt, memory, rolePreference, focusMode, permissions, nickname } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required." });

    const normalizedReqPermissions = {
      workspaceAccess: Boolean(permissions?.workspaceAccess),
      cloudAccess: Boolean(permissions?.cloudAccess),
      rememberSession: Boolean(permissions?.rememberSession),
      encryptedStorage: Boolean(permissions?.encryptedStorage),
    };

    const focusMeta = resolveFocusMeta({ prompt, memory, focusPreference: focusMode });
    const roleMeta = resolveRoleMeta({
      prompt,
      memory,
      rolePreference,
      focusMode: focusMeta.focusMode,
    });

    const workspace = normalizedReqPermissions.workspaceAccess
      ? {
          ...(await getWorkspaceSnapshot(ROOT)),
          fileSnippets: await getRelevantFileSnippets(ROOT, prompt),
          access: "granted",
        }
      : {
          root: ROOT,
          fileCount: 0,
          entries: [],
          hotspots: [],
          fileTypes: [],
          profile: "Workspace access is locked.",
          access: "locked",
          fileSnippets: [],
        };

    const runtime = {
      apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      model: process.env.AGENT_SNOW_MODEL || "gemini-1.5-flash",
      reasoningEffort: process.env.AGENT_SNOW_REASONING_EFFORT || "medium",
      workspace,
      capabilities: buildCapabilityMatrix({
        permissions: { ...DEFAULT_PERMISSIONS, ...normalizedReqPermissions },
        apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      }),
    };

    let response;
    let source = "local";
    let fallbackReason = "";
    let fallbackError;

    if (normalizedReqPermissions.cloudAccess && process.env.GEMINI_API_KEY) {
      try {
        response = await callGemini({
          prompt,
          memory,
          workspace,
          roleMeta,
          focusMeta,
          permissions: normalizedReqPermissions,
          env: process.env,
          nickname,
        });
        source = "gemini";
      } catch (err) {
        response = buildFallbackResponse({
          prompt,
          memory,
          workspace,
          permissions: normalizedReqPermissions,
          roleMeta,
          focusMeta,
          reason: "gemini_unavailable",
          error: err,
        });
        source = "local";
        fallbackReason = "gemini_unavailable";
        fallbackError = err;
      }
    } else {
      const reason = normalizedReqPermissions.cloudAccess ? "missing_api_key" : "cloud_denied";
      response = buildFallbackResponse({
        prompt,
        memory,
        workspace,
        permissions: normalizedReqPermissions,
        roleMeta,
        focusMeta,
        reason,
      });
      fallbackReason = reason;
    }

    res.json({
      source,
      model: runtime.model,
      runtime,
      workspace: { ...workspace, relevantFiles: workspace.fileSnippets?.map(s => s.path) || [] },
      assistantRole: roleMeta.role,
      roleSource: roleMeta.source,
      assistantFocus: focusMeta.focusMode,
      focusSource: focusMeta.source,
      privacy: {
        usedWorkspace: normalizedReqPermissions.workspaceAccess,
        summary: buildPrivacySummary({
          permissions: normalizedReqPermissions,
          workspace,
          reason: source === "gemini" ? "" : fallbackReason,
          error: fallbackError,
        }),
      },
      response,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Agent Snow server running at http://localhost:${PORT}`);
});
