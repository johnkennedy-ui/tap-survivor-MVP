# Current Agent Task

This file is an optional repo-local checkpoint for a Tap Survivor task. It is housekeeping only and may be stale; use the conversation and current git diff as the source of truth.

## Active Goal

Prepare Play privacy and Data safety docs

## Status

- State: in progress
- Started: 2026-06-18T20:00:59.572Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `docs/PRIVACY_POLICY_DRAFT.md`
- `docs/PLAY_DATA_SAFETY_WORKSHEET.md`
- `docs/PLAY_PERMISSIONS_WORKSHEET.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/PLAY_STORE_ANDROID_PREP.md`

## Files Changed

- `docs/PRIVACY_POLICY_DRAFT.md` adds the draft privacy policy.
- `docs/PLAY_DATA_SAFETY_WORKSHEET.md` adds the Play Data safety worksheet.
- `docs/PLAY_PERMISSIONS_WORKSHEET.md` adds the Android permissions worksheet.
- `docs/RELEASE_CHECKLIST.md` links the privacy/Data safety/permissions docs.
- `docs/PLAY_STORE_ANDROID_PREP.md` links the privacy/Data safety/permissions docs.
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

- Pending.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
