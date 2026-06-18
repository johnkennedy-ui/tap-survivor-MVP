# Skill: Handoff Evidence

## Use When

- The user asks for a handoff, summary, evidence bundle, or resume point.
- Work must pause cleanly for another agent.
- A task needs a concise final report without new edits.

## Do Not Use When

- The active task still needs implementation.
- Validation has not been run and the user asked for a completed change.
- The repo state is ambiguous and needs investigation first.

## Goal

Create a clear snapshot of branch, changes, validation, risks, and next step.

## Allowed Files

- `docs/CURRENT_TASK.md`
- Evidence files under `docs/tasks/**`
- No files, if the handoff can be reported directly

## Forbidden Files

- Source files
- Generated files
- Android signing secrets
- Content JSON unless documenting existing changes

## Procedure

1. Run repo status and diff summary.
2. Run `npm run agent:status`.
3. Run validation only if required by the handoff.
4. When a task claims specific files were reformatted, split, generated, or updated, run `npm run check:commit-evidence` against those files after commit.
5. When a task had explicit allowed or forbidden files, include `npm run check:task-scope` in the final handoff evidence.
6. Summarize commits, changed files, commands, validation, blockers, and next step.
7. Do not make unrelated fixes.

## Commands

```sh
git status --short --branch
git diff --stat
npm run agent:status
npm run agent:handoff
```

## Stop Condition

Stop once the handoff evidence is written or reported.

## Report Format

```text
Skill: handoff-evidence
Branch:
Commit:
Changed files:
Commands run:
Validation:
Blockers:
Next step:
```
