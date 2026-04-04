const fsp = require("node:fs/promises");
const path = require("node:path");
const { TEXT_EXTENSIONS, toRelative, compactContent, topEntriesFromMap } = require("./utils");

const EXCLUDED_DIRS = new Set([
  ".git", ".next", ".turbo", "build", "coverage", "dist", "node_modules",
]);

async function getWorkspaceSnapshot(root) {
  const entries = [];
  let fileCount = 0;
  const hotspotCounts = new Map();
  const fileTypeCounts = new Map();
  const diagnostics = [];

  async function walk(currentDir, depth) {
    if (depth > 6) return;

    try {
      const dirEntries = await fsp.readdir(currentDir, { withFileTypes: true });
      dirEntries.sort((a, b) => a.name.localeCompare(b.name));

      for (const entry of dirEntries) {
        if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;
        if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) continue;

        const fullPath = path.join(currentDir, entry.name);
        const relativePath = toRelative(fullPath, root);

        if (entry.isDirectory()) {
          if (entries.length < 18) {
            entries.push(`${"  ".repeat(depth)}${relativePath}/`);
          }
          await walk(fullPath, depth + 1);
        } else {
          fileCount += 1;
          const segments = relativePath.split("/");
          const hotspot = segments.length > 1 ? segments[0] : "root";
          const extension = path.extname(entry.name).toLowerCase() || "(none)";
          hotspotCounts.set(hotspot, (hotspotCounts.get(hotspot) || 0) + 1);
          fileTypeCounts.set(extension, (fileTypeCounts.get(extension) || 0) + 1);

          if (entries.length < 18) {
            entries.push(`${"  ".repeat(depth)}${relativePath}`);
          }
        }
      }
    } catch (e) {
      const msg = `[workspace] Could not read "${toRelative(currentDir, root) || "."}" — ${e.message}`;
      console.warn(msg);
      diagnostics.push(msg);
    }
  }

  await walk(root, 0);

  const hotspots = topEntriesFromMap(hotspotCounts, 4);
  const fileTypes = topEntriesFromMap(fileTypeCounts, 5, (key) => (key === "(none)" ? "no extension" : key));
  const profile = buildWorkspaceProfile(fileCount, hotspots, fileTypes);

  return { root, fileCount, entries, hotspots, fileTypes, profile, diagnostics };
}

async function getRelevantFileSnippets(root, prompt, maxFiles = 4) {
  const files = [];

  async function walk(currentDir, depth) {
    if (depth > 6 || files.length >= 120) return;

    try {
      const dirEntries = await fsp.readdir(currentDir, { withFileTypes: true });

      for (const entry of dirEntries) {
        if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;
        if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) continue;

        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath, depth + 1);
        } else if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
          files.push(fullPath);
        }
      }
    } catch (e) {
      console.warn(`[workspace] Could not read "${toRelative(currentDir, root) || "."}" during snippet scan — ${e.message}`);
    }
  }

  await walk(root, 0);

  const tokens = new Set(
    prompt
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3)
  );

  const selected = files
    .map((filePath) => {
      const relative = toRelative(filePath, root).toLowerCase();
      let score = 0;

      tokens.forEach((token) => {
        if (relative.includes(token)) score += token.length;
      });

      if (relative.endsWith("readme.md")) score += 2;

      return { filePath, score };
    })
    .sort((a, b) => b.score - a.score || a.filePath.localeCompare(b.filePath))
    .filter((item, index) => item.score > 0 || index < maxFiles)
    .slice(0, maxFiles);

  const snippets = [];
  for (const item of selected) {
    try {
      const content = await fsp.readFile(item.filePath, "utf8");
      snippets.push({
        path: toRelative(item.filePath, root),
        content: compactContent(content),
      });
    } catch (e) {
      console.warn(`[workspace] Could not read file "${toRelative(item.filePath, root)}" — ${e.message}`);
    }
  }

  return snippets;
}

module.exports = {
  getWorkspaceSnapshot,
  getRelevantFileSnippets,
};

function buildWorkspaceProfile(fileCount, hotspots, fileTypes) {
  if (!fileCount) {
    return "No readable workspace files were found.";
  }

  const hotspotLabel = hotspots[0] ? `${hotspots[0].label} leads with ${hotspots[0].count} files` : "no dominant folder yet";
  const fileTypeLabel = fileTypes[0] ? `${fileTypes[0].label} is the strongest file signal` : "file types are mixed";
  return `${fileCount} readable files detected. ${hotspotLabel}. ${fileTypeLabel}.`;
}
