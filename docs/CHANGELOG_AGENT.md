# Agent Changelog

Short log of structural changes that affect future OpenClaw/Codex work. Keep entries concise and link them to the commands or docs future agents should use.

## 2026-06-11

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
