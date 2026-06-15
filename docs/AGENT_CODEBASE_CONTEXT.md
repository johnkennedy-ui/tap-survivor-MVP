# Agent Codebase Context

## Project Purpose

Tap Survivor is a small browser MVP for a survival auto-attacker. The player moves around a canvas arena, defeats enemies, collects XP/loot, unlocks weapons and meta upgrades, completes quests, survives 2.5 minutes, and fights a boss.

## Engine And Language

- Engine/framework: no external game engine; plain browser JavaScript, HTML canvas, HTML, and CSS.
- Module style: browser globals loaded by `index.html` in script order.
- Runtime content source: `src/content.generated.js`, generated from `content/tap-survivor-content.json`.
- Runtime schema source: `src/content.generated.js` also exposes `globalThis.TapSurvivorContentSchema`, generated from `content/tap-survivor-schema.json`.

## Folder Map

- `index.html`: DOM shell, canvas, menus, script load order.
- `src/game.js`: run loop and high-level orchestration.
- `src/quests.js`: quest opening, completion, progress, and active quest weapon helpers.
- `src/progression.js`: skill-tree gate checks and weapon/meta upgrade purchase handlers.
- `src/save.js`: save defaults, loading, migration/normalization, and persistence.
- `src/effects.js`: shared runtime effect handlers for run upgrades and shop item bonuses.
- `src/ui.js`: DOM lookup helper for game UI elements.
- `src/run-ui.js`: run HUD and end-screen rendering helper.
- `src/run-update.js`: run update loop, player movement, XP/level progress, and combat/pickup ticking.
- `src/level-up.js`: level-up choice generation and level-up modal behavior.
- `src/input.js`: canvas pointer/touch movement input binding.
- `src/pickups.js`: XP, floor-scaled coin, and heart drop spawning, attraction, collection, and pickup text updates.
- `src/shop.js`: coin shop rendering, floor-scaled and purchase-inflated prices, purchases, persistence, item sprites, run-start bonuses, in-run shop-tab rendering, and immediate in-run player stat bonuses.
- `src/combat.js`: combat orchestration, damage accounting, enemy reap/loot handoff, and combat effects.
- `src/enemies.js`: enemy spawning, spawn patterns, melee/ranged enemy updates, randomized boss spawning, and boss special attacks.
- `src/rendering.js`: canvas drawing orchestration for arena, entities, effects, and projectiles.
- `src/render-hud.js`: canvas HUD drawing for floor badge, boss notice/health, and the weapon skill rail.
- `src/weapon-fire.js`: weapon cooldown, damage/reach scaling, firing patterns, projectiles, beams, areas, and weapon bursts.
- `src/math.js`: shared math and formatting helpers for runtime modules.
- `src/sprites.js`: shared sprite loading and canvas draw helper with per-size raster caching for SVG sprite performance.
- `src/assets.js`: shared resolver for effect sprites, clean icons, relic icons, level-up icons, and fallback asset paths.
- `src/upgrades.js`: generated weapon upgrade definitions plus the small run-upgrade effect interpreter.
- `src/styles.css`: page, panel, modal, and responsive styling.
- `content/tap-survivor-content.json`: source registry for weapons, weapon unlocks, quests, enemies, characters, shop items, levels, and asset IDs.
- `src/content.generated.js`: generated content bundle; do not edit directly.
- `assets/`: committed sprite and license files.
- `scripts/`: build, validation, content, deployment, and smoke-test utilities.
- `docs/`: agent context and extension guides.
- `docs/MAINTENANCE.md`: routine update and validation runbook.
- `docs/CURRENT_TASK.md`: optional local task checkpoint. It can be stale; do not treat it as authoritative over the conversation or git status.
- `docs/CHANGELOG_AGENT.md`: short log of structural changes that affect future agent work.

## Main Gameplay Systems

- Content registry: `content/tap-survivor-content.json`.
- Content schema/manifest: `content/tap-survivor-schema.json`.
- Content add templates: `content/tap-survivor-schema.json` under `templates`; `scripts/add-content.mjs` reads those defaults.
- Content build: `scripts/build-content.mjs`.
- Content validation: `scripts/content-tools.mjs` and `scripts/validate-content.mjs`; shop-item validation is split into a dedicated helper inside `content-tools`.
- Economy/shop balance check: `scripts/economy-check.mjs`.
- Browser global load-order check: `scripts/check-script-order.mjs`.
- Quest graph audit: `scripts/audit-quests.mjs`.
- Save/meta progression: `src/save.js`, `src/progression.js`, `src/run-state.js`, and orchestration in `src/game.js`.
- Run HUD/end-screen UI: `src/run-ui.js`.
- Run ticking/player movement: `src/run-update.js`.
- Coin shop: `src/shop.js` plus `shopItems` content and the in-run shop tab in `src/shell-ui.js`.
- Economy tuning: run `npm run economy:check` before monetization-route work; it reports shop tiers, stat lanes, buyout cost, price scaling, inflation, and coin reward scaling.
- Enemy and boss behavior: `src/enemies.js`; boss ability tuning lives in `content/tap-survivor-content.json`.
- Weapon firing behavior: `src/weapon-fire.js`.
- Rendering and sprite lookup: `src/rendering.js`; HUD overlays: `src/render-hud.js`.
- Upgrade definitions: meta upgrades and run upgrades in `content/tap-survivor-content.json`; weapon damage upgrades generated by `src/upgrades.js`.
- Runtime effect handlers: `src/effects.js`; keep supported stats/types aligned with `content/tap-survivor-schema.json`.

