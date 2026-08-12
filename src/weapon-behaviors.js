// GENERATED FILE. Do not edit directly.
// Source: src/modules/weapon-behaviors.js
// Run: npm run build:bridges
// Retired global: TapSurvivorWeaponBehaviors. Exports are supplied through the game dependency bag.
(() => {
  "use strict";

  const MODULE_NATIVE_WEAPON_BEHAVIORS_SLOTS = Object.freeze(["weaponBehaviors"]);

  const MODULE_NATIVE_WEAPON_BEHAVIORS_PROOF_SLOTS = Object.freeze(["createWeaponBehaviorSystem"]);

  /**
   * @param {any} [options]
   */
  function createWeaponBehaviorSystem({
    weaponDefs,
    getGame,
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
      if (!target) return;
      const p = game.player;
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const dirX = dx / dist;
      const dirY = dy / dist;
      let dealt = 0;

      game.enemies.forEach((enemy) => {
        const toEnemyX = enemy.x - p.x;
        const toEnemyY = enemy.y - p.y;
        const along = toEnemyX * dirX + toEnemyY * dirY;
        const reach = weaponReach(weapon);
        if (along < 0 || along > reach) return;
        const side = Math.abs(toEnemyX * dirY - toEnemyY * dirX);
        if (side <= weaponWidth(weapon) + enemy.radius) {
          dealt += damageEnemy(enemy, weaponDamage(weaponId), weaponId);
        }
      });

      if (dealt > 0 && weaponId === "prism_beam") {
        game.laserDamage += dealt;
        addQuestProgress("use_laser_run", 1);
      }

      game.beams.push({
        weaponId,
        x: p.x,
        y: p.y,
        endX: p.x + dirX * weaponReach(weapon),
        endY: p.y + dirY * weaponReach(weapon),
        width: weaponWidth(weapon),
        color: weapon.color,
        life: 0.16,
      });
      reapEnemies();
    }

    function fireCone(weaponId) {
      const game = getGame();
      const weapon = weaponDefs[weaponId];
      const target = nearestEnemy();
      if (!target) return;
      const p = game.player;
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const dirX = dx / dist;
      const dirY = dy / dist;
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
        from = enemy;
      });
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
})();
