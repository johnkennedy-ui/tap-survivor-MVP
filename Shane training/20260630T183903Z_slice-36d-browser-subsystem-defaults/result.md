# Slice 36D Browser Subsystem Defaults Evidence

## Status

Complete.

## Starting HEAD

f3cf954

## Queue Task ID

slice-36d-browser-subsystem-defaults

## Target

Render + sprite browser defaults for the production module runtime candidate.

## Why This Group

Slice 36C proved platform defaults. The readiness inventory still listed browser dependency bag
proof/no-op defaults before the production module switch. Render and sprite defaults are the next
coherent browser-facing group and share the production entrypoint/readiness smoke path.

## What Changed

- Added explicit browser render and sprite proof slot inventories.
- Replaced the default browser sprite no-op with a canvas/Image-backed sprite system.
- Extended browser render defaults to clear the canvas and route frame, enemy, and skill rail
  drawing through the default sprite system.
- Extended production entrypoint smoke coverage for render and sprite defaults.
- Updated readiness inventory and remaining blocker wording to remove render/sprite from the
  proof/no-op default list.

## Files Inspected

- `docs/AGENT_TOKEN_BUDGET.md`
- `docs/AGENT_TASK_QUEUE.md`
- `.agent/status.md`
- `Shane training/20260630T180716Z_slice-36c-module-runtime-batch/result.md`
- `scripts/smoke-module-runtime-readiness.mjs`
- `src/app/browser-dependency-bag.js`
- `src/modules/module-runtime-rendering-adapter.js`
- `src/modules/module-runtime-sprite-adapter.js`
- `scripts/smoke-module-production-entrypoint.mjs`
- `src/sprites.js`

## Files Changed

- `src/app/browser-dependency-bag.js`
- `scripts/smoke-module-production-entrypoint.mjs`
- `scripts/smoke-module-runtime-readiness.mjs`
- `.agent/tasks.json`
- `.agent/status.md`
- `Shane training/20260630T183903Z_slice-36d-browser-subsystem-defaults/result.md`

## Commands Run and Results

- Cheap start gate commands - passed; `main` at `f3cf954`, matching `origin/main`, clean worktree.
- `npm run task:add -- --id "slice-36d-browser-subsystem-defaults" --summary "Replace or prove the next browser subsystem defaults needed before the production module runtime switch."` - passed.
- `npm run task:active -- slice-36d-browser-subsystem-defaults` - passed.
- `node --check src/app/browser-dependency-bag.js` - passed.
- `node --check scripts/smoke-module-production-entrypoint.mjs` - passed.
- `node --check scripts/smoke-module-runtime-readiness.mjs` - passed.
- `npm run frank:run -- "npm run smoke:module-production-entrypoint" --timeout 60` - passed.
- `npm run frank:run -- "npm run smoke:module-runtime-readiness" --timeout 60` - passed.
- `npm run frank:run -- "npm run agent:check -- --fix-format-changed" --timeout 180` - passed.
- `npm run task:validate` - passed.
- `npm run task:list` - passed.
- `npm run agent:mission-start` - passed.
- `npm run agent:status` - passed.
- `npm run agent:handoff` - passed.

## Validation Results

Passed locally. Latest final validation log:

- `.agent/runs/2026-06-30T184004Z_npm-run-agent-check-fix-format-changed/command.log`

## Scope Confirmation

No `index.html`, `www/`, Android, GitHub workflow, deploy, asset, content balance, skill doc,
queue tooling, runner tooling, or token-budget tooling files were edited.

## Remaining Limitations

- Production still uses the classic script order.
- The production ESM entrypoint candidate is still not selected by `index.html`.
- Gameplay, progression, and UI browser defaults still use proof/no-op adapters.
- Module-native browser subsystem files are still incomplete for a later production switch.
