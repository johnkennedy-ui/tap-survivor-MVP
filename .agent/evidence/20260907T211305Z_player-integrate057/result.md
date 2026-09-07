# PLAYER-INTEGRATE057 evidence

- Addressed to: `terra-worker`; repository: `tasks/player-integrate056/worktree`.
- Checked-out base before edits: `c95e0088fef896b2977ee2abdc35a0a91bdca5b4`.
- Assigned branch: `frank/player-eight-way-final-056`.
- Contract SHA-256: `324c8080637d9dd07ffe2fc80d8ee184c32430d650f11b8d19f9f7a04b480faf`.
- Own goal: `61364d36-8f69-46e1-af35-79730bed7c9f`; ID and ACTIVE verified before work.
- Parent goal: `3c1f72e7-cb04-4baf-81c7-edb2914a2392`.
- Contract checked at 2026-09-07 22:10 London; deadline 22:48 London.
- Access: scoped assigned-worktree read/write, offline Node 22, local Git candidate commit only. No network, installs, push, merge, or deploy.
- Initial tracked worktree clean; only prior `.agent/evidence/20260907T202229Z_player-integrate056-scope-blocker/result.md` untracked. Preserved using an exact directory entry appended to inspected repository-local `.git/info/exclude`.
- Node: `v22.23.2`; lockfile SHA-256: `2fc23036903441341bbb48b14c53b4f555d8196340783a0a1c1516410499ad0b`.
- Skill: content-creation-blueprint, with explicitly scoped existing presentation clock support. Prettier-before-commit required by repository instructions.
- Asset QA disposition: deterministic validation plus inherited independent PASS055 visual review; no new art generation or claimed live browser review.
- Base already owns directional rendering, nearest-45 heading resolution, persistent facing and lazy loading. No feature-branch port needed.

## Implementation

- Copied approved PNG exactly; input, committed asset candidate and generated web asset all hash to `d25a8e5f1ee5f38cdf61fa15d5390e772ca575e8444304c68513a55f1da7f26e`.
- Changed only `directional_player` registry metadata; all nonplayer content is structurally equal to base.
- Added four presentation defaults and one two-line clock addition in each existing update path. No renderer or loader changes, no gameplay/save changes.
- Generated content mirror/ESM and run-state/run-update/game-dependencies bridges using repository commands. Built shared `www/`; never hand-edited generated output.
- Extended maintained player registry assertions only; kept all other existing assertions byte-identical. Added focused player smoke to `npm test`, without removing any checks.
- Added replayable scoped proof: `node .agent/player-integrate057-scope.mjs`.

## Validation

All commands below exited 0 on the final implementation:

- `npm run build:content`.
- `npm run smoke:player-eight-way`: 128 actual frame crops across native/browser rendering; heading boundaries, normal/delegated/fallback clocks, movement/input/pause/idle behavior, action/static/shape fallbacks, lazy loading, non-mutation and exact PNG.
- `npm run smoke:eight-way-rendering`: all maintained actor/state/fallback coverage.
- `npm run build:web`: includes `build:content` and `build:bridges`.
- `npm run check:runtime-parity`.
- `node .agent/player-integrate057-scope.mjs`: all 19 changed paths in scope; other content, gameplay source, test coverage and lockfile preserved.
- `npm run agent:check -- --fix-format-changed`: FULL gate passed, including format/hygiene, globals, typecheck, content drift/validation, assets, sprite sheets, saves, run start/boss, module/bridge/readiness, actual Chromium browser smoke, and full `npm test` including both eight-way tests.
- `git diff --check`.

Full gate log: `.agent/runs/2026-09-07T212243Z_npm-run-agent-check-fix-format-changed/command.log`.
SHA-256: `73e9d23a64e3373e3d719e5181bce1820414d33b5c016863e80446f831cbc3bf`.
Runtime parity log SHA-256: `4ed0f2e1ccfecc489be09bef5d24ded4b0b7833711b10e31f0b577eda43cac86`.
Prior worker evidence remains unchanged: SHA-256 `4028282f3a9548faad9cd93024fc037762de5eb6cd0e8d69f6db9882a43878b6`.

Earlier development failures were recorded and fixed without weakening tests:

1. Focused smoke exited 1 because the new lifecycle test fixture lacked `shellUi: {}`; fixture corrected, then passed.
2. Scope verifier exited 1 because its initial exact list omitted three contract-authorized generated bridge paths; inspected generated diffs and corrected that list, then passed.
3. First final gate exited 1 for overlong lines in the new QA document; wrapped that document using offline Prettier, then the full gate passed.

No wrapper state loss, timeouts, manual child recovery, unresolved test failure, install, network dependency fetch, skipped required gate, or unrelated test bypass. Existing Node module-type warnings remain unchanged.

## Handoff

The local candidate is for parent verification, not approval to release. Remaining gates: fresh-main candidate integration verification, independent actual-player runtime/art review, final review, and parent-only authorized push/merge. Generic Chromium smoke passed but is not the independent final player visual review or an Android device test.

Final candidate/tree/changed-file/command-log hashes go in external `tasks/player-integrate056/result057.json` after commit to avoid self-referential commit evidence. The existing task queue had no active or queued task and was left unchanged.
