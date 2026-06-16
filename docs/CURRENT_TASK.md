# Current Agent Task

This file is an optional repo-local checkpoint for a Tap Survivor task. It is housekeeping only and may be stale; use the conversation and current git diff as the source of truth.

## Active Goal

Fix compressed source and skill-doc readability

## Status

- State: in progress
- Started: 2026-06-16T18:32:33.855Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `docs/skills/`
- `scripts/check-format-hygiene.mjs`
- Allowed active readability targets named in the task

## Files Changed

- `docs/CURRENT_TASK.md`
- `scripts/check-format-hygiene.mjs`

## Readability Audit

Files inspected:

- `AGENTS.md`
- `README.md`
- `docs/skills/*.md`
- `docs/RUNTIME_PARITY.md`
- `docs/SAVE_LIFECYCLE.md`
- `docs/PLAY_STORE_ANDROID_PREP.md`
- `docs/CURRENT_TASK.md`
- `package.json`
- `scripts/check-format-hygiene.mjs`
- `src/save.js`
- `src/storage-adapter.js`
- `src/weapon-fire.js`
- `src/input.js`
- `src/styles.css`
- active `src/**/*.js`, `src/**/*.css`, `scripts/**/*.mjs`, and `docs/**/*.md` through the format-hygiene scan

Files requiring formatting:

- `scripts/check-format-hygiene.mjs`: not compressed, but needed a readability/coverage update so it scans active scripts and uses the required 5-line compressed threshold.

Files already readable:

- `docs/skills/*.md`: 38-73 lines each; no compressed skill docs found.
- Primary source targets: `src/save.js`, `src/storage-adapter.js`, `src/weapon-fire.js`, `src/input.js`, and `src/styles.css` are multi-line.
- Lifecycle/parity docs: `docs/RUNTIME_PARITY.md`, `docs/SAVE_LIFECYCLE.md`, and
  `docs/PLAY_STORE_ANDROID_PREP.md` are multi-line and did not need formatting.

Files intentionally skipped:

- `scripts/build-content.mjs`, `scripts/content-check.mjs`, `scripts/verify-focus.mjs`,
  and `scripts/verify-mvp.mjs` contain existing long literal assertion/fixture lines.
  They are now explicit reviewed allowances in the checker because those files were
  outside the allowed change list for this task.
- `docs/FORMAT_AND_DIFF_HYGIENE.md` does not exist on this branch.
- `src/content.generated.js`, `www/`, `android/`, `node_modules/`, `package-lock.json`, and `docs/tasks/` are ignored as generated, vendor, lockfile, runtime, or archival evidence paths.

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
node --check scripts/check-format-hygiene.mjs
node --check src/storage-adapter.js
node --check src/save.js
node --check src/input.js
npm run check:format-hygiene
npm run build:content
npm run validate:content
npm run smoke:save
npm run smoke:start-run
npm run smoke:quest-flow
npm run smoke:shop
npm test
npm run build:web
npm run check:runtime-parity
npm run android:sync
npm run android:debug
git diff --check
```

Result:

- `node --check scripts/check-format-hygiene.mjs`: PASS
- `npm run check:format-hygiene`: PASS, 103 files scanned.
- `npm run agent:check`: PASS
- `git diff --check`: PASS
- `node --check src/storage-adapter.js`: PASS
- `node --check src/save.js`: PASS
- `node --check src/input.js`: PASS
- `npm run build:content`: PASS
- `npm run validate:content`: PASS
- `npm run smoke:save`: PASS
- `npm run smoke:start-run`: PASS
- `npm run smoke:quest-flow`: PASS
- `npm run smoke:shop`: PASS
- `npm test`: PASS, 271 checks plus speed controls.
- `npm run build:web`: PASS
- `npm run check:runtime-parity`: PASS
- `npm run android:sync`: PASS
- `npm run android:debug`: PASS, APK `android/app/build/outputs/apk/debug/app-debug.apk`, 20,466,951 bytes.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
