# Maintainability Refactor Notes

This document records small structure changes made to keep future agent edits readable and low-risk.

## 2026-06-16 Save Helper Split And Format Hygiene

Scope:

- Maintainability only.
- No gameplay, balance, content, save schema, save key, storage key, Android signing, or Play Console changes.
- `src/save.js` remains the public save API entry point.
- Browser-global script loading is preserved.
- `www/` and `src/content.generated.js` remain generated files and must not be hand-edited.

Files reformatted:

- `README.md`: wrapped long scaffold command.
- `docs/AGENT_CODEBASE_CONTEXT.md`: wrapped long relic note.
- `docs/MAINTENANCE.md`: wrapped long agent/deploy workflow notes.
- `docs/PLAY_STORE_ANDROID_PREP.md`: wrapped long Android permission rationale.
- `src/input.js`: indentation-only formatting inside the IIFE.
- `src/run-ui.js`: split the run HUD text source into joined segments.

Files split:

- `src/save-defaults.js`: save schema version constant and default save shape.
- `src/save-migrations.js`: save migration table and migration helper.
- `src/save-normalize.js`: save normalization and shop-purchase normalization helpers.
- `src/save.js`: public save-system factory and storage orchestration.

Public APIs preserved:

- `globalThis.TapSurvivorSave.createSaveSystem(...)`
- save keys passed by callers
- legacy save key handling
- corrupt save backup behavior
- `saveVersion` schema value
- `loadSave`, `persist`, `removeSave`, `normalizeSave`, `defaultSave`, and `getLastLoadWarning`

Script-order changes:

- `index.html` now loads save helpers after `src/storage-adapter.js` and before `src/save.js`.
- `npm run verify:script-order` should remain green after any future helper split.

Format hygiene rule:

- `npm run check:format-hygiene` scans active source/docs and fails on unreadable active files.
- It ignores generated/build/archive paths such as `src/content.generated.js`, `www/`, `android/`, `node_modules/`, and `docs/tasks/`.
- `npm run agent:check` runs this check for source/docs changes and in the full validation lane.

Future save helper changes:

- Add default fields only in `src/save-defaults.js`.
- Add versioned migrations only in `src/save-migrations.js`.
- Add normalization/clamping only in `src/save-normalize.js`.
- Keep raw storage reads/writes in `src/save.js` and `src/storage-adapter.js`.
- Do not change save keys or schema version without a dedicated migration task.

Future weapon helper changes:

- `src/weapon-fire.js` was inspected but not split in this pass.
- If splitting it later, keep `src/weapon-fire.js` as the main integration point.
- Move only pure targeting/projectile/behavior helpers, preserve weapon stats and behavior, and run audio/start-run smoke tests.

Commands future agents should run:

```bash
npm run check:format-hygiene
npm run verify:script-order
npm run smoke:save
npm run smoke:start-run
npm run agent:check
```
