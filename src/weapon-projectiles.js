// GENERATED FILE. Do not edit directly.
// Source: src/modules/weapon-projectiles.js
// Run: npm run build:bridges
(() => {
  "use strict";

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
   * @typedef {{ x: number, y: number }} Player
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
  function rotateVector(vx, vy, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [vx * cos - vy * sin, vx * sin + vy * cos];
  }

  /**
   * @param {{
   *   canvas: ProjectileCanvas,
   *   weaponDefs: WeaponDefs,
   *   getGame: () => ProjectileGame,
   *   getRunUpgradeTier: (id: string) => number,
   *   getRelicSpecialEffects?: () => { doubleShotCount?: number, projectileSpeedBonus?: number },
   *   nearestEnemy: () => Enemy | null,
   *   projectileRadius: (weapon: WeaponDef) => number,
   *   weaponDamage: (weaponId: string) => number,
   *   projectileSkillModifier: (weapon: WeaponDef, field: string) => number,
   *   damageEnemy: (enemy: Enemy, damage: number, weaponId: string) => void,
   *   reapEnemies: () => void,
   *   distance: (a: PointLike, b: PointLike) => number,
   *   clamp: (value: number, min: number, max: number) => number
   * }} options
   * @returns {WeaponProjectileSystem}
   */
  function createWeaponProjectileSystem({
    canvas,
    weaponDefs,
    getGame,
    getRunUpgradeTier,
    getRelicSpecialEffects,
    nearestEnemy,
    projectileRadius,
    weaponDamage,
    projectileSkillModifier,
    damageEnemy,
    reapEnemies,
    distance,
    clamp,
  }) {
    function fireProjectile(weaponId) {
      const game = getGame();
      const weapon = weaponDefs[weaponId];
      const target = nearestEnemy();
      if (!target) return;
      const p = game.player;
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const relicEffects = getRelicSpecialEffects?.() || {};
      const speed =
        weapon.speed *
        (1 + (relicEffects.projectileSpeedBonus || 0)) *
        projectileSkillModifier(weapon, "projectileSpeedMultiplier");
      const baseVx = (dx / dist) * speed;
      const baseVy = (dy / dist) * speed;
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
      game.bolts.forEach((bolt) => {
        bolt.x += bolt.vx * dt;
        bolt.y += bolt.vy * dt;
        bolt.life -= dt;
        if (bolt.bounces > 0 && (bolt.x < bolt.radius || bolt.x > canvas.width - bolt.radius)) {
          bolt.vx *= -1;
          bolt.x = clamp(bolt.x, bolt.radius, canvas.width - bolt.radius);
          bolt.bounces -= 1;
        }
        if (bolt.bounces > 0 && (bolt.y < bolt.radius || bolt.y > canvas.height - bolt.radius)) {
          bolt.vy *= -1;
          bolt.y = clamp(bolt.y, bolt.radius, canvas.height - bolt.radius);
          bolt.bounces -= 1;
        }
        const enemy = game.enemies.find(
          (candidate) =>
            !bolt.hit.has(candidate) && distance(bolt, candidate) < bolt.radius + candidate.radius
        );
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
      const game = getGame();
      game.enemies.forEach((candidate) => {
        if (candidate === enemy || candidate.hp <= 0) return;
        if (distance(enemy, candidate) <= radius + candidate.radius) {
          damageEnemy(candidate, damage, bolt.weaponId);
        }
      });
      game.areas.push({
        x: enemy.x,
        y: enemy.y,
        radius,
        color: bolt.color,
        life: 0.18,
        visualOnly: true,
      });
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

  globalThis.TapSurvivorWeaponProjectiles = {
    createWeaponProjectileSystem,
    rotateVector,
  };
})();
