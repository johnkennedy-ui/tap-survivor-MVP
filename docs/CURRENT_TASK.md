# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Content-drive boss abilities and add stale-text check

## Status

- State: validated locally
- Started: 2026-06-14T18:21:30.747Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CONTENT_EXTENSION_GUIDE.md`
- `content/tap-survivor-content.json`
- `src/content.generated.js`
- `src/content-registry.js`
- `src/enemies.js`
- `src/combat.js`
- `src/game.js`
- `scripts/content-tools.mjs`
- `scripts/content-summary.mjs`
- `scripts/verify-mvp.mjs`
- `index.html`

## Files Changed

- `content/tap-survivor-content.json`
- `src/content.generated.js`
- `src/content-registry.js`
- `src/enemies.js`
- `src/combat.js`
- `src/game.js`
- `scripts/content-tools.mjs`
- `scripts/content-summary.mjs`
- `scripts/verify-mvp.mjs`
- `index.html`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CONTENT_EXTENSION_GUIDE.md`
- `docs/CURRENT_TASK.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `npm run build:content`: passed.
- `npm run validate:content`: passed.
- `node scripts/verify-mvp.mjs`: passed 213 checks, including boss ability content wiring and stale six-minute text guard.
- `npm run smoke:boss-run`: passed.
- `npm test`: passed.
- `npm run agent:prepush`: passed; cache keys bumped for changed runtime files.
- Evidence: `../Shane training/20260614T184353Z_boss-ability-content-stale-text-check/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
