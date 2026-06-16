# Current Agent Task

This file is an optional repo-local checkpoint for a Tap Survivor task. It is housekeeping only and may be stale; use the conversation and current git diff as the source of truth.

## Active Goal

Add Play Store Android packaging with GitHub.io parity.

Critical constraint: GitHub Pages and Android must consume the same generated `www/` runtime output. No split runtime builds, Android-only runtime copy, or Pages-only runtime copy.

## Checkpoint 1 - Baseline And Inspection

- State: complete
- Started: 2026-06-16T00:25:12.221Z
- Branch: `dev/playstore-parity`
- Commit inspected: `aed9620`
- Owner: Frank / OpenClaw

## Current GitHub Pages Workflow

- Workflow file: `.github/workflows/tap-survivor-pages.yml`
- Workflow name: `Publish Tap Survivor MVP`
- Trigger branches: `main`, `master`, plus manual `workflow_dispatch`
- Current deployment method: validates with `node scripts/verify-mvp.mjs`, copies repo runtime and supporting files into a temporary directory, checks out an orphan `gh-pages` branch, and force-pushes that branch.
- Current problem for this task: deployment currently copies source/supporting folders directly (`assets`, `content`, `docs`, `src`, `scripts`) instead of deploying a generated `www/` runtime artifact.

## Current Runtime Files Loaded By `index.html`

- CSS: `src/styles.css`
- Scripts, in order:
  - `src/content.generated.js`
  - `src/assets.js`
  - `src/math.js`
  - `src/sprites.js`
  - `src/audio.js`
  - `src/quests.js`
  - `src/save.js`
  - `src/effects.js`
  - `src/upgrades.js`
  - `src/content-registry.js`
  - `src/progression.js`
  - `src/render-hud.js`
  - `src/rendering.js`
  - `src/balance.js`
  - `src/weapon-fire.js`
  - `src/enemies.js`
  - `src/combat.js`
  - `src/ui.js`
  - `src/run-ui.js`
  - `src/level-up.js`
  - `src/input.js`
  - `src/pickups.js`
  - `src/shop.js`
  - `src/relics.js`
  - `src/run-state.js`
  - `src/run-update.js`
  - `src/debug.js`
  - `src/shell-ui.js`
  - `src/game.js`

Runtime paths in `index.html` are relative (`src/...`), not root-absolute.

## Current Test And Deploy Scripts

- Baseline agent validation: `npm run agent:check`
- Agent status: `npm run agent:status`
- Content build: `npm run build:content`
- Content drift check: `npm run content:check`
- Full local test: `npm test`
- Local static server: `npm run serve`
- Deployment check: `npm run check:deploy`
- Current Pages deployment workflow: `.github/workflows/tap-survivor-pages.yml`
- CI validation workflow: `.github/workflows/agent-check.yml`

## Files Inspected

