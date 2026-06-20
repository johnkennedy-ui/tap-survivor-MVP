import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const MAX_LINE_LENGTH = 240;
const COMPRESSED_SIZE_BYTES = 1024;
const COMPRESSED_LINE_COUNT = 10;

const SCAN_ROOTS = ["src", "scripts", "docs"];
const SCAN_FILES = ["AGENTS.md", "README.md", "package.json"];
const ACTIVE_EXTENSIONS = new Set([".js", ".css", ".mjs", ".md"]);

const IGNORED_PATHS = new Set([
  // Generated content bundle; rebuild from content/tap-survivor-content.json.
  "src/content.generated.js",
  // Package manager output; do not hand-format.
  "package-lock.json",
]);

const IGNORED_PREFIXES = [
  // Generated/runtime/vendor/archive paths are not hand-maintained source.
  "www/",
  "android/",
  "node_modules/",
  "docs/tasks/",
];

const LONG_LINE_ALLOWANCES = new Map([
  // Content tool JSON-string assertions are intentionally literal fixtures.
  ["scripts/build-content.mjs:15", "literal generated-content assertion"],
  ["scripts/content-check.mjs:9", "literal malformed-content fixture"],

  // Focused verifier help text keeps command examples together for readable output.
  ["scripts/verify-focus.mjs:31", "single-line usage text"],
  ["scripts/verify-focus.mjs:63", "single-line validation label"],
  ["scripts/verify-focus.mjs:64", "single-line validation label"],
  ["scripts/verify-focus.mjs:67", "single-line validation label"],
  ["scripts/verify-focus.mjs:75", "single-line validation label"],

  // MVP verifier assertions keep exact snippets beside their labels.
  ["scripts/verify-mvp.mjs:130", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:133", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:138", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:139", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:141", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:142", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:143", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:149", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:153", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:154", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:161", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:162", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:177", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:195", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:196", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:197", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:203", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:205", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:208", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:210", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:211", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:213", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:214", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:235", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:236", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:238", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:243", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:257", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:262", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:266", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:271", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:292", "exact snippet assertion"],
  ["scripts/verify-mvp.mjs:316", "exact snippet assertion"],
]);

function isIgnored(path) {
  return IGNORED_PATHS.has(path) || IGNORED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function extensionOf(path) {
  const match = path.match(/\.[^.]+$/);
  return match?.[0] || "";
}

function collectFiles(dir, files = []) {
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const absolute = join(root, dir, entry.name);
    const relativePath = relative(root, absolute);
    if (isIgnored(relativePath)) continue;

    if (entry.isDirectory()) {
      collectFiles(relativePath, files);
      continue;
    }

    if (entry.isFile() && ACTIVE_EXTENSIONS.has(extensionOf(entry.name))) {
      files.push(relativePath);
    }
  }
  return files;
}

function inspectFile(path) {
  const absolute = join(root, path);
  const size = statSync(absolute).size;
  const text = readFileSync(absolute, "utf8");
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  const lineCount = Math.max(lines.length, 1);
  const failures = [];
  const allowedLongLines = [];

  lines.forEach((line, index) => {
    if (line.length > MAX_LINE_LENGTH) {
      const allowanceKey = `${path}:${index + 1}`;
      const allowanceReason = LONG_LINE_ALLOWANCES.get(allowanceKey);
      if (allowanceReason) {
        allowedLongLines.push(`line ${index + 1} is ${line.length} chars: ${allowanceReason}`);
        return;
      }
      failures.push(`line ${index + 1} is ${line.length} chars`);
    }
  });

  if (size > COMPRESSED_SIZE_BYTES && lineCount < COMPRESSED_LINE_COUNT) {
    failures.push(`${size} bytes but only ${lineCount} lines`);
  }

  if (
    path.startsWith("docs/skills/") &&
    path.endsWith(".md") &&
    lineCount < COMPRESSED_LINE_COUNT
  ) {
    failures.push(`skill file has only ${lineCount} lines`);
  }

  return { allowedLongLines, failures, lineCount, path, size };
}

const files = [
  ...SCAN_ROOTS.flatMap((dir) => collectFiles(dir)),
  ...SCAN_FILES.filter((path) => !isIgnored(path)),
].sort();

const inspected = files.map(inspectFile);
const failed = inspected.filter((result) => result.failures.length);
const allowedLongLineCount = inspected.reduce(
  (count, result) => count + result.allowedLongLines.length,
  0
);

console.log("# Tap Survivor Format Hygiene Check");
console.log(`- files scanned: ${files.length}`);
console.log(`- max line length: ${MAX_LINE_LENGTH}`);
console.log(`- allowed long lines: ${allowedLongLineCount}`);

if (failed.length) {
  for (const result of failed) {
    console.error(`FAIL ${result.path} (${result.lineCount} lines, ${result.size} bytes)`);
    result.failures.forEach((failure) => console.error(`  - ${failure}`));
  }
  process.exit(1);
}

console.log("PASS active source/docs are readable");
