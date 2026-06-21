# Runtime Game Split

Request: split one monolithic runtime file into smaller browser-global modules without changing game behavior.

Selected file: `src/game.js`.

Why: it mixed high-level bootstrap/wiring with banner state/display and run lifecycle/boss-clear relic choice flow. It was the largest hand-authored runtime file in `src/` by line count and by mixed orchestration responsibilities.

Changed:

- Added `src/game-banners.js` exporting `TapSurvivorGameBanners.createGameBannerSystem`.
- Added `src/run-lifecycle.js` exporting `TapSurvivorRunLifecycle.createRunLifecycle`.
- Kept `src/game.js` as the existing entrypoint and public callback owner, with wrappers for `startRun`, `endRun`, and `advanceTowerFloor`.
- Added the new scripts to `index.html` before `src/game.js`.
- Updated VM/test harness script loading and verifier source assertions for the new browser-global modules.
- Did not edit `content/tap-survivor-content.json`, `www/`, Android config, save keys, DOM IDs, CSS classes, gameplay stats, enemy behavior, weapon behavior, quest behavior, shop behavior, or title/start flow behavior.

Validation:

- `npm run verify:script-order`: pass.
- `npm run smoke:start-run`: pass.
- `npm test`: pass.
- `npm run agent:check`: pass.

Notes:

- `src/game.js` went from 595 lines to 504 lines.
- New helper sizes: `src/game-banners.js` 67 lines, `src/run-lifecycle.js` 106 lines.
- Good next split candidate: `src/shell-ui.js`, especially relic inventory/detail rendering, because it still mixes run-menu controls, title/start shell behavior, fullscreen/mute controls, and relic inventory UI.
