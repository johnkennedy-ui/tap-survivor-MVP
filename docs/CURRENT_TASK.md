# Current Agent Task

This file is an optional repo-local checkpoint for a Tap Survivor task. It is housekeeping only and may be stale; use the conversation and current git diff as the source of truth.

## Active Goal

Merge completed maintainability and skill-system branches

## Status

- State: in progress
- Started: 2026-06-16T18:08:12.000Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `AGENTS.md`
- `docs/skills/`
- Previously completed maintainability split files

## Files Changed

- Merged `dev/maintainability-split-format`.
- Merged `dev/agent-skills-system`.
- Resolved this checkpoint file to describe the merge state.

## Validation Plan

Run the smallest commands that prove the merged result:

```bash
npm run agent:check
npm test
git diff --check
```

Result:

- `npm run agent:check`: PASS
- `npm test`: PASS, 271 MVP checks plus speed control checks.
- `npm run build:web`: PASS
- `npm run check:runtime-parity`: PASS
- `git diff --check`: PASS

## Evidence Required

- Branches merged.
- Commands run.
- Validation commands and results.
- Push result.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after both completed branches are merged into `main`, validated, pushed, and reported.
