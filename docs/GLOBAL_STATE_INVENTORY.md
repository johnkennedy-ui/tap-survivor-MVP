# Global State Inventory

This inventory records current runtime global/state coupling before migration. It is a snapshot, not a removal plan.

Run `npm run check:globals` before changing runtime globals. Do not add new `window.*` or `globalThis.*` usage without
deliberately updating this inventory and `scripts/allowed-globals.json`.

## Global Namespace Coupling

The runtime currently uses a script-order global namespace instead of ES module imports. Most files publish or consume one
`globalThis.TapSurvivor*` object.

Primary bootstrap coupling:
- `src/game-dependencies.js` collects the retained `TapSurvivor*` dependency bag for the classic `src/game.js` fallback boundary and supplies `input.bindMovementInput` from `src/modules/input.js` without a publisher lookup.
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
  that publisher disappears. A future publisher-retirement contract must first inventory and resolve the remaining
  classic fallback consumers (including `src/upgrades.js`) and separately prove rollback policy no longer requires the
  classic boundary. Do not remove the publisher, change the classic fallback, generated content, script order, or the
  global allowlist in a coverage-only cut.
- `src/content.generated.js` also carries its profile array in the producer-owned, non-enumerable
  `TapSurvivorContent.balanceProfiles` property. `src/balance-runtime.js` does not read either generated global: it
  publishes stable `TapSurvivorBalanceRuntime` and `TapSurvivorDebugBalance` objects that fail closed with
  `TAP_SURVIVOR_BALANCE_PROVIDER_MISSING` until `src/modules/game-dependencies.js` injects the raw content and that
  attached profiles value. The dependency bag also supplies a private balance-storage capability derived from its
  explicit `globalRef`; omitted or unavailable storage leaves balance state in memory. Valid same-reference
  configuration preserves active profile and overrides while the runtime republishes the configured
  `TapSurvivorContent`.
- `src/content-registry.js` is the generated classic bridge for content registry extraction from
  `src/modules/content-registry.js`.
- `src/effects.js` is a generated, global-free source-derived artifact for run upgrade effects, shop item effects,
  shop bonus defaults, and relic special effects from `src/modules/effects.js`. The classic dependency bag bundles
  `createEffects` and instantiates it explicitly; its built-in shop-bonus fallback list does not require a
  content-schema global.
- Production ESM inventory rendering in `src/app/browser-dependency-bag.js` calls the statically imported
  `createRelicSystem` from `src/modules/relics.js` directly and does not look up `TapSurvivorRelics`.
  `src/modules/game-dependencies.js` likewise injects the native combat, pickup, and relic factories through the
  existing `combat`, `pickups`, and `relics` dependency-bag slots; their generated classic bridges no longer publish
  those namespaces.
- `src/math.js` is now a generated classic bridge for the retired math helper; the native dependency bag injects `clamp`,
  `distance`, `formatTime`, and `randomRange` directly.
- `src/render-hud.js` still owns the `TapSurvivorRenderHud` compatibility bridge. `src/rendering.js` now receives
  `createHudRenderer` through factory wiring instead of reading `globalThis.TapSurvivorRenderHud`; `src/game.js` remains
  the script-order bootstrap reader until the rendering stack can safely become ESM.
- `src/render-skill-rail.js` is a generated, global-free artifact with retired `TapSurvivorRenderSkillRail` provenance.
  `src/render-hud.js` and the classic dependency bag receive `createSkillRailRenderer` through factory wiring instead of
  reading a compatibility publisher.
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
- `src/modules/game-dependencies.js` now injects the native progression, quest, UI, UI-progression, weapon-behavior,
  and weapon-fire factories directly. The generated `src/progression.js`, `src/quests.js`, `src/ui.js`,
  `src/ui-progression.js`, `src/weapon-behaviors.js`, and `src/weapon-fire.js` bridges are source-derived and
  global-free; their former classic publishers are retired.
- `src/modules/game-dependencies.js` also injects the native asset resolver and level-up factories. Its `assets`
  adapter preserves the existing `assets.createAssetResolver(content)` shape for `src/game.js` and shell consumers,
  while supplying the native resolver with explicit content. The generated `src/assets.js` and `src/level-up.js`
  bridges are source-derived and global-free; their former classic publishers are retired.
- `src/modules/weapon-cooldowns.js` and generated `src/weapon-cooldowns.js` now receive content through combat/weapon-fire
  factory wiring instead of reading `globalThis.TapSurvivorContent` for projectile run-upgrade scaling.
- `src/modules/save.js` now receives save defaults and save migration helpers through `src/game.js` factory wiring instead
  of reading `globalThis.TapSurvivorSaveDefaults` and `globalThis.TapSurvivorSaveMigrations` directly.
