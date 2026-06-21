# Global State Inventory

This inventory records current runtime global/state coupling before migration. It is a snapshot, not a removal plan.

Run `npm run check:globals` before changing runtime globals. Do not add new `window.*` or `globalThis.*` usage without deliberately updating this inventory and `scripts/allowed-globals.json`.

## Global Namespace Coupling

The runtime currently uses a script-order global namespace instead of ES module imports. Most files publish or consume one `globalThis.TapSurvivor*` object.

Primary bootstrap coupling:
- `src/game.js` wires the run by reading the shared `TapSurvivor*` globals and holding top-level run state.
- `index.html` script order remains the dependency graph until runtime modules are migrated.
- `scripts/check-script-order.mjs` verifies the current script-order contract.

Generated content globals:
- `src/content.generated.js` publishes `TapSurvivorContent`, `TapSurvivorContentSchema`, and `TapSurvivorBalanceProfiles`.
- `src/balance-runtime.js` reads those generated globals, applies the active dev balance profile/overrides, then republishes `TapSurvivorContent` and exposes `TapSurvivorBalanceRuntime` plus `TapSurvivorDebugBalance`.

Runtime module globals:
- Core data/systems: `TapSurvivorContentRegistry`, `TapSurvivorProgression`, `TapSurvivorMapSystem`, `TapSurvivorBalance`, `TapSurvivorEffects`.
- Save/storage: `TapSurvivorStorage`, `TapSurvivorSaveDefaults`, `TapSurvivorSaveMigrations`, `TapSurvivorSaveNormalize`, `TapSurvivorSaveCorruption`, `TapSurvivorSave`.
- Rendering/UI: `TapSurvivorAssets`, `TapSurvivorSprites`, `TapSurvivorRendering`, `TapSurvivorRenderHud`,
  `TapSurvivorRenderEnemies`, `TapSurvivorRenderSkillRail`, `TapSurvivorUi`, `TapSurvivorUiProgression`,
  `TapSurvivorRunUi`, `TapSurvivorShellUi`, `TapSurvivorShellRelicUi`.
- Gameplay systems: `TapSurvivorRunState`, `TapSurvivorRunUpdate`, `TapSurvivorRunLifecycle`, `TapSurvivorEnemies`,
  `TapSurvivorEnemyBehaviors`, `TapSurvivorEnemySpawning`, `TapSurvivorCombat`, `TapSurvivorCombatDamage`,
  `TapSurvivorPickups`, `TapSurvivorShop`, `TapSurvivorShopPricing`, `TapSurvivorRelics`.
- Weapon systems: `TapSurvivorWeaponTargeting`, `TapSurvivorWeaponCooldowns`, `TapSurvivorWeaponProjectiles`, `TapSurvivorWeaponBehaviors`, `TapSurvivorWeaponFire`, `TapSurvivorUpgrades`, `TapSurvivorLevelUp`, `TapSurvivorLevelUpChoices`.
- Utilities/debug: `TapSurvivorMath`, `TapSurvivorAudio`, `TapSurvivorInput`, `TapSurvivorDebug`, `TapSurvivorGameBanners`, `TapSurvivorGameRuntime`, `TapSurvivorQuests`.

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
- `src/input.js` and `src/game-runtime.js` for canvas/keyboard/touch/mouse binding.
- `src/game.js`, which passes game/save/system references into UI, runtime, combat, shop, relic, and render systems.

## Guard Policy

`npm run check:globals` scans `src`, `scripts`, and `index.html` for real `window.*` / `globalThis.*` code usage while ignoring strings/comments. It reports every current allowed usage with file and line number, and fails if:
- a new global expression appears, or
- a scanned file has more global usages than `scripts/allowed-globals.json` permits.

Removing globals is allowed in a later migration slice, but update the inventory and allowlist in the same deliberate change.
