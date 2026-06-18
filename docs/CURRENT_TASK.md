# Current Agent Task

This file is an optional repo-local checkpoint for a Tap Survivor task. It is housekeeping only and may be stale; use the conversation and current git diff as the source of truth.

## Active Goal

Add non-secret CI gate

## Status

- State: in progress
- Started: 2026-06-18T18:15:19.973Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `.github/workflows/ci.yml`
- `docs/skills/ci-gate.md`
- `docs/skills/SKILL_ROUTER.md`
- `docs/RELEASE_CHECKLIST.md`

## Files Changed

- `.github/workflows/ci.yml` adds the non-secret CI gate.
- `docs/skills/ci-gate.md` documents the CI gate workflow.
- `docs/skills/SKILL_ROUTER.md` routes CI/GitHub Actions work to the CI gate skill.
- `docs/RELEASE_CHECKLIST.md` requires CI to pass before release-candidate merge.
- `docs/CURRENT_TASK.md` records this tooling/docs task.

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run format:check
npm run check:format-hygiene
npm run check:package-id
npm run build:content
npm run validate:content
npm test
npm run agent:check
npm run build:web
npm run check:runtime-parity
npm run check:commit-evidence -- --help
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
