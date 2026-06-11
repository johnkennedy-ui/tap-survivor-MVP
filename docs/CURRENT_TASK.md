# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Extract shared runtime math helpers

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T11:12:37.595Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `index.html`
- `src/game.js`
- `src/rendering.js`
- `src/math.js`
- `scripts/verify-mvp.mjs`
- `scripts/verify-speed-controls.mjs`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `src/math.js`: added shared `clamp`, `distance`, `formatTime`, and `randomRange` helpers.
- `index.html`: loads `src/math.js` before runtime modules that use it.
- `src/game.js`: uses `TapSurvivorMath` instead of local duplicate helpers.
- `src/rendering.js`: uses `TapSurvivorMath.clamp` instead of a local duplicate helper.
- `scripts/verify-mvp.mjs`: validates the new shared math module and script load.
- `scripts/verify-speed-controls.mjs`: loads the math module in the VM smoke test.
- `docs/AGENT_CODEBASE_CONTEXT.md`: documents `src/math.js`.
- `docs/CHANGELOG_AGENT.md`: logs the extraction.
- `docs/CURRENT_TASK.md`: updated this checkpoint.

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `node --check src/math.js`: passed.
- `node --check src/game.js`: passed.
- `node --check src/rendering.js`: passed.
- `node scripts/verify-mvp.mjs`: passed, 87 checks.
- `npm run agent:check`: passed, including `npm test`.
- `npm run agent:evidence -- --task "tap survivor shared math helpers"`: passed and wrote `../Shane training/20260611T111759Z_tap-survivor-shared-math-helpers/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
