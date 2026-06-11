# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Extract save state helper

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T11:46:14.778Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `src/save.js`
- `src/game.js`
- `index.html`
- `scripts/verify-mvp.mjs`
- `scripts/verify-speed-controls.mjs`
- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `src/save.js`: added save defaults, load/migration normalization, and persistence helper.
- `src/game.js`: delegates save creation/loading/persistence to `TapSurvivorSave`.
- `index.html`: loads `src/save.js` before `src/game.js`.
- `scripts/verify-mvp.mjs`: validates save module load and helper wiring.
- `scripts/verify-speed-controls.mjs`: loads the save module in the VM smoke test.
- `docs/AGENT_CODEBASE_CONTEXT.md`: documents `src/save.js`.
- `docs/CHANGELOG_AGENT.md`: logs the extraction.
- `docs/CURRENT_TASK.md`: updated this checkpoint.

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `node --check src/save.js`: passed.
- `node --check src/game.js`: passed.
- `node scripts/verify-mvp.mjs`: passed, 93 checks.
- `npm run test:speed`: passed.
- `npm run agent:check`: passed, including `npm test`.
- `npm run agent:evidence -- --task "tap survivor save helper extraction"`: passed and wrote `../Shane training/20260611T114850Z_tap-survivor-save-helper-extraction/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
