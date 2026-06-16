# Format And Diff Hygiene

Readable source keeps future agent patches small, reviewable, and less likely to
touch unrelated behaviour. One-line code makes it hard to isolate a narrow
change, increases merge conflict risk, and hides accidental gameplay or content
changes inside noisy diffs.

## Reformatted Files

- `src/run-ui.js`: split the long run HUD update path into readable multi-line
  statements while preserving the same HUD text order and values.
- `docs/MAINTENANCE.md`: wrapped long maintenance paragraphs for reviewability.

## Intentionally Excluded

- `src/save.js`, `src/input.js`, `src/weapon-fire.js`, and `src/styles.css` were
  inspected and were already readable enough for this pass.
- `scripts/verify-mvp.mjs` and other verifier scripts contain long assertion
  lines, but they were skipped to keep this formatting-only patch reviewable and
  avoid mixing broad test-file churn into the source formatting pass.
- Historical task notes under `docs/tasks/` were skipped because they are
  archival evidence rather than active source.

## Generated Files

Do not hand-format generated output:

- `src/content.generated.js`
- Any future generated web, Android, or build-output directories

Regenerate those files from their source inputs instead.

## Validation

Formatting-only commits should run:

```bash
npm run build:content
npm run validate:content
npm test
npm run agent:check
```

Run `npm run check:deploy` when the task touches deployment behaviour or when a
live Pages deployment check is specifically needed.

## Future Rule

Formatting-only commits must not include gameplay, balance, content, save-schema,
or deployment behaviour changes. If a formatter reveals a real bug, fix it in a
separate commit after the formatting diff is complete and validated.
