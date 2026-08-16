# Agent Codebase Context

## Project Purpose

Tap Survivor is a small browser MVP for a survival auto-attacker. The player moves around a canvas arena, defeats enemies, collects XP/loot, unlocks weapons and meta upgrades, completes quests, survives 2.5 minutes, and fights a boss.

## Engine And Language

- Engine/framework: no external game engine; plain browser JavaScript, HTML canvas, HTML, and CSS.
- Module style: browser globals loaded by `index.html` in script order.
- Runtime content, schema, and profile source: named ESM exports from `src/content.generated.mjs`, generated from
  `content/registry/*.json`, `content/balance/*.json`, and `content/tap-survivor-schema.json`.
- `src/content.generated.js` is a generated, global-free compatibility artifact recording retired
  `TapSurvivorContent` provenance; it contains no data payload.

## Folder Map

- `index.html`: DOM shell, canvas, menus, script load order.
- `src/game.js`: run loop and high-level orchestration.
- `src/modules/game-dependencies.js`: real ES-module implementation for collecting the runtime dependency bag consumed by `src/game.js`, including the input binder passed into the runtime controller.
- `src/game-dependencies.js`: generated global-free artifact with retired `TapSurvivorGameDependencies` provenance; do not hand-edit it.
- `src/modules/balance-runtime.js`: source-owned BalanceRuntime provider; it receives content/profile, publishing-hook,
  and logging dependencies explicitly and has no ambient browser-global access.
- `src/balance-runtime.js`: generated global-free BalanceRuntime bridge with retired `TapSurvivorBalanceRuntime` provenance; do not hand-edit it.
- `src/modules/module-runtime-audio-adapter.js`: source-owned audio implementation with explicit Audio, AudioContext, and clock factories.
- `src/audio.js`: generated global-free artifact for the retired `TapSurvivorAudio` publisher; do not hand-edit it.
- `src/modules/shell-ui-classic-adapter.js`: real ES-module classic Shell UI adapter; it receives browser DOM access through explicit factory options.
- `src/shell-ui.js`: generated global-free artifact for the native Shell UI adapter; do not hand-edit it.
- `src/modules/game-runtime.js`: real ES-module implementation for runtime boot, speed controls, injected input binding, save reset, and lifecycle flush.
- `src/game-runtime.js`: generated global-free artifact for the native runtime controller; do not hand-edit it.
- `src/modules/run-lifecycle.js`: real ES-module implementation for run start/end/boss-clear behavior.
- `src/run-lifecycle.js`: generated classic compatibility bridge for `TapSurvivorRunLifecycle`; do not hand-edit it.
- `src/modules/run-state.js`: real ES-module implementation for run state/player reset construction.
- `src/run-state.js`: generated classic compatibility bridge for `TapSurvivorRunState`; do not hand-edit it.
- `src/modules/run-ui.js`: real ES-module implementation for run HUD and end-screen rendering.
- `src/run-ui.js`: generated classic compatibility bridge for `TapSurvivorRunUi`; do not hand-edit it.
- `src/modules/run-update.js`: real ES-module implementation for run ticking/player movement/XP updates.
- `src/run-update.js`: generated classic compatibility bridge for `TapSurvivorRunUpdate`; do not hand-edit it.
- `src/modules/pickups.js`: real ES-module implementation for XP/loot pickups and pickup text aging.
- `src/pickups.js`: generated classic compatibility bridge for `TapSurvivorPickups`; do not hand-edit it.
- `src/modules/combat-damage.js`: real ES-module implementation for combat damage, player damage, enemy reap, XP drop, loot handoff, and boss defeat handling.
- `src/combat-damage.js`: generated classic compatibility bridge for `TapSurvivorCombatDamage`; do not hand-edit it.
- `src/quests.js`: quest opening, completion, progress, and active quest weapon helpers.
- `src/progression.js`: skill-tree gate checks and weapon/meta upgrade purchase handlers.
- `src/modules/save.js`: real ES-module implementation for save-system orchestration, loading, storage orchestration, and persistence.
- `src/save.js`: generated classic compatibility bridge for `TapSurvivorSave`; do not hand-edit it.
- `src/modules/save-defaults.js`: real ES-module implementation for save schema version constant and default save shape.
- `src/save-defaults.js`: generated classic compatibility bridge for `TapSurvivorSaveDefaults`; do not hand-edit it.
- `src/modules/save-migrations.js`: real ES-module implementation for save migration guards and version steps.
- `src/save-migrations.js`: generated classic compatibility bridge for `TapSurvivorSaveMigrations`; do not hand-edit it.
- `src/modules/save-normalize.js`: real ES-module implementation for save normalization and clamping helpers.
- `src/save-normalize.js`: generated classic compatibility bridge for `TapSurvivorSaveNormalize`; do not hand-edit it.
- `src/modules/save-corruption.js`: real ES-module implementation for corrupt save fallback and load-warning helper.
- `src/save-corruption.js`: generated classic compatibility bridge for `TapSurvivorSaveCorruption`; do not hand-edit it.
- `src/modules/storage-adapter.js`: source-owned storage-provider factory for browser `localStorage` and Capacitor
  Preferences save backend access. It receives explicit platform capability resolvers and is injected directly by both
  dependency bags.
