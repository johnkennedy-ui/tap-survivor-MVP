import assert from "node:assert/strict";
import { createWeaponProjectileSystem } from "../src/modules/weapon-projectiles.js";

const canvas = { width: 300, height: 220 };
const wall = Object.freeze({ x: 100, y: 60, width: 20, height: 100 });
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (left, right) => Math.hypot(left.x - right.x, left.y - right.y);
const approx = (actual, expected, label) =>
  assert.ok(Math.abs(actual - expected) < 0.001, `${label}: ${actual} != ${expected}`);

function fixture({ walls = [wall], upgrades = {}, enemies = [] } = {}) {
  const game = {
    areas: [],
    bolts: [],
    enemies,
    player: { x: 30, y: 110, radius: 12, hp: 100 },
    world: { modeId: "climb", width: canvas.width, height: canvas.height },
  };
  const damage = [];
  const system = createWeaponProjectileSystem({
    canvas,
    spatial: {
      physicalSize: () => canvas,
      solidWalls: () => walls,
    },
    weaponDefs: { test: { color: "#fff", speed: 100 } },
    getGame: () => game,
    getRunUpgradeTier: (id) => upgrades[id] || 0,
    projectileRadius: () => 6,
    weaponDamage: () => 10,
    projectileSkillModifier: () => 1,
    nearestEnemy: () => null,
    damageEnemy: (enemy, damageAmount, weaponId) =>
      damage.push({ enemy, damage: damageAmount, weaponId }),
    reapEnemies: () => {},
    distance,
    clamp,
  });
  const spawn = (x, y, vx, vy, overrides = {}) =>
    system.spawnProjectileBolt("test", x, y, vx, vy, {
      bounces: 1,
      life: 2,
      ...overrides,
    });
  return { damage, game, spawn, system };
}

function clearOfWalls(bolt, walls) {
  return walls.every((candidate) => {
    const x = clamp(bolt.x, candidate.x, candidate.x + candidate.width);
    const y = clamp(bolt.y, candidate.y, candidate.y + candidate.height);
    return Math.hypot(bolt.x - x, bolt.y - y) >= bolt.radius - 0.001;
  });
}

{
  const { game, spawn, system } = fixture();
  spawn(60, 110, 100, 0);
  system.updateBolts(0.5);
  const bolt = game.bolts[0];
  assert.equal(bolt.bounces, 0, "head-on impact consumes exactly one Ricochet bounce");
  assert.equal(bolt.vx, -100, "head-on impact reflects velocity from the wall face");
  approx(bolt.x, 78, "head-on impact spends unused travel after reflection");
  assert.ok(clearOfWalls(bolt, [wall]), "head-on impact retains radius clearance");
}

{
  const { game, spawn, system } = fixture();
  spawn(60, 70, 100, 20);
  system.updateBolts(0.5);
  const bolt = game.bolts[0];
  assert.equal(bolt.vx, -100, "oblique face impact flips the normal velocity");
  assert.equal(bolt.vy, 20, "oblique face impact preserves tangential velocity");
  assert.ok(clearOfWalls(bolt, [wall]), "oblique impact remains radius-clear");
}

{
  const cornerWall = Object.freeze({ x: 100, y: 100, width: 20, height: 20 });
  const { game, spawn, system } = fixture({ walls: [cornerWall] });
  spawn(60, 60, 100, 100);
  system.updateBolts(0.5);
  const bolt = game.bolts[0];
  assert.ok(bolt.vx < 0 && bolt.vy < 0, "corner impact reflects both incident normal components");
  assert.ok(clearOfWalls(bolt, [cornerWall]), "corner impact stays outside the rounded radius");
}

{
  const { game, spawn, system } = fixture();
  spawn(20, 110, 5000, 0);
  system.updateBolts(0.05);
  const bolt = game.bolts[0];
  assert.equal(bolt.vx, -5000, "high-speed bolt does not tunnel through a thin wall");
  assert.ok(bolt.x < wall.x - bolt.radius, "high-speed bolt remains on the approached side");
}

