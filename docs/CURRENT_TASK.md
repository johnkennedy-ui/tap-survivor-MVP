# Current Agent Task

This file is an optional repo-local checkpoint for a Tap Survivor task. It is housekeeping only and may be stale; use the conversation and current git diff as the source of truth.

## Active Goal

Harden save lifecycle for Android and GitHub.io

## Status

- State: in progress
- Started: 2026-06-16T12:01:20.108Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `src/save.js`
- `src/game.js`
- `src/progression.js`
- `src/quests.js`
- `src/shop.js`
- `src/relics.js`
- `src/run-update.js`
- `index.html`
- `package.json`
- `scripts/smoke-save.mjs`
- `scripts/check-runtime-parity.mjs`
- `docs/RUNTIME_PARITY.md`
- `docs/PLAY_STORE_ANDROID_PREP.md`
- `docs/SAVE_LIFECYCLE.md`

## Files Changed

- `docs/CURRENT_TASK.md`
- `docs/RUNTIME_PARITY.md`
- `docs/SAVE_LIFECYCLE.md`
- `index.html`
- `package.json`
- `package-lock.json`
- `scripts/smoke-game-harness.mjs`
- `scripts/smoke-quest-flow.mjs`
- `scripts/smoke-relic-run-start.mjs`
- `scripts/smoke-start-run.mjs`
- `scripts/smoke-save.mjs`
- `scripts/verify-mvp.mjs`
- `scripts/verify-speed-controls.mjs`
- `src/game.js`
- `src/save.js`
- `src/storage-adapter.js`
- `android/app/capacitor.build.gradle`
- `android/capacitor.settings.gradle`

## Slice 1 Save Audit

Current save key:

- Primary key: `tap-survivor-mvp-save-v2`
- Legacy key: `tap-survivor-mvp-save-v1`

Current save schema/version:

- Current schema version constant: `CURRENT_SAVE_VERSION = 3` in `src/save.js`.
- Saved objects use `saveVersion`.
- Migrations currently exist for version 2 (`shopPurchases`) and version 3 (`seenBanners`).

Where saves are read:

- `src/game.js` creates the save system and calls `saveSystem.loadSave()` once during startup.
- `src/save.js` reads `localStorage.getItem(saveKey)` first, then falls back to `localStorage.getItem(legacySaveKey)`.
- `scripts/smoke-save.mjs` exercises the same save system with an in-memory `localStorage` stub.

Where saves are written:

- `src/game.js` defines central `persist()`, which calls `saveSystem.persist(save)`.
- `src/save.js` writes with `localStorage.setItem(saveKey, JSON.stringify(save))`.
- `src/game.js` calls `persist()` on run end, boss-floor clear, banner/tutorial flag changes, and after reset.
- `src/progression.js` calls the injected `persist()` after weapon unlocks and permanent upgrade purchases.
- `src/quests.js` calls the injected `persist()` after opening and completing quests.
- `src/shop.js` calls the injected `persist()` after shop purchases.

Whether writes are centralised:

- Mostly centralised through `src/game.js` `persist()` and `src/save.js` `persist(save)`.
- Reset is not fully centralised: `src/game.js` directly calls `localStorage.removeItem(saveKey)` and `localStorage.removeItem(legacySaveKey)`.
- Save code still directly depends on browser `localStorage`; there is no storage adapter yet.

Missing save behaviour:

- `src/save.js` loads `{}` when both keys are missing, migrates it, merges it over `defaultSave()`, and normalises it.
- Result is a valid default/current save with starter quests and `spark_bolt`.

Corrupt JSON behaviour:

- `src/save.js` catches any load error and returns `defaultSave()`.
- The corrupt raw value is not backed up.
- No warning/debug state is exposed.

Partial save behaviour:

- Partial objects are merged over `defaultSave()` and then passed through `normalizeSave()`.
- Normalisation fills required arrays/maps, clamps coins/tower floor/shop tiers, restores starter quests, and derives unlocked upgrades from upgrade tiers.

Future/unknown field behaviour:

- Unknown top-level fields are preserved by the current `{ ...defaultSave(), ...input }` merge.
- Future `saveVersion` values are forced back to the current version by `migrateSave()`.

Old save version behaviour:

