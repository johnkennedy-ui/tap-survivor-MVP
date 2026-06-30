# Preflight Runner Reliability

## Status

Complete. Stopped the adapter implementation and completed only the bounded reliability slice. No commit or push performed.

## Starting HEAD

`f8d2a5a`

## Ending HEAD

`f8d2a5a`

## Queue Task ID

`preflight-runner-reliability`

## Files Changed

- `.agent/tasks.json`
- `.gitignore`
- `AGENTS.md`
- `scripts/agent-status.mjs`
- `scripts/frank-run.mjs`
- `Shane training/20260630T134805Z_preflight-runner-reliability/result.md`

## Root Cause Of The Freeze Pattern

The prior orchestration used a wrapper/tool layer that could yield while the child process was still running, leaving the caller with no reliable exit code and no durable live log path. That made a running child look like a completed failed process and forced manual recovery through process checks and reruns.

The repo-local `frank:run` script also used `spawnSync` with temporary capture files that were deleted after completion. It did not preserve a deterministic run directory, live child PID/state, or a durable log path for recovery.

## What Changed To Prevent It

- Reworked `scripts/frank-run.mjs` to use async `spawn` and wait for the child `exit` event before recording the final result.
- Created deterministic run directories under `.agent/runs/<UTC timestamp>_<command>/`.
- Wrote durable command state with command, PID, start/end time, exit code, log path, run path, timeout flag, and status.
- Printed run directory, log path, and PID before the command runs.
- Writes child stdout/stderr directly to the durable command log so output is not lost when the wrapper is quiet, long-running, or timing out.
- Added interruption handling for `SIGINT`/`SIGTERM` with child liveness and last known state.
- Added failure output with failed command, exit code, log path, last 80 log lines, and `git status --short`.
- Updated `npm run agent:status` to show the latest Frank run path and command state.
- Ignored generated `.agent/runs/` logs while preserving failed-run logs locally.
- Added the AGENTS.md rule to stop and report blocked if preflight wrapper state/output/exit handling is unreliable or manual recovery is required.

## Commands Run And Results

- `git fetch origin main`: pass
- `git rev-parse --abbrev-ref HEAD`: `main`
- `git rev-parse --short HEAD`: `f8d2a5a`
- `git rev-parse --short origin/main`: `f8d2a5a`
- `git status --short`: clean before edits
- `npm run task:validate`: pass
- `npm run task:list`: pass; no active task before this slice
- `npm run agent:status`: pass
- `npm run task:add -- --id "preflight-runner-reliability" --summary "..."`
- `npm run task:active -- preflight-runner-reliability`: pass
- `node --check scripts/frank-run.mjs`: pass
- `node --check scripts/agent-status.mjs`: pass
- `npm run frank:run -- "node --check scripts/frank-run.mjs" --timeout 30`: pass; recorded run `.agent/runs/2026-06-30T134711Z_node-check-scripts-frank-run-mjs`
- `npm run task:validate`: pass
- `npm run task:list`: pass
- `npm run agent:status`: pass; latest Frank run displayed with status `passed`, PID, exit code, and log path
- `git diff --name-only`: allowed files only before evidence
- `git diff --check`: pass
- `npm run frank:run -- "node -e \"console.log('start'); setTimeout(() => console.log('done'), 1500)\"" --timeout 10`: pass; durable run directory created and `agent:status` showed status `passed`
- `npm run frank:run -- "node -e \"console.log('start-timeout'); setTimeout(() => console.log('too-late'), 5000)\"" --timeout 1`: expected timeout; exit `124`; durable run directory/log/state created; last 80 log lines included `start-timeout`, timeout marker, exit code, and signal
- `npm run agent:status`: pass; latest Frank run showed status `failed`, exit code `124`, `timed_out: yes`, PID, and log path
- `find .agent/runs -maxdepth 2 -type f | tail -20`: pass; showed command logs and command-state JSON files
- `git status --short`: pass; only expected reliability/evidence files were dirty
- `git diff --check`: pass after timeout-path fix

## Scope Confirmation

No gameplay/runtime/content/Android/deploy files were edited for this reliability slice. The diff is limited to task queue state, Frank runner/status scripts, AGENTS.md, `.gitignore`, and this evidence file.

## Remaining Limitations

- Long-running success and expected-timeout paths were exercised. Interruption handling is implemented but not exercised in this slice.
- The earlier adapter preflight remains blocked by process/output reliability concerns and should not resume without explicit human approval.

## Follow-Up Bug Found And Fixed

The first timeout exercise recorded timeout state but did not preserve immediate child stdout in the durable log. `scripts/frank-run.mjs` now writes child stdout/stderr directly to the command log file descriptor instead of relying on pipe data events. `scripts/agent-status.mjs` now also prints `timed_out: yes/no` for the latest Frank run.
