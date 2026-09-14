import assert from "node:assert/strict";

import { createCombatSystem } from "../src/modules/combat.js";
import { clamp, distance } from "../src/modules/math.js";
import { createRunUpdater } from "../src/modules/run-update.js";

const bounds = { width: 120, height: 60 };
const player = { hp: 100, radius: 10, targetX: 16, targetY: 30, x: 16, y: 30 };
const first = { hp: 20, radius: 10, vx: 0, vy: 0, x: 50, y: 30 };
const second = { hp: 20, radius: 10, vx: 0, vy: 0, x: 54, y: 30 };
const edge = { hp: 20, radius: 10, vx: 0, vy: 0, x: 119, y: 1 };
const dead = { hp: 0, radius: 10, x: -40, y: -40 };
const crowd = Array.from({ length: 18 }, (_, index) => ({
  hp: 20,
  radius: 4,
  vx: 0,
  vy: 0,
  x: 78 + (index % 3),
  y: 28 + (index % 3),
}));
const game = { enemies: [first, second, edge, dead], player, runUpgradeTiers: {} };
let knockback;
const combat = createCombatSystem({
  canvas: { width: 1000, height: 1000 },
  spatial: { physicalSize: () => bounds },
  balance: { floorDifficulty: () => ({ damage: 1, hp: 1, speed: 1 }) },
  combatDamage: {
    createCombatDamageSystem(options) {
      knockback = options.applyRadialKnockback;
      return { damageEnemy() {}, damagePlayer() {}, reapEnemies() {} };
    },
  },
  enemies: { createEnemySystem: () => ({}) },
  weaponFire: {
    createWeaponFireSystem(options) {
      knockback ||= options.applyRadialKnockback;
      return {};
    },
  },
  getGame: () => game,
  getRelicSpecialEffects: () => ({}),
  getShopBonuses: () => ({}),
  getUpgradeTier: () => 0,
  getWeaponDamageMultiplier: () => 1,
  addQuestProgress() {},
  addQuestProgressForWeapon() {},
  addQuestProgressGroup() {},
  clamp,
  distance,
  spawnLootDrops() {},
  weaponBehaviors: {},
  weaponCooldowns: {},
  weaponProjectiles: {},
  weaponTargeting: {},
});

const firstStart = { x: first.x, y: first.y };
combat.resolveActorCollisions(0.1);

for (const actor of [player, first, second, edge]) {
  assert.ok(Number.isFinite(actor.x) && Number.isFinite(actor.y), "living actors remain finite");
  assert.ok(actor.x >= actor.radius && actor.x <= bounds.width - actor.radius, "x stays in physical bounds");
  assert.ok(actor.y >= actor.radius && actor.y <= bounds.height - actor.radius, "y stays in physical bounds");
}
assert.equal(dead.x, -40, "dead actors are not repositioned");
assert.equal(dead.y, -40, "dead actors are not repositioned");
assert.ok(
  distance(player, first) >= player.radius + first.radius - 0.001,
  `player/enemy contact resolves: ${distance(player, first)}`
);
assert.ok(
  distance(first, second) >= first.radius + second.radius - 0.001,
  `enemy/enemy contact resolves: ${distance(first, second)}`
);
assert.ok(Math.abs(first.vx * 0.1 - (first.x - firstStart.x)) < 0.001, "collision velocity is pixels per second");

game.enemies.push(...crowd);
combat.resolveActorCollisions(0.1);
for (const actor of crowd) {
  assert.ok(Number.isFinite(actor.x) && Number.isFinite(actor.y), "crowd contact remains finite");
  assert.ok(actor.x >= actor.radius && actor.x <= bounds.width - actor.radius, "crowd x stays bounded");
  assert.ok(actor.y >= actor.radius && actor.y <= bounds.height - actor.radius, "crowd y stays bounded");
}

const centered = { hp: 20, radius: 10, targetX: 60, targetY: 30, x: 60, y: 30 };
assert.ok(knockback(centered, { x: Number.NaN, y: Number.NaN }, 20, { radius: Number.NaN, targetFollows: true }) > 0);
assert.ok(Number.isFinite(centered.x) && Number.isFinite(centered.y), "invalid blast centers use a finite fallback");
assert.ok(centered.x > 60 && centered.targetX > 60, "center hits separate actor and target together");

for (const [label, px, py, ex, ey] of [
  ["left", 10, 30, 12, 30],
  ["right", 110, 30, 108, 30],
  ["top", 60, 10, 60, 12],
  ["bottom", 60, 50, 60, 48],
]) {
  Object.assign(player, { x: px, y: py });
  const neighbor = { hp: 20, radius: 10, x: ex, y: ey, vx: 0, vy: 0 };
  game.enemies = [neighbor];
  combat.resolveActorCollisions(0.1);
  assert.ok(distance(player, neighbor) >= 19.999, `${label} wall contact transfers blocked separation`);
  const settled = [player.x, player.y, neighbor.x, neighbor.y];
  for (let frame = 0; frame < 20; frame += 1) combat.resolveActorCollisions(0.1);
  assert.deepEqual([player.x, player.y, neighbor.x, neighbor.y], settled, `${label} contact remains settled`);
}

