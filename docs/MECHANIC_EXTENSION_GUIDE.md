# Mechanic Extension Guide

Use this guide when adding exactly one weapon behavior or gameplay mechanic. Pick one recipe, inspect only the files named by that recipe, validate with that recipe's commands, then stop at its stop condition.

## Hard Boundaries

- Do not modify unrelated systems while adding a mechanic.
- Do not hand-edit `src/content.generated.js`; edit content source and rebuild generated content.
- Do not touch `www/`, Android package/signing config, or generated build output for docs-only or non-Android work.
- Do not change save schema unless the request explicitly asks for save migration.
- Do not combine recipes unless the prompt explicitly asks for a multi-part task.
- Do not introduce a new helper file unless existing ownership makes the target file clearly too broad.

## File Ownership

| Area                    | Primary Files                       | Notes                                                                                             |
| ----------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| Weapon integration      | `src/weapon-fire.js`                | Public combat entry point. Keep existing globals and helper calls stable.                         |
| Projectile behavior     | `src/weapon-projectiles.js`         | Bolts, bounces, split-on-hit, explosions, and projectile runtime effects.                         |
| Non-projectile behavior | `src/weapon-behaviors.js`           | Beams, cones, radial effects, chains, target areas, lingering areas, mines, and bursts.           |
| Cooldown and scaling    | `src/weapon-cooldowns.js`           | Cooldowns, damage scaling, reach, width, projectile size, and stat modifiers.                     |
| Target selection        | `src/weapon-targeting.js`           | Enemy targeting helpers and target filtering.                                                     |
| Content data            | `content/tap-survivor-content.json` | Weapons, quests, unlocks, assets, and content-side values. Rebuild generated content after edits. |
| Script order            | `index.html` and VM harnesses       | Only edit when a new runtime helper must load before `src/weapon-fire.js`.                        |
| Task checkpoint         | `docs/CURRENT_TASK.md`              | Keep the active task, changed files, validation, and stop condition current.                      |

## Recipe: Content-Only Weapon

Use when a weapon can be added or tuned with content data only.

Allowed files:

- `content/tap-survivor-content.json`
- `docs/CURRENT_TASK.md`
- Generated content only through the build command, never by hand

Forbidden files:

- `src/**/*.js`
- `src/content.generated.js` by hand
- `www/`
- Android package/signing config
- Unrelated docs or assets

Steps:

1. Inspect the existing weapon entries in `content/tap-survivor-content.json`.
2. Add or tune one weapon entry using existing content fields and patterns.
3. Rebuild generated content with the existing content build command.
4. Run the content validation and the narrow smoke path.
5. Stop when validation passes or the weapon needs source behavior.

Validation:

```sh
npm run build:content
npm run validate:content
npm run smoke:start-run
npm run agent:check
git diff --check
```

Stop condition:

- Stop after one content-only weapon is validated.
- If the weapon needs new runtime behavior, stop and switch to the `New Weapon Behavior` recipe only when explicitly instructed.

## Recipe: New Weapon Behavior

Use when the requested weapon needs runtime behavior that content data cannot express.

Allowed files:

- The directly affected `src/weapon-*.js` owner file
- `index.html` only if script order must change
- Relevant test or smoke script only if existing coverage cannot prove the behavior
- `docs/CURRENT_TASK.md`

Forbidden files:

- Unrelated `src/**/*.js`
- `content/tap-survivor-content.json` unless behavior needs one small data flag or value
- `src/content.generated.js` by hand
- `www/`
- Android package/signing config
- Save schema unless explicitly requested

Steps:

1. Identify whether the change belongs in projectile, non-projectile, cooldown/scaling, targeting, or integration ownership.
2. Inspect only the owner file and the directly called helpers.
3. Add the smallest behavior branch that preserves existing globals and script-order compatibility.
4. Add or update focused validation only when existing smoke tests cannot exercise the path.
5. Run syntax checks on touched JavaScript files before the broader validation commands.

Validation:

```sh
node --check <touched-js-file>
npm run smoke:start-run
npm test
npm run agent:check
git diff --check
```

Stop condition:

- Stop after one new behavior is validated.
- If the change requires save migration, Android packaging, a renderer rewrite, or multiple mechanics, stop and report the boundary.

## Recipe: Quest-Linked Mechanic

Use when a mechanic is unlocked, gated, rewarded, or tracked through quest progression.

Allowed files:

- `content/tap-survivor-content.json`
- The directly affected mechanic owner file only if runtime behavior is required
- Relevant quest audit or smoke script only if existing checks cannot prove the flow
- `docs/CURRENT_TASK.md`

Forbidden files:

- Unrelated quest, combat, shop, or save systems
- `src/content.generated.js` by hand
- `www/`
- Android package/signing config
- Save schema unless explicitly requested

Steps:

1. Identify the quest trigger, unlock, reward, or tracking condition.
2. Inspect the existing quest and weapon content patterns before changing anything.
3. Add the smallest content link and only the runtime hook required to honor it.
4. Rebuild content if content changed.
5. Run quest audit and quest-flow smoke validation.

Validation:

```sh
npm run audit:quests
npm run smoke:quest-flow
npm run agent:check
git diff --check
```

Stop condition:

- Stop after one quest-linked mechanic is validated.
- If the mechanic needs multiple quest chains, save migration, or broad progression changes, stop and report the boundary.

## Recipe: Sprite Or SFX Addition

