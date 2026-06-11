import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

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

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "tap-survivor-task";
}

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  return fallback;
}

const now = new Date();
const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
const task = argValue("--task", "tap survivor agent evidence");
const evidenceRoot = argValue("--root", "../Shane training");
const outputDir = join(evidenceRoot, `${stamp}_${slugify(task)}`);
const outputFile = join(outputDir, "result.md");

const currentTask = run("sed", ["-n", "1,220p", "docs/CURRENT_TASK.md"]);
const status = run("git", ["status", "--short"]);
const changedFiles = status
  ? status
      .split("\n")
      .map((line) => line.replace(/^[ MARCUD?!]{1,2}\s+/, "").trim())
      .filter(Boolean)
      .join("\n")
  : "";
const diffStat = run("git", ["diff", "--stat"]);
const head = run("git", ["rev-parse", "--short", "HEAD"]);

const body = `# ${task}

## Timestamp

${now.toISOString()}

## Commit

${head || "unknown"}

## Current Task

\`\`\`markdown
${currentTask || "docs/CURRENT_TASK.md unavailable"}
\`\`\`

## Git Status

\`\`\`text
${status || "clean"}
\`\`\`

## Changed Files

\`\`\`text
${changedFiles || "none"}
\`\`\`

## Diff Stat

\`\`\`text
${diffStat || "none"}
\`\`\`

## Validation

Record validation commands and results here before final reporting.
`;

mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(outputFile, body);

console.log(outputFile);
