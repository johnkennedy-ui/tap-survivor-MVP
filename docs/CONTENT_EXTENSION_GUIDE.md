# Content Extension Guide

## Naming Conventions

- Use lowercase snake_case for content IDs: `spark_bolt`, `unlock_spark_bolt`, `spark_bolt_mastery`.
- Use stable logical IDs in code and content, not raw asset paths.
- Weapon unlock IDs should be `unlock_<weapon_id>`.
- Weapon upgrade IDs should usually be `<weapon_id>_damage`.
- Sprite IDs should match content IDs where possible.

## Folder Conventions

- Source content registry: `content/tap-survivor-content.json`.
- Generated content: `src/content.generated.js`.
- Sprites and licenses: `assets/<source>/<pack>/`.
- Agent docs: `docs/`.

## Add A Weapon

1. Add the weapon under `weapons` in `content/tap-survivor-content.json`.
2. Give it `name`, `description`, `upgradeId`, `cooldown`, `damage`, `kind`, `color`, and kind-specific fields.
3. Add a matching `weaponUnlocks` entry with `id`, `weaponId`, `cost`, `branch`, and any gates.
4. Add mastery or unlock quests under `quests` if the weapon should gate progression.
5. Add the quest ID to the right `questGroups` list if it tracks kills, damage, survival, XP, levels, or boss kills.
6. If it has a sprite, add the sprite path under `assets.sprites.weapons`.
7. Run `npm run build:content && npm run validate:content`.
8. Run `npm test` if combat behavior, unlock flow, or generated tests are affected.

Shortcut:

```bash
node scripts/add-content.mjs weapon frost_example --name "Frost Example" --description "Example projectile." --kind projectile --damage 10 --cooldown 1 --color "#8de7ff" --unlock-cost 1 --branch Control
```

## Add A Skill Or Upgrade

1. Check whether the change is a meta upgrade or an in-run upgrade.
2. For meta upgrades, add to `metaUpgrades` in `content/tap-survivor-content.json`.
3. For weapon damage upgrades, set or update the weapon `upgradeId`; `src/upgrades.js` generates the upgrade.
4. For in-run upgrades, add to `runUpgrades` in `content/tap-survivor-content.json`.
5. Use stable IDs and avoid duplicating an existing stat modifier.
6. Run `npm run build:content && npm run validate:content`.
7. Run `npm test` if the upgrade can affect gameplay.

## Add An Item

1. Add the item to `shopItems` in `content/tap-survivor-content.json`.
2. Include `id`, `name`, `description`, `kind`, `cost`, `maxTier`, and optional `effect`.
3. `stat_upgrade` items with `speed`, `pickupRadius`, or `maxHp` effects are applied by `src/shop.js` at run start.
4. Run `npm run build:content && npm run validate:content`.

Shortcut:

```bash
node scripts/add-content.mjs shop-item coin_pack_small --name "Small Coin Pack" --description "Example shop item." --kind currency --cost 100 --effect coins --value 25
```

## Add A Level

1. Add the level to `levels` in `content/tap-survivor-content.json`.
2. Include `id`, `name`, `startsAt`, optional `enemyIds`, and `notes`.
3. Keep timing in seconds.
4. Run `npm run build:content && npm run validate:content`.

Shortcut:

```bash
node scripts/add-content.mjs level desert_overtime --name "Desert Overtime" --starts-at 420 --enemies drifter,skitter,bulwark
```

## Add A Character

1. Add the character to `characters` in `content/tap-survivor-content.json`.
2. Include `id`, `name`, `description`, `spriteId`, and optional `notes`.
3. Add or reuse a sprite ID under `assets.sprites`.
4. Do not add character-selection UI unless explicitly requested.
5. Run `npm run build:content && npm run validate:content`.

Shortcut:

```bash
node scripts/add-content.mjs character character_runner --name "Runner" --description "Example fast survivor." --sprite player
```

## Add Or Move Sprites And Assets

1. Put files under `assets/<source>/<pack>/`.
2. Ensure the source has a license entry in `assets.sources`.
3. Add or update logical paths in `assets.sprites`.
4. Keep cache tags in the registry paths if needed.
5. Update `assetId` or `spriteId` fields in content entries to point at logical IDs.
6. Do not hard-code asset paths in `src/game.js`, `src/combat.js`, or `src/rendering.js`.
7. Run `npm run build:content && npm run validate:content`.

## Validation Checklist

- Content JSON parses.
- `npm run build:content` passes.
- `npm run validate:content` passes.
- `npm run audit:quests` passes if quests or unlock gates changed.
- `npm test` passes if gameplay code, combat, rendering, upgrades, or script load order changed.
- Generated `src/content.generated.js` is updated after registry edits.
