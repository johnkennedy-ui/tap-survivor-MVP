import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function run(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function statusCounts(tasks) {
  const counts = { total: 0, active: 0, queued: 0, blocked: 0, complete: 0 };
  if (!Array.isArray(tasks)) return counts;
  counts.total = tasks.length;
  for (const task of tasks) {
    if (Object.hasOwn(counts, task.status)) counts[task.status] += 1;
  }
  return counts;
}

function lastLines(path, count) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").trimEnd().split("\n").slice(-count);
}

const branch = run("git", ["branch", "--show-current"]) || "unknown";
const head = run("git", ["rev-parse", "--short", "HEAD"]) || "unknown";
const originMain = run("git", ["rev-parse", "--short", "origin/main"]) || "unavailable";
const status = run("git", ["status", "--short"]);
const tasks = readJson(".agent/tasks.json");
const counts = statusCounts(tasks);
const activeTasks = Array.isArray(tasks) ? tasks.filter((task) => task.status === "active") : [];
const frankRun = readJson(".agent/frank-last-command.json");

console.log("# Agent Mission Start");
console.log(`Branch: ${branch}`);
console.log(`Local HEAD: ${head}`);
console.log(`origin/main: ${originMain}`);
console.log(`Worktree: ${status ? "dirty" : "clean"}`);
if (status) console.log(status);

console.log("\n## Task Queue");
if (!Array.isArray(tasks)) {
  console.log("- .agent/tasks.json missing or invalid");
} else {
  console.log(`- total: ${counts.total}`);
  console.log(`- active: ${counts.active}`);
  console.log(`- queued: ${counts.queued}`);
  console.log(`- blocked: ${counts.blocked}`);
  console.log(`- complete: ${counts.complete}`);
  if (activeTasks.length) {
    for (const task of activeTasks) {
      console.log(`- active task: ${task.id} - ${task.summary}`);
    }
  } else {
    console.log("- active task: none");
  }
}

console.log("\n## Status Tail");
const tail = lastLines(".agent/status.md", 10);
if (tail.length) {
  for (const line of tail) console.log(line);
} else {
  console.log("- .agent/status.md not found or empty");
}

console.log("\n## Latest Frank Run");
if (frankRun) {
  console.log(`- run: ${frankRun.run_dir || "unknown"}`);
  console.log(`- command: ${frankRun.command || "unknown"}`);
  console.log(`- status: ${frankRun.status || "unknown"}`);
  console.log(`- exit_code: ${frankRun.exit_code ?? "unknown"}`);
  console.log(`- timed_out: ${frankRun.timed_out === true ? "yes" : "no"}`);
} else {
  console.log("- none");
}

console.log("\nReminder: do not run full preflight before focused inspection unless the mission requires it.");
