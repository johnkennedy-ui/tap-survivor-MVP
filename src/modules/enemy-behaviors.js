export const MODULE_NATIVE_ENEMY_BEHAVIOR_SLOTS = Object.freeze(["enemyBehaviors"]);

export const MODULE_NATIVE_ENEMY_BEHAVIOR_PROOF_SLOTS = Object.freeze([
  "createEnemyBehaviorSystem",
]);

/**
 * @param {any} [options]
 */
export function createEnemyBehaviorSystem({
  canvas,
  bossAbilities = {},
  boltConfig = {},
  getGame,
  distance,
  clamp,
  damagePlayer,
} = {}) {
  const safeProjectileColor = "#b794ff";

  function resolveEnemyProjectileColor(enemyType) {
    return firstColor(
      enemyType?.projectileColor,
      enemyType?.spriteAccentColor,
      enemyType?.accentColor,
      enemyType?.color,
      safeProjectileColor
    );
  }

  function resolveBossProjectileColor(bossAbility) {
    return firstColor(
      bossAbility?.projectileColor,
      bossAbility?.spriteAccentColor,
      bossAbility?.accentColor,
      bossAbility?.color,
      safeProjectileColor
    );
  }

  function firstColor(...colors) {
    return colors.find((color) => typeof color === "string" && color.trim()) || safeProjectileColor;
  }

  function updateEnemies(dt) {
    const game = getGame();
    const p = game.player;
    game.enemies.forEach((enemy) => {
      const previousX = enemy.x;
      const previousY = enemy.y;
      enemy.animTime = (enemy.animTime || 0) + dt;
      enemy.attackVisualTimer = Math.max(0, (enemy.attackVisualTimer || 0) - dt);
      if (enemy.boss && enemy.dropTimer > 0) {
        enemy.dropTimer = Math.max(0, enemy.dropTimer - dt);
        const progress = 1 - enemy.dropTimer / enemy.dropWindup;
        enemy.x = enemy.startX + (enemy.landingX - enemy.startX) * progress;
        enemy.y = enemy.startY + (enemy.landingY - enemy.startY) * progress;
        updateEnemyVelocity(enemy, previousX, previousY, dt);
        return;
      }
      const dx = p.x - enemy.x;
      const dy = p.y - enemy.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      if (hasBossAbility(enemy, "charger") && updateBossCharge(enemy, dt)) {
        updateEnemyVelocity(enemy, previousX, previousY, dt);
        applyEnemyTouch(enemy, dt);
        return;
      }
      const ranged = enemy.attackRange && enemy.projectileCooldown;
      if (!ranged || dist > enemy.attackRange * 0.72) {
        enemy.x += (dx / dist) * enemy.speed * dt;
        enemy.y += (dy / dist) * enemy.speed * dt;
      }
      if (ranged && dist <= enemy.attackRange) {
        enemy.shootTimer -= dt;
        if (enemy.shootTimer <= 0) {
          enemy.shootTimer = enemy.projectileCooldown;
          spawnEnemyBolt(enemy, dx / dist, dy / dist);
        }
      }
      applyEnemyTouch(enemy, dt);
      updateEnemyVelocity(enemy, previousX, previousY, dt);
    });
  }

  function updateBossCharge(boss, dt) {
    if (!boss.chargeState) return false;
    const game = getGame();
    boss.chargeTimer -= dt;
    if (boss.chargeState === "windup") {
      if (boss.chargeTimer <= 0) {
        boss.chargeState = "charging";
        boss.chargeTimer = bossAbilities.charger.duration;
      }
      return true;
    }
    boss.x = clamp(
      boss.x + boss.chargeDirX * boss.chargeSpeed * dt,
      boss.radius,
      canvas.width - boss.radius
    );
    boss.y = clamp(
      boss.y + boss.chargeDirY * boss.chargeSpeed * dt,
      boss.radius,
      canvas.height - boss.radius
    );
    if (boss.chargeTimer <= 0) {
      const slash = bossAbilities.charger.slash;
      game.bossAttacks.push({
        type: "boss_slash",
        x: boss.x + boss.chargeDirX * slash.offset,
        y: boss.y + boss.chargeDirY * slash.offset,
        dirX: boss.chargeDirX,
        dirY: boss.chargeDirY,
        arc: Math.PI * slash.arcPi,
        radius: boss.superBoss ? slash.superRadius : slash.radius,
        damage: boss.damage * (boss.superBoss ? slash.superDamageMultiplier : slash.damageMultiplier),
        age: 0,
        windup: slash.windup,
        hit: false,
      });
      boss.chargeState = "";
    }
    return true;
  }

  function startBossCharge(boss) {
    const game = getGame();
    const p = game.player;
    const dx = p.x - boss.x;
    const dy = p.y - boss.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    boss.chargeState = "windup";
    boss.chargeTimer = bossAbilities.charger.windup;
    boss.chargeDirX = dx / dist;
    boss.chargeDirY = dy / dist;
    boss.chargeSpeed = boss.superBoss
      ? bossAbilities.charger.superChargeSpeed
      : bossAbilities.charger.chargeSpeed;
  }

  function updateBossAttacks(dt) {
    const game = getGame();
    const p = game.player;
    game.bossAttacks.forEach((attack) => {
      attack.age += dt;
      if (!attack.hit && attack.age >= attack.windup) {
        attack.hit = true;
        if (
          attack.type === "boss_slash"
            ? playerInSlash(p, attack)
            : distance(p, attack) <= p.radius + attack.radius
        ) {
          damagePlayer?.(attack.damage, { type: attack.type, attack });
        }
      }
    });
    game.bossAttacks = game.bossAttacks.filter((attack) => attack.age <= attack.windup + 0.35);
  }

  function playerInSlash(player, attack) {
    const dx = player.x - attack.x;
    const dy = player.y - attack.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const dot = (dx / dist) * attack.dirX + (dy / dist) * attack.dirY;
    return dist <= attack.radius + player.radius && dot >= Math.cos(attack.arc / 2);
  }

  function applyEnemyTouch(enemy, dt) {
    const game = getGame();
    const p = game.player;
    enemy.touchTimer -= dt;
    if (distance(enemy, p) < p.radius + enemy.radius && enemy.touchTimer <= 0) {
      damagePlayer?.(enemy.damage, { type: "touch", enemy });
      enemy.touchTimer = enemy.touchCooldown;
    }
  }

  function spawnEnemyBolt(enemy, dirX, dirY) {
    const game = getGame();
    const projectileColor = resolveEnemyProjectileColor(enemy);
    enemy.attackVisualTimer = 0.26;
    game.enemyBolts.push({
      x: enemy.x,
      y: enemy.y,
      vx: dirX * enemy.projectileSpeed,
      vy: dirY * enemy.projectileSpeed,
      radius: boltConfig.radius || 5,
      damage: enemy.projectileDamage,
      life: boltConfig.life || 2.2,
      maxLife: boltConfig.life || 2.2,
      color: projectileColor,
      trailColor: projectileColor,
      glowColor: projectileColor,
    });
  }

  function updateEnemyVelocity(enemy, previousX, previousY, dt) {
    const divisor = Math.max(dt, 0.0001);
    enemy.vx = (enemy.x - previousX) / divisor;
    enemy.vy = (enemy.y - previousY) / divisor;
  }

  function updateEnemyBolts(dt) {
    const game = getGame();
    const p = game.player;
    game.enemyBolts.forEach((bolt) => {
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      bolt.life -= dt;
      if (distance(bolt, p) <= bolt.radius + p.radius) {
        if (p.projectileBlockReady) {
          p.projectileBlockReady = false;
          p.projectileBlockCharge = 0;
        } else {
          damagePlayer?.(bolt.damage, { type: "projectile", bolt });
        }
        bolt.life = 0;
      }
    });
    game.enemyBolts = game.enemyBolts.filter(
      (bolt) =>
        bolt.life > 0 &&
        bolt.x > -24 &&
        bolt.x < canvas.width + 24 &&
        bolt.y > -24 &&
        bolt.y < canvas.height + 24
    );
  }

  function hasBossAbility(boss, ability) {
    return boss.bossAbilities?.includes(ability) || boss.bossKind === ability;
  }

  return {
    resolveBossProjectileColor,
    resolveEnemyProjectileColor,
    startBossCharge,
    updateBossAttacks,
    updateEnemies,
    updateEnemyBolts,
  };
}
