import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function run(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    }).trim();
  } catch (error) {
    return (error.stdout || error.stderr || error.message || "").trim();
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function countMap(value) {
  return Object.keys(value || {}).length;
}

function countList(value) {
  return Array.isArray(value) ? value.length : 0;
}

const pkg = readJson("package.json");
const content = readJson("content/tap-survivor-content.json");
const branch = run("git", ["branch", "--show-current"]) || "unknown";
const commit = run("git", ["rev-parse", "--short", "HEAD"]) || "unknown";
const status = run("git", ["status", "--short"]);
const currentTask = existsSync("docs/CURRENT_TASK.md")
  ? readFileSync("docs/CURRENT_TASK.md", "utf8").split("\n").slice(0, 18).join("\n").trim()
  : "docs/CURRENT_TASK.md not found";

console.log("# Tap Survivor Agent Status");
console.log(`Branch: ${branch}`);
console.log(`Commit: ${commit}`);
console.log(`Dirty files: ${status ? status.split("\n").length : 0}`);
if (status) {
  console.log(status);
}

console.log("\n## Available Agent Commands");
for (const name of ["agent:start", "agent:status", "agent:check", "agent:evidence", "build:content", "validate:content", "test"]) {
  if (pkg.scripts?.[name]) {
    console.log(`- npm run ${name}: ${pkg.scripts[name]}`);
  }
}

console.log("\n## Content Counts");
console.log(`- weapons: ${countMap(content.weapons)}`);
console.log(`- weapon unlocks: ${countList(content.weaponUnlocks)}`);
console.log(`- quests: ${countMap(content.quests)}`);
console.log(`- enemy types: ${countList(content.enemyTypes)}`);
console.log(`- characters: ${countList(content.characters)}`);
console.log(`- shop items: ${countList(content.shopItems)}`);
console.log(`- levels: ${countList(content.levels)}`);

console.log("\n## Current Task Snapshot");
console.log(currentTask);
