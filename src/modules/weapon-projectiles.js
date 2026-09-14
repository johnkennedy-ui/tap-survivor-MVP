/**
 * @typedef {{ x: number, y: number, radius?: number, hp?: number }} PointLike
 * @typedef {{
 *   id?: string,
 *   kind?: string,
 *   speed: number,
 *   color?: string,
 *   pierce?: number
 * }} WeaponDef
 * @typedef {Record<string, WeaponDef>} WeaponDefs
 * @typedef {{ width: number, height: number }} ProjectileCanvas
 * @typedef {{ x: number, y: number, radius?: number, hp?: number, targetX?: number, targetY?: number }} Player
 * @typedef {{ x: number, y: number, radius: number, hp?: number }} Enemy
 * @typedef {{
 *   weaponId: string,
 *   x: number,
 *   y: number,
 *   vx: number,
 *   vy: number,
 *   radius: number,
 *   damage: number,
 *   life: number,
 *   pierce: number,
 *   bounces: number,
 *   splitDepth: number,
 *   hit: Set<Enemy>,
 *   color?: string
 * }} ProjectileBolt
 * @typedef {{ x: number, y: number, radius: number, color?: string, life: number, visualOnly: boolean }} AreaEffect
 * @typedef {{ player: Player, bolts: ProjectileBolt[], enemies: Enemy[], areas: AreaEffect[] }} ProjectileGame
 * @typedef {{
 *   fireProjectile(weaponId: string): void,
 *   spawnProjectileBolt(
 *     weaponId: string,
 *     x: number,
 *     y: number,
 *     vx: number,
 *     vy: number,
 *     overrides?: Partial<ProjectileBolt>
 *   ): void,
 *   updateBolts(dt: number): void
 * }} WeaponProjectileSystem
 */

/**
 * @param {number} vx
 * @param {number} vy
 * @param {number} angle
 * @returns {[number, number]}
 */
export function rotateVector(vx, vy, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [vx * cos - vy * sin, vx * sin + vy * cos];
}

/**
 * @param {{
 *   canvas: ProjectileCanvas,
 *   spatial?: { physicalSize(game: ProjectileGame): ProjectileCanvas },
 *   weaponDefs: WeaponDefs,
 *   getGame: () => ProjectileGame,
 *   getRunUpgradeTier: (id: string) => number,
 *   getRelicSpecialEffects?: () => { doubleShotCount?: number, projectileSpeedBonus?: number },
 *   nearestEnemy: () => Enemy | null,
 *   projectileRadius: (weapon: WeaponDef) => number,
 *   weaponDamage: (weaponId: string) => number,
 *   projectileSkillModifier: (weapon: WeaponDef, field: string) => number,
 *   damageEnemy: (enemy: Enemy, damage: number, weaponId: string) => void,
 *   damagePlayer?: (damage: number, source?: Record<string, unknown>) => number | void,
 *   reapEnemies: () => void,
 *   applyRadialKnockback?: (
 *     actor: PointLike,
 *     origin: PointLike,
 *     force: number,
 *     options?: { radius?: number, targetFollows?: boolean }
 *   ) => void,
 *   distance: (a: PointLike, b: PointLike) => number,
 *   clamp: (value: number, min: number, max: number) => number
 * }} options
 * @returns {WeaponProjectileSystem}
 */
