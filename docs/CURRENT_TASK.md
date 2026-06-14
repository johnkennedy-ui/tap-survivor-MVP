# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Add quest-chain helper

## Status

- State: validated locally
- Started: 2026-06-14T17:25:27.462Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `docs/CHANGELOG_AGENT.md`
- `docs/CONTENT_EXTENSION_GUIDE.md`
- `docs/MAINTENANCE.md`
- `package.json`
- `scripts/add-content.mjs`
- `scripts/content-tools.mjs`
- `scripts/smoke-content-tools.mjs`
- `scripts/agent-check.mjs`
- `scripts/verify-mvp.mjs`

## Files Changed

- `package.json`
- `scripts/add-content.mjs`
- `scripts/content-tools.mjs`
- `scripts/smoke-content-tools.mjs`
- `scripts/agent-check.mjs`
- `scripts/verify-mvp.mjs`
- `docs/CONTENT_EXTENSION_GUIDE.md`
- `docs/MAINTENANCE.md`
- `docs/CHANGELOG_AGENT.md`
- `docs/CURRENT_TASK.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `node --check scripts/add-content.mjs`: passed.
- `node --check scripts/content-tools.mjs`: passed.
- `npm run smoke:content-tools`: passed.
- `npm test`: passed 208 MVP checks.
- `npm run agent:prepush`: passed.
- Evidence: `../Shane training/20260614T172937Z_quest-chain-helper/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
