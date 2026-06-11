import { execFileSync, spawnSync } from "node:child_process";

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

function runStep(label, command, args) {
  console.log(`\n## ${label}`);
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.log(`FAIL ${label} exited ${result.status}`);
    process.exit(result.status || 1);
  }
  console.log(`PASS ${label}`);
}

function changedFilesFromStatus(status) {
  if (!status) return [];
  return status
    .split("\n")
    .map((line) => line.replace(/^[ MARCUD?!]{1,2}\s+/, "").trim())
    .filter(Boolean);
}

function commitSeed(files) {
  if (!files.length) return "No changes to commit";
  if (files.every((file) => file.startsWith("docs/") || file === "README.md" || file === "AGENTS.md")) {
    return "Update maintenance docs";
  }
  if (files.some((file) => file.startsWith("content/"))) return "Update game content";
  if (files.some((file) => file.startsWith("src/"))) return "Update game runtime";
  if (files.some((file) => file.startsWith("scripts/") || file === "package.json")) return "Update agent tooling";
  if (files.some((file) => file.startsWith(".github/"))) return "Update CI workflow";
  return "Update Tap Survivor";
}

function needsDeployCheck(files) {
  return files.some((file) =>
    file === "index.html" ||
    file === "package.json" ||
    file.startsWith("src/") ||
    file.startsWith("content/") ||
    file.startsWith("assets/") ||
    file.startsWith(".github/workflows/tap-survivor-pages.yml")
  );
}

const branch = run("git", ["branch", "--show-current"]) || "unknown";
const commit = run("git", ["rev-parse", "--short", "HEAD"]) || "unknown";
const status = run("git", ["status", "--short"]);
const files = changedFilesFromStatus(status);

console.log("# Tap Survivor Agent Prepush");
console.log(`Branch: ${branch}`);
console.log(`Commit: ${commit}`);

console.log("\n## Changed Files");
if (files.length) {
  files.forEach((file) => console.log(`- ${file}`));
} else {
  console.log("- none");
}

console.log("\n## Commit Message Seed");
console.log(commitSeed(files));

console.log("\n## Deploy Reminder");
console.log(needsDeployCheck(files)
  ? "Run `npm run check:deploy` after push if this affects the live GitHub Pages build."
  : "Live deploy verification is probably not needed for docs/tooling-only changes.");

runStep("Content Summary", "npm", ["run", "content:summary"]);
runStep("Agent Check", "npm", ["run", "agent:check"]);

console.log("\nPASS prepush complete");
