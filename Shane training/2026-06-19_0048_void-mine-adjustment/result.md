# Void Mine Adjustment

## Request

Adjust existing weapons instead of adding new weapons. First slice: make Void Mine spawn mines behind the player, delay for 2 seconds, then explode. Mine spawn timing and area should be affected by upgrades and relics.

## Scope

Completed Void Mine only. No new weapons were added.

## Files Changed

- `content/tap-survivor-content.json`
- `src/content.generated.js`
- `src/run-update.js`
- `src/weapon-behaviors.js`
- `scripts/smoke-start-run.mjs`

## Behavior

- Void Mine now drops behind the player's movement/facing direction.
- The mine arms for 2 seconds, then explodes once.
- Mine spawn rate continues to use weapon cooldown scaling, so fire-rate upgrades/relic effects affect how often mines spawn.
- Mine explosion area uses existing `weaponReach` scaling, so attack-radius upgrades and relic effects affect blast size.
- Player movement now stores facing direction for behind-player weapon placement.

## Validation

Passed:

- `node --check src/weapon-behaviors.js`
- `node --check src/run-update.js`
- `node --check scripts/smoke-start-run.mjs`
- `npm run build:content`
- `npm run validate:content`
- `npm run smoke:start-run`
- `npm run check:format-hygiene`
- `npm test`
- `git diff --check`

## Result

SUCCESS: Void Mine now behaves as a delayed behind-player mine with smoke coverage for spawn position, delay, upgrade/relic-scaled area, and delayed explosion.
