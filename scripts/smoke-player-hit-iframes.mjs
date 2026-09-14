import assert from "node:assert/strict";

import { createBrowserRenderingAdapters } from "../src/app/browser-rendering-adapters.js";
import { createCombatDamageSystem } from "../src/modules/combat-damage.js";
import { createEnemyBehaviorSystem } from "../src/modules/enemy-behaviors.js";
import { createRenderer } from "../src/modules/rendering.js";
import { createRunStateSystem } from "../src/modules/run-state.js";
import { createRunUpdater } from "../src/modules/run-update.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const enemy = { hp: 100 };

verifyDamageGate();
verifySimulationTimerAndReset();
verifyRedFlashRendering();
console.log("player hit iframes smoke passed");

function verifyDamageGate() {
  const game = { player: player() };
  const damage = damageSystem(game);
  assert.equal(damage.damagePlayer(10, { enemy }), 10, "contact hit damages player");
  assert.equal(game.player.hp, 90);
  assert.equal(game.player.hitInvincibilityTimer, 0.5, "enemy hit starts half-second immunity");
  assert.equal(damage.damagePlayer(10, { enemy }), 0, "enemy hit is blocked before expiry");
  assert.equal(game.player.hitInvincibilityTimer, 0.5, "blocked hit does not refresh immunity");
  assert.equal(damage.damagePlayer(4, { type: "self_blast" }), 4, "non-enemy self damage remains compatible");
  game.player.hitInvincibilityTimer = 0;
  assert.equal(damage.damagePlayer(0, { enemy }), 0, "zero damage does not start recovery");
  assert.equal(game.player.hitInvincibilityTimer, 0);
  game.player.invincibleTimer = 1;
  assert.equal(damage.damagePlayer(10, { enemy }), 0, "longer existing immunity remains authoritative");
  assert.equal(game.player.hitInvincibilityTimer, 0, "longer immunity does not create hit recovery");
  game.player.invincibleTimer = 0;
  const dodging = damageSystem(game, { dodgeChance: 1 });
  const random = Math.random;
  Math.random = () => 0;
  try {
    assert.equal(dodging.damagePlayer(10, { enemy }), 0, "dodge does not damage player");
  } finally {
    Math.random = random;
  }
  assert.equal(game.player.hitInvincibilityTimer, 0, "dodge does not start recovery");
}

function verifySimulationTimerAndReset() {
  const game = runningGame();
  const damage = damageSystem(game);
  const enemyBehaviors = createEnemyBehaviorSystem({
    canvas: { height: 100, width: 100 },
    getGame: () => game,
    damagePlayer: damage.damagePlayer,
    distance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
    clamp,
  });
  game.enemyBolts.push({ damage: 10, life: 1, radius: 2, vx: 0, vy: 0, x: 50, y: 50 });
  const updater = updaterFor(game, enemyBehaviors);
  updater.update(0.1);
  assert.equal(game.player.hp, 90, "actual enemy projectile damages through its owner");
  assert.equal(game.player.hitInvincibilityTimer, 0.5, "new hit is not decremented in its creation tick");
  game.paused = true;
  updater.update(1);
  assert.equal(game.player.hitInvincibilityTimer, 0.5, "pause freezes hit recovery");
  game.paused = false;
  updater.update(0.499);
  assert.ok(game.player.hitInvincibilityTimer > 0, "hit remains immune before 500ms");
  game.enemyBolts.push({ damage: 10, life: 1, radius: 2, vx: 0, vy: 0, x: 50, y: 50 });
  updater.update(0);
  assert.equal(game.player.hp, 90, "projectile before expiry is blocked");
  assert.ok(game.player.hitInvincibilityTimer > 0, "blocked projectile does not refresh timer");
  updater.update(0.001);
  assert.equal(game.player.hitInvincibilityTimer, 0, "hit recovery expires at 500ms");
  game.bossAttacks.push({ age: 0, damage: 10, hit: false, radius: 4, type: "shockwave", windup: 0, x: 50, y: 50 });
  enemyBehaviors.updateBossAttacks(0);
  assert.equal(game.player.hp, 80, "actual boss attack is accepted after expiry");
  assert.equal(game.player.hitInvincibilityTimer, 0.5, "boss attack starts recovery");
  const state = createRunStateSystem({
    canvas: { width: 100, height: 100 },
    getSave: () => ({ towerFloor: 1 }),
    getShopBonuses: () => ({ maxHp: 0, pickupRadius: 0, speed: 0 }),
    getUpgradeTier: () => 0,
    maxEquippedWeapons: () => 1,
  });
  assert.equal(state.resetGameState().player.hitInvincibilityTimer, undefined, "new run clears hit recovery");
}

