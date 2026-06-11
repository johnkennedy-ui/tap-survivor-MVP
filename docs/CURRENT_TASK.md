# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Add quest flow smoke test

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T12:02:45.187Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `scripts/smoke-quest-flow.mjs`
- `package.json`
- `docs/MAINTENANCE.md`
- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `scripts/smoke-quest-flow.mjs`: added focused VM smoke test for quest progress, completion, follow-up opening, rewards, and inactive group handling.
- `package.json`: added `smoke:quest-flow`.
- `scripts/agent-check.mjs`: added the quest smoke to the standard agent validation lane.
- `docs/MAINTENANCE.md`: documented the focused quest smoke command.
- `docs/AGENT_CODEBASE_CONTEXT.md`: documented the quest smoke command.
- `docs/CHANGELOG_AGENT.md`: logged the new smoke test.
- `docs/CURRENT_TASK.md`: updated this checkpoint.

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run smoke:quest-flow
npm run agent:check
```

Result:

- `node --check scripts/smoke-quest-flow.mjs`: passed.
- `npm run smoke:quest-flow`: passed.
- `node --check scripts/agent-check.mjs`: passed.
- `npm run agent:check`: passed, including `smoke:quest-flow` and `npm test`.
- `npm run agent:evidence -- --task "tap survivor quest flow smoke"`: passed and wrote `../Shane training/20260611T120505Z_tap-survivor-quest-flow-smoke/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
