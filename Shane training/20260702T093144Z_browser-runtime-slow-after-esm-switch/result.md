# Browser Runtime Slow After ESM Switch

- Mission ID: `browser-runtime-slow-after-esm-switch`
- Active model/auth: `openai/gpt-5.5 @ openai:quatrex@googlemail.com`
- Starting HEAD: `58118a5`
- Ending HEAD at evidence write: `58118a5` before commit
- Browser symptom investigated: production ESM browser runtime appeared extremely slow or frozen after `index.html` selected `src/app/production-module-autoboot.js`.

## Findings

- Root cause: the production ESM default browser path composed `src/modules/game-runtime.js`, which schedules `requestAnimationFrame(loop)`, but `src/app/browser-dependency-bag.js` supplied a no-op default `loop`.
- No-op loop used by production ESM path: yes, before this fix.
- Continuous RAF now proven: yes. `scripts/smoke-module-production-entrypoint.mjs` proves production ESM schedules RAF, invokes lifecycle tick/update and render from the RAF callback, and schedules exactly one continuing loop.
- Start Game triggers ESM lifecycle correctly: yes. The smoke now proves the browser title/start path calls the ESM lifecycle start path.
- Duplicate loops found: repeated init could previously schedule another RAF through `initializeRuntime`; lifecycle init is now idempotent and the smoke proves repeated init does not add another RAF.
- Fallback namespace stubs involved: not in the loop root cause. Browser gameplay/progression defaults still expose classic namespace bridge fallbacks, but this slice did not retire globals or remove fallbacks.

## Files Inspected

- `index.html`
- `src/app/production-module-autoboot.js`
- `src/app/production-module-entrypoint.js`
- `src/app/browser-dependency-bag.js`
- `src/app/compose-runtime.js`
- `src/modules/game-runtime.js`
- `src/modules/module-game-lifecycle.js`
- `src/modules/module-game-dependencies.js`
- `src/modules/run-lifecycle.js`
- `src/modules/module-runtime-platform-adapter.js`
- `src/modules/module-runtime-ui-adapters.js`
- `src/game.js`
- `src/shell-ui.js`
- `scripts/smoke-browser.mjs`
- `scripts/smoke-module-production-entrypoint.mjs`
- `scripts/smoke-module-runtime-readiness.mjs`
- `package.json`

## Files Changed

- `src/app/production-module-entrypoint.js`: adds a production browser RAF lifecycle loop adapter and composes browser defaults before replacing only the loop.
- `src/app/browser-dependency-bag.js`: binds the browser title start button once and fixes `closeStartFlow` to hide the title/transition instead of returning to title.
- `src/modules/module-game-lifecycle.js`: makes `init()` idempotent to prevent duplicate runtime initialization and duplicate RAF scheduling.
- `scripts/smoke-module-production-entrypoint.mjs`: proves RAF scheduling, lifecycle tick/render, duplicate init protection, and title/start lifecycle path.

## Scope Checks

- Production ESM selection changed: no.
- Classic fallback preserved: yes.
- Globals retired: no.
- Fallback files deleted: no.
- Runtime behaviour changed: yes, production ESM now drives lifecycle tick/render through RAF and the ESM browser title start path reaches lifecycle start.

## Validation Results

- `node --check src/app/production-module-entrypoint.js`: pass
- `node --check src/modules/module-game-lifecycle.js`: pass
- `node --check src/app/browser-dependency-bag.js`: pass
- `node --check scripts/smoke-module-production-entrypoint.mjs`: pass
- `npm run frank:run -- "npm run smoke:module-production-entrypoint" --timeout 60`: pass
- `npm run frank:run -- "npm run smoke:module-runtime-readiness" --timeout 60`: pass
- `npm run frank:run -- "npm run smoke:browser" --timeout 60`: pass
- `npm run frank:run -- "npm test" --timeout 240`: pass
- `npm run frank:run -- "npm run build:web" --timeout 240`: pass
- `npm run frank:run -- "npm run check:runtime-parity" --timeout 240`: pass
- `npm run frank:run -- "npm run agent:check -- --fix-format-changed" --timeout 240`: pass
- `git diff --check`: pass
- `npm run task:validate`: pass
- `npm run agent:status`: pass, dirty only with intended mission files
- `npm run agent:handoff`: pass

## Remaining Blockers

- None for this bounded loop/start-path fix.

## Recommended Next Slice

- Manual browser retest of the deployed/local production page: load the page, click `Start Game`, confirm the title screen closes, the canvas keeps updating smoothly, speed controls still work, and no duplicate-speed or duplicate-render symptoms appear after reload/navigation.