- `src/storage-adapter.js`: generated global-free artifact with retired `TapSurvivorStorage` provenance from the source-owned provider; do not hand-edit it.
- `src/effects.js`: shared runtime effect handlers for run upgrades and shop item bonuses.
- `src/ui.js`: DOM lookup helper for game UI elements.
- `src/level-up.js`: level-up choice generation and level-up modal behavior.
- `src/input.js`: canvas pointer/touch movement input binding.
- `src/shop.js`: coin shop rendering, floor-scaled and purchase-inflated prices, purchases, persistence, item sprites, run-start bonuses, in-run shop-tab rendering, and immediate in-run player stat bonuses.
- `src/modules/shop-pricing.js`: real ES-module implementation for shop pricing logic.
- `src/shop-pricing.js`: generated classic compatibility bridge for `TapSurvivorShopPricing`; do not hand-edit it.
- `src/combat.js`: combat orchestration, damage accounting, enemy reap/loot handoff, and combat effects.
- `src/enemies.js`: enemy spawning, spawn patterns, randomized boss spawning, and boss special attack orchestration.
- `src/enemy-behaviors.js`: enemy movement, contact damage, ranged enemy shots, boss charge movement, boss attack hit resolution, and enemy-bolt updates.
- `src/rendering.js`: canvas drawing orchestration for arena, entities, effects, and projectiles.
- `src/render-hud.js`: canvas HUD drawing for floor badge, boss notice/health, and the weapon skill rail.
- `src/weapon-fire.js`: public weapon-fire integration entry point, equipped weapon timers, weapon dispatch, attack animation, and weapon burst triggers.
- `src/modules/weapon-cooldowns.js`: real ES-module implementation for weapon cooldown, SFX timing, damage, reach, width, projectile radius, and projectile skill scaling helpers.
- `src/weapon-cooldowns.js`: generated classic compatibility bridge for `TapSurvivorWeaponCooldowns`; do not hand-edit it.
- `src/modules/weapon-projectiles.js`: real ES-module implementation for projectile vector helpers plus projectile weapon firing, spawning, bolt updates, bounces, split-on-hit, and explosion behavior.
- `src/weapon-projectiles.js`: generated classic compatibility bridge for `TapSurvivorWeaponProjectiles`; do not hand-edit it.
- `src/modules/weapon-targeting.js`: real ES-module implementation for pure weapon targeting helpers used by weapon fire behavior.
- `src/weapon-targeting.js`: generated classic compatibility bridge for `TapSurvivorWeaponTargeting`; do not hand-edit it.
- `src/weapon-behaviors.js`: non-projectile weapon behavior handlers for beams, cones, radial pulses, chains, target areas, lingering areas, mines, and area/beam/burst updates.
- `src/modules/math.js`: real ES-module implementation for shared math and formatting helpers.
- `src/math.js`: generated classic compatibility bridge for `TapSurvivorMath`; do not hand-edit it.
- `src/modules/sprites.js`: source-owned sprite loading and canvas draw helpers with per-size raster caching for SVG sprite performance.
- `src/sprites.js`: generated global-free classic compatibility bridge for those sprite factories; do not hand-edit it.
- `src/sprite-sheet-renderer.js`: no-op script-order compatibility shim; the injected source-owned sheet renderer returns false when an image is unavailable.
- `src/assets.js`: shared resolver for effect sprites, clean icons, relic icons, level-up icons, and fallback asset paths.
- `src/upgrades.js`: generated weapon upgrade definitions plus the small run-upgrade effect interpreter.
- `src/styles.css`: page, panel, modal, and responsive styling.
- `content/registry/`: source registry domains for weapons, relics, shop items, run upgrades, enemies, bosses, floors, maps, quests, characters, assets, audio, and tuning.
- `content/balance/`: build-time balance overlay profiles.
- `content/tap-survivor-content.json`: assembled compatibility mirror for older scripts, not the routine edit target.
- `src/content.generated.mjs`: generated ESM content, schema, and balance-profile bundle; do not edit directly.
- `src/content.generated.js`: generated global-free compatibility artifact; do not edit directly.
- `assets/`: committed sprite and license files.
- `www/`: generated, git-ignored shared runtime output used by both GitHub Pages and Capacitor Android.
- `android/`: Capacitor Android project; copied web assets under `android/app/src/main/assets/public` are generated by `npm run android:sync` and ignored.
- `capacitor.config.json`: Capacitor config; `webDir` must remain `www`.
- `scripts/`: build, validation, content, deployment, and smoke-test utilities.
- `docs/`: agent context and extension guides.
- `docs/MAINTENANCE.md`: routine update and validation runbook.
- `docs/MAINTAINABILITY_REFACTOR.md`: small file-ownership notes for formatting and helper-split passes.
- `docs/CURRENT_TASK.md`: optional local task checkpoint. It can be stale; do not treat it as authoritative over the conversation or git status.
- `docs/CHANGELOG_AGENT.md`: short log of structural changes that affect future agent work.

