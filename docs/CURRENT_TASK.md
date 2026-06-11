# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Add debug balance overlay

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T22:38:21.000Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `src/game.js`
- `src/debug.js`
- `src/ui.js`
- `src/styles.css`
- `index.html`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`
- `scripts/verify-mvp.mjs`
- `docs/CURRENT_TASK.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `src/game.js`
- `src/debug.js`
- `src/ui.js`
- `src/styles.css`
- `index.html`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`
- `scripts/verify-mvp.mjs`
- `docs/CURRENT_TASK.md`
- `docs/CHANGELOG_AGENT.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
node --check src/debug.js
node --check src/game.js
node --check src/ui.js
node scripts/verify-mvp.mjs
npm run smoke:start-run
npm run agent:prepush
```

Result:

- `node --check src/debug.js`: passed.
- `node --check src/game.js`: passed.
- `node --check src/ui.js`: passed.
- `node --check scripts/smoke-game-harness.mjs`: passed.
- `node --check scripts/verify-speed-controls.mjs`: passed.
- `node --check scripts/verify-mvp.mjs`: passed.
- `node scripts/verify-mvp.mjs`: passed 151 checks.
- `npm run smoke:start-run`: passed.
- `npm run test:speed`: passed.
- `npm run agent:prepush`: passed, including content summary, optional browser smoke, focused smoke tests, and `npm test`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