Use when a mechanic needs a new sprite, icon, or sound effect without changing runtime behavior.

Allowed files:

- `content/tap-survivor-content.json`
- Relevant source asset file or asset manifest
- `docs/CURRENT_TASK.md`
- Generated content only through the build command, never by hand

Forbidden files:

- Runtime behavior files unless explicitly requested
- `src/content.generated.js` by hand
- `www/`
- Android package/signing config
- Unrelated assets

Steps:

1. Inspect nearby asset entries and naming patterns.
2. Add one asset reference and the minimal source asset file or manifest entry.
3. Rebuild and validate content.
4. Run relevant asset, sprite, or audio smoke checks if available.

Validation:

```sh
npm run build:content
npm run validate:content
npm run verify:assets
npm run smoke:assets
git diff --check
```

For SFX-only changes, prefer the audio checks when they are the relevant available path:

```sh
npm run verify:audio
npm run smoke:audio
```

Stop condition:

- Stop after one asset or SFX addition is validated.
- If the asset needs new runtime behavior, stop and switch recipes only when explicitly instructed.

## Recipe: Android-Sensitive Mechanic

Use when the requested mechanic can affect Android runtime parity, Capacitor behavior, storage, input, audio, or packaging.

Allowed files:

- The directly affected runtime file
- `content/tap-survivor-content.json` only if needed
- `index.html` only for required script order or platform loading
- Relevant Android bridge/config files only when the request explicitly requires them
- `docs/CURRENT_TASK.md`

Forbidden files:

- Android package/signing config unless explicitly requested
- Generated build output
- Unrelated runtime systems
- Save schema unless explicitly requested

Steps:

1. Identify why the mechanic is Android-sensitive before editing.
2. Make the smallest runtime or content change.
3. Run web build and runtime parity before Android sync.
4. Sync Android only after web and parity checks pass.
5. Build the debug APK to prove the Android path.

Validation:

```sh
npm run build:web
npm run check:runtime-parity
npm run android:sync
npm run android:debug
git diff --check
```

Stop condition:

- Stop after one Android-sensitive mechanic passes web, parity, sync, and debug build validation.
- If signing, release packaging, Play release work, or device QA is required, stop and route to the appropriate Android or handoff skill.

## Validation Matrix

| Change Type                | Required Validation                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Content-only weapon        | `npm run build:content`, `npm run validate:content`, `npm run smoke:start-run`, `npm run agent:check`, `git diff --check`    |
| New weapon behavior        | `node --check` on touched JavaScript files, `npm run smoke:start-run`, `npm test`, `npm run agent:check`, `git diff --check` |
| Quest-linked unlock        | `npm run audit:quests`, `npm run smoke:quest-flow`, `npm run agent:check`, `git diff --check`                                |
| Sprite/SFX addition        | Content validation plus relevant asset, sprite, or audio smoke checks when available                                         |
| Android-sensitive mechanic | `npm run build:web`, `npm run check:runtime-parity`, `npm run android:sync`, `npm run android:debug`, `git diff --check`     |
| Docs-only guide update     | `npm run check:format-hygiene`, `npm run agent:check`, `npm test`, `git diff --check`                                        |

## Prompt Templates

### Content-Only Weapon Prompt

```text
Branch: dev/<content-weapon-name>
Goal: Add or tune one content-only weapon using existing content fields.
Allowed files: content/tap-survivor-content.json, docs/CURRENT_TASK.md, generated content only through npm run build:content.
Forbidden files: src/**/*.js, src/content.generated.js by hand, www/, Android files, unrelated docs or assets.
Validation: npm run build:content; npm run validate:content; npm run smoke:start-run; npm run agent:check; git diff --check.
Stop condition: Stop after one content-only weapon is validated, or report that source behavior is required.
Report format: branch, files inspected, files changed, validation results, generated files, remaining risks, next single task.
```

### New Weapon Behavior Prompt

```text
Branch: dev/<weapon-behavior-name>
Goal: Add one runtime weapon behavior in the correct weapon owner file.
Allowed files: the directly affected src/weapon-*.js file, index.html only if script order must change, focused validation script if required, docs/CURRENT_TASK.md.
Forbidden files: unrelated src/**/*.js, src/content.generated.js by hand, www/, Android files, save schema unless explicitly requested.
Validation: node --check on touched JavaScript files; npm run smoke:start-run; npm test; npm run agent:check; git diff --check.
Stop condition: Stop after one behavior is validated, or report if the request requires multiple mechanics, save migration, or Android packaging.
Report format: branch, mechanic, owner file, files changed, validation results, parity/build caveats, remaining risks, next single task.
```

### Quest-Linked Mechanic Prompt

```text
Branch: dev/<quest-mechanic-name>
Goal: Add one quest-linked unlock, reward, gate, or tracker for a mechanic.
Allowed files: content/tap-survivor-content.json, the directly affected mechanic owner file only if runtime behavior is required, focused quest validation if required, docs/CURRENT_TASK.md.
Forbidden files: unrelated quest/combat/shop/save systems, src/content.generated.js by hand, www/, Android files, save schema unless explicitly requested.
Validation: npm run audit:quests; npm run smoke:quest-flow; npm run agent:check; git diff --check.
Stop condition: Stop after one quest-linked mechanic is validated, or report if broader progression or save migration is required.
Report format: branch, quest link, mechanic owner, files changed, validation results, generated files, remaining risks, next single task.
```
