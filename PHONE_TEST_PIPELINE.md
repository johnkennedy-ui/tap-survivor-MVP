# Phone Test Pipeline

## Test URL

Expected GitHub Pages URL after the first deployment completes:

```text
https://johnkennedy-ui.github.io/tap-survivor-MVP/
```

The workflow publishes this project folder as the site root, so `index.html` should load directly at the Pages URL.

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
2. Validates that the prototype files exist.
3. Configures GitHub Pages.
4. Uploads the repository root as the static site artifact.
5. Deploys the artifact to GitHub Pages.

No build step is required because the prototype is plain HTML, CSS, and JavaScript.

## Branch That Triggers Publishing

The workflow runs on pushes to:

- `main`
- `master`

It auto-runs for changes anywhere in this repo, including prototype files and the Pages workflow.

It can also be started manually from GitHub Actions through `workflow_dispatch`.

## Android Test Steps

1. Open `https://johnkennedy-ui.github.io/tap-survivor-MVP/` in Android Chrome.
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
- No native Android build exists yet.
- No Google Play, signing, Play Console, or Steam integration is included.
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
