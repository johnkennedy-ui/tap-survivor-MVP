# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Extract enemy lifecycle helper

## Status

- State: validated; ready to push/report
- Started: 2026-06-13T09:27:44.211Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `src/enemies.js`
- `src/combat.js`
- `index.html`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`
- `scripts/verify-mvp.mjs`
- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `src/enemies.js`
- `src/combat.js`
- `index.html`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`
- `scripts/verify-mvp.mjs`
- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
node --check src/enemies.js && node --check src/combat.js && node scripts/verify-mvp.mjs && npm run smoke:start-run && npm run smoke:boss-run && npm run test:speed && npm run agent:prepush
```

Result:

- `node --check src/enemies.js`: passed.
- `node --check src/combat.js`: passed.
- `node scripts/verify-mvp.mjs`: passed 180 checks.
- `npm run smoke:start-run`: passed.
- `npm run smoke:boss-run`: passed.
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
