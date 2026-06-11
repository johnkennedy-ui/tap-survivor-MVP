# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Add agent prepush helper

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T12:32:09.924Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `scripts/agent-prepush.mjs`
- `package.json`
- `docs/MAINTENANCE.md`
- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`
- `scripts/agent-status.mjs`

## Files Changed

- `scripts/agent-prepush.mjs`: added prepush summary with branch/commit, changed files, commit-message seed, deploy reminder, content summary, and agent check.
- `package.json`: added `agent:prepush`.
- `scripts/agent-check.mjs`: added syntax validation for `scripts/agent-prepush.mjs`.
- `scripts/agent-status.mjs`: lists `agent:prepush`.
- `docs/MAINTENANCE.md`: added `agent:prepush` to the before-reporting path.
- `docs/AGENT_CODEBASE_CONTEXT.md`: documented the prepush command.
- `docs/CHANGELOG_AGENT.md`: logged the new command.
- `docs/CURRENT_TASK.md`: updated this checkpoint.

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:prepush
npm run agent:check
```

Result:

- `node --check scripts/agent-prepush.mjs`: passed.
- `npm run agent:status`: passed and listed `agent:prepush`.
- `npm run agent:prepush`: passed, including `content:summary` and `agent:check`.
- `npm run agent:evidence -- --task "tap survivor agent prepush"`: passed and wrote `../Shane training/20260611T123355Z_tap-survivor-agent-prepush/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
