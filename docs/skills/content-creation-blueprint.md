# Skill: Content Creation Blueprint

## Use When

- The user asks to add a new Tap Survivor content asset, feature definition, or
  progression entry.
- The request spans more than one registry domain, or it is unclear which
  registry owns the new content.
- Future debugging and verification must be defined with the content addition.

## Do Not Use When

- The request changes an existing value only; use `content-patch.md`.
- The request introduces a new runtime behavior, effect interpreter type, UI
  behavior, save field, or platform integration. Stop and create a separately
  scoped mechanics or lifecycle task first.
- The request only changes documentation.

## Goal

Add one registry-owned content capability through its real source domain, with
generated content, validation, and a declared automated/manual QA route. Never
assume that a new content entry is covered merely because a related entry is.

## Shared Rules

1. Start with one stable lowercase `snake_case` ID and identify the owning
   domain from the matrix below. Do not edit generated content or `www/`.
2. Use `npm run add:content -- <type> <id> ...` only for its supported types:
   `weapon`, `quest`, `shop-item`, `run-upgrade`, `relic`, `enemy`, `boss`,
   `floor`/`level`, `map`, and `character`. Edit the named registry directly
   for every other domain.
3. Use only schema-supported kinds, stats, effect types, and behavior IDs. A
   missing behavior is a stop condition, not a reason to invent a data value.
4. Build with `npm run build:content`, then run `npm run validate:content`.
   Confirm the generated files were produced by the build, not edited by hand.
5. Record a QA disposition before completion:
   - **Debug-catalog:** invoke the real registered descriptor through
     `?debugRuntime=1` and `npm run smoke:debug-runtime:browser`.
   - **Deterministic validation:** run the domain command in the matrix.
   - **Manual/UI inspection:** use the headed browser runner only when a
     visual or interaction claim cannot be observed deterministically.
6. If a newly added descriptor belongs to `weapons`, `enemies`, `bosses`,
   `runUpgrades`, `effects`, or `pickups`, confirm its explicit
   `catalog.families` mapping exists. The browser runner must fail closed for
   an unmapped family. If the content needs a new invocable family, stop and
   open a separate debug-harness task; do not add a browser-only mechanic.

## Content Domain Matrix

- **Weapons** — `content/registry/weapons.json`; use `add:content -- weapon`.
  Run the debug-catalog weapon invocation and `npm test` for behavior, unlock,
  or combat changes.
- **Weapon unlocks and meta upgrades** — the owned arrays in
  `content/registry/weapons.json`; pair them with a weapon or edit directly.
  Run `npm run audit:quests`, `npm run smoke:quest-flow`, and save smoke when
  persistence changes.
- **Run upgrades** — `content/registry/run-upgrades.json`; use
  `add:content -- run-upgrade`. Run debug-catalog upgrade and effect
  invocation, `npm run verify:assets`, and `npm run verify:audio`.
- **Relics** — `content/registry/relics.json`; use `add:content -- relic`.
  Run `npm run verify:relics` and `npm run smoke:save`; inspect a real reward
  path if runtime rules change.
- **Shop items** — `content/registry/shop-items.json`; use
  `add:content -- shop-item`. Run `npm run economy:check`,
  `npm run smoke:shop`, and `npm run smoke:save`.
- **Enemies** — `content/registry/enemies.json`; use `add:content -- enemy`.
  Run debug-catalog enemy invocation and `npm run smoke:start-run`; add sprite
  checks for visual metadata.
- **Boss configuration and abilities** — `content/registry/bosses.json`; use
  `add:content -- boss` for an ability and edit configuration deliberately.
  Run debug-catalog boss invocation, `npm run smoke:boss-run`, and `npm test`
  for a new ability behavior.
- **Floors and levels** — `content/registry/floors.json`; use
  `add:content -- floor` or `level`. Run `npm run smoke:start-run` and
  `npm run smoke:boss-run` when boss or floor cadence changes.
- **Maps and biomes** — `content/registry/maps.json`; use `add:content -- map`.
  Run `npm run smoke:start-run` and a runtime-parity check if shared output
  changes.
- **Quests and quest groups** — `content/registry/quests.json`; use
  `add:content -- quest` and edit groups directly. Run `npm run audit:quests`
  and `npm run smoke:quest-flow`.
- **Characters** — `content/registry/characters.json`; use
  `add:content -- character`. Run `npm run verify:assets` and inspect the
  supported selection/runtime path.
- **Assets and sprite sheets** — `content/registry/assets.json` plus `assets/`.
  Register logical paths and license/source metadata. Run `npm run verify:assets`,
  `npm run smoke:assets`, and `npm run smoke:spritesheets` for sheets.
- **Audio/SFX** — `content/registry/audio.json`; register the logical asset
  path. Run `npm run verify:audio` and confirm referenced weapon/run-upgrade
  IDs exist.
- **Economy and numeric tuning** — `content/registry/tuning.json` or
  `content/balance/*.json`; edit the owning tuning/profile file. Run
  `npm run economy:check` for shop/loot values and `npm run balance:check` for
  profiles.

## Cross-Domain Dependencies

- A weapon normally needs its unlock node, optional mastery/quest gates, and
  weapon sprite/SFX registration.
- A run upgrade may need effect compatibility, a sprite/icon, SFX, and relic
  targets. Do not add a new effect type without a separately approved runtime
  interpreter change.
- An enemy or boss may need floor eligibility, sprite/SFX metadata, and an
  existing behavior ID. Do not create a new behavior kind as content-only.
- Shop items, relics, meta upgrades, and quest rewards can affect persistence;
  include save validation whenever their stored shape or purchase/reward path
  changes.

## Normalisation and Verification

1. Run the matrix-required checks, then `npm run content:summary` and inspect
   the new ID and cross-references.
2. Run `npm run typecheck` after schema, content tooling, or content-registry
   implementation changes.
3. Run `npm run agent:check -- --fix-format-changed` before committing a
   multi-domain, tooling, or documentation change.
4. For callable families, retain the browser report with every invoked ID. For
   non-callable families, retain the relevant deterministic output and state
   clearly that it is not a live debug invocation.

## Stop Condition

Stop and report `REVISE` when the intended content lacks a schema-supported
kind/effect/behavior, has no owned registry path, or needs a debug command that
does not exist. The next task must add the smallest real owner capability;
never fake coverage with a browser-only duplicate.

## Report Format

```text
Skill: content-creation-blueprint
Content domains changed:
IDs added or changed:
Generated files hand-edited: no
Debug/QA disposition per domain:
Commands run:
Validation result:
Out-of-scope runtime behavior:
```