- Missing or low `saveVersion` is treated as version 1 minimum.
- Migrations run sequentially up to version 3.
- Legacy key `tap-survivor-mvp-save-v1` is read if the primary key is absent.

App close/background behaviour currently known:

- There is no explicit lifecycle flush handler yet.
- Persistence currently depends on immediate writes after meaningful actions.
- No `visibilitychange`, `pagehide`, `beforeunload`, or Capacitor App event handling is present in the inspected files.

Slice 1 stop condition:

- Stop after documenting current save behavior and validating the docs-only change.

## Slice 2 Storage Adapter

Implemented storage adapter:

- Added `src/storage-adapter.js`.
- Added `TapSurvivorStorage.createStorageAdapter({ saveKey, legacySaveKey })`.
- Adapter exposes:
  - `getSaveRaw()`
  - `setSaveRaw(value)`
  - `removeSaveRaw()`
  - `getStorageBackendName()`
  - `getLastStorageError()`
- Web/GitHub.io path uses `localStorage`.
- Android/Capacitor path prefers `Capacitor.Plugins.Preferences` when available.
- If Capacitor Preferences throws, the adapter falls back to `localStorage`.
- If `localStorage` is unavailable or throws, load returns no raw save and write/remove return controlled false states instead of crashing startup.

Save wiring:

- `src/save.js` now reads, writes, and removes raw save data through the adapter.
- `src/game.js` reset no longer calls `localStorage.removeItem(...)` directly.
- LocalStorage startup remains synchronous for existing browser/test behavior.
- Capacitor Preferences startup remains promise-compatible for native storage.
- Save schema was not changed in this slice.

Capacitor plugin:

- Installed `@capacitor/preferences`.
- Ran `npm run android:sync`.
- Capacitor sync updated Android plugin wiring:
  - `android/app/capacitor.build.gradle`
  - `android/capacitor.settings.gradle`

Slice 2 tests run so far:

- `node --check src/storage-adapter.js`: PASS
- `node --check src/save.js`: PASS
- `node --check src/game.js`: PASS
- `node --check scripts/smoke-save.mjs`: PASS
- `node --check scripts/smoke-game-harness.mjs`: PASS
- `npm run smoke:save`: PASS
- `npm run smoke:start-run`: PASS
- `npm run verify:script-order`: PASS
- `npm run android:sync`: PASS
- `npm test`: PASS
- `npm run agent:check`: PASS

## Slice 3 Save Load Hardening

Implemented save-load hardening:

- Kept `saveVersion` at current schema version `3`.
- Kept one canonical load path: raw storage value -> JSON parse -> migrate -> normalize.
- Missing save still returns a valid default save.
- Corrupt JSON no longer crashes startup.
- Corrupt raw save value is copied to backup key `tap-survivor-mvp-save-v2-corrupt-backup` before returning a clean default save where storage permits.
- `saveSystem.getLastLoadWarning()` exposes controlled warning states:
  - `corrupt-save`
  - `storage-read-failed`
- Partial/malformed save objects now normalise invalid arrays/objects back to safe defaults.
- Old version saves still migrate sequentially to version 3.
- Future/unknown top-level fields are preserved while `saveVersion` normalises back to 3.

Slice 3 tests added/updated in `scripts/smoke-save.mjs`:

- Fresh save creates valid default.
- Missing save does not crash.
- Corrupt save does not crash.
- Corrupt raw save is backed up.
- Partial malformed save is normalised.
- Old version save migrates.
- Future/unknown fields do not crash and are preserved.
- Reset save still removes current and legacy keys.
- Storage unavailable/throwing path still returns default and reports controlled false writes.

Slice 3 validation:

- `node --check src/storage-adapter.js`: PASS
- `node --check src/save.js`: PASS
- `node --check scripts/smoke-save.mjs`: PASS
- `npm run smoke:save`: PASS
- `npm test`: PASS
- `npm run agent:check`: PASS

## Slice 4 Lifecycle Flush

Implemented lifecycle flush:

- Added `flushSave()` in `src/game.js`.
- `persist()` now returns the storage write result for callers that need it.
- Bound browser lifecycle events after runtime startup:
  - `visibilitychange`: flushes when `document.visibilityState === "hidden"`.
  - `pagehide`: flushes current save.
  - `beforeunload`: flushes current save.
