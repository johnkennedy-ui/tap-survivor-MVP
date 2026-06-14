# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Add boss spawn warning and shield projectile block

## Status

- State: in progress
- Started: 2026-06-14T15:07:37.855Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`
- `src/enemies.js`
- `src/weapon-fire.js`
- `src/run-state.js`
- `src/rendering.js`
- `scripts/verify-mvp.mjs`

## Files Changed

- `src/enemies.js`
- `src/weapon-fire.js`
- `src/run-state.js`
- `src/rendering.js`
- `scripts/verify-mvp.mjs`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`
- `docs/CURRENT_TASK.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `npm run build:content`: passed.
- `node --check src/enemies.js src/weapon-fire.js src/rendering.js src/run-state.js`: passed.
- `node scripts/verify-mvp.mjs`: passed 194 checks.
- Focused VM check: shield pulse clears enemy bolts, charges the block, charged block absorbs one enemy projectile, and boss random spawn state exists.
- `npm run smoke:boss-run`: passed.
- `npm run smoke:start-run`: passed.
- `npm test`: passed.
- `npm run agent:prepush`: passed.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
