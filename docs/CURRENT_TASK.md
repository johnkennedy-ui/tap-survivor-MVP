# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Add an `agent:start` helper that initializes `docs/CURRENT_TASK.md` for the active task.

## Status

- State: validated; ready to push/report
- Started: 2026-06-11 08:07 BST
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CONTENT_EXTENSION_GUIDE.md`
- `docs/AGENT_TASK_TEMPLATE.md`
- `docs/CHANGELOG_AGENT.md`
- `package.json`
- `scripts/agent-start.mjs`

## Files Changed

- `docs/CURRENT_TASK.md`: updated this checkpoint for the `agent:start` pass.
- `scripts/agent-start.mjs`: added CLI writer for `docs/CURRENT_TASK.md`, with dry-run support.
- `package.json`: added `agent:start`.
- `AGENTS.md`: documented the start helper in the opening workflow.
- `docs/AGENT_CODEBASE_CONTEXT.md`: documented the start helper in commands and rules.
- `docs/AGENT_TASK_TEMPLATE.md`: added the start-helper shortcut and dry-run inspection command.
- `docs/CHANGELOG_AGENT.md`: logged the new command.
- `scripts/agent-status.mjs`: included `agent:start` in the command summary.
- `scripts/agent-check.mjs`: added syntax validation for `scripts/agent-start.mjs`.

## Validation Plan

Run the targeted helper checks:

```bash
git diff --check
npm run agent:start -- --goal "Example checkpoint" --status "example only" --dry-run
npm run agent:check
```

Result:

- `git diff --check`: passed.
- `node --check scripts/agent-start.mjs`: passed.
- `npm run agent:start -- --goal "Example checkpoint" --status "example only" --dry-run`: passed.
- `npm run agent:status`: passed.
- `npm run agent:check`: passed, including `npm test`.
- `npm run agent:evidence -- --task "tap survivor agent start helper"`: passed and wrote `../Shane training/20260611T073118Z_tap-survivor-agent-start-helper/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after `agent:start` exists, docs reference it, validation passes, evidence is saved, changes are pushed, and the result is reported.
