# Restore Browser Load After 0df22a8

- Mission ID: `restore-browser-load-after-0df22a8`
- Active model/auth: `openai/gpt-5.5 @ openai:quatrex@googlemail.com` at execution time; user explicitly instructed to continue after model mismatch block.
- Starting HEAD: `0df22a8`
- Ending HEAD at evidence write: `0df22a8` before rollback commit
- Browser symptom: game does not load after `0df22a8`.
- Baseline inspected: `58118a5..HEAD` diff for `src/app/production-module-entrypoint.js`, `src/app/browser-dependency-bag.js`, `src/modules/module-game-lifecycle.js`, and `scripts/smoke-module-production-entrypoint.mjs`.

## Real Production-Page Browser Proof Attempt

- Local static server attempt: `node scripts/smoke-production-browser-load.mjs`
- First attempt result: failed before browser proof with sandbox `listen EPERM: operation not permitted 127.0.0.1`.
- Escalated attempt result: local server started, but Snap Chromium exited before DevTools with `snap-confine is packaged without necessary permissions` and missing `cap_dac_override`.
- Alternate `/usr/bin/chromium-browser` result: same Snap confinement failure, plus `xdg-settings: not found`.
- Browser automation available: no, not in this environment.
- First real production-page console error: not captured.
- First pageerror/unhandled exception: not captured.
- First failed network/module request: not captured.
- Whether `index.html` loaded: not proven by real browser.
- Whether `src/app/production-module-autoboot.js` loaded: not proven by real browser.
- Whether `bootProductionModuleRuntime` threw: not captured.
- Whether first RAF callback threw: not captured.
- Whether Start Game click was tested: not tested in a real browser.

## Decision

- Root cause: unknown in real browser because browser automation was unavailable.
- Fix applied or rollback applied: rollback applied.
- Whether `0df22a8` runtime changes were kept, partially reverted, or fully reverted: unsafe runtime and synthetic smoke changes from `0df22a8` were reverted to `58118a5` versions.
- Browser-load proof added/strengthened: attempted, but not kept because the new script could not be validated with available browser tooling here.

## Files Inspected

- `index.html`
- `src/app/production-module-autoboot.js`
- `src/app/production-module-entrypoint.js`
- `src/app/browser-dependency-bag.js`
- `src/modules/module-game-lifecycle.js`
- `src/modules/game-runtime.js`
- `src/modules/module-game-dependencies.js`
- `src/modules/module-runtime-rendering-adapter.js`
- `src/modules/module-runtime-platform-adapter.js`
- `src/modules/module-runtime-ui-adapters.js`
- `src/modules/run-lifecycle.js`
- `scripts/smoke-browser.mjs`
- `scripts/browser-smoke.html`
- `scripts/smoke-module-production-entrypoint.mjs`
- `package.json`

## Files Changed

- `src/app/production-module-entrypoint.js`: restored to `58118a5`.
- `src/app/browser-dependency-bag.js`: restored to `58118a5`.
- `src/modules/module-game-lifecycle.js`: restored to `58118a5`.
- `scripts/smoke-module-production-entrypoint.mjs`: restored to `58118a5`.
- `Shane training/20260702T101729Z_restore-browser-load-after-0df22a8/result.md`: evidence.

## Scope Checks

- Production ESM selection changed: no.
- Classic fallback preserved: yes.
- Globals retired: no.
- Fallback files deleted: no.
- Runtime behaviour changed: yes. The unsafe RAF/title/idempotent-init runtime changes from `0df22a8` were removed to restore the previous loading baseline.

## Validation Results

- `node --check src/app/production-module-entrypoint.js`: pass
- `node --check src/app/browser-dependency-bag.js`: pass
- `node --check src/modules/module-game-lifecycle.js`: pass
- `node --check scripts/smoke-module-production-entrypoint.mjs`: pass
- `node scripts/smoke-production-browser-load.mjs`: failed due sandbox `listen EPERM`
- `node scripts/smoke-production-browser-load.mjs` escalated: failed due Snap Chromium confinement
- `CHROME_BIN=/usr/bin/chromium-browser node scripts/smoke-production-browser-load.mjs` escalated: failed due Snap Chromium confinement
- `npm run frank:run -- "npm run smoke:browser" --timeout 60`: pass
- `npm run frank:run -- "npm run smoke:module-production-entrypoint" --timeout 60`: pass
- `npm run frank:run -- "npm run smoke:module-runtime-readiness" --timeout 60`: pass
- `npm run frank:run -- "npm test" --timeout 240`: pass
- `npm run frank:run -- "npm run build:web" --timeout 240`: pass
- `npm run frank:run -- "npm run check:runtime-parity" --timeout 240`: pass
- `npm run frank:run -- "npm run agent:check -- --fix-format-changed" --timeout 240`: pass
- `git diff --check`: pass
- `npm run task:validate`: pass
- `npm run agent:status`: pass
- `npm run agent:handoff`: pass

## Usage Report

- tokens_known: false
- Token delta: unknown
- Usage snapshot status: failed with `EROFS`

## Remaining Blockers

- Real production-page browser-load proof could not run on this host because Chromium is Snap-packaged and cannot launch under the current capabilities.

## Recommended Next Slice

- Run the real `index.html` browser-load proof in an environment where Chromium or Chrome can launch, then capture the first console/page/network error if the page still fails to load.
