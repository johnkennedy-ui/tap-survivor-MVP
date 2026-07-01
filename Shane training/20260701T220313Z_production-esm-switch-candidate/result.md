# Production ESM Switch Candidate

- Status: complete
- Starting HEAD: 1a443bf
- Ending HEAD: 1a443bf before evidence/task commit
- Queue task ID: production-esm-switch-candidate

## Exact `index.html` Switch Made

- Removed the full classic production game script order from `index.html`.
- Preserved the generated shell bridge tags required by the existing runtime-readiness smoke inventory:
  - `src/shell-relic-ui.js?v=auto-shell-helpers`
  - `src/shell-ui.js?v=auto-b114267e`
- Added the production ESM module autoboot selection:
  - `<script type="module" src="src/app/production-module-autoboot.js"></script>`
- `src/game.js` is no longer selected by production `index.html`.
- `src/game-dependencies.js` is no longer selected by production `index.html`.

## Files Inspected

- `index.html`
- `src/app/production-module-autoboot.js`
- `src/app/production-module-entrypoint.js`
- `scripts/smoke-module-production-entrypoint.mjs`
- `scripts/smoke-module-runtime-readiness.mjs`
- `Shane training/20260701T213829Z_strong-brain-esm-crossover-review/result.md`

## Files Changed

- `index.html`
- `.agent/tasks.json`
- `Shane training/20260701T220313Z_production-esm-switch-candidate/result.md`

## Production Impact

- Production `index.html` changed: yes
- Production runtime behaviour changed: yes, production now selects the ESM module autoboot path.
- Classic fallback files preserved: yes
- `src/game.js` changed: no
- `src/game-dependencies.js` changed: no

## Android/Web Parity Impact

- No Android files were changed.
- `npm run build:web` and `npm run check:runtime-parity` passed.
- No tracked `www/**` validation artifacts remained changed after the bounded production-surface checks.

## Global Boundary Impact

- No globals were retired.
- No classic fallback source files were deleted.
- The full classic production script order, generated game-dependency adapter, and classic `src/game.js` entrypoint are no longer selected by `index.html`.
- The generated shell UI bridge tags remain selected so the existing readiness smoke keeps its deterministic generated bridge inventory while the active game boot path is ESM autoboot.
- No new `TapSurvivor*` consumer reads were added.

## Validation Commands and Results

- `git fetch origin main`: pass
- `git checkout main`: pass
- `git pull --ff-only origin main`: pass
- `git rev-parse --abbrev-ref HEAD`: `main`
- `git rev-parse --short HEAD`: `1a443bf`
- `git rev-parse --short origin/main`: `1a443bf`
- `git status --short`: clean before edit
- `npm run task:validate`: pass
- `npm run task:list`: pass
- `npm run agent:mission-start`: pass
- GitHub Actions for `1a443bf`: success for `non-secret-checks`, `publish`, and `agent-check`
- `npm run frank:run -- "npm run smoke:module-runtime-readiness" --timeout 60`: failed once after replacing the entire classic script block; failing check was `readiness sees deterministic generated bridge inventory`
- `npm run frank:run -- "npm run smoke:module-runtime-readiness" --timeout 60`: pass after preserving generated shell bridge tags
- `npm run frank:run -- "npm run smoke:module-production-entrypoint" --timeout 60`: pass
- `npm run frank:run -- "npm run build:web" --timeout 240`: pass
- `npm run frank:run -- "npm run check:runtime-parity" --timeout 240`: pass
- `npm run frank:run -- "npm run agent:check -- --fix-format-changed" --timeout 240`: pass
- `git diff --check`: pass
- `npm run task:validate`: pass
- `npm run agent:status`: pass
- `npm run agent:handoff`: pass

## Generated Validation Artifacts

- Generated validation artifacts changed/restored: none.
- `build:web` and `check:runtime-parity` left no tracked `www/**` changes.

## Usage Report

- Ledger path: `/home/logix/.openclaw/frank-usage/usage.jsonl`
- Mission: production-esm-switch-candidate
- `tokens_known`: false
- Token delta: unknown
- Usage snapshot status: start and end snapshots soft-failed with EROFS; report found no snapshots.

## Rollback Plan

- Revert the switch commit or restore the `index.html` classic script block from `1a443bf`.
- Because `src/game.js`, `src/game-dependencies.js`, and classic runtime files were not changed, rollback does not require source or save-data migration.

## Remaining Blockers After Switch

- Global retirement remains out of scope.
- Classic fallback files remain intentionally present.
- The runtime-readiness inventory still contains static production-switch/global-retirement wording that should be refreshed in a follow-up once the ESM switch candidate is accepted.

## Next Recommended Mission

- Monitor CI and browser runtime behaviour for the ESM switch candidate.
- If green, run a narrow follow-up to update readiness inventory wording and plan any later global-retirement or fallback-cleanup work separately.