## Main Gameplay Systems

- Content registry: `content/registry/*.json`, assembled by `scripts/content/content-assembly.mjs`.
- Content schema/manifest: `content/tap-survivor-schema.json`.
- No-emit type contracts: `types/`, checked by `npm run typecheck`.
- Content add templates: `content/tap-survivor-schema.json` under `templates`; `scripts/add-content.mjs` reads those defaults.
- Content build: `scripts/build-content.mjs`.
- Content validation: `scripts/content/content-validation.mjs` and `scripts/validate-content.mjs`.
- Balance profiles: `content/balance/default.json`, `content/balance/dev-fast.json`, and `content/balance/testing.json`.
- Economy/shop balance check: `scripts/economy-check.mjs`.
- Balance reports/checks: `scripts/balance-summary.mjs`, `scripts/balance-diff.mjs`, and `scripts/balance-check.mjs`.
- Browser global load-order check: `scripts/check-script-order.mjs`.
- Module bridge build: `scripts/build-module-bridges.mjs`; currently generates classic bridges from `src/modules/`.
  Covered bridge entries include audio, balance, balance-runtime, level-up-choices, map-system, math, save-corruption, save-defaults,
  save-migrations, save-normalize, save, shop-pricing, weapon-cooldowns, weapon-projectiles, weapon-targeting,
  game-runtime, input, game-dependencies, run-lifecycle, run-state, run-ui, run-update, pickups, and combat-damage.
- Runtime dependency ownership: `src/modules/game-dependencies.js` owns dependency collection from the retained raw
  Content input and constructs source-owned BalanceRuntime directly from Content/profiles plus explicit profile-search
  and storage capabilities. It does not read or overwrite `TapSurvivorBalanceRuntime`; missing Content/profiles retain
  the safe fallback and publisher values may be absent, poisoned, or restored. It also constructs source-owned audio
  from explicit `globalRef` Audio, AudioContext, and clock factories, and supplies `bindMovementInput` from
  `src/modules/input.js`; the classic `src/game.js` fallback boundary imports that source-owned factory directly without
  `TapSurvivorGameDependencies`, `TapSurvivorBalanceRuntime`, `TapSurvivorAudio`, or `TapSurvivorInput` lookups.
  `src/game-dependencies.js` is generated by `npm run build:bridges` as a global-free artifact with retired provenance.
  Keep `src/game.js` as the side-effectful classic composition entrypoint until a later runtime-entry migration.
