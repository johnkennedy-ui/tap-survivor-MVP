# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Move run upgrade definitions into content

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T15:28:08.752Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `content/tap-survivor-content.json`
- `src/upgrades.js`
- `src/content.generated.js`
- `scripts/content-tools.mjs`
- `scripts/content-summary.mjs`
- `scripts/audit-quests.mjs`
- `scripts/verify-mvp.mjs`
- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CONTENT_EXTENSION_GUIDE.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `content/tap-survivor-content.json`
- `src/upgrades.js`
- `src/content.generated.js`
- `scripts/content-tools.mjs`
- `scripts/content-summary.mjs`
- `scripts/audit-quests.mjs`
- `scripts/verify-mvp.mjs`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CONTENT_EXTENSION_GUIDE.md`
- `docs/CHANGELOG_AGENT.md`
- `docs/CURRENT_TASK.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run build:content
npm run agent:prepush
```

Result:

- `npm run build:content`: passed.
- `node --check src/upgrades.js`: passed.
- `node --check scripts/content-tools.mjs`: passed.
- `node --check scripts/content-summary.mjs`: passed.
- `npm run agent:prepush`: passed, including `content:summary`, all smoke tests, and `npm test`.
- `npm run agent:evidence -- --task "tap survivor run upgrades content"`: passed and wrote `../Shane training/20260611T153348Z_tap-survivor-run-upgrades-content/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
