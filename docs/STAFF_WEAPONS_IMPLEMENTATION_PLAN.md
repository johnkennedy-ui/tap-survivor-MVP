# Staff Weapons Implementation Plan

## Scope

This document audits the current Tap Survivor weapon, projectile, inventory/loadout, save,
UI, and content systems in preparation for three future equippable staff weapons:

- Lightning Staff
- Fire Staff
- Water Staff

This is an audit/design slice only. It intentionally adds no weapon content, runtime
behavior, UI behavior, save migrations, generated files, assets, or gameplay changes.

## 1. Current Weapon System Map

### Weapon Definitions

- Source weapon content lives in `content/registry/weapons.json`.
- Weapon entries are keyed by weapon ID and include shared fields such as `name`,
  `description`, `upgradeId`, `cooldown`, `damage`, `kind`, `color`, and optional
  `assetId`.
- Kind-specific fields are already present in content:
  - projectile-style fields: `speed`, `radius`, `pierce`
  - beam/cone/area fields: `range`, `width`, `duration`, `tick`
  - chain fields: `jumps`, `range`
  - mine fields: `armDelay`, `explosionLife`, `spawnOffset`
- Weapon unlock graph data lives in `weaponUnlocks` inside
  `content/registry/weapons.json`.
- Weapon-linked quest content lives in `content/registry/quests.json`; existing weapon
  mastery quests use `weaponId`.
- `src/content-registry.js` exposes generated content to runtime as `weaponDefs` and
  `weaponUnlocks`.

### Projectile And Effect Visual Resolution

- Weapon asset metadata is content-driven through `content/registry/assets.json`.
- Weapon entries can point at `assets.sprites.weapons` through `assetId`; otherwise
  runtime consumers can fall back to the weapon ID.
- The projectile runtime in `src/modules/weapon-projectiles.js` creates bolt state with
  gameplay values such as `weaponId`, position, velocity, `radius`, `damage`, `life`,
  `pierce`, bounce/split state, hit tracking, and `color`.
- The firing bridge in `src/weapon-fire.js` creates generic weapon burst state with
  `weaponId`, radius, color, and lifetime.
- Non-projectile behavior in `src/weapon-behaviors.js` creates beam and area state with
  `weaponId`, coordinates, width/radius, color, and lifetime.
- Current projectile/effect visuals are therefore mixed: content supplies sprite/color
  metadata, while runtime code decides which live effect shape exists and which
  `weaponId` is attached to it.

### Firing Behavior Selection

- `src/weapon-fire.js` is the public weapon-fire integration entry point.
- It dispatches by `weapon.kind` through a fixed handler table:
  - `projectile` -> `src/modules/weapon-projectiles.js`
  - `beam` -> `src/weapon-behaviors.js`
  - `cone` -> `src/weapon-behaviors.js`
  - `chain` -> `src/weapon-behaviors.js`
  - `target_area` -> `src/weapon-behaviors.js`
  - `lingering_area` -> `src/weapon-behaviors.js`
  - `mine` -> `src/weapon-behaviors.js`
  - `radial` -> `src/weapon-behaviors.js`
- `src/modules/weapon-cooldowns.js` owns cooldown, damage, reach, width, projectile
  radius, SFX timing, and projectile-family run-upgrade scaling.
- `src/modules/weapon-targeting.js` currently exposes nearest-enemy targeting.

### Content-Driven, Code-Driven, Or Mixed?

- Weapon authoring is content-driven.
- Supported weapon kinds are code-backed; content can select an existing `kind`, but
  unsupported behavior requires runtime code.
- Projectile-family stat scaling is mixed: content declares a projectile weapon, while
  code applies projectile run-upgrade modifiers.
- Unique behavior is code-driven unless it fits an existing behavior family.
- Unique visuals are mixed: adding asset metadata may be content-only, but new live
  visual shapes, impact timing, or per-weapon effect rules require runtime work.
