import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createWorldSpatialRuntime } from "../src/modules/world-spatial-runtime.js";
import { createRunStateSystem } from "../src/modules/run-state.js";
import { createRunUpdater } from "../src/modules/run-update.js";
import { createRunLifecycle } from "../src/modules/run-lifecycle.js";
import { createEnemySystem } from "../src/modules/enemies.js";
import { createEnemySpawnSystem } from "../src/modules/enemy-spawning.js";
import { createEnemyBehaviorSystem } from "../src/modules/enemy-behaviors.js";
import { createWeaponProjectileSystem } from "../src/modules/weapon-projectiles.js";
import { createWeaponBehaviorSystem } from "../src/modules/weapon-behaviors.js";
import { createCombatDamageSystem } from "../src/modules/combat-damage.js";
import { createPickupSystem } from "../src/modules/pickups.js";
import { createGameDependencyBag } from "../src/modules/game-dependencies.js";
import { createGameRuntimeController } from "../src/modules/game-runtime.js";
import { balanceProfiles, content as generatedContent } from "../src/content.generated.mjs";
import { bootProductionModuleEntrypoint } from "../src/app/production-module-entrypoint.js";
import { createGameHarness } from "./smoke-game-harness.mjs";

const canvas = { width: 960, height: 540 };
const spatial = createWorldSpatialRuntime({ canvas });
const noop = () => {};
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const approx = (actual, expected, label = "numeric value") =>
  assert.ok(Math.abs(actual - expected) < 1e-8, `${label}: ${actual} != ${expected}`);
const save = { towerFloor: 1, coins: 0 };
function stateFactory(provider = spatial) {
  return createRunStateSystem({
    canvas,
    spatial: provider,
    getSave: () => save,
    getShopBonuses: () => ({ maxHp: 0, speed: 0, pickupRadius: 0 }),
    getUpgradeTier: () => 0,
    maxEquippedWeapons: () => 4,
  });
}
const state = stateFactory();
function fresh(modeId = "climb") {
  return state.resetGameState({ modeId });
}
function randomSequence(values, fn) {
  const original = Math.random;
  let calls = 0;
  Math.random = () => {
    assert.ok(calls < values.length, "unexpected extra RNG call");
    return values[calls++];
  };
  try {
    const result = fn();
    assert.equal(calls, values.length, "RNG call count");
    return result;
  } finally {
    Math.random = original;
  }
}

for (const modeId of ["climb", "farm"]) {
  const run = fresh(modeId);
  const expected =
    modeId === "climb"
      ? { modeId, width: 2880, height: 1620, zoom: 1.25 }
      : { modeId, width: 960, height: 540, zoom: 1 };
  assert.deepEqual(run.world, expected);
  assert.equal(run.player.x, expected.width / 2);
  assert.equal(run.player.y, expected.height / 2);
  assert.equal(run.player.targetX, run.player.x);
  assert.equal(run.player.targetY, run.player.y);
  assert.ok(Object.isFrozen(run.world));
  const supplied = { ...run.world };
  const copied = state.resetGameState({ modeId, world: supplied });
  supplied.width = 1;
  supplied.zoom = 99;
  assert.deepEqual(copied.world, expected);
  assert.notEqual(copied.world, supplied);
  let active = run;
  const lifecycle = createRunLifecycle({
    ui: { relicChoice: { classList: { add: noop } } },
    getGame: () => active,
    getSave: () => save,
    resetGameState: (options) => (active = state.resetGameState(options)),
    relicSystem: { relicChoices: () => [] },
    persist: noop,
    renderMeta: noop,
    updateRunHud: noop,
  });
  for (let floor = 0; floor < 6; floor++) {
    lifecycle.advanceTowerFloor();
    assert.deepEqual(
      active.world,
      expected,
      "boss continuation must not multiply a supplied world"
    );
    assert.equal(active.modeId, modeId);
    assert.ok(Object.isFrozen(active.world));
  }
}
save.towerFloor = 1;
const legacy = stateFactory(null).resetGameState({ modeId: "farm" });
assert.equal(legacy.player.x, 480);
assert.equal(legacy.player.y, 270);
assert.deepEqual(fresh("unknown").world, fresh().world);
const fixed = fresh();
canvas.width = 1000;
canvas.height = 600;
assert.equal(spatial.physicalSize(fixed).width, 2880);
assert.equal(spatial.physicalSize(fixed).height, 1620);
assert.deepEqual(fresh().world, { modeId: "climb", width: 3000, height: 1800, zoom: 1.25 });
canvas.width = 960;
canvas.height = 540;
assert.deepEqual(createWorldSpatialRuntime({ canvas, worldScale: 2, zoom: 1.5 }).createRunWorld(), {
  modeId: "climb",
  width: 1920,
  height: 1080,
  zoom: 1.5,
});
console.log(
  "PASS fresh/copy-safe fixed worlds, mode restart, viewport change and six boss continuations per mode"
);

