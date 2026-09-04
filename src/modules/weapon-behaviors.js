export const MODULE_NATIVE_WEAPON_BEHAVIORS_SLOTS = Object.freeze(["weaponBehaviors"]);

export const MODULE_NATIVE_WEAPON_BEHAVIORS_PROOF_SLOTS = Object.freeze([
  "createWeaponBehaviorSystem",
]);

/**
 * @param {any} [options]
 */
export function createWeaponBehaviorSystem({
  canvas,
  weaponDefs,
  getGame,
  getRunUpgradeTier,
  nearestEnemy,
  weaponDamage,
  weaponReach,
  weaponWidth,
  damageEnemy,
  reapEnemies,
  addQuestProgress,
  distance,
} = {}) {
  function fireBeam(weaponId) {
    const game = getGame();
    const weapon = weaponDefs[weaponId];
    const target = nearestEnemy();
    const p = game.player;
    const { x: dirX, y: dirY } = target
      ? normalizeVector(target.x - p.x, target.y - p.y)
      : playerFacingVector(p);
    const splitTier = getRunUpgradeTier?.("run_split_shot") || 0;
    const directions = beamDirections(dirX, dirY, splitTier);
    const activeRicochetTier = getRunUpgradeTier?.("run_wall_bounce") || 0;
    const bounces =
      weaponId === "laser_staff" && !(game.levelUpRunUpgradeTiers?.run_wall_bounce > 0)
        ? 0
        : activeRicochetTier;
    const reach = weaponReach(weapon);
    const width = weaponWidth(weapon);
    const branch = { bounces, player: p, reach, weapon, weaponId, width };
    const dealt = directions.reduce((total, direction) => total + fireBranch(direction), 0);

    if (dealt > 0 && weaponId === "prism_beam") {
      game.laserDamage += dealt;
      addQuestProgress("use_laser_run", 1);
    }
    reapEnemies();

    function fireBranch(direction) {
      return fireBeamBranch(branch, direction);
    }
  }

  function fireBeamBranch({ bounces, player, reach, weapon, weaponId, width }, direction) {
    const game = getGame();
    const hitEnemies = new Set();
    let dealt = 0;
    let remaining = reach;
    let remainingBounces = Math.max(0, bounces);
    let startX = player.x;
    let startY = player.y;
    let dirX = direction.x;
    let dirY = direction.y;

    while (remaining > 0) {
      const wall = nextBeamWall(startX, startY, dirX, dirY);
      const segmentLength = Math.min(remaining, wall.distance);
      const endX = startX + dirX * segmentLength;
      const endY = startY + dirY * segmentLength;
      if (segmentLength > 0) {
        game.enemies.forEach((enemy) => {
          if (hitEnemies.has(enemy)) return;
          const toEnemyX = enemy.x - startX;
          const toEnemyY = enemy.y - startY;
          const along = toEnemyX * dirX + toEnemyY * dirY;
          if (along < 0 || along > segmentLength) return;
          const side = Math.abs(toEnemyX * dirY - toEnemyY * dirX);
          if (side <= width + enemy.radius) {
            dealt += damageEnemy(enemy, weaponDamage(weaponId), weaponId);
            hitEnemies.add(enemy);
          }
        });
        game.beams.push({
          weaponId,
          x: startX,
          y: startY,
          endX,
          endY,
          width,
          color: weapon.color,
          life: 0.16,
        });
      }
      remaining -= segmentLength;
      if (!wall.hit || remaining <= 0 || remainingBounces <= 0) break;
      if (wall.hitX) dirX *= -1;
      if (wall.hitY) dirY *= -1;
      remainingBounces -= 1;
      startX = endX + dirX * 0.001;
      startY = endY + dirY * 0.001;
    }
    return dealt;
  }

  function beamDirections(dirX, dirY, splitTier) {
    const spread = 0.26;
    const angles = [0];
    if (splitTier >= 1) angles.push(-spread, spread);
    if (splitTier >= 2) angles.push(-spread * 2, spread * 2);
    return angles.map((angle) => rotateDirection(dirX, dirY, angle));
  }

  function rotateDirection(x, y, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { x: x * cos - y * sin, y: x * sin + y * cos };
  }

  function nextBeamWall(x, y, dirX, dirY) {
    if (!Number.isFinite(canvas?.width) || !Number.isFinite(canvas?.height)) {
      return { distance: Infinity, hit: false, hitX: false, hitY: false };
    }
    const xDistance = dirX > 0 ? (canvas.width - x) / dirX : dirX < 0 ? -x / dirX : Infinity;
    const yDistance = dirY > 0 ? (canvas.height - y) / dirY : dirY < 0 ? -y / dirY : Infinity;
    const distance = Math.min(xDistance, yDistance);
    const epsilon = 0.000001;
    return {
      distance,
      hit: Number.isFinite(distance),
      hitX: Math.abs(xDistance - distance) <= epsilon,
      hitY: Math.abs(yDistance - distance) <= epsilon,
    };
  }

  function fireCone(weaponId) {
    const game = getGame();
    const weapon = weaponDefs[weaponId];
    const target = nearestEnemy();
    const p = game.player;
    const { x: dirX, y: dirY } = target
      ? normalizeVector(target.x - p.x, target.y - p.y)
      : playerFacingVector(p);
    game.enemies.forEach((enemy) => {
      const toEnemyX = enemy.x - p.x;
      const toEnemyY = enemy.y - p.y;
      const along = toEnemyX * dirX + toEnemyY * dirY;
      const reach = weaponReach(weapon);
      if (along < 0 || along > reach) return;
      const side = Math.abs(toEnemyX * dirY - toEnemyY * dirX);
      if (side <= weaponWidth(weapon)) damageEnemy(enemy, weaponDamage(weaponId), weaponId);
    });
    game.beams.push({
      weaponId,
      x: p.x,
      y: p.y,
      endX: p.x + dirX * weaponReach(weapon),
      endY: p.y + dirY * weaponReach(weapon),
      width: weaponWidth(weapon),
      color: weapon.color,
      life: 0.14,
    });
    reapEnemies();
  }

  function fireRadial(weaponId) {
    const game = getGame();
    const weapon = weaponDefs[weaponId];
    const p = game.player;
    const reach = weaponReach(weapon);
    game.enemies.forEach((enemy) => {
      if (distance(p, enemy) <= reach + enemy.radius) {
        damageEnemy(enemy, weaponDamage(weaponId), weaponId);
      }
    });
    if (weaponId === "shield_pulse") {
      chargeProjectileBlock(destroyEnemyProjectilesInRange(p, reach));
    }
    game.areas.push({
      weaponId,
      x: p.x,
      y: p.y,
      radius: reach,
      color: weapon.color,
      life: 0.24,
      visualOnly: true,
    });
    reapEnemies();
  }

  function destroyEnemyProjectilesInRange(player, reach) {
    const game = getGame();
    let destroyed = 0;
    game.enemyBolts.forEach((bolt) => {
      if (bolt.life > 0 && distance(player, bolt) <= reach + bolt.radius) {
        bolt.life = 0;
        destroyed += 1;
      }
    });
    game.enemyBolts = game.enemyBolts.filter((bolt) => bolt.life > 0);
    return destroyed;
  }

  function chargeProjectileBlock(amount) {
    const game = getGame();
    const p = game.player;
    if (!amount || p.projectileBlockReady) return;
    p.projectileBlockCharge = Math.min(p.projectileBlockNeeded, p.projectileBlockCharge + amount);
    if (p.projectileBlockCharge >= p.projectileBlockNeeded) {
      p.projectileBlockReady = true;
      p.projectileBlockCharge = p.projectileBlockNeeded;
    }
  }

  function fireChain(weaponId) {
    const game = getGame();
    const weapon = weaponDefs[weaponId];
    const p = game.player;
    const targets = [...game.enemies]
      .sort((a, b) => distance(p, a) - distance(p, b))
      .slice(0, weapon.jumps);
    let from = p;
    let emitted = false;
    targets.forEach((enemy) => {
      if (distance(from, enemy) > weaponReach(weapon)) return;
      damageEnemy(enemy, weaponDamage(weaponId), weaponId);
      game.beams.push({
        weaponId,
        x: from.x,
        y: from.y,
        endX: enemy.x,
        endY: enemy.y,
        width: 4,
        color: weapon.color,
        life: 0.12,
      });
      emitted = true;
      from = enemy;
    });
    if (!emitted) {
      const { x: dirX, y: dirY } = playerFacingVector(p);
      game.beams.push({
        weaponId,
        x: p.x,
        y: p.y,
        endX: p.x + dirX * weaponReach(weapon),
        endY: p.y + dirY * weaponReach(weapon),
        width: 4,
        color: weapon.color,
        life: 0.12,
      });
    }
    reapEnemies();
  }

  function fireTargetArea(weaponId) {
    const game = getGame();
    const weapon = weaponDefs[weaponId];
    const target = nearestEnemy();
    if (!target) return;
    game.enemies.forEach((enemy) => {
      if (distance(target, enemy) <= weaponReach(weapon) + enemy.radius) {
        damageEnemy(enemy, weaponDamage(weaponId), weaponId);
      }
    });
    game.areas.push({
      weaponId,
      x: target.x,
      y: target.y,
      radius: weaponReach(weapon),
      color: weapon.color,
      life: 0.28,
      visualOnly: true,
    });
    reapEnemies();
  }

  function fireLingeringArea(weaponId) {
    const game = getGame();
    const weapon = weaponDefs[weaponId];
    const target = nearestEnemy();
    if (!target) return;
    game.areas.push({
      weaponId,
      x: target.x,
      y: target.y,
      radius: weaponReach(weapon),
      color: weapon.color,
      life: weapon.duration,
      tick: weapon.tick,
      tickTimer: 0,
      damage: weaponDamage(weaponId),
    });
  }

  function fireMine(weaponId) {
    const game = getGame();
    const weapon = weaponDefs[weaponId];
    const p = game.player;
    const facing = playerFacingVector(p);
    const armDelay = mineArmDelay(weapon);
    game.areas.push({
      weaponId,
      x: p.x - facing.x * mineSpawnOffset(weapon),
      y: p.y - facing.y * mineSpawnOffset(weapon),
      radius: weaponReach(weapon),
      color: weapon.color,
      life: armDelay + mineExplosionLife(weapon),
      armDelay,
      explosionLife: mineExplosionLife(weapon),
      damageOnce: true,
      damage: weaponDamage(weaponId),
    });
  }

  function updateAreas(dt) {
    const game = getGame();
    game.areas.forEach((area) => {
      area.life -= dt;
      if (area.visualOnly || !area.weaponId) return;
      if (area.armDelay > 0) {
        area.armDelay = Math.max(0, area.armDelay - dt);
        if (area.armDelay > 0) return;
      }
      if (area.damageOnce) {
        if (!area.exploded) {
          damageEnemiesInArea(area);
          area.exploded = true;
          area.life = Math.min(area.life, area.explosionLife || 0.28);
        }
        return;
      }
      area.tickTimer -= dt;
      if (area.tickTimer > 0) return;
      area.tickTimer = area.tick;
      damageEnemiesInArea(area);
    });
    game.areas = game.areas.filter((area) => area.life > 0);
    reapEnemies();
  }

  function damageEnemiesInArea(area) {
    const game = getGame();
    game.enemies.forEach((enemy) => {
      if (distance(area, enemy) <= area.radius + enemy.radius) {
        damageEnemy(enemy, area.damage, area.weaponId);
      }
    });
  }

  function playerFacingVector(player) {
    if (Number.isFinite(player.facingX) && Number.isFinite(player.facingY)) {
      const length = Math.hypot(player.facingX, player.facingY);
      if (length > 0) return { x: player.facingX / length, y: player.facingY / length };
    }
    const dx = player.targetX - player.x;
    const dy = player.targetY - player.y;
    const distanceToTarget = Math.hypot(dx, dy);
    if (distanceToTarget > 0) return { x: dx / distanceToTarget, y: dy / distanceToTarget };
    return { x: 0, y: 1 };
  }

  function normalizeVector(x, y) {
    const length = Math.max(1, Math.hypot(x, y));
    return { x: x / length, y: y / length };
  }

  function mineArmDelay(weapon) {
    return Number.isFinite(weapon.armDelay) ? weapon.armDelay : 2;
  }

  function mineExplosionLife(weapon) {
    return Number.isFinite(weapon.explosionLife) ? weapon.explosionLife : 0.32;
  }

  function mineSpawnOffset(weapon) {
    return Math.max(24, weapon.spawnOffset || 58);
  }

  function updateBeams(dt) {
    const game = getGame();
    game.beams.forEach((beam) => (beam.life -= dt));
    game.beams = game.beams.filter((beam) => beam.life > 0);
  }

  function updateWeaponBursts(dt) {
    const game = getGame();
    game.weaponBursts.forEach((burst) => (burst.life -= dt));
    game.weaponBursts = game.weaponBursts.filter((burst) => burst.life > 0);
    Object.entries(game.weaponIconFlashes || {}).forEach(([weaponId, flash]) => {
      const next = flash - dt * 3.6;
      if (next > 0) game.weaponIconFlashes[weaponId] = next;
      else delete game.weaponIconFlashes[weaponId];
    });
  }

  return {
    fireBeam,
    fireChain,
    fireCone,
    fireLingeringArea,
    fireMine,
    fireRadial,
    fireTargetArea,
    updateAreas,
    updateBeams,
    updateWeaponBursts,
  };
}
