# Skill: Content Patch

## Use When

- The user asks to add or edit weapons, quests, relics, shop items, enemies, levels, or text content.
- The change belongs in the content pipeline rather than hand-written runtime code.
- Content validation or balancing data needs a narrow patch.

## Do Not Use When

- The request changes mechanics code.
- The request changes generated files directly.
- The task is Android packaging, save lifecycle, or docs-only.

## Goal

Patch source content through the JSON pipeline and validate generated runtime content.

## Allowed Files

- `content/tap-survivor-content.json`
- `docs/CONTENT_EXTENSION_GUIDE.md`
- Content validation scripts if directly needed
- `docs/CURRENT_TASK.md`

## Forbidden Files

- `src/content.generated.js` by hand
- `www/`
- Save schema files
- Android signing or package config
- Unrelated gameplay systems

## Procedure

1. Inspect the relevant content section only.
2. Make the smallest valid content change.
3. Run the content build.
4. Run content validation and relevant smoke checks.
5. Confirm generated content was produced by the build, not edited by hand.

## Commands

```sh
npm run build:content
npm run validate:content
npm run smoke:start-run
npm run agent:check
git diff --check
```

## Stop Condition

Stop when the content patch validates or the content schema blocks the request.

## Report Format

```text
Skill: content-patch
Content changed:
Generated files hand-edited: no
Commands run:
Validation result:
Gameplay/code changed:
```
