# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Add one content-driven shop damage upgrade

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T16:28:53.778Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `content/tap-survivor-content.json`
- `src/content.generated.js`
- `src/shop.js`
- `src/combat.js`
- `src/game.js`
- `scripts/content-tools.mjs`
- `scripts/content-summary.mjs`
- `scripts/smoke-shop.mjs`
- `scripts/verify-mvp.mjs`
- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `content/tap-survivor-content.json`
- `src/content.generated.js`
- `src/shop.js`
- `src/combat.js`
- `src/game.js`
- `scripts/content-tools.mjs`
- `scripts/smoke-shop.mjs`
- `scripts/verify-mvp.mjs`
- `docs/CURRENT_TASK.md`
- `docs/CONTENT_EXTENSION_GUIDE.md`
- `docs/CHANGELOG_AGENT.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run build:content
npm run agent:prepush
```

Result:

- `npm run build:content`: passed.
- `node --check src/shop.js`: passed.
- `node --check src/combat.js`: passed.
- `node --check scripts/smoke-shop.mjs`: passed.
- `npm run agent:prepush`: passed, including `content:summary`, all smoke tests, and `npm test`.
- `npm run agent:evidence -- --task "tap survivor weapon polish shop upgrade"`: passed and wrote `../Shane training/20260611T163234Z_tap-survivor-weapon-polish-shop-upgrade/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
