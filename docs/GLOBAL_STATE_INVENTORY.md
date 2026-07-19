# Global State Inventory

This inventory records current runtime global/state coupling before migration. It is a snapshot, not a removal plan.

Run `npm run check:globals` before changing runtime globals. Do not add new `window.*` or `globalThis.*` usage without
deliberately updating this inventory and `scripts/allowed-globals.json`.

## Global Namespace Coupling

The runtime currently uses a script-order global namespace instead of ES module imports. Most files publish or consume one
`globalThis.TapSurvivor*` object.

Primary bootstrap coupling:
- `src/game-dependencies.js` collects the `TapSurvivor*` dependency bag for `src/game.js`, including `TapSurvivorInput.bindMovementInput`.
- `src/game.js` wires the run from that dependency bag and holds top-level run state.
- `src/run-lifecycle.js` is the generated classic bridge for run start/end/boss-clear behavior.
- `src/run-state.js` is the generated classic bridge for run state/player reset construction.
- `src/run-ui.js` is the generated classic bridge for run HUD/end-screen rendering.
- `src/run-update.js` is the generated classic bridge for run ticking/player movement/XP updates.
- `src/pickups.js` is the generated classic bridge for XP/loot pickup spawning, collection, and pickup text aging.
- `src/combat-damage.js` is the generated classic bridge for combat damage, player damage, enemy reap, XP drop, loot handoff, and boss defeat handling.
- `index.html` script order remains the dependency graph until runtime modules are migrated.
- `scripts/check-script-order.mjs` verifies the current script-order contract.

Generated content globals:
- `src/content.generated.js` publishes `TapSurvivorContent` and `TapSurvivorBalanceProfiles`; the generated ESM
  `src/content.generated.mjs` exports `content`, `contentSchema`, and `balanceProfiles` without publishing globals.
- Production ESM content proof: `src/app/production-module-entrypoint.js` imports the generated named `content` export.
  `scripts/smoke-module-production-entrypoint.mjs` boots the production path with throwing
  `TapSurvivorContent` accessors on both its injected browser `globalRef` and autoboot `globalThis`; any direct,
  optional-chain, bracket, or other evaluated dynamic lookup of that publisher fails the smoke. The same smoke and
  `scripts/smoke-module-runtime-readiness.mjs` reject direct and string-key `TapSurvivorContent` namespace syntax in
  the production ESM boot sources.
- Retirement gate: this proof covers only production ESM consumption. `src/content.generated.js` must continue to
  publish `TapSurvivorContent` for the preserved classic fallback boundary; the production smoke explicitly fails if
  that publisher disappears. A future publisher-retirement contract must first inventory and resolve the classic
  fallback consumers (including `src/assets.js`, `src/balance-runtime.js`, and `src/upgrades.js`) and separately
  prove rollback policy no longer requires the classic boundary. Do not remove the publisher, change the classic
  fallback, generated content, script order, or the global allowlist in a coverage-only cut.
- `src/balance-runtime.js` reads those generated globals, applies the active dev balance profile/overrides, then republishes `TapSurvivorContent` and exposes `TapSurvivorBalanceRuntime` plus `TapSurvivorDebugBalance`.
- `src/content-registry.js` is the generated classic bridge for content registry extraction from
  `src/modules/content-registry.js`.
- `src/effects.js` is the generated classic bridge for run upgrade effects, shop item effects, shop bonus defaults, and
  relic special effects from `src/modules/effects.js`. Its classic boundary uses the module's built-in shop-bonus
  fallback list rather than a content-schema global.
- Production ESM inventory rendering in `src/app/browser-dependency-bag.js` calls the statically imported
  `createRelicSystem` from `src/modules/relics.js` directly and does not look up `TapSurvivorRelics`. The classic
  `src/relics.js` publisher remains deliberate for the preserved fallback boundary; this cut does not retire that
  publisher, change classic script order, or alter relic definitions.
- `src/math.js` is now a generated classic bridge for the retired math helper; the native dependency bag injects `clamp`,
  `distance`, `formatTime`, and `randomRange` directly.
- `src/render-hud.js` still owns the `TapSurvivorRenderHud` compatibility bridge. `src/rendering.js` now receives
  `createHudRenderer` through factory wiring instead of reading `globalThis.TapSurvivorRenderHud`; `src/game.js` remains
  the script-order bootstrap reader until the rendering stack can safely become ESM.
- `src/render-skill-rail.js` still owns the `TapSurvivorRenderSkillRail` compatibility bridge. `src/render-hud.js` now
  receives `createSkillRailRenderer` through factory wiring instead of reading `globalThis.TapSurvivorRenderSkillRail`.
