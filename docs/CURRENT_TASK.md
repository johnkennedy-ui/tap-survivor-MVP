# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Give super bosses two abilities

## Status

- State: validated locally
- Started: 2026-06-14T16:02:37.506Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`
- `index.html`
- `src/enemies.js`
- `src/rendering.js`
- `scripts/verify-mvp.mjs`

## Files Changed

- `index.html`
- `src/enemies.js`
- `src/rendering.js`
- `scripts/verify-mvp.mjs`
- `docs/CHANGELOG_AGENT.md`
- `docs/CURRENT_TASK.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `node --check src/enemies.js src/rendering.js`: passed.
- `node scripts/verify-mvp.mjs`: passed 200 checks.
- Focused VM check: floor-5 super bosses roll two different abilities, charger combos create slash attacks, and turret combos fire bolts.
- `npm test`: passed.
- `npm run agent:prepush`: passed.
- Evidence: `../Shane training/20260614T160635Z_super-boss-dual-abilities/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
