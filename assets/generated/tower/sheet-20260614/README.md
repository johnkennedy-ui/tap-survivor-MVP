User-provided sprite sheet from Telegram message 22838, split into per-sprite PNG files on 2026-06-14.

Mapped into game content:
- drifter: spider-brown.png
- skitter: spider-red.png
- bulwark: crystal-golem.png
- hexer: necromancer-hexer.png
- boss: demon-boss.png

Unused sheet sprites are kept in this folder for future enemy variants, boss variants, player animation frames, or death/attack states.

Directional v1 provenance and layout
------------------------------------
The player atlas `wizard-eight-way-run-v1.png` retains the prior project prototype's wizard
identity and was corrected with built-in OpenAI image generation so its north-facing row shows
genuine rear views. The generated enemy and boss atlases in `../directional-v1/` were made with
the same image-generation capability. Prompts required one identity, eight genuine views,
transparent alpha, and no checkerboard, background, or text; these are generated assets, not
hand-authored art.

All delivery atlases are 576x576 RGBA PNGs with 192px cells in this layout:
`NW / N / NE`, `W / empty / E`, `SW / S / SE`.
The center cell is intentionally empty. Registry IDs are `directional_player` and
`directional_<identity>`, each exposing the eight single-frame states through one `move` animation.
The optimized delivery size retains more source pixels than the current largest directional draw,
while the browser loads sheets on demand instead of requesting every atlas on the title screen.
