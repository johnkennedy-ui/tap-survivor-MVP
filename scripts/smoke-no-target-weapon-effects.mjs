import assert from "node:assert/strict";

import { createWeaponBehaviorSystem } from "../src/modules/weapon-behaviors.js";
import { createWeaponProjectileSystem } from "../src/modules/weapon-projectiles.js";

const weaponDefs = {
  fire_staff: { kind: "projectile", speed: 100, color: "#ff7a00", pierce: 0 },
  water_staff: { kind: "projectile", speed: 80, color: "#4cc9f0", pierce: 0 },
  lightning_staff: { kind: "chain", color: "#f7e733", jumps: 3, reach: 120 },
  prism_beam: { kind: "beam", color: "#ffffff", reach: 140, width: 12 },
  ember_cone: { kind: "cone", color: "#ff4d6d", reach: 110, width: 24 },
};

const facingPlayer = () => ({ x: 40, y: 50, targetX: 40, targetY: 50, facingX: 1, facingY: 0 });
const createProjectileFixture = (enemies = []) => {
  const game = { player: facingPlayer(), enemies, bolts: [], areas: [] };
  const damageCalls = [];
  const system = createWeaponProjectileSystem({
    canvas: { width: 400, height: 300 },
    weaponDefs,
    getGame: () => game,
    getRunUpgradeTier: () => 0,
    getRelicSpecialEffects: () => ({}),
    nearestEnemy: () => game.enemies[0] || null,
    projectileRadius: () => 5,
    weaponDamage: () => 17,
    projectileSkillModifier: () => 1,
    damageEnemy: (enemy, damage, weaponId) => {
      damageCalls.push({ enemy, damage, weaponId });
      enemy.hp -= damage;
      return damage;
    },
    reapEnemies: () => {},
    distance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
  });
  return { game, damageCalls, system };
};

for (const weaponId of ["fire_staff", "water_staff"]) {
  const { game, damageCalls, system } = createProjectileFixture();
  system.fireProjectile(weaponId);
  assert.equal(game.bolts.length, 1, `${weaponId} emits a no-target bolt`);
  assert.ok(game.bolts[0].vx > 0 && Math.abs(game.bolts[0].vy) < 1e-9);
  assert.equal(damageCalls.length, 0, `${weaponId} does not damage without a target`);
}

{
  const enemy = { x: 60, y: 50, radius: 5, hp: 40 };
  const { game, damageCalls, system } = createProjectileFixture([enemy]);
  system.fireProjectile("fire_staff");
  assert.equal(game.bolts[0].vx, 100, "target-present projectile keeps target direction and speed");
  system.updateBolts(0.2);
  assert.equal(damageCalls.length, 1, "target-present projectile still damages its target");
  assert.equal(damageCalls[0].damage, 17);
}

const createBehaviorFixture = () => {
  const game = { player: facingPlayer(), enemies: [], beams: [], areas: [], laserDamage: 0 };
  const damageCalls = [];
  const system = createWeaponBehaviorSystem({
    weaponDefs,
    getGame: () => game,
    nearestEnemy: () => game.enemies[0] || null,
    weaponDamage: () => 23,
    weaponReach: (weapon) => weapon.reach || 100,
    weaponWidth: (weapon) => weapon.width || 10,
    damageEnemy: (enemy, damage, weaponId) => {
      damageCalls.push({ enemy, damage, weaponId });
      return damage;
    },
    reapEnemies: () => {},
    addQuestProgress: () => {},
    distance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  });
  return { game, damageCalls, system };
};

for (const [weaponId, fire] of [
  ["prism_beam", "fireBeam"],
  ["ember_cone", "fireCone"],
  ["lightning_staff", "fireChain"],
]) {
  const { game, damageCalls, system } = createBehaviorFixture();
  system[fire](weaponId);
  assert.equal(game.beams.length, 1, `${weaponId} emits a no-target beam`);
  assert.equal(game.beams[0].x, game.player.x);
  assert.equal(game.beams[0].y, game.player.y);
  assert.ok(game.beams[0].endX > game.player.x);
  assert.equal(game.beams[0].endY, game.player.y);
  assert.equal(damageCalls.length, 0, `${weaponId} does not damage without a target`);
}

console.log("PASS no-target projectile, beam, cone, and chain effects");
