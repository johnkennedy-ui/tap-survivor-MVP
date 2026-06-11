# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Add optional browser smoke test

## Status

- State: validated; ready to push/report
- Started: 2026-06-11T17:04:59.587Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `package.json`
- `scripts/smoke-browser.mjs`
- `scripts/browser-smoke.html`
- `scripts/agent-check.mjs`
- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`

## Files Changed

- `package.json`
- `scripts/smoke-browser.mjs`
- `scripts/browser-smoke.html`
- `scripts/agent-check.mjs`
- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/CHANGELOG_AGENT.md`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run smoke:browser
npm run agent:prepush
```

Result:

- `npm run smoke:browser`: passed as optional skip because the local Chromium wrapper cannot run in this environment.
- `npm run agent:prepush`: passed, including `node --check scripts/smoke-browser.mjs`, optional `npm run smoke:browser`, focused smoke tests, and `npm test`.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
