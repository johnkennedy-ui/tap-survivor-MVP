# Approved player movement atlas

`player-move-8way-v2.png` is the exact approved PASS055 image, copied without decoding,
recompositing, or regeneration.

- SHA-256: `d25a8e5f1ee5f38cdf61fa15d5390e772ca575e8444304c68513a55f1da7f26e`
- PNG: 384 × 1024, 8-bit RGBA; 3 columns × 8 rows of 128 × 128 cells.
- Row order: NW, N, NE, W, E, SW, S, SE.
- Each row: frames 0, 1, 2 at 8 fps, looping while moving.
- Idle: frame 0 in the last movement heading (south for a fresh run).
- Logical registry ID: `directional_player`; existing generated tower art source applies.
- Player action/shooting art retains priority and its existing fallback path. No other actor/action
  atlas changes.

Deterministic source/registry/rendering coverage: `npm run smoke:player-eight-way` and
`npm run smoke:eight-way-rendering`. Inherited art review: PASS055 (48 runtime checks, 13 source
checks, identity). Final integration/UI review remains an independent parent gate.
