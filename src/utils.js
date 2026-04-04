const fsp = require("node:fs/promises");
const path = require("node:path");

const TEXT_EXTENSIONS = new Set([
  ".c", ".cpp", ".css", ".go", ".h", ".hpp", ".html", ".java", ".js", ".json",
  ".md", ".ps1", ".py", ".rb", ".rs", ".sh", ".sql", ".toml", ".ts", ".tsx",
  ".txt", ".yaml", ".yml",
]);

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "being", "but", "by",
  "can", "did", "do", "does", "for", "from", "get", "got", "had", "has",
  "have", "how", "i", "if", "in", "into", "is", "it", "its", "just", "let",
  "make", "me", "more", "my", "not", "now", "of", "on", "one", "or", "our",
  "out", "set", "so", "some", "step", "than", "that", "the", "then", "there",
  "this", "to", "up", "use", "us", "was", "we", "what", "when", "where",
  "which", "will", "with", "would", "you", "your",
]);

// Simple suffix rules for English lemmatization (handles -ing, -ed, -er, -tion, -s, -es, -ly)
const LEMMA_RULES = [
  [/ization$/, "ize"],
  [/ation$/, "ate"],
  [/ness$/, ""],
  [/ment$/, ""],
  [/ings$/, ""],
  [/ing$/, ""],
  [/tion$/, "te"],
  [/ated$/, "ate"],
  [/ed$/, ""],
  [/ers$/, "er"],
  [/ies$/, "y"],
  [/es$/, ""],
  [/ly$/, ""],
  [/s$/, ""],
];

function lemmatize(token) {
  if (token.length <= 4) return token;
  for (const [pattern, replacement] of LEMMA_RULES) {
    if (pattern.test(token)) {
      const stem = token.replace(pattern, replacement);
      if (stem.length >= 3) return stem;
    }
  }
  return token;
}

function ensureArray(val) {
  return Array.isArray(val) ? val : [];
}

function lowercaseFirst(str) {
  if (!str) return "";
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function compactContent(content) {
  if (!content) return "";
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .slice(0, 4500);
}

function toRelative(fullPath, root) {
  return path.relative(root, fullPath).replace(/\\/g, "/");
}

function roleToneText(role) {
  const tones = {
    Developer: "We'll keep the answer grounded in implementation details and verification.",
    Student: "We'll keep the explanation clear, layered, and easy to follow.",
    Analyst: "We'll separate the options, tradeoffs, and recommendation cleanly.",
    Mentor: "We'll keep the next move practical, sustainable, and easy to act on.",
    Executor: "We'll bias toward the fastest safe path to a concrete result.",
  };
  return tones[role] || "We'll turn the request into a clear next move.";
}

function fallbackReasonText(reason, error) {
  if (reason === "cloud_denied") return " (cloud access is off, so Snow is replying locally)";
  if (reason === "missing_api_key") return " (cloud access is on, but no Gemini key is configured)";
  if (reason === "gemini_unavailable") return ` (Gemini is unavailable right now: ${error?.message || "unknown error"})`;
  return "";
}

function tokenizeText(text) {
  const raw = String(text || "");

  // Step 1: split camelCase  (myFunctionName → my Function Name)
  const expanded = raw
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    // Step 2: split snake_case / kebab-case / dot.notation
    .replace(/[_\-.]+/g, " ");

  // Step 3: lowercase and split on non-alphanumeric boundaries
  const rawTokens = expanded
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);

  // Step 4: lemmatize then deduplicate, drop stopwords
  const seen = new Set();
  const result = [];
  for (const token of rawTokens) {
    const stem = lemmatize(token);
    if (stem.length >= 3 && !STOPWORDS.has(stem) && !seen.has(stem)) {
      seen.add(stem);
      result.push(stem);
    }
  }
  return result;
}

function topEntriesFromMap(map, limit = 5, labelTransform = (key) => key) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit)
    .map(([key, count]) => ({ label: labelTransform(key), count }));
}

function uniqueStrings(values, limit = values.length || 0) {
  const seen = new Set();
  const result = [];

  values.forEach((value) => {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  });

  return limit > 0 ? result.slice(0, limit) : result;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pickTopTokens(text, limit = 4) {
  const counts = new Map();
  tokenizeText(text).forEach((token) => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });
  return topEntriesFromMap(counts, limit).map((entry) => entry.label);
}

module.exports = {
  TEXT_EXTENSIONS,
  STOPWORDS,
  ensureArray,
  lowercaseFirst,
  capitalize,
  compactContent,
  toRelative,
  roleToneText,
  fallbackReasonText,
  lemmatize,
  tokenizeText,
  topEntriesFromMap,
  uniqueStrings,
  clamp,
  pickTopTokens,
};
