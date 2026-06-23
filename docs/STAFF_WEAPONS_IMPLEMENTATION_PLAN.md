# Staff Weapons Implementation Plan

## Scope

This document audits the current Tap Survivor weapon, projectile, save, and shell UI surfaces in preparation for three future equippable staff weapons:

- Lightning Staff
- Fire Staff
- Water Staff

This is a planning slice only. No weapon content, runtime behavior, UI behavior, save migrations, generated files, assets, or gameplay changes are included here.

## 1. Current weapon system map

### Where weapons are defined

- Source weapon content lives in `content/registry/weapons.json`.
- The registry currently defines weapons by ID with shared fields such as `name`,
  `description`, `upgradeId`, `cooldown`, `damage`, `kind`, and `color`.
- Kind-specific fields include `speed`, `radius`, `range`, `width`, `duration`, `tick`,
  `pierce`, and mine timing fields.
- Unlock graph data also lives in `content/registry/weapons.json` under `weaponUnlocks`.
- Weapon-linked progression lives in `content/registry/quests.json` through per-weapon mastery chains.
- Runtime registry assembly exposes `weaponDefs` and `weaponUnlocks` through `src/content-registry.js`.

### How projectile visuals are resolved

- Weapon visual metadata is content-driven through `content/registry/assets.json`.
- `assets.sprites.weapons` contains per-weapon visual definitions such as sprite sheet frame data, icon sources, effect scale, and animation metadata.
- Weapon entries can reference those visuals through `assetId` in `content/registry/weapons.json`.
- Runtime projectile bolts in `src/modules/weapon-projectiles.js` only carry gameplay-facing values such as `weaponId`, `radius`, `damage`, `life`, `pierce`, `bounces`, and `color`.
- Current projectile behavior code is therefore not self-describing enough to add unique staff visuals from content alone unless the new staffs can reuse the existing weapon effect rendering contract.

### How firing behavior is selected

- `src/weapon-fire.js` is the public integration entry point.
- `src/weapon-fire.js` dispatches by `weapon.kind` through a handler table:
  - `projectile` -> `src/modules/weapon-projectiles.js`
  - `beam`, `cone`, `chain`, `target_area`, `lingering_area`, `mine`, `radial` -> `src/weapon-behaviors.js`
- `src/modules/weapon-cooldowns.js` owns cooldown, damage, reach, width, projectile radius, and projectile-family run-upgrade scaling.
- `src/modules/weapon-targeting.js` currently provides a simple nearest-enemy selector.

### Content-driven, code-driven, or mixed?

- Weapon definitions are content-driven.
- Weapon kind selection is mixed: content chooses the `kind`, but code must already support that `kind`.
- Projectile visuals are mixed: content provides asset mappings and color metadata, while runtime code decides what data is attached to live bolts and areas.
- Firing behavior is code-driven inside existing handler families.
- Conclusion: staff weapons are not purely content-only unless each staff can be represented as an existing supported `kind` with no new targeting, projectile state, or equip flow.

## 2. Inventory / loadout / equipment support audit

### Whether a real equip/loadout system already exists

- A real inventory/loadout UI exists for relics.
- `src/shell-ui.js` has an inventory tab and delegates inventory rendering to `src/shell-relic-ui.js`.
- `src/shell-relic-ui.js` implements slot UI, equip, unequip, and capacity rules for relics.
- The audited save files support `unlockedRelics` and `equippedRelics`.
- The audited save files support `unlockedWeapons`, but they do not support persisted `equippedWeapons`.
- `src/weapon-fire.js` clearly expects runtime `game.player.equippedWeapons`, which proves equipped weapons exist during play, but that loadout state is not represented in the audited save surfaces.

### Where UI changes would need to happen

- The existing menu entry point is `src/shell-ui.js`.
- The current inventory implementation is relic-specific in `src/shell-relic-ui.js`.
- A future weapon loadout UI will likely need either:
  - a parallel weapon inventory/loadout controller beside the relic UI, or
  - an extension of the inventory tab so relic and weapon loadouts coexist cleanly.
- Because the audited inventory implementation is relic-focused, weapon equip UI does not appear to be present yet.

### Whether save data already supports equipped weapons