export function createWeaponProjectileSystem({
  canvas,
  spatial,
  weaponDefs,
  getGame,
  getRunUpgradeTier,
  getRelicSpecialEffects,
  nearestEnemy,
  projectileRadius,
  weaponDamage,
  projectileSkillModifier,
  damageEnemy,
  damagePlayer,
  reapEnemies,
  applyRadialKnockback,
  distance,
  clamp,
}) {
  function fireProjectile(weaponId) {
    const game = getGame();
    const weapon = weaponDefs[weaponId];
    const target = nearestEnemy();
    const p = game.player;
    const direction = target
      ? normalizeVector(target.x - p.x, target.y - p.y)
      : playerFacingVector(p);
    const relicEffects = getRelicSpecialEffects?.() || {};
    const speed =
      weapon.speed *
      (1 + (relicEffects.projectileSpeedBonus || 0)) *
      projectileSkillModifier(weapon, "projectileSpeedMultiplier");
    const baseVx = direction.x * speed;
    const baseVy = direction.y * speed;
    const splitTier = getRunUpgradeTier("run_split_shot");
    const spread = 0.26;

    spawnProjectileBolt(weaponId, p.x, p.y, baseVx, baseVy);
    if (relicEffects.doubleShotCount) {
      spawnProjectileBolt(weaponId, p.x, p.y, ...rotateVector(baseVx, baseVy, -spread * 0.5));
    }
    if (splitTier >= 1) {
      spawnProjectileBolt(weaponId, p.x, p.y, ...rotateVector(baseVx, baseVy, -spread));
      spawnProjectileBolt(weaponId, p.x, p.y, ...rotateVector(baseVx, baseVy, spread));
    }
    if (splitTier >= 2) {
      spawnProjectileBolt(weaponId, p.x, p.y, ...rotateVector(baseVx, baseVy, -spread * 2));
      spawnProjectileBolt(weaponId, p.x, p.y, ...rotateVector(baseVx, baseVy, spread * 2));
    }
  }

  function normalizeVector(x, y) {
    const length = Math.max(1, Math.hypot(x, y));
    return { x: x / length, y: y / length };
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

  function spawnProjectileBolt(weaponId, x, y, vx, vy, overrides = {}) {
    const game = getGame();
    const weapon = weaponDefs[weaponId];
    game.bolts.push({
      weaponId,
      x,
      y,
      vx,
      vy,
      radius: projectileRadius(weapon),
      damage: weaponDamage(weaponId),
      life: 1.8,
      pierce: (weapon.pierce || 0) + getRunUpgradeTier("run_projectile_pierce"),
      bounces: getRunUpgradeTier("run_wall_bounce"),
      splitDepth: 0,
      hit: new Set(),
      color: weapon.color,
      ...overrides,
    });
  }

  function updateBolts(dt) {
    const game = getGame();
    const bounds = spatial?.physicalSize(game) || canvas;
    game.bolts.forEach((bolt) => {
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      bolt.life -= dt;
      if (bolt.bounces > 0 && (bolt.x < bolt.radius || bolt.x > bounds.width - bolt.radius)) {
        bolt.vx *= -1;
        bolt.x = clamp(bolt.x, bolt.radius, bounds.width - bolt.radius);
        bolt.bounces -= 1;
      }
      if (bolt.bounces > 0 && (bolt.y < bolt.radius || bolt.y > bounds.height - bolt.radius)) {
        bolt.vy *= -1;
        bolt.y = clamp(bolt.y, bolt.radius, bounds.height - bolt.radius);
        bolt.bounces -= 1;
      }
      const enemy = game.enemies.find((candidate) => {
        if (bolt.hit.has(candidate)) return false;
        const radius = bolt.radius + candidate.radius;
        const x = bolt.x - candidate.x;
        const y = bolt.y - candidate.y;
        return x * x + y * y < radius * radius && distance(bolt, candidate) < radius;
      });
      if (enemy) {
        damageEnemy(enemy, bolt.damage, bolt.weaponId);
        explodeBolt(bolt, enemy);
        splitBoltOnHit(bolt);
        bolt.hit.add(enemy);
        if (bolt.pierce > 0) {
          bolt.pierce -= 1;
        } else {
          bolt.life = 0;
        }
      }
    });
    game.bolts = game.bolts.filter((bolt) => bolt.life > 0);
    reapEnemies();
  }

  function explodeBolt(bolt, enemy) {
    const explosionTier = getRunUpgradeTier("run_explosive_hit");
    if (!explosionTier) return;
    const radius = 42 + explosionTier * 18;
    const damage = bolt.damage * (0.28 + explosionTier * 0.08);
    const knockback = explosionKnockback(radius);
    const game = getGame();
    const origin = { x: enemy.x, y: enemy.y, radius: enemy.radius };
    applyRadialKnockback?.(enemy, impactKnockbackOrigin(bolt, enemy), knockback);
    game.enemies.forEach((candidate) => {
      if (candidate === enemy || candidate.hp <= 0) return;
      if (distance(origin, candidate) <= radius + candidate.radius) {
        damageEnemy(candidate, damage, bolt.weaponId);
        applyRadialKnockback?.(candidate, origin, knockback, { radius });
      }
    });
    applyPlayerExplosion(origin, radius, damage, knockback, {
      type: "explosive_hit",
      weaponId: bolt.weaponId,
      bolt,
    });
    game.areas.push({
      x: origin.x,
      y: origin.y,
      radius,
      color: bolt.color,
      life: 0.18,
      visualOnly: true,
    });
  }

  function applyPlayerExplosion(origin, radius, damage, knockback, source) {
    const game = getGame();
    const player = game.player;
    if (!player || distance(origin, player) > radius + actorRadius(player)) return;
    const beforeX = player.x;
    const beforeY = player.y;
    const dealt = damagePlayer?.(damage, { ...source, origin });
    if (
      typeof dealt !== "number" ||
      !(dealt > 0) ||
      !(player.hp > 0) ||
      player.x !== beforeX ||
      player.y !== beforeY
    )
      return;
    applyRadialKnockback?.(player, origin, knockback * 0.82, {
      radius,
      targetFollows: true,
    });
  }

  function impactKnockbackOrigin(bolt, enemy) {
    const speed = Math.hypot(bolt.vx || 0, bolt.vy || 0);
    if (speed <= 0.0001) return enemy;
    return {
      x: enemy.x - bolt.vx / speed,
      y: enemy.y - bolt.vy / speed,
    };
  }

  function explosionKnockback(radius) {
    return Math.min(54, Math.max(24, radius * 0.45));
  }

  function actorRadius(actor) {
    return Number.isFinite(actor?.radius) ? Math.max(0, actor.radius) : 0;
  }

  function splitBoltOnHit(bolt) {
    const splitTier = getRunUpgradeTier("run_split_on_hit");
    if (!splitTier || bolt.splitDepth >= splitTier) return;
    const speed = Math.max(1, Math.hypot(bolt.vx, bolt.vy));
    const left = rotateVector(bolt.vx, bolt.vy, -0.72);
    const right = rotateVector(bolt.vx, bolt.vy, 0.72);
    [left, right].forEach(([vx, vy]) => {
      const magnitude = Math.max(1, Math.hypot(vx, vy));
      spawnProjectileBolt(
        bolt.weaponId,
        bolt.x,
        bolt.y,
        (vx / magnitude) * speed,
        (vy / magnitude) * speed,
        {
          damage: bolt.damage * 0.55,
          life: 0.9,
          pierce: 0,
          bounces: 0,
          splitDepth: bolt.splitDepth + 1,
          hit: new Set(bolt.hit),
        }
      );
    });
  }

  return {
    fireProjectile,
    spawnProjectileBolt,
    updateBolts,
  };
}
