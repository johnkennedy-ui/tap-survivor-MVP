# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Extract sprite loading helper

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T11:31:40.990Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `src/sprites.js`
- `src/game.js`
- `index.html`
- `scripts/verify-mvp.mjs`
- `scripts/verify-speed-controls.mjs`
- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `src/sprites.js`: added shared sprite loading and canvas draw helper.
- `src/game.js`: removed local sprite registry/draw helpers and uses `TapSurvivorSprites`.
- `index.html`: loads `src/sprites.js` before runtime modules that use it.
- `scripts/verify-mvp.mjs`: validates sprite module load and helper wiring.
- `scripts/verify-speed-controls.mjs`: loads the sprite module in the VM smoke test.
- `docs/AGENT_CODEBASE_CONTEXT.md`: documents `src/sprites.js`.
- `docs/CHANGELOG_AGENT.md`: logs the extraction.
- `docs/CURRENT_TASK.md`: updated this checkpoint.

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `node --check src/sprites.js`: passed.
- `node --check src/game.js`: passed.
- `node scripts/verify-mvp.mjs`: passed, 90 checks.
- `npm run test:speed`: passed.
- `npm run agent:check`: passed, including `npm test`.
- `npm run agent:evidence -- --task "tap survivor sprite helper extraction"`: passed and wrote `../Shane training/20260611T113402Z_tap-survivor-sprite-helper-extraction/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
