# Global retirement execution plan

**Run mode:** solo-project fast migration (authorized 2026-07-21). Retire production `TapSurvivor*`
globals and script-order bridge use before preserving classic fallback parity. No deployment or
production configuration changes are in scope.

**Baseline:** `f276455747fc7d8eabb3e38413565e647a1e977f` (`main`; tracked tree clean when
inventoried; untracked `tmp/` excluded).

## Acceptance

- Production sources no longer publish or consume `globalThis.TapSurvivor*` / classic bridge
  namespaces.
- Remaining `globalThis` use is platform API, test/tool diagnostics, or an explicitly documented
  temporary boundary.
- `npm run check:globals`, `npm run smoke:module-production-entrypoint`,
  `npm run smoke:module-runtime-readiness`, and `npm run agent:check` pass for each integrated cut
  where applicable.
- Refresh `docs/GLOBAL_STATE_INVENTORY.md` and `scripts/allowed-globals.json` only as a consequence
  of an implemented cut; do not conceal violations with allowlist changes.

## Ordered cuts

1. **Bootstrap seam / runtime dependency bag** — move `game.js`, `game-dependencies.js`, and
   `game-runtime.js` to explicit injection via the app composition modules. This unlocks removal of
   the remaining script-order runtime owner.
2. **Runtime module bridge factories** — replace remaining `TapSurvivor*` reads in the app
   dependency bag with native factory imports, beginning with renderer/UI composition.
3. **Gameplay leaf bridges** — retire combat, enemy, weapon, pickup, progression, quest, relic,
   audio, input, debug, and run-update publishers as their consumers become module-wired.
4. **Persistence bridge** — inject storage, save, migration, normalization, corruption, and defaults
   helpers; remove the classic save namespace only after consumers are native.
5. **Content surface** — move assets, upgrades, and balance runtime to generated ESM content exports
   and explicit platform adapters; retire the content and balance publishers last.
6. **Final classic boundary removal** — remove remaining script tags/bridge publishers and audit
   browser/platform globals separately; update the inventory to zero production namespace globals.

## First contract: bootstrap seam

**Base:** `f276455747fc7d8eabb3e38413565e647a1e977f`

**Writable paths:**

- `src/game.js`
- `src/game-dependencies.js`
- `src/game-runtime.js`
- `src/app/browser-dependency-bag.js`
- `src/app/compose-runtime.js`
- `src/app/production-module-entrypoint.js`
- `src/app/production-module-autoboot.js`
- `src/modules/module-game-dependencies.js`
- `src/modules/module-game-lifecycle.js`
- `docs/GLOBAL_STATE_INVENTORY.md`
- `docs/GLOBAL_RETIREMENT_PLAN.md`

**Do not touch:** `index.html`, generated content sources, save sources, or the global allowlist in
this cut.

**Verification:** targeted global/module smokes first; then the four acceptance commands above. If
the cut exposes an invalid classic fallback, favor a native-module correction or remove the fallback
rather than restoring a production global.

## Inventory notes

At plan creation, `window` direct hits in `src/` were zero. Remaining production namespace groups
were: bootstrap/runtime dependency bag; presentation/UI; gameplay leaf bridges; persistence; and
generated content/balance. Browser APIs (`localStorage`, `location`, Capacitor preferences, audio
constructors, timers) are not `TapSurvivor` globals and require separate adapter handling after
namespace retirement.
