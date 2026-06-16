# Current Agent Task

This file is an optional repo-local checkpoint for a Tap Survivor task. It is housekeeping only and may be stale; use the conversation and current git diff as the source of truth.

## Active Goal

Add skill-based execution system for Frank

## Status

- State: in progress
- Started: 2026-06-16T17:55:45.515Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `AGENTS.md`
- `docs/skills/`

## Files Changed

- `AGENTS.md`
- `docs/CURRENT_TASK.md`
- `docs/skills/SKILL_ROUTER.md`
- `docs/skills/android-debug-build.md`
- `docs/skills/content-patch.md`
- `docs/skills/device-qa-smoke-test.md`
- `docs/skills/file-split-maintainability.md`
- `docs/skills/format-hygiene.md`
- `docs/skills/handoff-evidence.md`
- `docs/skills/mechanics-extension.md`
- `docs/skills/play-release-aab.md`
- `docs/skills/runtime-parity.md`
- `docs/skills/save-lifecycle.md`
- `docs/skills/validation-baseline.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
npm test
git diff --check
```

Result:

- `npm run agent:check`: PASS
- `npm test`: PASS
- `git diff --check`: PASS

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
