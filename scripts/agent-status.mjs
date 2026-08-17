import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { assembleRegistryContent } from "./content-tools.mjs";

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

function readLatestFrankRun() {
  const path = ".agent/frank-last-command.json";
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return { warning: error.message };
  }
}

const pkg = readJson("package.json");
const content = assembleRegistryContent();
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
for (const name of ["agent:start", "agent:status", "agent:handoff", "agent:check", "agent:evidence", "agent:prepush", "build:content", "validate:content", "content:summary", "test"]) {
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
console.log(`- relics: ${countList(content.relics)}`);
console.log(`- levels: ${countList(content.levels)}`);

console.log("\n## Task Queue");
const taskQueue = readTaskQueue();
if (taskQueue.missing) {
  console.log("- .agent/tasks.json not found; task queue not in use.");
} else if (taskQueue.warning) {
  console.log(`- Warning: .agent/tasks.json invalid: ${taskQueue.warning}`);
} else {
  const tasks = taskQueue.tasks;
  const active = tasks.filter((task) => task.status === "active");
  const queued = tasks.filter((task) => task.status === "queued");
  const blocked = tasks.filter((task) => task.status === "blocked");
  const complete = tasks.filter((task) => task.status === "complete");
  console.log(`- total: ${tasks.length}`);
  console.log(`- active: ${active.length}`);
  console.log(`- queued: ${queued.length}`);
  console.log(`- blocked: ${blocked.length}`);
  console.log(`- complete: ${complete.length}`);
  if (active.length) {
    console.log("- active tasks:");
    active.forEach((task) => console.log(`  - ${task.id}: ${task.summary}`));
  }
  if (blocked.length) {
    console.log("- blocked tasks:");
    blocked.forEach((task) => console.log(`  - ${task.id}: ${task.summary}`));
  }
}

console.log("\n## Latest Frank Run");
const frankRun = readLatestFrankRun();
if (!frankRun) {
  console.log("- none");
} else if (frankRun.warning) {
  console.log(`- Warning: .agent/frank-last-command.json invalid: ${frankRun.warning}`);
} else {
  console.log(`- run: ${frankRun.run_dir || "unknown"}`);
  console.log(`- command: ${frankRun.command || "unknown"}`);
  console.log(`- status: ${frankRun.status || "unknown"}`);
  console.log(`- pid: ${frankRun.pid ?? "unknown"}`);
  console.log(`- started_at: ${frankRun.started_at || "unknown"}`);
  console.log(`- ended_at: ${frankRun.ended_at || "unknown"}`);
  console.log(`- exit_code: ${frankRun.exit_code ?? "unknown"}`);
  console.log(`- timed_out: ${frankRun.timed_out === true ? "yes" : "no"}`);
  console.log(`- log: ${frankRun.log_path || "unknown"}`);
}

console.log("\n## Current Task Snapshot");
console.log(currentTask);
