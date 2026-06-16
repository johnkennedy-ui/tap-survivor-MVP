# Tap Survivor MVP Prototype

This folder contains the MVP plan and a small no-dependency browser prototype for the first playable milestone.

## Run Locally

Open `index.html` in a browser.

Build the shared runtime used by both GitHub Pages and Android:

```bash
npm run build:web
npm run check:runtime-parity
```

`www/` is generated and ignored by git.

## Content Tooling

For routine update paths, see `docs/MAINTENANCE.md`.

Game content now lives in `content/tap-survivor-content.json`.
Do not hand-edit `src/content.generated.js`; rebuild it from the JSON source.

```bash
npm run build:content
npm run validate:content
npm test
```

Scaffold common additions:

```bash
npm run add:content -- quest reaper_plus --name "Reaper Plus" --description "Defeat 900 enemies." --target 900 --reward 9 --group kill
npm run add:content -- weapon star_lance --name "Star Lance" --description "Piercing lance projectile." --kind projectile --damage 34 --cooldown 1.1 --color "#ffffff" --unlock-cost 3 --branch Core --requires-node unlock_laser --requires-quest use_laser_run
npm run add:content -- shop-item coin_magnet --name "Coin Magnet" --description "Pull coins from farther away." --kind upgrade --cost 250
npm run add:content -- level late_swarm --name "Late Swarm" --starts-at 240 --enemies drifter,skitter,bulwark
```

After adding content, run `npm run build:content && npm test`.

## Phone Test

The GitHub Pages workflow is defined in `.github/workflows/tap-survivor-pages.yml`.
It deploys only the generated `www/` runtime. Android also syncs from that same `www/` directory through Capacitor.
See `PHONE_TEST_PIPELINE.md` for browser and Android test paths.

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
- Android packaging is Capacitor-based and does not include Play upload, signing keys, billing, ads, analytics, login, Firebase, or backend services.
