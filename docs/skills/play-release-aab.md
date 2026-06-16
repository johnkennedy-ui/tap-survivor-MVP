# Skill: Play Release AAB

## Use When

- The user asks for a Play release Android App Bundle.
- Release packaging, versioning, or Play Store preparation needs validation.
- The release path must be checked without changing gameplay.

## Do Not Use When

- The request is for a debug APK.
- Signing credentials are missing or must be exposed.
- The task is web-only, content-only, or docs-only.

## Goal

Prepare or validate a release AAB path without exposing secrets or changing package identity.

## Allowed Files

- `android/**`
- `capacitor.config.json`
- `package.json`
- `docs/PLAY_STORE_ANDROID_PREP.md`
- `docs/CURRENT_TASK.md`

## Forbidden Files

- Signing keystores by content
- Secret values in logs or docs
- `www/` by hand
- Gameplay, save, or content files unless runtime rebuild is explicitly needed

## Procedure

1. Read `docs/PLAY_STORE_ANDROID_PREP.md`.
2. Confirm package identity and versioning expectations.
3. Build the web runtime if needed.
4. Run Android sync.
5. Run the release bundle command.
6. Report artifact path without exposing secrets.

## Commands

```sh
npm run build:web
npm run check:runtime-parity
npm run android:sync
npm run android:bundle:local
git diff --check
```

## Stop Condition

Stop when the AAB is built or a release credential/config blocker is found.

## Report Format

```text
Skill: play-release-aab
Package identity:
Version status:
AAB path:
Commands run:
Release result:
Secrets exposed: no
```
