export const MODULE_NATIVE_ENEMY_BEHAVIOR_SLOTS = Object.freeze(["enemyBehaviors"]);

export const MODULE_NATIVE_ENEMY_BEHAVIOR_PROOF_SLOTS = Object.freeze([
  "createEnemyBehaviorSystem",
]);

/**
 * @param {any} [options]
 */
export function createEnemyBehaviorSystem({
  canvas,
  spatial,
  bossAbilities = {},
  boltConfig = {},
  getGame,
  distance,
  clamp,
  damagePlayer,
  damageEnemy,
  applyRadialKnockback,
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
        spatial?.resolveSolidTerrain?.(game, enemy, { x: previousX, y: previousY });
        updateEnemyVelocity(enemy, previousX, previousY, dt);
        return;
      }
      const playerDx = p.x - enemy.x;
      const playerDy = p.y - enemy.y;
      const chaseTarget = spatial?.routePosition?.(game, enemy, p) || p;
      const dx = chaseTarget.x - enemy.x;
      const dy = chaseTarget.y - enemy.y;
      const dist = Math.max(1, Math.hypot(playerDx, playerDy));
      const chaseDist = Math.max(1, Math.hypot(dx, dy));
      if (hasBossAbility(enemy, "charger") && enemy.chargeState) {
        enemy.facingX = enemy.chargeDirX;
        enemy.facingY = enemy.chargeDirY;
      } else if (enemy.attackRange && enemy.projectileCooldown && dist <= enemy.attackRange) {
        enemy.facingX = playerDx / dist;
        enemy.facingY = playerDy / dist;
      }
      if (hasBossAbility(enemy, "charger") && updateBossCharge(enemy, dt, previousX, previousY)) {
        updateEnemyVelocity(enemy, previousX, previousY, dt);
        applyEnemyTouch(enemy, dt);
        return;
      }
      const ranged = enemy.attackRange && enemy.projectileCooldown;
      if (!ranged || dist > enemy.attackRange * 0.72) {
        enemy.x += (dx / chaseDist) * enemy.speed * dt;
        enemy.y += (dy / chaseDist) * enemy.speed * dt;
      }
      spatial?.resolveSolidTerrain?.(game, enemy, { x: previousX, y: previousY });
      if (ranged && dist <= enemy.attackRange) {
        enemy.shootTimer -= dt;
        if (enemy.shootTimer <= 0) {
          enemy.shootTimer = enemy.projectileCooldown;
          spawnEnemyBolt(enemy, playerDx / dist, playerDy / dist);
        }
      }
      applyEnemyTouch(enemy, dt);
      updateEnemyVelocity(enemy, previousX, previousY, dt);
    });
  }

  function updateBossCharge(boss, dt, previousX = boss.x, previousY = boss.y) {
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
    const bounds = spatial?.physicalSize(game) || canvas;
    boss.x = clamp(
      boss.x + boss.chargeDirX * boss.chargeSpeed * dt,
      boss.radius,
      bounds.width - boss.radius
    );
    boss.y = clamp(
      boss.y + boss.chargeDirY * boss.chargeSpeed * dt,
      boss.radius,
      bounds.height - boss.radius
    );
    spatial?.resolveSolidTerrain?.(game, boss, { x: previousX, y: previousY });
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
        if (attack.type !== "boss_slash") {
          for (const enemy of game.enemies || []) {
            if (!(enemy.hp > 0) || distance(enemy, attack) > enemy.radius + attack.radius) continue;
            damageEnemy?.(enemy, attack.damage, "enemy_blast");
            applyRadialKnockback?.(enemy, attack, bossBlastKnockback(attack), {
              radius: attack.radius,
            });
          }
        }
        if (
          attack.type === "boss_slash"
            ? playerInSlash(p, attack)
            : distance(p, attack) <= p.radius + attack.radius
        ) {
          const beforeX = p.x;
          const beforeY = p.y;
          const dealt = damagePlayer?.(attack.damage, { type: attack.type, attack });
          if (attack.type !== "boss_slash" && dealt > 0 && p.hp > 0 && p.x === beforeX && p.y === beforeY) {
            applyRadialKnockback?.(p, attack, bossBlastKnockback(attack), {
              radius: attack.radius,
              targetFollows: true,
            });
          }
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
    if (Math.hypot(enemy.vx, enemy.vy) > 0.01) {
      enemy.facingX = enemy.vx / Math.hypot(enemy.vx, enemy.vy);
      enemy.facingY = enemy.vy / Math.hypot(enemy.vx, enemy.vy);
    }
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
    const bounds = spatial?.physicalSize(game) || canvas;
    game.enemyBolts = game.enemyBolts.filter(
      (bolt) =>
        bolt.life > 0 &&
        bolt.x > -24 &&
        bolt.x < bounds.width + 24 &&
        bolt.y > -24 &&
        bolt.y < bounds.height + 24
    );
  }

  function hasBossAbility(boss, ability) {
    return boss.bossAbilities?.includes(ability) || boss.bossKind === ability;
  }

  function bossBlastKnockback(attack) {
    return Math.min(46, Math.max(24, (attack.radius || 0) * 0.22));
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
