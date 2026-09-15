import assert from "node:assert/strict";
import { createEnemyBehaviorSystem } from "../src/modules/enemy-behaviors.js";
import { createEnemySpawnSystem } from "../src/modules/enemy-spawning.js";
import { createWorldSpatialRuntime } from "../src/modules/world-spatial-runtime.js";

const canvas = { width: 1000, height: 600 };
const spatial = createWorldSpatialRuntime({ canvas });
const wall = Object.freeze({ x: 430, y: 80, width: 40, height: 360 });
const world = Object.freeze({
  modeId: "climb",
  ...canvas,
  zoom: 1.25,
  solidWalls: Object.freeze([wall]),
});
const game = {
  world,
  elapsed: 0,
  towerFloor: 1,
  spawnTimer: 0,
  enemies: [],
  bossAttacks: [],
  enemyBolts: [],
  player: { x: 800, y: 180, radius: 16, hp: 100 },
};
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const behavior = createEnemyBehaviorSystem({
  canvas,
  spatial,
  getGame: () => game,
  distance,
  clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
  damagePlayer: () => {},
});
const baseEnemy = () => ({
  x: 280,
  y: 180,
  radius: 16,
  speed: 900,
  hp: 10,
  damage: 1,
  touchTimer: 999,
  animTime: 0,
  attackVisualTimer: 0,
});
for (const ranged of [false, true]) {
  const enemy = {
    ...baseEnemy(),
    ...(ranged ? { attackRange: 100, projectileCooldown: 2, shootTimer: 100 } : {}),
  };
  game.enemies = [enemy];
  for (const dt of [0.4, 0.03, 0.5, 0.07, 0.2, 0.4, 0.4, 0.1]) {
    behavior.updateEnemies(dt);
    assert.ok(clear(enemy), "actual melee/ranged chase obeys terrain under variable dt");
  }
  assert.ok(
    distance(enemy, game.player) <= 85,
    "actual chaser completes the wall detour without waypoint oscillation"
  );
}
const drop = {
  ...baseEnemy(),
  boss: true,
  dropTimer: 1,
  dropWindup: 1,
  startX: 320,
  startY: 180,
  landingX: 620,
  landingY: 180,
  x: 320,
  radius: 38,
  speed: 0,
};
game.enemies = [drop];
behavior.updateEnemies(0.5);
assert.ok(drop.x <= 392.001 && clear(drop), "actual boss drop is terrain-resolved");
const charger = {
  ...baseEnemy(),
  boss: true,
  bossKind: "charger",
  radius: 38,
  chargeState: "charging",
  chargeTimer: 9,
  chargeDirX: 1,
  chargeDirY: 0,
  chargeSpeed: 2000,
};
game.enemies = [charger];
behavior.updateEnemies(0.4);
assert.ok(
  charger.x <= 392.001 && clear(charger),
  "actual high-speed boss charge cannot tunnel through terrain"
);

let clearanceCalls = 0;
const spawnSpatial = {
  ...spatial,
  spawnPosition: () => ({ x: 450, y: 200 }),
  openPosition: (...args) => {
    clearanceCalls += 1;
    return spatial.openPosition(...args);
  },
};
const spawn = createEnemySpawnSystem({
  canvas,
  spatial: spawnSpatial,
  enemyTypes: [
    { id: "terrain-witness", name: "Witness", radius: 16, hp: 2, speed: 1, damage: 1, xp: 1 },
  ],
  getGame: () => game,
  floorDifficulty: () => ({ hp: 1, damage: 1, spawnRate: 1 }),
  scaledProjectileCooldown: (v) => v,
  scaledProjectileSpeed: (v) => v,
});
game.enemies = [];
game.spawnTimer = -1;
spawn.spawnEnemies(0.1);
assert.ok(
  game.enemies.length > 0 && clearanceCalls === game.enemies.length,
  "each actual spawn invokes shared terrain clearance"
);
assert.ok(
  game.enemies.every(clear),
  "forced inside-wall spawn is relocated outside the actual wall"
);
assert.equal(
  clear({ x: 450, y: 200, radius: 16 }),
  false,
  "negative control rejects the uncorrected spawn point"
);
console.log(
  JSON.stringify({
    decision: "PASS",
    actualPaths: ["melee", "ranged", "boss-drop", "boss-charge", "spawn"],
    clearanceCalls,
  })
);

function clear(actor) {
  return (
    Math.hypot(
      actor.x - Math.max(wall.x, Math.min(wall.x + wall.width, actor.x)),
      actor.y - Math.max(wall.y, Math.min(wall.y + wall.height, actor.y))
    ) >=
    actor.radius - 0.001
  );
}