- Shell UI controller ownership: `src/modules/shell-ui-classic-adapter.js` owns the classic controller API; `src/shell-ui.js` is a generated global-free artifact.
  `src/modules/game-dependencies.js` imports the native adapter and supplies a document-aware `shellUi` provider without a `TapSurvivorShellUi` publisher.
- Runtime controller ownership: `src/modules/game-runtime.js` owns boot/speed/reset/lifecycle behavior and receives movement input binding as an injected option; `src/game-runtime.js` is a generated global-free artifact from that source.
  `src/game.js`, `src/app/compose-runtime.js`, and `src/modules/game-dependencies.js` import `createGameRuntimeController` directly; the dependency bag supplies that native factory without a runtime publisher.
- Run lifecycle ownership: `src/modules/run-lifecycle.js` owns start/end/boss-clear behavior; `src/run-lifecycle.js` is generated by `npm run build:bridges`.
  Keep `src/game.js` on `globalThis.TapSurvivorRunLifecycle.createRunLifecycle` until a later runtime-entry migration removes the classic script-order contract.
- Run state ownership: `src/modules/run-state.js` owns run state/player reset construction; `src/run-state.js` is generated by `npm run build:bridges`.
  Keep `src/game.js` on `globalThis.TapSurvivorRunState.createRunStateSystem` until a later runtime-entry migration removes the classic script-order contract.
- Run update ownership: `src/modules/run-update.js` owns run ticking/player movement/XP updates; `src/run-update.js` is generated by `npm run build:bridges`.
  Keep `src/game.js` on `globalThis.TapSurvivorRunUpdate.createRunUpdater` until a later runtime-entry migration removes the classic script-order contract.
- Quest graph audit: `scripts/audit-quests.mjs`.
- Save/meta progression: `src/modules/save.js`, `src/progression.js`, `src/modules/run-state.js`, and orchestration in `src/game.js`.
- Save helper ownership: defaults live in `src/modules/save-defaults.js`, migrations in `src/modules/save-migrations.js`, and normalization lives in `src/modules/save-normalize.js`.
  Corrupt-load warning behavior lives in `src/modules/save-corruption.js`.
  Save-system orchestration lives in `src/modules/save.js`.
  `src/save-defaults.js`, `src/save-migrations.js`, `src/save-normalize.js`, `src/save-corruption.js`, and `src/save.js` are generated by `npm run build:bridges`.
  Keep `game.js` on `globalThis.TapSurvivorSave.createSaveSystem` for now.
  Do not hand-edit generated save bridges or remove script-order/global contracts yet.
  Do not change defaults, migrations, normalization semantics, corrupt-save backup, storage behavior, persistence semantics, or runtime initialization when moving this bridge.
- Run HUD/end-screen UI: `src/modules/run-ui.js`.
- Run ticking/player movement: `src/modules/run-update.js`.
- Combat damage ownership: `src/modules/combat-damage.js` owns damageEnemy, damagePlayer, and reapEnemies behavior; `src/combat-damage.js` is generated by `npm run build:bridges`.
  Keep the classic combat composer on `globalThis.TapSurvivorCombatDamage.createCombatDamageSystem` until a later runtime-entry migration removes the script-order global contract.
- Coin shop: `src/shop.js` plus `shopItems` content and the in-run shop tab in `src/shell-ui.js`.
- Floor difficulty ownership: `src/modules/balance.js` owns the implementation; `src/balance.js` is generated by `npm run build:bridges`.
  Keep consumers on the classic global bridge for now, and do not change floor difficulty values or scaling when moving this bridge.
- Level-up choice ownership: `src/modules/level-up-choices.js` owns the choice helper implementation; `src/level-up-choices.js` is generated by `npm run build:bridges`.
  Keep consumers on the classic global bridge for now, and do not change choice weighting, randomness, relic focus, unlocks, or level-up UI behavior when moving this bridge.
- Map system ownership: `src/modules/map-system.js` owns the map/floor resolver implementation; `src/map-system.js` is generated by `npm run build:bridges`.
  Keep consumers on the classic global bridge for now, and do not change map/floor selection, background resolution, modifier merge, or floor-pool behavior when moving this bridge.
