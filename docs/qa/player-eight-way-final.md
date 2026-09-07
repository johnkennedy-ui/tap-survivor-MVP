# Player eight-way final integration — PLAYER-INTEGRATE057

## Scope and source

Base: `c95e0088fef896b2977ee2abdc35a0a91bdca5b4`. This base already contains eight-way facing,
player directional rendering and lazy sheet loading. No broad port from
`18b14848b18de2d3ed7749e19064cd15813d3075` is needed or included.

Only `directional_player` changes: exact approved PASS055 image, 384 × 1024 RGBA, 3 columns × 8
rows; NW, N, NE, W, E, SW, S, SE; frames 0/1/2 at 8 fps looping. SHA-256:
`d25a8e5f1ee5f38cdf61fa15d5390e772ca575e8444304c68513a55f1da7f26e`.

The run-state factory initializes south-facing presentation state. The normal run updater and the
lifecycle owner's provider-absent fallback advance `animTime` while moving and reset it to zero at
rest. The existing 3-pixel dead zone, speed, position integration, collision clamp, action timer and
all combat/pickup calls remain unchanged. Facing persists at rest. Pause, stopped runs and
first-input gating freeze the clock; delegated updates advance it once, not twice.

Player shooting/action rendering retains priority, legacy flipping, and static-player fallback.
Directional movement retains the existing sheet → static → legacy walk → shape availability
behavior. No renderer, sprite loader, enemy/action asset, combat or save implementation changes.

## Deterministic QA disposition

Assets/sprite sheets are validated deterministically, not through a newly invented debug-catalog
family. The supplied art already has independent PASS055 identity and visual approval (48 runtime +
13 source checks). This task does not claim a new live-browser visual review.

- `npm run smoke:player-eight-way`: exact PNG identity/header, eight metadata rows, nearest-45
  sector boundaries, 128 actual source-crop selections across native/browser render paths, frame
  wrap at 0.375 seconds, real updater-to-draw integration, default/idle/pause/input-gate clocks,
  persistent facing, unchanged movement speed/clamp/action expiry, phase-independent gameplay
  state/calls, read-only rendering, no directional mirroring, lazy loading and
  pending/missing-sheet/action/legacy/shape fallbacks.
- `npm run smoke:eight-way-rendering`: maintained player/enemy/boss coverage, with only player
  registry assertions revised. All nonplayer assertions remain intact.
- `node .agent/player-integrate057-scope.mjs`: exact scoped files, nonplayer
  registry/assembled-content equality against base, generated ESM/mirror equality, exact
  presentation-only source additions, maintained-test preservation, PNG identity and unchanged
  lockfile.
- Required repository gates: generated content/bridges/web, runtime parity, assets/spritesheets,
  content validation, typecheck, globals, full `npm test`, and
  `npm run agent:check -- --fix-format-changed`.

Generated artifacts are produced only by repository commands; `www/` is ignored and never
hand-edited. Detailed commands, exits and evidence hashes accompany the candidate in
`tasks/player-integrate056/result057.json` (outside the commit).

## Remaining independent release gates

The parent must verify fresh main ancestry/integration, inspect the actual final candidate player
animation and approved art in runtime, perform final independent review, and only then carry out
separately authorized push/merge. This worker never pushes, merges or deploys. Shared-runtime parity
is not an Android device test.
