import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const outputPath = ".agent/frank-evidence.md";
const lastCommandPath = ".agent/frank-last-command.json";
const statusPath = ".agent/frank-status.json";

function run(command, args) {
  try {
    return {
      ok: true,
      output: execFileSync(command, args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim(),
    };
  } catch (error) {
    return {
      ok: false,
      output: (error.stdout || error.stderr || error.message || "").trim(),
    };
  }
}

function runOutput(command, args) {
  return run(command, args).output;
}

function runOptional(command, args, unavailableMessage) {
  const result = run(command, args);
  return result.ok ? result.output : unavailableMessage;
}

function readOptional(path) {
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8").trim();
}

function changedFiles(status) {
  if (!status) return "none";
  return status
    .split(/\r?\n/)
    .map((line) => line.replace(/^[ MARCUD?!]{1,2}\s+/, "").trim())
    .filter(Boolean)
    .join("\n");
}

const branch = runOutput("git", ["branch", "--show-current"]) || "unknown";
const commit = runOutput("git", ["rev-parse", "HEAD"]) || "unknown";
const status = runOutput("git", ["status", "--short"]);
const diffStat = runOutput("git", ["diff", "--stat"]);
const lastCommand = readOptional(lastCommandPath);
const frankStatus = readOptional(statusPath);
const workflowStatus = runOptional("gh", ["run", "list", "--limit", "5"], "gh unavailable; workflow status skipped.");

const body = `# Frank Evidence

Generated: ${new Date().toISOString()}

## Git

- Branch: ${branch}
- Commit: ${commit}

## Git Status

\`\`\`text
${status || "clean"}
\`\`\`

## Changed Files

\`\`\`text
${changedFiles(status)}
\`\`\`

## Diff Stat

\`\`\`text
${diffStat || "none"}
\`\`\`

## Frank Status

\`\`\`json
${frankStatus || "{}"}
\`\`\`

## Last Command

\`\`\`json
${lastCommand || "{}"}
\`\`\`

## Recent Workflow Status

\`\`\`text
${workflowStatus || "unavailable"}
\`\`\`
`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, body);
console.log(outputPath);
