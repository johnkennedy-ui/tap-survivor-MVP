# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Add remaining focused smoke tests

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T12:09:34.555Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `scripts/smoke-save.mjs`
- `scripts/smoke-start-run.mjs`
- `scripts/smoke-boss-run.mjs`
- `package.json`
- `scripts/agent-check.mjs`
- `docs/MAINTENANCE.md`
- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `scripts/smoke-game-harness.mjs`: added reusable VM harness for start/boss smoke tests.
- `scripts/smoke-save.mjs`: added save default, legacy migration, quest reopening, upgrade tier, and persistence smoke coverage.
- `scripts/smoke-start-run.mjs`: added focused start-run HUD/run-state smoke coverage.
- `scripts/smoke-boss-run.mjs`: added accelerated six-minute boss-spawn smoke coverage.
- `package.json`: added `smoke:save`, `smoke:start-run`, and `smoke:boss-run`.
- `scripts/agent-check.mjs`: added the new smoke checks to standard validation.
- `docs/MAINTENANCE.md`: documented the new focused smoke commands.
- `docs/AGENT_CODEBASE_CONTEXT.md`: documented the new smoke commands.
- `docs/CHANGELOG_AGENT.md`: logged the new smoke tests.
- `docs/CURRENT_TASK.md`: updated this checkpoint.

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run smoke:save
npm run smoke:start-run
npm run smoke:boss-run
npm run agent:check
```

Result:

- `node --check scripts/smoke-game-harness.mjs`: passed.
- `node --check scripts/smoke-save.mjs`: passed.
- `node --check scripts/smoke-start-run.mjs`: passed.
- `node --check scripts/smoke-boss-run.mjs`: passed.
- `npm run smoke:save`: passed.
- `npm run smoke:start-run`: passed.
- `npm run smoke:boss-run`: passed.
- `npm run agent:check`: passed, including all focused smokes and `npm test`.
- `npm run agent:evidence -- --task "tap survivor remaining smoke tests"`: passed and wrote `../Shane training/20260611T121834Z_tap-survivor-remaining-smoke-tests/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
