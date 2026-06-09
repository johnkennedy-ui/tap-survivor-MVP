# Tap Survivor MVP Prototype

This folder contains the MVP plan and a small no-dependency browser prototype for the first playable milestone.

## Run Locally

Open `index.html` in a browser.

## Phone Test

The GitHub Pages workflow is defined in `.github/workflows/tap-survivor-pages.yml`.
See `PHONE_TEST_PIPELINE.md` for the Android test path and current publishing blocker.

Expected test URL after deployment:

```text
https://johnkennedy-ui.github.io/tap-survivor-MVP/
```

## First Test Flow

1. Click `Unlock Laser` in the progression tree.
2. Click `Start Run`.
3. Click or tap the arena to move.
4. Let Spark Bolt kill enemies and collect XP drops.
5. On level-up, choose `Prism Beam`.
6. Wait for Prism Beam to hit an enemy and complete `Use Laser in a run`.
7. Spend the rewarded Quest Point on `Laser Damage I`.
8. Confirm `Deal 5,000 damage with Laser` becomes active.

## Notes

- This is not the final Unity project.
- Unity was not available on this host, so this prototype proves the loop locally before the Unity implementation.
- Save data uses browser `localStorage`.
