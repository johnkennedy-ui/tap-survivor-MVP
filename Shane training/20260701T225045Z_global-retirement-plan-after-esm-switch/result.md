# Global Retirement Plan After ESM Switch

- Mission ID: `global-retirement-plan-after-esm-switch`
- Starting HEAD: `db4601c`
- Current HEAD at plan creation: `db4601c`
- Actions status for `db4601c`: unavailable
- Actions evidence: one GitHub Actions API lookup for `head_sha=db4601c` returned HTTP 200 with an empty `workflow_runs` list. Treat implementation as blocked until a green Actions result exists for the switched baseline.

## Production ESM State

- `index.html` selects `src/app/production-module-autoboot.js` with `type="module"`.
- `index.html` no longer selects `src/game.js`.
- `index.html` no longer selects `src/game-dependencies.js`.
- `index.html` still selects the generated shell bridge tags:
  - `src/shell-relic-ui.js?v=auto-shell-helpers`
  - `src/shell-ui.js?v=auto-b114267e`
- `src/app/production-module-autoboot.js` imports `bootProductionModuleRuntime` and calls it directly.
- `src/app/production-module-entrypoint.js` composes the browser dependency bag, browser platform, module-native dependency bag, and module game lifecycle owner.

## Classic Fallback State

- Classic fallback files are preserved.
- No classic runtime files were deleted in this mission.
- No globals were retired in this mission.
- `src/game.js` remains a preserved classic fallback entrypoint.
- `src/game-dependencies.js` remains a generated classic dependency bridge.
- The classic fallback files genuinely unused by production `index.html` include the old classic game entrypoint and dependency bridge plus the non-shell classic publisher files under `src/` that publish `TapSurvivor*` globals.
- The generated shell bridge files are not genuinely unused by `index.html` because their script tags are still present, although the ESM entrypoint smoke currently proves the module boot path itself publishes no `TapSurvivor*` globals.

## Fallback Files Still Useful

- `src/game.js`: useful for rollback to the classic entrypoint without rebuilding the old runtime from history.
- `src/game-dependencies.js`: useful for rollback because `src/game.js` depends on the generated classic dependency bag.
- Generated classic publisher files under `src/`: useful for rollback/test parity if the old classic script order is restored.
- `src/shell-relic-ui.js` and `src/shell-ui.js`: still selected by `index.html` for the deterministic generated bridge inventory used by readiness checks.
- `src/modules/game-dependencies.js`: source for the generated dependency bridge; useful while classic fallback support remains a supported rollback path.

## Global Publisher Inventory

The focused source scan found 55 distinct `TapSurvivor*` globals published by classic/generated fallback sources.

