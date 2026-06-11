# Tap Survivor Agent Instructions

Before editing this repo:

1. Read `docs/AGENT_CODEBASE_CONTEXT.md`.
2. Read `docs/CONTENT_EXTENSION_GUIDE.md`.
3. Read `docs/CURRENT_TASK.md` and update it for the active task. Use `npm run agent:start -- --goal "<task>"` when starting a new pass.
4. Inspect only the files relevant to the requested change.
5. Prefer content edits in `content/tap-survivor-content.json` plus `npm run build:content`.
6. Do not edit `src/content.generated.js` by hand.
7. Do not rewrite the game loop, renderer, or combat system unless the task specifically requires it.
8. Use `npm run agent:status` for a quick repo overview when needed.
9. Run `npm run agent:check` before reporting code or structure changes.
10. Use `npm run agent:evidence -- --task "<short task name>"` to create a replayable evidence stub.

For future tasks, use `docs/AGENT_TASK_TEMPLATE.md` as the working checklist.
