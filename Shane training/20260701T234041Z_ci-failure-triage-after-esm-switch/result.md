# CI Failure Triage After ESM Switch

- Mission ID: `ci-failure-triage-after-esm-switch`
- Active model/auth: `openai/gpt-5.4-mini @ openai:quatrex@googlemail.com`
- Starting HEAD: `d7aa154`
- Ending HEAD at diagnosis: `d7aa154`
- Branch / origin/main: `main` / `d7aa154`
- Local main equals origin/main: yes
- Worktree at start: clean

## Failed Workflows / Checks

The previous diagnostic pass found these failed GitHub Actions results for `d7aa154`:

- `CI`
- `Agent Check`
- `Publish Tap Survivor MVP`

Job and step summaries from the workflow metadata:

- `CI` run `28553395005`: job `non-secret-checks` failed at step `Run tests`
- `Agent Check` run `28553395025`: job `agent-check` failed at step `Run agent validation`
- `Publish Tap Survivor MVP` run `28553395038`: job `publish` failed at step `Run agent validation`

## Logs Accessible

- GitHub job logs: not fetched in this pass; `gh` was unauthenticated here
- Workflow / run metadata: accessible through the GitHub API
- Local reproduction logs: accessible under `.agent/runs/`

## Root Cause

The failure was stale verification logic after the production ESM switch:

- `scripts/verify-mvp.mjs` still expected `index.html` to load the classic script stack, including `src/assets.js`, `src/game.js`, and `src/game-dependencies.js`.
- `scripts/verify-focus.mjs` still required `index.html` to reference `src/assets.js` before it accepted the asset resolver.
- Those checks were no longer valid after `index.html` switched production to `src/app/production-module-autoboot.js`.

## Local Reproduction

Before the fix:

- `npm test` failed in `scripts/verify-mvp.mjs` on stale classic-index assertions.
- `npm run agent:check -- --fix-format-changed` failed at `verify:assets` with `FAIL asset resolver module is loaded`.

After the fix:

- `node --check scripts/verify-focus.mjs`
- `node --check scripts/verify-mvp.mjs`
- `npm run verify:assets`
- `npm run frank:run -- "npm test" --timeout 240`
- `npm run frank:run -- "npm run agent:check -- --fix-format-changed" --timeout 240`
- `git diff --check`
- `npm run task:validate`
- `npm run agent:status`
- `npm run agent:handoff`

All of the above passed after the narrow verification updates.

## Fix Applied

- `scripts/verify-focus.mjs`
  - Relaxed the asset check so it only verifies that `src/assets.js` still exports `createAssetResolver`.
- `scripts/verify-mvp.mjs`
  - Replaced the stale classic-index assertions with ESM-aware checks for:
    - `src/app/production-module-autoboot.js`
    - `src/app/production-module-entrypoint.js`
    - the retained shell bridge tags
  - Removed the stale `index.html` dependency from the sprite-sheet renderer check.

## Files Inspected

- `index.html`
- `src/app/production-module-autoboot.js`
- `src/app/production-module-entrypoint.js`
- `src/app/browser-dependency-bag.js`
- `src/app/compose-runtime.js`
- `src/game.js`
- `src/game-dependencies.js`
- `src/modules/game-dependencies.js`
- `src/modules/module-game-dependencies.js`
- `src/modules/module-game-lifecycle.js`
- `scripts/smoke-module-runtime-readiness.mjs`
- `scripts/smoke-module-production-entrypoint.mjs`
- `scripts/check-runtime-parity.mjs`
- `scripts/check-globals.mjs`
- `scripts/allowed-globals.json`
- `.agent/tasks.json`
- `.agent/status.md`
- `Shane training/20260701T220313Z_production-esm-switch-candidate/result.md`
- `Shane training/20260701T222352Z_post-switch-esm-verification/result.md`

## Files Changed

- `scripts/verify-focus.mjs`
- `scripts/verify-mvp.mjs`
- `Shane training/20260701T234041Z_ci-failure-triage-after-esm-switch/result.md`

## State Flags

- Production ESM selection changed: no
- Classic fallback preserved: yes
- Globals retired: no
- Fallback files deleted: no

## CI Unblock Status

Still blocked until the fixed commit is pushed and the resulting GitHub Actions checks are green.

## Usage Report

- `tokens_known`: false
- Token delta: unknown
- Usage snapshot status: unavailable
