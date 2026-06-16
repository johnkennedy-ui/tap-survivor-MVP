# Skill: Validation Baseline

## Use When

- Starting a task that requires a clean repo baseline.
- Checking whether current changes are safe to report.
- The user asks for validation, smoke checks, or pre-commit checks.

## Do Not Use When

- The request is only a question.
- A narrower skill already defines the exact validation commands.
- The repo is known dirty with unrelated user changes that need protection first.

## Goal

Run the smallest reliable validation lane and report exact pass/fail evidence.

## Allowed Files

- `docs/CURRENT_TASK.md`
- Files already changed by the active task

## Forbidden Files

- `www/`
- `src/content.generated.js`
- Android signing files
- Generated build outputs

## Procedure

1. Run `git status --short --branch`.
2. Run `npm run agent:status`.
3. Run the requested validation command, or default to `npm run agent:check`.
4. If validation fails, stop and report the exact command and failure.
5. Do not fix failures unless the current request explicitly asks for fixes.

## Commands

```sh
git status --short --branch
npm run agent:status
npm run agent:check
```

## Stop Condition

Stop after the baseline command passes or the first command fails.

## Report Format

```text
Skill: validation-baseline
Branch:
Commands run:
Result:
Failure, if any:
Next recommended skill:
```
