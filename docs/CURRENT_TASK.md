# Current Agent Task

This file is an optional repo-local checkpoint for a Tap Survivor task. It is housekeeping only and may be stale; use the conversation and current git diff as the source of truth.

## Active Goal

Reformat compressed source files for maintainability

## Status

- State: in progress
- Started: 2026-06-15T23:56:29.932Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CONTENT_EXTENSION_GUIDE.md`

## Files Changed

- `src/run-ui.js`
- `docs/MAINTENANCE.md`
- `docs/FORMAT_AND_DIFF_HYGIENE.md`
- `docs/CURRENT_TASK.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- Baseline `npm run agent:check`: pass. The checkout had untracked
  `android/` and `node_modules/` artifacts from a previous branch, so they were
  excluded locally via `.git/info/exclude` before formatting work continued.
- `node --check src/run-ui.js`: pass
- `git diff --check`: pass
- `npm run build:content`: pass
- `npm run validate:content`: pass
- `npm test`: pass
- `npm run agent:check`: pass
- `npm run check:deploy`: pass

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Formatting-only change implemented, validated, documented, and ready to report.

## Files Inspected

- `AGENTS.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `package.json`
- `src/save.js`
- `src/input.js`
- `src/weapon-fire.js`
- `src/styles.css`
- `src/run-ui.js`
- `scripts/`
- `content/`
- `docs/CURRENT_TASK.md`

## Skipped Files

- `src/content.generated.js`: generated output.
- `scripts/verify-mvp.mjs` and other verifier scripts: long assertion lines
  exist, but formatting them would create a broad test-file churn diff outside
  the safest source-formatting pass.
- `docs/tasks/`: archival task evidence.
