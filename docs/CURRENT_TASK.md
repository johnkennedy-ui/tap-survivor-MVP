# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Extract pickup and loot helper from game.js

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T15:58:49.764Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `src/game.js`
- `src/pickups.js`
- `index.html`
- `scripts/verify-mvp.mjs`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`
- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `src/pickups.js`
- `src/game.js`
- `index.html`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`
- `scripts/verify-mvp.mjs`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`
- `docs/CURRENT_TASK.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:prepush
```

Result:

- `node --check src/pickups.js`: passed.
- `node --check src/game.js`: passed.
- `node --check scripts/smoke-game-harness.mjs`: passed.
- `node --check scripts/verify-speed-controls.mjs`: passed.
- `npm run agent:prepush`: passed, including `content:summary`, all smoke tests, and `npm test`.
- `npm run agent:evidence -- --task "tap survivor pickups extraction"`: passed and wrote `../Shane training/20260611T160219Z_tap-survivor-pickups-extraction/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