## Current Content Loading Model

The project is mixed but mostly registry-driven:

- Weapons, unlock nodes, meta upgrades, run upgrades, quests, quest groups, enemies, characters, shop items, levels, asset sources, and sprite paths are config-driven in `content/tap-survivor-content.json`.
- Supported content tooling templates/defaults, shop item field rules, effect stats, and validation command groups are described in `content/tap-survivor-schema.json`.
- Supported runtime behavior IDs for weapon kinds and boss ability kinds are also listed in `content/tap-survivor-schema.json`; content validation rejects unsupported IDs before runtime.
- `src/content.generated.js` exposes the content registry as `globalThis.TapSurvivorContent` and the content schema as `globalThis.TapSurvivorContentSchema`.
- Weapon behavior dispatch lives in `src/weapon-fire.js`; enemy lifecycle behavior lives in `src/enemies.js`.
- Weapon damage upgrades are generated from weapon definitions in `src/upgrades.js`.
- Run-upgrade one-shot effects and shop item stat bonuses use shared handlers in `src/effects.js`; shop bonus stats come from the generated schema at runtime, and combat-scaling run upgrades are read by tier ID in `src/weapon-fire.js`.
- UI layout is HTML/CSS-driven.

## Where To Add Content

- Weapons: add to `content/tap-survivor-content.json` under `weapons`, use a `kind` listed in `content/tap-survivor-schema.json`, add a `weaponUnlocks` entry, add related quests if needed, then run `npm run build:content`.
- Meta upgrades: add to `metaUpgrades` in `content/tap-survivor-content.json`; keep gates pointed at existing `weaponUnlocks` and `quests`.
- Weapon damage upgrades: set `upgradeId` on the weapon entry; `src/upgrades.js` generates the upgrade.
- Run upgrades: add to `runUpgrades` in `content/tap-survivor-content.json`; use supported effects only unless extending `src/upgrades.js`.
- Items: add to `shopItems` in `content/tap-survivor-content.json`; keep effect stats aligned with `content/tap-survivor-schema.json`.
- Levels: add to `levels` in `content/tap-survivor-content.json`.
- Characters: add to `characters` in `content/tap-survivor-content.json`.
- Sprites/assets: add files under `assets/<source>/<pack>/`, register source/license in `assets.sources`, then map logical IDs in `assets.sprites`.

## Where Not To Edit Unless Necessary

- Do not hand-edit `src/content.generated.js`.
- Do not change `src/game.js` for pure content additions.
- Do not change `src/combat.js` unless combat damage/reap orchestration changes are required.
- Do not change `src/enemies.js` unless enemy spawning, movement, boss behavior, or floor enemy scaling changes are required.
- Do not change `src/rendering.js` unless a new visual behavior or sprite category is required. Use `src/render-hud.js` for HUD overlays.
- Do not scatter raw asset paths in gameplay code; use logical IDs from the content registry.

## Build, Run, And Test Commands

- Build generated content: `npm run build:content`
- Validate content only: `npm run validate:content`
- Content map summary: `npm run content:summary`
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
- Deployment check: `npm run check:deploy`
- Generated content drift check: `npm run content:check`
- Focused verifier lanes: `npm run verify:assets`, `npm run verify:audio`, `npm run verify:content`, `npm run verify:relics`, `npm run verify:ui`
- CI validation: GitHub Actions runs `npm run agent:check` via `.github/workflows/agent-check.yml`; browser smoke is optional unless `SMOKE_BROWSER_REQUIRED=1`.
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

- Weapon behavior kinds are dispatched in `src/weapon-fire.js`, but adding a new behavior kind still requires a matching handler there.
- New run-upgrade effect types require extending the interpreter in `src/upgrades.js`.
- Characters are registered as content but the current MVP still uses the default player directly.
- Level entries drive enemy mixes, spawn count, and spawn pressure in `src/enemies.js`; gameplay UI still only reports tower floor.
- Run boss timing is 150 seconds; boss ability tuning is content-driven; every fifth floor is a super boss and gives two relic choices on clear.
- Asset paths include cache query strings; keep them in the registry, not gameplay code.

## Rules For Future Agents

- Read this file, `docs/CONTENT_EXTENSION_GUIDE.md`, and `docs/MAINTENANCE.md` first.
- Use the conversation and current git diff as the source of truth for the active request. `docs/CURRENT_TASK.md` is optional housekeeping and may be stale.
- Check `docs/CHANGELOG_AGENT.md` when changing structure or command workflows.
- Make one content or structure change at a time.
- Prefer `content/tap-survivor-content.json` and `scripts/add-content.mjs` over manual code edits.
- Run `npm run build:content` after content registry edits.
- Run the smallest relevant validation, usually `npm run validate:content` for registry-only edits or `npm test` for code changes.
- Save evidence of inspected files, changed files, and validation output.
