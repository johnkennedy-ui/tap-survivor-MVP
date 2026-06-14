# Agent Changelog

Short log of structural changes that affect future OpenClaw/Codex work. Keep entries concise and link them to the commands or docs future agents should use.

## 2026-06-14

- Added randomized boss variants: shockwave warden, red-flashing charger with forward slash, and stationary projectile turret.
- Retuned shop floor price scaling and coin reward scaling so the shop can be bought out around tower floor 100.
- Added shop inflation so buying an item increases remaining item costs and shows an inflation notice in the shop.
- Scaled shop prices by tower floor, added four shop upgrades with icons, and added an in-run shop tab to the run menu.
- Added random boss spawn entry, sky-drop warning/damage for non-side boss landings, boss-spawn notice text, and shield-pulse enemy projectile blocking charge.
- Added a top-of-screen boss health bar during boss fights.
- Added boss relic choice rewards, weapon-relevant relic choice weighting, a scroll-style quest completion banner, and spread run Move Speed across five smaller tiers.
- Fixed ranged enemy availability to unlock at tower floor 4, included it in early spawn mixes, applied in-run magnet purchases immediately, and added pickup text updates.
- Added the floor-4+ ranged `hexer` enemy using existing level enemy mixes and the enemy update loop.
- Shortened run boss timing to 150 seconds, added fifth-floor super boss relic drops, and added distinct SVG mappings for all weapons and shop items.
- Added per-size sprite raster caching in `src/sprites.js` and explicit enemy outline paths to reduce slowdown when many SVG enemies are drawn.
- Wired `content.levels` into `src/enemies.js` so level entries now control enemy mixes, spawn counts, and spawn pressure.
- Extended level authoring/validation for `enemyIds`, `spawnCount`, and `spawnRateMultiplier`; bad enemy references now fail `npm run validate:content`.

## 2026-06-12

- Extracted enemy spawning, enemy movement, boss spawning, and boss special attacks into `src/enemies.js`.
- Replaced the weapon-kind firing `if` chain with a dispatch table in `src/weapon-fire.js`.
- Extracted weapon firing, projectile, beam, area, and weapon-burst behavior into `src/weapon-fire.js`.
- Bumped the `src/game.js` browser cache key after the run-update split so live Pages users load the matching runtime file.
- Extracted run update loop, player movement, XP collection, and combat/pickup ticking into `src/run-update.js`.
- Extracted skill-tree progression gates and purchase handlers into `src/progression.js`.
- Extracted run HUD and end-screen rendering into `src/run-ui.js`.
- Extracted content and asset registry unpacking into `src/content-registry.js`.
- Extracted player/run reset and run-meta stat application into `src/run-state.js`.

## 2026-06-11

- Extracted relic grant, equipped relic, weapon slot, and weapon damage multiplier logic into `src/relics.js`.
- Tuned first three tower floors with shared balance scaling and added a debug overlay smoke test.
- Added a debug/balance overlay for floor scaling, weapon slots, weapon damage multiplier, relics, run upgrades, and weapon damage totals.
- Added weapon attack bursts, a 4-weapon run cap, and weapon-slot relic tradeoffs.
- Reworked generated tower SVG sprites with richer tower-fantasy styling and refreshed cache keys.
- Extracted start/menu/shop/fullscreen event wiring from `game.js` into `src/shell-ui.js`.
- Added a start menu overlay, bottom shop close control, shared modal scrolling, and an in-run exit action.
- Added a fullscreen control and changed the in-run Menu button to toggle the menu open and closed.
- Changed boss clears to advance the tower floor, reset run-only skills, grant relics, and continue into harder floors instead of ending the run.
- Added expanded shop options and boss-granted relics that auto-equip, raise linked skill max tiers, and weight linked skills in level-up choices.
- Added generated tower-themed SVG sprites for player, enemies, boss, and primary weapon icons.
- Added generated tower-floor stage artwork, a top-screen tower floor badge, and persisted floor progression after boss clears.
- Added projectile run upgrades for pierce, wall bounces, split fire, explosive hits, and splinter shots; expanded fire-rate/damage tier depth and weighted level-up choices toward started upgrade families.
- Added second-tier weapon mastery quests and generic weapon-ID quest progress.
- Added five end-chain milestone quests for kills, levels, damage, XP gems, and boss clears.
- Added optional `npm run smoke:browser` for real headless-browser UI smoke coverage.
- Added `weapon_polish` as a content-driven shop upgrade that feeds a flat weapon damage shop bonus into combat.
- Added a basic coin shop through `src/shop.js`, `shopItems` content, and `npm run smoke:shop`.
- Changed heart pickups to heal 20% of max HP.
- Added `src/pickups.js` for XP, coin, and heart drop behavior outside `src/game.js`.
- Added `src/input.js` for canvas pointer/touch movement binding outside `src/game.js`.
- Added `src/level-up.js` for level-up choice generation and modal behavior outside `src/game.js`.
- Moved run upgrades into `content/tap-survivor-content.json`; `src/upgrades.js` now only maps content entries to the small runtime effect interpreter.
- Moved static meta upgrades into `content/tap-survivor-content.json`; `src/upgrades.js` now combines generated weapon upgrades with content-driven meta upgrades.
- Added `src/ui.js` for DOM lookup outside `src/game.js`.
- Added `npm run agent:prepush` for content summary, validation, changed-file, deploy reminder, and commit-message preflight.
- Added `npm run content:summary` for a fast content map, quest chain, and reference overview.
- Added `npm run smoke:save`, `npm run smoke:start-run`, and `npm run smoke:boss-run` for focused debugging.
- Added `npm run smoke:quest-flow` for focused quest progress/completion/follow-up debugging.
- Added `src/quests.js` for quest opening, completion, progress, and active quest weapon helpers outside `src/game.js`.
- Added `src/save.js` for save defaults, loading, migration/normalization, and persistence outside `src/game.js`.
- Added `src/sprites.js` for shared sprite loading and drawing outside `src/game.js`.
- Added `src/math.js` for shared runtime math helpers used by game and rendering modules.
- Added `docs/MAINTENANCE.md` as the routine update and validation runbook.
- Added `docs/CURRENT_TASK.md` as the active repo-local task checkpoint.
- Added `npm run agent:start` to initialize `docs/CURRENT_TASK.md` from CLI arguments.
- Added `npm run agent:status` for a fast repo and content overview.
- Added `npm run agent:handoff` for a compact resume/delegation snapshot.
- Added `npm run agent:check` for the standard pre-report validation path.
- Added `npm run agent:evidence` to create a replayable evidence stub under `../Shane training/`.
- Added `.github/workflows/agent-check.yml` so pushes and pull requests run `npm run agent:check`.
