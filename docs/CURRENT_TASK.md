# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Split another bounded helper out of game.js

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T15:41:18.338Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `src/game.js`
- `src/level-up.js`
- `src/ui.js`
- `src/combat.js`
- `src/content.generated.js`
- `index.html`
- `scripts/verify-mvp.mjs`
- `scripts/smoke-game-harness.mjs`
- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `src/level-up.js`
- `src/game.js`
- `index.html`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`
- `scripts/verify-mvp.mjs`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`
- `docs/CURRENT_TASK.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:prepush
```

Result:

- `node --check src/level-up.js`: passed.
- `node --check src/game.js`: passed.
- `node --check scripts/smoke-game-harness.mjs`: passed.
- `node --check scripts/verify-speed-controls.mjs`: passed.
- `node scripts/verify-mvp.mjs`: passed, 105 checks.
- `npm run agent:prepush`: passed, including `content:summary`, all smoke tests, and `npm test`.
- `npm run agent:evidence -- --task "tap survivor level up extraction"`: passed and wrote `../Shane training/20260611T154549Z_tap-survivor-level-up-extraction/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