function updater(game, provider = spatial) {
  const combat = Object.fromEntries(
    [
      "spawnBoss",
      "spawnEnemies",
      "updateEnemies",
      "updateEnemyBolts",
      "updateBossSpecials",
      "updateWeapons",
      "updateBolts",
      "updateAreas",
      "updateBeams",
      "updateWeaponBursts",
    ].map((k) => [k, noop])
  );
  return createRunUpdater({
    canvas,
    spatial: provider,
    getGame: () => game,
    combat,
    pickupSystem: { updateXpDrops: noop, updateLootDrops: noop, updatePickupTexts: noop },
    addQuestProgressGroup: noop,
    showLevelUp: noop,
    endRun: noop,
    clamp,
  });
}
for (const modeId of ["climb", "farm"]) {
  const game = fresh(modeId),
    p = game.player,
    update = updater(game);
  p.targetX += 1000;
  update.update(1);
  assert.equal(p.x, game.world.width / 2 + 185, "speed remains 185 simulation units/second");
  for (const [x, y, expectedX, expectedY] of [
    [-1000, -1000, 56, 56],
    [1e6, -1000, game.world.width - 56, 56],
    [-1000, 1e6, 56, game.world.height - 56],
    [1e6, 1e6, game.world.width - 56, game.world.height - 56],
  ]) {
    Object.assign(p, { x, y, targetX: x, targetY: y });
    update.update(0);
    assert.equal(p.x, expectedX);
    assert.equal(p.y, expectedY);
  }
  if (modeId === "climb") assert.ok(p.x > 960 && p.y > 540);
}
console.log("PASS player speed and visual-safe physical-world clamps beyond old bounds");

// Out-of-world targets still reconcile, independently of interaction reach.
// Production save/upgrades and directional controls are exercised by the
// world-view-input smoke; here isolate the physical and legacy contracts.
for (const modeId of ["climb", "farm"]) {
  for (const pickupRadius of [54, 76, 342.25, 364.25]) {
    const game = fresh(modeId);
    const update = updater(game);
    const p = game.player;
    p.pickupRadius = pickupRadius;
    for (const [x, y, targetX, targetY] of [
      [56, 56, -1000, -1000],
      [game.world.width - 56, game.world.height - 56, 1e6, 1e6],
    ]) {
      Object.assign(p, { x, y, targetX, targetY });
      for (let frame = 0; frame < 240; frame++) update.update(1 / 60);
      assert.deepEqual(
        [p.x, p.y, p.targetX, p.targetY, p.moving, p.animTime],
        [x, y, x, y, false, 0],
        "stable body-safe bounds reconcile illegal targets without perpetual walking"
      );
      assert.equal(p.pickupRadius, pickupRadius, "movement must not nerf pickup reach");
    }
  }
}
for (const pickupRadius of [54, 342.25]) {
  const game = stateFactory(null).resetGameState({ modeId: "farm" });
  const update = updater(game, null);
  Object.assign(game.player, { x: 0, y: 540, targetX: 480, targetY: 270, pickupRadius });
  update.update(0);
  assert.deepEqual(
    [game.player.x, game.player.y, game.player.targetX, game.player.targetY],
    [18, 522, 480, 270],
    "no-spatial legacy keeps its 18-unit clamp and target semantics"
  );
}
console.log("PASS stable physical bounds, illegal-target reconciliation and legacy movement");

