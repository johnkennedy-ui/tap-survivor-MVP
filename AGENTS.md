# Tap Survivor Agent Instructions

Before editing this repo:

1. Read `docs/AGENT_CODEBASE_CONTEXT.md`.
2. Read `docs/CONTENT_EXTENSION_GUIDE.md`.
3. Read `docs/CURRENT_TASK.md` and update it for the active task.
4. Inspect only the files relevant to the requested change.
5. Prefer content edits in `content/tap-survivor-content.json` plus `npm run build:content`.
6. Do not edit `src/content.generated.js` by hand.
7. Do not rewrite the game loop, renderer, or combat system unless the task specifically requires it.
8. Run the smallest relevant validation before reporting back.

For future tasks, use `docs/AGENT_TASK_TEMPLATE.md` as the working checklist.
