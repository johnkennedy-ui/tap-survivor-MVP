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

Manual Play Console steps:

1. Create app in Play Console.
2. Use package ID `com.tap.survivor`.
3. Set app as game.
4. Pricing: free.
5. Ads: no.
6. IAP: no for current build.
7. Upload signed AAB to internal testing.
8. Add internal testers.
9. Install from Play internal testing link.
10. Verify runtime parity and save persistence.

## Device Checks After Play Install

- Launch the Play-installed build.
- Start a run.
- Earn or change save state.
- Close and reopen the app.
- Confirm save persistence.
- Confirm the installed build behaves like the shared `www/` runtime.
