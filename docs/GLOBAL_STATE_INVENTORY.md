# Global State And Capability Inventory

This is the current inventory of explicit runtime capabilities and module-level mutable state. It
is not a migration plan. Production runtime code must not publish or consume a repository-owned
`TapSurvivor*` browser namespace.

Run `npm run check:globals` before changing a browser capability boundary. The checker parses
JavaScript/ESM with TypeScript and permits only the reviewed platform injections and declared test
fixtures in `scripts/allowed-globals.json`.

## Browser Capability Boundaries

Production composition uses ESM imports and explicit dependency bags:

- `src/app/production-module-autoboot.js` is the production module-autoboot boundary. It acquires
  the browser root once and passes it as `globalRef` to the module entrypoint.
- `src/game.js` is a retained composition boundary. Its two browser-root acquisitions inject
  `globalRef` into the dependency bag and runtime controller; it must not look up or restore a
  retired publisher.
- `src/modules/game-dependencies.js` builds the source-owned dependency bag and supplies
  `input.bindMovementInput`, `renderEnemies.createEnemyRenderer`, `rendering.createRenderer`, and
  other native factories without publisher lookups.
- `src/modules/sprites.js` owns `createSpriteSystem` and `createSpriteSheetRenderer`. Generated
  `src/sprites.js` is a global-free compatibility artifact with retired provenance; both dependency
  bags inject its source-owned factories directly. `src/sprite-sheet-renderer.js` is a no-op legacy
  compatibility shim.
- Generated `src/run-lifecycle.js`, `src/run-state.js`, `src/run-ui.js`, `src/run-update.js`,
  `src/pickups.js`, and `src/combat-damage.js` are global-free compatibility artifacts. Their native
  factories are injected from `src/modules/`.
- `index.html` starts the production module-autoboot path. `scripts/check-script-order.mjs` still
  verifies required static asset ordering, not a publisher namespace contract.

Generated content route:
- `src/content.generated.js` is a deterministic, generated, global-free compatibility artifact that records retired
  `TapSurvivorContent` provenance but contains no content or balance-profile payload. The generated ESM
  `src/content.generated.mjs` is the content route and exports `content`, `contentSchema`, and `balanceProfiles`.
- Production ESM content proof: `src/app/production-module-entrypoint.js` imports the generated named `content` export.
  `scripts/smoke-module-production-entrypoint.mjs` boots the production path with throwing
  `TapSurvivorContent` accessors on both its injected browser `globalRef` and autoboot `globalThis`; any direct,
  optional-chain, bracket, or other evaluated dynamic lookup of that publisher fails the smoke. The same smoke and
  `scripts/smoke-module-runtime-readiness.mjs` reject direct and string-key `TapSurvivorContent` namespace syntax in
  the production ESM boot sources.
- Retirement result: both production ESM and the preserved `src/game.js` fallback import generated ESM content and
  profiles and inject them into their dependency bags. `src/modules/game-dependencies.js` and generated
  `src/game-dependencies.js` have no Content reader. The content artifact, dependency-bag, harness, and browser-parity
  smokes retain absent, poisoned, and restored legacy-property proofs with zero reads; the historical classic parity
  baseline remains data-bearing while the current ESM route does not republish that namespace.
- `src/modules/balance-runtime.js` owns the global-free provider and receives content, profiles, publishing hooks, and
  logging through explicit dependencies. `src/modules/game-dependencies.js` and its generated classic bridge configure
  the provider only from injected content/profile inputs; neither reads, optional-reads, string-key-reads,
  descriptor-reads, nor fallback-looks-up `TapSurvivorContent`, nor does either overwrite
  `TapSurvivorBalanceRuntime`. Missing injected content/profiles keep the dependency bag's safe raw-content fallback,
  while absent, poisoned, or restored legacy values do not alter direct bag construction. The generated
  `src/balance-runtime.js` is a global-free source-derived bridge with retired `TapSurvivorBalanceRuntime` provenance;
  it neither republishes content nor creates a compatibility provider. The source-owned provider retains profile search,
  storage fallback, override behavior, and the `TAP_SURVIVOR_BALANCE_PROVIDER_MISSING` failure until explicitly
  configured through the dependency bag.
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
- `src/modules/render-hud.js` owns `createHudRenderer`; generated `src/render-hud.js` is source-derived and records
  retired `TapSurvivorRenderHud` provenance without a compatibility publisher. The native and classic dependency bags
  inject the factory directly, while `src/rendering.js` and `src/game.js` receive it through explicit factory wiring.
- `src/render-skill-rail.js` is a generated, global-free artifact with retired `TapSurvivorRenderSkillRail` provenance.
  `src/render-hud.js` and the classic dependency bag receive `createSkillRailRenderer` through factory wiring instead of
  reading a compatibility publisher.
