# Runtime debug harness

The module browser runtime exposes one automation surface only when the
injected browser `globalRef.location.search` contains the exact query entry
`debugRuntime=1`. The surface is published as the non-retired,
non-enumerable `TapSurvivorDebugRuntime` property on that same `globalRef`.
Without the exact entry (for example, no query, `debugRuntime=0`, or
`foo=debugRuntime=1`) the property is absent.

```js
const debug = globalThis.TapSurvivorDebugRuntime;
const catalog = debug.catalog();
debug.invoke("run.reset", { towerFloor: 8 });
debug.invoke("weapon.fire", { id: catalog.result.weapons[0].id });
```

The API is versioned (`version: 1`) and returns structured `{ ok, version,
command, result|error }` values. Catalog entries come directly from the
runtime content registry, so new registered weapons, enemies, bosses,
upgrades, and effects are discoverable without adding browser controls.

## Browser QA and hands-on inspection

Run the catalog-driven browser QA with a single local command:

```bash
npm run smoke:debug-runtime:browser
```

It starts its own loopback server on an ephemeral port, verifies JavaScript
MIME types, uses a disposable Playwright browser profile, and writes a JSON
report to `tmp/debug-runtime-browser-qa/report.json`. The report includes the
candidate SHA, ordered browser diagnostics, scenario outcomes, and every
registered command invocation. It reads `catalog()` at runtime: when content
adds a compatible registered command family or entry, the runner includes it
without a hand-maintained content-ID list.

For a visible, bounded manual session (five minutes by default), run:

```bash
npm run smoke:debug-runtime:browser -- --headed
```

The browser remains open at the opted-in URL while the timer runs. Open DevTools
and use `TapSurvivorDebugRuntime.catalog()` to discover content and
`TapSurvivorDebugRuntime.invoke(command, { id })` to invoke an entry. Adjust
the inspection window when needed, for example:

```bash
npm run smoke:debug-runtime:browser -- --headed --manual-timeout-ms 900000
```

The normal browser runtime stays inert: neither the automated runner nor
headed inspection publishes the API without `?debugRuntime=1`.

Commands that mutate a run are:

- `run.reset` accepts an optional positive `towerFloor` and creates an isolated
  active debug run through the run-state owner. Use it before each independent
  scenario; the catalog reports each enemy's `minTowerFloor`.
- `weapon.fire`, `enemy.spawn`, and `boss.spawn`
- `runUpgrade.apply` and `effect.apply`
- `pickup.collect` for `xp`, `coin`, or `heart`

Every mutating command validates its command, arguments, registered ID, and
active run before state mutation (except `run.reset`, which creates that
active debug run). Commands delegate to the existing run-state, combat,
upgrade/effect, and pickup owners; the harness does not reimplement gameplay.
The API is intended for deterministic local automation and is not a production
or persistence control surface.
