import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

const root = process.argv[2]
  ? resolve(process.argv[2])
  : fileURLToPath(new URL("..", import.meta.url));
const failures = [];
const expectedDirectives = new Map([
  ["default-src", ["'self'"]],
  ["script-src", ["'self'"]],
  ["style-src", ["'self'", "'unsafe-inline'"]],
  ["img-src", ["'self'"]],
  ["media-src", ["'self'"]],
  ["font-src", ["'self'"]],
  ["connect-src", ["'self'"]],
  ["object-src", ["'none'"]],
  ["base-uri", ["'none'"]],
  ["form-action", ["'none'"]],
]);
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
  { name: "Function constructor", pattern: /\b(?:new\s+)?Function\s*\(/ },
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
const cspMetaTags = (indexHtml.match(/<meta\b[^>]*>/gi) || []).filter(
  (tag) => readMetaAttribute(tag, "http-equiv")?.toLowerCase() === "content-security-policy"
);
if (cspMetaTags.length !== 1) {
  failures.push("index.html must contain exactly one CSP meta tag");
} else {
  const cspMetaTag = cspMetaTags[0];
  const policy = readMetaAttribute(cspMetaTag, "content");
  if (!policy) {
    failures.push("CSP meta tag must have a content value");
  } else {
    checkCsp(policy, failures);
  }
  if (indexHtml.indexOf(cspMetaTag) > indexHtml.indexOf("<link")) {
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

function readMetaAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

function checkCsp(policy, errors) {
  const actualDirectives = new Map();
  policy.split(";").forEach((rawDirective) => {
    const tokens = rawDirective.trim().split(/\s+/);
    if (!rawDirective.trim()) return;
    const [name, ...sources] = tokens;
    if (actualDirectives.has(name)) {
      errors.push(`CSP contains duplicate ${name} directive`);
      return;
    }
    actualDirectives.set(name, sources);
  });

  actualDirectives.forEach((sources, name) => {
    const expectedSources = expectedDirectives.get(name);
    if (!expectedSources) {
      errors.push(`CSP contains unapproved ${name} directive`);
      return;
    }
    if (!sameSourceSet(sources, expectedSources)) {
      errors.push(`CSP ${name} must exactly match approved sources`);
    }
  });
  expectedDirectives.forEach((expectedSources, name) => {
    if (!actualDirectives.has(name)) errors.push(`CSP missing ${name}`);
  });
}

function sameSourceSet(actual, expected) {
  return actual.length === expected.length && actual.every((source) => expected.includes(source));
}

function forEachSourceFile(directory, visit) {
  readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return forEachSourceFile(path, visit);
    if (/\.(?:js|mjs)$/.test(entry.name)) visit(path);
  });
}
