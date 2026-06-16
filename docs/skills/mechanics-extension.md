# Skill: Mechanics Extension

## Use When

- The user explicitly asks for a small gameplay mechanic or runtime behavior change.
- The change cannot be represented as content data alone.
- The affected source area is clear.

## Do Not Use When

- The task is documentation-only, content-only, save-only, or Android packaging.
- The change would rewrite the game loop, renderer, combat system, or progression architecture.
- The request is broad enough to require multiple independent mechanics.

## Goal

Add one small mechanic while preserving runtime parity, save compatibility, and existing behavior outside the requested change.

## Allowed Files

- The directly affected `src/**/*.js` files
- Relevant tests or smoke scripts
- `content/tap-survivor-content.json` only if the mechanic needs data
- `index.html` only for required script order
- `docs/CURRENT_TASK.md`

## Forbidden Files

- `src/content.generated.js` by hand
- `www/`
- Android package/signing config
- Unrelated source systems
- Save schema unless explicitly requested

## Procedure

1. Identify the one mechanic and affected source area.
2. Inspect only the relevant files and existing helpers.
3. Make the smallest source change.
4. Preserve existing globals and script-order compatibility.
5. Add or update focused validation if needed.
6. Run syntax, smoke, test, agent, build, and parity checks.

## Commands

```sh
node --check <edited-js-file>
npm run smoke:start-run
npm test
npm run agent:check
npm run build:web
npm run check:runtime-parity
git diff --check
```

## Stop Condition

Stop after the one mechanic is validated or behavior risk exceeds the request.

## Report Format

```text
Skill: mechanics-extension
Mechanic:
Files changed:
Save schema changed:
Runtime parity result:
Commands run:
Remaining risks:
```
