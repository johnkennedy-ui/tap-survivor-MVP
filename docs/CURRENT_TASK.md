# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Scale weapon SFX to fire rate

## Status

- State: validated locally
- Started: 2026-06-15T11:46:30.000Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `src/audio.js`
- `src/weapon-fire.js`
- `scripts/verify-mvp.mjs`

## Files Changed

- `src/audio.js`
- `src/weapon-fire.js`
- `scripts/verify-mvp.mjs`
- `docs/CURRENT_TASK.md`
- `index.html`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

Result:

- `node --check src/audio.js`: passed.
- `node --check src/weapon-fire.js`: passed.
- `node scripts/verify-mvp.mjs`: passed 252 checks, including scaled weapon SFX.
- `npm run smoke:start-run`: passed.
- `npm run agent:prepush`: passed; cache keys bumped for audio and weapon fire.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
