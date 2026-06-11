# Agent Task Template

## Goal

State the single requested gameplay, content, asset, or maintenance change.

## Current Task File

Update `docs/CURRENT_TASK.md` with the active goal, status, likely files, validation plan, evidence required, and stop condition before editing code or content.

## Files Likely Involved

- Content: `content/tap-survivor-content.json`
- Generated content: `src/content.generated.js`
- Add-content helper: `scripts/add-content.mjs`
- Validation: `scripts/content-tools.mjs`, `scripts/validate-content.mjs`, `scripts/verify-mvp.mjs`
- Gameplay only if needed: `src/game.js`, `src/combat.js`, `src/rendering.js`, `src/upgrades.js`

## Read-Only Inspection Commands

```bash
sed -n '1,220p' docs/AGENT_CODEBASE_CONTEXT.md
sed -n '1,260p' docs/CONTENT_EXTENSION_GUIDE.md
sed -n '1,220p' docs/CURRENT_TASK.md
sed -n '1,220p' content/tap-survivor-content.json
rg -n "<content_id>|<function_name>|<asset_id>" content src scripts docs
```

## Exact Files Changed

List the files changed and why each one changed.

## Test Command

Use the smallest command that proves the change:

```bash
npm run build:content
npm run validate:content
npm run audit:quests
npm test
```

## Evidence Required

- Files inspected.
- Files changed or created.
- Validation command and result.
- Any generated files updated.
- Any known risk or limitation.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported. Do not add extra gameplay content or broad rewrites unless explicitly requested.
