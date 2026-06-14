# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Scale shop by tower floor and add in-run shop tab

## Status

- State: validated locally
- Started: 2026-06-14T15:17:08.941Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`
- `content/tap-survivor-content.json`
- `index.html`
- `src/shop.js`
- `src/shell-ui.js`
- `src/ui.js`
- `src/styles.css`
- `src/content.generated.js`
- `scripts/verify-mvp.mjs`
- `scripts/smoke-shop.mjs`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`

## Files Changed

- `content/tap-survivor-content.json`
- `index.html`
- `src/shop.js`
- `src/shell-ui.js`
- `src/ui.js`
- `src/styles.css`
- `src/content.generated.js`
- `scripts/verify-mvp.mjs`
- `scripts/smoke-shop.mjs`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`
- `assets/generated/tower/sprites/shop-aether-soles.svg`
- `assets/generated/tower/sprites/shop-soul-satchel.svg`
- `assets/generated/tower/sprites/shop-ember-whetstone.svg`
- `assets/generated/tower/sprites/shop-chrono-spring.svg`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`
- `docs/CURRENT_TASK.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `npm run build:content`: passed.
- `node --check src/shop.js src/shell-ui.js src/ui.js scripts/smoke-game-harness.mjs scripts/verify-speed-controls.mjs`: passed.
- `npm run validate:content`: passed.
- `node scripts/verify-mvp.mjs`: passed 196 checks.
- `npm run smoke:shop`: passed.
- Focused VM check: floor 5 renders scaled shop cost for the first item.
- `npm test`: passed.
- `npm run agent:prepush`: passed.
- `npm run agent:evidence -- --task scaling-shop-menu-tab`: wrote `../Shane training/20260614T152329Z_scaling-shop-menu-tab/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
