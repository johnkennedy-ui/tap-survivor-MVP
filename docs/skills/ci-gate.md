# Skill: CI Gate

## Use When

- Adding or editing GitHub Actions.
- Checking whether repo validation is enforced remotely.

## Goal

Make GitHub Actions prove non-secret checks.

## CI Checks

- Format.
- Format hygiene.
- Package ID.
- Content build and validation.
- Tests.
- Agent check.
- `build:web`.
- Runtime parity.
- Helper script availability.

## Not Included

- Signing.
- Play upload.
- Keystores.
- Android debug build.
- Android release bundle.

## Stop Condition

Stop when the workflow exists and local equivalent checks pass.

## Report Format

```text
Skill: ci-gate
Workflow path:
Triggers:
Job names:
Checks included:
Checks intentionally excluded:
Local validation result:
```
