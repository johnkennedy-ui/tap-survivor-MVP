# Current Agent Task

This file is an optional repo-local checkpoint for a Tap Survivor task. It is housekeeping only and may be stale; use the conversation and current git diff as the source of truth.

## Active Goal

Merge validated tooling branches into main

## Status

- State: in progress
- Started: 2026-06-18T18:30:33.000Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `.prettierignore`
- `package.json`
- `scripts/release-candidate.mjs`
- `scripts/check-commit-evidence.mjs`
- `scripts/check-package-id.mjs`
- `scripts/check-task-scope.mjs`
- `docs/skills/release-candidate.md`
- `docs/skills/task-scope.md`
- `docs/skills/SKILL_ROUTER.md`
- `docs/skills/handoff-evidence.md`

## Files Changed

- Merge conflict resolved between release-gate verification and task-scope task state.
- Keep the combined validated tooling state from the merged branches.

## Validation Plan

Run the smallest command that proves the merged tree is coherent:

```bash
npm run format:check
npm run check:format-hygiene
npm run check:package-id
npm run check:task-scope -- --help
git diff --check
```

Result:

- Pending.

## Evidence Required

- Merged commits.
- Conflict resolution summary.
- Validation commands and results.
- Push result.

## Stop Condition

Stop after the merged main branch is validated, pushed, and reported.
