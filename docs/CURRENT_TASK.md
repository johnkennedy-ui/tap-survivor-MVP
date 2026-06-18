# Current Agent Task

This file is an optional repo-local checkpoint for a Tap Survivor task. It is housekeeping only and may be stale; use the conversation and current git diff as the source of truth.

## Active Goal

Fix mechanic guide formatting and missing recipes

## Status

- State: in progress
- Started: 2026-06-18T12:49:49.847Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `docs/MECHANIC_EXTENSION_GUIDE.md`
- `docs/skills/mechanics-extension.md`

## Files Changed

- `docs/MECHANIC_EXTENSION_GUIDE.md` reformatted and expanded with the 10 required exact recipe headings.
- `docs/skills/mechanics-extension.md` tightened to require one recipe and handoff-evidence reporting.
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
