// GENERATED FILE. Do not edit directly.
// Source: src/modules/combat.js
// Run: npm run build:bridges
// Retired global: TapSurvivorCombat. Exports are supplied through the game dependency bag.
(() => {
  "use strict";

  const MODULE_NATIVE_COMBAT_SLOTS = Object.freeze(["combat"]);

  const MODULE_NATIVE_COMBAT_PROOF_SLOTS = Object.freeze(["createCombatSystem"]);

  /**
   * @param {any} [options]
   */
  function createCombatSystem({
    canvas,
    spatial,
    balance,
    combatDamage,
    content,
    enemies,
    enemyBehaviors,
    enemySpawning,
    enemyTypes,
    bossConfig,
    bossAbilities,
    levelDefs,
    getActiveFloorDef,
    weaponDefs,
    getGame,
    getUpgradeTier,
    getShopBonuses,
    getRelicSpecialEffects,
    addQuestProgress,
    addQuestProgressForWeapon,
    addQuestProgressGroup,
    killQuestIds,
    damageQuestIds,
    bossQuestIds,
    spawnLootDrops,
    getWeaponDamageMultiplier,
    playWeaponSfx,
    advanceTowerFloor,
    endRun,
    onBossSpawn,
    distance,
    clamp,
    weaponBehaviors,
    weaponCooldowns,
    weaponFire,
    weaponProjectiles,
    weaponTargeting,
  } = {}) {
    const actorMotion = new WeakMap();
    let actorMotionFrame;
    const maxSolverPasses = 10;
    const damageSystem = combatDamage.createCombatDamageSystem({
      canvas,
      spatial,
      getGame,
      getRelicSpecialEffects,
      addQuestProgressForWeapon,
      addQuestProgressGroup,
      killQuestIds,
      damageQuestIds,
      bossQuestIds,
      spawnLootDrops,
      advanceTowerFloor,
      distance,
      clamp,
      applyRadialKnockback,
    });
    const enemySystem = enemies.createEnemySystem({
      canvas,
      spatial,
      balance,
      enemyBehaviors,
      enemySpawning,
      enemyTypes,
      bossConfig,
      bossAbilities,
      levelDefs,
      getActiveFloorDef,
      getGame,
      distance,
      clamp,
      damagePlayer: damageSystem.damagePlayer,
      damageEnemy: damageSystem.damageEnemy,
      applyRadialKnockback,
      onBossSpawn,
    });
    const weaponFireSystem = weaponFire.createWeaponFireSystem({
      canvas,
      spatial,
      content,
      weaponDefs,
      getGame,
      getUpgradeTier,
      getRunUpgradeTier,
      getShopBonuses,
      getRelicSpecialEffects,
      getWeaponDamageMultiplier,
      playWeaponSfx,
      addQuestProgress,
      damageEnemy: damageSystem.damageEnemy,
      reapEnemies: damageSystem.reapEnemies,
      applyRadialKnockback,
      distance,
      clamp,
      weaponBehaviors,
      weaponCooldowns,
      weaponProjectiles,
      weaponTargeting,
      damagePlayer: damageSystem.damagePlayer,
    });

    function getRunUpgradeTier(id) {
      const game = getGame();
      return game?.runUpgradeTiers?.[id] || 0;
    }

    function beginActorMotionFrame(dt = 0) {
      actorMotionFrame = { dt, positions: new WeakMap(), sweptPairs: new Set() };
      captureActorMotionFrame();
    }

    function captureActorMotionFrame() {
      if (!actorMotionFrame) return;
      const game = getGame();
      [game?.player, ...(game?.enemies || [])].forEach((actor) => {
        if (actor && !actorMotionFrame.positions.has(actor)) {
          actorMotionFrame.positions.set(actor, snapshotActorMotion(actor));
        }
      });
    }

    function finishActorMotionFrame(dt = 0) {
      const frame = actorMotionFrame;
      actorMotionFrame = undefined;
      if (!frame) return;
      const game = getGame();
      const actors = [game?.player, ...(game?.enemies || [])].filter(isPhysicalActor);
      actors.forEach((actor) => {
        const start = frame.positions.get(actor);
        if (start) rememberActorMotion(actor, start, dt);
        else actorMotion.set(actor, snapshotActorMotion(actor));
      });
    }

    function resolveActorCollisions(dt = 0) {
      const game = getGame();
      if (!game?.player || !Array.isArray(game.enemies)) return;
      const actors = [game.player, ...game.enemies.filter(isCollisionActor)].filter(isPhysicalActor);
      const motion = new Map(actors.map((actor) => [actor, actorMotionFor(actor, dt)]));
      const sweptPairs = actorMotionFrame?.sweptPairs || new Set();
      actors.forEach((actor) => spatial?.resolveSolidTerrain?.(game, actor, motion.get(actor)));
      const passCount = Math.min(maxSolverPasses, Math.max(4, Math.ceil(Math.sqrt(actors.length)) + 2));
      for (let pass = 0; pass < passCount; pass += 1) {
        const playerMoved = resolvePlayerEnemyContacts(game.player, game.enemies, dt, motion, sweptPairs);
        const enemiesMoved = resolveEnemyEnemyContacts(game.enemies, dt, motion, sweptPairs);
        if (!playerMoved && !enemiesMoved) break;
      }
      clampActor(game.player);
      game.enemies.filter(isCollisionActor).forEach(clampActor);
      if (!actorMotionFrame) actors.forEach((actor) => rememberActorMotion(actor, motion.get(actor), dt));
    }

    function resolvePlayerEnemyContacts(player, enemyList, dt, motion, sweptPairs) {
      if (!isPhysicalActor(player)) return false;
      let moved = false;
      enemyList.forEach((enemy, index) => {
        if (!isCollisionActor(enemy)) return;
        const contact = pairContact(player, enemy, index, motion, sweptPairs, `player:${index}`);
        if (!contact) return;
        const playerShare = enemy.boss ? 0.72 : 0.58;
        moved = separateContact(player, enemy, contact, playerShare, dt) || moved;
      });
      return moved;
    }

    function resolveEnemyEnemyContacts(enemyList, dt, motion, sweptPairs) {
      let moved = false;
      for (let leftIndex = 0; leftIndex < enemyList.length; leftIndex += 1) {
        const left = enemyList[leftIndex];
        if (!isCollisionActor(left)) continue;
        for (let rightIndex = leftIndex + 1; rightIndex < enemyList.length; rightIndex += 1) {
          const right = enemyList[rightIndex];
          if (!isCollisionActor(right)) continue;
          const contact = pairContact(
            right,
            left,
            leftIndex + rightIndex,
            motion,
            sweptPairs,
            `enemy:${leftIndex}:${rightIndex}`
          );
          if (!contact) continue;
          moved = separateContact(right, left, contact, 0.5, dt) || moved;
        }
      }
      return moved;
    }

    function pairContact(first, second, seed, motion, sweptPairs, pairId) {
      const overlap = contactVector(first, second, seed);
      if (overlap) return overlap;
      if (sweptPairs.has(pairId)) return null;
      const swept = sweptContactVector(first, second, motion.get(first), motion.get(second), seed);
      if (!swept) return null;
      sweptPairs.add(pairId);
      placeAtSweepContact(first, swept.first, swept.time);
      placeAtSweepContact(second, swept.second, swept.time);
      const contact = contactVector(first, second, seed);
      return contact ? { ...contact, x: swept.x, y: swept.y } : swept;
    }

    function separateContact(first, second, contact, firstShare, dt) {
      let moved =
        moveActor(first, contact.x * contact.overlap * firstShare, contact.y * contact.overlap * firstShare, { dt }) +
        moveActor(second, -contact.x * contact.overlap * (1 - firstShare), -contact.y * contact.overlap * (1 - firstShare), { dt });
      // Transfer separation lost at a physical boundary to the actor that can move.
      // Both attempts are bounded; an overfull arena must not cause an endless solve.
      let remaining = contactVector(first, second);
      if (!remaining || remaining.overlap <= 0.0001) return moved > 0.0001;
      moved += moveActor(first, remaining.x * remaining.overlap, remaining.y * remaining.overlap, { dt });
      remaining = contactVector(first, second);
      if (!remaining || remaining.overlap <= 0.0001) return moved > 0.0001;
      moved += moveActor(second, -remaining.x * remaining.overlap, -remaining.y * remaining.overlap, { dt });
      return moved > 0.0001;
    }

    function actorMotionFor(actor, dt) {
      const captured = actorMotionFrame?.positions.get(actor);
      const previous = captured || actorMotion.get(actor);
      const start =
        previous && Number.isFinite(previous.x) && Number.isFinite(previous.y)
          ? previous
          : { x: actor.x, y: actor.y };
      const moved = Math.hypot(actor.x - start.x, actor.y - start.y);
      const speed = Math.max(
        Number.isFinite(actor.speed) ? Math.max(0, actor.speed) : 0,
        Number.isFinite(actor.vx) || Number.isFinite(actor.vy)
          ? Math.hypot(actor.vx || 0, actor.vy || 0)
          : 0
      );
      const allowance = speed * Math.max(0, dt) + Math.max(1, physicalRadius(actor) * 0.25);
      const teleportRelocation =
        actor.teleportCooldown > 0 &&
        ((Number.isFinite(previous?.teleportCooldown) && actor.teleportCooldown > previous.teleportCooldown + 0.0001) ||
          moved > allowance + Math.max(1, physicalRadius(actor) * 0.25));
      return {
        ...start,
        canSweep:
          Boolean(previous) &&
          !teleportRelocation &&
          Number.isFinite(dt) &&
          dt > 0 &&
          (speed <= 0 || moved <= allowance),
      };
    }

    function sweptContactVector(first, second, firstMotion, secondMotion, seed) {
      if (!firstMotion?.canSweep || !secondMotion?.canSweep) return null;
      const firstDx = first.x - firstMotion.x;
      const firstDy = first.y - firstMotion.y;
      const secondDx = second.x - secondMotion.x;
      const secondDy = second.y - secondMotion.y;
      const startX = firstMotion.x - secondMotion.x;
      const startY = firstMotion.y - secondMotion.y;
      const deltaX = firstDx - secondDx;
      const deltaY = firstDy - secondDy;
      const deltaLengthSquared = deltaX * deltaX + deltaY * deltaY;
      const unclampedTime =
        deltaLengthSquared > 0.00000001 ? -(startX * deltaX + startY * deltaY) / deltaLengthSquared : 0;
      const time = Math.max(0, Math.min(1, unclampedTime));
      const closestX = startX + deltaX * time;
      const closestY = startY + deltaY * time;
      const closestDistance = Math.hypot(closestX, closestY);
      const overlap = physicalRadius(first) + physicalRadius(second) - closestDistance;
      if (!(overlap > 0.0001)) return null;
      const direction =
        closestDistance > 0.0001
          ? { x: closestX / closestDistance, y: closestY / closestDistance }
          : sweepFallbackDirection(startX, startY, seed);
      return { first: firstMotion, overlap, second: secondMotion, time, x: direction.x, y: direction.y };
    }

    function sweepFallbackDirection(startX, startY, seed) {
      const distanceFromStart = Math.hypot(startX, startY);
      if (distanceFromStart > 0.0001) return { x: startX / distanceFromStart, y: startY / distanceFromStart };
      const angle = seed * 2.399963229728653;
      return { x: Math.cos(angle), y: Math.sin(angle) };
    }

    function placeAtSweepContact(actor, motion, time) {
      const x = motion.x + (actor.x - motion.x) * time;
      const y = motion.y + (actor.y - motion.y) * time;
      actor.x = clampToArena(actor, x, "width");
      actor.y = clampToArena(actor, y, "height");
    }

    function rememberActorMotion(actor, start, dt) {
      if (start && Number.isFinite(dt) && dt > 0) {
        if (Number.isFinite(actor.vx)) actor.vx = (actor.x - start.x) / dt;
        if (Number.isFinite(actor.vy)) actor.vy = (actor.y - start.y) / dt;
      }
      actorMotion.set(actor, snapshotActorMotion(actor));
    }

    function snapshotActorMotion(actor) {
      return { x: actor.x, y: actor.y, teleportCooldown: actor.teleportCooldown || 0 };
    }

    function applyRadialKnockback(actor, origin, force = 0, options = {}) {
      if (!isPhysicalActor(actor) || !Number.isFinite(force) || !(force > 0)) return 0;
      const center = blastCenter(origin, actor);
      const dx = actor.x - center.x;
      const dy = actor.y - center.y;
      const distanceToOrigin = Math.hypot(dx, dy);
      const direction =
        distanceToOrigin > 0.0001
          ? { x: dx / distanceToOrigin, y: dy / distanceToOrigin }
          : fallbackDirection(actor, center);
      const radius = Number.isFinite(options.radius) ? Math.max(0, options.radius) : 0;
      const reach = radius + physicalRadius(actor);
      const falloff = radius > 0 ? Math.max(0.25, 1 - distanceToOrigin / Math.max(1, reach)) : 1;
      return moveActor(actor, direction.x * force * falloff, direction.y * force * falloff, options);
    }

    function contactVector(first, second, seed = 0) {
      const dx = first.x - second.x;
      const dy = first.y - second.y;
      const distanceBetween = Math.hypot(dx, dy);
      const overlap = physicalRadius(first) + physicalRadius(second) - distanceBetween;
      if (!(overlap > 0)) return null;
      if (distanceBetween > 0.0001) {
        return { x: dx / distanceBetween, y: dy / distanceBetween, overlap };
      }
      const angle = seed * 2.399963229728653;
      return { x: Math.cos(angle), y: Math.sin(angle), overlap };
    }

    function blastCenter(origin, actor) {
      const bounds = physicalBounds();
      return {
        x: Number.isFinite(origin?.x) ? origin.x : Number.isFinite(bounds.width) ? bounds.width / 2 : actor.x,
        y: Number.isFinite(origin?.y) ? origin.y : Number.isFinite(bounds.height) ? bounds.height / 2 : actor.y,
      };
    }

    function fallbackDirection(actor, origin) {
      const vx = Number.isFinite(actor.vx) ? actor.vx : Number.isFinite(origin?.vx) ? -origin.vx : 0;
      const vy = Number.isFinite(actor.vy) ? actor.vy : Number.isFinite(origin?.vy) ? -origin.vy : 0;
      const speed = Math.hypot(vx || 0, vy || 0);
      if (speed > 0.0001) return { x: vx / speed, y: vy / speed };
      return { x: 1, y: 0 };
    }

    function isPhysicalActor(actor) {
      return (
        actor &&
        Number.isFinite(actor.x) &&
        Number.isFinite(actor.y) &&
        physicalRadius(actor) > 0 &&
        !(actor.hp <= 0)
      );
    }

    function isCollisionActor(actor) {
      return isPhysicalActor(actor) && overlapsPhysicalArena(actor);
    }

    function overlapsPhysicalArena(actor) {
      const bounds = physicalBounds();
      if (!Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)) return true;
      const radius = physicalRadius(actor);
      return actor.x + radius >= 0 && actor.x - radius <= bounds.width && actor.y + radius >= 0 && actor.y - radius <= bounds.height;
    }

    function physicalRadius(actor) {
      return Number.isFinite(actor?.radius) ? Math.max(0, actor.radius) : 0;
    }

    function moveActor(actor, dx, dy, options = {}) {
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
      const previousX = actor.x;
      const previousY = actor.y;
      actor.x = clampToArena(actor, actor.x + dx, "width");
      actor.y = clampToArena(actor, actor.y + dy, "height");
      spatial?.resolveSolidTerrain?.(getGame(), actor, { x: previousX, y: previousY });
      const appliedX = actor.x - previousX;
      const appliedY = actor.y - previousY;
      if (options.targetFollows && Number.isFinite(actor.targetX) && Number.isFinite(actor.targetY)) {
        actor.targetX = clampToArena(actor, actor.targetX + appliedX, "width");
        actor.targetY = clampToArena(actor, actor.targetY + appliedY, "height");
      }
      const velocityDt = Number.isFinite(options.dt) && options.dt > 0 ? options.dt : 0;
      if (velocityDt && Number.isFinite(actor.vx) && Math.abs(appliedX) > 0.0001) actor.vx += appliedX / velocityDt;
      if (velocityDt && Number.isFinite(actor.vy) && Math.abs(appliedY) > 0.0001) actor.vy += appliedY / velocityDt;
      return Math.hypot(appliedX, appliedY);
    }

    function clampActor(actor) {
      if (!isPhysicalActor(actor)) return;
      moveActor(actor, 0, 0);
    }

    function clampToArena(actor, value, axis) {
      const size = physicalBounds()[axis];
      const radius = Math.min(physicalRadius(actor), size / 2);
      if (!Number.isFinite(size) || typeof clamp !== "function") return value;
      return clamp(value, radius, size - radius);
    }

    function physicalBounds() {
      return spatial?.physicalSize?.(getGame()) || canvas || {};
    }

    return {
      spawnEnemies: enemySystem.spawnEnemies,
      spawnBoss: enemySystem.spawnBoss,
      updateBossSpecials: enemySystem.updateBossSpecials,
      updateEnemies: enemySystem.updateEnemies,
      updateEnemyBolts: enemySystem.updateEnemyBolts,
      updateWeapons: weaponFireSystem.updateWeapons,
      updateBolts: weaponFireSystem.updateBolts,
      updateAreas: weaponFireSystem.updateAreas,
      updateBeams: weaponFireSystem.updateBeams,
      updateWeaponBursts: weaponFireSystem.updateWeaponBursts,
      beginActorMotionFrame,
      captureActorMotionFrame,
      finishActorMotionFrame,
      resolveActorCollisions,
      getRunUpgradeTier,
    };
  }
})();
