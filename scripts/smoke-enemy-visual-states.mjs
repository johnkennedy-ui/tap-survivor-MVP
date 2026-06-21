import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = new URL("..", import.meta.url).pathname;
const context = { console };
vm.createContext(context);
["src/content.generated.js", "src/render-enemies.js"].forEach((path) => {
  vm.runInContext(readFileSync(join(root, path), "utf8"), context);
});

let failed = false;

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) failed = true;
}

const renderer = context.TapSurvivorRenderEnemies.createEnemyRenderer({
  ctx: {},
  drawSprite() {
    return false;
  },
  spriteSheetRenderer: {},
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
});

const content = context.TapSurvivorContent;
const sheetAnimations = content.assets?.sprites?.spriteSheets?.enemies?.animations || {};
const hexer = content.enemyTypes.find((enemy) => enemy.id === "hexer");
const crimsonHexer = content.enemyTypes.find((enemy) => enemy.id === "crimson_hexer");
const skitter = content.enemyTypes.find((enemy) => enemy.id === "skitter");

function visualEnemy(enemy, overrides = {}) {
  return {
    ...enemy,
    x: 0,
    y: 0,
    radius: enemy.radius || 10,
    attackVisualTimer: 0,
    ...overrides,
  };
}

check("hexer resolves default animation when not attacking", renderer.enemyAnimationState(visualEnemy(hexer)) === "default");
check(
  "hexer resolves attack animation while attackVisualTimer is active",
  renderer.enemyAnimationState(visualEnemy(hexer, { attackVisualTimer: 0.2 })) === "attack",
);
check(
  "crimson_hexer resolves default animation when not attacking",
  renderer.enemyAnimationState(visualEnemy(crimsonHexer)) === "default",
);
check(
  "crimson_hexer resolves attack animation while attackVisualTimer is active",
  renderer.enemyAnimationState(visualEnemy(crimsonHexer, { attackVisualTimer: 0.2 })) === "attack",
);
check(
  "non-ranged enemies still resolve to default animation",
  renderer.enemyAnimationState(visualEnemy(skitter, { attackVisualTimer: 0.2 })) === "default",
);
check("hexer default frames are mapped", sheetAnimations.hexer?.default?.frames?.join(",") === "0,1,2");
check("hexer attack frames are mapped", sheetAnimations.hexer?.attack?.frames?.join(",") === "3,4,5");
check("crimson_hexer default frames are mapped", sheetAnimations.crimson_hexer?.default?.frames?.join(",") === "0,1,2");
check("crimson_hexer attack frames are mapped", sheetAnimations.crimson_hexer?.attack?.frames?.join(",") === "3,4,5");
check(
  "missing attack-state metadata falls back safely",
  sheetAnimations.skitter?.attack === undefined && renderer.enemyAnimationState(visualEnemy(skitter, { attackVisualTimer: 0.2 })) === "default",
);

if (failed) {
  console.error("\nEnemy visual-state smoke failed.");
  process.exit(1);
}

console.log("\nEnemy visual-state smoke passed.");
