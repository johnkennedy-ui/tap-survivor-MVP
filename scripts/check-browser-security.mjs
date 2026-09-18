import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const failures = [];
const expectedDirectives = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self'",
  "media-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
];
const uiSources = [
  "src/modules/run-lifecycle.js",
  "src/modules/ui-progression.js",
  "src/modules/shop.js",
  "src/modules/shell-relic-ui.js",
  "src/modules/run-ui.js",
  "src/modules/shell-ui-classic-adapter.js",
  "src/modules/level-up.js",
];
const forbiddenRuntimePatterns = [
  { name: "eval", pattern: /\beval\s*\(/ },
  { name: "new Function", pattern: /\bnew\s+Function\s*\(/ },
  { name: "document.write", pattern: /\bdocument\.write\s*\(/ },
  { name: "string setTimeout", pattern: /\bsetTimeout\s*\(\s*["'`]/ },
  { name: "string setInterval", pattern: /\bsetInterval\s*\(\s*["'`]/ },
  { name: "fetch", pattern: /\bfetch\s*\(/ },
  { name: "XMLHttpRequest", pattern: /\bXMLHttpRequest\b/ },
  { name: "WebSocket", pattern: /\bWebSocket\b/ },
  { name: "EventSource", pattern: /\bEventSource\b/ },
  { name: "sendBeacon", pattern: /\bnavigator\.sendBeacon\s*\(/ },
];

const indexHtml = readFileSync(join(root, "index.html"), "utf8");
const cspMatch = indexHtml.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?\s*>/i);
if (!cspMatch) {
  failures.push("index.html must contain a CSP meta tag");
} else {
  const policy = cspMatch[1];
  expectedDirectives.forEach((directive) => {
    if (!policy.includes(directive)) failures.push(`CSP missing ${directive}`);
  });
  ["unsafe-eval", "*", "http:", "https:", "data:", "blob:"].forEach((forbidden) => {
    if (policy.includes(forbidden)) failures.push(`CSP must not allow ${forbidden}`);
  });
  if (indexHtml.indexOf(cspMatch[0]) > indexHtml.indexOf("<link")) {
    failures.push("CSP meta tag must precede resource elements");
  }
}
if (!/<meta\s+name="referrer"\s+content="no-referrer"\s*\/?\s*>/i.test(indexHtml)) {
  failures.push("index.html must set no-referrer policy");
}

uiSources.forEach((relativePath) => {
  const source = readFileSync(join(root, relativePath), "utf8");
  if (/\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b/.test(source)) {
    failures.push(`${relativePath} contains an HTML execution sink`);
  }
});

forEachSourceFile(join(root, "src"), (path) => {
  const source = readFileSync(path, "utf8");
  forbiddenRuntimePatterns.forEach(({ name, pattern }) => {
    if (pattern.test(source)) failures.push(`${path.slice(root.length + 1)} contains ${name}`);
  });
});

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log("PASS CSP and referrer policy are restrictive");
console.log("PASS active UI modules use DOM/textContent rendering");
console.log("PASS application source has no dynamic-code or network primitives");

function forEachSourceFile(directory, visit) {
  readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return forEachSourceFile(path, visit);
    if (/\.(?:js|mjs)$/.test(entry.name)) visit(path);
  });
}