- `TapSurvivorAssets`: `src/assets.js:59`
- `TapSurvivorAudio`: `src/audio.js:153`
- `TapSurvivorBalance`: `src/balance.js:35`
- `TapSurvivorBalanceProfiles`: `src/content.generated.js:7618`
- `TapSurvivorBalanceRuntime`: `src/balance-runtime.js:454`
- `TapSurvivorCombat`: `src/combat.js:113`
- `TapSurvivorCombatDamage`: `src/combat-damage.js:109`
- `TapSurvivorContent`: `src/balance-runtime.js:361`, `src/content.generated.js:2`
- `TapSurvivorContentRegistry`: `src/content-registry.js:43`
- `TapSurvivorContentSchema`: `src/content.generated.js:7311`
- `TapSurvivorDebug`: `src/debug.js:91`
- `TapSurvivorDebugBalance`: `src/balance-runtime.js:455`
- `TapSurvivorEffects`: `src/effects.js:100`
- `TapSurvivorEnemies`: `src/enemies.js:237`
- `TapSurvivorEnemyBehaviors`: `src/enemy-behaviors.js:237`
- `TapSurvivorEnemySpawning`: `src/enemy-spawning.js:143`
- `TapSurvivorGameBanners`: `src/game-banners.js:64`
- `TapSurvivorGameDependencies`: `src/game-dependencies.js:84`
- `TapSurvivorGameRuntime`: `src/game-runtime.js:155`
- `TapSurvivorInput`: `src/input.js:32`
- `TapSurvivorLevelUp`: `src/level-up.js:171`
- `TapSurvivorLevelUpChoices`: `src/level-up-choices.js:60`
- `TapSurvivorMapSystem`: `src/map-system.js:126`
- `TapSurvivorMath`: `src/math.js:50`
- `TapSurvivorPickups`: `src/pickups.js:150`
- `TapSurvivorProgression`: `src/progression.js:93`
- `TapSurvivorQuests`: `src/quests.js:73`
- `TapSurvivorRelics`: `src/relics.js:134`
- `TapSurvivorRenderEnemies`: `src/render-enemies.js:184`
- `TapSurvivorRenderHud`: `src/render-hud.js:113`
- `TapSurvivorRendering`: `src/rendering.js:344`
- `TapSurvivorRenderSkillRail`: `src/render-skill-rail.js:239`
- `TapSurvivorRunLifecycle`: `src/run-lifecycle.js:114`
- `TapSurvivorRunState`: `src/run-state.js:113`
- `TapSurvivorRunUi`: `src/run-ui.js:79`
- `TapSurvivorRunUpdate`: `src/run-update.js:105`
- `TapSurvivorSave`: `src/save.js:113`
- `TapSurvivorSaveCorruption`: `src/save-corruption.js:62`
- `TapSurvivorSaveDefaults`: `src/save-defaults.js:31`
- `TapSurvivorSaveMigrations`: `src/save-migrations.js:70`
- `TapSurvivorSaveNormalize`: `src/save-normalize.js:145`
- `TapSurvivorShellRelicUi`: `src/shell-relic-ui.js:665`
- `TapSurvivorShellUi`: `src/shell-ui.js:802`
- `TapSurvivorShop`: `src/shop.js:137`
- `TapSurvivorShopPricing`: `src/shop-pricing.js:84`
- `TapSurvivorSprites`: `src/sprites.js:211`
- `TapSurvivorStorage`: `src/storage-adapter.js:212`
- `TapSurvivorUi`: `src/ui.js:89`
- `TapSurvivorUiProgression`: `src/ui-progression.js:122`
- `TapSurvivorUpgrades`: `src/upgrades.js:43`
- `TapSurvivorWeaponBehaviors`: `src/weapon-behaviors.js:315`
- `TapSurvivorWeaponCooldowns`: `src/weapon-cooldowns.js:158`
- `TapSurvivorWeaponFire`: `src/weapon-fire.js:152`
- `TapSurvivorWeaponProjectiles`: `src/weapon-projectiles.js:241`
- `TapSurvivorWeaponTargeting`: `src/weapon-targeting.js:27`

Production-selected publisher subset from `index.html` today:

- `TapSurvivorShellRelicUi`: `src/shell-relic-ui.js:665`
- `TapSurvivorShellUi`: `src/shell-ui.js:802`

## Global Consumer Inventory

Direct or classic compatibility consumers found in the focused source scan:

- `src/game.js`: consumes `TapSurvivorGameDependencies` as the classic fallback entrypoint.
- `src/game-dependencies.js`: generated classic bridge consuming the full classic dependency set from `globalRef`.
- `src/modules/game-dependencies.js`: source for the generated classic bridge, consuming the same classic dependency set from `globalRef`.
- `src/assets.js`: consumes `TapSurvivorContent` as a classic fallback default.
- `src/balance-runtime.js`: consumes `TapSurvivorContent` and `TapSurvivorBalanceProfiles` as classic fallback defaults.
- `src/effects.js`: consumes `TapSurvivorContentSchema` as a classic fallback default.
- `src/save.js`: consumes `TapSurvivorSaveNormalize`, `TapSurvivorSaveCorruption`, and `TapSurvivorStorage` as classic fallback defaults.
- `src/upgrades.js`: consumes `TapSurvivorContent` and `TapSurvivorEffects` as classic fallback defaults.
- `src/app/browser-dependency-bag.js`: retains dynamic string-key namespace bridge lookups for gameplay/progression systems: `TapSurvivorCombat`, `TapSurvivorEnemies`, `TapSurvivorEnemyBehaviors`, `TapSurvivorEnemySpawning`, `TapSurvivorWeaponBehaviors`, `TapSurvivorWeaponFire`, `TapSurvivorLevelUp`, `TapSurvivorProgression`, `TapSurvivorQuests`, `TapSurvivorShop`, `TapSurvivorUiProgression`, and `TapSurvivorUpgrades`.

