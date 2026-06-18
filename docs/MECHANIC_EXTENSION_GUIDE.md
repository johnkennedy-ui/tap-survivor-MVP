# Mechanic Extension Guide

Use this guide when adding exactly one Tap Survivor weapon behaviour or mechanic. Choose one recipe, inspect only the files named by that recipe, run the listed validation, and stop at the selected recipe stop condition.

## Hard boundaries

- Docs-only tasks must not edit source, content, Android, workflow, package, generated, or `www/` files.
- Runtime tasks must keep `src/weapon-fire.js` as the public combat integration entry point unless inspection proves the requested change belongs there.
- Do not hand-edit `src/content.generated.js`; use the content build path when content changes.
- Do not change save schema unless the user explicitly asks for save migration.
- Do not combine recipes unless the user explicitly asks for a multi-recipe task.
- If a detail is not visible from the inspected files, write "inspect current implementation first" instead of guessing.

## File ownership map

- `src/weapon-fire.js`: combat integration and weapon dispatch.
- `src/weapon-projectiles.js`: projectile firing, projectile effects, bounces, split-on-hit, and explosions.
- `src/weapon-behaviors.js`: beam, line, radial, cone, area, lingering, mine, trap, zone, chain, and burst updates.
- `src/weapon-cooldowns.js`: cooldown, stat scaling, damage, reach, width, and projectile-size scaling.
- `src/weapon-targeting.js`: enemy target selection and target filtering.
- `content/tap-survivor-content.json`: weapon, quest, unlock, upgrade, asset, audio, enemy, boss, and content-side values.
- `index.html`: script order only when a new helper must load before its caller.
- `docs/CURRENT_TASK.md`: repo-local task checkpoint when the agent tooling requires it.

## Add a content-only weapon using an existing behaviour

### When to use

Use when the requested weapon can reuse an existing content behaviour, stat model, asset mapping, and unlock pattern.

### Files to inspect

- `content/tap-survivor-content.json`
- `docs/CURRENT_TASK.md` only if the agent task checkpoint is active

### Files usually changed

- `content/tap-survivor-content.json`
- Generated content through `npm run build:content`, never by hand
- `docs/CURRENT_TASK.md` only if the task checkpoint needs updating

### Files not to touch

- `src/**/*.js`
- `src/content.generated.js` by hand
- `www/`
- Android files
- Workflow and package files

### Implementation outline

1. Inspect current weapon entries first.
2. Reuse an existing weapon kind, stat shape, unlock style, and asset convention.
3. Add exactly one weapon and any required content-side unlock.
4. Rebuild generated content with the existing content build command.
5. Stop if the weapon needs new runtime behaviour.

### Validation

- `npm run build:content`
- `npm run validate:content`
- `npm run smoke:start-run`
- `npm run agent:check`
- `git diff --check`

### Stop condition

Stop after one content-only weapon is validated, or report that a runtime behaviour recipe is required.

## Add a new projectile-style weapon behaviour

### When to use

Use when the requested weapon fires, spawns, updates, or resolves projectile-like objects and cannot be represented by content alone.

### Files to inspect

- `src/weapon-projectiles.js`
- `src/weapon-fire.js` only to confirm dispatch and integration
- `src/weapon-cooldowns.js` only if scaling or cooldown values are part of the request
- Existing focused smoke or test scripts if validation coverage is unclear

### Files usually changed

- `src/weapon-projectiles.js`
- `src/weapon-fire.js` only when dispatch must call the new behaviour
- `src/weapon-cooldowns.js` only for requested scaling
- A focused validation script only if existing checks cannot prove the behaviour
- `docs/CURRENT_TASK.md` only if the task checkpoint needs updating

### Files not to touch

- Unrelated `src/**/*.js`
- `content/tap-survivor-content.json` unless a small content flag or value is required
- `src/content.generated.js` by hand
- `www/`
- Android files

### Implementation outline