- `src/save-defaults.js` includes `unlockedWeapons`, but not `equippedWeapons`.
- `src/save-normalize.js` normalizes `unlockedWeapons`, but not `equippedWeapons`.
- `src/save-migrations.js` contains no weapon-loadout migration step.
- Based on the audited files, persistent weapon loadout support does not yet exist.

### Whether new save defaults or migrations are required

- If future weapon equip/loadout choices must persist between sessions, new save fields will be required.
- That would require at minimum:
  - save default support
  - save normalization support
  - a migration step for old saves
- If the team chooses a temporary non-persistent loadout for an earlier slice, save
  changes could be deferred.
- The user goal explicitly says staffs must eventually be equippable from the
  inventory/loadout UI, so save work is likely required before the feature is complete.

## 3. Staff weapons design

The MVP goal should be to keep all three staffs inside existing weapon families where possible and avoid inventing a brand new behavior kind unless audit-backed implementation later proves it is necessary.

### Lightning Staff

- Intended behavior: fast chain-oriented arc attack that hits the nearest target and jumps to nearby enemies.
- Suggested runtime family: reuse `chain`.
- Suggested visual: thin bright electric bolt or arc with yellow-blue tint, using a dedicated `assets.sprites.weapons` effect entry later.
- MVP rule: prioritize reliable nearest-target chaining over complex fork logic.

### Fire Staff

- Intended behavior: straight projectile with explosive hit splash.
- Suggested runtime family: reuse `projectile`, with later behavior support if a staff-specific effect is needed.
- Suggested visual: orange-red ember bolt or fireball with a stronger burst frame on impact.
- MVP rule: favor one primary projectile and modest area burst over persistent burn systems.

### Water Staff

- Intended behavior: slower control-focused shot with wider body and softer area control.
- Suggested runtime family: reuse `projectile` if large orb behavior is enough, or `lingering_area` if later inspection proves a puddle-style hit is better.
- Suggested visual: blue-teal orb or wave shot with watery trail frames.
- MVP rule: keep it to one readable control identity, either large slow projectile or short puddle, not both in the first implementation.

## 4. Implementation risk assessment

### Content-only parts

- Adding weapon definitions, unlock nodes, mastery quests, and future asset registry entries is content-side work.
- Reusing existing supported `kind` values reduces risk significantly.
- `content/registry/weapons.json`, `content/registry/quests.json`, and `content/registry/assets.json` are the natural future content entry points.

### Runtime-code parts

- Any staff behavior that cannot map cleanly onto `projectile`, `chain`, `beam`, `cone`, `radial`, `target_area`, `lingering_area`, or `mine` requires runtime changes.
- Even when reusing `projectile`, unique on-hit or per-weapon special handling may
  require code changes.
- Current projectile behavior is largely family-based, not weapon-ID-specific beyond
  inherited stats and generic projectile upgrades.
- Visual differentiation may also need runtime rendering support if existing weapon effect rendering cannot express the desired staff look with the current asset contract alone.

### UI / loadout parts

- Weapon equip/loadout UI is the largest missing product surface visible in the audited files.
- The inventory tab is already wired, but its implementation is relic-specific.
- This creates moderate-to-high risk for a combined weapon+UI slice if not separated.

### Save / migration risks

- Persistent equipped weapon support is not visible in the audited save surfaces.
- Adding it later will require schema, normalization, and migration work.
- This is a compatibility-sensitive area and should be isolated into its own slice.

### Generated-file risks

- `src/content.generated.js` must not be hand-edited.
- `src/save.js`, `src/save-defaults.js`, `src/save-migrations.js`, `src/save-normalize.js`, and `src/weapon-projectiles.js` are generated bridge files in the audited surfaces and must not be edited directly.
- Future runtime work must go through the owning `src/modules/` source or the non-generated source file listed by repo docs, followed by the existing build flow where required.

## 5. Proposed safe slice sequence

### Slice 2: Audit-backed content and schema proof for one staff

- Goal: add the minimum content-side shape for one staff only if it can reuse an existing weapon `kind` without runtime changes.
- Recommended candidate: Lightning Staff as `chain`, because `chain` already exists and has a clean nearest-target identity.
- Files likely involved later:
  - `content/registry/weapons.json`
  - `content/registry/quests.json`
  - `content/registry/assets.json`
