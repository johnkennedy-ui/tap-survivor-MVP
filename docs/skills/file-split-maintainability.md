# Skill: File Split Maintainability

## Use When

- A large file needs small helper extraction.
- The user asks for maintainability without behavior changes.
- Existing helpers can be moved behind the same public entry point.

## Do Not Use When

- The request adds a new mechanic, content, save schema, or Android behavior.
- A split would require a new registry or architecture layer.
- The target file is generated.

## Goal

Split one bounded area into helper files while preserving behavior, globals, public APIs, script order, and validation.

## Allowed Files

- The one target source file
- New helper files in the same ownership area
- `index.html` script order
- Relevant VM harnesses and verification scripts
- Maintainability docs
- `docs/CURRENT_TASK.md`

## Forbidden Files

- `src/content.generated.js`
- `www/`
- Content JSON unless the split is content tooling
- Android package/signing config
- Unrelated source systems

## Procedure

1. Choose one system only.
2. Inspect the target file and existing script order.
3. Extract pure helpers first.
4. Keep the original file as the public integration point.
5. Update `index.html` and verification harness load order if needed.
6. Run syntax checks for every edited JS file.
7. Run focused smoke tests plus `npm run agent:check`.

## Commands

```sh
node --check <edited-js-file>
npm run verify:script-order
npm run agent:check
npm test
git diff --check
```

## Stop Condition

Stop after one bounded split is committed or a behavior-risk blocker is found.

## Report Format

```text
Skill: file-split-maintainability
Target system:
Files split:
Public API preserved:
Script-order changes:
Commands run:
Behavior changed: no
```