- Math/helper ownership: `src/modules/math.js` owns the implementation; `src/math.js` is generated by `npm run build:bridges` to keep the classic script-order/global runtime working.
- Shop pricing ownership: `src/modules/shop-pricing.js` owns the implementation; `src/shop-pricing.js` is generated by `npm run build:bridges` to keep the classic script-order/global runtime working.
- Weapon cooldown ownership: `src/modules/weapon-cooldowns.js` owns the implementation; `src/weapon-cooldowns.js` is generated by `npm run build:bridges`.
  Keep the classic script-order/global runtime working, and do not change cooldown, damage, reach, radius, projectile scaling, or SFX timing when moving this bridge.
- Weapon projectile ownership: `src/modules/weapon-projectiles.js` owns the implementation; `src/weapon-projectiles.js` is generated by `npm run build:bridges`.
  Keep the classic script-order/global runtime working, and do not change projectile firing, spread, bounce, pierce, explosion, split, damage, or collision behavior when moving this bridge.
- Weapon targeting ownership: `src/modules/weapon-targeting.js` owns the implementation; `src/weapon-targeting.js` is generated by `npm run build:bridges` to keep the classic script-order/global runtime working.
- Economy tuning: run `npm run economy:check` before monetization-route work; it reports shop tiers, stat lanes, buyout cost, price scaling, inflation, and coin reward scaling.
- Enemy and boss behavior: `src/enemies.js` owns spawning/orchestration, `src/enemy-behaviors.js` owns movement and attack update behavior; boss ability tuning lives in `content/registry/bosses.json`.
- Enemy and boss projectile colours are visual-only content metadata. Use `projectileColor` first, with `spriteAccentColor`, `accentColor`, `color`, and a safe fallback handled by `src/enemy-behaviors.js`.
- Ranged enemy visual attack states reuse `attackVisualTimer`; `src/render-enemies.js` maps active ranged shots to sprite-sheet `attack` frames and otherwise uses `default`. This must stay visual-only.
- Weapon firing behavior: `src/weapon-fire.js` remains the public integration entry point.
  Cooldown/stat scaling ownership lives in `src/modules/weapon-cooldowns.js`, projectile behavior ownership in
  `src/modules/weapon-projectiles.js`, targeting ownership in `src/modules/weapon-targeting.js`, and non-projectile
  behavior in `src/weapon-behaviors.js`.
- Rendering and sprite lookup: `src/rendering.js`; HUD overlays: `src/render-hud.js`.
- Upgrade definitions: meta upgrades live in `content/registry/weapons.json`, run upgrades live in `content/registry/run-upgrades.json`, and weapon damage upgrades are generated by `src/upgrades.js`.
- Runtime effect handlers: `src/effects.js`; keep supported stats/types aligned with `content/tap-survivor-schema.json`.

## Current Content Loading Model

The project is mixed but mostly registry-driven:

- Weapons, unlock nodes, meta upgrades, run upgrades, quests, quest groups, enemies, characters, shop items, levels, maps, asset sources, sprite paths, audio, and tuning are config-driven in `content/registry/*.json`.
- Balance profiles may safely override known numeric fields and known-ID floor/map lists at build time.
- Supported content tooling templates/defaults, shop item field rules, effect stats, and validation command groups are described in `content/tap-survivor-schema.json`.
- Supported runtime behavior IDs for weapon kinds and boss ability kinds are also listed in `content/tap-survivor-schema.json`; content validation rejects unsupported IDs before runtime.
- `src/content.generated.mjs` exports the content registry, content schema, and balance profiles as named ESM values.
  `src/content.generated.js` is only generated retirement provenance and publishes none of those values. Runtime dev
  selection is handled by the source-owned BalanceRuntime provider through explicit dependency-bag inputs.
- Weapon behavior dispatch lives in `src/weapon-fire.js`; enemy spawn orchestration lives in `src/enemies.js`; enemy movement/attack behavior lives in `src/enemy-behaviors.js`.
- Weapon damage upgrades are generated from weapon definitions in `src/upgrades.js`.
- Run-upgrade one-shot effects and shop item stat bonuses use shared handlers in `src/effects.js`; shop bonus stats come from the generated schema at runtime, and combat-scaling run upgrades are read by tier ID in `src/weapon-fire.js`.
- UI layout is HTML/CSS-driven.

