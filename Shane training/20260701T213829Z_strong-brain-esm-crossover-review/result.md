# Strong-Brain ESM Crossover Review

- Status: complete
- Starting HEAD: fab5572
- Ending HEAD: fab5572 before evidence/task commit
- Queue task ID: strong-brain-esm-crossover-review

## Readiness Inventory Result

- Module-native browser readiness blockers are cleared.
- `npm run smoke:module-runtime-readiness` passed.
- The readiness inventory reports only production-switch-scope runtime blockers:
  - `index.html` still loads the classic script order.
  - `src/game.js` remains the production entrypoint until the production ESM candidate is selected.
  - Production still uses generated `src/game-dependencies.js` classic global adapter.
  - Production ESM entrypoint candidate exists but is not selected by `index.html`.
- The remaining global-retirement blockers are also switch/fallback scope:
  - Classic production script order still publishes `TapSurvivor*` compatibility globals.
  - Generated `src/game-dependencies.js` classic global adapter remains active for production.
  - Compatibility-boundary reads remain until production switches away from classic globals.

## Production-Switch Blockers Remaining

- `index.html` is still the production selection point and still loads the classic runtime script order.
- `src/game.js` remains the active classic production entrypoint.
- `src/game-dependencies.js` remains the generated classic adapter and fallback boundary.
- The ESM entrypoint candidate is present but not selected by production HTML.

## Files Inspected

- `docs/AGENT_TOKEN_BUDGET.md`
- `docs/AGENT_TASK_QUEUE.md`
- `.agent/status.md`
- `Shane training/20260701T210642Z_batch-3-remaining-module-readiness/result.md`
- `scripts/smoke-module-runtime-readiness.mjs`
- `scripts/smoke-module-production-entrypoint.mjs`
- `src/app/production-module-entrypoint.js`
- `src/app/production-module-autoboot.js`
- `src/app/browser-dependency-bag.js`
- `src/app/compose-runtime.js`
- `src/modules/module-game-dependencies.js`
- `index.html`
- `src/game.js`
- `src/game-dependencies.js`
- `scripts/allowed-globals.json`
- `package.json`
- `scripts/check-runtime-parity.mjs`

## Files Changed

- `.agent/tasks.json`
- `Shane training/20260701T213829Z_strong-brain-esm-crossover-review/result.md`

## Global Boundary Assessment

- No new unsafe global consumer reads were found in the reviewed production ESM entrypoint path.
- `src/app/production-module-entrypoint.js` and `src/app/production-module-autoboot.js` contain no direct classic `TapSurvivor*` global reads.
- Approved compatibility/bootstrap boundaries that remain until the switch:
  - `src/app/browser-dependency-bag.js` classic namespace bridges for browser gameplay/progression defaults.
  - `src/game-dependencies.js` generated classic adapter.
  - `src/game.js` classic production entrypoint while `index.html` selects the classic script order.
  - Browser platform globals such as `document`, storage, audio, images, timers, and animation frame APIs.

## Production and Parity Impact

- Production `index.html` changed: no
- Production runtime behaviour changed: no
- Android/web parity assessment: no runtime files or `www/**`/Android files were changed. The actual switch candidate must rerun web/runtime parity checks because it will change the production selection surface.

## Validation Commands and Results

- `git fetch origin main`: pass
- `git checkout main`: pass
- `git pull --ff-only origin main`: pass
- `git rev-parse --abbrev-ref HEAD`: `main`
- `git rev-parse --short HEAD`: `fab5572`
- `git rev-parse --short origin/main`: `fab5572`
- `git status --short`: clean before task activation
- `npm run task:validate`: pass
- `npm run task:list`: pass
- `npm run agent:mission-start`: pass
- GitHub Actions for `fab5572`: success for `non-secret-checks`, `publish`, and `agent-check`
- `npm run frank:run -- "npm run smoke:module-runtime-readiness" --timeout 60`: pass
- `npm run frank:run -- "npm run smoke:module-production-entrypoint" --timeout 60`: pass
- `npm run frank:run -- "npm run agent:check -- --fix-format-changed" --timeout 240`: pass
- `git diff --check`: pass
- `npm run task:validate`: pass
- `npm run check:runtime-parity`: not run in this review because the script writes `www/runtime-manifest.json`; reserve it for the actual switch candidate or release parity gate.

## Usage Report

- Ledger path: `/home/logix/.openclaw/frank-usage/usage.jsonl`
- Mission: strong-brain-esm-crossover-review
- `tokens_known`: false
- Token delta: unknown
- Usage snapshot status: start and end snapshots soft-failed with EROFS; report found no snapshots.

## Go/No-Go Recommendation

- Recommendation: go for a separate production ESM switch candidate, with strong-brain implementation/review.
- This review does not authorize broad runtime deletion, global retirement, or classic fallback removal.
- The switch is small but high blast-radius because it changes the production HTML selection point.

## Exact Next Switch-Candidate Scope

- Minimum runtime change: `index.html` only.
- Replace the classic script order selection with the module autoboot entrypoint for `src/app/production-module-autoboot.js`.
- Keep `src/game.js`, `src/game-dependencies.js`, and classic runtime files intact as rollback/fallback paths.
- Do not delete classic files or retire globals in the switch candidate.

## Required Validation for the Switch Candidate

- Before editing:
  - clean `git status --short`
  - `npm run task:validate`
  - `npm run frank:run -- "npm run smoke:module-runtime-readiness" --timeout 60`
  - `npm run frank:run -- "npm run smoke:module-production-entrypoint" --timeout 60`
  - GitHub Actions green or explicitly unknown for the base commit
- After editing:
  - `node --check src/app/production-module-entrypoint.js`
  - `node --check src/app/production-module-autoboot.js`
  - `npm run frank:run -- "npm run smoke:module-runtime-readiness" --timeout 60`
  - `npm run frank:run -- "npm run smoke:module-production-entrypoint" --timeout 60`
  - `npm run frank:run -- "npm run agent:check -- --fix-format-changed" --timeout 240`
  - `git diff --check`
  - `npm run task:validate`
  - `npm run agent:status`
  - `npm run agent:handoff`
  - a bounded browser/runtime parity check if the switch candidate intentionally updates the production runtime surface
  - GitHub Actions check after push

## Rollback Plan

- Revert the switch commit or restore only the `index.html` classic script order from the pre-switch commit.
- Because `src/game.js`, `src/game-dependencies.js`, and classic runtime files remain untouched, rollback should immediately restore the current production path.
- No save-data rollback is expected because the review found no save schema or runtime data migration in scope.

## Recommended Model for Actual Switch Candidate

- Use strong brain for the actual production ESM switch implementation and review.
- Cheap hands are safe only for mechanical validation after the strong-brain scope remains `index.html`-only.
