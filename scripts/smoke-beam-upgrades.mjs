import assert from "node:assert/strict";

import { createRelicSystem } from "../src/modules/relics.js";
import { createWeaponBehaviorSystem } from "../src/modules/weapon-behaviors.js";

const weaponDefs = {
  laser_staff: { kind: "beam", color: "#7de7ff", range: 180, width: 10 },
};

function createFixture({ enemies = [], upgrades = {} } = {}) {
  const game = {
    player: { x: 50, y: 60, targetX: 160, targetY: 60, facingX: 1, facingY: 0 },
    enemies,
    beams: [],
    laserDamage: 0,
  };
  const damageCalls = [];
  const system = createWeaponBehaviorSystem({
    canvas: { width: 200, height: 120 },
    weaponDefs,
    getGame: () => game,
    getRunUpgradeTier: (id) => upgrades[id] || 0,
    nearestEnemy: () => game.enemies[0] || null,
    weaponDamage: () => 30,
    weaponReach: (weapon) => weapon.range,
    weaponWidth: (weapon) => weapon.width,
    damageEnemy: (enemy, damage, weaponId) => {
      damageCalls.push({ enemy, damage, weaponId });
      return damage;
    },
    reapEnemies: () => {},
    addQuestProgress: () => {},
    distance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  });
  return { game, damageCalls, system };
}

{
  const enemies = [
    { x: 90, y: 60, radius: 5 },
    { x: 140, y: 60, radius: 5 },
  ];
  const { game, damageCalls, system } = createFixture({ enemies });
  system.fireBeam("laser_staff");
  assert.equal(game.beams.length, 1, "base laser emits one solid beam");
  assert.equal(damageCalls.length, 2, "base laser pierces every enemy along its path");
  assert.deepEqual(
    damageCalls.map(({ enemy }) => enemy),
    enemies,
    "base laser damages enemies in beam order"
  );
}

{
  const outbound = { x: 190, y: 60, radius: 5 };
  const returned = { x: 130, y: 60, radius: 5 };
  const { game, damageCalls, system } = createFixture({
    enemies: [outbound, returned],
    upgrades: { run_wall_bounce: 1 },
  });
  system.fireBeam("laser_staff");
  assert.equal(game.beams.length, 2, "Ricochet emits outbound and reflected beam segments");
  assert.equal(game.beams[0].endX, 200, "outbound segment terminates at the arena wall");
  assert.ok(game.beams[1].endX < game.beams[1].x, "reflected segment travels back into the arena");
  assert.equal(damageCalls.filter(({ enemy }) => enemy === outbound).length, 1, "outbound enemy is hit once across the ricochet path");
  assert.equal(damageCalls.filter(({ enemy }) => enemy === returned).length, 1, "returned-path enemy is hit once");
}

{
  const { game, system } = createFixture({
    enemies: [{ x: 160, y: 60, radius: 5 }],
    upgrades: { run_split_shot: 1 },
  });
  system.fireBeam("laser_staff");
  assert.equal(game.beams.length, 3, "Split Fire tier 1 emits three laser branches");
  assert.ok(new Set(game.beams.map((beam) => beam.endY)).size === 3, "split branches use distinct directions");
}

{
  const { game, system } = createFixture({
    enemies: [{ x: 160, y: 60, radius: 5 }],
    upgrades: { run_split_shot: 2 },
  });
  system.fireBeam("laser_staff");
  assert.equal(game.beams.length, 5, "Split Fire tier 2 follows the projectile five-way pattern");
  assert.equal(new Set(game.beams.map((beam) => beam.endY)).size, 5, "tier 2 branches use five distinct directions");
}

{
  const { game, damageCalls, system } = createFixture();
  system.fireBeam("laser_staff");
  assert.equal(game.beams.length, 1, "laser remains stable with no target");
  assert.equal(damageCalls.length, 0, "no-target laser does not damage absent enemies");
}

{
  const relicSystem = createRelicSystem({
    relicDefs: [
      { id: "bounce", targetUpgradeId: "run_wall_bounce" },
      { id: "split", targetUpgradeId: "run_split_shot" },
      { id: "pierce", targetUpgradeId: "run_projectile_pierce" },
    ],
    weaponDefs,
    random: () => 0,
  });
  const offered = relicSystem.relicChoices({ unlockedRelics: [] }, ["laser_staff"], 2).map((relic) => relic.id);
  assert.ok(offered.includes("bounce"), "beam-only runs can receive Ricochet Shots");
  assert.ok(offered.includes("split"), "beam-only runs can receive Split Fire");
  assert.ok(!offered.includes("pierce"), "projectile-only upgrades remain excluded from beam-only runs");
}

console.log("PASS beam upgrades smoke");
