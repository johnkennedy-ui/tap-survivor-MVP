import { createGameHarness } from "./smoke-game-harness.mjs";

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

function createBehaviorShot(enemy) {
  const harness = createGameHarness();
  const content = harness.context.TapSurvivorContent;
  const game = {
    player: { x: 0, y: 0, radius: 12, projectileBlockReady: false, projectileBlockCharge: 0 },
    enemies: [{ ...enemy, x: 120, y: 0, touchTimer: 999, touchCooldown: 999 }],
    enemyBolts: [],
    bossAttacks: [],
  };
  const behavior = harness.context.TapSurvivorEnemyBehaviors.createEnemyBehaviorSystem({
    canvas: harness.elements.get("game"),
    bossAbilities: content.bossAbilities,
    boltConfig: content.bossConfig.enemyBolt,
    getGame: () => game,
    distance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    damagePlayer() {},
  });

  behavior.updateEnemies(0.2);
  return {
    behavior,
    bolt: game.enemyBolts[0],
    content,
  };
}

const hexerShot = createBehaviorShot({
  ...createGameHarness().context.TapSurvivorContent.enemyTypes.find((enemy) => enemy.id === "hexer"),
  projectileCooldown: 0.1,
  shootTimer: 0,
  speed: 0,
});

check("hexer projectile resolves configured projectile colour", hexerShot.bolt?.color === "#b794ff");

const crimsonShot = createBehaviorShot({
  ...hexerShot.content.enemyTypes.find((enemy) => enemy.id === "crimson_hexer"),
  projectileCooldown: 0.1,
  shootTimer: 0,
  speed: 0,
});

check("crimson_hexer projectile resolves configured projectile colour", crimsonShot.bolt?.color === "#ff3f3f");

const turretAbility = crimsonShot.content.bossAbilities.turret;
const turretShot = createBehaviorShot({
  boss: true,
  bossKind: "turret",
  bossAbilities: ["turret"],
  color: turretAbility.color,
  projectileColor: crimsonShot.behavior.resolveBossProjectileColor(turretAbility),
  attackRange: turretAbility.attackRange,
  projectileCooldown: 0.1,
  projectileSpeed: turretAbility.projectileSpeed,
  projectileDamage: turretAbility.projectileDamage,
  shootTimer: 0,
  speed: 0,
  damage: 0,
  radius: 38,
});

check("turret boss projectile resolves configured projectile colour", turretShot.bolt?.color === "#b794ff");

const fallbackShot = createBehaviorShot({
  attackRange: 260,
  projectileCooldown: 0.1,
  projectileSpeed: 100,
  projectileDamage: 1,
  shootTimer: 0,
  speed: 0,
  damage: 0,
  radius: 10,
});

check("projectile colour fallback remains available", fallbackShot.bolt?.color === "#b794ff");

if (process.exitCode) {
  console.error("\nProjectile colour smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nProjectile colour smoke passed.");
