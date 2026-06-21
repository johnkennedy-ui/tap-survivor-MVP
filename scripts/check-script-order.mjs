import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const indexPath = join(root, "index.html");
const index = readFileSync(indexPath, "utf8");
const globalPattern = /\bglobalThis\.(TapSurvivor[A-Za-z0-9_]+)/g;
const providedPattern = /\bglobalThis\.(TapSurvivor[A-Za-z0-9_]+)\s*=/g;
const scriptSources = extractLocalScriptSources(index);
const provided = new Map();
const failures = [];

/**
 * @param {string} html
 * @returns {string[]}
 */
export function extractLocalScriptSources(html) {
  return [...html.matchAll(/<script\b[^>]*>/gi)]
    .map((match) => match[0].match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2])
    .filter(Boolean)
    .map((src) => src.split("?")[0])
    .filter(isLocalScript);
}

function uniqueMatches(source, pattern) {
  return [...new Set([...source.matchAll(pattern)].map((match) => match[1]))].sort();
}

function isLocalScript(src) {
  if (/^(?:[a-z]+:)?\/\//i.test(src) || src.startsWith("/") || src.startsWith("data:")) return false;
  return src.startsWith("src/") || src.startsWith("scripts/");
}

function runSelfCheck() {
  const actual = extractLocalScriptSources(`
    <script src="src/classic.js?v=1"></script>
    <script type="module" src='src/module.js'></script>
    <script defer src = "scripts/tool.mjs?cache=2"></script>
    <script src="https://example.invalid/external.js"></script>
    <script src="/absolute/local.js"></script>
  `);
  const expected = ["src/classic.js", "src/module.js", "scripts/tool.mjs"];
  if (actual.join("\n") !== expected.join("\n")) {
    throw new Error(`script src extraction self-check failed: ${actual.join(", ")}`);
  }
}

console.log("# Tap Survivor Script Order Check");
runSelfCheck();

scriptSources.forEach((src, index) => {
  const path = join(root, src);
  if (!existsSync(path)) {
    failures.push(`${src} is referenced by index.html but missing on disk`);
    return;
  }

  const source = readFileSync(path, "utf8");
  const provides = uniqueMatches(source, providedPattern);
  const references = uniqueMatches(source, globalPattern).filter((name) => !provides.includes(name));
  const missing = references.filter((name) => !provided.has(name));

  if (missing.length) {
    failures.push(`${src} references ${missing.join(", ")} before those globals are loaded`);
  }

  provides.forEach((name) => provided.set(name, { src, index }));
});

console.log(`- scripts checked: ${scriptSources.length}`);
console.log(`- TapSurvivor globals provided: ${[...provided.keys()].sort().join(", ")}`);

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log("PASS script load order provides TapSurvivor globals before use");
