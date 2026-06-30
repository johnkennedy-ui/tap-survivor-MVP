# Agent Task Queue

The task queue is repo-local state stored at `.agent/tasks.json`.

It is not a global OpenClaw scheduler, daemon, lock manager, or CI gate. It must not be used to block validation, commits, builds, releases, deploys, or agent checks.

At session start, run `npm run task:list` when `.agent/tasks.json` exists. Agents should have at most one active task. When using the queue, mark the active task `complete` or `blocked` before handoff.

## Statuses

- `queued`: planned work that has not started.
- `active`: the one task currently being worked.
- `complete`: finished work with evidence recorded.
- `blocked`: stopped work that needs input or a separate fix before continuing.

## Commands

```bash
npm run task:list
npm run task:validate
npm run task:add -- --id "kebab-case-id" --summary "One sentence summary."
npm run task:active -- kebab-case-id
npm run task:complete -- kebab-case-id --evidence "path/to/result.md"
npm run task:blocked -- kebab-case-id --evidence "path/to/result.md"
```

## Stop Conditions

- Wrong repo path: stop and prove the correct repo root before editing.
- Dirty worktree before editing: stop and report the dirty files.
- Local HEAD differs from `origin/main`: stop and report both SHAs.
- Invalid `.agent/tasks.json`: stop queue work, report the validation warning, and fix only when explicitly asked.
- Another task is already active: stop and ask whether to complete, block, or leave that task alone.

The queue records the current bounded task. It does not justify broad scope expansion.

Queue tasks should normally represent a whole controlled mission, not a tiny one-file change.
Use one active task to cover the focused inspection, implementation batch, validation, evidence,
completion, commit, push, and final Actions check for that mission.
