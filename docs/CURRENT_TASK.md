# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Fix left-side skill icons and make skills flash on fire

## Status

- State: validated locally
- Started: 2026-06-15T09:30:23.000Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `content/tap-survivor-content.json`
- `src/sprites.js`
- `src/render-hud.js`
- `src/weapon-fire.js`
- `src/run-state.js`
- `scripts/verify-mvp.mjs`

## Files Changed

- `src/sprites.js`
- `src/render-hud.js`
- `src/weapon-fire.js`
- `src/run-state.js`
- `scripts/verify-mvp.mjs`
- `docs/CURRENT_TASK.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `node scripts/verify-mvp.mjs`: passed 252 checks, including clean/flashing left HUD icons.
- `npm run smoke:start-run`: passed.
- `npm test`: passed.
- `npm run agent:prepush`: passed; cache keys bumped for HUD/runtime files.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