1. Inspect current projectile helpers first.
2. Add the smallest projectile branch or helper in the existing owner file.
3. Preserve existing globals and script-order compatibility.
4. Keep any content coupling minimal and explicit.
5. Stop if the request expands into multiple projectile mechanics.

### Validation

- `node --check` on touched JavaScript files
- `npm run smoke:start-run`
- `npm test`
- `npm run agent:check`
- `git diff --check`

### Stop condition

Stop after one projectile-style behaviour is validated, or report any need for save migration, Android-specific work, or multiple mechanics.

## Add a beam or line weapon behaviour

### When to use

Use when the requested weapon applies damage or effects along a beam, ray, laser, slash line, or other linear path.

### Files to inspect

- `src/weapon-behaviors.js`
- `src/weapon-fire.js` only to confirm dispatch and timing
- `src/weapon-cooldowns.js` only if width, reach, cooldown, or damage scaling is requested
- `src/weapon-targeting.js` only if target selection changes

### Files usually changed

- `src/weapon-behaviors.js`
- `src/weapon-cooldowns.js` only for requested scaling
- `src/weapon-fire.js` only when dispatch must call the new behaviour
- `docs/CURRENT_TASK.md` only if the task checkpoint needs updating

### Files not to touch

- Projectile helper files unless inspection proves the current beam path uses them
- Unrelated combat, rendering, save, shop, or quest files
- `src/content.generated.js` by hand
- `www/`
- Android files

### Implementation outline

1. Inspect current beam or line implementation first.
2. Reuse the existing timing, hit detection, and visual-effect pattern where possible.
3. Add one narrow behaviour branch.
4. Keep rendering data compatible with the current runtime shape.
5. Mark unknown beam internals as inspect current implementation first.

### Validation

- `node --check` on touched JavaScript files
- `npm run smoke:start-run`
- `npm test`
- `npm run agent:check`
- `git diff --check`

### Stop condition

Stop after one beam or line behaviour is validated, or report if the request requires renderer changes or multiple behaviours.

## Add a radial, cone, or area weapon behaviour

### When to use

Use when the requested weapon affects enemies around the player, inside a cone, or inside a target area.

### Files to inspect

- `src/weapon-behaviors.js`
- `src/weapon-cooldowns.js` only if radius, width, reach, damage, or cooldown scaling is requested
- `src/weapon-targeting.js` only if target filtering changes
- `src/weapon-fire.js` only to confirm integration

### Files usually changed

- `src/weapon-behaviors.js`
- `src/weapon-cooldowns.js` only for requested scaling
- `src/weapon-fire.js` only when dispatch must change
- `docs/CURRENT_TASK.md` only if the task checkpoint needs updating

### Files not to touch

- Unrelated projectile, quest, save, shop, Android, or generated files
- `content/tap-survivor-content.json` unless one small content value is required
- `src/content.generated.js` by hand
- `www/`

### Implementation outline

1. Inspect current radial, cone, and area effects first.
2. Reuse current distance, angle, collision, and effect lifetime patterns.
3. Add exactly one effect shape or one variant of an existing shape.
4. Keep damage and cooldown changes in the scaling owner file if needed.
5. Stop if the mechanic also needs persistent zones or mines.

### Validation

- `node --check` on touched JavaScript files
- `npm run smoke:start-run`
- `npm test`
- `npm run agent:check`
- `git diff --check`

### Stop condition

Stop after one radial, cone, or area behaviour is validated, or report if the request crosses into another recipe.

## Add a mine, trap, or zone weapon behaviour

### When to use

Use when the requested mechanic places a delayed, persistent, triggered, or lingering effect in the playfield.

### Files to inspect

- `src/weapon-behaviors.js`
- `src/weapon-projectiles.js` only if the current implementation stores placed effects with projectile-like objects
- `src/weapon-cooldowns.js` only for requested timing, duration, or damage scaling
- `src/weapon-fire.js` only to confirm dispatch

### Files usually changed

