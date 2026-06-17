# Tap Survivor Skill Router

Use this router before repository work that can be handled by one bounded routine.

## Routing Rules

- Select exactly one skill for the current task.
- Load only the selected skill file.
- Do not read unrelated skill files.
- Do not inspect the whole repo unless the selected skill requires it.
- Execute only the selected skill.
- Stop after the selected skill stop condition.
- Report the evidence required by that skill.
- If no skill matches, stop and report: "No matching skill selected."

## Skill Index

- `validation-baseline.md`:
  run baseline checks before edits or after small changes.
- `runtime-parity.md`:
  verify GitHub.io and Android share the same built runtime.
- `android-debug-build.md`:
  build and verify a local Android debug APK.
- `save-lifecycle.md`:
  inspect or change save creation, migration, storage, and corruption handling.
- `format-hygiene.md`:
  check or improve source/doc readability without behavior changes.
- `file-split-maintainability.md`:
  split large files into small helper files while preserving public APIs.
- `content-patch.md`:
  patch game content through the content JSON pipeline.
- `mechanics-extension.md`:
  add a small gameplay mechanic or runtime behavior.
- `play-release-aab.md`:
  prepare or validate a Play release Android App Bundle.
- `device-qa-smoke-test.md`:
  run or document a hands-on device QA pass.
- `handoff-evidence.md`:
  prepare a concise repo handoff or evidence bundle.

## Selection Guide

Prefer the narrowest skill that fully covers the request.

If a request names multiple outcomes, choose the first required skill and stop after its report unless the human explicitly asked for a multi-skill sequence.

If a request is ambiguous between docs-only and code changes, choose the docs-only path only when the user explicitly says documentation only.

If the selected skill's forbidden files include a file that must be edited to satisfy the task, stop and report the conflict.
