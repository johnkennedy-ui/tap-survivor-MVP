# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Add weapon animation and weapon slot relics

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T21:50:19.000Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `src/game.js`
- `src/combat.js`
- `src/rendering.js`
- `src/level-up.js`
- `content/tap-survivor-content.json`
- `src/content.generated.js`
- `scripts/content-summary.mjs`
- `scripts/verify-mvp.mjs`
- `docs/CURRENT_TASK.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `src/game.js`
- `src/combat.js`
- `src/rendering.js`
- `src/level-up.js`
- `content/tap-survivor-content.json`
- `src/content.generated.js`
- `scripts/content-summary.mjs`
- `scripts/verify-mvp.mjs`
- `docs/CURRENT_TASK.md`
- `docs/CHANGELOG_AGENT.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run build:content
node --check src/game.js
node --check src/combat.js
node --check src/rendering.js
node --check src/level-up.js
node scripts/verify-mvp.mjs
npm run agent:prepush
```

Result:

- `npm run build:content`: passed.
- `node --check src/game.js`: passed.
- `node --check src/combat.js`: passed.
- `node --check src/rendering.js`: passed.
- `node --check src/level-up.js`: passed.
- `npm run validate:content`: passed.
- `node scripts/verify-mvp.mjs`: passed 146 checks.
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