- `src/modules/render-enemies.js` owns `createEnemyRenderer`; generated `src/render-enemies.js` is source-derived and
  records retired `TapSurvivorRenderEnemies` provenance without a compatibility publisher. The native and classic
  dependency bags inject the factory directly, while `src/rendering.js` receives it through factory wiring instead of
  reading a legacy publisher; `src/game.js` receives the same explicit dependency.
- `src/modules/rendering.js` owns `createRenderer` without reading `TapSurvivorRendering`; generated
  `src/rendering.js` is source-derived and records retired `TapSurvivorRendering` provenance without a compatibility
  publisher. The native and generated dependency bags inject `rendering.createRenderer` directly, while `src/game.js`
  and script order remain unchanged.
- `src/rendering.js` receives weapon skill-effect sprite metadata through factory wiring; `src/game.js` derives that
  dependency from the content registry output.
- `src/render-hud.js` receives run-upgrade definitions through `src/rendering.js` factory wiring; `src/game.js`
  derives that dependency from the content registry output.
- `src/weapon-fire.js` now receives weapon targeting through combat factory wiring; cooldown scaling and projectile
  helpers remain injected through the same factory path.
- `src/weapon-fire.js` receives weapon behavior helpers through `src/game.js` and `src/combat.js` factory wiring,
  not through a retired publisher.
- `src/modules/game-dependencies.js` now injects the native progression, quest, UI, UI-progression, weapon-behavior,
  and weapon-fire factories directly. The generated `src/progression.js`, `src/quests.js`, `src/ui.js`,
  `src/ui-progression.js`, `src/weapon-behaviors.js`, and `src/weapon-fire.js` bridges are source-derived and
  global-free; their former classic publishers are retired.
- `src/modules/game-dependencies.js` also injects the native asset resolver and level-up factories. Its `assets`
  adapter preserves the existing `assets.createAssetResolver(content)` shape for `src/game.js` and shell consumers,
  while supplying the native resolver with explicit content. The generated `src/assets.js` and `src/level-up.js`
  bridges are source-derived and global-free; their former classic publishers are retired.
- `src/modules/weapon-cooldowns.js` and generated `src/weapon-cooldowns.js` receive content through combat/weapon-fire
  factory wiring for projectile run-upgrade scaling.
- `src/modules/save.js` receives save defaults and save migration helpers through `src/game.js` factory wiring instead
  of reading retired publisher values.
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
- `src/modules/game-dependencies.js` wires the native Shop factory explicitly into the dependency bag and injects the
  game banner factory; both receive the explicit `documentRef` boundary without publisher reads.
- `src/modules/game-dependencies.js` supplies `createMapSystem` directly through the dependency bag; the generated
  `src/map-system.js` artifact is retired/global-free and has no publisher read or write.
- Generated `src/shop.js` and `src/game-banners.js` remain source-derived classic artifacts without global publishers;
  the classic dependency bridge bundles the native Shop and game banner factories and preserves their explicit wiring.
- `scripts/smoke-shop-provider-parity.mjs` uses an explicit platform-target descriptor guard for its native Shop
  missing-document negative path. The helper poisons and restores the target's `document` property descriptor exactly,
  including an absent descriptor, while retaining the generated classic-boundary parity fixture.
- `src/level-up.js` now receives level-up choice helpers from the dependency bag and the optional asset resolver provider
  through `src/game.js` factory wiring.
- `src/ui.js` receives the native UI-progression renderer through `src/game.js` factory wiring rather than a retired
  namespace. The production ESM browser dependency bag statically imports the native renderer and
  injects its `documentRef`; the generated classic UI bridges use the same explicit factories without publishing
  `TapSurvivorUi` or `TapSurvivorUiProgression`. `src/modules/debug.js` owns the debug factory, its generated
  `src/debug.js` bridge is global-free, and `src/modules/game-dependencies.js` supplies `createDebugSystem` through
  the retained compatibility dependency bag. `src/level-up.js` receives content for its exact fallback icon path
  through explicit factory inputs.
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
  source-derived and global-free with retired `TapSurvivorInput` provenance; both the direct source-owned dependency
  bag used by the classic `src/game.js` fallback and the production browser adapter receive the same explicit binding.

Runtime module capabilities:
- `src/modules/game-dependencies.js` is the canonical source-owned dependency-bag factory. Generated
  `src/game-dependencies.js` is global-free with retired `TapSurvivorGameDependencies` provenance; classic fallback
  composition imports the source factory directly.
- Native dependency bag injection now imports the asset resolver, balance, content registry, level-up factory,
  math, level-up choices, shop pricing, weapon targeting, combat damage, the combat/pickup/relic factories, the three
  enemy factories, the enemy renderer, and `createGameRuntimeController` directly; those helpers no longer appear as
  runtime globals.
