# Skill: Format Hygiene

## Use When

- Active source or docs are compressed, unreadable, or fail format hygiene.
- The user asks for formatting-only cleanup.
- A generated one-line file was accidentally treated as source.

## Do Not Use When

- Gameplay, content, save behavior, or Android config needs functional changes.
- The file is generated or archived evidence.
- Formatting would hide a real parser or validation failure.

## Goal

Improve readability of active source/docs without runtime behavior changes.

## Allowed Files

- `src/**/*.js`
- `src/**/*.css`
- `docs/**/*.md`
- `AGENTS.md`
- `README.md`
- `scripts/check-format-hygiene.mjs`
- `package.json`
- `docs/CURRENT_TASK.md`

## Forbidden Files

- `src/content.generated.js`
- `www/`
- `android/`
- `node_modules/`
- `package-lock.json` unless package scripts change
- Archived files in `docs/tasks/`

## Procedure

1. Run the format hygiene check.
2. Reformat only files that fail or are explicitly requested.
3. Preserve function names, globals, public APIs, schema keys, and script order.
4. Run `node --check` for each edited JS file.
5. Run format hygiene and agent checks again.

## Commands

```sh
npm run check:format-hygiene
node --check <edited-js-file>
npm run agent:check
git diff --check
```

## Stop Condition

Stop when hygiene passes or a non-format issue blocks safe cleanup.

## Report Format

```text
Skill: format-hygiene
Files reformatted:
Behavior changed: no
Commands run:
Validation result:
Remaining compressed files:
```
