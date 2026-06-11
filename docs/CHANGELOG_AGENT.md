# Agent Changelog

Short log of structural changes that affect future OpenClaw/Codex work. Keep entries concise and link them to the commands or docs future agents should use.

## 2026-06-11

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
