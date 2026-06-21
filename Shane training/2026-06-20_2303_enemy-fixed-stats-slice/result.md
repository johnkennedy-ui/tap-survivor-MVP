# Enemy Fixed Stats Slice

## Request

Slice 2 from the enemy progression task: normal enemies should have fixed HP and move speed.

## Scope

- Runtime change only for normal enemy spawn construction.
- Boss HP/speed scaling remains unchanged.
- Suitability guard and projectile radius/color runtime wiring remain later slices.

## Files Changed

- `src/enemies.js`
- `scripts/smoke-start-run.mjs`
- `.agent/status.md`

## Implementation

- Changed normal enemy construction from elapsed/floor-scaled HP and elapsed-scaled movement speed to direct content values:
  - `hp: type.hp`
  - `speed: type.speed`
- Left enemy damage scaling by tower floor unchanged.
- Left boss scaling unchanged.
- Added smoke coverage proving the first normal spawned enemy uses fixed content HP/speed.

## Validation

Passed:

- `node --check src/enemies.js`
- `node --check scripts/smoke-start-run.mjs`
- `npm run smoke:start-run`
- `npm test`
- `npm run agent:check`
- `git diff --check`

## Notes

- Existing generated content stayed aligned because `npm test` rebuilt and validated content.
- This slice does not yet enforce stricter configured-wave suitability beyond existing `minTowerFloor` filtering.
