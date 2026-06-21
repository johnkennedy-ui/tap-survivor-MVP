import { createGameHarness } from "./smoke-game-harness.mjs";

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

const harness = createGameHarness();
harness.elements.get("titleStartGame").click();
harness.elements.get("game").listeners.get("mousedown")({ clientX: 640, clientY: 270, buttons: 1 });
harness.frame(1000);
harness.frame(1050);

const game = harness.context.__tapSurvivorHarness.getGame();
check("map resolver returns an active map", Boolean(game.activeMap?.id));
check("map resolver returns an active floor", Boolean(game.activeFloor?.id));
check("map modifiers are exposed as object", game.mapModifiers && typeof game.mapModifiers === "object" && !Array.isArray(game.mapModifiers));
check("background info is exposed to rendering", game.background?.spriteId === "background:tower_floor");
check("active floor pool is exposed", Array.isArray(game.floorPool) && game.floorPool.length > 0);

const allowedEnemyIds = new Set(game.activeFloor.enemyIds || []);
check(
  "enemy spawning works with resolved floor pools",
  game.enemies.length > 0 && game.enemies.every((enemy) => allowedEnemyIds.has(enemy.type)),
);

if (process.exitCode) {
  console.error("\nMap runtime smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nMap runtime smoke passed.");