- Added small Capacitor App event bridge:
  - Uses `Capacitor.Plugins.App.addListener("appStateChange", ...)` when available.
  - Flushes save when `{ isActive }` becomes false.
  - Safely no-ops in browser/test runtimes without Capacitor App.
- No back-button or navigation changes were added.
- No save schema, gameplay, balance, or progression changes were made.

Capacitor plugin:

- Installed `@capacitor/app`.
- Ran `npm run android:sync`.
- Android sync now reports two Capacitor plugins:
  - `@capacitor/app@8.1.0`
  - `@capacitor/preferences@8.0.1`

Slice 4 tests updated:

- `scripts/smoke-game-harness.mjs` can dispatch lifecycle events in the VM harness.
- `scripts/smoke-start-run.mjs` verifies `pagehide` flushes the current save to storage.

Slice 4 validation:

- `node --check src/game.js`: PASS
- `node --check scripts/smoke-game-harness.mjs`: PASS
- `node --check scripts/smoke-start-run.mjs`: PASS
- `npm run smoke:start-run`: PASS
- `npm run verify:script-order`: PASS
- `npm run android:sync`: PASS
- `npm test`: PASS
- `npm run agent:check`: PASS

## Slice 5 Persistence Event Coverage

Verified existing save-trigger paths:

- Quest completion persists through `src/quests.js`.
- Quest point weapon unlock spend persists through `src/progression.js`.
- Quest point meta upgrade spend persists through `src/progression.js`.
- Shop/meta purchase persists through `src/shop.js`.
- Run completion persists through `src/game.js` `endRun(...)`.
- Tutorial/banner flags persist through `src/game.js` `markBannerSeen(...)`.
- Relic equip and unequip persist through `src/shell-ui.js`.
- Relic unlock from boss clear was already covered by the existing boss/relic flow and final boss-clear persist path.
- No animation-frame save writes were added.

Slice 5 tests updated:

- `scripts/smoke-quest-flow.mjs`
  - verifies quest completion persist
  - verifies weapon unlock QP spend persist
  - verifies meta upgrade QP spend persist
- `scripts/smoke-start-run.mjs`
  - verifies tutorial/banner flag persistence
  - verifies run completion persistence
  - keeps lifecycle pagehide persistence assertion from slice 4
- `scripts/smoke-relic-run-start.mjs`
  - verifies relic equip persistence
  - verifies relic unequip persistence
- `scripts/smoke-shop.mjs`
  - already verifies shop purchase persistence

Slice 5 validation:

- `node --check scripts/smoke-quest-flow.mjs`: PASS
- `node --check scripts/smoke-start-run.mjs`: PASS
- `node --check scripts/smoke-relic-run-start.mjs`: PASS
- `npm run smoke:quest-flow`: PASS
- `npm run smoke:start-run`: PASS
- `npm run smoke:relic-run-start`: PASS
- `npm run smoke:shop`: PASS
- `npm test`: PASS
- `npm run agent:check`: PASS

## Slice 6 Docs And Parity Validation

Documentation added/updated:

- Added `docs/SAVE_LIFECYCLE.md`.
- Updated `docs/RUNTIME_PARITY.md` with the save parity rule:
  - GitHub.io and Android must use the same save schema and save API.
  - Storage backend may differ by platform.

`docs/SAVE_LIFECYCLE.md` documents:

- save key
- legacy save key
- corrupt-save backup key
- schema version
- web/GitHub.io storage backend
- Android storage backend
- migration behavior
- corrupt save handling
- lifecycle flush points
- manual Android save test steps
- known limitations

Slice 6 validation:

- `npm run build:content`: PASS
- `npm run validate:content`: PASS
- `npm run smoke:save`: PASS
- `npm test`: PASS
- `npm run agent:check`: PASS
- `npm run build:web`: PASS
- `npm run check:runtime-parity`: PASS
- `npm run android:sync`: PASS
- `npm run android:debug`: PASS

Android debug APK:

- `android/app/build/outputs/apk/debug/app-debug.apk`
- Size: about 20 MB

Manual phone save test:

- PASS, reported by user on 2026-06-16 after installing the debug APK served over Tailscale.
- User confirmed save behavior and app functions worked as expected.

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `git diff --check`: PASS
- `npm run agent:check`: PASS

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
