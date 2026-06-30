# Agent Check Format Fix Flag Evidence

## Status

Complete.

## Starting HEAD

af7a7e4

## Queue Task ID

agent-check-format-fix-flag

## Target

Add an opt-in `agent:check` flag that formats only changed Prettier-supported files before
running the existing validation flow.

## What Changed

- Added `--fix-format-changed` support to `scripts/agent-check.mjs`.
- The flag collects tracked changed files relative to `HEAD` and untracked non-ignored files.
- The flag selects only changed `.js`, `.mjs`, `.cjs`, `.json`, `.md`, `.html`, `.css`,
  `.yml`, and `.yaml` files.
- The flag excludes dependency, VCS, run-log, build, cache, and output paths.
- The flag prints changed files, selected files, skipped files, and then runs Prettier with
  child-process argument arrays before continuing to the normal check sequence.
- Plain `npm run agent:check` remains check-only.
- Updated mission guidance in `AGENTS.md` and `docs/AGENT_TOKEN_BUDGET.md`.

## Files Changed

- `scripts/agent-check.mjs`
- `AGENTS.md`
- `docs/AGENT_TOKEN_BUDGET.md`
- `.agent/tasks.json`
- `.agent/status.md`
- `Shane training/20260630T182015Z_agent-check-format-fix-flag/result.md`

## Commands Run and Results

- `git fetch origin main` - passed.
- `git rev-parse --abbrev-ref HEAD` - `main`.
- `git rev-parse --short HEAD` - `af7a7e4`.
- `git rev-parse --short origin/main` - `af7a7e4`.
- `git status --short` - clean before edit.
- `npm run task:validate` - passed.
- `npm run task:list` - passed; no active task before creating this mission.
- `npm run agent:mission-start` - passed.
- `npm run task:add -- --id "agent-check-format-fix-flag" --summary "Add an agent:check flag that formats changed files before the final validation gate."` - passed.
- `npm run task:active -- agent-check-format-fix-flag` - passed.
- `node --check scripts/agent-check.mjs` - passed.
- `npm run frank:run -- "npm run agent:check -- --fix-format-changed" --timeout 180`
  - first run formatted changed files, then failed on format hygiene for one long `AGENTS.md` line.
  - after wrapping that line, rerun passed.
- `npm run check:format-hygiene` - passed after wrapping the long line.
- `npm run frank:run -- "npm run agent:check" --timeout 180` - passed, proving the normal check-only path still works.
- `npm run frank:run -- "npm run agent:check -- --fix-format-changed" --timeout 180` - final rerun passed after evidence was added.
- `git diff --check` - passed.
- `npm run task:validate` - passed.
- `npm run agent:status` - passed.
- `npm run agent:handoff` - passed.

## Validation Results

Passed locally. Latest logs:

- `.agent/runs/2026-06-30T182144Z_npm-run-agent-check-fix-format-changed/command.log`
- `.agent/runs/2026-06-30T182240Z_npm-run-agent-check/command.log`
- `.agent/runs/2026-06-30T182347Z_npm-run-agent-check-fix-format-changed/command.log`

## Scope Confirmation

No `src/**`, content, assets, `www/`, Android, GitHub workflow, deploy, release, gameplay,
runtime, module, bridge, package script, queue tooling, runner tooling, or token-budget tooling
files were edited.

## Remaining Limitations

- Commit, push, and one GitHub Actions check are pending at evidence-update time.
