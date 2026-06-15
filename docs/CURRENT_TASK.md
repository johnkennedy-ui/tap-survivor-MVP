# Current Agent Task

This file is the repo-local checkpoint for the active Tap Survivor task. Update it at the start of each agent pass, keep it short, and clear or replace stale details before starting unrelated work.

## Active Goal

Wire skill effect sprite sheets 2-5

## Status

- State: validated locally
- Started: 2026-06-15T07:43:24.485Z
- Owner: Frank / OpenClaw

## Files Likely Involved

- `docs/CURRENT_TASK.md`
- `content/tap-survivor-content.json`
- `src/content.generated.js`
- `src/level-up.js`
- `src/sprites.js`
- `scripts/verify-mvp.mjs`
- `index.html`
- `assets/generated/tower/skill-effects/split/`
- `assets/generated/tower/skill-effects/batch-02.jpg`
- `assets/generated/tower/skill-effects/batch-03.jpg`
- `assets/generated/tower/skill-effects/batch-04.jpg`
- `assets/generated/tower/skill-effects/batch-05.jpg`

## Files Changed

- `content/tap-survivor-content.json`
- `src/content.generated.js`
- `src/level-up.js`
- `src/sprites.js`
- `scripts/verify-mvp.mjs`
- `index.html`
- `docs/CURRENT_TASK.md`
- `assets/generated/tower/skill-effects/split/`
- `assets/generated/tower/skill-effects/batch-02.jpg`
- `assets/generated/tower/skill-effects/batch-03.jpg`
- `assets/generated/tower/skill-effects/batch-04.jpg`
- `assets/generated/tower/skill-effects/batch-05.jpg`

## Validation Plan

Run the smallest command that proves the change:

```bash
npm run agent:check
```

Result:

- `npm run build:content`: passed.
- `npm run validate:content`: passed.
- `node scripts/verify-mvp.mjs`: passed 249 checks, including all five user skill effect atlases and split sprite paths.
- `npm run smoke:start-run`: passed.
- `npm run agent:prepush`: passed; cache keys bumped for changed runtime/content files.

## Evidence Required

- Files inspected.
- Files changed.
- Validation commands and results.
- Evidence stub when useful.
- Remaining risks or follow-up tasks.

## Stop Condition

Stop after the requested single change is implemented, validated, documented, and reported.
