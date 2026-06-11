# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Add content summary tooling

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T12:26:48.308Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `scripts/content-summary.mjs`
- `package.json`
- `docs/MAINTENANCE.md`
- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `scripts/content-summary.mjs`: added content map summary for counts, weapons, unlock gates, quest groups, quest follow-ups, ungrouped/terminal quests, missing references, and safe next additions.
- `package.json`: added `content:summary`.
- `scripts/agent-check.mjs`: validates and runs `content:summary`.
- `scripts/agent-status.mjs`: lists `content:summary`.
- `docs/MAINTENANCE.md`: added `content:summary` to routine start/content update paths.
- `docs/AGENT_CODEBASE_CONTEXT.md`: documented the content summary command.
- `docs/CHANGELOG_AGENT.md`: logged the new command.
- `docs/CURRENT_TASK.md`: updated this checkpoint.

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run content:summary
npm run agent:check
```

Result:

- `node --check scripts/content-summary.mjs`: passed.
- `npm run content:summary`: passed.
- `npm run agent:status`: passed and listed `content:summary`.
- `npm run agent:check`: passed, including `content:summary`, all smoke tests, and `npm test`.
- `npm run agent:evidence -- --task "tap survivor content summary"`: passed and wrote `../Shane training/20260611T122918Z_tap-survivor-content-summary/result.md`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
