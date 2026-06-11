import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function run(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    return (error.stdout || error.stderr || error.message || "").trim();
  }
}

function readIfExists(path, fallback) {
  return existsSync(path) ? readFileSync(path, "utf8").trim() : fallback;
}

const branch = run("git", ["branch", "--show-current"]) || "unknown";
const commit = run("git", ["rev-parse", "--short", "HEAD"]) || "unknown";
const status = run("git", ["status", "--short"]) || "clean";
const recentCommits = run("git", ["log", "--oneline", "-5"]) || "unavailable";
const currentTask = readIfExists("docs/CURRENT_TASK.md", "docs/CURRENT_TASK.md unavailable");

console.log("# Tap Survivor Agent Handoff");
console.log(`Branch: ${branch}`);
console.log(`Commit: ${commit}`);

console.log("\n## Git Status");
console.log("```text");
console.log(status);
console.log("```");

console.log("\n## Recent Commits");
console.log("```text");
console.log(recentCommits);
console.log("```");

console.log("\n## Current Task");
console.log("```markdown");
console.log(currentTask);
console.log("```");

console.log("\n## Standard Commands");
console.log("- Start task: `npm run agent:start -- --goal \"<task>\"`");
console.log("- Status: `npm run agent:status`");
console.log("- Validate: `npm run agent:check`");
console.log("- Evidence: `npm run agent:evidence -- --task \"<task>\"`");
