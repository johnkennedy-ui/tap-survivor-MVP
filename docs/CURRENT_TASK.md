# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Fix game script cache bust after run-update split

## Status

- State: validated; ready to push/report
- Started: 2026-06-12T18:04:59.952Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `index.html`
- `docs/CURRENT_TASK.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `index.html`
- `docs/CURRENT_TASK.md`
- `docs/CHANGELOG_AGENT.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run test:speed && npm run smoke:start-run && npm run agent:prepush
```

Result:

- `npm run test:speed`: passed.
- `npm run smoke:start-run`: passed.
- `npm run agent:prepush`: passed.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
