# Skill: Release Candidate

## Use When

- Before Play internal testing upload.
- Before release-candidate branch or PR merge.
- After major Android, runtime, save, or mechanic changes.

## Goal

Prove the repo can build a validated release candidate without secrets.

## Command

```sh
npm run release:candidate
```

## What It Checks

The gate runs these checks in fixed order:

- Formatting.
- Format hygiene.
- Package ID.
- Content build and validation.
- Tests.
- Agent check.
- Shared web runtime.
- Runtime parity.
- Android sync.
- Debug APK build.
- Local release AAB build.

## What It Does Not Check

- Play Console upload.
- Signed AAB.
- Store listing.
- Data safety.
- Real-device manual QA.

## Stop Condition

Stop when all steps pass, or report the exact failing step.

## Report Format

```text
Skill: release-candidate
Branch:
Commit:
Command run:
First failing step:
APK path:
AAB path:
Git status:
Next recommended task:
```