function verifyRedFlashRendering() {
  for (const spriteDrawn of [true, false]) {
    const ctx = context();
    const renderer = createRenderer({
      canvas: { height: 100, width: 100 },
      ctx,
      clamp,
      createEnemyRenderer: () => ({ drawEnemy() {}, drawEnemyBolt() {} }),
      createHudRenderer: () => ({ drawBossSpawnNotice() {}, drawGameHud() {}, drawTowerFloorBadge() {} }),
      createSkillRailRenderer: () => ({}),
      drawImage: () => false,
      drawSprite: () => spriteDrawn,
      weaponDefs: {},
    });
    const game = runningGame();
    renderer.draw(game);
    const baselineFillStyle = ctx.fillStyle;
    const baselineAlpha = ctx.globalAlpha;
    game.player.hitInvincibilityTimer = 0.5;
    renderer.draw(game);
    assert.ok(ctx.fills.includes("#ff3b3b"), `red flash covers ${spriteDrawn ? "sprite" : "shape"} fallback`);
    assert.equal(ctx.fillStyle, baselineFillStyle, "flash restores fill style");
    assert.equal(ctx.globalAlpha, baselineAlpha, "flash restores alpha");
    const redFills = ctx.fills.filter((fill) => fill === "#ff3b3b").length;
    game.player.hitInvincibilityTimer = 0;
    renderer.draw(game);
    assert.equal(ctx.fills.filter((fill) => fill === "#ff3b3b").length, redFills, "native renderer flash turns off at expiry");
  }
  const ctx = context();
  const canvas = { height: 100, width: 100, getContext: () => ctx };
  const browser = createBrowserRenderingAdapters({ canvas }).renderers;
  const game = runningGame();
  game.player.hitInvincibilityTimer = 0.5;
  browser.renderPlayer({ game, spriteAdapters: { spriteSystem: { drawSprite: () => true } } });
  assert.ok(ctx.fills.includes("#ff3b3b"), "production browser adapter overlays real sprite with red flash");
  assert.equal(ctx.globalAlpha, 1, "browser adapter restores alpha");
  game.player.hitInvincibilityTimer = 0;
  const redFills = ctx.fills.filter((fill) => fill === "#ff3b3b").length;
  browser.renderPlayer({ game, spriteAdapters: { spriteSystem: { drawSprite: () => true } } });
  assert.equal(ctx.fills.filter((fill) => fill === "#ff3b3b").length, redFills, "browser adapter flash turns off at expiry");
}

function damageSystem(game, effects = {}) {
  return createCombatDamageSystem({
    canvas: { height: 100, width: 100 },
    getGame: () => game,
    getRelicSpecialEffects: () => effects,
    addQuestProgressForWeapon() {},
    addQuestProgressGroup() {},
    killQuestIds: [], damageQuestIds: [], bossQuestIds: [], spawnLootDrops() {}, distance: () => 999, clamp,
  });
}

function player() {
  return { hp: 100, maxHp: 100, pickupRadius: 20, radius: 10, targetX: 50, targetY: 50, x: 50, y: 50 };
}

function runningGame() {
  return {
    areas: [], beams: [], bolts: [], bossAttacks: [], elapsed: 0, enemies: [], enemyBolts: [], lootDrops: [],
    pickupTexts: [], player: player(), running: true, paused: false, weaponBursts: [], xpDrops: [],
  };
}

function updaterFor(game, enemyBehaviors) {
  const combat = Object.fromEntries(["spawnBoss", "spawnEnemies", "updateEnemies", "updateBossSpecials", "updateWeapons", "updateBolts", "updateAreas", "updateBeams", "updateWeaponBursts"].map((name) => [name, () => {}]));
  combat.updateEnemyBolts = enemyBehaviors.updateEnemyBolts;
  return createRunUpdater({
    canvas: { height: 100, width: 100 }, getGame: () => game, combat,
    pickupSystem: { updateLootDrops() {}, updatePickupTexts() {}, updateXpDrops() {} },
    addQuestProgressGroup() {}, survivalQuestIds: [], xpQuestIds: [], levelQuestIds: [], showLevelUp() {}, endRun() {},
    getRelicSpecialEffects: () => ({}), clamp,
  });
}

function context() {
  const states = [];
  return {
    fillStyle: "initial-fill", fills: [], globalAlpha: 1, lineWidth: 1, strokeStyle: "initial-stroke",
    arc() {}, beginPath() {}, clearRect() {}, fill() { this.fills.push(this.fillStyle); }, fillRect() {}, fillText() {},
    lineTo() {},
    moveTo() {},
    restore() { Object.assign(this, states.pop()); },
    save() {
      states.push({
        fillStyle: this.fillStyle,
        globalAlpha: this.globalAlpha,
        lineWidth: this.lineWidth,
        strokeStyle: this.strokeStyle,
      });
    },
    stroke() {},
    strokeRect() {},
  };
}