- Conclusion: the staff weapons are not safely content-only end to end.

## 2. Inventory / Loadout / Equipment Support Audit

### Existing Equip/Loadout Support

- A real inventory tab exists in `src/shell-ui.js`.
- The current inventory implementation delegates to `src/shell-relic-ui.js`.
- `src/shell-relic-ui.js` implements relic slots, relic inventory, equip, unequip, and
  capacity rules.
- The audited save surfaces include `unlockedRelics` and `equippedRelics`.
- The audited save surfaces include `unlockedWeapons`, but no persisted
  `equippedWeapons`.
- `src/weapon-fire.js` expects `game.player.equippedWeapons` during a run, so run-time
  weapon equipment exists, but the audited UI/save files do not show a persistent weapon
  loadout system.

### UI Change Locations

- `src/shell-ui.js` owns the run menu tab switching and inventory entry point.
- `src/shell-relic-ui.js` is relic-specific, not a generic equipment controller.
- A future weapon loadout UI should either:
  - add a parallel weapon inventory/loadout controller and have `src/shell-ui.js` render
    both relics and weapons in the inventory tab, or
  - deliberately split the inventory UI into separate relic and weapon sections.
- Weapon equip UI should be isolated from staff weapon content/behavior slices because it
  changes product flow and persistence assumptions.

### Save Support For Equipped Weapons

- `src/modules/save-defaults.js` defines `unlockedWeapons: ["spark_bolt"]`, but no
  `equippedWeapons`.
- `src/modules/save-normalize.js` normalizes `unlockedWeapons`, but no equipped weapon
  loadout field.
- `src/modules/save-migrations.js` has save versions up to `CURRENT_SAVE_VERSION = 3`
  and no weapon-loadout migration step.
- `src/save.js`, `src/save-defaults.js`, `src/save-migrations.js`, and
  `src/save-normalize.js` are generated bridges; their owning source is under
  `src/modules/`.

### Save Defaults / Migrations Needed?

- If the final staff feature requires persistent pre-run loadout choices, save defaults,
  normalization, and a migration are required.
- If an interim staff content slice only adds unlockable weapons that can be equipped
  during a run through existing run-level mechanics, save work can be deferred.
- The stated final requirement is inventory/loadout equip support, so save integration
  should be planned as its own compatibility-sensitive slice.

## 3. Staff Weapons Design

The MVP design should reuse existing behavior families first and only add runtime
behavior when audit evidence proves the existing families cannot express the staff.

### Lightning Staff

- Intended behavior: fast chain lightning that starts at the nearest enemy and jumps to
  nearby targets.
- MVP family: `chain`.
- Projectile/effect visual: thin yellow-blue electric arc, using a dedicated future
  `assets.sprites.weapons.lightning_staff` entry if rendering supports it cleanly.
- MVP constraint: no branching fork logic in the first implementation; keep it readable
  as a short sequence of jumps.

### Fire Staff

- Intended behavior: direct fireball projectile with a small impact burst.
- MVP family: `projectile`.
- Projectile/effect visual: orange-red ember or fireball bolt, with a compact burst on
  hit if the existing projectile/explosion flow can support it.
- MVP constraint: no damage-over-time burn system in the first implementation. Reuse
  projectile hit/explosive behavior where possible.

### Water Staff

- Intended behavior: slower control-flavored staff attack with a larger, more readable
  hit shape.
- MVP family: start with `projectile` as a slow blue orb; consider `lingering_area` only
  if the future slice explicitly chooses a puddle-style identity.
- Projectile/effect visual: blue-teal orb or wave with a soft splash/flow effect.
- MVP constraint: choose one identity for the first version, either large slow orb or
  short puddle, not both.

## 4. Implementation Risk Assessment

### Content-Only Parts

- Weapon definitions, unlock nodes, mastery quests, and weapon asset registry entries
  are content-side work.
- Content sources are `content/registry/weapons.json`, `content/registry/quests.json`,
  and `content/registry/assets.json`.
