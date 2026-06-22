# Tap Survivor Agent Instructions

Before editing this repo:

1. Read `docs/AGENT_CODEBASE_CONTEXT.md`.
2. Read `docs/CONTENT_EXTENSION_GUIDE.md`.
3. Read `docs/MAINTENANCE.md`.
4. For bounded execution, read `docs/skills/SKILL_ROUTER.md`, select one matching skill, and load only that skill.
5. Do not combine skills unless the current request explicitly instructs you to do so.
6. Stop after the selected skill's stop condition and report the required evidence.
7. Use `npm run agent:status` for a quick repo overview when needed.
8. Treat `docs/CURRENT_TASK.md` as optional housekeeping only. Do not use it as the source of truth for the active request; the conversation and current git diff are authoritative.
9. Inspect only the files relevant to the requested change.
10. Prefer content edits in `content/registry/*.json` via `npm run add:content -- <type> <id> ...`, then run `npm run build:content`.
11. Do not edit `src/content.generated.js` by hand.
12. Do not rewrite the game loop, renderer, or combat system unless the task specifically requires it.
13. Use `npm run agent:handoff` when handing the repo to another agent or resuming later.
14. Run `npm run agent:check` before reporting code or structure changes.
15. Use `npm run agent:evidence -- --task "<short task name>"` to create a replayable evidence stub.
16. For Android/GitHub.io runtime changes, read `docs/RUNTIME_PARITY.md`.
17. For Android packaging/release prep, read `docs/PLAY_STORE_ANDROID_PREP.md`.
18. Do not hand-edit `www/`, fork gameplay between GitHub.io and Android, or commit signing secrets.
19. Before committing, if the task changed Prettier-supported files, run `docs/skills/prettier-before-commit.md`.
20. For balance-only experiments, use `content/balance/*.json` and validate with `npm run balance:check`; do not change runtime code for numeric tuning-only work.
21. Dev-only balance runtime selection lives in `src/balance-runtime.js`; keep production default behaviour on the `default` profile.
22. Content tooling is split under `scripts/content/`; `scripts/content-tools.mjs` is only the compatibility export surface.
23. Content tooling type contracts live under `types/` and are JSDoc-checked with `npm run typecheck`.
    Keep those contracts scoped to `scripts/content/*.mjs`, the barrel, and `src/content-registry.js` unless a separate task broadens them.
    Do not convert runtime files to TypeScript without a separate migration task.
24. Do not add new `window.*` or `globalThis.*` runtime coupling. Run `npm run check:globals`; update `docs/GLOBAL_STATE_INVENTORY.md` and `scripts/allowed-globals.json` only for deliberate global migration/removal work.
25. New math helper consumers should receive/import math helpers explicitly instead of reading `globalThis.TapSurvivorMath`; keep the existing compatibility bridge only until the script-order runtime is migrated.
26. New HUD renderer consumers should receive/import `createHudRenderer` explicitly instead of reading `globalThis.TapSurvivorRenderHud`; keep the existing compatibility bridge only until the rendering stack is migrated.
27. New enemy renderer consumers should receive/import `createEnemyRenderer` explicitly instead of reading `globalThis.TapSurvivorRenderEnemies`; keep the existing compatibility bridge only until the rendering stack is migrated.
28. Enemy/boss sprite-sheet work belongs in `assets.sprites.spriteSheets` metadata plus `src/sprite-sheet-renderer.js`; preserve fallback order: sheet frame, existing single sprite/SVG, then shape rendering.
29. For ES-module migration slices, keep the real implementation in `src/modules/` and generate the classic bridge with `npm run build:bridges`.
    Do not hand-edit generated bridge files such as `src/shop-pricing.js`, and do not remove script-order/global contracts until a separate runtime-entry migration.
    `src/modules/balance.js` owns floor difficulty implementation; `src/balance.js` is a generated compatibility bridge.
    `src/modules/level-up-choices.js` owns level-up choice helper implementation; `src/level-up-choices.js` is a generated compatibility bridge.
    `src/modules/map-system.js` owns map/floor resolver implementation; `src/map-system.js` is a generated compatibility bridge.
    `src/modules/math.js` owns math helper implementation; `src/math.js` is a generated compatibility bridge.
    `src/modules/save-corruption.js` owns corrupt-save load handling; `src/save-corruption.js` is a generated compatibility bridge.
    `src/modules/save-defaults.js` owns default save construction; `src/save-defaults.js` is a generated compatibility bridge.
    `src/modules/save-migrations.js` owns save migration implementation; `src/save-migrations.js` is a generated compatibility bridge.
    `src/modules/save-normalize.js` owns save normalization implementation; `src/save-normalize.js` is a generated compatibility bridge.
    `src/modules/save.js` owns save-system orchestration; `src/save.js` is a generated compatibility bridge.
    `src/modules/game-dependencies.js` owns the runtime dependency bag seam; `src/game-dependencies.js` is a generated compatibility bridge loaded immediately before `src/game.js`.
    Keep save consumers on `globalThis.TapSurvivorSaveMigrations` and `globalThis.TapSurvivorSaveNormalize` for now.
    Keep `game.js` as the classic side-effectful runtime composer until a separate runtime-entry migration.
    Do not hand-edit generated save bridges or change save defaults, migrations, normalization semantics, corrupt-save backup, storage behavior, persistence semantics, or runtime initialization while moving these bridges.
    `src/modules/weapon-cooldowns.js` owns weapon cooldown/stat-scaling implementation; `src/weapon-cooldowns.js` is a generated compatibility bridge.
    `src/modules/weapon-projectiles.js` owns projectile weapon implementation; `src/weapon-projectiles.js` is a generated compatibility bridge.
    `src/modules/weapon-targeting.js` owns weapon-targeting implementation; `src/weapon-targeting.js` is a generated compatibility bridge.

## Frank Anti-Lockup Tools

- Run `npm run frank:heartbeat -- --task "<task>" --phase "<phase>"` before and after each major phase.
- Use `npm run frank:run -- "<command>" --timeout <seconds>` for validation commands expected to take more than a few seconds.
- If the same command fails twice, stop, update Frank status with `--blocker`, and report instead of continuing.
- If blocked, write the blocker into `.agent/frank-status.json` with `npm run frank:heartbeat -- --blocker "<reason>"` and stop.

For future tasks, use `docs/AGENT_TASK_TEMPLATE.md` as the working checklist.
