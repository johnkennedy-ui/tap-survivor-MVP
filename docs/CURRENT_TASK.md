# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Improve boss attack telegraphs and projectile pacing

## Status

- State: validated locally
- Started: 2026-06-14T19:01:29.567Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `content/tap-survivor-content.json`
- `src/content.generated.js`
- `src/enemies.js`
- `src/render-hud.js`
- `src/rendering.js`
- `src/run-state.js`
- `scripts/content-tools.mjs`
- `scripts/verify-mvp.mjs`
- `index.html`

## Files Changed

- `content/tap-survivor-content.json`
- `src/content.generated.js`
- `src/enemies.js`
- `src/render-hud.js`
- `src/rendering.js`
- `src/run-state.js`
- `scripts/content-tools.mjs`
- `scripts/verify-mvp.mjs`
- `index.html`
- `docs/CURRENT_TASK.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `npm run build:content`: passed.
- `npm run validate:content`: passed.
- `node scripts/verify-mvp.mjs`: passed 216 checks, including boss special charge bar, high-visibility enemy projectiles, and tower-floor projectile pacing.
- `npm run smoke:boss-run`: passed.
- `npm test`: passed.
- `npm run agent:prepush`: passed; cache keys bumped for changed runtime files.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