## Where To Add Content

- Weapons: use `npm run add:content -- weapon <id> ...` or edit `content/registry/weapons.json`; use a `kind` listed in `content/tap-survivor-schema.json`.
- Meta upgrades: add to `metaUpgrades` in `content/registry/weapons.json`; keep gates pointed at existing `weaponUnlocks` and `quests`.
- Weapon damage upgrades: set `upgradeId` on the weapon entry; `src/upgrades.js` generates the upgrade.
- Run upgrades: use `npm run add:content -- run-upgrade <id> ...` or edit `content/registry/run-upgrades.json`; use supported effects only unless extending `src/upgrades.js`.
- Relics: use `npm run add:content -- relic <id> ...` or edit `content/registry/relics.json`; supported modifier keys live in schema.
- Items: use `npm run add:content -- shop-item <id> ...` or edit `content/registry/shop-items.json`.
- Enemies: use `npm run add:content -- enemy <id> ...` or edit `content/registry/enemies.json`; new behavior kinds need runtime code.
- Bosses: use `npm run add:content -- boss <id> ...` for inactive tuning entries; adding to `bossConfig.abilityIds` needs runtime-supported ability behavior.
- Floors: use `npm run add:content -- floor <id> ...` or edit `content/registry/floors.json`.
- Maps: use `npm run add:content -- map <id> ...` or edit `content/registry/maps.json`.
- Characters: use `npm run add:content -- character <id> ...` or edit `content/registry/characters.json`.
- Sprites/assets: add files under `assets/<source>/<pack>/`, register source/license in `assets.sources`, then map logical IDs in `assets.sprites`.
- Enemy/boss sprite sheets live under `assets/generated/tower/spritesheets/` and are registered in `assets.sprites.spriteSheets`; validate them with `npm run verify:assets` and `npm run smoke:spritesheets`.
- Ranged enemy and projectile boss colours should be configured with `projectileColor` in the enemy or boss ability registry. Validate with `npm run smoke:projectile-colors`; never tune combat numbers for a projectile-colour-only request.
- Ranged enemy `default`/`attack` sprite-sheet states are metadata-only polish. Validate with `npm run smoke:enemy-visual-states` and do not alter projectile timing, enemy movement, or balance values.

## Where Not To Edit Unless Necessary

- Do not hand-edit `src/content.generated.js` or `src/content.generated.mjs`.
- Do not change `src/game.js` for pure content additions.
- Do not change `src/combat.js` unless combat damage/reap orchestration changes are required.
- Do not change `src/enemies.js` unless enemy spawning, movement, boss behavior, or floor enemy scaling changes are required.
- Do not change `src/rendering.js` unless a new visual behavior or sprite category is required. Use `src/render-hud.js` for HUD overlays.
- Do not scatter raw asset paths in gameplay code; use logical IDs from the content registry.

## Build, Run, And Test Commands

- Build generated content: `npm run build:content`
- Build shared GitHub Pages/Android runtime: `npm run build:web`
- Build generated classic bridges: `npm run build:bridges`
- Check shared runtime parity: `npm run check:runtime-parity`
- Sync Android from shared runtime: `npm run android:sync`
- Build debug APK: `npm run android:debug`
- Build local release AAB: `npm run android:bundle:local`
- Validate content only: `npm run validate:content`
- Content map summary: `npm run content:summary`
- Balance profile summary: `npm run balance:summary`
- Balance profile validation: `npm run balance:check`
- Balance profile diff: `npm run balance:diff -- <profile>`
- Economy/shop balance report: `npm run economy:check`
- Verify browser global script order: `npm run verify:script-order`
- Audit quest graph: `npm run audit:quests`
- Full local validation: `npm test`
- Save smoke test: `npm run smoke:save`
- Add-content CLI smoke test: `npm run smoke:add-content`
- Start-run smoke test: `npm run smoke:start-run`
- Boss-run smoke test: `npm run smoke:boss-run`
- Optional real-browser smoke test: `npm run smoke:browser`
- Quest flow smoke test: `npm run smoke:quest-flow`
- Speed-control VM smoke test: `npm run test:speed`
- Local server: `npm run serve`
- Deployment check: `npm run check:deploy`; it compares live Pages against local `www/` build metadata and runtime manifest.
- Generated content drift check: `npm run content:check`
- Focused verifier lanes: `npm run verify:assets`, `npm run verify:audio`, `npm run verify:content`, `npm run verify:relics`, `npm run verify:ui`
- CI validation: GitHub Actions runs `npm run agent:check` via `.github/workflows/agent-check.yml`; browser smoke is optional unless `SMOKE_BROWSER_REQUIRED=1`.
- GitHub Pages deployment: `.github/workflows/tap-survivor-pages.yml` runs `npm ci`, `npm run agent:check`, `npm run build:web`, and `npm run check:runtime-parity`, then publishes only `www/` to `gh-pages`.
- Optional agent task checkpoint writer: `npm run agent:start -- --goal "<task>"`
- Agent status overview: `npm run agent:status`
- Agent handoff summary: `npm run agent:handoff`
- Agent validation lane: `npm run agent:check`
- Agent evidence stub: `npm run agent:evidence -- --task "<short task name>"`
- Agent prepush lane: `npm run agent:prepush`
- Agent finish lane: `npm run agent:finish -- --message "<commit message>" --push --deploy`
- Agent ship shortcut: `npm run agent:ship -- --message "<commit message>" --deploy`
- Agent release shortcut: `npm run agent:release -- --message "<commit message>"`

