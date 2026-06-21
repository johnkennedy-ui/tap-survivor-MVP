# Start Run Flow Fix Evidence

## Request

Fix the `CI / non-secret-checks` failure and remove the superfluous Start Run screen.

## Scope

- Update verifier expectations for the new title flow.
- Remove remaining `startMenu` / `startMenuStartRun` product hooks.
- Update smoke harnesses to use `titleStartGame`.
- Validate locally, commit, push `main`, and verify the remote ref.
- Do not include local `.agent/` status evidence in the commit.

## Files Changed

- `src/ui.js`
- `src/shell-ui.js`
- `src/game.js`
- `scripts/verify-mvp.mjs`
- `scripts/check-format-hygiene.mjs`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`
- `scripts/smoke-relic-run-start.mjs`
- `scripts/smoke-boss-run.mjs`
- `scripts/smoke-debug.mjs`
- `scripts/smoke-shop.mjs`
- `scripts/browser-smoke.html`

## Validation

- `npm run smoke:boss-run`: passed
- `npm test`: passed
- `npm run format:check`: passed
- `npm run check:format-hygiene`: passed
- `npm run agent:check`: passed, including `smoke:browser`

## Commit And Push

- Commit: `dff267ff89e53e41010369f38c5e1e0c7cabe2af`
- Message: `Remove intermediate start run flow`
- Push: `60caae1..dff267f main -> main`
- Remote verification: `dff267ff89e53e41010369f38c5e1e0c7cabe2af refs/heads/main`

## Caveat

Local `.agent/` remained untracked and was intentionally not committed.
