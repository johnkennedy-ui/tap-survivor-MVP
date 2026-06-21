# Content Extension Guide

## Naming Conventions

- Use lowercase snake_case for content IDs: `spark_bolt`, `unlock_spark_bolt`, `spark_bolt_mastery`.
- Use stable logical IDs in code and content, not raw asset paths.
- Weapon unlock IDs should be `unlock_<weapon_id>`.
- Weapon upgrade IDs should usually be `<weapon_id>_damage`.
- Sprite IDs should match content IDs where possible.

## Folder Conventions

- Source content registry: `content/registry/*.json`.
- Compatibility mirror: `content/tap-survivor-content.json`; tooling keeps it assembled for older scripts.
- Machine-readable content schema: `content/tap-survivor-schema.json`.
- Balance profiles: `content/balance/*.json`.
- Generated content and schema globals: `src/content.generated.js`.
- Sprites and licenses: `assets/<source>/<pack>/`.
- Agent docs: `docs/`.

## Schema-Backed Defaults

- `scripts/add-content.mjs` reads default templates from `content/tap-survivor-schema.json`.
- Update schema `templates` before changing repeated CLI defaults for weapons, quests, or shop items.
- Update schema `fieldRules` before changing repeated validator rules for shop item fields, kinds, costs, or effects.
- Run `npm run smoke:add-content` after changing `scripts/add-content.mjs`, schema templates, or content-tool path handling.
- `src/content.generated.js` exposes `globalThis.TapSurvivorContentSchema`; runtime modules can use generated schema constants when they need supported content lists.

## Content Domains

- Weapons, unlocks, and meta upgrades: `content/registry/weapons.json`.
- Run upgrades: `content/registry/run-upgrades.json`.
- Relics: `content/registry/relics.json`.
- Shop items: `content/registry/shop-items.json`.
- Enemies: `content/registry/enemies.json`.
- Boss config and boss abilities: `content/registry/bosses.json`.
- Floors/waves: `content/registry/floors.json`.
- Maps/biomes: `content/registry/maps.json`.
- Quests and quest groups: `content/registry/quests.json`.
- Characters: `content/registry/characters.json`.
- Asset sources and sprite paths: `content/registry/assets.json`.
- Audio/SFX paths: `content/registry/audio.json`.
- Numeric tuning such as shop and loot rates: `content/registry/tuning.json`.

Use `npm run build:content` to assemble these domains into `src/content.generated.js`.

## Balance Profiles

- Default balance: `content/balance/default.json`; it preserves current values.
- Dev/test examples: `content/balance/dev-fast.json`, `content/balance/testing.json`.
- Select a build-time profile with `TAP_SURVIVOR_BALANCE_PROFILE=<profile> npm run build:content`.
- Validate profiles with `npm run balance:check`.
- Inspect available profiles with `npm run balance:summary`.
- Compare a profile with base registry values with `npm run balance:diff -- <profile>`.

Balance overrides are for numeric tuning and safe existing-ID list replacements only. New behavior kinds, new runtime effects, new weapon behavior dispatch, and new UI behavior still require code changes.

## Add A Weapon

1. Prefer `npm run add:content -- weapon <id> ...`, or edit `content/registry/weapons.json`.
2. Give it `name`, `description`, `upgradeId`, `cooldown`, `damage`, `kind`, `color`, and kind-specific fields.
3. Use only weapon `kind` values listed in `content/tap-survivor-schema.json` unless you are also adding runtime behavior in `src/weapon-fire.js`.
4. Add a matching `weaponUnlocks` entry with `id`, `weaponId`, `cost`, `branch`, and any gates.
5. Add mastery or unlock quests under `quests` if the weapon should gate progression.
6. Add the quest ID to the right `questGroups` list if it tracks kills, damage, survival, XP, levels, or boss kills.
7. If it has a sprite, add the sprite path under `assets.sprites.weapons`.
8. Run `npm run build:content && npm run validate:content`.
9. Run `npm test` if combat behavior, unlock flow, or generated tests are affected.

Shortcut:

```bash
npm run add:content -- weapon frost_example --name "Frost Example" --description "Example projectile." --kind projectile --damage 10 --cooldown 1 --color "#8de7ff" --unlock-cost 1 --branch Control
```

## Add A Quest

1. Use `scripts/add-content.mjs quest` for new quest entries.
2. Pass `--group` for kill, damage, survival, XP, level, or boss milestone quests.
3. Pass `--after <previous_id>` to open the new quest after an existing quest completes.
4. Pass `--opens <next_id>` only when the new quest itself should open a known follow-up.
5. Run `npm run build:content && npm run audit:quests`.

Shortcut:

```bash
npm run add:content -- quest next_boss_trial --name "Next Boss Trial" --description "Defeat 20 bosses." --target 20 --reward 14 --group boss --after boss_myth
```

## Add A Skill Or Upgrade

1. Check whether the change is a meta upgrade or an in-run upgrade.
2. For meta upgrades, add to `metaUpgrades` in `content/registry/weapons.json`.
3. For weapon damage upgrades, set or update the weapon `upgradeId`; `src/upgrades.js` generates the upgrade.
4. For in-run upgrades, prefer `npm run add:content -- run-upgrade <id> ...`, or edit `content/registry/run-upgrades.json`.
5. Use stable IDs and avoid duplicating an existing stat modifier.
6. Run `npm run build:content && npm run validate:content`.
7. Run `npm test` if the upgrade can affect gameplay.

