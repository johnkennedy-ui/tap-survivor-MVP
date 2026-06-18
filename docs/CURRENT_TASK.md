# Current Agent Task

This file is an optional repo-local checkpoint for a Tap Survivor task. It is housekeeping only and may be stale; use the conversation and current git diff as the source of truth.

## Active Goal

Expand mechanic extension guide

## Status

- State: in progress
- Started: 2026-06-18T11:57:00.421Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `docs/MECHANIC_EXTENSION_GUIDE.md`
- `docs/skills/mechanics-extension.md`

## Files Changed

- `docs/MECHANIC_EXTENSION_GUIDE.md` expanded into a recipe guide with boundaries, ownership, validation matrix, and prompt templates.
- `docs/skills/mechanics-extension.md` now points agents to the guide and requires one recipe only.
- `docs/CURRENT_TASK.md` records this docs-only task.

## Validation Plan

Run the smallest command that proves the change:

```bash
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
