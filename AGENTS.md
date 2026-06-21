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

For future tasks, use `docs/AGENT_TASK_TEMPLATE.md` as the working checklist.
