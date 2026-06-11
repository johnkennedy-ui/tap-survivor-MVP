# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Add agent handoff summary helper

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T08:23:58.485Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `package.json`
- `scripts/agent-handoff.mjs`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/AGENT_TASK_TEMPLATE.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `scripts/agent-handoff.mjs`: added compact branch, commit, dirty status, recent commits, current task, and standard command summary.
- `package.json`: added `agent:handoff`.
- `scripts/agent-status.mjs`: included `agent:handoff` in available command output.
- `scripts/agent-check.mjs`: added syntax validation for `scripts/agent-handoff.mjs`.
- `AGENTS.md`: documented when to use the handoff command.
- `docs/AGENT_CODEBASE_CONTEXT.md`: documented the handoff command.
- `docs/AGENT_TASK_TEMPLATE.md`: added handoff to inspection and evidence guidance.
- `docs/CHANGELOG_AGENT.md`: logged the new command.
- `docs/CURRENT_TASK.md`: updated this checkpoint.

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:handoff
npm run agent:check
```

Result:

- `git diff --check`: passed.
- `node --check scripts/agent-handoff.mjs`: passed.
- `npm run agent:handoff`: passed.
- `npm run agent:status`: passed and listed `agent:handoff`.
- `npm run agent:check`: passed, including `npm test`.
- `npm run agent:evidence -- --task "tap survivor agent handoff helper"`: passed and wrote `../Shane training/20260611T082532Z_tap-survivor-agent-handoff-helper/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