- `AGENTS.md`
- `package.json`
- `package-lock.json`
- `index.html`
- `.github/workflows/agent-check.yml`
- `.github/workflows/tap-survivor-pages.yml`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/MAINTENANCE.md`
- `docs/CURRENT_TASK.md`
- `PHONE_TEST_PIPELINE.md`
- `scripts/`
- `src/`
- `assets/`
- `content/`

Note: `docs/FORMAT_AND_DIFF_HYGIENE.md` was requested for inspection but is not present in this checkout.

## Baseline Validation Result

```text
npm run agent:check
PASS git diff --check
PASS agent checks complete
```

## Files Changed In Checkpoint 1

- `docs/CURRENT_TASK.md`

## Checkpoint 2 - Shared `www/` Runtime

- State: complete
- Added `scripts/build-web.mjs`.
- Added `scripts/check-runtime-parity.mjs`.
- Updated `scripts/agent-check.mjs` so full agent validation syntax-checks the new runtime scripts.
- Added `build:web` package script.
- Added `check:runtime-parity` package script.
- Generated `www/` as the single runtime output.
- `www/` includes `index.html`, `src/`, `assets/`, `.nojekyll`, `build-info.json`, and `runtime-manifest.json`.
- `content/` is not copied because the current runtime consumes generated `src/content.generated.js`; no runtime fetch of `content/*.json` was found.
- Runtime guard excludes forbidden repo/support/secrets files from `www/`.

Validation:

```text
node --check scripts/build-web.mjs
node --check scripts/check-runtime-parity.mjs
npm run build:web
npm run check:runtime-parity
Runtime parity source ready: www/
```

## Checkpoint 3 - GitHub Pages Uses `www/`

- State: complete
- Updated `.github/workflows/tap-survivor-pages.yml` in place.
- Preserved workflow name: `Publish Tap Survivor MVP`.
- Preserved trigger branches: `main`, `master`, plus manual `workflow_dispatch`.
- Added Node setup with npm cache.
- Added `npm ci`.
- Added `npm run agent:check`.
- Added `npm run build:web`.
- Added `npm run check:runtime-parity`.
- Changed the publish step so the `gh-pages` branch receives only the generated `www/` contents.
- Updated `scripts/check-deploy.mjs` to compare live Pages against local `www/index.html`, `www/build-info.json`, and `www/runtime-manifest.json`.
- Updated `scripts/verify-mvp.mjs` so MVP validation expects the new `www/` Pages pipeline.

Validation:

```text
node --check scripts/check-deploy.mjs
node --check scripts/verify-mvp.mjs
npm run build:web
npm run check:runtime-parity
npm run agent:check
PASS agent checks complete
```

## Checkpoint 4 - Capacitor Android Uses `www/`

- State: complete
- Installed `@capacitor/core` and `@capacitor/android`.
- Installed dev dependency `@capacitor/cli`.
- Added `capacitor.config.json` with `appId` `com.quatrex.tapsurvivor`, app name `Tap Survivor`, `webDir` `www`, and Android scheme `https`.
- Added package scripts:
  - `android:sync`
  - `android:open`
  - `android:run`
  - `android:debug`
  - `android:bundle:local`
- Added Capacitor Android project under `android/`.
- Preserved the parity rule: `android:sync` runs `npm run build:web` and `npm run check:runtime-parity` before `npx cap sync android`.
- Capacitor generated Android ignores copied web assets under `android/app/src/main/assets/public`, so the repo does not gain an Android-only committed runtime copy.
- Android SDK settings: `compileSdkVersion = 35`, `targetSdkVersion = 35`.
- A partial ignored `android/` directory was present before this checkpoint; it was moved aside to `/tmp/tap-survivor-android-partial-20260616-0202` so `npx cap add android` could generate a clean project.

Validation:

```text
npm run android:sync
Runtime parity source ready: www/
[info] Sync finished
```

## Checkpoint 5 - Android Local Build Checks

- State: complete
- First `npm run android:debug` failed because Gradle tried to use `/home/logix/.gradle`; package scripts were tightened to use `GRADLE_USER_HOME=.gradle` inside `android/`.
- Second `npm run android:debug` downloaded Gradle after approval, then failed because `ANDROID_HOME` was unset and `android/local.properties` was missing.
- Added local-only ignored `android/local.properties` with `sdk.dir=/usr/lib/android-sdk`.
- Third `npm run android:debug` failed because the generated template wanted Android SDK Platform 36, but the host has Android SDK Platform 35 installed and `/usr/lib/android-sdk` is not writable for auto-installing 36.
- Updated `android/variables.gradle` to `compileSdkVersion = 35` and `targetSdkVersion = 35`, which still satisfies the >=35 target requirement.
- Fourth `npm run android:debug` failed because the latest generated AndroidX Activity/Core versions require compile SDK 36.
- Pinned AndroidX Activity to `1.10.1` and AndroidX Core to `1.16.0` to match the installed compile SDK 35.
- `npm run android:debug` passed and produced `android/app/build/outputs/apk/debug/app-debug.apk`.
- First `npm run android:bundle:local` attempt synced `www/` correctly but Gradle failed to start because daemon file-lock networking could not determine a usable wildcard IP; Android Gradle scripts were tightened with `--no-daemon`.
- `npm run android:bundle:local` passed after elevated Gradle execution and produced `android/app/build/outputs/bundle/release/app-release.aab`.

Build outputs:

- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release AAB: `android/app/build/outputs/bundle/release/app-release.aab`

Validation:

```text
npm run android:debug
BUILD SUCCESSFUL
npm run android:bundle:local
BUILD SUCCESSFUL
```

## Checkpoint 6 - Finalize

- State: complete
- Updated docs for shared `www/` runtime, GitHub Pages deployment, and Capacitor Android packaging.
- Added `.gitignore` so generated `www/` and `node_modules/` are not committed.
- Saved evidence with `npm run agent:evidence -- --task "playstore parity android packaging"`:
  - `../Shane training/20260616T013211Z_playstore-parity-android-packaging/result.md`
- Committed changes with message: `Add Android packaging with shared web runtime`.
- Pushed branch: `origin/dev/playstore-parity`.

Final validation:

```text
git status
git diff --check
npm run agent:check
npm run check:runtime-parity
npm run android:debug
npm run android:bundle:local
```

Final build outputs:

- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release AAB: `android/app/build/outputs/bundle/release/app-release.aab`
