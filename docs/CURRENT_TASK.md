# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Extract run UI helper

## Status

- State: validated; ready to push/report
- Started: 2026-06-12T11:36:33.000Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `src/game.js`
- `src/run-ui.js`
- `index.html`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`
- `scripts/verify-mvp.mjs`
- `docs/CURRENT_TASK.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `src/game.js`
- `src/run-ui.js`
- `index.html`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`
- `scripts/verify-mvp.mjs`
- `docs/CURRENT_TASK.md`
- `docs/CHANGELOG_AGENT.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
node --check src/run-ui.js
node --check src/game.js
node --check scripts/smoke-game-harness.mjs
node --check scripts/verify-speed-controls.mjs
node scripts/verify-mvp.mjs
npm run smoke:start-run
npm run smoke:boss-run
npm run agent:prepush
```

Result:

- `node --check src/run-ui.js`: passed.
- `node --check src/game.js`: passed.
- `node --check scripts/smoke-game-harness.mjs`: passed.
- `node --check scripts/verify-speed-controls.mjs`: passed.
- `node scripts/verify-mvp.mjs`: passed 167 checks.
- `npm run smoke:start-run`: passed.
- `npm run smoke:boss-run`: passed.
- `npm run smoke:debug`: passed.
- `npm run test:speed`: passed.
- `npm run agent:prepush`: passed, including content summary, browser smoke, focused smoke tests, and `npm test`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