- `src/render-enemies.js` still owns the `TapSurvivorRenderEnemies` compatibility bridge. `src/rendering.js` now receives
  `createEnemyRenderer` through factory wiring instead of reading `globalThis.TapSurvivorRenderEnemies`; `src/game.js`
  remains the script-order bootstrap reader until the rendering stack can safely become ESM.
- `src/rendering.js` now receives weapon skill-effect sprite metadata through factory wiring instead of reading
  `globalThis.TapSurvivorContent` directly; `src/game.js` derives that dependency from the content registry output.
- `src/render-hud.js` now receives run-upgrade definitions through `src/rendering.js` factory wiring instead of reading
  `globalThis.TapSurvivorContent` directly; `src/game.js` derives that dependency from the content registry output.
- `src/weapon-fire.js` now receives weapon targeting through combat factory wiring; cooldown scaling and projectile
  helpers remain injected through the same factory path.
- `src/weapon-fire.js` now receives weapon behavior helpers through `src/game.js` and `src/combat.js` factory wiring
  instead of reading `globalThis.TapSurvivorWeaponBehaviors` directly.
- `src/modules/weapon-cooldowns.js` and generated `src/weapon-cooldowns.js` now receive content through combat/weapon-fire
  factory wiring instead of reading `globalThis.TapSurvivorContent` for projectile run-upgrade scaling.
- `src/modules/save.js` now receives save defaults and save migration helpers through `src/game.js` factory wiring instead
  of reading `globalThis.TapSurvivorSaveDefaults` and `globalThis.TapSurvivorSaveMigrations` directly.
- `src/modules/save-migrations.js` and `src/modules/save-normalize.js` no longer read save defaults/migrations globals at
  module load; `src/modules/save.js` passes the current save version and plain-object helper through the save factory path,
  while generated compatibility providers remain published for classic script order.
- `src/modules/save.js` now receives save normalize, save corruption, and storage helpers through its factory arguments
  instead of reading those globals directly; generated `src/save.js` keeps a compatibility boundary wrapper so classic
  `TapSurvivorSave.createSaveSystem(...)` callers still receive the script-order globals by default.
- `src/modules/game-dependencies.js` now wires the native Shop factory explicitly into the classic dependency bag and
  injects the game banner factory; the factories receive the classic `documentRef` boundary without reading
  `globalThis.TapSurvivorShop` or `globalThis.TapSurvivorGameBanners`.
- Generated `src/shop.js` and `src/game-banners.js` remain source-derived classic artifacts without global publishers;
  the classic dependency bridge bundles the native Shop and game banner factories and preserves their explicit wiring.
- `scripts/smoke-shop-provider-parity.mjs` has two temporary `globalThis.document` getter guard/restore reads. They
  prove native Shop does not access the global while retaining the generated classic-boundary parity fixture.
- `src/level-up.js` now receives level-up choice helpers from the dependency bag and the optional asset resolver provider
  through `src/game.js` factory wiring.
- `src/ui.js` now receives `TapSurvivorUiProgression` through `src/game.js` factory wiring instead of reading that global
  directly. The production ESM browser dependency bag statically imports the native `createUiProgressionRenderer` and
  injects its `documentRef`; the classic publisher and fallback remain preserved. `src/debug.js` now receives balance
  floor scaling through the debug factory; and `src/level-up.js` receives content for its exact fallback icon path instead
  of reading `globalThis.TapSurvivorContent` directly.
- `src/upgrades.js` exposes `createUpgradeContent({ content, effects })` so `src/game.js` can build upgrade definitions from
  injected content/effects; the compatibility global still keeps a default script-order instance.
- `src/shell-ui.js` now receives asset/content helpers and `TapSurvivorShellRelicUi` through `src/game.js` factory wiring
  instead of reading those globals directly. `src/shell-relic-ui.js` now receives content through that shell UI seam for
  relic detail and character sprite fallbacks while keeping its compatibility provider global.
- `src/combat.js` now receives combat damage, enemy system, and weapon fire dependencies through `src/game.js` factory
  wiring; combat damage is dependency-bag injected instead of reading a runtime global.
- `src/enemies.js` now receives enemy behavior and enemy spawning dependencies through `src/game.js` and
  `src/combat.js` factory wiring; floor difficulty is dependency-bag injected instead of read from a runtime global.

Runtime module globals:
- Bootstrap seam: `TapSurvivorGameDependencies`.
- Native dependency bag injection now imports balance, content registry, math, level-up choices, shop pricing, weapon
  targeting, and combat damage directly; those helpers no longer appear as runtime globals.