function projectiles(game, provider = spatial) {
  return createWeaponProjectileSystem({
    canvas,
    spatial: provider,
    getGame: () => game,
    weaponDefs: {},
    getRunUpgradeTier: () => 0,
    damageEnemy: noop,
    reapEnemies: noop,
    distance,
    clamp,
  });
}
function bolt(x, y, vx, vy, bounces = 2) {
  return { x, y, vx, vy, radius: 5, life: 2, bounces, hit: new Set() };
}
{
  const game = fresh(),
    system = projectiles(game);
  game.bolts = [bolt(1000, 600, 100, 100)];
  system.updateBolts(0.1);
  assert.equal(game.bolts[0].x, 1010);
  assert.equal(game.bolts[0].y, 610);
  assert.equal(game.bolts[0].bounces, 2);
  assert.equal(game.bolts[0].life, 1.9);
  for (const [x, y, vx, vy, ex, ey, evx, evy] of [
    [4, 810, -10, 0, 5, 810, 10, 0],
    [2876, 810, 10, 0, 2875, 810, -10, 0],
    [1440, 4, 0, -10, 1440, 5, 0, 10],
    [1440, 1616, 0, 10, 1440, 1615, 0, -10],
  ]) {
    game.bolts = [bolt(x, y, vx, vy)];
    system.updateBolts(0);
    assert.deepEqual(
      [game.bolts[0].x, game.bolts[0].y, game.bolts[0].vx, game.bolts[0].vy, game.bolts[0].bounces],
      [ex, ey, evx, evy, 1]
    );
  }
  game.bolts = [bolt(2876, 1616, 10, 10, 1)];
  system.updateBolts(0);
  assert.deepEqual(
    [game.bolts[0].x, game.bolts[0].y, game.bolts[0].vy, game.bolts[0].bounces],
    [2875, 1616, 10, 0],
    "last bounce still resolves X before Y"
  );
  game.bolts = [bolt(3000, 1700, 10, 10, 0)];
  system.updateBolts(0.1);
  assert.equal(game.bolts.length, 1, "no added offscreen culling");
  system.updateBolts(2);
  assert.equal(game.bolts.length, 0, "TTL unchanged");
}
function behaviors(game, provider = spatial) {
  return createEnemyBehaviorSystem({
    canvas,
    spatial: provider,
    getGame: () => game,
    bossAbilities: {},
    distance,
    clamp,
    damagePlayer: noop,
  });
}
{
  const game = fresh(),
    system = behaviors(game, { physicalSize: spatial.physicalSize });
  for (const [dx, dy, ex, ey] of [
    [-1, -1, 38, 38],
    [1, -1, 2842, 38],
    [-1, 1, 38, 1582],
    [1, 1, 2842, 1582],
  ]) {
    const boss = {
      x: 1440,
      y: 810,
      radius: 38,
      bossKind: "charger",
      chargeState: "charging",
      chargeTimer: 10,
      chargeDirX: dx,
      chargeDirY: dy,
      chargeSpeed: 10000,
      touchTimer: 1,
    };
    game.enemies = [boss];
    system.updateEnemies(1);
    assert.equal(boss.x, ex);
    assert.equal(boss.y, ey);
  }
  game.enemies = [];
  game.enemyBolts = [bolt(1000, 600, 10, 10)];
  system.updateEnemyBolts(0.1);
  assert.equal(game.enemyBolts.length, 1);
  assert.equal(game.enemyBolts[0].life, 1.9);
  for (const [x, y] of [
    [-24, 810],
    [2904, 810],
    [1440, -24],
    [1440, 1644],
  ]) {
    game.enemyBolts = [bolt(x, y, 0, 0)];
    system.updateEnemyBolts(0);
    assert.equal(game.enemyBolts.length, 0);
  }
  for (const [x, y] of [
    [-23, 810],
    [2903, 810],
    [1440, -23],
    [1440, 1643],
  ]) {
    game.enemyBolts = [bolt(x, y, 0, 0)];
    system.updateEnemyBolts(0);
    assert.equal(game.enemyBolts.length, 1);
    system.updateEnemyBolts(2);
    assert.equal(game.enemyBolts.length, 0);
  }
}
console.log(
  "PASS bolt reflection/order/TTL and charger/enemy-projectile physical bounds at every edge"
);

