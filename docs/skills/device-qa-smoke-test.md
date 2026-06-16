# Skill: Device QA Smoke Test

## Use When

- The user asks for hands-on Android or browser QA.
- A debug APK or deployed runtime needs manual smoke coverage.
- Touch input, startup, save persistence, audio, or gameplay flow needs device confirmation.

## Do Not Use When

- No device or browser runtime is available.
- The task only needs automated validation.
- The request requires Play Console or production rollout.

## Goal

Run a small repeatable manual QA pass and record what was observed.

## Allowed Files

- `docs/CURRENT_TASK.md`
- `docs/tasks/**` evidence files
- QA notes requested by the user

## Forbidden Files

- Source changes unless a separate skill is selected
- `www/` by hand
- Android signing secrets
- Device private data unrelated to the app

## Procedure

1. Identify the artifact or URL under test.
2. List the exact smoke scenarios.
3. Run startup, tap-to-move, first combat, pause/resume, save reload, and audio checks as relevant.
4. Capture concise observations and failures.
5. Do not fix failures under this skill.

## Commands

```sh
git status --short --branch
npm run android:debug
npm run smoke:start-run
npm run smoke:audio
```

## Stop Condition

Stop after the agreed smoke scenarios are recorded or device access blocks the pass.

## Report Format

```text
Skill: device-qa-smoke-test
Artifact or URL:
Scenarios:
Observed result:
Failures:
Source changed: no
Next recommended skill:
```
