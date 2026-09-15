// GENERATED FILE. Do not edit directly.
// Source: src/modules/weapon-projectiles.js
// Run: npm run build:bridges
// Retired global: TapSurvivorWeaponProjectiles. Exports are supplied through the game dependency bag.
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
  function rotateVector(vx, vy, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [vx * cos - vy * sin, vx * sin + vy * cos];
  }

  /**
   * @param {{
   *   canvas: ProjectileCanvas,
   *   spatial?: {
   *     physicalSize(game: ProjectileGame): ProjectileCanvas,
   *     solidWalls?(game: ProjectileGame): { x: number, y: number, width: number, height: number }[]
   *   },
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
  function createWeaponProjectileSystem({
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
      const walls = spatial?.solidWalls?.(game) || [];
      game.bolts.forEach((bolt) => {
        bolt.life -= dt;
        // Internal terrain is intentionally resolved before enemy overlap. A bolt
        // without Ricochet is absorbed at the first blocking wall, so it cannot
        // damage an enemy on the far side during this frame.
        if (walls.length && moveBoltThroughWalls(bolt, walls, dt)) {
          bolt.life = 0;
          return;
        }
        if (!walls.length) {
          bolt.x += bolt.vx * dt;
          bolt.y += bolt.vy * dt;
        }
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

  const WALL_CLEARANCE_EPSILON = 0.000001;
  const WALL_TIME_EPSILON = 0.000000001;
  const WALL_DIRECTION_EPSILON = 0.000000000001;

  /**
   * @typedef {{
   *   time: number,
   *   normalX: number,
   *   normalY: number,
   *   initialOverlap?: boolean,
   *   clearance?: number
   * }} ProjectileWallHit
   */

  /**
   * Moves a player bolt through its frame travel, reflecting from the first
   * rounded wall boundary it reaches. The loop consumes either one Ricochet
   * bounce or the bolt itself per contact, which leaves no unbounded contact
   * correction path for high-speed or joined-wall cases.
   *
   * @param {ProjectileBolt} bolt
   * @param {{ x: number, y: number, width: number, height: number }[]} walls
   * @param {number} dt
   * @returns {boolean} whether a wall absorbed the bolt
   */
  function moveBoltThroughWalls(bolt, walls, dt) {
    let travelX = bolt.vx * dt;
    let travelY = bolt.vy * dt;
    let contactsRemaining = Math.max(0, Math.floor(bolt.bounces || 0)) + 1;
    let overlapCorrections = walls.length;

    if (travelX === 0 && travelY === 0) {
      const overlap = firstProjectileWallHit(bolt, 0, 0, walls, Math.max(0, bolt.radius || 0));
      if (overlap?.initialOverlap) {
        bolt.x += overlap.normalX * overlap.clearance;
        bolt.y += overlap.normalY * overlap.clearance;
      }
      return false;
    }

    while (contactsRemaining > 0 && (travelX !== 0 || travelY !== 0)) {
      const hit = firstProjectileWallHit(
        bolt,
        travelX,
        travelY,
        walls,
        Math.max(0, bolt.radius || 0)
      );
      if (!hit) {
        bolt.x += travelX;
        bolt.y += travelY;
        return false;
      }

      if (hit.initialOverlap) {
        bolt.x += hit.normalX * hit.clearance;
        bolt.y += hit.normalY * hit.clearance;
        overlapCorrections -= 1;
        // A bolt born in terrain is depenetrated first. Outward and tangent
        // motion then keeps its existing direction and bounce budget.
        if (travelX * hit.normalX + travelY * hit.normalY >= -WALL_DIRECTION_EPSILON) {
          if (overlapCorrections < 0) return true;
          continue;
        }
      } else {
        bolt.x += travelX * hit.time;
        bolt.y += travelY * hit.time;
      }
      if (!(bolt.bounces > 0)) return true;

      // Move a tiny amount along the outward normal. This retains circle
      // clearance and lets a touching bolt separate on its next frame instead
      // of repeatedly consuming bounces at time zero.
      bolt.x += hit.normalX * WALL_CLEARANCE_EPSILON;
      bolt.y += hit.normalY * WALL_CLEARANCE_EPSILON;
      const remaining = Math.max(0, 1 - hit.time);
      [travelX, travelY] = reflectVector(travelX * remaining, travelY * remaining, hit);
      [bolt.vx, bolt.vy] = reflectVector(bolt.vx, bolt.vy, hit);
      bolt.bounces -= 1;
      contactsRemaining -= 1;
    }

    // Each reflecting contact consumes a bounce; separating overlap corrections
    // are bounded separately. No frame travel remains when this loop ends.
    return false;
  }

  /**
   * @param {PointLike} start
   * @param {number} dx
   * @param {number} dy
   * @param {{ x: number, y: number, width: number, height: number }[]} walls
   * @param {number} radius
   * @returns {ProjectileWallHit | null}
   */
  function firstProjectileWallHit(start, dx, dy, walls, radius) {
    let earliest = null;
    const simultaneous = [];
    for (const wall of walls) {
      const hit = sweepRoundedWall(start, dx, dy, wall, radius);
      if (!hit) continue;
      if (!earliest || hit.time < earliest.time) {
        earliest = hit;
        simultaneous.length = 0;
        simultaneous.push(hit);
      } else if (hit.time === earliest.time) {
        simultaneous.push(hit);
      }
    }
    if (!earliest) return null;
    if (earliest.initialOverlap) return earliest;
    const normalX = simultaneous.reduce((sum, hit) => sum + hit.normalX, 0);
    const normalY = simultaneous.reduce((sum, hit) => sum + hit.normalY, 0);
    const length = Math.hypot(normalX, normalY);
    return length > WALL_DIRECTION_EPSILON
      ? { time: earliest.time, normalX: normalX / length, normalY: normalY / length }
      : earliest;
  }

  /**
   * Sweeps a circle centre against a rectangle expanded by its radius, with
   * circular corner caps rather than a square AABB corner. That keeps the bolt
   * radius-clear at oblique and corner impacts without clipping a maze turn.
   * @returns {ProjectileWallHit | null}
   */
  function sweepRoundedWall(start, dx, dy, wall, radius) {
    const overlap = initialWallOverlap(start, wall, radius);
    if (overlap) return overlap;
    const candidates = [];
    const wallRight = wall.x + wall.width;
    const wallBottom = wall.y + wall.height;
    const left = wall.x - radius;
    const right = wall.x + wall.width + radius;
    const top = wall.y - radius;
    const bottom = wall.y + wall.height + radius;
    const addFace = (time, normalX, normalY, coordinate, min, max) => {
      if (
        validTravelTime(time) &&
        coordinate >= min - WALL_TIME_EPSILON &&
        coordinate <= max + WALL_TIME_EPSILON &&
        dx * normalX + dy * normalY < -WALL_DIRECTION_EPSILON
      )
        candidates.push({ time: clampTravelTime(time), normalX, normalY });
    };
    if (dx !== 0) {
      let time = (left - start.x) / dx;
      addFace(time, -1, 0, start.y + dy * time, wall.y, wall.y + wall.height);
      time = (right - start.x) / dx;
      addFace(time, 1, 0, start.y + dy * time, wall.y, wall.y + wall.height);
    }
    if (dy !== 0) {
      let time = (top - start.y) / dy;
      addFace(time, 0, -1, start.x + dx * time, wall.x, wall.x + wall.width);
      time = (bottom - start.y) / dy;
      addFace(time, 0, 1, start.x + dx * time, wall.x, wall.x + wall.width);
    }
    for (const [x, y, accepts] of [
      [wall.x, wall.y, (point) => point.x <= wall.x && point.y <= wall.y],
      [wallRight, wall.y, (point) => point.x >= wallRight && point.y <= wall.y],
      [wall.x, wallBottom, (point) => point.x <= wall.x && point.y >= wallBottom],
      [wallRight, wallBottom, (point) => point.x >= wallRight && point.y >= wallBottom],
    ]) {
      const time = sweepCircleTime(start, dx, dy, x, y, radius);
      if (time === null) continue;
      const point = { x: start.x + dx * time, y: start.y + dy * time };
      if (!accepts(point)) continue;
      const normalX = (point.x - x) / radius;
      const normalY = (point.y - y) / radius;
      if (dx * normalX + dy * normalY < -WALL_DIRECTION_EPSILON)
        candidates.push({ time, normalX, normalY });
    }
    return candidates.reduce(
      (earliest, candidate) => (!earliest || candidate.time < earliest.time ? candidate : earliest),
      null
    );
  }

  function sweepCircleTime(start, dx, dy, x, y, radius) {
    if (!(radius > 0)) return null;
    const offsetX = start.x - x;
    const offsetY = start.y - y;
    const a = dx * dx + dy * dy;
    const b = 2 * (offsetX * dx + offsetY * dy);
    const c = offsetX * offsetX + offsetY * offsetY - radius * radius;
    const discriminant = b * b - 4 * a * c;
    if (!(a > 0) || discriminant < 0) return null;
    const time = (-b - Math.sqrt(discriminant)) / (2 * a);
    return validTravelTime(time) ? clampTravelTime(time) : null;
  }

  function initialWallOverlap(start, wall, radius) {
    if (!(radius > 0)) return null;
    const nearestX = Math.max(wall.x, Math.min(wall.x + wall.width, start.x));
    const nearestY = Math.max(wall.y, Math.min(wall.y + wall.height, start.y));
    const offsetX = start.x - nearestX;
    const offsetY = start.y - nearestY;
    const distance = Math.hypot(offsetX, offsetY);
    if (distance >= radius - WALL_CLEARANCE_EPSILON) return null;
    if (distance > WALL_DIRECTION_EPSILON) {
      return {
        time: 0,
        normalX: offsetX / distance,
        normalY: offsetY / distance,
        initialOverlap: true,
        clearance: radius - distance + WALL_CLEARANCE_EPSILON,
      };
    }
    const exits = [
      { distance: start.x - wall.x, normalX: -1, normalY: 0 },
      { distance: wall.x + wall.width - start.x, normalX: 1, normalY: 0 },
      { distance: start.y - wall.y, normalX: 0, normalY: -1 },
      { distance: wall.y + wall.height - start.y, normalX: 0, normalY: 1 },
    ];
    exits.sort((left, right) => left.distance - right.distance);
    return {
      time: 0,
      normalX: exits[0].normalX,
      normalY: exits[0].normalY,
      initialOverlap: true,
      clearance: radius + exits[0].distance + WALL_CLEARANCE_EPSILON,
    };
  }

  function validTravelTime(time) {
    return time >= -WALL_TIME_EPSILON && time <= 1 + WALL_TIME_EPSILON;
  }

  function clampTravelTime(time) {
    return Math.max(0, Math.min(1, time));
  }

  function reflectVector(x, y, { normalX, normalY }) {
    const projection = x * normalX + y * normalY;
    return [x - 2 * projection * normalX, y - 2 * projection * normalY];
  }
})();