- `scripts/content/content-validation.mjs` validates weapon kind support, unlock
  references, quest references, and `assetId` references.
- Content-only work is safest when a staff uses an existing `kind` and existing visual
  rendering paths.

### Runtime-Code Parts

- New weapon kinds require `src/weapon-fire.js` dispatch support plus runtime behavior.
- Weapon-specific projectile impact behavior likely belongs in
  `src/modules/weapon-projectiles.js`.
- New chain/beam/area behavior likely belongs in `src/weapon-behaviors.js`.
- New targeting rules likely belong in `src/modules/weapon-targeting.js`.
- Generated bridges such as `src/weapon-projectiles.js` and `src/weapon-targeting.js`
  must be regenerated through the existing bridge flow, not edited directly.

### UI / Loadout Parts

- Weapon loadout UI is the largest missing surface in the audited UI files.
- Existing inventory UI is relic-specific, so staff equip/loadout should not be bundled
  with the first content or behavior slice.
- Future UI work should be validated with existing UI and save smoke scripts.

### Save / Migration Risks

- Persistent weapon loadouts need a new save field and backward-compatible migration.
- The owning save files live under `src/modules/`; the root `src/save*.js` files are
  generated bridges.
- Save work must preserve existing `unlockedWeapons`, relic equip, quest, shop, and
  migration behavior.

### Generated-File Risks

- `src/content.generated.js` is generated and must not be hand-edited.
- `www/` is generated output and must not be edited.
- Generated runtime bridges must follow the repo's module bridge rules.
- Content changes must start from `content/registry/*.json`.

## 5. Proposed Safe Slice Sequence

### Slice 2: One-Staff Content And Schema Proof

- Goal: add one staff as content only if it fits an existing supported `kind`.
- Recommended candidate: Lightning Staff as `chain`, because the current `chain`
  behavior already matches the simplest staff identity.
- Future files likely involved:
  - `content/registry/weapons.json`
  - `content/registry/quests.json`
  - `content/registry/assets.json`
- Stop condition: one staff validates as content-only, or the slice proves runtime visual
  or behavior support must come first.

### Slice 3: Lightning Staff Behavior / Visual Support

- Goal: make Lightning Staff read clearly in runtime without adding unrelated staff
  content.
- Preferred outcome: keep behavior on `chain` and only add the smallest visual support
  needed.
- Future files likely involved:
  - `src/weapon-behaviors.js`
  - `src/weapon-fire.js` only if dispatch or attack animation needs adjustment
  - `src/modules/weapon-targeting.js` only if chain targeting needs a supported helper
  - generated bridge rebuild only if a module file changes
- Stop condition: Lightning Staff behavior and visuals validate without UI or save work.

### Slice 4: Fire Staff And Water Staff Content / Behavior

- Goal: add Fire Staff and Water Staff after Lightning establishes the pattern.
- Fire Staff should try `projectile` first and keep the impact burst simple.
- Water Staff should try a slow `projectile` first; defer puddle/area behavior unless
  specifically needed.
- Future files likely involved:
  - `content/registry/weapons.json`
  - `content/registry/quests.json`
  - `content/registry/assets.json`
  - `src/modules/weapon-projectiles.js` if per-weapon projectile impact support is
    required
  - `src/weapon-behaviors.js` only if Water Staff becomes area-based

### Slice 5: Weapon Equip / Loadout UI And Save Integration

- Goal: make weapon choice persistent and player-facing through the inventory/loadout UI.
- Keep this separate because it mixes UI, save compatibility, and product flow.
- Future files likely involved:
  - `src/shell-ui.js`
  - a new or extended inventory/loadout controller near `src/shell-relic-ui.js`
  - `src/modules/save-defaults.js`
  - `src/modules/save-normalize.js`
  - `src/modules/save-migrations.js`
  - generated save bridge rebuild