- `src/modules/save-migrations.js` and `src/modules/save-normalize.js` no longer read save defaults/migrations globals at
  module load; `src/modules/save.js` passes the current save version and plain-object helper through the save factory path.
  The generated `src/save-defaults.js` and `src/save-migrations.js` bridges bundle their exports without publishing
  `TapSurvivorSaveDefaults` or `TapSurvivorSaveMigrations`; the classic `src/game-dependencies.js` bridge supplies those
  exports through `saveDefaults` and `saveMigrations` in the dependency bag.
- `src/modules/save.js` receives save normalize, save corruption, and storage helpers through its factory arguments
  instead of reading those globals directly. The generated `src/save.js` no longer publishes `TapSurvivorSave`; the
  classic dependency bag bundles `createSaveSystem` and `src/game.js` supplies its resolved storage through the
  ordinary factory call. Explicit caller `storage` or truthy `storageAdapter` values retain precedence.
- `src/audio.js` is a generated, global-free artifact from `src/modules/module-runtime-audio-adapter.js` with retired
  `TapSurvivorAudio` provenance. `src/modules/game-dependencies.js` constructs the source-owned audio provider from
  explicit `globalRef` AudioContext, Audio, and clock factories; `src/game.js` retains
  `audio.createAudioSystem({ sfxDefs })`. Missing or throwing platform capabilities fail cues closed without any
  compatibility-publisher read, while a later dependency bag can receive valid platform factories.
- `src/modules/game-dependencies.js` now wires the native Shop factory explicitly into the classic dependency bag and
  injects the game banner factory; the factories receive the classic `documentRef` boundary without reading
  `globalThis.TapSurvivorShop` or `globalThis.TapSurvivorGameBanners`.
- `src/modules/game-dependencies.js` supplies `createMapSystem` directly through the classic dependency bag; the generated
  `src/map-system.js` bridge is retired/global-free and no longer publishes or reads `globalThis.TapSurvivorMapSystem`.
- Generated `src/shop.js` and `src/game-banners.js` remain source-derived classic artifacts without global publishers;
  the classic dependency bridge bundles the native Shop and game banner factories and preserves their explicit wiring.
- `scripts/smoke-shop-provider-parity.mjs` uses an explicit platform-target descriptor guard for its native Shop
  missing-document negative path. The helper poisons and restores the target's `document` property descriptor exactly,
  including an absent descriptor, while retaining the generated classic-boundary parity fixture.
- `src/level-up.js` now receives level-up choice helpers from the dependency bag and the optional asset resolver provider
  through `src/game.js` factory wiring.
- `src/ui.js` now receives the native UI-progression renderer through `src/game.js` factory wiring instead of reading
  `TapSurvivorUiProgression`. The production ESM browser dependency bag statically imports the native renderer and
  injects its `documentRef`; the generated classic UI bridges use the same explicit factories without publishing
  `TapSurvivorUi` or `TapSurvivorUiProgression`. `src/modules/debug.js` owns the debug factory, its generated
  `src/debug.js` bridge is global-free, and `src/modules/game-dependencies.js` supplies `createDebugSystem` through
  the retained classic dependency bag. `src/level-up.js` receives content for its exact fallback icon path instead of reading
  `globalThis.TapSurvivorContent` directly.
- `src/modules/upgrades.js` owns the pure `createUpgradeContent({ content, effects })` factory. Both production ESM
  and the classic dependency bag statically bundle that factory; generated `src/upgrades.js` no longer publishes
  `TapSurvivorUpgrades` or reads content/effects globals.
- `src/shell-ui.js` is a source-derived, global-free artifact from `src/modules/shell-ui-classic-adapter.js`.
  `src/modules/game-dependencies.js` statically imports that adapter and supplies a `shellUi` provider that defaults
  `documentRef` from the dependency bag when callers do not provide one; it no longer reads or publishes
  `TapSurvivorShellUi`. The adapter continues to receive asset/content helpers and `shellRelicUi` explicitly, while
  the dependency bag supplies source-owned scheduler/image defaults and preserves caller overrides.
- `src/combat.js` now receives combat damage, enemy system, and weapon fire dependencies through `src/game.js` factory
  wiring; combat damage is dependency-bag injected instead of reading a runtime global. It is a source-derived,
  global-free bridge from `src/modules/combat.js`, as are the native pickup and relic bridges.
- The handwritten classic enemy files no longer publish `TapSurvivorEnemies`, `TapSurvivorEnemyBehaviors`, or
  `TapSurvivorEnemySpawning`; `src/modules/game-dependencies.js` injects their native factory functions, together
  with combat, pickups, and relics, through the existing dependency-bag slots while preserving the
  `src/game.js` API.
- `src/modules/input.js` owns mouse-drag and touch movement targeting. Its generated `src/input.js` bridge is
  source-derived and global-free with retired `TapSurvivorInput` provenance; both the classic dependency bag and the
  production browser adapter receive the same explicit source binding. The retained classic `src/game.js` fallback
  boundary still receives that binding through `TapSurvivorGameDependencies`.

Runtime module globals:
- Bootstrap seam: `TapSurvivorGameDependencies`.
- Native dependency bag injection now imports the asset resolver, balance, content registry, level-up factory,
  math, level-up choices, shop pricing, weapon targeting, combat damage, the combat/pickup/relic factories, the three
  enemy factories, and `createGameRuntimeController` directly; those helpers no longer appear as runtime globals.
