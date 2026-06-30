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

function parseDate(value) {
  return typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value));
}

function validateTaskQueue(tasks) {
  if (!Array.isArray(tasks)) return ["root value must be an array"];

  const ids = new Set();
  const statuses = new Set(["queued", "active", "complete", "blocked"]);
  const errors = [];
  tasks.forEach((task, index) => {
    const label = `task[${index}]`;
    if (!task || typeof task !== "object" || Array.isArray(task)) {
      errors.push(`${label} must be an object`);
      return;
    }
    if (typeof task.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(task.id)) {
      errors.push(`${label}.id must be kebab-case`);
    } else if (ids.has(task.id)) {
      errors.push(`${label}.id duplicates ${task.id}`);
    } else {
      ids.add(task.id);
    }
    if (!statuses.has(task.status)) errors.push(`${label}.status is invalid`);
    if (typeof task.summary !== "string" || task.summary.trim() === "") {
      errors.push(`${label}.summary must be non-empty`);
    }
    if (!Array.isArray(task.scope_allowed)) errors.push(`${label}.scope_allowed must be an array`);
    if (!Array.isArray(task.scope_forbidden)) {
      errors.push(`${label}.scope_forbidden must be an array`);
    }
    if (typeof task.skill !== "string" && task.skill !== null) {
      errors.push(`${label}.skill must be a string or null`);
    }
    if (typeof task.evidence !== "string" && task.evidence !== null) {
      errors.push(`${label}.evidence must be a string or null`);
    }
    if (!parseDate(task.opened)) errors.push(`${label}.opened must be a parseable date string`);
    if (task.closed !== null && !parseDate(task.closed)) {
      errors.push(`${label}.closed must be null or a parseable date string`);
    }
    if (task.status === "complete" && task.evidence === null) {
      errors.push(`${label}.evidence is required when complete`);
    }
    if ((task.status === "complete" || task.status === "blocked") && task.closed === null) {
      errors.push(`${label}.closed is required when ${task.status}`);
    }
  });
  return errors;
}

function readTaskQueue() {
  const path = ".agent/tasks.json";
  if (!existsSync(path)) {
    return { missing: true };
  }
  try {
    const tasks = JSON.parse(readFileSync(path, "utf8"));
    const errors = validateTaskQueue(tasks);
    return errors.length ? { warning: errors.join("; ") } : { tasks };
  } catch (error) {
    return { warning: error.message };
  }
}

function formatList(values) {
  return values.length ? values.join(", ") : "-";
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

const taskQueue = readTaskQueue();
if (!taskQueue.missing) {
  console.log("\n## Task Queue");
  if (taskQueue.warning) {
    console.log(`Warning: .agent/tasks.json invalid: ${taskQueue.warning}`);
  } else {
    const tasks = taskQueue.tasks;
    const active = tasks.filter((task) => task.status === "active");
    const blocked = tasks.filter((task) => task.status === "blocked");
    console.log(`Total tasks: ${tasks.length}`);
    console.log(`Active: ${active.length}`);
    console.log(`Blocked: ${blocked.length}`);
    if (active.length) {
      console.log("\nActive task:");
      active.forEach((task) => {
        console.log(`- ID: ${task.id}`);
        console.log(`  Summary: ${task.summary}`);
        console.log(`  Skill: ${task.skill ?? "-"}`);
        console.log(`  Evidence: ${task.evidence ?? "-"}`);
        console.log(`  Scope allowed: ${formatList(task.scope_allowed)}`);
        console.log(`  Scope forbidden: ${formatList(task.scope_forbidden)}`);
      });
    }
    if (blocked.length) {
      console.log("\nBlocked tasks:");
      blocked.forEach((task) => console.log(`- ${task.id}: ${task.summary}`));
    }
  }
}

console.log("\n## Standard Commands");
console.log("- Start task: `npm run agent:start -- --goal \"<task>\"`");
console.log("- Status: `npm run agent:status`");
console.log("- Validate: `npm run agent:check`");
console.log("- Evidence: `npm run agent:evidence -- --task \"<task>\"`");
