# Current Agent Task

This file is an optional repo-local checkpoint for a Tap Survivor task. It is housekeeping only and may be stale; use the conversation and current git diff as the source of truth.

## Active Goal

Harden agent maintainability readability

## Status

- State: completed
- Started: 2026-06-17T16:36:11.871Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `AGENTS.md`
- `package.json`
- `docs/skills/*.md`
- `docs/RUNTIME_PARITY.md`
- `docs/PLAY_STORE_ANDROID_PREP.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/PLAY_INTERNAL_TESTING.md`
- `scripts/check-format-hygiene.mjs`
- `scripts/agent-check.mjs`
- `src/save.js`
- `src/storage-adapter.js`

## Current Readability Audit

Baseline line-count command:

```bash
wc -l AGENTS.md package.json docs/skills/*.md \
  docs/RUNTIME_PARITY.md docs/PLAY_STORE_ANDROID_PREP.md \
  docs/RELEASE_CHECKLIST.md docs/PLAY_INTERNAL_TESTING.md \
  scripts/check-format-hygiene.mjs scripts/agent-check.mjs \
  src/save.js src/storage-adapter.js
```

Baseline result:

```text
   24 AGENTS.md
   64 package.json
   38 docs/skills/SKILL_ROUTER.md
   70 docs/skills/android-debug-build.md
   65 docs/skills/content-patch.md
   63 docs/skills/device-qa-smoke-test.md
   70 docs/skills/file-split-maintainability.md
   69 docs/skills/format-hygiene.md
   64 docs/skills/handoff-evidence.md
   70 docs/skills/mechanics-extension.md
   67 docs/skills/play-release-aab.md
   66 docs/skills/runtime-parity.md
   73 docs/skills/save-lifecycle.md
   60 docs/skills/validation-baseline.md
   27 docs/RUNTIME_PARITY.md
  110 docs/PLAY_STORE_ANDROID_PREP.md
  112 docs/RELEASE_CHECKLIST.md
   31 docs/PLAY_INTERNAL_TESTING.md
  154 scripts/check-format-hygiene.mjs
  165 scripts/agent-check.mjs
   95 src/save.js
  184 src/storage-adapter.js
 1741 total
```

Compressed target list from audit:

- Files under 10 lines and over 1 KB: none.
- Files with lines over 240 characters: none.
- Active files that are one-line/compressed: none.

## Files Changed

- `docs/CURRENT_TASK.md`
- `scripts/check-format-hygiene.mjs`

## Validation Plan

Run the requested readability and runtime validation set:

```bash
npm run check:format-hygiene
node --check scripts/check-format-hygiene.mjs
node --check scripts/agent-check.mjs
node --check src/save.js
node --check src/storage-adapter.js
npm run build:content
npm run validate:content
npm run smoke:save
npm test
npm run agent:check
npm run build:web
npm run check:runtime-parity
npm run android:sync
npm run android:debug
git diff --check
```

Result:

- PASS. Android debug APK built successfully.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
