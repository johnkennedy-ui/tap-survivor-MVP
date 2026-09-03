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
- `content-creation-blueprint.md`:
  add a new content asset or feature definition through any registry domain,
  with its generation, validation, and debug/QA route defined up front.
- `mechanics-extension.md`:
  add a small gameplay mechanic or runtime behavior.
- `play-release-aab.md`:
  prepare or validate a Play release Android App Bundle.
- `device-qa-smoke-test.md`:
  run or document a hands-on device QA pass.
- `handoff-evidence.md`:
  prepare a concise repo handoff or evidence bundle.
- `commit-evidence.md`:
  prove committed files match an agent's report.
- `release-candidate.md`:
  prove a Play/internal-testing release candidate can be built without secrets.
- `task-scope.md`:
  prove changed files stay inside the task's allowed and forbidden scope.
- `ci-gate.md`:
  add or verify GitHub Actions non-secret validation checks.

## Selection Guide

Prefer the narrowest skill that fully covers the request.

Use `content-creation-blueprint.md` when adding a new content entry, extending
a content family, or coordinating cross-domain content such as a weapon with
its unlock, quest, assets, and debug coverage. Use `content-patch.md` only for
a narrow edit to an already-established content path.

If a request names multiple outcomes, choose the first required skill and stop after its report unless the human explicitly asked for a multi-skill sequence.

If a request is ambiguous between docs-only and code changes, choose the docs-only path only when the user explicitly says documentation only.

If the task is complete and needs proof that the committed files match the report, use `docs/skills/commit-evidence.md`.

If the task is to prove a Play/internal-testing release candidate, use `docs/skills/release-candidate.md`.

If verifying that a task touched only permitted files, use `docs/skills/task-scope.md`.

If editing CI or GitHub Actions, use `docs/skills/ci-gate.md`.

If a task changed JS, MJS, Markdown, JSON, YAML, or CSS files and is ready to commit, use `docs/skills/prettier-before-commit.md` before committing.

If the selected skill's forbidden files include a file that must be edited to satisfy the task, stop and report the conflict.
