# Tap Survivor Agent Instructions

Before editing this repo:

1. Read `docs/AGENT_CODEBASE_CONTEXT.md`.
2. Read `docs/CONTENT_EXTENSION_GUIDE.md`.
3. Read `docs/MAINTENANCE.md`.
4. Use `npm run agent:status` for a quick repo overview when needed.
5. Treat `docs/CURRENT_TASK.md` as optional housekeeping only. Do not use it as the source of truth for the active request; the conversation and current git diff are authoritative.
6. Inspect only the files relevant to the requested change.
7. Prefer content edits in `content/tap-survivor-content.json` plus `npm run build:content`.
8. Do not edit `src/content.generated.js` by hand.
9. Do not rewrite the game loop, renderer, or combat system unless the task specifically requires it.
10. Use `npm run agent:handoff` when handing the repo to another agent or resuming later.
11. Run `npm run agent:check` before reporting code or structure changes.
12. Use `npm run agent:evidence -- --task "<short task name>"` to create a replayable evidence stub.

For future tasks, use `docs/AGENT_TASK_TEMPLATE.md` as the working checklist.