- `src/game-runtime.js` is a source-derived, global-free generated artifact. `src/game.js`,
  `src/app/compose-runtime.js`, and `src/modules/game-dependencies.js` import `createGameRuntimeController` directly;
  the dependency bag supplies that native factory without reading or publishing `TapSurvivorGameRuntime`.
- Core data/systems: progression and quest behavior are supplied as native factories through the source-owned dependency
  bag; the former `TapSurvivorProgression` and `TapSurvivorQuests` publishers are retired.
  Effects and map resolution are also supplied as native factories, with their former publishers retired.
- Save/storage: `src/modules/storage-adapter.js` owns the provider factory and both dependency bags inject a fresh
  source-created provider directly. `src/storage-adapter.js` is a generated global-free artifact with retired
  `TapSurvivorStorage` provenance; save creation, defaults, migrations, normalization, and corruption handling are supplied
  through the source-owned dependency bag. `TapSurvivorSave`, `TapSurvivorSaveNormalize`, and
  `TapSurvivorSaveCorruption` have no global publishers; explicit caller-owned storage/adapters still take precedence.
- Rendering/UI: generated `src/sprites.js` is global-free with retired `TapSurvivorSprites` provenance, while the
  native and generated dependency bags inject both sprite factories directly. Source-owned renderer and enemy-renderer
  factories are also directly dependency-injected through the dependency bag. `TapSurvivorRendering` is retired alongside
  `TapSurvivorRenderEnemies`, `TapSurvivorRenderHud`, `TapSurvivorRenderSkillRail`, `TapSurvivorShellUi`,
  `TapSurvivorUi`, `TapSurvivorUiProgression`, and `TapSurvivorShellRelicUi`; their factories remain explicitly
  injected.
- Gameplay systems: the native `createRunUpdater` plus the retired combat, pickup, relic, and enemy factories are
  injected through the source-owned dependency bag rather than published as classic namespaces.
- Weapon systems: the retired cooldown namespace, level-up, weapon behaviors, weapon fire, projectile helpers, and
  upgrade content are dependency-injected native factories.
- Utilities/debug: `TapSurvivorDebug` is retired. `src/modules/debug.js` owns `createDebugSystem`, and the source-owned
  dependency bag supplies it explicitly; audio and input are likewise dependency-injected.

Browser/platform globals:
- The only production browser-root acquisitions are one bare `globalThis` use in
  `src/app/production-module-autoboot.js` and two in `src/game.js`. Each is an explicit `globalRef`
  injection boundary. `production-module-entrypoint`, `browser-dependency-bag`, and `compose-runtime`
  require injected platform capabilities rather than capturing the host global. The AST guard allows
  exactly these three uses, plus one declared module-runtime test fixture reference.
- Balance profile/override storage and profile-search receive private capabilities from the explicit dependency-bag
  `globalRef`; the source-owned balance provider has no browser-global reads. Both dependency bags receive generated
  ESM content/profile inputs explicitly and do not depend on a Content publisher value.
- Storage platform selection receives per-operation Preferences and browser-storage resolvers from the injected
  `globalRef` through each source-owned provider. The generated global-free `TapSurvivorStorage` retirement artifact
  has no publisher or direct platform-global reads; the injected providers preserve Preferences-first, fallback, and
  unavailable behavior.
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

Node tooling generated-content artifacts:
- `scripts/build-content.mjs` and `scripts/content-check.mjs` generate/check the global-free compatibility artifact
  and the ESM content exports deterministically. The global guard rejects any unapproved browser-global coupling.

## Module-Level Mutable State

Key top-level mutable state currently lives in `src/game.js`:
- `save`
- `game`
- `lastFrame`
- `runUpdater`
- `runLifecycle`
- `gameRuntime`

Other module-level state/caches:
- `src/modules/sprites.js` owns sprite cache state inside its sprite system factory; generated `src/sprites.js`
  is global-free and carries retired classic compatibility provenance.
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

`npm run check:globals` parses JavaScript/ESM in `src`, `tests/fixtures`, and inline scripts in
`index.html` with the existing TypeScript dependency. It distinguishes bare global acquisition,
direct property access, computed property access, and optional property access; strings and comments
are not code hits.

The policy in `scripts/allowed-globals.json` allows only the three named production `globalRef`
injection sites and a declared test-fixture entrypoint. Normal output lists allowed boundaries and
fixtures separately from unapproved coupling. The check fails for an unapproved use, a stale
allowance, malformed policy, or JavaScript parse error. Do not add a broad allowance or a retired
publisher; pass new browser capabilities through an explicit dependency boundary instead.
