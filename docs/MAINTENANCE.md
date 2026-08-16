# Maintenance Runbook

Use this as the short path for routine Tap Survivor updates. Keep changes small, run the narrowest useful validation, then stop.

## Start A Pass

```bash
npm run agent:status
npm run content:summary
```

Read:

- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CONTENT_EXTENSION_GUIDE.md`

`docs/CURRENT_TASK.md` is optional housekeeping only. Prefer the current conversation and `git status --short` when deciding what work is active.

## Content-Only Update

Use this for weapons, quests, levels, characters, shop items, and asset registry edits.

```bash
npm run add:content -- <type> <id> ...
npm run content:summary
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

`npm run agent:check` is path-aware for local dirty work. Use `npm run agent:check -- --full` when you need the complete gate without going through prepush.

For focused checks:

```bash
node --check <changed-script>
npm run content:check
npm run verify:assets
npm run verify:audio
npm run verify:content
npm run verify:relics
npm run verify:ui
npm run validate:content
npm run smoke:save
npm run smoke:start-run
npm run smoke:boss-run
npm run smoke:quest-flow
npm run smoke:content-tools
npm run test:speed
```

## Shared Runtime And Android Packaging

GitHub Pages and Android must use the same generated runtime directory:

```bash
npm run build:web
npm run check:runtime-parity
```

`www/` is generated and ignored by git. Rebuild it before Pages deploy checks or Android syncs.

Do not hand-copy runtime files into `android/`. Use Capacitor sync so Android consumes `www/`:

```bash
npm run android:sync
npm run android:debug
npm run android:bundle:local
```

Expected local outputs:

- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release AAB: `android/app/build/outputs/bundle/release/app-release.aab`

This repo does not include Play upload, signing keys, keystores, service account JSON, billing, ads, analytics, Firebase, login, or backend services.

## Before Local Handoff

```bash
npm run agent:handoff
npm run agent:evidence -- --task "<short task name>"
git status --short
```

Report the commit, changed files, validation commands, and any remaining caveats.

## Explicit Release Operations

Push and deploy operations are outside routine reporting. Use them only when the current request
explicitly authorizes a release and the required validation has passed.

`npm run agent:prepush` runs `npm run cache:bump` automatically before validation and forces the
full agent check. `npm run agent:finish` can commit and optionally push; `npm run agent:ship` adds a
push; and `npm run agent:release` adds deployment verification. Do not run any of them merely to
report a local change.

## Deployment

Pushes to `main` publish the GitHub Pages site via `.github/workflows/tap-survivor-pages.yml`.
The Pages workflow builds `www/`, checks runtime parity, and publishes only `www/` to `gh-pages`.
Pushes and pull requests run `npm run agent:check` via `.github/workflows/agent-check.yml`.

With explicit release authority, use `npm run agent:release -- --message "<commit message>"` for changes that should be live-verified immediately after push.
Use `npm run check:deploy` for a read-only live Pages deployment check.
It expects the latest Pages workflow for the local commit to complete successfully and the live page/cache keys,
`build-info.json`, and `runtime-manifest.json` to match local `www/`.

## Boundaries

- Do not hand-edit `src/content.generated.js`.
- Do not touch the game loop, combat, renderer, or save flow for pure content changes.
- Do not add new dependencies unless the requested change needs them.
- Do not combine unrelated gameplay, content, and tooling changes in one pass.
