# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Add repo maintenance runbook

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T10:43:38.941Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/MAINTENANCE.md`
- `AGENTS.md`
- `README.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`
- `docs/CURRENT_TASK.md`

## Files Changed

- `docs/MAINTENANCE.md`: added routine start, content update, code update, reporting, deployment, and boundary guidance.
- `AGENTS.md`: added the maintenance runbook to the required pre-edit reading path.
- `README.md`: linked the maintenance runbook from content tooling.
- `docs/AGENT_CODEBASE_CONTEXT.md`: documented the runbook in the folder map and startup rules.
- `docs/CHANGELOG_AGENT.md`: logged the new runbook.
- `docs/CURRENT_TASK.md`: updated this checkpoint.

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `git diff --check`: passed.
- `npm run agent:check`: passed, including `npm test`.
- `npm run agent:evidence -- --task "tap survivor maintenance runbook"`: passed and wrote `../Shane training/20260611T104522Z_tap-survivor-maintenance-runbook/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
