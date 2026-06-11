# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Extract UI DOM helper

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T12:47:06.181Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `src/ui.js`
- `src/game.js`
- `index.html`
- `scripts/verify-mvp.mjs`
- `scripts/smoke-game-harness.mjs`
- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `src/ui.js`: added DOM lookup helper for game UI elements.
- `src/game.js`: now gets UI references through `TapSurvivorUi`.
- `index.html`: loads `src/ui.js` before `src/game.js`.
- `scripts/verify-mvp.mjs`: validates UI module load and wiring.
- `scripts/smoke-game-harness.mjs`: loads `src/ui.js` before `src/game.js`.
- `scripts/verify-speed-controls.mjs`: loads `src/ui.js` in the VM smoke test path.
- `docs/AGENT_CODEBASE_CONTEXT.md`: documents `src/ui.js`.
- `docs/CHANGELOG_AGENT.md`: logs the extraction.
- `docs/CURRENT_TASK.md`: updated this checkpoint.

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:prepush
```

Result:

- `node --check src/ui.js`: passed.
- `node --check src/game.js`: passed.
- `node --check scripts/smoke-game-harness.mjs`: passed.
- `node scripts/verify-mvp.mjs`: passed, 99 checks.
- `npm run agent:prepush`: passed, including `content:summary`, all smoke tests, and `npm test`.
- `npm run agent:evidence -- --task "tap survivor ui dom helper"`: passed and wrote `../Shane training/20260611T124939Z_tap-survivor-ui-dom-helper/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
