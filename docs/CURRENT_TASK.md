# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Add the remaining agent-lane hygiene helpers: status, check, evidence, and changelog.

## Status

- State: validated; ready to report
- Started: 2026-06-11 02:14 BST
- Owner: Frank / OpenClaw

## Files Likely Involved

- `AGENTS.md`
- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/AGENT_TASK_TEMPLATE.md`
- `docs/CHANGELOG_AGENT.md`
- `package.json`
- `scripts/agent-status.mjs`
- `scripts/agent-check.mjs`
- `scripts/agent-evidence.mjs`

## Files Changed

- `scripts/agent-status.mjs`: added quick repo status, content counts, current task snapshot, and command list.
- `scripts/agent-check.mjs`: added standard validation lane for structure/code changes.
- `scripts/agent-evidence.mjs`: added evidence stub generator under `../Shane training/`, including untracked files in the changed-files section.
- `docs/CHANGELOG_AGENT.md`: added short structural changelog for future agents.
- `package.json`: added `agent:status`, `agent:check`, and `agent:evidence` scripts.
- `AGENTS.md`: added the new command workflow.
- `docs/AGENT_CODEBASE_CONTEXT.md`: documented the new commands and changelog.
- `docs/AGENT_TASK_TEMPLATE.md`: added the new commands to the checklist.
- `docs/CURRENT_TASK.md`: updated this checkpoint for the hygiene-tools pass.

## Validation Plan

Run the standard hygiene checks:

```bash
git diff --check
npm run agent:status
npm run agent:check
```

Result:

- `git diff --check`: passed.
- `npm run agent:status`: passed.
- `npm run agent:check`: passed, including script syntax checks and `npm test`.
- `npm run agent:evidence -- --task "tap survivor agent hygiene tools final-check"`: passed and wrote `../Shane training/20260611T011901Z_tap-survivor-agent-hygiene-tools-final-check/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the agent helper commands exist, docs reference them, validation passes, evidence is saved, changes are pushed, and the result is reported.
