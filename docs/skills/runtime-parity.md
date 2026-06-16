# Skill: Runtime Parity

## Use When

- Work may affect the shared web runtime used by GitHub.io and Android.
- The user asks whether browser and Android runtime files match.
- `index.html`, `src/`, `assets/`, `content/`, or build scripts changed.

## Do Not Use When

- The task is documentation-only.
- The task only changes Android packaging metadata.
- The user asks for a Play release build.

## Goal

Verify the generated `www/` runtime is produced from the same web source and has not been hand-edited.

## Allowed Files

- `index.html`
- `src/**`
- `assets/**`
- `content/**`
- `scripts/**`
- `docs/RUNTIME_PARITY.md`
- `docs/CURRENT_TASK.md`

## Forbidden Files

- `www/` by hand
- Android signing secrets
- Generated content by hand

## Procedure

1. Inspect only files relevant to the parity concern.
2. Run the content build if content changed.
3. Run the web build.
4. Run the runtime parity check.
5. Use `git diff --check` before reporting.
6. If parity fails, fix only the direct parity issue.

## Commands

```sh
npm run build:content
npm run build:web
npm run check:runtime-parity
git diff --check
```

## Stop Condition

Stop when runtime parity passes or a direct parity blocker is identified.

## Report Format

```text
Skill: runtime-parity
Files inspected:
Commands run:
Runtime parity result:
Generated files hand-edited: no
Remaining risk:
```
