# Play Store Android Prep

## App Identity

- App name: Tap Survivor
- Package/application ID: `com.quatrex.tapsurvivor`
- Capacitor `webDir`: `www`

## Current Release Scope

- Free app
- No ads
- No IAP
- No billing
- No analytics
- No login
- No cloud save
- Offline local save only

## Current State

- Android packaging path exists.
- GitHub.io and Android both use `www/`.
- Release signing is not configured yet.
- Play Console upload is not configured yet.

## Commands

```bash
npm run build:web
npm run check:runtime-parity
npm run android:sync
npm run android:debug
npm run android:bundle:local
```

Expected local debug APK path if built:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Expected local release bundle path if built:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## No-Secrets Rules

- Never commit keystores.
- Never commit `key.properties`.
- Never commit service account JSON.
- Never commit Play Console credentials.
- Never commit `.env` files.

The root `.gitignore` and `android/.gitignore` actively ignore common signing, service, environment, local SDK, and Android build-output files.

## Runtime Flow

Use the shared-runtime flow in `docs/RUNTIME_PARITY.md`.

Do not hand-copy runtime files into `android/`, and do not commit copied web assets from `android/app/src/main/assets/public`.

## INTERNET Permission Review

`android/app/src/main/AndroidManifest.xml` currently keeps `android.permission.INTERNET`.

Decision: keep it as a non-blocking review item.

Reason: the current gameplay runtime is local, but this is a Capacitor WebView shell and the permission is non-dangerous on Android.
Keeping it avoids breaking normal WebView/dev-test/network compatibility paths while this cleanup is focused on merge blockers.
It does not add ads, analytics, login, billing, Firebase, cloud saves, or backend behavior by itself.

Remove it only after a dedicated Android device/emulator test confirms the packaged Capacitor runtime and any WebView compatibility paths still work without it.

## Future Release Tasks

- Configure upload key outside git.
- Configure Play App Signing in Play Console.
- Create signed AAB.
- Run internal testing.
- Verify save/lifecycle behaviour on Android.
- Verify GitHub.io build matches Android runtime manifest.
