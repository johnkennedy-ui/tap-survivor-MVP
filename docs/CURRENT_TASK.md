# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Add basic coin shop and scale heart healing

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T16:05:20.499Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `content/tap-survivor-content.json`
- `src/content.generated.js`
- `index.html`
- `src/styles.css`
- `src/game.js`
- `src/pickups.js`
- `src/ui.js`
- `scripts/content-tools.mjs`
- `scripts/content-summary.mjs`
- `scripts/verify-mvp.mjs`
- `scripts/smoke-game-harness.mjs`
- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `content/tap-survivor-content.json`
- `src/content.generated.js`
- `src/shop.js`
- `src/pickups.js`
- `src/game.js`
- `src/save.js`
- `src/ui.js`
- `src/styles.css`
- `index.html`
- `package.json`
- `scripts/agent-check.mjs`
- `scripts/smoke-shop.mjs`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`
- `scripts/content-tools.mjs`
- `scripts/content-summary.mjs`
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
- `node --check src/shop.js`: passed.
- `node --check src/pickups.js`: passed.
- `node --check scripts/smoke-shop.mjs`: passed.
- `npm run smoke:shop`: passed.
- `npm run validate:content`: passed.
- `node scripts/verify-mvp.mjs`: passed, 118 checks.
- `npm run agent:prepush`: passed, including `content:summary`, all smoke tests, and `npm test`.
- `npm run agent:evidence -- --task "tap survivor coin shop and heart healing"`: passed and wrote `../Shane training/20260611T162326Z_tap-survivor-coin-shop-and-heart-healing/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
