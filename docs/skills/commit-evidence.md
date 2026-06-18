# Skill: Commit Evidence

## Use When

- After formatting tasks.
- After file split tasks.
- After docs-only recipe tasks.
- After any task where Frank claims exact files changed.

## Goal

Prove the committed object matches the report by checking committed files with `git show HEAD:<file>`, not working-tree files.

## Required Command Pattern

```sh
npm run check:commit-evidence -- \
  --commit HEAD \
  --expect-file <file> \
  --min-lines <file>=<number> \
  --max-line-length 240
```

## Report Requirements

- Commit hash.
- Expected files.
- Changed files from commit.
- Committed line counts.
- Longest committed line per file.
- Pass/fail result.

## Examples

Formatting proof:

```sh
npm run check:commit-evidence -- \
  --commit HEAD \
  --expect-file src/save.js \
  --expect-file src/storage-adapter.js \
  --min-lines src/save.js=50 \
  --min-lines src/storage-adapter.js=40 \
  --max-line-length 240
```

Docs guide proof:

```sh
npm run check:commit-evidence -- \
  --commit HEAD \
  --expect-file docs/MECHANIC_EXTENSION_GUIDE.md \
  --min-lines docs/MECHANIC_EXTENSION_GUIDE.md=180 \
  --max-line-length 240
```

## Stop Condition

Stop when evidence passes, or report the exact failure.
