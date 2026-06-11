# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Add CI validation for agent check

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T09:20:07.410Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `.github/workflows/agent-check.yml`
- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `.github/workflows/agent-check.yml`: added GitHub Actions workflow for `npm run agent:check` on push, pull request, and manual dispatch.
- `docs/AGENT_CODEBASE_CONTEXT.md`: documented the CI validation workflow.
- `docs/CHANGELOG_AGENT.md`: logged the new workflow.
- `docs/CURRENT_TASK.md`: updated this checkpoint.

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `npm run agent:check`: passed, including `npm test`.
- `npm run agent:evidence -- --task "tap survivor agent check ci"`: passed and wrote `../Shane training/20260611T092130Z_tap-survivor-agent-check-ci/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
