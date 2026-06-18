# Current Agent Task

This file is an optional repo-local checkpoint for a Tap Survivor task. It is housekeeping only and may be stale; use the conversation and current git diff as the source of truth.

## Active Goal

Add commit evidence checker

## Status

- State: in progress
- Started: 2026-06-18T14:34:31.071Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `scripts/check-commit-evidence.mjs`
- `package.json`
- `docs/skills/commit-evidence.md`
- `docs/skills/handoff-evidence.md`
- `docs/skills/SKILL_ROUTER.md`
- `docs/CONTENT_EXTENSION_GUIDE.md`

## Files Changed

- `scripts/check-commit-evidence.mjs` adds the committed-object evidence checker.
- `package.json` adds `check:commit-evidence`.
- `docs/skills/commit-evidence.md` documents the commit evidence skill.
- `docs/skills/handoff-evidence.md` requires commit evidence checks for claimed file changes.
- `docs/skills/SKILL_ROUTER.md` routes committed-file proof to the new skill.
- `docs/CURRENT_TASK.md` records this tooling/docs task.

## Validation Plan

Run the smallest command that proves the change:

```bash
node --check scripts/check-commit-evidence.mjs
npm run check:commit-evidence -- --help
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
