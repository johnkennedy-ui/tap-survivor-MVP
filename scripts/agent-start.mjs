import { writeFileSync } from "node:fs";

function usage() {
  console.log(`Usage:
  npm run agent:start -- --goal "Short task goal" [--status "in progress"] [--files "src/game.js,docs/CURRENT_TASK.md"] [--validation "npm test"] [--dry-run]

Optionally creates docs/CURRENT_TASK.md for a local checkpoint. This file is housekeeping only; the conversation and git status remain authoritative.`);
}

function argValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  return fallback;
}

function flag(name) {
  return process.argv.includes(name);
}

function listFromCsv(value, fallback) {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : fallback;
}

function bulletList(items) {
  return items.map((item) => `- \`${item}\``).join("\n");
}

const goal = argValue("--goal");
const status = argValue("--status", "in progress");
const files = listFromCsv(argValue("--files"), [
  "docs/CURRENT_TASK.md",
  "docs/AGENT_CODEBASE_CONTEXT.md",
  "docs/CONTENT_EXTENSION_GUIDE.md",
]);
const validation = listFromCsv(argValue("--validation"), ["npm run agent:check"]);
const started = new Date().toISOString();

if (flag("--help") || !goal) {
  usage();
  process.exit(goal || flag("--help") ? 0 : 1);
}

const body = `# Current Agent Task

This file is an optional repo-local checkpoint for a Tap Survivor task. It is housekeeping only and may be stale; use the conversation and current git diff as the source of truth.

## Active Goal

${goal}

## Status

- State: ${status}
- Started: ${started}
- Owner: Frank / OpenClaw

## Files Likely Involved

${bulletList(files)}

## Files Changed

- Pending.

## Validation Plan

Run the smallest command that proves the change:

\`\`\`bash
${validation.join("\n")}
\`\`\`

Result:

- Pending.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
`;

if (flag("--dry-run")) {
  console.log(body);
} else {
  writeFileSync("docs/CURRENT_TASK.md", body);
  console.log("PASS wrote docs/CURRENT_TASK.md");
}