- `src/weapon-behaviors.js`
- `src/weapon-projectiles.js` only if inspection shows placed effects live there
- `src/weapon-cooldowns.js` only for requested scaling
- `docs/CURRENT_TASK.md` only if the task checkpoint needs updating

### Files not to touch

- Save schema unless explicitly requested
- Unrelated enemy, quest, shop, Android, generated, or workflow files
- `src/content.generated.js` by hand
- `www/`

### Implementation outline

1. Inspect current mine, trap, lingering-area, or zone patterns first.
2. Reuse existing lifetime, trigger, collision, and cleanup logic.
3. Add one placed-effect behaviour.
4. Keep duration and damage scaling in the current scaling pattern.
5. Stop if persistence across runs or saves is requested.

### Validation

- `node --check` on touched JavaScript files
- `npm run smoke:start-run`
- `npm test`
- `npm run agent:check`
- `git diff --check`

### Stop condition

Stop after one mine, trap, or zone behaviour is validated, or report if save persistence or multiple placed effects are needed.

## Add a chain, ricochet, or split-shot behaviour

### When to use

Use when a weapon hit or projectile should jump, bounce, fork, split, or create secondary targets.

### Files to inspect

- `src/weapon-projectiles.js`
- `src/weapon-behaviors.js` only if current chain-like behaviour lives outside projectile helpers
- `src/weapon-targeting.js` only for target selection rules
- `src/weapon-cooldowns.js` only for requested scaling

### Files usually changed

- `src/weapon-projectiles.js`
- `src/weapon-targeting.js` only if target rules must change
- `src/weapon-cooldowns.js` only for requested scaling
- `docs/CURRENT_TASK.md` only if the task checkpoint needs updating

### Files not to touch

- Unrelated combat, quest, save, Android, generated, or content files
- `src/content.generated.js` by hand
- `www/`
- Workflow and package files

### Implementation outline

1. Inspect current bounce, split, and chain handling first.
2. Reuse current target exclusion and secondary-hit patterns.
3. Add one bounded chain, ricochet, or split-shot rule.
4. Keep loop limits explicit to avoid runaway behaviour.
5. Stop if the mechanic needs broad target-system changes.

### Validation

- `node --check` on touched JavaScript files
- `npm run smoke:start-run`
- `npm test`
- `npm run agent:check`
- `git diff --check`

### Stop condition

Stop after one chain, ricochet, or split-shot behaviour is validated, or report if target selection must be redesigned.

## Add a new run upgrade effect

### When to use

Use when the requested mechanic changes run-time upgrade choices, upgrade effects, or per-run stat behaviour.

### Files to inspect

- `content/tap-survivor-content.json`
- Runtime upgrade owner files from current implementation; inspect current implementation first
- `src/weapon-cooldowns.js` only if weapon stat scaling is affected
- Existing run-upgrade validation scripts if present

### Files usually changed

- `content/tap-survivor-content.json` when the upgrade is content-driven
- The directly affected runtime owner file after inspection
- Generated content through `npm run build:content`, never by hand
- `docs/CURRENT_TASK.md` only if the task checkpoint needs updating

### Files not to touch

- Unrelated weapon behaviour files
- Save schema unless explicitly requested
- `src/content.generated.js` by hand
- `www/`
- Android files

### Implementation outline

1. Inspect current run upgrade content and runtime effect handling first.
2. Add one upgrade effect or one content entry, not both unless required.
3. Keep upgrade IDs, tiers, and display text aligned with existing patterns.
4. Rebuild content when content changes.
5. Stop if the effect needs save migration or progression redesign.

### Validation

- `npm run build:content` if content changed
- `npm run validate:content` if content changed
- `node --check` on touched JavaScript files
- `npm test`
- `npm run agent:check`
- `git diff --check`

### Stop condition

Stop after one run upgrade effect is validated, or report if save migration or broader progression work is needed.

## Add a boss ability or enemy attack pattern

### When to use

Use when the requested mechanic changes boss behaviour, enemy attacks, projectiles, waves, or combat pressure.

