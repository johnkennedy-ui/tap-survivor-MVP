# Current Agent Task

This file is an optional repo-local checkpoint for a Tap Survivor task. It is housekeeping only and may be stale; use the conversation and current git diff as the source of truth.

## Active Goal

Add release candidate gate script

## Status

- State: in progress
- Started: 2026-06-18T14:59:06.302Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `scripts/release-candidate.mjs`
- `scripts/check-package-id.mjs`
- `package.json`
- `docs/skills/release-candidate.md`
- `docs/skills/SKILL_ROUTER.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/CONTENT_EXTENSION_GUIDE.md`

## Files Changed

- `scripts/release-candidate.mjs` adds the release candidate gate runner.
- `scripts/check-package-id.mjs` adds the package ID consistency check required by the gate.
- `package.json` adds `check:package-id` and `release:candidate`.
- `docs/skills/release-candidate.md` documents the release candidate skill.
- `docs/skills/SKILL_ROUTER.md` routes Play/internal-testing candidate proof to the release candidate skill.
- `docs/RELEASE_CHECKLIST.md` records the release candidate gate command.
- `docs/CURRENT_TASK.md` records this tooling/docs task.

## Validation Plan

Run the smallest command that proves the change:

```bash
node --check scripts/release-candidate.mjs
npm run release:candidate
npm run check:commit-evidence -- --commit HEAD --expect-file docs/MECHANIC_EXTENSION_GUIDE.md --min-lines docs/MECHANIC_EXTENSION_GUIDE.md=180 --allow-unchanged
git diff --check
npm run agent:check
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
