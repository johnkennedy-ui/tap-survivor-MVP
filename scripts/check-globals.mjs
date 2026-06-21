import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const allowlistPath = "scripts/allowed-globals.json";
const scanRoots = ["src", "scripts"];
const scanFiles = ["index.html"];
const scanExtensions = new Set([".js", ".mjs", ".html"]);
const globalPattern = /\b(window|globalThis)\s*\.\s*([A-Za-z_$][\w$]*)/g;

const allowlist = JSON.parse(readFileSync(allowlistPath, "utf8"));
const allowedExpressions = new Set(allowlist.allowedExpressions || []);
const allowedFileCounts = allowlist.allowedFileCounts || {};
const files = [...scanRoots.flatMap(listFiles), ...scanFiles.filter((file) => existsSync(file))].sort();
const hits = files.flatMap(scanFile);
const hitsByFile = new Map();
const failures = [];

hits.forEach((hit) => {
  const fileHits = hitsByFile.get(hit.file) || [];
  fileHits.push(hit);
  hitsByFile.set(hit.file, fileHits);
  if (!allowedExpressions.has(hit.expression)) {
    failures.push(`${hit.file}:${hit.line} unapproved global usage ${hit.expression}`);
  }
});

for (const [file, fileHits] of hitsByFile) {
  const allowedCount = allowedFileCounts[file] || 0;
  if (fileHits.length > allowedCount) {
    failures.push(`${file} has ${fileHits.length} global usages; allowlist permits ${allowedCount}`);
  }
}

const allowedTotal = Object.values(allowedFileCounts).reduce((sum, count) => sum + count, 0);

console.log("# Tap Survivor Global Usage Check");
console.log(`- files scanned: ${files.length}`);
console.log(`- allowed expressions: ${allowedExpressions.size}`);
console.log(`- allowed usage count: ${allowedTotal}`);
console.log(`- actual usage count: ${hits.length}`);

if (hits.length) {
  console.log("\n## Current Allowed Usage");
  hits.forEach((hit) => {
    console.log(`- ${hit.file}:${hit.line} ${hit.expression}`);
  });
}

if (failures.length) {
  console.log("\n## Failures");
  failures.forEach((failure) => console.log(`FAIL ${failure}`));
  process.exitCode = 1;
} else {
  console.log("\nPASS no new global/window/globalThis usage");
}

function listFiles(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) return listFiles(path);
    if (!scanExtensions.has(extname(path))) return [];
    return [path];
  });
}

function scanFile(file) {
  const masked = maskStringsAndComments(readFileSync(file, "utf8"));
  const lines = masked.split("\n");
  const hits = [];
  lines.forEach((lineText, index) => {
    for (const match of lineText.matchAll(globalPattern)) {
      hits.push({
        expression: `${match[1]}.${match[2]}`,
        file,
        line: index + 1,
      });
    }
  });
  return hits;
}

function maskStringsAndComments(text) {
  let output = "";
  let state = "code";
  let quote = "";
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (state === "code") {
      if (char === "/" && next === "/") {
        output += "  ";
        index += 1;
        state = "line-comment";
        continue;
      }
      if (char === "/" && next === "*") {
        output += "  ";
        index += 1;
        state = "block-comment";
        continue;
      }
      if (char === "\"" || char === "'" || char === "`") {
        output += " ";
        quote = char;
        escaped = false;
        state = "string";
        continue;
      }
      output += char;
      continue;
    }

    if (state === "line-comment") {
      if (char === "\n") {
        output += "\n";
        state = "code";
      } else {
        output += " ";
      }
      continue;
    }

    if (state === "block-comment") {
      if (char === "*" && next === "/") {
        output += "  ";
        index += 1;
        state = "code";
      } else {
        output += char === "\n" ? "\n" : " ";
      }
      continue;
    }

    if (state === "string") {
      if (escaped) {
        output += char === "\n" ? "\n" : " ";
        escaped = false;
        continue;
      }
      if (char === "\\") {
        output += " ";
        escaped = true;
        continue;
      }
      if (char === quote) {
        output += " ";
        state = "code";
        continue;
      }
      output += char === "\n" ? "\n" : " ";
    }
  }

  return output;
}
