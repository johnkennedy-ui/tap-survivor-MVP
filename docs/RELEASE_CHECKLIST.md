# Release Checklist

Use this checklist for Play internal testing release candidates.

## Build Checks

1. Build the shared runtime.

   ```bash
   npm run build:web
   ```

2. Confirm runtime parity.

   ```bash
   npm run check:runtime-parity
   ```

3. Sync Android from the shared runtime.

   ```bash
   npm run android:sync
   ```

4. Build a debug APK.

   ```bash
   npm run android:debug
   ```

5. Build the release AAB.

   ```bash
   npm run android:bundle:local
   ```

6. Confirm the expected release artifact.

   ```text
   android/app/build/outputs/bundle/release/app-release.aab
   ```

## Version Check

- Confirm `versionCode` and `versionName` in `android/app/build.gradle`.
- Every Play upload must use a `versionCode` greater than any previously uploaded
  build.
- Keep `versionName` human-readable and aligned with the release being tested.

## Signing Check

- Real signing values must live only in local ignored files.
- Use `android/key.properties.example` as the placeholder template.
- Create `android/key.properties` locally when a signed release build is needed.
- Do not commit `android/key.properties`.
- Do not commit keystores, `.env` files, service account JSON, or Play
  credentials.
- Store the upload keystore and password somewhere safe. Losing the upload key
  can block app updates until the key is reset through Play Console.

Create the upload keystore locally only when preparing a signed Play build:

```bash
keytool -genkeypair \
  -v \
  -keystore ~/tap-survivor-upload-keystore.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias upload
```

Then create the ignored local signing file:

```properties
# android/key.properties
storeFile=/home/logix/tap-survivor-upload-keystore.jks
storePassword=<local password>
keyAlias=upload
keyPassword=<local password>
```

Never commit this file or the keystore.

## No-Secrets Check

Before committing release-path changes, run:

```bash
git status --short --ignored
```

Confirm these remain ignored or absent:

- `android/key.properties`
- `*.jks`
- `*.keystore`
- `.env`
- service account JSON

## Play Internal Testing

Use `docs/PLAY_INTERNAL_TESTING.md` for the Play Console and device checklist.

## Device Checks After Play Install

- Launch the Play-installed build.
- Start a run.
- Earn or change save state.
- Close and reopen the app.
- Confirm save persistence.
- Confirm the installed build behaves like the shared `www/` runtime.
