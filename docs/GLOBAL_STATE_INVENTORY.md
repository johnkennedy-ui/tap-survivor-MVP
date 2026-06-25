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
- `src/content.generated.js` publishes `TapSurvivorContent`, `TapSurvivorContentSchema`, and `TapSurvivorBalanceProfiles`.
- `src/balance-runtime.js` reads those generated globals, applies the active dev balance profile/overrides, then republishes `TapSurvivorContent` and exposes `TapSurvivorBalanceRuntime` plus `TapSurvivorDebugBalance`.
- `src/math.js` still owns the `TapSurvivorMath` compatibility bridge. `src/rendering.js` and `src/render-hud.js`
  now receive `clamp` through factory arguments instead of reading `globalThis.TapSurvivorMath`; `src/game.js` remains
  the script-order bootstrap reader until the runtime can safely become ESM.
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
- `src/weapon-fire.js` now receives weapon targeting, cooldown scaling, and projectile helpers through combat factory
  wiring instead of reading `globalThis.TapSurvivorWeaponTargeting`, `globalThis.TapSurvivorWeaponCooldowns`, and
  `globalThis.TapSurvivorWeaponProjectiles` directly.
- `src/modules/save.js` now receives save defaults and save migration helpers through `src/game.js` factory wiring instead
  of reading `globalThis.TapSurvivorSaveDefaults` and `globalThis.TapSurvivorSaveMigrations` directly.

Runtime module globals:
- Bootstrap seam: `TapSurvivorGameDependencies`.
- Core data/systems: `TapSurvivorContentRegistry`, `TapSurvivorProgression`, `TapSurvivorMapSystem`, `TapSurvivorBalance`, `TapSurvivorEffects`.
- Save/storage: `TapSurvivorStorage`, `TapSurvivorSaveDefaults`, `TapSurvivorSaveMigrations`, `TapSurvivorSaveNormalize`, `TapSurvivorSaveCorruption`, `TapSurvivorSave`.
- Rendering/UI: `TapSurvivorAssets`, `TapSurvivorSprites`, `TapSurvivorRendering`, `TapSurvivorRenderHud`,
  `TapSurvivorRenderEnemies`, `TapSurvivorRenderSkillRail`, `TapSurvivorUi`, `TapSurvivorUiProgression`,
  `TapSurvivorRunUi`, `TapSurvivorShellUi`, `TapSurvivorShellRelicUi`.
- Gameplay systems: `TapSurvivorRunState`, `TapSurvivorRunUpdate`, `TapSurvivorRunLifecycle`, `TapSurvivorEnemies`,
  `TapSurvivorEnemyBehaviors`, `TapSurvivorEnemySpawning`, `TapSurvivorCombat`, `TapSurvivorCombatDamage`,
  `TapSurvivorPickups`, `TapSurvivorShop`, `TapSurvivorShopPricing`, `TapSurvivorRelics`.
- Weapon systems: `TapSurvivorWeaponTargeting`, `TapSurvivorWeaponCooldowns`, `TapSurvivorWeaponProjectiles`,
  `TapSurvivorWeaponBehaviors`, `TapSurvivorWeaponFire`, `TapSurvivorUpgrades`, `TapSurvivorLevelUp`,
  `TapSurvivorLevelUpChoices`.
- Utilities/debug: `TapSurvivorMath`, `TapSurvivorAudio`, `TapSurvivorInput`, `TapSurvivorDebug`,
  `TapSurvivorGameBanners`, `TapSurvivorGameRuntime`, `TapSurvivorQuests`.

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
- `src/weapon-cooldowns.js`, `src/shop-pricing.js`, and `src/effects.js` keep registry/config constants at module scope.

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