function beamSystem(game, provider = spatial, reach = 2000, bounces = 1) {
  return createWeaponBehaviorSystem({
    canvas,
    spatial: provider,
    getGame: () => game,
    weaponDefs: { test_beam: {} },
    getRunUpgradeTier: (id) => (id === "run_wall_bounce" ? bounces : 0),
    nearestEnemy: () => null,
    weaponDamage: () => 10,
    weaponReach: () => reach,
    weaponWidth: () => 4,
    damageEnemy: noop,
    reapEnemies: noop,
    addQuestProgress: noop,
    distance,
  });
}
for (const [dx, dy, ex, ey] of [
  [1, 0, 2880, 810],
  [-1, 0, 0, 810],
  [0, 1, 1440, 1620],
  [0, -1, 1440, 0],
]) {
  const game = fresh();
  Object.assign(game.player, { facingX: dx, facingY: dy });
  beamSystem(game).fireBeam("test_beam");
  assert.equal(game.beams.length, 2);
  approx(game.beams[0].endX, ex);
  approx(game.beams[0].endY, ey);
  const reflected = game.beams[1];
  assert.ok((reflected.endX - reflected.x) * dx + (reflected.endY - reflected.y) * dy < 0);
  approx(
    game.beams.reduce((sum, b) => sum + Math.hypot(b.endX - b.x, b.endY - b.y), 0),
    2000,
    "unchanged range"
  );
}
{
  const game = fresh();
  Object.assign(game.player, { x: 2800, y: 1540, facingX: 1, facingY: 1 });
  beamSystem(game, spatial, 200).fireBeam("test_beam");
  approx(game.beams[0].endX, 2880);
  approx(game.beams[0].endY, 1620);
  assert.ok(game.beams[1].endX < game.beams[1].x && game.beams[1].endY < game.beams[1].y);
  const interior = fresh();
  Object.assign(interior.player, { facingX: 1, facingY: 0 });
  beamSystem(interior, spatial, 500, 0).fireBeam("test_beam");
  assert.equal(interior.beams.length, 1);
  assert.equal(interior.beams[0].endX, 1940);
}
function teleport(game, values, provider = spatial) {
  const damage = createCombatDamageSystem({
    canvas,
    spatial: provider,
    getGame: () => game,
    getRelicSpecialEffects: () => ({ teleportOnHitCooldown: 3, teleportDistance: 140 }),
    clamp,
  });
  randomSequence(values, () => damage.damagePlayer(10));
  assert.equal(game.player.hp, 90);
  assert.equal(game.player.teleportCooldown, 3);
  assert.equal(game.player.targetX, game.player.x);
  assert.equal(game.player.targetY, game.player.y);
}
for (const [x, y, random, ex, ey] of [
  [1440, 810, [0.9, 0.9], 1580, 950],
  [18, 18, [0.1, 0.1], 16, 16],
  [2862, 18, [0.9, 0.1], 2864, 16],
  [18, 1602, [0.1, 0.9], 16, 1604],
  [2862, 1602, [0.9, 0.9], 2864, 1604],
]) {
  const game = fresh();
  Object.assign(game.player, { x, y });
  teleport(game, random);
  assert.equal(game.player.x, ex);
  assert.equal(game.player.y, ey);
}
console.log(
  "PASS beams/no-target range/corner reflections and deterministic teleports beyond old walls"
);

