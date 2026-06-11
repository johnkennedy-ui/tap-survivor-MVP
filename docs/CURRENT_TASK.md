# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Extract quest helper module

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T11:53:59.669Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `src/quests.js`
- `src/game.js`
- `index.html`
- `scripts/verify-mvp.mjs`
- `scripts/verify-speed-controls.mjs`
- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `src/quests.js`: added quest opening, completion, progress, group progress, and active quest weapon helpers.
- `src/game.js`: delegates quest helper behavior to `TapSurvivorQuests`.
- `index.html`: loads `src/quests.js` before save/game modules that use it.
- `scripts/verify-mvp.mjs`: validates quest module load and quest helper wiring.
- `scripts/verify-speed-controls.mjs`: loads the quest module in the VM smoke test.
- `docs/AGENT_CODEBASE_CONTEXT.md`: documents `src/quests.js`.
- `docs/CHANGELOG_AGENT.md`: logs the extraction.
- `docs/CURRENT_TASK.md`: updated this checkpoint.

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `node --check src/quests.js`: passed.
- `node --check src/game.js`: passed.
- `node scripts/verify-mvp.mjs`: passed, 96 checks.
- `npm run test:speed`: passed.
- `npm run agent:check`: passed, including `npm test`.
- `npm run agent:evidence -- --task "tap survivor quest helper extraction"`: passed and wrote `../Shane training/20260611T115703Z_tap-survivor-quest-helper-extraction/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
