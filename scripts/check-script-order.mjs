import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const indexPath = join(root, "index.html");
const index = readFileSync(indexPath, "utf8");
const scriptSources = [...index.matchAll(/<script\s+src="([^"]+)"><\/script>/g)].map((match) => match[1].split("?")[0]);
const globalPattern = /\bglobalThis\.(TapSurvivor[A-Za-z0-9_]+)/g;
const providedPattern = /\bglobalThis\.(TapSurvivor[A-Za-z0-9_]+)\s*=/g;
const provided = new Map();
const failures = [];

function uniqueMatches(source, pattern) {
  return [...new Set([...source.matchAll(pattern)].map((match) => match[1]))].sort();
}

function isLocalScript(path) {
  return path.startsWith("src/") || path.startsWith("scripts/");
}

console.log("# Tap Survivor Script Order Check");

scriptSources.forEach((src, index) => {
  if (!isLocalScript(src)) return;
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