{
  const leftWall = Object.freeze({ x: 20, y: 60, width: 10, height: 100 });
  const rightWall = Object.freeze({ x: 100, y: 60, width: 10, height: 100 });
  const { game, spawn, system } = fixture({ walls: [leftWall, rightWall] });
  spawn(60, 110, 1000, 0, { bounces: 2 });
  system.updateBolts(0.13);
  const bolt = game.bolts[0];
  assert.equal(bolt.bounces, 0, "multiple-wall travel consumes one bounce per contact");
  assert.equal(bolt.vx, 1000, "multiple-wall travel retains the final reflection direction");
  assert.ok(
    clearOfWalls(bolt, [leftWall, rightWall]),
    "multiple-wall travel never ends inside terrain"
  );
}

{
  const enemy = { x: 150, y: 110, radius: 10, hp: 100 };
  const { damage, game, spawn, system } = fixture({ enemies: [enemy] });
  spawn(60, 110, 100, 0, { bounces: 0 });
  system.updateBolts(1);
  assert.equal(game.bolts.length, 0, "exhausted Ricochet bolt is absorbed by the wall");
  assert.equal(damage.length, 0, "absorbed bolt cannot hit an enemy beyond the wall");
}

{
  const enemy = { x: 150, y: 110, radius: 10, hp: 100 };
  const { damage, game, spawn, system } = fixture({ enemies: [enemy] });
  spawn(60, 110, 100, 0, { bounces: 0 });
  system.updateBolts(1);
  assert.equal(game.bolts.length, 0, "absent Ricochet upgrade also absorbs at the blocking wall");
  assert.equal(damage.length, 0, "absent Ricochet has no through-wall hit");
}

{
  const { game, spawn, system } = fixture();
  spawn(94, 110, -10, 0);
  system.updateBolts(0.1);
  const bolt = game.bolts[0];
  assert.equal(bolt.bounces, 1, "separating contact does not consume a bounce");
  approx(bolt.x, 93, "separating contact continues away from the wall");
}

{
  const { game, spawn, system } = fixture();
  spawn(60, 60.00001, 100, 0);
  system.updateBolts(0.5);
  const bolt = game.bolts[0];
  assert.equal(bolt.bounces, 0, "face/corner seam contact consumes Ricochet");
  assert.equal(bolt.vx, -100, "face/corner seam cannot tunnel past the wall");
  assert.ok(bolt.x < wall.x - bolt.radius, "face/corner seam remains on the approached side");
}

{
  const { game, spawn, system } = fixture();
  spawn(99, 110, 100, 0);
  system.updateBolts(0.2);
  const bolt = game.bolts[0];
  assert.equal(bolt.bounces, 0, "inward overlap resolves as a finite Ricochet contact");
  assert.equal(bolt.vx, -100, "inward overlap reflects from its deterministic exit face");
  assert.ok(clearOfWalls(bolt, [wall]), "inward overlap is depenetrated before travel");
}

{
  const { game, spawn, system } = fixture();
  spawn(99, 110, -100, 0);
  system.updateBolts(0.2);
  const bolt = game.bolts[0];
  assert.equal(bolt.bounces, 1, "outward overlap does not consume Ricochet");
  assert.equal(bolt.vx, -100, "outward overlap preserves separating velocity");
  assert.ok(clearOfWalls(bolt, [wall]), "outward overlap is deterministically depenetrated");
}

{
  const { game, spawn, system } = fixture();
  spawn(110, 110, 100, 0);
  system.updateBolts(0.2);
  const bolt = game.bolts[0];
  assert.equal(bolt.bounces, 0, "true interior spawn has a finite deterministic contact");
  assert.equal(bolt.vx, -100, "true interior spawn reflects from its selected nearest face");
  assert.ok(clearOfWalls(bolt, [wall]), "true interior spawn finishes outside terrain");
}