const type = { id: "drifter", radius: 12, hp: 18, speed: 52, damage: 1, xp: 1 };
function enemies(game, provider = spatial) {
  return createEnemySystem({
    canvas,
    spatial: provider,
    getGame: () => game,
    balance: { floorDifficulty: () => ({ hp: 1, damage: 1, spawnRate: 1 }) },
    enemyBehaviors: { createEnemyBehaviorSystem },
    enemySpawning: { createEnemySpawnSystem },
    enemyTypes: [type],
    bossAbilities: { warden: { speed: 42 }, turret: {} },
    bossConfig: { abilityIds: ["warden"] },
    clamp,
    distance,
  });
}
const locations = [
  [1440, 810, [1056, 594, 1824, 1026]],
  [18, 18, [0, 0, 768, 432]],
  [2862, 18, [2112, 0, 2880, 432]],
  [18, 1602, [0, 1188, 768, 1620]],
  [2862, 1602, [2112, 1188, 2880, 1620]],
  [385, 217, [1, 1, 769, 433]],
  [2495, 1403, [2111, 1187, 2879, 1619]],
];
for (const [x, y, [left, top, right, bottom]] of locations) {
  const game = fresh();
  Object.assign(game.player, { x, y });
  assert.deepEqual(spatial.visibleBounds(game), { left, top, right, bottom });
  const system = enemies(game);
  for (const angle of [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]) {
    for (const pattern of [0, 0.3, 0.6, 0.9]) {
      game.spawnTimer = 0;
      game.enemies = [];
      randomSequence([angle, pattern, 0, 0.25, 0.75, 0, 0.25, 0.75], () => system.spawnEnemies(0));
      assert.equal(game.enemies.length, 2);
      assert.equal(game.spawnTimer, 1.1);
      for (const enemy of game.enemies) {
        assert.ok(
          enemy.x < left || enemy.x > right || enemy.y < top || enemy.y > bottom,
          "spawn outside visible rectangle"
        );
        assert.ok(
          enemy.x >= left - 72 &&
            enemy.x <= right + 72 &&
            enemy.y >= top - 72 &&
            enemy.y <= bottom + 72,
          "bounded local entry, not distant perimeter"
        );
        assert.ok(enemy.x >= -72 && enemy.x <= 2952 && enemy.y >= -72 && enemy.y <= 1692);
        assert.equal(enemy.hp, 18);
        assert.equal(enemy.speed, 52);
        assert.equal(enemy.animTime, 0.75);
      }
    }
  }
  for (const sample of [0, 0.5, 0.999]) {
    game.bossSpawned = false;
    game.enemies = [];
    game.bossAttacks = [];
    randomSequence([0, sample, sample], () => system.spawnBoss());
    const boss = game.enemies[0];
    approx(boss.landingX, left + 72 + sample * 624);
    approx(boss.landingY, top + 90 + sample * 252);
    assert.ok(boss.landingX >= left + 72 && boss.landingX <= right - 72);
    assert.ok(boss.landingY >= top + 90 && boss.landingY <= bottom - 90);
    if (sample === 0.5) {
      assert.equal(boss.startX, left + 384);
      assert.equal(boss.startY, top - 72);
    }
    if (sample === 0) {
      assert.equal(boss.startX, left - 52);
      assert.equal(boss.startY, top + 90);
    }
  }
}
// Oversized viewport raises effective zoom; tiny views collapse boss inset to
// midpoint. Spawn still has an exterior band, so there is no in-view degeneracy.
{
  const game = state.resetGameState({ world: { width: 100, height: 60, zoom: 1.25 } });
  const system = enemies(game);
  randomSequence([0, 0.9, 0.1], () => system.spawnBoss());
  const boss = game.enemies[0];
  approx(boss.landingX, 50);
  approx(boss.landingY, 30);
  const entry = spatial.spawnPosition(game, 0, 72);
  approx(entry.x, 172);
  approx(entry.y, 30);
}
console.log(
  "PASS Climb spawn patterns/RNG cadence and boss visible-region placement at center, corners, near edges and small world"
);

// Exact Farm snapshots plus deterministic comparisons to documented no-provider
// canvas fallback preserve arithmetic, random call order, speeds and rewards.
for (const sample of [0, 0.125, 0.5, 0.875]) {
  const farm = fresh("farm"),
    fallback = fresh("farm");
  const values = [sample, 0.6, 0, 0.25, 0.75, 0, 0.25, 0.75];
  randomSequence(values, () => enemies(farm).spawnEnemies(0));
  randomSequence(values, () => enemies(fallback, null).spawnEnemies(0));
  assert.deepEqual(farm, fallback);
  farm.enemies = [];
  fallback.enemies = [];
  randomSequence([0, sample, sample], () => enemies(farm).spawnBoss());
  randomSequence([0, sample, sample], () => enemies(fallback, null).spawnBoss());
  assert.deepEqual(farm, fallback);
}
{
  const game = fresh("farm");
  randomSequence([0, 0, 0, 0.25, 0.75, 0, 0.25, 0.75], () => enemies(game).spawnEnemies(0));
  approx(game.enemies[0].x, 1032);
  approx(game.enemies[0].y, 270);
  approx(game.enemies[1].x, -72);
  approx(game.enemies[1].y, 270);
  game.enemies = [];
  randomSequence([0, 0.5, 0.5], () => enemies(game).spawnBoss());
  assert.deepEqual(
    [
      game.enemies[0].landingX,
      game.enemies[0].landingY,
      game.enemies[0].startX,
      game.enemies[0].startY,
    ],
    [480, 270, 480, -72]
  );
  const farm = fresh("farm"),
    fallback = fresh("farm");
  for (const run of [farm, fallback]) Object.assign(run.player, { facingX: 1, facingY: 0 });
  beamSystem(farm, spatial, 600).fireBeam("test_beam");
  beamSystem(fallback, null, 600).fireBeam("test_beam");
  assert.deepEqual(farm.beams, fallback.beams);
  assert.deepEqual([farm.beams[0].endX, farm.beams[0].endY], [960, 270]);
  approx(farm.beams[1].endX, 839.999);
  teleport(farm, [0.9, 0.9]);
  teleport(fallback, [0.9, 0.9], null);
  assert.deepEqual(farm.player, fallback.player);
  assert.equal(farm.player.x, 620);
  assert.equal(farm.player.y, 410);
}
{
  const game = fresh();
  let xp = 0,
    persists = 0;
  const pickupSave = { coins: 0 };
  const pickups = createPickupSystem({
    getGame: () => game,
    getSave: () => pickupSave,
    persist: () => persists++,
    renderMeta: noop,
    collectXp: (n) => (xp += n),
    distance,
    randomRange: (lo, hi) => (lo + hi) / 2,
  });
  game.xpDrops = [{ x: 2400, y: 1400, radius: 7, value: 3 }];
  game.lootDrops = [{ x: 2400, y: 1400, radius: 7, value: 2, type: "coin" }];
  pickups.updateXpDrops(10);
  pickups.updateLootDrops(10);
  assert.equal(game.xpDrops.length, 1);
  assert.equal(game.lootDrops.length, 1);
  Object.assign(game.player, { x: 2360, y: 1400 });
  pickups.updateXpDrops(0.1);
  pickups.updateLootDrops(0.1);
  assert.equal(xp, 3);
  assert.equal(pickupSave.coins, 2);
  assert.equal(persists, 1);
  assert.equal(game.xpDrops.length, 0);
  assert.equal(game.lootDrops.length, 0);
  for (const modeId of ["farm", "climb"]) {
    game.modeId = modeId;
    game.towerFloor = 5;
    game.lootDrops = [];
    pickups.spawnLootDrops({ boss: true, x: 2400, y: 1400 });
    assert.equal(game.lootDrops[0].value, 15);
    assert.equal(game.lootDrops[1].healPercent, 0.2);
  }
}
console.log(
  "PASS deterministic Farm spawn/boss/beam/teleport parity and unchanged offscreen pickup/reward semantics"
);

