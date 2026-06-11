# Agent Changelog

Short log of structural changes that affect future OpenClaw/Codex work. Keep entries concise and link them to the commands or docs future agents should use.

## 2026-06-11

- Added `docs/CURRENT_TASK.md` as the active repo-local task checkpoint.
- Added `npm run agent:start` to initialize `docs/CURRENT_TASK.md` from CLI arguments.
- Added `npm run agent:status` for a fast repo and content overview.
- Added `npm run agent:handoff` for a compact resume/delegation snapshot.
- Added `npm run agent:check` for the standard pre-report validation path.
- Added `npm run agent:evidence` to create a replayable evidence stub under `../Shane training/`.