The ESM entrypoint files inspected directly do not contain direct `globalThis.TapSurvivor*` or `window.TapSurvivor*` reads:

- `src/app/production-module-autoboot.js`
- `src/app/production-module-entrypoint.js`

## Approved Compatibility/Bootstrap Boundaries

- Preserved classic fallback boundary: `src/game.js`.
- Generated classic dependency bridge boundary: `src/game-dependencies.js`.
- Source bridge boundary for generated classic dependency bridge: `src/modules/game-dependencies.js`.
- Existing readiness-approved compatibility boundary files: generated bridge files, `src/assets.js`, `src/balance-runtime.js`, `src/game.js`, and `src/upgrades.js`.
- Production bootstrap boundary: `src/app/production-module-autoboot.js`, but it currently publishes no `TapSurvivor*` globals and has no direct `TapSurvivor*` global reads.
- Production ESM entrypoint boundary: `src/app/production-module-entrypoint.js`, but it currently publishes no `TapSurvivor*` globals and has no direct `TapSurvivor*` global reads.

## Unapproved Global Consumers

- No direct unapproved `globalThis.TapSurvivor*`, `window.TapSurvivor*`, or `globalRef.TapSurvivor*` production ESM consumer reads were found in the inspected production entrypoint/autoboot/module-native files.
- `src/app/browser-dependency-bag.js` remains a transitional dynamic namespace bridge. It is not a direct `globalThis.TapSurvivor*` read, but it can consult `globalRef[TapSurvivor...]` by string. Treat this as missing global-retirement coverage and a Phase 1/2 cleanup target before retiring matching publisher globals.

## Existing Smoke/Check Coverage

- `scripts/smoke-module-runtime-readiness.mjs`
  - Verifies `index.html` selects `src/app/production-module-autoboot.js`.
  - Verifies `index.html` does not select `src/game.js` or `src/game-dependencies.js`.
  - Verifies the production ESM entrypoint, module game lifecycle owner, module-native dependency bag, browser dependency bag factory, state store, and runtime adapters have no direct `TapSurvivor*` global reads.
  - Tracks compatibility globals and approved compatibility boundary reads.
  - Keeps the remaining blockers scoped to classic fallback preservation and global retirement.
- `scripts/smoke-module-production-entrypoint.mjs`
  - Imports and boots the ESM production entrypoint.
  - Verifies the entrypoint and autoboot wrapper contain no classic direct `TapSurvivor*` global reads.
  - Verifies explicit and default browser boots publish no `TapSurvivor*` globals.
  - Verifies the autoboot wrapper initializes the browser runtime.
- `scripts/check-globals.mjs` plus `scripts/allowed-globals.json`
  - Enforces an allowlist and per-file counts for `window.*` and `globalThis.*` usage across `src`, `scripts`, and `index.html`.
- `scripts/check-runtime-parity.mjs`
  - Protects shared `www/` runtime packaging by requiring runtime files, forbidding sensitive/non-runtime files, rejecting root-absolute runtime paths, and writing the runtime manifest.
- `npm run agent:check -- --fix-format-changed`
  - Runs the repo agent gate, including the global usage check.

## Missing Coverage Before Cleanup

- Add a specific ESM no-classic-global-dependency smoke that boots the production module path with guarded `TapSurvivor*` globals that throw on access.
- Add inventory coverage for dynamic string-key `TapSurvivor*` namespace lookups, not just direct `globalThis.TapSurvivor*` syntax.
- Add a check that classifies production-selected shell bridge globals separately from genuinely unused classic fallback globals.
- Add a check that global publisher retirement cannot proceed while a matching production-selected script or approved rollback boundary still depends on that publisher.
- Add a rollback parity check or explicit rollback-decision gate before deleting or quarantining any classic fallback files.

## Recommended Cleanup Phases

Phase 1: add/strengthen checks that prove the production ESM path does not depend on classic script globals.

- Add guarded-global ESM boot coverage.
- Add dynamic namespace bridge inventory coverage for `src/app/browser-dependency-bag.js`.
- Keep runtime behavior unchanged.
- Keep all fallback files and globals intact.

