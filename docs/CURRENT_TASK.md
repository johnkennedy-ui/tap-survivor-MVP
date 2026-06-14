# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Add relic choice, run speed rebalance, and quest banner

## Status

- State: validated; ready to push/report
- Started: 2026-06-14T14:50:54.958Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`
- `content/tap-survivor-content.json`
- `index.html`
- `src/content.generated.js`
- `src/game.js`
- `src/relics.js`
- `src/quests.js`
- `src/ui.js`
- `src/styles.css`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`
- `scripts/verify-mvp.mjs`

## Files Changed

- `content/tap-survivor-content.json`
- `index.html`
- `src/content.generated.js`
- `src/game.js`
- `src/relics.js`
- `src/quests.js`
- `src/ui.js`
- `src/styles.css`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`
- `scripts/verify-mvp.mjs`
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
- `node --check src/game.js src/relics.js src/quests.js scripts/smoke-game-harness.mjs scripts/verify-speed-controls.mjs`: passed.
- `node scripts/verify-mvp.mjs`: passed 191 checks.
- Focused VM check: relic choices for `spark_bolt` are weapon-relevant and quest completion callback fires.
- `npm run validate:content`: passed.
- `npm run smoke:start-run`: passed.
- `npm run smoke:shop`: passed.
- `npm run smoke:boss-run`: passed.
- `npm test`: passed.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
