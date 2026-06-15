# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Restore relic inventory skill sprites

## Status

- State: validated locally
- Started: 2026-06-15T11:33:45.000Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `src/shell-ui.js`
- `src/styles.css`
- `scripts/verify-mvp.mjs`
- `scripts/smoke-relic-run-start.mjs`

## Files Changed

- `src/shell-ui.js`
- `src/styles.css`
- `scripts/verify-mvp.mjs`
- `scripts/smoke-relic-run-start.mjs`
- `docs/CURRENT_TASK.md`
- `index.html`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `npm run smoke:relic-run-start`: passed, including locked popup and skill sprite icon source.
- `node scripts/verify-mvp.mjs`: passed 252 checks, including relic icon source coverage.
- `npm run agent:prepush`: passed; cache keys bumped for shell UI and styles.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
