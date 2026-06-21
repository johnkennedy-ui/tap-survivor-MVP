# Content Workbench And Balance Profiles

## Request

Build the content workbench and balance profile architecture without rebalancing gameplay, changing UI copy, changing Android/Play Store config, changing assets, or editing generated `www/`.

## Scope

- Split source content into domain files under `content/registry/`.
- Add balance profiles under `content/balance/`.
- Keep generated runtime content compatible with the existing browser-global game.
- Extend add-content generation, validation, and reporting.
- Update docs.

## Files Changed

- `.agent/status.md`
- `AGENTS.md`
- `content/tap-survivor-content.json`
- `content/tap-survivor-schema.json`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CONTENT_EXTENSION_GUIDE.md`
- `package.json`
- `scripts/add-content.mjs`
- `scripts/build-content.mjs`
- `scripts/content-check.mjs`
- `scripts/content-summary.mjs`
- `scripts/content-tools.mjs`
- `scripts/economy-check.mjs`
- `scripts/smoke-add-content.mjs`
- `scripts/validate-content.mjs`
- `scripts/verify-mvp.mjs`
- `src/content-registry.js`
- `src/content.generated.js`
- `src/game.js`
- `src/pickups.js`
- `src/shop-pricing.js`
- `src/shop.js`

## New Content Domain Files

- `content/registry/weapons.json`
- `content/registry/relics.json`
- `content/registry/shop-items.json`
- `content/registry/run-upgrades.json`
- `content/registry/enemies.json`
- `content/registry/bosses.json`
- `content/registry/floors.json`
- `content/registry/maps.json`
- `content/registry/quests.json`
- `content/registry/characters.json`
- `content/registry/assets.json`
- `content/registry/audio.json`
- `content/registry/tuning.json`

## New Balance Profile Files

- `content/balance/default.json`
- `content/balance/dev-fast.json`
- `content/balance/testing.json`

## Generator Commands

`npm run add:content --` now supports:

- `weapon`
- `relic`
- `shop-item`
- `run-upgrade`
- `enemy`
- `boss`
- `floor`
- `map`
- `character`
- `quest`

Generators write through the assembled content model into the correct registry file, reject duplicates, and print changed files plus validation commands.

## Validation Rules Added Or Extended

- Domain registry assembly validates.
- Balance profile overrides validate known sections, known IDs, supported fields, numeric ranges, and known enemy/floor references.
- Map entries validate floor references and background assets.
- Enemy behavior kinds validate when present.
- Relic special modifier keys validate against schema.
- Weapon/enemy/character asset references validate where the registry has a logical asset group.
- Tuning values validate numeric ranges.

## Reporting Commands

- `npm run content:summary`
- `npm run balance:summary`
- `npm run balance:diff`
- `npm run balance:check`
- `npm run economy:check`

## Runtime Compatibility

`scripts/build-content.mjs` still produces `src/content.generated.js` with `globalThis.TapSurvivorContent` and `globalThis.TapSurvivorContentSchema`. Runtime modules continue to consume the same content object shape, with added `maps` and `tuning` fields. Default tuning preserves current shop and loot values.

## Validation

- `npm run verify:script-order`: pass
- `npm run build:content`: pass
- `npm run validate:content`: pass
- `npm run content:summary`: pass
- `npm run economy:check`: pass
- `npm run smoke:add-content`: pass
- `npm run smoke:start-run`: pass
- `npm test`: pass
- `npm run agent:check`: pass
- `npm run balance:summary`: pass
- `npm run balance:check`: pass
- `npm run balance:diff`: pass

## Follow-Up Work

- Optional dev-only runtime reload was not added; balance profile selection is build-time through `TAP_SURVIVOR_BALANCE_PROFILE`.
- Future map/biome gameplay rendering still needs a separate runtime task before maps affect play.

## Result

SUCCESS: content workbench and balance profile architecture completed and validated locally. Not committed.