## Add An Item

1. Prefer `npm run add:content -- shop-item <id> ...`, or edit `content/registry/shop-items.json`.
2. Include `id`, `name`, `description`, `kind`, `cost`, `maxTier`, and optional `effect`.
3. Keep `effect.stat` aligned with `content/tap-survivor-schema.json`.
4. `stat_upgrade` items with supported effect stats are applied by `src/shop.js`/`src/combat.js`.
5. Run `npm run build:content && npm run validate:content`.
6. Run `npm run economy:check` when changing costs, tiers, coin scaling, or shop stat lanes.

Shortcut:

```bash
npm run add:content -- shop-item quick_boots --name "Quick Boots" --description "Move faster." --kind stat_upgrade --cost 100 --effect-stat speed --effect-value 5 --max-tier 1
```

## Add A Level

1. Prefer `npm run add:content -- floor <id> ...`, or edit `content/registry/floors.json`.
2. Include `id`, `name`, `startsAt`, optional `enemyIds`, `spawnCount`, `spawnRateMultiplier`, and `notes`.
3. Keep timing in seconds.
4. Run `npm run build:content && npm run validate:content`.

Shortcut:

```bash
npm run add:content -- floor desert_overtime --name "Desert Overtime" --starts-at 420 --enemies drifter,skitter,bulwark --spawn-count 3 --spawn-rate 1.1
```

## Tune Boss Abilities

1. Edit `bossConfig` and `bossAbilities` in `content/registry/bosses.json`.
2. Keep `bossConfig.abilityIds` aligned with keys in `bossAbilities`.
3. Use boss ability IDs listed in `content/tap-survivor-schema.json` unless extending `src/enemies.js` for a new ability behavior.
4. Run `npm run build:content && npm test`.

## Tune Economy Or Monetization Routes

1. Start with data and validation; do not add payment, ads, or remote config before the local economy has a passing report.
2. Use `npm run economy:check` to inspect shop item count, cost tiers, stat lanes, buyout cost, floor price scaling, purchase inflation, and coin reward scaling.
3. Keep shop costs increasing across tiers.
4. Treat repeated stat lanes as a balancing warning, not a blocker.
5. Run `npm run smoke:shop` after changing shop behavior.

## Add A Character

1. Prefer `npm run add:content -- character <id> ...`, or edit `content/registry/characters.json`.
2. Include `id`, `name`, `description`, `spriteId`, and optional `notes`.
3. Add or reuse a sprite ID under `assets.sprites`.
4. Do not add character-selection UI unless explicitly requested.
5. Run `npm run build:content && npm run validate:content`.

Shortcut:

```bash
npm run add:content -- character character_runner --name "Runner" --description "Example fast survivor." --sprite player
```

## Add Or Move Sprites And Assets

1. Put files under `assets/<source>/<pack>/`.
2. Ensure the source has a license entry in `assets.sources`.
3. Add or update logical paths in `assets.sprites`.
4. Keep cache tags in the registry paths if needed.
5. Update `assetId` or `spriteId` fields in content entries to point at logical IDs.
6. Do not hard-code asset paths in `src/game.js`, `src/combat.js`, or `src/rendering.js`.
7. Run `npm run build:content && npm run validate:content`.

## Extract Sprites From A Sheet

Use `scripts/extract-sprites.mjs` to split PNG sheets into trimmed PNG files.

Auto-detect transparent islands:

```bash
npm run sprites:extract -- assets/generated/tower/raw-sheet.png --out assets/generated/tower/sheet-next --names wizard_idle,wizard_cast,enemy_ranged
```

Use exact rectangles when auto-detect would merge touching art:

```bash
npm run sprites:extract -- assets/generated/tower/raw-sheet.png --out assets/generated/tower/sheet-next --sprite wizard_idle:0,0,96,96 --sprite wizard_cast:96,0,96,96
```

Or pass a JSON manifest:

```json
{
  "sprites": [
    { "name": "wizard_idle", "x": 0, "y": 0, "width": 96, "height": 96 }
  ]
}
```

Then run:

```bash
npm run sprites:extract -- assets/generated/tower/raw-sheet.png --out assets/generated/tower/sheet-next --manifest sprites.json
```

## Validation Checklist

- Content JSON parses.
- Domain registry assembly succeeds.
- `npm run build:content` passes.
- `npm run validate:content` passes.
- `npm run balance:check` passes after editing `content/balance/*.json`.
- `npm run content:summary`, `npm run balance:summary`, and `npm run balance:diff -- <profile>` show expected values after structural or balance work.
- `npm run verify:script-order` passes after `index.html` or `src/*.js` script dependency changes.
- `npm run audit:quests` passes if quests or unlock gates changed.
- `npm test` passes if gameplay code, combat, rendering, upgrades, or script load order changed.
- Generated `src/content.generated.js` is updated after registry edits.
- Generated `src/content.generated.js` is updated after schema edits.
- `npm run smoke:save` passes after save defaults, migrations, shop purchases, or persistence fields change.
