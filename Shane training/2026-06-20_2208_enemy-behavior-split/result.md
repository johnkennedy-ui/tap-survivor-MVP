# Enemy Behavior Split

## Request

Slice 2 of the enemy work: split monster behavior similarly to the weapon behavior helper split, so future enemies can be added more easily.

## Scope

- One bounded maintainability split for enemy behavior.
- Preserve `src/enemies.js` as the public enemy integration point.
- Do not add new enemy mechanics, content, save changes, Android changes, or generated runtime output.

## Files Inspected

- `src/enemies.js`
- `index.html`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-mvp.mjs`
- `scripts/verify-speed-controls.mjs`
- `scripts/check-format-hygiene.mjs`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/skills/file-split-maintainability.md`

## Files Changed

- `src/enemy-behaviors.js`
- `src/enemies.js`
- `index.html`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`
- `scripts/verify-mvp.mjs`
- `scripts/check-format-hygiene.mjs`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `.agent/status.md`

## Implementation

- Added `TapSurvivorEnemyBehaviors.createEnemyBehaviorSystem`.
- Moved enemy movement, contact damage, ranged enemy shooting, boss charge movement, boss attack hit resolution, and enemy-bolt updating into `src/enemy-behaviors.js`.
- Left enemy spawning, level enemy selection, offscreen spawn placement, boss creation, boss ability selection, and boss special orchestration in `src/enemies.js`.
- Updated browser and VM script load order so `enemy-behaviors.js` loads before `enemies.js`.
- Updated verifier and docs so the new helper ownership is explicit.

## Validation

Passed:

- `node --check src/enemy-behaviors.js`
- `node --check src/enemies.js`
- `node --check scripts/smoke-game-harness.mjs`
- `node --check scripts/verify-speed-controls.mjs`
- `node --check scripts/verify-mvp.mjs`
- `node --check scripts/check-format-hygiene.mjs`
- `npm run verify:script-order`
- `npm run smoke:start-run`
- `npm run smoke:boss-run`
- `npm run format:check`
- `npm run check:format-hygiene`
- `npm test`
- `git diff --check`
- `npm run agent:check`

## Notes

- First `npm test` failed only because verifier snippet checks still looked in `src/enemies.js` for behavior tokens that were moved into `src/enemy-behaviors.js`; the verifier was updated and the rerun passed.
- Behavior changed: no intended gameplay behavior change in slice 2.
