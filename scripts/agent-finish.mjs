import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function argValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function flag(name) {
  return process.argv.includes(name);
}

function run(command, args, options = {}) {
  const output = execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  return typeof output === "string" ? output.trim() : "";
}

function runStep(label, command, args) {
  console.log(`\n## ${label}`);
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
  console.log(`PASS ${label}`);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runStepWithRetry(label, command, args, attempts = 6, delayMs = 15000) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    console.log(`\n## ${label} attempt ${attempt}/${attempts}`);
    const result = spawnSync(command, args, { stdio: "inherit" });
    if (result.status === 0) {
      console.log(`PASS ${label}`);
      return;
    }
    if (attempt === attempts) process.exit(result.status || 1);
    sleep(delayMs);
  }
}

function changedFiles() {
  const status = run("git", ["status", "--short", "--untracked-files=all"]);
  if (!status) return [];
  return status.split("\n").map((line) => line.replace(/^[ MARCUD?!]{1,2}\s+/, "").trim()).filter(Boolean);
}

function commitSeed(files) {
  if (files.some((file) => file.startsWith("scripts/") || file === "package.json")) return "Improve agent maintenance tooling";
  if (files.some((file) => file.startsWith("src/"))) return "Update game runtime";
  if (files.some((file) => file.startsWith("content/"))) return "Update game content";
  return "Update Tap Survivor";
}

function archiveCurrentTask() {
  if (!existsSync("docs/CURRENT_TASK.md")) return;
  const body = readFileSync("docs/CURRENT_TASK.md", "utf8");
  if (body.includes("No active task.")) {
    console.log("No active current task to archive");
    return;
  }
  mkdirSync("docs/tasks", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archivePath = join("docs/tasks", `${stamp}.md`);
  writeFileSync(archivePath, `${body.trim()}\n\n## Finished\n\n- Archived by \`npm run agent:finish\`.\n`);
  writeFileSync("docs/CURRENT_TASK.md", `# Current Agent Task\n\nNo active task.\n\nLast archived task: \`${archivePath}\`.\n`);
  console.log(`Archived current task to ${archivePath}`);
}

console.log("# Tap Survivor Agent Finish");
runStep("Prepush", "npm", ["run", "agent:prepush"]);
archiveCurrentTask();

const files = changedFiles();
if (!files.length) {
  console.log("\nPASS no changes to commit");
} else {
  const message = argValue("--message", commitSeed(files));
  console.log("\n## Commit");
  files.forEach((file) => console.log(`- ${file}`));
  run("git", ["add", ...files], { stdio: "inherit" });
  run("git", ["commit", "-m", message], { stdio: "inherit" });
  console.log(`PASS committed: ${message}`);
}

if (flag("--push")) runStep("Push", "git", ["push"]);
if (flag("--deploy")) runStepWithRetry("Deploy Check", "npm", ["run", "check:deploy"]);

console.log("\nPASS agent finish complete");
