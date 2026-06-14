# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Split HUD rendering helper

## Status

- State: validated locally
- Started: 2026-06-14T17:45:08.079Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`
- `index.html`
- `src/render-hud.js`
- `src/rendering.js`
- `scripts/agent-check.mjs`
- `scripts/verify-mvp.mjs`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`

## Files Changed

- `index.html`
- `src/render-hud.js`
- `src/rendering.js`
- `scripts/agent-check.mjs`
- `scripts/verify-mvp.mjs`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`
- `docs/CURRENT_TASK.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `node --check src/render-hud.js`: passed.
- `node --check src/rendering.js`: passed.
- `node --check scripts/verify-mvp.mjs`: passed.
- `npm test`: passed 211 MVP checks.
- `npm run agent:prepush`: passed; cache keys bumped for `render-hud.js` and `rendering.js`.
- Evidence: `../Shane training/20260614T175028Z_render-hud-split/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
