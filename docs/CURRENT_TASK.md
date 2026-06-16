# Current Agent Task

This file is an optional repo-local checkpoint for a Tap Survivor task. It is housekeeping only and may be stale; use the conversation and current git diff as the source of truth.

## Active Goal

Improve maintainability by formatting one-line files and extracting safe helpers

## Status

- State: in progress
- Started: 2026-06-16T16:53:35.199Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CONTENT_EXTENSION_GUIDE.md`
- `docs/MAINTAINABILITY_REFACTOR.md`
- `docs/MAINTENANCE.md`
- `docs/PLAY_STORE_ANDROID_PREP.md`
- `README.md`
- `index.html`
- `package.json`
- `scripts/agent-check.mjs`
- `scripts/check-format-hygiene.mjs`
- `src/input.js`
- `src/run-ui.js`
- `src/save.js`
- `src/save-defaults.js`
- `src/save-migrations.js`
- `src/save-normalize.js`

## Files Changed

- `README.md`: wrapped long content scaffold command.
- `docs/AGENT_CODEBASE_CONTEXT.md`: added save helper ownership notes and wrapped a long relic note.
- `docs/MAINTENANCE.md`: wrapped long agent/deploy workflow notes.
- `docs/MAINTAINABILITY_REFACTOR.md`: added future-agent ownership notes for this refactor.
- `docs/PLAY_STORE_ANDROID_PREP.md`: wrapped long Android permission rationale.
- `index.html`: loads save helper scripts before `src/save.js`.
- `package.json`: added `check:format-hygiene`.
- `scripts/agent-check.mjs`: runs format hygiene in full and relevant focused checks.
- `scripts/check-format-hygiene.mjs`: added active source/docs readability guard.
- `src/input.js`: indentation-only formatting.
- `src/run-ui.js`: split long HUD source string into joined segments.
- `src/save-defaults.js`: added default save/schema helper.
- `src/save-migrations.js`: added save migration helper.
- `src/save-normalize.js`: added normalization helper.
- `src/save.js`: kept public save API and delegated helpers.

## Manual Review Checklist

- Runtime behaviour intentionally changed: no.
- Save schema changed: no.
- Package identity changed: no.
- GitHub.io/Android parity changed: no.
- Generated files hand-edited: no.
- New files requiring `index.html` script-order updates: yes, `src/save-defaults.js`, `src/save-migrations.js`, and `src/save-normalize.js`.
- Public APIs preserved: `TapSurvivorSave.createSaveSystem(...)` remains the save entry point.
- Systems split in this task: save only.
- Systems intentionally not split: weapon-fire and CSS.

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `node --check src/save.js`: PASS
- `node --check src/storage-adapter.js`: PASS
- `node --check src/weapon-fire.js`: PASS
- `node --check src/input.js`: PASS
- `node --check src/save-defaults.js`: PASS
- `node --check src/save-migrations.js`: PASS
- `node --check src/save-normalize.js`: PASS
- `npm run check:format-hygiene`: PASS
- `npm run build:content`: PASS
- `npm run validate:content`: PASS
- `npm run smoke:save`: PASS
- `npm run smoke:start-run`: PASS
- `npm run smoke:quest-flow`: PASS
- `npm run smoke:shop`: PASS
- `npm run smoke:browser`: ran directly and skipped because the sandbox `chromium-browser` snap wrapper cannot start; full `agent:check` browser smoke lane completed with the repo's non-required behavior.
- `npm test`: PASS
- `npm run agent:check`: PASS
- `npm run build:web`: PASS
- `npm run check:runtime-parity`: PASS
- `npm run android:sync`: PASS
- `npm run android:debug`: PASS, APK `android/app/build/outputs/apk/debug/app-debug.apk`, 20,466,783 bytes.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
