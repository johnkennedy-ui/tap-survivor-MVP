# Projectile Speed Skills

## Request

Add faster and slower projectile skills. Faster projectiles should do less damage and fire faster. Slower projectiles should fire slower and deal 3x base damage on hit. Wire them in and ensure relic skills still work as intended.

## Scope

- Gameplay/content slice only.
- No Android signing, Play Console, ads, billing, or architecture changes.
- Add two run skills and matching relic coverage.
- Keep existing relic system behavior intact.

## Files changed

- `content/tap-survivor-content.json`
- `src/content.generated.js`
- `src/weapon-fire.js`
- `scripts/smoke-start-run.mjs`
- `assets/generated/tower/sprites/relics/haste_projectiles_focus_relic.svg`
- `assets/generated/tower/sprites/relics/haste_projectiles_mastery_relic.svg`
- `assets/generated/tower/sprites/relics/heavy_projectiles_focus_relic.svg`
- `assets/generated/tower/sprites/relics/heavy_projectiles_mastery_relic.svg`

## Implementation

- Added `run_haste_projectiles`: projectile speed x1.65, cooldown x0.65, projectile damage x0.7.
- Added `run_heavy_projectiles`: projectile speed x0.55, cooldown x1.45, projectile damage x3.
- Added two relics for each new run skill so the relic selection/start-tier/max-tier path remains covered.
- Added unique relic SVG icons.
- Extended weapon-fire runtime so projectile-only skills can modify projectile speed, cooldown, and damage without affecting beams, cones, areas, mines, or radial weapons.
- Expanded start-run smoke coverage to prove fast/slow projectile velocity, cooldown, and damage behavior.

## Validation

- `node --check src/weapon-fire.js`: PASS
- `node --check scripts/smoke-start-run.mjs`: PASS
- `npm run build:content`: PASS
- `npm run validate:content`: PASS
- `npm run smoke:start-run`: PASS
- `npm run verify:relics`: PASS
- `npm run agent:check`: PASS
- `npm test`: PASS, all 271 MVP checks plus speed-control test passed
- `git diff --check`: PASS

## Result

SUCCESS: projectile speed/damage/fire-rate run skills are wired and validated, and relic skill coverage still passes.
