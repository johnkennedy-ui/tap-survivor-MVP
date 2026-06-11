# Agent Codebase Context

## Project Purpose

Tap Survivor is a small browser MVP for a survival auto-attacker. The player moves around a canvas arena, defeats enemies, collects XP/loot, unlocks weapons and meta upgrades, completes quests, survives six minutes, and fights a boss.

## Engine And Language

- Engine/framework: no external game engine; plain browser JavaScript, HTML canvas, HTML, and CSS.
- Module style: browser globals loaded by `index.html` in script order.
- Runtime content source: `src/content.generated.js`, generated from `content/tap-survivor-content.json`.

## Folder Map

- `index.html`: DOM shell, canvas, menus, script load order.
- `src/game.js`: UI events, run loop, level-up UI, loot/XP collection.
- `src/quests.js`: quest opening, completion, progress, and active quest weapon helpers.
- `src/save.js`: save defaults, loading, migration/normalization, and persistence.
- `src/combat.js`: enemy spawning, boss specials, weapon firing, damage, combat effects.
- `src/rendering.js`: canvas drawing for arena, entities, effects, HUD, skill rail.
- `src/math.js`: shared math and formatting helpers for runtime modules.
- `src/sprites.js`: shared sprite loading and canvas draw helper.
- `src/upgrades.js`: meta upgrade definitions and in-run upgrade definitions.
- `src/styles.css`: page, panel, modal, and responsive styling.
- `content/tap-survivor-content.json`: source registry for weapons, weapon unlocks, quests, enemies, characters, shop items, levels, and asset IDs.
- `src/content.generated.js`: generated content bundle; do not edit directly.
- `assets/`: committed sprite and license files.
- `scripts/`: build, validation, content, deployment, and smoke-test utilities.
- `docs/`: agent context and extension guides.
- `docs/MAINTENANCE.md`: routine update and validation runbook.
- `docs/CURRENT_TASK.md`: active task checkpoint; update this before editing.
- `docs/CHANGELOG_AGENT.md`: short log of structural changes that affect future agent work.

## Main Gameplay Systems

- Content registry: `content/tap-survivor-content.json`.
- Content build: `scripts/build-content.mjs`.
- Content validation: `scripts/content-tools.mjs` and `scripts/validate-content.mjs`.
- Quest graph audit: `scripts/audit-quests.mjs`.
- Save/meta progression: `src/game.js`.
- Combat and weapon behavior: `src/combat.js`.
- Rendering and sprite lookup: `src/rendering.js`.
- Upgrade definitions: `src/upgrades.js`.

## Current Content Loading Model

The project is mixed but mostly registry-driven:

- Weapons, unlock nodes, quests, quest groups, enemies, characters, shop items, levels, asset sources, and sprite paths are config-driven in `content/tap-survivor-content.json`.
- `src/content.generated.js` exposes that registry as `globalThis.TapSurvivorContent`.
- Weapon behavior still depends on `weapon.kind` branches in `src/combat.js`.
- Meta upgrades and run upgrades are still code-defined in `src/upgrades.js`.
- UI layout is HTML/CSS-driven.

## Where To Add Content

- Weapons: add to `content/tap-survivor-content.json` under `weapons`, add a `weaponUnlocks` entry, add related quests if needed, then run `npm run build:content`.
- Skills/upgrades: use `src/upgrades.js` for now; keep IDs tied to weapon IDs or stable upgrade IDs.
- Items: add to `shopItems` in `content/tap-survivor-content.json`.
- Levels: add to `levels` in `content/tap-survivor-content.json`.
- Characters: add to `characters` in `content/tap-survivor-content.json`.
- Sprites/assets: add files under `assets/<source>/<pack>/`, register source/license in `assets.sources`, then map logical IDs in `assets.sprites`.

## Where Not To Edit Unless Necessary

- Do not hand-edit `src/content.generated.js`.
- Do not change `src/game.js` for pure content additions.
- Do not change `src/combat.js` unless a new weapon behavior kind or combat rule is required.
- Do not change `src/rendering.js` unless a new visual behavior or sprite category is required.
- Do not scatter raw asset paths in gameplay code; use logical IDs from the content registry.

## Build, Run, And Test Commands

- Build generated content: `npm run build:content`
- Validate content only: `npm run validate:content`
- Audit quest graph: `npm run audit:quests`
- Full local validation: `npm test`
- Quest flow smoke test: `npm run smoke:quest-flow`
- Speed-control VM smoke test: `npm run test:speed`
- Local server: `npm run serve`
- Deployment check: `npm run check:deploy`
- CI validation: GitHub Actions runs `npm run agent:check` via `.github/workflows/agent-check.yml`.
- Agent task checkpoint writer: `npm run agent:start -- --goal "<task>"`
- Agent status overview: `npm run agent:status`
- Agent handoff summary: `npm run agent:handoff`
- Agent validation lane: `npm run agent:check`
- Agent evidence stub: `npm run agent:evidence -- --task "<short task name>"`

## Current Limitations

- Weapon behavior kinds are hard-coded in `src/combat.js`.
- Meta upgrades and run upgrades are in `src/upgrades.js`, not JSON.
- Characters are registered as content but the current MVP still uses the default player directly.
- Shop items and level entries are validated but not yet fully wired into gameplay UI.
- Asset paths include cache query strings; keep them in the registry, not gameplay code.

## Rules For Future Agents

- Read this file, `docs/CONTENT_EXTENSION_GUIDE.md`, and `docs/MAINTENANCE.md` first.
- Read and update `docs/CURRENT_TASK.md` for the active request before editing; use `npm run agent:start -- --goal "<task>"` for a clean checkpoint.
- Check `docs/CHANGELOG_AGENT.md` when changing structure or command workflows.
- Make one content or structure change at a time.
- Prefer `content/tap-survivor-content.json` and `scripts/add-content.mjs` over manual code edits.
- Run `npm run build:content` after content registry edits.
- Run the smallest relevant validation, usually `npm run validate:content` for registry-only edits or `npm test` for code changes.
- Save evidence of inspected files, changed files, and validation output.
