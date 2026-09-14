import assert from "node:assert/strict";

import { createEnemyBehaviorSystem } from "../src/modules/enemy-behaviors.js";
import { createWeaponBehaviorSystem } from "../src/modules/weapon-behaviors.js";
import { createWeaponProjectileSystem } from "../src/modules/weapon-projectiles.js";
import { clamp, distance } from "../src/modules/math.js";

function playerDamage(game, calls, mode = "normal") {
  return (amount) => {
    calls.push(amount);
    if (mode === "invulnerable") return 0;
    if (mode === "teleport") {
      game.player.x = 90;
      game.player.targetX = 90;
      return amount;
    }
    game.player.hp -= amount;
    return amount;
  };
}

function projectileFixture(mode = "normal") {
  const game = {
    areas: [],
    bolts: [],
    enemies: [{ hp: 100, radius: 5, x: 0, y: 0 }],
    player: { hp: mode === "death" ? 5 : 100, radius: 10, targetX: 20, targetY: 0, x: 20, y: 0 },
  };
  const playerCalls = [];
  const knockbacks = [];
  const system = createWeaponProjectileSystem({
    canvas: { width: 100, height: 80 },
    weaponDefs: { bolt: { color: "#fff", pierce: 0, radius: 4 } },
    getGame: () => game,
    getRunUpgradeTier: (id) => (id === "run_explosive_hit" ? 1 : 0),
    projectileRadius: () => 4,
    weaponDamage: () => 20,
    projectileSkillModifier: () => 1,
    damageEnemy: (enemy, amount) => {
      enemy.hp -= amount;
    },
    damagePlayer: playerDamage(game, playerCalls, mode),
    reapEnemies() {},
    applyRadialKnockback: (actor) => knockbacks.push(actor === game.player ? "player" : "enemy"),
    distance,
    clamp,
  });
  system.spawnProjectileBolt("bolt", 0, 0, 0, 0);
  system.updateBolts(0);
  system.updateBolts(0.2);
  return { game, knockbacks, playerCalls };
}

const projectile = projectileFixture();
assert.equal(projectile.playerCalls.length, 1, "explosive projectile damages player once across updates");
assert.equal(projectile.knockbacks.filter((id) => id === "player").length, 1, "explosive projectile knocks player once");
assert.equal(projectile.game.areas.length, 1, "visual blast remains but does not re-damage");
for (const mode of ["invulnerable", "teleport", "death"]) {
  const fixture = projectileFixture(mode);
  assert.equal(fixture.knockbacks.filter((id) => id === "player").length, 0, `${mode} player is not displaced from a stale blast`);
}

const mineGame = {
  areas: [{ damage: 12, damageOnce: true, life: 1, radius: 20, weaponId: "mine", x: 0, y: 0 }],
  beams: [],
  enemies: [{ hp: 50, radius: 4, x: 10, y: 0 }],
  player: { hp: 100, radius: 8, targetX: 10, targetY: 0, x: 10, y: 0 },
  weaponBursts: [],
  weaponIconFlashes: {},
};
const mineCalls = [];
const mine = createWeaponBehaviorSystem({
  getGame: () => mineGame,
  getRunUpgradeTier: () => 0,
  nearestEnemy: () => null,
  weaponDamage: () => 12,
  weaponReach: () => 20,
  weaponWidth: () => 1,
  damageEnemy: (enemy, amount) => {
    enemy.hp -= amount;
  },
  damagePlayer: playerDamage(mineGame, mineCalls),
  reapEnemies() {},
  addQuestProgress() {},
  applyRadialKnockback() {},
  distance,
  weaponDefs: {},
});
mine.updateAreas(0.1);
mine.updateAreas(0.1);
assert.equal(mineCalls.length, 1, "mine blast damages player once across updates");

const targetArea = targetAreaFixture();
assert.deepEqual(targetArea.enemyCalls, ["target", "near"], "target-area blast damages only living actors in radius");
assert.equal(targetArea.game.enemies[2].hp, 0, "target-area blast leaves dead enemies untouched");
assert.equal(targetArea.game.player.hp, 80, "target-area blast damages a player at the blast center");
assert.equal(targetArea.playerCalls.length, 1, "target-area blast damages player once");
assert.deepEqual(
  targetArea.knockbacks.map((entry) => entry.actor),
  ["target", "near", "player"],
  "target-area blast knocks each in-range actor once"
);
assert.ok(targetArea.knockbacks.every((entry) => entry.origin.x === 0 && entry.origin.y === 0), "blast origin is immutable");
assert.equal(targetArea.game.areas[0].x, 0, "visual strike center does not follow a displaced target");
assert.equal(targetArea.game.areas[0].visualOnly, true, "target-area blast keeps a visual-only once-only lifetime");
targetArea.system.updateAreas(0.1);
targetArea.system.updateAreas(0.1);
targetArea.system.updateAreas(0.1);
assert.equal(targetArea.playerCalls.length, 1, "target-area visual expiry does not re-damage player");
assert.deepEqual(targetArea.enemyCalls, ["target", "near"], "target-area visual expiry does not re-damage enemies");
assert.equal(targetArea.game.areas.length, 0, "target-area visual effect expires normally");