- Core data/systems: `TapSurvivorProgression`, `TapSurvivorMapSystem`, `TapSurvivorEffects`.
- Save/storage: `TapSurvivorStorage`, `TapSurvivorSaveDefaults`, `TapSurvivorSaveMigrations`, `TapSurvivorSaveNormalize`, `TapSurvivorSaveCorruption`, `TapSurvivorSave`.
- Rendering/UI: `TapSurvivorAssets`, `TapSurvivorSprites`, `TapSurvivorRendering`, `TapSurvivorRenderHud`,
  `TapSurvivorRenderEnemies`, `TapSurvivorRenderSkillRail`, `TapSurvivorUi`, `TapSurvivorUiProgression`,
  `TapSurvivorRunUi`, `TapSurvivorShellUi`, `TapSurvivorShellRelicUi`.
- Gameplay systems: `TapSurvivorRunState`, `TapSurvivorRunUpdate`, `TapSurvivorRunLifecycle`, `TapSurvivorEnemies`,
  `TapSurvivorEnemyBehaviors`, `TapSurvivorEnemySpawning`, `TapSurvivorCombat`,
  `TapSurvivorPickups`, `TapSurvivorRelics`.
- Weapon systems: `TapSurvivorWeaponCooldowns`, `TapSurvivorWeaponProjectiles`,
  `TapSurvivorWeaponBehaviors`, `TapSurvivorWeaponFire`, `TapSurvivorUpgrades`, `TapSurvivorLevelUp`.
- Utilities/debug: `TapSurvivorAudio`, `TapSurvivorInput`, `TapSurvivorDebug`,
  `TapSurvivorGameRuntime`, `TapSurvivorQuests`.

Browser/platform globals:
- `globalThis.localStorage` and `globalThis.location` are used by dev balance profile/override selection.
- `globalThis.Capacitor?.Plugins?.Preferences` and `globalThis.localStorage` are used by storage adapter platform selection.
- `globalThis.AudioContext` / `globalThis.webkitAudioContext` are used by audio setup.
- `globalThis.setTimeout` / `globalThis.clearTimeout` are used by relic UI animation timing.

Node tooling generated-global strings:
- `scripts/build-content.mjs` and `scripts/content-check.mjs` generate/check the content globals as strings. The globals
  guard ignores strings/comments, so those generated strings are documented here rather than counted as live script
  accesses.

## Module-Level Mutable State

Key top-level mutable state currently lives in `src/game.js`:
- `save`
- `game`
- `lastFrame`
- `runUpdater`
- `runLifecycle`
- `gameRuntime`

Other module-level state/caches:
- `src/sprites.js` owns sprite cache state inside its sprite system factory.
- `src/audio.js` owns audio context/cache state inside its audio system factory.
- `src/balance-runtime.js` owns the runtime balance profile/override resolver state through its factory output.
- `src/weapon-cooldowns.js` and `src/shop-pricing.js` keep registry/config constants at module scope.

## Direct DOM And Game-State Coupling

Current DOM/game coupling is concentrated in:
- `src/ui.js`, `src/run-ui.js`, `src/shell-ui.js`, and `src/shell-relic-ui.js` for DOM element lookup/render/update.
- `src/input.js` for canvas/keyboard/touch/mouse binding.
- `src/modules/game-runtime.js` owns the runtime controller implementation and receives input binding through dependency injection.
  `src/game-runtime.js` is the generated classic bridge until the browser entrypoint migrates away from script-order globals.
- `src/modules/run-lifecycle.js` owns run lifecycle behavior; `src/run-lifecycle.js` is the generated classic bridge.
- `src/modules/run-state.js` owns run state/player reset construction; `src/run-state.js` is the generated classic bridge.
- `src/modules/run-ui.js` owns run HUD/end-screen rendering; `src/run-ui.js` is the generated classic bridge.
- `src/modules/run-update.js` owns run ticking/player movement/XP updates; `src/run-update.js` is the generated classic bridge.
- `src/modules/pickups.js` owns XP/loot pickup spawning, collection, and pickup text aging; `src/pickups.js` is the generated classic bridge.
- `src/modules/combat-damage.js` owns combat damage, player damage, enemy reap, XP drop, loot handoff, and boss defeat handling; `src/combat-damage.js` is the generated classic bridge.
- `src/game.js`, which passes game/save/system references into UI, runtime, combat, shop, relic, and render systems.

## Guard Policy

`npm run check:globals` scans `src`, `scripts`, and `index.html` for real `window.*` / `globalThis.*` code usage while
ignoring strings/comments. It reports every current allowed usage with file and line number, and fails if:
- a new global expression appears, or
- a scanned file has more global usages than `scripts/allowed-globals.json` permits.

Removing globals is allowed in a later migration slice, but update the inventory and allowlist in the same deliberate change.
