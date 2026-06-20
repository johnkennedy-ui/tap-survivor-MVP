# Enemy Offscreen Spawn Slice

## Request

User asked to split the broader enemy-spawn/monster-behavior task. This evidence covers slice 1 only: make normal enemies spawn from off screen, without doing the monster behavior split.

## Scope

- Changed normal enemy spawn positioning in `src/enemies.js`.
- Added a focused smoke assertion in `scripts/smoke-start-run.mjs`.
- Did not change monster behavior ownership, rendering, save schema, content data, Android files, or generated runtime output.

## Files Inspected

- `src/enemies.js`
- `scripts/smoke-start-run.mjs`
- `scripts/smoke-game-harness.mjs`
- `src/run-update.js`
- `src/game.js`
- `docs/skills/mechanics-extension.md`
- `docs/MECHANIC_EXTENSION_GUIDE.md`

## Files Changed

- `src/enemies.js`
- `scripts/smoke-start-run.mjs`
- `.agent/status.md`

## Implementation

- Replaced clamped in-canvas spawn positions with positions projected to an expanded canvas edge.
- Added `spawnEntryMargin` defaulting to 72 pixels so enemies begin beyond the visible playfield and have room to move in.
- Kept the existing wave angle/pattern selection so spawn pressure still surrounds the player, but all normal enemies now enter from outside the canvas.
- Added a smoke check that starts a real run and asserts every normal spawned enemy begins outside the canvas bounds.

## Validation

Passed:

- `node --check src/enemies.js`
- `node --check scripts/smoke-start-run.mjs`
- `npm run smoke:start-run`
- `npm run format:check`
- `npm test`
- `git diff --check`
- `npm run agent:check`

## Remaining Caveats

- This slice does not extract monster behaviors. That remains slice 2.
- Boss spawn entry behavior was not changed.