const reducedTargetArea = targetAreaFixture("reduced");
assert.equal(reducedTargetArea.game.player.hp, 92, "target-area honors reduced player damage");
assert.equal(
  reducedTargetArea.knockbacks.filter((entry) => entry.actor === "player").length,
  1,
  "target-area knocks back a player when reduced damage is still dealt"
);

for (const mode of ["invulnerable", "dodge", "teleport", "death"]) {
  const protectedTargetArea = targetAreaFixture(mode);
  assert.equal(protectedTargetArea.playerCalls.length, 1, `${mode} target-area damage is attempted once`);
  assert.equal(
    protectedTargetArea.knockbacks.filter((entry) => entry.actor === "player").length,
    0,
    `${mode} player is not displaced from a stale target-area blast`
  );
}

const farTargetArea = targetAreaFixture("normal", { playerX: 51 });
assert.equal(farTargetArea.playerCalls.length, 0, "target-area excludes players beyond radius plus body radius");
assert.equal(farTargetArea.game.enemies[3].hp, 100, "target-area excludes enemies beyond radius plus body radius");

const bossGame = {
  bossAttacks: [{ age: 0, damage: 9, hit: false, radius: 30, type: "shockwave", windup: 0, x: 0, y: 0 }],
  enemyBolts: [],
  enemies: [
    { hp: 100, radius: 4, x: 10, y: 0 },
    { hp: 100, radius: 4, x: 60, y: 0 },
    { hp: 0, radius: 4, x: 5, y: 0 },
  ],
  player: { hp: 100, radius: 8, targetX: 12, targetY: 0, x: 12, y: 0 },
};
const bossCalls = [];
const bossKnockbacks = [];
const boss = createEnemyBehaviorSystem({
  canvas: { width: 100, height: 80 },
  getGame: () => bossGame,
  damagePlayer: playerDamage(bossGame, bossCalls),
  damageEnemy: (enemy, amount) => {
    enemy.hp -= amount;
    return amount;
  },
  applyRadialKnockback: (actor) => bossKnockbacks.push(actor === bossGame.player ? "player" : "enemy"),
  distance,
  clamp,
});
boss.updateBossAttacks(0.1);
boss.updateBossAttacks(0.1);
assert.equal(bossCalls.length, 1, "boss blast damages player once");
assert.equal(bossKnockbacks.filter((actor) => actor === "player").length, 1, "boss blast knocks player once");
assert.equal(bossKnockbacks.filter((actor) => actor === "enemy").length, 1, "boss blast knocks nearby living enemy once");
assert.deepEqual(bossGame.enemies.map((enemy) => enemy.hp), [91, 100, 0], "boss blast damages only nearby living enemies once");
bossGame.bossAttacks = [{ type: "boss_slash", age: 0, windup: 0, hit: false, x: 0, y: 0, radius: 30, damage: 9, dirX: 1, dirY: 0, arc: Math.PI }];
boss.updateBossAttacks(0.1);
assert.deepEqual(bossGame.enemies.map((enemy) => enemy.hp), [91, 100, 0], "nonexplosive boss slash keeps its existing enemy behavior");
assert.equal(bossKnockbacks.length, 2, "nonexplosive slash creates no blast knockback");

console.log("explosion physics smoke passed");

function targetAreaFixture(mode = "normal", { playerX = 0 } = {}) {
  const target = { hp: 100, id: "target", radius: 5, x: 0, y: 0 };
  const near = { hp: 100, id: "near", radius: 5, x: 40, y: 0 };
  const dead = { hp: 0, id: "dead", radius: 5, x: 10, y: 0 };
  const far = { hp: 100, id: "far", radius: 5, x: 46, y: 0 };
  const game = {
    areas: [],
    beams: [],
    enemies: [target, near, dead, far],
    player: { hp: mode === "death" ? 5 : 100, radius: 10, targetX: playerX, targetY: 0, x: playerX, y: 0 },
    weaponBursts: [],
    weaponIconFlashes: {},
  };
  const enemyCalls = [];
  const playerCalls = [];
  const knockbacks = [];
  const system = createWeaponBehaviorSystem({
    getGame: () => game,
    getRunUpgradeTier: () => 0,
    nearestEnemy: () => target,
    weaponDamage: () => 20,
    weaponReach: () => 40,
    weaponWidth: () => 1,
    weaponDefs: { meteor_pin: { color: "#f55" } },
    damageEnemy: (enemy, amount) => {
      enemy.hp -= amount;
      enemyCalls.push(enemy.id);
      return amount;
    },
    damagePlayer: (amount) => {
      playerCalls.push(amount);
      if (mode === "invulnerable" || mode === "dodge") return 0;
      if (mode === "teleport") {
        game.player.x = 90;
        game.player.targetX = 90;
        return amount;
      }
      const dealt = mode === "reduced" ? amount * 0.4 : amount;
      game.player.hp -= dealt;
      return dealt;
    },
    reapEnemies() {},
    addQuestProgress() {},
    applyRadialKnockback: (actor, origin) => {
      knockbacks.push({ actor: actor === game.player ? "player" : actor.id, origin: { x: origin.x, y: origin.y } });
      if (actor === target) target.x = 200;
    },
    distance,
  });
  system.fireTargetArea("meteor_pin");
  return { enemyCalls, game, knockbacks, playerCalls, system };
}
