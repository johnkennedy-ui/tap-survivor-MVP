# Game Runtime Split

## Request

User said "Continue" after the previous Tap Survivor source-file split sequence.

## Scope

- Extract one cohesive helper from `src/game.js`.
- Preserve current public globals and browser script loading.
- Keep changes local; no commit or push requested.

## Files Changed In This Slice

- `src/game-runtime.js` added.
- `src/game.js` now delegates speed controls, reset save, first-move gate binding, lifecycle flush binding, and runtime initialization.
- `index.html` loads `src/game-runtime.js` before `src/game.js`.
- `scripts/smoke-game-harness.mjs`, `scripts/verify-mvp.mjs`, and `scripts/verify-speed-controls.mjs` load/check the new helper.
- `.agent/status.md` updated.

## Validation

- `node --check src/game-runtime.js`: pass
- `node --check src/game.js`: pass
- `node --check scripts/verify-mvp.mjs`: pass
- `npm run verify:script-order`: pass
- `npm run smoke:start-run`: pass
- `npm run check:format-hygiene`: pass
- `npm test`: pass
- `npm run agent:check`: pass

## Notes

- First `npm test` attempt failed because `verify-speed-controls.mjs` had not loaded the new runtime helper. Fixed by adding `src/game-runtime.js` to that VM harness.
- The first `npm run agent:check` attempt was interrupted by a new Telegram message before completion; rerun passed.
- `src/game.js` is now 431 lines and `src/game-runtime.js` is 148 lines.

## Result

SUCCESS: local split completed and validated.