- Stop condition:
  - one staff exists as content only, or
  - inspection during implementation proves a runtime behavior slice must come first.

### Slice 3: Lightning Staff projectile / behavior support

- Goal: implement any runtime behavior or effect support required specifically for Lightning Staff after the content-only attempt proves what is missing.
- Preferred outcome: keep Lightning Staff inside existing `chain` behavior and only extend visuals if needed.
- Files likely involved later:
  - `src/weapon-behaviors.js`
  - possibly `src/weapon-fire.js`
  - possibly `src/modules/weapon-targeting.js`
- Stop condition:
  - Lightning Staff behavior and visuals are validated without touching save or UI.

### Slice 4: Fire Staff and Water Staff runtime/content follow-through

- Goal: add the remaining two staffs using the smallest number of behavior extensions after Lightning Staff establishes the pattern.
- Preferred order:
  - Fire Staff first if it fits cleanly into existing projectile plus impact visuals.
  - Water Staff second because it is the most likely to need control-style behavior tradeoffs.
- Files likely involved later:
  - `content/registry/weapons.json`
  - `content/registry/assets.json`
  - `content/registry/quests.json`
  - `src/modules/weapon-projectiles.js` if per-weapon projectile handling is needed
  - `src/weapon-behaviors.js` if Water Staff needs area control behavior

### Slice 5: Weapon equip / loadout UI and save integration

- Goal: make weapon choice persistent and player-facing through the inventory/loadout surfaces.
- Files likely involved later:
  - `src/shell-ui.js`
  - likely a new or extended inventory UI controller near `src/shell-relic-ui.js`
  - owning save source modules corresponding to current generated save bridges
- This slice should remain separate because it mixes UI, save compatibility, and product flow risk.

### Slice 6: Balancing, quests, validation, and polish

- Goal: tune cooldowns, damage, quest pacing, unlock placement, and visual consistency after mechanics and loadout are stable.
- Files likely involved later:
  - `content/registry/weapons.json`
  - `content/registry/quests.json`
  - `content/registry/run-upgrades.json` only if family interactions need adjustment
  - `content/registry/shop-items.json` only if later balance work explicitly needs staff-related meta support

## 6. Validation matrix

Use existing repo scripts only.

### Slice 2

- `npm run build:content`
- `npm run validate:content`
- `npm run content:summary`
- `npm run agent:check`
- `git diff --check`

### Slice 3

- `npm run agent:check`
- `npm run smoke:start-run`
- `npm run smoke:projectile-colors`
- `npm run test:speed`
- `git diff --check`

### Slice 4

- `npm run build:content`
- `npm run validate:content`
- `npm run agent:check`
- `npm run smoke:start-run`
- `npm run smoke:projectile-colors`
- `npm run test`
- `git diff --check`

### Slice 5

- `npm run agent:check`
- `npm run smoke:save`
- `npm run smoke:start-run`
- `npm run verify:ui`
- `npm run test`
- `git diff --check`

### Slice 6

- `npm run build:content`
- `npm run validate:content`
- `npm run audit:quests`
- `npm run content:summary`
- `npm run balance:check`
- `npm run agent:check`
- `npm run test`
- `git diff --check`

## 7. Hard boundaries

- Do not hand-edit generated files.
- Content source of truth is `content/registry/*.json`.
- `src/content.generated.js` is generated output, not an edit target.
- Runtime bridge/generated files must follow existing bridge rules and be changed only through their owning source files.
- Save bridge/generated files must not be hand-edited.
- One feature slice at a time.
- Keep weapon content slices separate from persistent loadout/save compatibility unless the implementation slice explicitly requires both.

## Audit conclusion

- Existing weapon authoring is registry-driven, but runtime behavior is mixed content-plus-code.
- Unique staff visuals can likely start from the existing weapon asset registry pattern, but the audited runtime suggests visuals and per-weapon behavior may still need code support.
- The clearest missing feature for the final goal is persistent weapon equip/loadout support.
- Because relic loadout exists and weapon loadout persistence does not, staff weapons should not be treated as a content-only task end to end.
