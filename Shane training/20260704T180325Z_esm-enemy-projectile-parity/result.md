# ESM Enemy/Projectile Parity Evidence

- Status: complete
- Starting HEAD: `6953b24`
- Ending HEAD: `6953b24`
- Queue task ID: `esm-enemy-projectile-parity`
- Exact parity blocker targeted: ESM enemy/projectile runtime parity

## Root Cause

- The ESM lifecycle default tick only moved the player and never invoked the existing combat/run-update path.
- Loading classic gameplay bridge scripts and resolving live bridge globals was necessary but not sufficient; without a composed run updater, enemy spawning, weapon firing, and projectile updates never ran on the ESM source/root surface.
- After wiring the run updater, source/root ESM parity is meaningful: classic and ESM both produce `2` enemies and `1` projectile on desktop and mobile.
- The rebuilt `www` surface now matches the fixed source/root runtime: both report classic `2` enemies / ESM `2` enemies and classic `1` projectile / ESM `1` projectile.

## Fix Applied

- Updated `scripts/smoke-runtime-parity-browser.mjs` to wait for the post-start state and capture observed enemy/projectile evidence.
- Added explicit production ESM imports for the preserved classic gameplay bridge scripts needed by the browser dependency bag.
- Updated `src/app/browser-dependency-bag.js` to resolve bridge namespaces live instead of snapshotting fallback adapters too early.
- Composed a real combat system, pickup system, and run updater in `src/modules/module-game-dependencies.js` when the gameplay bridge factories are present.
- Updated `src/modules/module-game-lifecycle.js` so the default lifecycle tick uses `dependencies.runUpdater.update(dt)` when available, falling back to the old movement-only tick for placeholder/readiness adapters.
- Ran `build:web` so the generated web output reflects the fixed runtime path.

## Evidence

- Enemy evidence before/after:
  - Before: classic `2`, ESM `0`
  - After on source/root desktop: classic `2`, ESM `2`
  - After on source/root mobile: classic `2`, ESM `2`
- After on built `www` desktop: classic `2`, ESM `2`
- After on built `www` mobile: classic `2`, ESM `2`
- Projectile evidence before/after:
  - Before: classic `1`, ESM `0`
  - After on source/root desktop: classic `1`, ESM `1`
  - After on source/root mobile: classic `1`, ESM `1`
- After on built `www` desktop: classic `1`, ESM `1`
- After on built `www` mobile: classic `1`, ESM `1`
- Weapon-fire audio classification impact: weapon-fire evidence is now meaningful again on both source/root and built `www`; it can be reclassified as non-diagnostic.
- Start Game audio parity preserved: yes

## Files Inspected

- `scripts/smoke-runtime-parity-browser.mjs`
- `src/app/browser-dependency-bag.js`
- `src/app/production-module-entrypoint.js`
- `src/app/compose-runtime.js`
- `src/modules/module-game-dependencies.js`
- `src/modules/module-runtime-gameplay-adapter.js`
- `src/modules/module-game-lifecycle.js`
- `src/modules/enemies.js`
- `src/modules/enemy-spawning.js`
- `src/modules/enemy-behaviors.js`
- `src/modules/weapon-fire.js`
- `src/modules/weapon-behaviors.js`
- `src/enemies.js`
- `src/enemy-spawning.js`
- `src/weapon-fire.js`
- `src/weapon-behaviors.js`
- `src/combat.js`
- `src/combat-damage.js`
- `src/weapon-projectiles.js`
- `src/weapon-targeting.js`
- `src/weapon-cooldowns.js`

## Files Changed

- `scripts/smoke-runtime-parity-browser.mjs`
- `src/app/browser-dependency-bag.js`
- `src/app/production-module-entrypoint.js`
- `src/modules/module-game-dependencies.js`
- `src/modules/module-game-lifecycle.js`
- `Shane training/20260704T180325Z_esm-enemy-projectile-parity/result.md`
- `.agent/tasks.json`
- `www/**`: regenerated in place by `build:web`; no tracked git diff surfaced

## Production / Scope

- Production `index.html` changed: no
- Production runtime behaviour changed: yes, source/root ESM runtime now invokes the existing combat/run-update path.
- Classic fallback preserved: yes
- Globals retired: no
- Global boundary impact: preserved classic bridge globals are still used through the approved browser dependency boundary; no global retirement.
- Android/web parity impact: source/root web parity improved; built `www` remains stale and was not edited because `www/**` is forbidden scope.

## Validation Commands / Results

- `node --check scripts/smoke-runtime-parity-browser.mjs`: pass
- `node --check src/app/browser-dependency-bag.js`: pass
- `node --check src/app/production-module-entrypoint.js`: pass
- `node --check src/modules/module-game-dependencies.js`: pass
- `node --check src/modules/module-game-lifecycle.js`: pass
- `npm run frank:run -- "npm run build:web" --timeout 240`: pass
- `npm run frank:run -- "npm run smoke:runtime-parity:browser" --timeout 700`: pass; source/root and built `www` both match classic enemy/projectile evidence
- `npm run frank:run -- "npm run smoke:runtime-parity:browser:strict" --timeout 700`: pass
- `npm run frank:run -- "npm run smoke:module-runtime-readiness" --timeout 60`: pass
- `npm run frank:run -- "npm run smoke:module-production-entrypoint" --timeout 60`: pass
- `npm run frank:run -- "npm run check:runtime-parity" --timeout 240`: pass
- `npm run frank:run -- "npm run agent:check -- --fix-format-changed" --timeout 240`: pass
- `git diff --check`: pass
- `npm run task:validate`: pass
- `npm run agent:status`: pass
- `npm run agent:handoff`: pass

## Usage Report

- Ledger path: `/home/logix/.openclaw/frank-usage/usage.jsonl`
- Mission: `esm-enemy-projectile-parity`
- `tokens_known`: unknown
- Token delta: unknown
- Usage snapshot status: best-effort only; start/end snapshots still warned `EROFS`, report command succeeded with no usage text captured

## Remaining Blockers After This Mission

- Weapon-fire audio can now be reclassified using the rebuilt parity evidence
- Global retirement remains blocked
- Fallback cleanup remains blocked

## Next Recommended Mission

- Reclassify weapon-fire audio, then decide whether the remaining global/fallback cleanup should stay deferred.
