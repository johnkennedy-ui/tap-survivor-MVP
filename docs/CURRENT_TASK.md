# Current Agent Task

This file is an optional repo-local checkpoint for a Tap Survivor task. It is housekeeping only and may be stale; use the conversation and current git diff as the source of truth.

## Active Goal

Add task scope checker

## Status

- State: in progress
- Started: 2026-06-18T17:58:54.651Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `scripts/check-task-scope.mjs`
- `package.json`
- `docs/skills/task-scope.md`
- `docs/skills/SKILL_ROUTER.md`
- `docs/skills/handoff-evidence.md`

## Files Changed

- `scripts/check-task-scope.mjs` adds the task scope checker.
- `package.json` adds `check:task-scope`.
- `docs/skills/task-scope.md` documents the task scope workflow.
- `docs/skills/SKILL_ROUTER.md` routes permitted-file verification to the task scope skill.
- `docs/skills/handoff-evidence.md` requires scope evidence for scoped tasks.
- `docs/CURRENT_TASK.md` records this tooling/docs task.

## Validation Plan

Run the smallest command that proves the change:

```bash
node --check scripts/check-task-scope.mjs
npm run check:task-scope -- --help
npm run check:task-scope -- --mode working --allow "scripts/**" --allow "docs/**" --allow "package.json" --forbid "src/**" --forbid "android/**" --forbid "www/**"
npm run check:format-hygiene
npm run agent:check
npm test
git diff --check
```

Result:

- Passed.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
