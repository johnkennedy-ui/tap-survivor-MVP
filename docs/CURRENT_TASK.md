# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Make relics grant starting run-upgrade tiers

## Status

- State: validated locally
- Started: 2026-06-15T10:58:13.000Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `content/tap-survivor-content.json`
- `src/content.generated.js`
- `src/relics.js`
- `src/game.js`
- `scripts/content-tools.mjs`
- `scripts/verify-mvp.mjs`

## Files Changed

- `content/tap-survivor-content.json`
- `src/content.generated.js`
- `src/relics.js`
- `src/game.js`
- `scripts/content-tools.mjs`
- `scripts/verify-mvp.mjs`
- `docs/CURRENT_TASK.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `npm run build:content`: passed.
- `npm run validate:content`: passed.
- `node scripts/verify-mvp.mjs`: passed 252 checks, including relic run-start bonuses.
- `npm run smoke:relic-run-start`: passed.
- `npm run agent:prepush`: passed; cache keys bumped for generated content, game, and relics.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
