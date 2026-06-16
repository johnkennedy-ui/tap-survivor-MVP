# Current Agent Task

This file is an optional repo-local checkpoint for a Tap Survivor task. It is housekeeping only and may be stale; use the conversation and current git diff as the source of truth.

## Active Goal

Prepare signed AAB path for Play internal testing

## Status

- State: in progress
- Started: 2026-06-16T19:30:44.132Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `android/app/build.gradle`
- `android/key.properties.example`
- `docs/PLAY_STORE_ANDROID_PREP.md`
- `docs/RELEASE_CHECKLIST.md`
- `.gitignore`
- `android/.gitignore`

## Files Changed

- `android/app/build.gradle`
- `android/key.properties.example`
- `docs/PLAY_STORE_ANDROID_PREP.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/CURRENT_TASK.md`

## Release Config Inspection

- App ID / application ID: `com.tap.survivor`
- App name: `Tap Survivor`
- Capacitor `webDir`: `www`
- Android target SDK: `35`
- Android `versionCode`: `1`
- Android `versionName`: `1.0`
- Local signing file status: `android/key.properties` missing locally
- Real signing secrets committed: no

## Signing Design

- Release signing reads local ignored `android/key.properties` only when it
  exists.
- `android/key.properties.example` contains placeholders only.
- Debug builds do not require release signing properties.
- No keystore or real credential file is created in the repo.

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run build:content
npm run validate:content
npm test
npm run agent:check
npm run build:web
npm run check:runtime-parity
npm run android:sync
npm run android:debug
npm run android:bundle:local
git diff --check
```

Result:

- `npm run build:content`: PASS
- `npm run validate:content`: PASS
- `npm test`: PASS, 271 MVP checks plus speed controls.
- `npm run agent:check`: PASS
- `npm run build:web`: PASS
- `npm run check:runtime-parity`: PASS
- `npm run android:sync`: PASS
- `npm run android:debug`: PASS, APK `android/app/build/outputs/apk/debug/app-debug.apk`, 20,466,951 bytes.
- `npm run android:bundle:local`: PASS, AAB `android/app/build/outputs/bundle/release/app-release.aab`, 19,181,489 bytes.
- `git diff --check`: PASS
- `git status --short --ignored`: generated `www/`, Android build outputs,
  `android/local.properties`, and `node_modules/` remain ignored.
- `git check-ignore -v android/key.properties upload.jks upload.keystore .env
  service-account.json service-account-play.json`: PASS, all matched ignore rules.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
