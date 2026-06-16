import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const maxLineLength = 240;
const suspiciousAverageLineLength = 120;
const compressedSizeBytes = 2048;
const compressedLineCount = 3;

const scanRoots = ["src", "docs"];
const scanFiles = ["AGENTS.md", "README.md"];
const activeExtensions = new Set([".js", ".css", ".md"]);

const ignoredPaths = new Set([
  // Generated content bundle; rebuild from content/tap-survivor-content.json.
  "src/content.generated.js",
]);

const ignoredPrefixes = [
  // Generated/runtime/vendor/archive paths are not hand-maintained source.
  "www/",
  "android/",
  "node_modules/",
  "docs/tasks/",
];

function isIgnored(path) {
  return ignoredPaths.has(path) || ignoredPrefixes.some((prefix) => path.startsWith(prefix));
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

    if (entry.isFile() && activeExtensions.has(extensionOf(entry.name))) {
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
  const totalLineLength = lines.reduce((sum, line) => sum + line.length, 0);
  const averageLineLength = totalLineLength / lineCount;
  const failures = [];

  lines.forEach((line, index) => {
    if (line.length > maxLineLength) {
      failures.push(`line ${index + 1} is ${line.length} chars`);
    }
  });

  if (size > compressedSizeBytes && lineCount < compressedLineCount) {
    failures.push(`${size} bytes but only ${lineCount} lines`);
  }

  if (size > compressedSizeBytes && averageLineLength > suspiciousAverageLineLength) {
    failures.push(`average line length is ${averageLineLength.toFixed(1)} chars`);
  }

  return { failures, lineCount, path, size };
}

const files = [
  ...scanRoots.flatMap((dir) => collectFiles(dir)),
  ...scanFiles.filter((path) => !isIgnored(path)),
].sort();

const failed = files.map(inspectFile).filter((result) => result.failures.length);

console.log("# Tap Survivor Format Hygiene Check");
console.log(`- files scanned: ${files.length}`);
console.log(`- max line length: ${maxLineLength}`);

if (failed.length) {
  for (const result of failed) {
    console.error(`FAIL ${result.path} (${result.lineCount} lines, ${result.size} bytes)`);
    result.failures.forEach((failure) => console.error(`  - ${failure}`));
  }
  process.exit(1);
}

console.log("PASS active source/docs are readable");
