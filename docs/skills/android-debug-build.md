# Skill: Android Debug Build

## Use When

- The user asks for an Android debug APK.
- Runtime, Capacitor, or Android project changes need local Android verification.
- A device install path needs a fresh debug artifact.

## Do Not Use When

- The request is for a Play release AAB.
- The task is web-only or documentation-only.
- Android SDK configuration is missing and cannot be created locally without secrets.

## Goal

Build a local debug APK from the current shared web runtime and report the artifact.

## Allowed Files

- `android/**`
- `capacitor.config.json`
- `index.html`
- `src/**`
- `assets/**`
- `content/**`
- `docs/CURRENT_TASK.md`

## Forbidden Files

- Signing keystores
- Secret property files
- `www/` by hand
- Play Console credentials

## Procedure

1. Confirm the branch and dirty files.
2. Run content and web build steps if runtime files changed.
3. Run Android sync.
4. Run Android debug build.
5. Report the APK path and size.
6. Do not change package identity, signing, billing, ads, or release config.

## Commands

```sh
git status --short --branch
npm run build:web
npm run check:runtime-parity
npm run android:sync
npm run android:debug
git diff --check
```

## Stop Condition

Stop when the debug APK is built or the first Android build blocker is identified.

## Report Format

```text
Skill: android-debug-build
Branch:
Commands run:
APK path:
APK size:
Android debug result:
Package identity changed: no
```
