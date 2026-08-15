import { existsSync } from "node:fs";
import { join } from "node:path";

import { content } from "../src/content.generated.mjs";
import { createSpriteSheetRenderer } from "../src/modules/sprites.js";

const root = new URL("..", import.meta.url).pathname;
const spriteSheets = content.assets?.sprites?.spriteSheets || {};
const enemyIds = ["drifter", "skitter", "bulwark", "hexer", "verdant_skitter", "dusk_crawler", "crimson_hexer", "obsidian_bulwark"];
const bossIds = ["warden", "charger", "turret"];
let failed = false;

function assert(name, condition) {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}`);
  if (!condition) failed = true;
}

function localPath(path) {
  return path.split("?")[0];
}

assert("enemy sprite sheet metadata loads", spriteSheets.enemies?.columns === 6 && spriteSheets.enemies?.rows === 8);
assert("boss sprite sheet metadata loads", spriteSheets.bosses?.columns === 9 && spriteSheets.bosses?.rows === 3);
assert("enemy sprite sheet file exists", existsSync(join(root, localPath(spriteSheets.enemies.path))));
assert("boss sprite sheet file exists", existsSync(join(root, localPath(spriteSheets.bosses.path))));
assert("all enemy ids resolve to animation rows", enemyIds.every((id, row) => spriteSheets.enemies.animations?.[id]?.row === row));
assert(
  "all boss ids resolve to idle/windup/release rows",
  bossIds.every((id, row) => {
    const animation = spriteSheets.bosses.animations?.[id];
    return ["idle", "windup", "release"].every((state) => (animation?.[state]?.row ?? animation?.row) === row && Array.isArray(animation[state].frames));
  }),
);

const renderer = createSpriteSheetRenderer({
  ctx: {
    save() {},
    restore() {},
    translate() {},
    scale() {},
    drawImage() {},
  },
  spriteSheets,
});
assert("sprite sheet renderer returns false when image is unavailable", renderer.drawAnimation("enemies", "drifter", "idle", 0, 0, 32, 32) === false);

if (failed) process.exit(1);
