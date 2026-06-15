# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Fix relic inventory equipment slots

## Status

- State: validated locally
- Started: 2026-06-15T10:07:54.000Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `src/shell-ui.js`
- `src/styles.css`
- `scripts/verify-mvp.mjs`

## Files Changed

- `src/shell-ui.js`
- `src/styles.css`
- `scripts/verify-mvp.mjs`
- `docs/CURRENT_TASK.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `node scripts/verify-mvp.mjs`: passed 252 checks, including relic inventory slot UI.
- Relic inventory slot smoke via harness: passed for locked floor-1 slots and floor-20 equipped slot state.
- `npm run smoke:shop`: passed.
- `npm run smoke:start-run`: passed.
- `npm test`: passed.
- `npm run agent:prepush`: passed; cache keys bumped for shell UI and styles.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
