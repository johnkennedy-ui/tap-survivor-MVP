# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Auto-bump runtime cache keys

## Status

- State: validated locally
- Started: 2026-06-14T17:13:20.140Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `docs/CHANGELOG_AGENT.md`
- `docs/MAINTENANCE.md`
- `package.json`
- `scripts/agent-prepush.mjs`
- `scripts/bump-cache-keys.mjs`
- `scripts/verify-mvp.mjs`

## Files Changed

- `package.json`
- `scripts/agent-prepush.mjs`
- `scripts/bump-cache-keys.mjs`
- `scripts/verify-mvp.mjs`
- `docs/MAINTENANCE.md`
- `docs/CHANGELOG_AGENT.md`
- `docs/CURRENT_TASK.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `node --check scripts/bump-cache-keys.mjs`: passed.
- `npm run cache:bump`: passed, no cache change needed for tooling-only patch.
- `npm test`: passed 205 MVP checks.
- `npm run agent:prepush`: passed; cache-bump hook ran first.
- Evidence: `../Shane training/20260614T171646Z_auto-cache-key-bump/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
