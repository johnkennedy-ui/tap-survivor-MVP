# Skill: Task Scope

## Use When

- Before committing any agent task.
- When a task has strict allowed or forbidden files.
- When verifying a branch did not drift.

## Goal

Prove changed files match the task scope.

## Examples

Docs-only task:

```sh
npm run check:task-scope -- \
  --mode working \
  --allow "docs/**" \
  --forbid "src/**" \
  --forbid "android/**" \
  --forbid "www/**"
```

Save-only task:

```sh
npm run check:task-scope -- \
  --mode working \
  --allow "src/save*.js" \
  --allow "src/storage-adapter.js" \
  --allow "scripts/smoke-save.mjs" \
  --allow "docs/SAVE_LIFECYCLE.md" \
  --forbid "www/**" \
  --forbid "android/**"
```

Post-commit branch check:

```sh
npm run check:task-scope -- \
  --mode git \
  --base origin/main \
  --allow "docs/**" \
  --allow "scripts/**" \
  --forbid "src/content.generated.js" \
  --forbid "www/**"
```

## Report Requirements

- Mode.
- Base ref.
- Changed files.
- Allowed files or globs.
- Forbidden files or globs.
- Pass/fail result.

## Stop Condition

Stop when the scope check passes, or report the exact offending file.
