import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const indexPath = join(root, "index.html");
const index = readFileSync(indexPath, "utf8");
const loadedPaths = loadedAssetPaths(index);
const changedFiles = gitChangedFiles();
const targetPaths = cacheTargets(changedFiles, loadedPaths);

if (!targetPaths.length) {
  console.log("PASS cache keys already current");
  process.exit(0);
}

let updated = index;
const bumped = [];
targetPaths.forEach((assetPath) => {
  const diskPath = join(root, assetPath);
  if (!existsSync(diskPath)) return;
  const hash = createHash("sha1").update(readFileSync(diskPath)).digest("hex").slice(0, 8);
  const nextUrl = `${assetPath}?v=auto-${hash}`;
  const pattern = new RegExp(escapeRegExp(assetPath) + '(?:\\?v=[^"\']*)?', "g");
  if (updated.includes(nextUrl)) return;
  updated = updated.replace(pattern, nextUrl);
  bumped.push(nextUrl);
});

if (updated !== index) {
  writeFileSync(indexPath, updated);
}

if (bumped.length) {
  console.log("PASS bumped cache keys");
  bumped.forEach((url) => console.log(`- ${url}`));
} else {
  console.log("PASS cache keys already current");
}

function gitChangedFiles() {
  const status = execFileSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  if (!status) return [];
  return status
    .split("\n")
    .map((line) => line.replace(/^[ MARCUD?!]{1,2}\s+/, "").trim())
    .map((file) => file.split(" -> ").pop())
    .filter(Boolean);
}

function loadedAssetPaths(html) {
  const paths = new Set();
  const pattern = /\b(?:src|href)="([^"#?]+)(?:\?[^"#]*)?"/g;
  let match;
  while ((match = pattern.exec(html))) {
    const path = match[1];
    if (path.startsWith("src/")) paths.add(path);
  }
  return paths;
}

function cacheTargets(files, loaded) {
  const targets = new Set();
  files.forEach((file) => {
    const target = file === "content/tap-survivor-content.json" ? "src/content.generated.js" : file;
    if (loaded.has(target)) targets.add(target);
  });
  return [...targets].sort();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