// Exercise real production boot AND retained src/game.js composition (not just
// isolated factories). VM replaces only ESM imports with their actual providers.
for (const retained of [false, true]) {
  const h = createGameHarness();
  let runtime;
  if (retained) {
    const source = readFileSync(new URL("../src/game.js", import.meta.url), "utf8").replace(
      /^import .*;\n/gm,
      ""
    );
    runtime = vm.runInNewContext(
      `${source}\n({ resetGameState, getGame: () => game, runUpdater, persist });`,
      {
        ...h.context,
        createGameDependencyBag,
        createGameRuntimeController,
        balanceProfiles,
        generatedContent,
      }
    );
  } else {
    const entry = bootProductionModuleEntrypoint({ globalRef: h.context });
    runtime = {
      resetGameState(options) {
        entry.startRun(options.modeId);
        return entry.dependencies.getGame();
      },
      runUpdater: entry.dependencies.runUpdater,
      persist: entry.persist,
      dispose: entry.dispose,
    };
  }
  for (const modeId of ["climb", "farm", "climb"]) {
    const run = runtime.resetGameState({ modeId });
    assert.equal(run.world.width, modeId === "climb" ? 2880 : 960);
    assert.equal(run.world.height, modeId === "climb" ? 1620 : 540);
    assert.equal(run.world.zoom, modeId === "climb" ? 1.25 : 1);
    assert.equal(run.player.x, modeId === "climb" ? 1440 : 480);
    assert.equal(run.player.y, modeId === "climb" ? 810 : 270);
    run.awaitingFirstMoveInput = false;
    run.player.equippedWeapons = [];
    run.spawnTimer = 100;
    run.player.targetX = run.player.x + 185;
    runtime.runUpdater.update(1);
    assert.equal(run.player.x, modeId === "climb" ? 1625 : 665);
    // Exercise combat -> weaponFire -> projectiles injection in actual composition.
    run.bolts = [bolt(modeId === "climb" ? 2876 : 956, 300, 10, 0)];
    runtime.runUpdater.update(0);
    assert.equal(run.bolts[0].x, modeId === "climb" ? 2875 : 955);
    assert.equal(run.bolts[0].vx, -10);
    runtime.persist();
    const saved = JSON.parse(h.context.localStorage.store.get("tap-survivor-mvp-save-v2"));
    for (const key of ["modeId", "world", "camera", "player", "spatial"])
      assert.equal(Object.hasOwn(saved, key), false);
  }
  runtime.dispose?.();
  console.log(
    `PASS actual ${retained ? "retained game.js" : "native production"} composition world/reset/movement/projectile threading and save exclusion`
  );
}
console.log(
  "World simulation smoke passed. Simulation candidate only: rendering, input and HUD camera integration remain S4; no browser acceptance claimed."
);