const playerSweep = runtimeSweepFixture("player");
assert.ok(
  distance(playerSweep.player, playerSweep.enemies[0]) >= 19.999,
  "real run updater catches a high-speed player/enemy crossing"
);
assert.ok(
  playerSweep.player.x < playerSweep.enemies[0].x,
  `high-speed player/enemy crossing keeps the actors on their approached sides (${playerSweep.player.x}, ${playerSweep.enemies[0].x})`
);
assert.ok(
  Math.abs(playerSweep.enemies[0].vx) <= 1200,
  "swept correction retains finite pixels-per-second enemy velocity"
);

const firstFrameSweep = runtimeSweepFixture("player", { warm: false });
assert.ok(
  firstFrameSweep.player.x < firstFrameSweep.enemies[0].x,
  "first real updater frame captures pre-movement positions for a high-speed crossing"
);

const spawnedSweep = runtimeSweepFixture("spawned", { warm: false });
assert.ok(
  spawnedSweep.player.x < spawnedSweep.enemies[0].x,
  "newly spawned actors capture their real start before their first movement"
);

const retainedVelocity = runtimeSweepFixture("velocity");
assert.ok(
  Math.abs(retainedVelocity.enemies[0].vx - 50) < 0.000001,
  "two collision phases retain aggregate non-collision enemy velocity"
);

const cooldownSweep = runtimeSweepFixture("cooldown");
assert.ok(
  cooldownSweep.player.x < cooldownSweep.enemies[0].x,
  "ordinary high-speed movement still sweeps while teleport cooldown is active"
);

const enemySweep = runtimeSweepFixture("enemies");
assert.ok(
  distance(enemySweep.enemies[0], enemySweep.enemies[1]) >= 19.999,
  "real run updater catches a high-speed enemy/enemy crossing"
);
assert.ok(
  enemySweep.enemies[0].x < enemySweep.enemies[1].x,
  "high-speed enemies remain on their approached sides"
);

const teleportedSweep = runtimeSweepFixture("teleport");
assert.equal(teleportedSweep.player.x, 250, "teleport cooldown excludes the intentional relocation from sweeping");

const crowdBounds = { width: 240, height: 180 };
const feasibleCrowd = Array.from({ length: 20 }, (_, index) => ({
  hp: 20,
  radius: 6,
  vx: 0,
  vy: 0,
  x: 96 + (index % 5) * 5,
  y: 70 + Math.floor(index / 5) * 5,
}));
const crowdGame = {
  enemies: feasibleCrowd,
  player: { hp: 100, radius: 6, x: 132, y: 92 },
  runUpgradeTiers: {},
};
const crowdCombat = createCollisionCombat(crowdGame, crowdBounds);
const normalCost = measureSolver(createCollisionCombat(
  {
    enemies: Array.from({ length: 20 }, (_, index) => ({
      hp: 20,
      radius: 6,
      x: 20 + (index % 5) * 36,
      y: 20 + Math.floor(index / 5) * 36,
    })),
    player: { hp: 100, radius: 6, x: 220, y: 160 },
    runUpgradeTiers: {},
  },
  crowdBounds
));
const denseCost = measureSolver(crowdCombat);
for (let frame = 0; frame < 10; frame += 1) crowdCombat.resolveActorCollisions(0.1);
assert.ok(maxOverlap([crowdGame.player, ...feasibleCrowd]) <= 0.02, "feasible crowd resolves to a small maximum overlap");
const settledCrowd = feasibleCrowd.map((actor) => [actor.x, actor.y]);
for (let frame = 0; frame < 6; frame += 1) crowdCombat.resolveActorCollisions(0.1);
assert.ok(
  maxPositionDrift(feasibleCrowd.map((actor) => [actor.x, actor.y]), settledCrowd) <= 0.00001,
  "feasible crowd is repeat-frame stable"
);
assert.ok(denseCost < 250 && normalCost < 250, "normal and dense crowd solves stay bounded in measured cost");

const impossibleBounds = { width: 32, height: 32 };
const impossibleGame = {
  enemies: Array.from({ length: 6 }, () => ({ hp: 20, radius: 10, x: 16, y: 16 })),
  player: { hp: 100, radius: 10, x: 16, y: 16 },
  runUpgradeTiers: {},
};
const impossibleCombat = createCollisionCombat(impossibleGame, impossibleBounds);
for (let frame = 0; frame < 4; frame += 1) impossibleCombat.resolveActorCollisions(0.1);
for (const actor of [impossibleGame.player, ...impossibleGame.enemies]) {
  assert.ok(Number.isFinite(actor.x) && Number.isFinite(actor.y), "impossible crowd stays finite");
  assert.ok(actor.x >= actor.radius && actor.x <= impossibleBounds.width - actor.radius, "impossible crowd x stays bounded");
  assert.ok(actor.y >= actor.radius && actor.y <= impossibleBounds.height - actor.radius, "impossible crowd y stays bounded");
}

console.log(`actor collision cost normal=${normalCost.toFixed(3)}ms dense=${denseCost.toFixed(3)}ms`);