- `src/game-runtime.js` is a source-derived, global-free generated artifact. `src/game.js`,
  `src/app/compose-runtime.js`, and `src/modules/game-dependencies.js` import `createGameRuntimeController` directly;
  the dependency bag supplies that native factory without reading or publishing `TapSurvivorGameRuntime`.
- Core data/systems: progression and quest behavior are supplied as native factories through
  `TapSurvivorGameDependencies`; the former `TapSurvivorProgression` and `TapSurvivorQuests` publishers are retired.
  Effects and map resolution are also supplied as native factories, with their former publishers retired.
- Save/storage: `TapSurvivorStorage`; save creation, defaults, migrations, normalization, and corruption handling are
  supplied through `TapSurvivorGameDependencies`. `TapSurvivorSave`, `TapSurvivorSaveNormalize`, and
  `TapSurvivorSaveCorruption` have no global publishers; explicit caller-owned storage/adapters still take precedence.
- Rendering/UI: `TapSurvivorSprites`, `TapSurvivorRendering`, `TapSurvivorRenderHud`, and `TapSurvivorRenderEnemies`.
  The former `TapSurvivorRenderSkillRail`, `TapSurvivorShellUi`, `TapSurvivorUi`, `TapSurvivorUiProgression`, and
  `TapSurvivorShellRelicUi` publishers are dependency-injected.
- Gameplay systems: the native `createRunUpdater` plus the retired combat, pickup, relic, and enemy factories are
  injected through `TapSurvivorGameDependencies` rather than published as classic namespaces.
- Weapon systems: `TapSurvivorWeaponCooldowns`; level-up, weapon behaviors, weapon fire, projectile helpers, and
  upgrade content are dependency-injected native factories.
- Utilities/debug: `TapSurvivorDebug` is retired. `src/modules/debug.js` owns `createDebugSystem`, and the retained
  `TapSurvivorGameDependencies` rollback boundary supplies it explicitly through the dependency bag; audio and input
  are likewise dependency-injected.

Browser/platform globals:
- `src/app/production-module-autoboot.js` is the sole production-ESM browser-global acquisition boundary: it passes
  `globalThis` explicitly into the module boot path. `production-module-entrypoint`, `browser-dependency-bag`, and
  `compose-runtime` require injected platform capabilities rather than capturing the host global. The current
  dot-expression global audit is 9 actual usages (8 allowed expressions and 15 allowed usages); the allowlist does not count bare
  `globalThis` fallback syntax. The classic `TapSurvivorGameDependencies` rollback boundary remains while Debug, Audio, Shell
  UI, and input are supplied through source-owned providers for the next migration batch.
- Balance profile/override storage and profile-search receive private capabilities from the classic dependency bag;
  balance runtime has no direct `globalThis.location` read.
- Storage platform selection receives per-operation Preferences and browser-storage resolvers from the injected
  `globalRef` through `TapSurvivorStorage.configureDefaultProviders`; the retained publisher has no direct platform-global
  reads and preserves Preferences-first, fallback, and unavailable behavior.
- `TapSurvivorAudio` is retired. The classic dependency bag supplies its source-owned adapter with explicit
  `globalRef` AudioContext, Audio, and clock factories; generated `src/audio.js` records only retirement provenance
  and has no browser audio-global reader or publisher.
- `TapSurvivorShellRelicUi` is retired. `src/modules/game-dependencies.js` supplies the native shell-relic factory
  with explicit scheduler and image defaults sourced from its `globalRef`; caller-supplied scheduler/image options
  retain precedence and no timer-global reader is introduced.

Browser-smoke diagnostics:
- `document.__TapSurvivorBrowserSmoke` is the test-only, document-scoped sink used by
  `scripts/smoke-production-browser-runtime.mjs` for sprite/canvas evidence and retired publisher read counters.
  It does not publish diagnostics on `globalThis`, and is not a production runtime dependency or a revival of a
  retired publisher.

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
- `src/modules/module-runtime-audio-adapter.js` owns audio context/cache state inside its audio system factory;
  generated `src/audio.js` is the global-free classic artifact.
- `src/balance-runtime.js` owns the runtime balance profile/override resolver state through its factory output.
- `src/weapon-cooldowns.js` and `src/shop-pricing.js` keep registry/config constants at module scope.

## Direct DOM And Game-State Coupling

Current DOM/game coupling is concentrated in:
- `src/ui.js`, `src/run-ui.js`, `src/shell-ui.js`, and `src/shell-relic-ui.js` for DOM element lookup/render/update.
- `src/input.js` for canvas/keyboard/touch/mouse binding.
- `src/modules/game-runtime.js` owns the runtime controller implementation and receives input binding through dependency injection.
  `src/game-runtime.js` is the generated global-free artifact; direct imports and the dependency bag use the native controller without a runtime global.
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
