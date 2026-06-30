# Agent Token Budget

Default to mission-sized slices. A mission should be one coherent batch with one queue task,
one evidence file, one final validation gate, one commit/push, and one GitHub Actions check
after the final push only.

Use a cheap start gate at mission start: branch, local HEAD, origin/main when available,
worktree state, task queue state, and the latest status tail. Run `npm run agent:mission-start`
for this normal mission check. Do not run full preflight before inspection unless the task or
repo state requires it.

Avoid token churn:

- Do not repeat broad repo scans unless needed to locate a symbol.
- Do not reread full context docs after the mission is already anchored.
- Do not split tiny docs-only polish slices unless they unblock execution.
- Do not run full preflight before every small edit.
- Do not run broad formatting.
- Do not run Prettier over the whole repo.
- Use `npm run agent:check -- --fix-format-changed` before the final validation gate.
- Plain `npm run agent:check` remains check-only for CI.
- Do not create repeated stop/start commit approval loops inside one mission.
- Do not check GitHub Actions after every tiny commit.

Hard blockers stop the mission: wrong branch, local HEAD not matching the required base,
dirty worktree before edit, invalid queue state, failing required validation, forbidden file
changes, missing credentials for a required external action, or unclear user intent that affects
scope.

Nervous blockers do not stop the mission: discomfort with a larger controlled batch, desire to
reread context that was already inspected, preference for another polish slice, or uncertainty
that can be resolved with focused inspection and a final validation gate.

Recommended lifecycle:

```text
start gate -> queue task -> focused inspection -> implementation batch -> focused checks -> npm run agent:check -- --fix-format-changed -> evidence -> task complete/blocked -> commit/push -> one Actions check
```
