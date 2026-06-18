# Mechanic Extension Guide

## Weapon Behavior Extensions

- Keep `src/weapon-fire.js` as the public integration entry point for combat.
- Add or change projectile-only behavior in `src/weapon-projectiles.js`.
- Add or change non-projectile behavior in `src/weapon-behaviors.js`.
- Add or change cooldown, damage, reach, width, or projectile-size scaling in `src/weapon-cooldowns.js`.
- Add or change target selection helpers in `src/weapon-targeting.js`.
- Load any new helper before `src/weapon-fire.js` in `index.html` and VM harnesses.
- Do not hand-edit `src/content.generated.js`; change content source and rebuild generated content instead.
