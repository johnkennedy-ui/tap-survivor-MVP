# Directional v1 atlases

These delivery atlases are normalized to 576x576 RGBA with a 3x3, 192px-cell layout:
`NW / N / NE`, `W / empty / E`, `SW / S / SE`.

Identity coverage: player, drifter, skitter, bulwark, hexer, verdant_skitter, dusk_crawler,
crimson_hexer, obsidian_bulwark, warden, charger, and turret. The player keeps the prior
prototype's wizard identity but its rear-facing row was corrected with built-in OpenAI image
generation. Enemy and boss images were generated with the same capability. Prompts required
one identity, eight genuine views, transparent alpha, and no checkerboard/background/text.
They are not claimed as hand-authored art.

Normalization was performed with `node scripts/pack-directional-atlas.mjs SOURCE --out OUT
--cell 192 --margin 12`; the packer reserves a 12px transparent edge margin in every cell.
The center cell is empty and all directional cells are independently validated by
`npm run smoke:directional-atlases`. The same check enforces a 5,000,000-byte aggregate PNG
transfer budget and a 16,000,000-byte aggregate decoded-RGBA budget. The production browser
registers sheet metadata at startup but requests each PNG only when its animation is first drawn.
