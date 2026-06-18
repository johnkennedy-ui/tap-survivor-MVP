# Current Agent Task

This file is an optional repo-local checkpoint for a Tap Survivor task. It is housekeeping only and may be stale; use the conversation and current git diff as the source of truth.

## Active Goal

Verify release candidate gate and formatting coverage

## Status

- State: in progress
- Started: 2026-06-18T17:06:01.064Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `.prettierignore`
- `package.json`
- `scripts/release-candidate.mjs`
- `docs/skills/release-candidate.md`
- `docs/RELEASE_CHECKLIST.md`
- `scripts/check-format-hygiene.mjs`

## Files Changed

- `.prettierignore` explicitly unignores active release/evidence tooling scripts.
- `scripts/check-commit-evidence.mjs` is formatted now that it is covered.
- `scripts/check-package-id.mjs` is formatted now that it is covered.
- `docs/CURRENT_TASK.md` records this verification task.

## Validation Plan

Run the smallest command that proves the change:

```bash
node --check scripts/release-candidate.mjs
npm run format:check
npm run check:format-hygiene
npm run check:package-id
npm run check:commit-evidence -- --help
npm run release:candidate
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
