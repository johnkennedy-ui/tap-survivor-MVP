# Enemy Suitability Guard Slice

## Request

Slice 3 from the enemy progression task: tighten/update checks so configured level waves only use enemies unlocked for the current tower floor, and add verifier coverage that each tower floor introduces a new enemy.

## Scope

- Runtime guard for normal enemy type selection.
- Focused smoke coverage for tower-floor eligibility.
- Verifier coverage for floor 1-8 enemy introductions.
- No visual tint/palette runtime changes in this slice.

## Files Changed

- `src/enemies.js`
- `scripts/smoke-start-run.mjs`
- `scripts/verify-mvp.mjs`
- `scripts/check-format-hygiene.mjs`
- `.agent/status.md`

## Implementation

- `spawnEnemies()` now resolves eligible enemy types once per spawn cycle and returns without spawning if none are eligible.
- `chooseEnemyType()` now safely returns `null` for an empty candidate list.
- `spawnEnemy()` now no-ops for a null type.
- `levelEnemyTypes()` keeps filtering configured wave IDs through `isEnemyAvailable(type, game)`.
- Start-run smoke now verifies:
  - floor 1 spawns only `drifter`
  - floor 4 excludes floor 5+ enemies
- MVP verifier now checks:
  - tower floors 1 through 8 each introduce at least one enemy
  - all 8 expected enemy type IDs exist

## Validation

Passed:

- `node --check src/enemies.js`
- `node --check scripts/smoke-start-run.mjs`
- `node --check scripts/verify-mvp.mjs`
- `npm run smoke:start-run`
- `node scripts/verify-mvp.mjs`
- `npm test`
- `npm run check:format-hygiene`
- `npm run agent:check`
- `git diff --check`

## Notes

- `npm run agent:check` initially failed because `scripts/verify-mvp.mjs` line-number allowances in `scripts/check-format-hygiene.mjs` needed updating after verifier assertions moved. The allowance map was updated and `agent:check` passed.
