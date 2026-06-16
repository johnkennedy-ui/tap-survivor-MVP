# Phone Test Pipeline

## Test URL

Expected GitHub Pages URL after the first deployment completes:

```text
https://johnkennedy-ui.github.io/tap-survivor-MVP/
```

The workflow publishes this project folder as the site root, so `index.html` should load directly at the Pages URL.

Temporary fallback URL while GitHub Pages is not enabled for the repository:

```text
https://htmlpreview.github.io/?https://github.com/johnkennedy-ui/tap-survivor-MVP/blob/main/index.html
```

## Prototype Path Used

Used Option B: lightweight web prototype.

Reason: Unity, Unity Hub, and dotnet are not installed locally, so a Unity Web build cannot be created or verified on this host yet.

## How The Build Is Published

Publishing is configured through:

```text
.github/workflows/tap-survivor-pages.yml
```

The workflow:

1. Checks out the repo.
2. Installs Node dependencies with `npm ci`.
3. Runs `npm run agent:check`.
4. Runs `npm run build:web` to generate the shared `www/` runtime.
5. Runs `npm run check:runtime-parity`.
6. Copies only `www/` into a temporary publish directory.
7. Force-pushes those generated runtime files to the `gh-pages` branch used by GitHub Pages.

The generated `www/` directory is the single runtime source for both GitHub Pages and Capacitor Android.

## Reusable Local Debug Scripts

Run the no-dependency MVP verification checks with:

```text
npm test
```

Check the latest GitHub Actions and Pages status with:

```text
npm run check:deploy
```

Run a local static server for desktop debugging with:

```text
npm run serve
```

Build and check the shared runtime with:

```text
npm run build:web
npm run check:runtime-parity
```

Build local Android outputs with:

```text
npm run android:sync
npm run android:debug
npm run android:bundle:local
```

Expected outputs:

```text
android/app/build/outputs/apk/debug/app-debug.apk
android/app/build/outputs/bundle/release/app-release.aab
```

Then open:

```text
http://localhost:4173/
```

For LAN testing from another device on the same network, run:

```text
HOST=0.0.0.0 npm run serve
```

## Branch That Triggers Publishing

The workflow runs on pushes to:

- `main`
- `master`

It auto-runs for changes anywhere in this repo, including prototype files and the Pages workflow.

It can also be started manually from GitHub Actions through `workflow_dispatch`.

## Android Test Steps

1. Open `https://johnkennedy-ui.github.io/tap-survivor-MVP/` in Android Chrome, or use the temporary fallback URL above until Pages is enabled.
2. Tap `Unlock Laser` in the progression tree.
3. Tap `Start Run`.
4. Tap the arena to move the player.
5. Drag on the arena to continuously update the movement target.
6. Confirm enemies move toward the player.
7. Confirm the player auto-attacks with Spark Bolt.
8. Collect green XP drops.
9. On level-up, select `Prism Beam`.
10. Let Prism Beam hit an enemy.
11. Confirm `Use Laser in a run` completes.
12. Confirm 1 Quest Point is awarded.
13. Spend 1 Quest Point on `Laser Damage I`.
14. Confirm `Deal 5,000 damage with Laser` becomes active.

## Native Android Build

Android packaging uses Capacitor with `webDir` set to `www`.

Rules:

- Run `npm run android:sync` before native Android runs or builds.
- Do not hand-copy runtime files into `android/`.
- Do not commit copied Android web assets from `android/app/src/main/assets/public`.
- Do not add Play upload, signing keys, keystores, service account JSON, billing, ads, analytics, Firebase, login, or backend services.

## What The Phone Build Proves

- Tap-to-move works in a mobile browser.
- Drag-to-steer/update target works in a mobile browser.
- Enemies chase the player.
- Player auto-attacks.
- XP drops can be collected.
- Level-up choices work.
- Laser can be selected.
- The first Laser quest completes.
- Quest Points are awarded.
- Quest Points can be spent in a tiny progression tree.
- The follow-up Laser quest unlocks.
- Progression and quest state save locally through browser `localStorage`.

## Known Limitations

- This is a temporary browser prototype, not the final Unity project.
- Native Android packaging exists through Capacitor.
- No Google Play upload, signing, Play Console, billing, ads, analytics, Firebase, login, backend services, or Steam integration is included.
- Save data is local to the browser/device and can be cleared by browser storage cleanup.
- Art is placeholder canvas drawing only.
- Headless Chromium rendering could not be verified on this host because the local Chromium snap lacks required permissions.
- First deployment can take a minute or two after the push.

## If The Mobile Browser Build Fails

1. Open GitHub Actions and check the latest `Publish Tap Survivor MVP` run.
2. If the workflow did not run, confirm the push was to `main` or `master`.
3. If Pages says it is not enabled, set Pages source to GitHub Actions in the repository settings.
4. If the page loads blank, open Android Chrome dev tools through remote debugging and check for JavaScript errors.
5. If touch input fails, test desktop click input first, then inspect the pointer handlers in `src/game.js`.
6. If save state looks wrong, use `Reset Save` in the prototype and repeat the test flow.

## Current Blocker

None expected after the repository is pushed and the first GitHub Pages workflow run succeeds.