Phase 2: remove or quarantine unapproved global consumers, if any.

- Start with the transitional dynamic namespace bridge in `src/app/browser-dependency-bag.js`.
- Prefer explicit module-native injected adapters over optional global namespace bridges.
- Keep `src/game.js`, `src/game-dependencies.js`, and classic publisher files intact.

Phase 3: retire selected global publishers only after coverage proves no production dependency.

- Retire publishers in small families, not all at once.
- Update `scripts/allowed-globals.json` counts in the same slice as each retirement.
- Run production entrypoint, runtime-readiness, runtime-parity, and agent gates after each small family.

Phase 4: classic fallback cleanup only after a separate rollback decision.

- Do not delete `src/game.js`, `src/game-dependencies.js`, or classic publisher files until rollback support is explicitly retired.
- If rollback remains required, keep fallback files and only reduce production-global exposure.

## First Implementation Slice Recommendation

First slice: coverage-only.

- Add a guarded-global smoke/check that fails if the selected production ESM boot path reads any `TapSurvivor*` global.
- Add dynamic string-key bridge inventory for `src/app/browser-dependency-bag.js`.
- Do not retire globals.
- Do not delete fallback files.
- Do not edit `src/game.js` or `src/game-dependencies.js`.

## Hard Blockers

- GitHub Actions status for `db4601c` is unavailable from the single lookup; implementation should wait for a green Actions result.
- Global retirement is blocked until production ESM coverage proves no dependency on classic globals, including dynamic string-key bridge access.
- Classic fallback cleanup is blocked until a separate rollback decision is made.

## Non-Blockers

- `src/game.js` and `src/game-dependencies.js` remaining in the repo is not a production blocker because `index.html` does not select them.
- Existing allowed global publishers are not immediate production blockers while fallback support is intentionally preserved.
- Generated shell bridge tags remaining in `index.html` are not a blocker for planning, but they must be classified before any cleanup that claims production has no classic bridge globals loaded.

## Files Inspected

- `index.html`
- `src/app/production-module-autoboot.js`
- `src/app/production-module-entrypoint.js`
- `src/app/browser-dependency-bag.js`
- `src/app/compose-runtime.js`
- `src/game.js`
- `src/game-dependencies.js`
- `src/modules/game-dependencies.js`
- `src/modules/module-game-dependencies.js`
- `src/modules/module-game-lifecycle.js`
- `src/shell-relic-ui.js`
- `src/shell-ui.js`
- `scripts/smoke-module-runtime-readiness.mjs`
- `scripts/smoke-module-production-entrypoint.mjs`
- `scripts/check-runtime-parity.mjs`
- `scripts/check-globals.mjs`
- `scripts/allowed-globals.json`
- `.agent/tasks.json`
- `.agent/status.md`
- `Shane training/20260701T220313Z_production-esm-switch-candidate/result.md`
- `Shane training/20260701T222352Z_post-switch-esm-verification/result.md`

## Files Changed

- `Shane training/20260701T225045Z_global-retirement-plan-after-esm-switch/result.md`

## Validation Results

- `npm run frank:run -- "npm run smoke:module-runtime-readiness" --timeout 60`: pass
- `npm run frank:run -- "npm run smoke:module-production-entrypoint" --timeout 60`: pass
- `npm run frank:run -- "npm run check:runtime-parity" --timeout 240`: pass
- `npm run frank:run -- "npm run agent:check -- --fix-format-changed" --timeout 240`: pass
- `git diff --check`: pass
- `npm run task:validate`: pass
- `npm run agent:status`: pass
- `npm run agent:handoff`: pass

Note: `npm run check:runtime-parity` was interrupted once by a conversation resume before completion evidence was available. Per repo instruction, `npm run agent:status` was run before continuing; it passed on `main` at `db4601c`, with the only dirty file being this evidence directory and no active queue task. The runtime parity validation was then rerun and passed.

## Usage Report

- `tokens_known`: false
- Token delta: unknown
- Usage snapshot status: captured
- Usage evidence: start and end snapshots were recorded in `/home/logix/.openclaw/frank-usage/usage.jsonl`; `frank-usage report --mission "global-retirement-plan-after-esm-switch"` returned token delta `unknown`.
