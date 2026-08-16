# Skill: Save Lifecycle

## Use When

- The task involves save creation, loading, migration, corruption handling, or storage fallback.
- The user asks about save schema, save version, localStorage, or Capacitor Preferences.
- A save-related bug must be reproduced or fixed.

## Do Not Use When

- The task is only content, UI, Android packaging, or docs.
- The requested change would alter save schema without explicit approval.
- The issue is a gameplay mechanic unrelated to persistence.

## Goal

Inspect or patch save lifecycle behavior while preserving public APIs, save keys, storage keys, and migration behavior.

## Allowed Files

- Source-owned save modules under `src/modules/`, including `save.js`, `save-defaults.js`,
  `save-migrations.js`, `save-normalize.js`, `save-corruption.js`, and `storage-adapter.js`
- Generated save compatibility artifacts under `src/` for inspection only; regenerate them with
  `npm run build:bridges` and never hand-edit them
- Save smoke scripts under `scripts/`
- Save lifecycle docs
- `docs/CURRENT_TASK.md`

## Forbidden Files

- `content/tap-survivor-content.json` unless required by a save fixture
- `src/content.generated.js`
- Generated save compatibility artifacts under `src/`
- `www/`
- Android signing or package config

## Procedure

1. Inspect existing save helpers before editing.
2. Identify the save version, keys, and public API touched.
3. Make the smallest change needed.
4. Preserve the explicit `createSaveSystem(...)` factory and dependency-bag contract; do not restore
   a retired browser publisher.
5. Run syntax and save smoke checks.
6. Run broader agent checks if source changed.

## Commands

```sh
node --check src/modules/storage-adapter.js
node --check src/modules/save-defaults.js
node --check src/modules/save-migrations.js
node --check src/modules/save-normalize.js
node --check src/modules/save.js
npm run smoke:save
npm run agent:check
git diff --check
```

## Stop Condition

Stop when the save behavior is validated or a schema/storage blocker is found.

## Report Format

```text
Skill: save-lifecycle
Files changed:
Save schema/version status:
Storage keys status:
Public API status:
Commands run:
Result:
```
