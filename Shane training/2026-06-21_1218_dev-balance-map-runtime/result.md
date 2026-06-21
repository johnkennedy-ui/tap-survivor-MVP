# Dev Balance Runtime And Map Runtime

Request: add dev-only runtime balance profile selection, local override sandbox, minimal runtime-active map/floor wiring, and targeted smoke tests.

Files inspected included content registry/balance JSON, content tooling, schema, runtime game/combat/spawn/render/shop/pickup modules, docs, README, and AGENTS.md.

Implemented:
- Generated `globalThis.TapSurvivorBalanceProfiles` from `content/balance/*.json`.
- Added `src/balance-runtime.js` for dev-only `?balance=...`, `localStorage.tapSurvivor.balanceProfile`, and `window.TapSurvivorDebugBalance`.
- Added `src/map-system.js` to resolve active map/floor/background/modifiers and expose them on run state.
- Wired active floor into enemy spawning through the existing spawn path.
- Made shop/loot tuning read their config objects dynamically so runtime local overrides are reflected without broad system recreation.
- Corrected stale docs that pointed at `content/tap-survivor-content.json` as the primary source.
- Added `npm run smoke:balance-runtime` and `npm run smoke:map-runtime`.
- Left `scripts/content-tools.mjs` unsplit; it owns assembly, validation, balance overlays, and reporting, so splitting it in this slice would broaden review risk.

Validation:
- `npm run verify:script-order` PASS
- `npm run build:content` PASS
- `npm run validate:content` PASS
- `npm run content:summary` PASS
- `npm run balance:summary` PASS
- `npm run balance:check` PASS
- `npm run balance:diff` PASS
- `npm run economy:check` PASS
- `npm run smoke:add-content` PASS
- `npm run smoke:start-run` PASS
- `npm run smoke:balance-runtime` PASS
- `npm run smoke:map-runtime` PASS
- `npm test` PASS after adding new runtime globals to `scripts/verify-speed-controls.mjs`
- `npm run agent:check` PASS

Remaining follow-up:
- Split `scripts/content-tools.mjs` in a separate low-risk refactor.
- Add real map content only when gameplay/art direction is ready.