{
  const { game, spawn, system } = fixture();
  spawn(110, 110, 0, 0);
  system.updateBolts(0);
  const bolt = game.bolts[0];
  assert.equal(bolt.bounces, 1, "stationary interior correction does not consume Ricochet");
  assert.ok(
    clearOfWalls(bolt, [wall]),
    "stationary interior correction is finite and radius-clear"
  );
}

{
  const { game, spawn, system } = fixture();
  spawn(99, 110, 0, 20);
  system.updateBolts(0.2);
  const bolt = game.bolts[0];
  assert.equal(bolt.bounces, 1, "tangent overlap correction does not consume Ricochet");
  assert.equal(bolt.vy, 20, "tangent overlap preserves velocity");
  assert.ok(clearOfWalls(bolt, [wall]), "tangent overlap is depenetrated");
}

{
  const { game, spawn, system } = fixture({ walls: [] });
  game.world.modeId = "farm";
  spawn(60, 110, 100, 0);
  system.updateBolts(0.5);
  const bolt = game.bolts[0];
  assert.equal(bolt.x, 110, "Farm with no terrain keeps existing projectile arithmetic");
  assert.equal(bolt.bounces, 1, "Farm with no terrain keeps Ricochet unused");
}

{
  const { game, spawn, system } = fixture({ walls: [] });
  game.world.modeId = "farm";
  spawn(60, 110, 0.00001, 0);
  system.updateBolts(0.1);
  assert.equal(
    game.bolts[0].x,
    60 + 0.00001 * 0.1,
    "Farm retains tiny no-wall displacement exactly"
  );
}

{
  const { game, spawn, system } = fixture();
  spawn(60, 110, 68, 0);
  system.updateBolts(0.5);
  const bolt = game.bolts[0];
  assert.equal(bolt.bounces, 0, "last-step contact is included in current travel");
  assert.equal(bolt.vx, -68, "last-step contact reflects without extra travel");
  assert.ok(bolt.x <= wall.x - bolt.radius, "last-step contact never moves beyond the wall");
}

{
  const firstWall = Object.freeze({ x: 100, y: 40, width: 20, height: 60 });
  const laterWall = Object.freeze({ x: 94.0004, y: 100.0005, width: 20, height: 20 });
  const { game, spawn, system } = fixture({ walls: [firstWall, laterWall] });
  spawn(60, 60, 100, 100, { bounces: 2 });
  system.updateBolts(0.5);
  const bolt = game.bolts[0];
  assert.equal(bolt.bounces, 0, "near contacts resolve as two finite ordered impacts");
  assert.ok(clearOfWalls(bolt, [firstWall, laterWall]), "near contacts do not end inside terrain");
}

{
  const primary = { x: 78, y: 110, radius: 6, hp: 100 };
  const splash = { x: 90, y: 110, radius: 6, hp: 100 };
  const { damage, game, spawn, system } = fixture({
    enemies: [primary, splash],
    upgrades: { run_explosive_hit: 1, run_split_on_hit: 1 },
  });
  spawn(60, 110, 100, 0, { pierce: 1 });
  system.updateBolts(0.5);
  assert.equal(
    game.bolts[0].pierce,
    0,
    "post-bounce enemy hit preserves projectile pierce handling"
  );
  assert.equal(game.areas.length, 1, "post-bounce enemy hit preserves explosion effects");
  assert.equal(
    game.bolts.filter((bolt) => bolt.splitDepth === 1).length,
    2,
    "post-bounce hit still splits"
  );
  assert.ok(
    game.bolts.filter((bolt) => bolt.splitDepth === 1).every((bolt) => bolt.bounces === 0),
    "split-on-hit children retain their no-Ricochet provenance"
  );
  assert.ok(
    damage.some(({ enemy }) => enemy === primary),
    "post-bounce primary hit is applied"
  );
  assert.ok(
    damage.some(({ enemy }) => enemy === splash),
    "post-bounce explosion still damages nearby enemies"
  );
}

console.log("projectile wall Ricochet smoke passed");