## Current Limitations

- Weapon behavior kinds are dispatched in `src/weapon-fire.js`, but adding a new behavior kind still requires a matching helper handler and dispatch entry.
- New run-upgrade effect types require extending the interpreter in `src/upgrades.js`.
- Characters are registered as content but the current MVP still uses the default player directly.
- Level entries drive enemy mixes, spawn count, and spawn pressure in `src/enemies.js`; gameplay UI still only reports tower floor.
- Run boss timing is 150 seconds; boss ability tuning is content-driven; every fifth floor is a super boss and gives two relic choices on clear.
- Relic rewards have a 126-item pool: 26 green build-defining relics with unique runtime abilities,
  96 random themed Focus/Obsessed/Mastery relics, and 4 rare super-boss extras.
  Every relic has a unique static SVG icon under `assets/generated/tower/sprites/relics/`;
  the generated random relics intentionally avoid floor-numbered IDs/names.
- Level-up skill select icons intentionally use static clean icons only; do not re-enable animated sprite canvases there unless the UI is simplified around it.
- Asset paths include cache query strings; keep them in the registry, not gameplay code.
- Android packaging is Capacitor-based. Do not hand-copy runtime files into `android/`; use `npm run android:sync` so Android consumes the same generated `www/` runtime as GitHub Pages.
- No Play signing keys, keystores, service account files, billing, ads, analytics, Firebase, login, or backend services are included.

## Rules For Future Agents

- Read this file, `docs/CONTENT_EXTENSION_GUIDE.md`, and `docs/MAINTENANCE.md` first.
- Use the conversation and current git diff as the source of truth for the active request. `docs/CURRENT_TASK.md` is optional housekeeping and may be stale.
- Check `docs/CHANGELOG_AGENT.md` when changing structure or command workflows.
- Make one content or structure change at a time.
- Prefer `content/registry/*.json`, `content/balance/*.json`, and `scripts/add-content.mjs` over manual code edits.
- Content tooling is split under `scripts/content/`; `scripts/content-tools.mjs` remains the compatibility export surface.
- Future agents should edit the focused file that owns the relevant responsibility.
- For ES-module migration slices, put the real implementation in `src/modules/` and generate a classic bridge with `npm run build:bridges`.
- Do not hand-edit generated bridge files such as `src/shop-pricing.js`; keep script-order/global contracts until a separate bundled runtime entrypoint migration.
- Type contracts live under `types/`; JSDoc imports them for content tooling and `src/content-registry.js`.
- `npm run typecheck` is no-emit and currently scoped to the content/tooling slice. Run it after content tooling, schema, or content-registry changes.
- JSDoc contracts are the current step before any full TypeScript migration; do not convert runtime files to TypeScript without a separate migration task.
- Run `npm run build:content` after content registry edits.
- Run the smallest relevant validation, usually `npm run validate:content` for registry-only edits or `npm test` for code changes.
- Save evidence of inspected files, changed files, and validation output.
