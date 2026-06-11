# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Add the first codebase hygiene helper: a current task file that future agents can read before editing.

## Status

- State: validated; ready to report
- Started: 2026-06-11 02:02 BST
- Owner: Frank / OpenClaw

## Files Likely Involved

- `AGENTS.md`
- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/AGENT_TASK_TEMPLATE.md`

## Files Changed

- `docs/CURRENT_TASK.md`: added this active task checkpoint.
- `AGENTS.md`: points future agents at this file.
- `docs/AGENT_CODEBASE_CONTEXT.md`: documents the file in the repo map and startup rules.
- `docs/AGENT_TASK_TEMPLATE.md`: adds the task file as the first working checklist item.

## Validation Plan

Run the smallest useful checks for a docs-only hygiene change:

```bash
git diff --check
npm run validate:content
```

Result:

- `git diff --check`: passed.
- `npm run validate:content`: passed; registry contains 12 weapons, 11 weapon unlocks, 37 quests, 3 enemy types, 1 character, 0 shop items, and 0 level entries.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the current task file exists, the agent docs reference it, validation passes, evidence is saved, and the result is reported.
