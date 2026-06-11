# Maintenance Runbook

Use this as the short path for routine Tap Survivor updates. Keep changes small, run the narrowest useful validation, then stop.

## Start A Pass

```bash
npm run agent:start -- --goal "<short task goal>"
npm run agent:status
```

Read:

- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CONTENT_EXTENSION_GUIDE.md`
- `docs/CURRENT_TASK.md`

## Content-Only Update

Use this for weapons, quests, levels, characters, shop items, and asset registry edits.

```bash
npm run add:content -- <type> <id> ...
npm run build:content
npm run validate:content
```

Run `npm run audit:quests` if quests, unlock gates, or quest groups changed.
Run `npm test` if generated content, gameplay behavior, unlock flow, or script load order changed.

## Code Update

Use this for `src/`, `scripts/`, `index.html`, style, workflow, or structural changes.

```bash
npm run agent:check
```

For focused checks:

```bash
node --check <changed-script>
npm run validate:content
npm run smoke:quest-flow
npm run test:speed
```

## Before Reporting

```bash
npm run agent:handoff
npm run agent:evidence -- --task "<short task name>"
git status --short
```

Report the commit, changed files, validation commands, and any remaining caveats.

## Deployment

Pushes to `main` publish the GitHub Pages site via `.github/workflows/tap-survivor-pages.yml`.
Pushes and pull requests run `npm run agent:check` via `.github/workflows/agent-check.yml`.

Use `npm run check:deploy` when verifying the live Pages deployment.

## Boundaries

- Do not hand-edit `src/content.generated.js`.
- Do not touch the game loop, combat, renderer, or save flow for pure content changes.
- Do not add new dependencies unless the requested change needs them.
- Do not combine unrelated gameplay, content, and tooling changes in one pass.
