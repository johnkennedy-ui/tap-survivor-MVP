# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Tighten menu and fullscreen UI

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T19:55:18.000Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `index.html`
- `src/ui.js`
- `src/game.js`
- `src/styles.css`
- `scripts/browser-smoke.html`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`
- `scripts/verify-mvp.mjs`
- `docs/CURRENT_TASK.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `index.html`
- `src/ui.js`
- `src/game.js`
- `src/styles.css`
- `scripts/browser-smoke.html`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`
- `scripts/verify-mvp.mjs`
- `docs/CURRENT_TASK.md`
- `docs/CHANGELOG_AGENT.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
node --check src/game.js
node scripts/verify-mvp.mjs
npm run smoke:browser
npm run agent:prepush
```

Result:

- `node --check src/game.js`: passed.
- `node --check src/ui.js`: passed.
- `node --check scripts/verify-mvp.mjs`: passed.
- `node scripts/verify-mvp.mjs`: passed 136 checks.
- `npm run smoke:browser`: passed as optional; local Chromium unavailable in this sandbox, so it skipped non-required real-browser execution.
- `npm run smoke:start-run`: passed.
- `npm run agent:prepush`: passed, including content summary, optional browser smoke, focused smoke tests, and `npm test`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