console.log("actor physics smoke passed");

function runtimeSweepFixture(kind, { warm = true } = {}) {
  const bounds = { width: 300, height: 100 };
  const playerCrosses = kind === "player" || kind === "cooldown" || kind === "spawned";
  const velocityOnly = kind === "velocity";
  const player = {
    hp: 100,
    radius: 10,
    speed: velocityOnly ? 0 : 1200,
    targetX: playerCrosses ? 40 : velocityOnly ? 280 : 250,
    targetY: 50,
    x: playerCrosses ? 40 : velocityOnly ? 280 : 250,
    y: 50,
    teleportCooldown: kind === "cooldown" ? 1 : 0,
  };
  const enemies =
    kind === "spawned"
      ? []
      :
    kind === "enemies"
      ? [
          { hp: 20, radius: 10, speed: 1200, vx: 0, vy: 0, x: 40, y: 50, motion: 1200 },
          { hp: 20, radius: 10, speed: 1200, vx: 0, vy: 0, x: 160, y: 50, motion: -1200 },
        ]
      : [
          {
            hp: 20,
            radius: 10,
            speed: velocityOnly ? 50 : 1200,
            vx: 0,
            vy: 0,
            x: velocityOnly ? 40 : 160,
            y: 50,
            motion: velocityOnly ? 50 : -1200,
          },
        ];
  const game = {
    duration: 100,
    elapsed: 0,
    enemies,
    enemyBolts: [],
    paused: false,
    player,
    runUpgradeTiers: {},
    running: true,
  };
  let advance = false;
  const combat = createCollisionCombat(game, bounds, {
    spawnEnemies() {
      if (kind === "spawned" && !enemies.length) {
        enemies.push({ hp: 20, radius: 10, speed: 1200, vx: 0, vy: 0, x: 160, y: 50, motion: -1200 });
      }
    },
    updateEnemies(dt) {
      if (!advance) return;
      enemies.forEach((enemy) => {
        enemy.x += enemy.motion * dt;
        enemy.vx = enemy.motion;
      });
      if (kind === "teleport") {
        player.x = 250;
        player.targetX = 250;
        player.teleportCooldown = 1;
      }
    },
  });
  const updater = createRunUpdater({
    canvas: bounds,
    clamp,
    combat,
    endRun() {},
    getGame: () => game,
    getRelicSpecialEffects: () => ({}),
    mapSystem: { applyToGame() {} },
    pickupSystem: { updateLootDrops() {}, updatePickupTexts() {}, updateXpDrops() {} },
    addQuestProgressGroup() {},
    levelQuestIds: [],
    showLevelUp() {},
    survivalQuestIds: [],
    xpQuestIds: [],
  });
  if (warm) updater.update(0.01);
  advance = true;
  if (playerCrosses) player.targetX = 160;
  updater.update(0.1);
  return { enemies, player };
}

function createCollisionCombat(game, bounds, options = {}) {
  return createCombatSystem({
    canvas: bounds,
    spatial: { physicalSize: () => bounds },
    balance: { floorDifficulty: () => ({ damage: 1, hp: 1, speed: 1 }) },
    combatDamage: { createCombatDamageSystem: () => ({ damageEnemy() {}, damagePlayer() {}, reapEnemies() {} }) },
    enemies: {
      createEnemySystem: () => ({
        spawnBoss() {},
        spawnEnemies: options.spawnEnemies || (() => {}),
        updateBossSpecials() {},
        updateEnemies: options.updateEnemies || (() => {}),
        updateEnemyBolts() {},
      }),
    },
    weaponFire: {
      createWeaponFireSystem: () => ({
        updateAreas() {},
        updateBeams() {},
        updateBolts() {},
        updateWeaponBursts() {},
        updateWeapons() {},
      }),
    },
    getGame: () => game,
    getRelicSpecialEffects: () => ({}),
    getShopBonuses: () => ({}),
    getUpgradeTier: () => 0,
    getWeaponDamageMultiplier: () => 1,
    addQuestProgress() {},
    addQuestProgressForWeapon() {},
    addQuestProgressGroup() {},
    clamp,
    distance,
    spawnLootDrops() {},
    weaponBehaviors: {},
    weaponCooldowns: {},
    weaponProjectiles: {},
    weaponTargeting: {},
  });
}

function maxOverlap(actors) {
  let maximum = 0;
  for (let first = 0; first < actors.length; first += 1) {
    for (let second = first + 1; second < actors.length; second += 1) {
      maximum = Math.max(0, actors[first].radius + actors[second].radius - distance(actors[first], actors[second]), maximum);
    }
  }
  return maximum;
}

function measureSolver(combatSystem) {
  const start = performance.now();
  for (let frame = 0; frame < 12; frame += 1) combatSystem.resolveActorCollisions(0.1);
  return performance.now() - start;
}

function maxPositionDrift(current, previous) {
  return current.reduce(
    (maximum, point, index) => Math.max(maximum, Math.hypot(point[0] - previous[index][0], point[1] - previous[index][1])),
    0
  );
}
