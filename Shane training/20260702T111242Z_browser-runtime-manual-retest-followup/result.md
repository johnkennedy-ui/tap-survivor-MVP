# Browser Runtime Manual Retest Followup

- Mission ID: `browser-runtime-manual-retest-followup`
- Active model/auth: `openai/gpt-5.4-mini @ openai:quatrex@googlemail.com`
- Starting HEAD: `14e7ae4`
- Ending HEAD at evidence write: `14e7ae4` before commit
- Manual browser retest result: game loads but `Start Game` is broken.
- Console/network error supplied by user: none provided.

## Root Cause

- The ESM production entrypoint was not threading a start callback into the browser dependency bag, so the module browser shell had no reliable `onStartRun` handoff from the title button into the lifecycle.
- The browser shell adapter also needed to bind `titleStartGame` and hide the title/start transition when the run starts.

## Files Inspected

- `src/app/production-module-autoboot.js`
- `src/app/production-module-entrypoint.js`
- `src/app/browser-dependency-bag.js`
- `src/modules/module-game-lifecycle.js`
- `src/modules/run-lifecycle.js`
- `src/shell-ui.js`
- `scripts/smoke-module-production-entrypoint.mjs`
- `package.json`

## Files Changed

- `src/app/production-module-entrypoint.js`
- `src/app/browser-dependency-bag.js`
- `scripts/smoke-module-production-entrypoint.mjs`

## Scope Checks

- Production ESM selection changed: no.
- Classic fallback preserved: yes.
- Globals retired: no.
- Fallback files deleted: no.
- Runtime behaviour changed: yes, but only the ESM title/start flow was restored so the title button can start the run.

## Validation Results

- `node --check src/app/production-module-entrypoint.js`: pass
- `node --check src/app/browser-dependency-bag.js`: pass
- `node --check scripts/smoke-module-production-entrypoint.mjs`: pass
- `npm run frank:run -- "npm run smoke:module-production-entrypoint" --timeout 60`: pass after the fix
- `npm run frank:run -- "npm run smoke:browser" --timeout 60`: pass
- `npm run frank:run -- "npm run smoke:module-runtime-readiness" --timeout 60`: pass
- `npm run frank:run -- "npm test" --timeout 240`: pass
- `npm run frank:run -- "npm run build:web" --timeout 240`: pass
- `npm run frank:run -- "npm run check:runtime-parity" --timeout 240`: pass
- `npm run frank:run -- "npm run agent:check -- --fix-format-changed" --timeout 240`: pass
- `git diff --check`: pass
- `npm run task:validate`: pass
- `npm run agent:status`: pass
- `npm run agent:handoff`: pass

## Remaining Blockers

- None in this slice after restoring the start-path handoff.

## Recommended Next Slice

- Manual retest in a real browser: confirm `Start Game` now hides the title screen and transitions into the run without console errors.

## Usage Report

- tokens_known: false
- Token delta: unknown
- Usage snapshot status: failed with `EROFS`
