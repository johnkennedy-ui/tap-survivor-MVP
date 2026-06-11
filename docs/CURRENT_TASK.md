# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Add projectile skill upgrades and specialization weighting

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T18:33:25.000Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `content/tap-survivor-content.json`
- `src/content.generated.js`
- `src/combat.js`
- `src/level-up.js`
- `src/upgrades.js`
- `scripts/verify-mvp.mjs`
- `docs/CURRENT_TASK.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `content/tap-survivor-content.json`
- `src/content.generated.js`
- `src/combat.js`
- `src/level-up.js`
- `src/upgrades.js`
- `scripts/verify-mvp.mjs`
- `docs/CURRENT_TASK.md`
- `docs/CHANGELOG_AGENT.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run build:content
npm run validate:content
npm run agent:prepush
```

Result:

- `npm run build:content`: passed.
- `npm run validate:content`: passed.
- `node --check src/combat.js`: passed.
- `node --check src/level-up.js`: passed.
- `node --check src/upgrades.js`: passed.
- `node scripts/verify-mvp.mjs`: passed 127 checks.
- `npm run agent:prepush`: passed, including content summary, optional browser smoke, focused smoke tests, and `npm test`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
