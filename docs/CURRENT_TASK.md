# Current Agent Task

This file is an optional repo-local checkpoint for a Tap Survivor task. It is housekeeping only and may be stale; use the conversation and current git diff as the source of truth.

## Active Goal

Split weapon fire system into helper files

## Status

- State: complete
- Started: 2026-06-18T07:25:35.172Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `docs/AGENT_CODEBASE_CONTEXT.md`
- `docs/MECHANIC_EXTENSION_GUIDE.md`
- `index.html`
- `scripts/smoke-game-harness.mjs`
- `scripts/verify-speed-controls.mjs`
- `src/weapon-fire.js`
- `src/weapon-projectiles.js`
- `src/weapon-cooldowns.js`
- `src/weapon-behaviors.js`

## Files Changed

- `src/weapon-fire.js` remains the public weapon-fire integration entry point.
- `src/weapon-cooldowns.js` owns cooldown, stat, and projectile-skill scaling.
- `src/weapon-projectiles.js` owns projectile firing, bolt spawning, bounces, split-on-hit, and explosions.
- `src/weapon-behaviors.js` owns beam, cone, radial, chain, target-area, lingering-area, mine, area, beam, and burst updates.
- `index.html` and VM harnesses load weapon helpers before `src/weapon-fire.js`.
- `docs/AGENT_CODEBASE_CONTEXT.md` and `docs/MECHANIC_EXTENSION_GUIDE.md` document weapon helper ownership.

## Validation Plan

Run the smallest command that proves the change:

```bash
node --check src/weapon-fire.js
node --check src/weapon-targeting.js
node --check src/weapon-projectiles.js
node --check src/weapon-behaviors.js
node --check src/weapon-cooldowns.js
npm run check:format-hygiene
npm run build:content
npm run validate:content
npm run smoke:start-run
npm run smoke:quest-flow
npm test
npm run agent:check
npm run build:web
npm run check:runtime-parity
npm run android:sync
npm run android:debug
git diff --check
```

Result:

- Passed.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
