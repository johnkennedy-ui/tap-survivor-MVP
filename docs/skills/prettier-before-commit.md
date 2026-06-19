# Skill: Prettier Before Commit

## Use When

Use this after any task that changed files supported by Prettier, before staging/committing.

Examples:

- JS files
- MJS scripts
- Markdown docs
- JSON files
- YAML workflow files
- CSS files

## Do Not Use When

Do not run Prettier on:

- Generated files
- `www/`
- `src/content.generated.js`
- Android build outputs
- `node_modules/`
- Binary assets
- Keystores/secrets

## Goal

Ensure changed files are formatted before commit and prevent compressed one-line active files.

## Procedure

1. Check changed files:

```sh
git status --short
git diff --name-only
```

2. Run Prettier on the changed supported files only when practical:

```sh
npx prettier@latest --write <changed-supported-files>
```

3. If many supported files changed, use the repo script:

```sh
npm run format
```

4. Run format checks:

```sh
npm run format:check
npm run check:format-hygiene
```

5. Run syntax checks for edited JavaScript/MJS files:

```sh
node --check <changed-js-or-mjs-file>
```

6. Continue with the selected task's normal validation.

## Required Before Commit

Before committing, run:

```sh
npm run format:check
npm run check:format-hygiene
git diff --check
```

## Stop Condition

The skill is complete when:

- Changed supported files have been formatted.
- `npm run format:check` passes.
- `npm run check:format-hygiene` passes.
- `git diff --check` passes.

## Report Format

Report:

1. Changed supported files
2. Prettier command run
3. Files formatted
4. `format:check` result
5. `check:format-hygiene` result
6. `git diff --check` result
7. Any files intentionally skipped and why