- Stop condition: saved weapon loadout persists, normalizes safely, and does not break
  existing relic inventory behavior.

### Slice 6: Balancing, Quests, Validation, And Polish

- Goal: tune cooldowns, damage, unlock placement, mastery quest pacing, run-upgrade
  interactions, and visual consistency after mechanics and loadout are stable.
- Future files likely involved:
  - `content/registry/weapons.json`
  - `content/registry/quests.json`
  - `content/registry/run-upgrades.json` only if projectile-family interactions need
    explicit adjustment
  - `content/registry/shop-items.json` only if later balance work explicitly adds
    staff-related meta support

## 6. Validation Matrix

Use existing repo scripts only.

### Slice 2

- `npm run build:content`
- `npm run validate:content`
- `npm run content:summary`
- `npm run agent:check`
- `git diff --check`

## Slice 2 Result

- Added `lightning_staff` as a content-only proof using existing `chain` behavior.
- Reused the existing Chain Spark weapon visual family through `assetId: "chain_spark"`;
  no new art assets or renderer code were added.
- Added `unlock_lightning_staff` and a three-step Lightning Staff mastery quest chain so
  content validation has complete unlock and quest references.
- Unique Lightning Staff visual identity remains blocked on a later runtime/asset slice;
  this proof intentionally shares the existing chain effect.
- Persistent inventory/loadout equip support remains blocked on the separate UI/save
  slice from the plan.

### Slice 3

- `npm run build:bridges` if any `src/modules/` file changes
- `npm run agent:check`
- `npm run smoke:start-run`
- `npm run smoke:projectile-colors`
- `npm run test:speed`
- `git diff --check`

### Slice 4

- `npm run build:content`
- `npm run build:bridges` if any `src/modules/` file changes
- `npm run validate:content`
- `npm run agent:check`
- `npm run smoke:start-run`
- `npm run smoke:projectile-colors`
- `npm test`
- `git diff --check`

### Slice 5

- `npm run build:bridges`
- `npm run agent:check`
- `npm run smoke:save`
- `npm run smoke:start-run`
- `npm run verify:ui`
- `npm test`
- `git diff --check`

## Starting Weapon Loadout Result

- Added a minimal optional `selectedStartingWeapon` save value that defaults to
  `spark_bolt` and normalizes back to `spark_bolt` when the selected weapon is locked or
  unknown.
- Run state now starts with the selected unlocked weapon, allowing `lightning_staff` to
  be the first weapon in a run without adding new weapon behavior.
- The shell inventory now exposes a small MVP starting-weapon selector for unlocked
  weapons only; relic loadout behavior is unchanged.
- No save version bump or explicit migration was required because the default/normalize
  path preserves old saves.

### Slice 6

- `npm run build:content`
- `npm run validate:content`
- `npm run audit:quests`
- `npm run content:summary`
- `npm run balance:check`
- `npm run agent:check`
- `npm test`
- `git diff --check`

## 7. Hard Boundaries

- Do not hand-edit generated files.
- Do not hand-edit `src/content.generated.js`.
- Do not edit `www/`.
- Content source of truth is `content/registry/*.json`.
- Runtime bridge/generated files must follow existing bridge rules and be changed only
  through their owning source files.
- Save bridge/generated files must not be hand-edited.
- One feature slice at a time.
- Keep weapon content, runtime behavior, UI/loadout, and save compatibility in separate
  validated slices unless a future task explicitly broadens scope.

## Audit Conclusion

- Existing weapon authoring is registry-driven, but runtime behavior is mixed
  content-plus-code.
- Lightning Staff has the cleanest MVP path through existing `chain` behavior.
- Fire Staff and Water Staff can start as projectile-family designs, but unique impact
  and control identity may require runtime support.
- A persistent weapon equip/loadout UI does not appear to exist in the audited UI/save
  surfaces.
- Staff weapons should be treated as a multi-slice content, runtime, UI, and save
  feature, not a single content-only change.