### Files to inspect

- `content/tap-survivor-content.json`
- Current enemy and combat owner files; inspect current implementation first
- Existing smoke or verification scripts that cover boss or enemy combat
- `docs/CURRENT_TASK.md` only if the task checkpoint is active

### Files usually changed

- `content/tap-survivor-content.json` for content-driven tuning
- The directly affected enemy or combat owner file after inspection
- A focused validation script only if existing checks cannot prove the pattern
- `docs/CURRENT_TASK.md` only if the task checkpoint needs updating

### Files not to touch

- Unrelated weapon, quest, save, shop, Android, workflow, or package files
- `src/content.generated.js` by hand
- `www/`
- Generated build output

### Implementation outline

1. Inspect current boss and enemy attack handling first.
2. Prefer content tuning when the pattern already exists.
3. Add one attack pattern or one boss ability.
4. Keep projectile visibility, pacing, and existing combat loop compatibility.
5. Stop if the request requires a new enemy architecture.

### Validation

- `npm run build:content` if content changed
- `npm run validate:content` if content changed
- `node --check` on touched JavaScript files
- `npm test`
- `npm run agent:check`
- `git diff --check`

### Stop condition

Stop after one boss ability or enemy attack pattern is validated, or report if the change needs broader combat architecture work.

## Add a weapon-linked quest or unlock path

### When to use

Use when a weapon, mechanic, upgrade, or reward must unlock through quest progress.

### Files to inspect

- `content/tap-survivor-content.json`
- Current quest helper files; inspect current implementation first
- Existing quest audit and quest-flow smoke scripts
- The directly affected mechanic owner file only if runtime behaviour changes

### Files usually changed

- `content/tap-survivor-content.json`
- The directly affected mechanic owner file only if needed
- Generated content through `npm run build:content`, never by hand
- `docs/CURRENT_TASK.md` only if the task checkpoint needs updating

### Files not to touch

- Unrelated quest, combat, shop, save, Android, workflow, or package files
- `src/content.generated.js` by hand
- `www/`
- Generated build output

### Implementation outline

1. Inspect current quest chains, unlocks, and weapon-linked progress first.
2. Add one unlock path, quest gate, reward, or tracker.
3. Keep follow-up quest links consistent with existing content patterns.
4. Rebuild content when content changes.
5. Stop if the request requires multiple quest chains or save migration.

### Validation

- `npm run audit:quests`
- `npm run smoke:quest-flow`
- `npm run agent:check`
- `git diff --check`

### Stop condition

Stop after one weapon-linked quest or unlock path is validated, or report if broader progression changes are required.

## Add sprites or SFX for a new mechanic

### When to use

Use when the requested mechanic already exists or is being handled separately, and this task only wires visual or audio assets.

### Files to inspect

- `content/tap-survivor-content.json`
- Current asset, sprite, or audio mapping files; inspect current implementation first
- Existing asset, sprite, or audio smoke scripts
- Source asset files only when the task includes them

### Files usually changed

- `content/tap-survivor-content.json`
- The relevant source asset or manifest file after inspection
- Generated content through `npm run build:content`, never by hand
- `docs/CURRENT_TASK.md` only if the task checkpoint needs updating

### Files not to touch

- Runtime behaviour files unless explicitly requested
- Unrelated assets
- `src/content.generated.js` by hand
- `www/`
- Android files

### Implementation outline

1. Inspect current asset and audio naming patterns first.
2. Add one sprite, icon, atlas reference, or SFX mapping.
3. Keep file naming and content references aligned with existing conventions.
4. Rebuild and validate content when content changes.
5. Stop if the asset requires new runtime behaviour.

### Validation

- `npm run build:content`
- `npm run validate:content`
- Relevant asset, sprite, or audio smoke checks when available
- `npm run agent:check`
- `git diff --check`

### Stop condition

Stop after one sprite or SFX addition is validated, or report if runtime behaviour work is required.
