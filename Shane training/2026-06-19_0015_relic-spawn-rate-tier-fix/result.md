# Relic Spawn Rate Tier Fix

## Request

User requested that the larger weapon/relic task be split, with the relic requirement:

- Tier 1 named-upgrade relics spawn their linked upgrade at 2x.
- Tier 2 named-upgrade relics spawn their linked upgrade at 3x.
- Tier 3 named-upgrade relics spawn their linked upgrade at 5x.

## Scope

Completed task 1 only: relic named-upgrade spawn-rate behavior and verification. No new weapons were added in this slice.

## Files Changed

- `src/level-up.js`
- `content/tap-survivor-content.json`
- `src/content.generated.js`
- `scripts/verify-focus.mjs`
- `scripts/verify-mvp.mjs`

## Behavior

Level-up choice weighting now multiplies the linked upgrade's existing choice weight by the equipped relic's tiered spawn-rate multiplier. Content now uses:

- `selectionWeightBonus: 2` for tier 1 relics
- `selectionWeightBonus: 3` for tier 2 relics
- `selectionWeightBonus: 5` for tier 3 relics

Multiple equipped relics for the same named upgrade multiply together.

## Validation

Passed:

- `node --check src/level-up.js`
- `node --check scripts/verify-focus.mjs`
- `node --check scripts/verify-mvp.mjs`
- `npm run build:content`
- `npm run validate:content`
- `npm run verify:relics`
- `npm run smoke:relic-run-start`
- `npm run check:format-hygiene`
- `npm test`
- `git diff --check`

## Result

SUCCESS: relic named-upgrade spawn rates are now tiered and verifier-covered. Weapon additions remain a separate next task.
