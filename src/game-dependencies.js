// GENERATED FILE. Do not edit directly.
// Source: src/modules/game-dependencies.js
// Run: npm run build:bridges
(() => {
  "use strict";

  /**
   * @typedef {{ hp: number, damage: number, spawnRate: number }} FloorDifficulty
   */

  const floorTable = [
    { hp: 0.9, damage: 0.85, spawnRate: 0.9 },
    { hp: 1.1, damage: 1, spawnRate: 1 },
    { hp: 1.33, damage: 1.15, spawnRate: 1.08 },
  ];

  /**
   * @param {number | null | undefined} floor
   * @returns {FloorDifficulty}
   */
  function floorDifficulty(floor) {
    const floorNumber = Math.max(1, Math.floor(floor || 1));
    const tableEntry = floorTable[floorNumber - 1];
    if (tableEntry) return { ...tableEntry };

    const extraFloors = floorNumber - floorTable.length;
    const floorThree = floorTable[floorTable.length - 1];
    return {
      hp: floorThree.hp + extraFloors * 0.2,
      damage: floorThree.damage + extraFloors * 0.13,
      spawnRate: floorThree.spawnRate + extraFloors * 0.05,
    };
  }

  const MODULE_NATIVE_COMBAT_SLOTS = Object.freeze(["combat"]);

  const MODULE_NATIVE_COMBAT_PROOF_SLOTS = Object.freeze(["createCombatSystem"]);

  /**
   * @param {any} [options]
   */
  function createCombatSystem({
    canvas,
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
    const damageSystem = combatDamage.createCombatDamageSystem({
      canvas,
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
    });
    const enemySystem = enemies.createEnemySystem({
      canvas,
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
      onBossSpawn,
    });
    const weaponFireSystem = weaponFire.createWeaponFireSystem({
      canvas,
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
      getRunUpgradeTier,
    };
  }

  function createCombatDamageSystem({
    canvas,
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
  }) {
    function damageEnemy(enemy, amount, weaponId) {
      const game = getGame();
      const before = enemy.hp;
      const effects = getRelicSpecialEffects?.() || {};
      const finalAmount = enemy.boss ? amount * (1 + (effects.bossDamageBonus || 0)) : amount;
      enemy.hp -= finalAmount;
      const dealt = Math.max(0, Math.min(before, finalAmount));
      game.weaponDamage[weaponId] = (game.weaponDamage[weaponId] || 0) + dealt;
      addQuestProgressGroup(damageQuestIds, dealt);
      addQuestProgressForWeapon(weaponId, dealt);
      return dealt;
    }

    function damagePlayer(amount, source = {}) {
      const game = getGame();
      const p = game?.player;
      if (!p || p.invincibleTimer > 0) return 0;
      const effects = getRelicSpecialEffects?.() || {};
      if (effects.dodgeChance && Math.random() < Math.min(0.95, effects.dodgeChance)) {
        p.blinkTimer = Math.max(p.blinkTimer || 0, 0.35);
        return 0;
      }
      let finalDamage = amount * Math.max(0, 1 - (effects.damageReduction || 0));
      if (source.enemy && effects.thornDamage) {
        damageEnemy(source.enemy, effects.thornDamage, "relic_thorns");
      }
      if (effects.teleportOnHitCooldown && !(p.teleportCooldown > 0)) {
        p.x = clamp(
          p.x + (Math.random() < 0.5 ? -1 : 1) * (effects.teleportDistance || 140),
          p.radius,
          canvas.width - p.radius
        );
        p.y = clamp(
          p.y + (Math.random() < 0.5 ? -1 : 1) * (effects.teleportDistance || 140),
          p.radius,
          canvas.height - p.radius
        );
        p.targetX = p.x;
        p.targetY = p.y;
        p.teleportCooldown = effects.teleportOnHitCooldown;
      }
      p.hp -= finalDamage;
      if (effects.blinkInvulnerabilitySeconds) {
        p.invincibleTimer = Math.max(p.invincibleTimer || 0, effects.blinkInvulnerabilitySeconds);
        p.blinkTimer = Math.max(p.blinkTimer || 0, effects.blinkInvulnerabilitySeconds);
      }
      return finalDamage;
    }

    function reapEnemies() {
      const game = getGame();
      const dead = game.enemies.filter((enemy) => enemy.hp <= 0);
      dead.forEach((enemy) => {
        const effects = getRelicSpecialEffects?.() || {};
        if (effects.lifestealOnKill && game.player) {
          game.player.hp = Math.min(
            game.player.maxHp,
            game.player.hp + Math.ceil(game.player.maxHp * effects.lifestealOnKill)
          );
        }
        if (effects.killExplosionDamage && effects.killExplosionRadius) {
          game.enemies.forEach((candidate) => {
            if (candidate === enemy || candidate.hp <= 0) return;
            if (distance(enemy, candidate) <= effects.killExplosionRadius + candidate.radius) {
              damageEnemy(candidate, effects.killExplosionDamage, "relic_kill_explosion");
            }
          });
        }
        game.kills += 1;
        addQuestProgressGroup(killQuestIds, 1);
        game.xpDrops.push({ x: enemy.x, y: enemy.y, radius: enemy.boss ? 12 : 7, value: enemy.boss ? 8 : enemy.xp });
        spawnLootDrops(enemy);
        if (enemy.boss) {
          game.bossDefeated = true;
          addQuestProgressGroup(bossQuestIds, 1);
          advanceTowerFloor?.();
        }
      });
      game.enemies = game.enemies.filter((enemy) => enemy.hp > 0);
    }

    return {
      damageEnemy,
      damagePlayer,
      reapEnemies,
    };
  }

  function createContentRegistry({ content, upgradeContent }) {
    const weaponDefs = content.weapons || {};
    const weaponUnlocks = content.weaponUnlocks || [];
    const questDefs = content.quests || {};
    const questGroups = content.questGroups || {};
    const bossConfig = content.bossConfig || {};
    const bossAbilities = content.bossAbilities || {};
    const assetDefs = content.assets || {};

    return {
      weaponDefs,
      weaponUnlocks,
      spriteDefs: assetDefs.sprites || {},
      sfxDefs: assetDefs.sfx || {},
      upgradeDefs: upgradeContent.createUpgradeDefs?.(weaponDefs) || [],
      questDefs,
      questGroups,
      starterQuestIds: questGroups.starter || [],
      killQuestIds: questGroups.kill || [],
      damageQuestIds: questGroups.damage || [],
      survivalQuestIds: questGroups.survival || [],
      xpQuestIds: questGroups.xp || [],
      levelQuestIds: questGroups.level || [],
      bossQuestIds: questGroups.boss || [],
      runUpgradeDefs: upgradeContent.runUpgradeDefs || [],
      enemyTypes: content.enemyTypes || [],
      bossConfig,
      bossAbilities,
      shopItemDefs: content.shopItems || [],
      relicDefs: content.relics || [],
      levelDefs: content.levels || [],
      mapDefs: content.maps || [],
      tuningDefs: content.tuning || {},
    };
  }

  const MODULE_NATIVE_ENEMY_SLOTS = Object.freeze(["enemies"]);

  const MODULE_NATIVE_ENEMY_PROOF_SLOTS = Object.freeze(["createEnemySystem"]);

  /**
   * @param {any} [options]
   */
  function createEnemySystem({
    canvas,
    balance,
    enemyBehaviors,
    enemySpawning,
    enemyTypes,
    bossConfig = {},
    bossAbilities = {},
    levelDefs = [],
    getActiveFloorDef,
    getGame,
    distance,
    clamp,
    damagePlayer,
    onBossSpawn,
  } = {}) {
    const bossKinds = bossConfig.abilityIds?.length ? bossConfig.abilityIds : Object.keys(bossAbilities);
    const normalBossAbilityCount = bossConfig.normalAbilityCount || 1;
    const superBossAbilityCount = bossConfig.superAbilityCount || 2;
    const bossBaseHp = bossConfig.baseHp || 1400;
    const bossHpPerKill = bossConfig.hpPerKill || 6;
    const superBossHpMultiplier = bossConfig.superHpMultiplier || 1.35;
    const bossTouchDamage = bossConfig.touchDamage || 22;
    const bossTouchCooldown = bossConfig.touchCooldown || 0.8;
    const bossNoticeLife = bossConfig.noticeLife || 2.1;
    const dropWindup = bossConfig.dropWindup || 1.15;
    const sideEntryMargin = bossConfig.sideEntryMargin || 150;
    const entryOffsetX = bossConfig.entryOffsetX || 52;
    const entryOffsetY = bossConfig.entryOffsetY || 72;
    const spawnEntryMargin = bossConfig.spawnEntryMargin || 72;
    const boltConfig = bossConfig.enemyBolt || {};
    const projectileScaling = bossConfig.projectileScaling || {};
    const fallbackAbility = bossKinds[0] || "warden";
    const floorDifficulty = balance.floorDifficulty;
    const behaviorSystem = enemyBehaviors.createEnemyBehaviorSystem({
      canvas,
      bossAbilities,
      boltConfig,
      getGame,
      distance,
      clamp,
      damagePlayer,
    });
    const spawnSystem = enemySpawning.createEnemySpawnSystem({
      canvas,
      enemyTypes,
      levelDefs,
      getActiveFloorDef,
      getGame,
      floorDifficulty,
      spawnEntryMargin,
      scaledProjectileCooldown,
      scaledProjectileSpeed,
      resolveEnemyProjectileColor: behaviorSystem.resolveEnemyProjectileColor,
    });

    function spawnBoss() {
      const game = getGame();
      if (game.bossSpawned) return;
      game.bossSpawned = true;
      const difficulty = floorDifficulty(game.towerFloor);
      const superBoss = game.towerFloor % 5 === 0;
      const selectedAbilities = chooseBossAbilities(superBoss ? superBossAbilityCount : normalBossAbilityCount);
      const bossKind = selectedAbilities[0] || fallbackAbility;
      const bossHp = (bossBaseHp + game.kills * bossHpPerKill) * difficulty.hp;
      const landingX = 72 + Math.random() * (canvas.width - 144);
      const landingY = 90 + Math.random() * (canvas.height - 180);
      const sideEntry = landingX < sideEntryMargin || landingX > canvas.width - sideEntryMargin;
      const startX = sideEntry ? (landingX < canvas.width / 2 ? -entryOffsetX : canvas.width + entryOffsetX) : landingX;
      const startY = sideEntry ? landingY : -entryOffsetY;
      if (!sideEntry) {
        const drop = bossConfig.drop || {};
        game.bossAttacks.push({
          type: "boss_drop",
          x: landingX,
          y: landingY,
          radius: superBoss ? drop.superRadius : drop.radius,
          damage: (superBoss ? drop.superDamage : drop.damage) * difficulty.damage,
          age: 0,
          windup: dropWindup,
          hit: false,
        });
      }
      game.bossSpawnNotice = {
        text: superBoss ? "SUPER BOSS INCOMING" : "BOSS INCOMING",
        life: bossNoticeLife,
        maxLife: bossNoticeLife,
      };
      onBossSpawn?.({ superBoss, abilities: selectedAbilities });
      const turretBoss = hasAbility(selectedAbilities, "turret");
      const turretCooldown = turretBoss ? scaledProjectileCooldown(bossAbilities.turret.projectileCooldown, game) : 0;
      const turretSpeed = turretBoss ? scaledProjectileSpeed(bossAbilities.turret.projectileSpeed, game) : 0;
      const boss = {
        boss: true,
        superBoss,
        bossKind,
        bossAbilities: selectedAbilities,
        assetId: "boss",
        color: bossColor(selectedAbilities),
        x: startX,
        y: startY,
        startX,
        startY,
        landingX,
        landingY,
        dropTimer: sideEntry ? 0 : dropWindup,
        dropWindup,
        radius: 38,
        hp: superBoss ? bossHp * superBossHpMultiplier : bossHp,
        maxHp: superBoss ? bossHp * superBossHpMultiplier : bossHp,
        speed: bossSpeed(selectedAbilities),
        damage: bossTouchDamage * difficulty.damage,
        touchCooldown: bossTouchCooldown,
        touchTimer: 0,
        attackRange: turretBoss ? bossAbilities.turret.attackRange : 0,
        projectileCooldown: turretCooldown,
        projectileSpeed: turretSpeed,
        projectileDamage: (superBoss ? bossAbilities.turret.superProjectileDamage : bossAbilities.turret.projectileDamage) * difficulty.damage,
        projectileColor: turretBoss ? behaviorSystem.resolveBossProjectileColor(bossAbilities.turret) : undefined,
        shootTimer: turretBoss ? bossAbilities.turret.initialShootTimer / projectileFireRateScale(game) : 0,
        animTime: 0,
        attackVisualTimer: 0,
        vx: 0,
        vy: 0,
      };
      const cooldown = nextBossAttackCooldown(boss);
      game.bossAttackTimer = cooldown;
      game.bossAttackCooldownMax = cooldown;
      game.enemies.push(boss);
    }

    function projectileFireRateScale(game) {
      const floor = Math.max(1, game?.towerFloor || 1);
      const base = projectileScaling.fireRateBase || 0.68;
      const perFloor = projectileScaling.fireRatePerFloor || 0.07;
      const max = projectileScaling.fireRateMax || 1.35;
      return Math.min(max, base + (floor - 1) * perFloor);
    }

    function projectileSpeedScale(game) {
      const floor = Math.max(1, game?.towerFloor || 1);
      const base = projectileScaling.speedBase || 0.72;
      const perFloor = projectileScaling.speedPerFloor || 0.06;
      const max = projectileScaling.speedMax || 1.35;
      return Math.min(max, base + (floor - 1) * perFloor);
    }

    function scaledProjectileCooldown(cooldown, game) {
      if (!cooldown) return 0;
      return cooldown / projectileFireRateScale(game);
    }

    function scaledProjectileSpeed(speed, game) {
      if (!speed) return 0;
      return speed * projectileSpeedScale(game);
    }

    function bossColor(abilities) {
      const priority = bossKinds.slice().reverse().find((ability) => hasAbility(abilities, ability));
      return bossAbilities[priority]?.color || "#ff4f8b";
    }

    function bossSpeed(abilities) {
      if (hasAbility(abilities, "turret")) return bossAbilities.turret.speed;
      if (hasAbility(abilities, "charger")) return bossAbilities.charger.speed;
      return bossAbilities.warden?.speed || 42;
    }

    function hasAbility(abilities, ability) {
      return abilities.includes(ability);
    }

    function chooseBossAbilities(count) {
      const available = [...bossKinds];
      const abilities = [];
      while (abilities.length < count && available.length) {
        const index = Math.floor(Math.random() * available.length);
        abilities.push(available.splice(index, 1)[0]);
      }
      return abilities;
    }

    function updateBossSpecials(dt) {
      const game = getGame();
      if (game.bossSpawnNotice) {
        game.bossSpawnNotice.life -= dt;
        if (game.bossSpawnNotice.life <= 0) game.bossSpawnNotice = null;
      }
      behaviorSystem.updateBossAttacks(dt);
      const boss = game.enemies.find((enemy) => enemy.boss);
      if (!boss || boss.dropTimer > 0) return;
      game.bossAttackTimer -= dt;
      if (game.bossAttackTimer <= 0) {
        const chargerBoss = hasBossAbility(boss, "charger");
        const wardenBoss = hasBossAbility(boss, "warden");
        if (chargerBoss) {
          behaviorSystem.startBossCharge(boss);
        }
        if (wardenBoss) {
          const shockwave = bossAbilities.warden.shockwave;
          game.bossAttacks.push({
            type: "shockwave",
            x: boss.x,
            y: boss.y,
            radius: shockwave.radius,
            damage: shockwave.damage,
            age: 0,
            windup: shockwave.windup,
            hit: false,
          });
        }
        game.bossAttackTimer = nextBossAttackCooldown(boss);
        game.bossAttackCooldownMax = game.bossAttackTimer;
      }
    }

    function nextBossAttackCooldown(boss) {
      const activeCooldowns = boss.bossAbilities
        .map((ability) => bossAbilities[ability]?.attackCooldown)
        .filter(Number.isFinite);
      return Math.min(...activeCooldowns, bossConfig.defaultAttackCooldown || 3.2);
    }

    function hasBossAbility(boss, ability) {
      return boss.bossAbilities?.includes(ability) || boss.bossKind === ability;
    }

    return {
      resolveBossProjectileColor: behaviorSystem.resolveBossProjectileColor,
      resolveEnemyProjectileColor: behaviorSystem.resolveEnemyProjectileColor,
      spawnEnemies: spawnSystem.spawnEnemies,
      spawnBoss,
      updateBossSpecials,
      updateEnemies: behaviorSystem.updateEnemies,
      updateEnemyBolts: behaviorSystem.updateEnemyBolts,
    };
  }

  const MODULE_NATIVE_ENEMY_BEHAVIOR_SLOTS = Object.freeze(["enemyBehaviors"]);

  const MODULE_NATIVE_ENEMY_BEHAVIOR_PROOF_SLOTS = Object.freeze([
    "createEnemyBehaviorSystem",
  ]);

  /**
   * @param {any} [options]
   */
  function createEnemyBehaviorSystem({
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

  const MODULE_NATIVE_ENEMY_SPAWN_SLOTS = Object.freeze(["enemySpawning"]);

  const MODULE_NATIVE_ENEMY_SPAWN_PROOF_SLOTS = Object.freeze(["createEnemySpawnSystem"]);

  /**
   * @param {any} [options]
   */
  function createEnemySpawnSystem({
    canvas,
    enemyTypes,
    levelDefs = [],
    getActiveFloorDef,
    getGame,
    floorDifficulty,
    spawnEntryMargin = 72,
    scaledProjectileCooldown,
    scaledProjectileSpeed,
    resolveEnemyProjectileColor,
  } = {}) {
    const enemyTypeById = Object.fromEntries(enemyTypes.map((enemy) => [enemy.id, enemy]));
    const orderedLevelDefs = [...levelDefs].sort((a, b) => a.startsAt - b.startsAt);

    function spawnEnemies(dt) {
      const game = getGame();
      game.spawnTimer -= dt;
      if (game.spawnTimer > 0) return;
      const level = activeLevelDef();
      const levelSpawnRate = level?.spawnRateMultiplier || 1;
      const spawnCount = Math.max(1, Math.floor(level?.spawnCount || 2));
      game.spawnTimer = Math.max(
        0.32,
        (1.1 - game.elapsed / 150) / (floorDifficulty(game.towerFloor).spawnRate * levelSpawnRate)
      );
      const availableTypes = levelEnemyTypes(level);
      if (!availableTypes.length) return;
      spawnPatternPositions(spawnCount).forEach((position, index) => {
        const type = chooseEnemyType(index, availableTypes);
        spawnEnemy(type, position);
      });
    }

    function activeLevelDef() {
      const resolved = getActiveFloorDef?.();
      if (resolved) return resolved;
      const game = getGame();
      return orderedLevelDefs.reduce(
        (active, level) => (game.elapsed >= level.startsAt ? level : active),
        null
      );
    }

    function levelEnemyTypes(level) {
      if (!level?.enemyIds?.length) return availableEnemyTypes();
      const game = getGame();
      const configured = level.enemyIds
        .map((id) => enemyTypeById[id])
        .filter((type) => type && isEnemyAvailable(type, game));
      return configured.length ? configured : availableEnemyTypes();
    }

    function availableEnemyTypes() {
      const game = getGame();
      return enemyTypes
        .slice(0, Math.min(enemyTypes.length, 1 + Math.floor(game.elapsed / 30)))
        .filter((type) => isEnemyAvailable(type, game));
    }

    function isEnemyAvailable(type, game) {
      return !type.minTowerFloor || game.towerFloor >= type.minTowerFloor;
    }

    function chooseEnemyType(offset = 0, available = availableEnemyTypes()) {
      if (!available.length) return null;
      return available[(Math.floor(Math.random() * available.length) + offset) % available.length];
    }

    function spawnPatternPositions(count) {
      const game = getGame();
      const baseAngle = Math.random() * Math.PI * 2;
      const pattern = Math.floor(Math.random() * 4);
      return Array.from({ length: count }, (_, index) => {
        const mirrored = index % 2 === 0 ? 0 : Math.PI;
        const angleOffsets = [mirrored, index * 0.85, (index - 0.5) * 0.55, index * 1.7];
        const angle = baseAngle + angleOffsets[pattern];
        return offscreenSpawnPosition(game.player, angle);
      });
    }

    function offscreenSpawnPosition(player, angle) {
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      const edgeDistance = distanceToExpandedCanvasEdge(player, dirX, dirY);
      return {
        x: player.x + dirX * edgeDistance,
        y: player.y + dirY * edgeDistance,
      };
    }

    function distanceToExpandedCanvasEdge(player, dirX, dirY) {
      const edgeDistances = [];
      if (Math.abs(dirX) > 0.0001) {
        edgeDistances.push(
          ((dirX > 0 ? canvas.width + spawnEntryMargin : -spawnEntryMargin) - player.x) / dirX
        );
      }
      if (Math.abs(dirY) > 0.0001) {
        edgeDistances.push(
          ((dirY > 0 ? canvas.height + spawnEntryMargin : -spawnEntryMargin) - player.y) / dirY
        );
      }
      return Math.min(...edgeDistances.filter((value) => value > 0));
    }

    function spawnEnemy(type, position) {
      if (!type) return;
      const game = getGame();
      const difficulty = floorDifficulty(game.towerFloor);
      const cooldown = scaledProjectileCooldown(type.projectileCooldown || 0, game);
      const speed = scaledProjectileSpeed(type.projectileSpeed || 0, game);
      game.enemies.push({
        type: type.id,
        name: type.name,
        color: type.color,
        assetId: type.assetId || type.id,
        towerFloor: game.towerFloor,
        x: position.x,
        y: position.y,
        radius: type.radius,
        hp: type.hp,
        speed: type.speed,
        damage: type.damage * difficulty.damage,
        touchCooldown: type.touchCooldown,
        xp: type.xp,
        touchTimer: 0,
        attackRange: type.attackRange || 0,
        projectileCooldown: cooldown,
        projectileSpeed: speed,
        projectileDamage: (type.projectileDamage || type.damage) * difficulty.damage,
        projectileColor: resolveEnemyProjectileColor?.(type) || type.projectileColor || type.color,
        shootTimer: Math.random() * cooldown,
        animTime: Math.random(),
        attackVisualTimer: 0,
        vx: 0,
        vy: 0,
      });
    }

    return {
      spawnEnemies,
    };
  }

  function createGameBannerSystem({ ui, getSave, persist }) {
    /** @type {ReturnType<typeof setTimeout> | number} */
    let bannerTimer = 0;

    function hasSeenBanner(id) {
      return getSave().seenBanners?.includes(id);
    }

    function markBannerSeen(id) {
      const save = getSave();
      save.seenBanners = [...new Set([...(save.seenBanners || []), id])];
      persist();
    }

    function showBanner(message, duration = 5200) {
      if (!ui.questBanner || !message) return;
      ui.questBanner.textContent = message;
      ui.questBanner.classList.remove("hidden");
      clearTimeout(bannerTimer);
      if (duration > 0) {
        bannerTimer = setTimeout(() => ui.questBanner.classList.add("hidden"), duration);
      }
    }

    function showMovementGateBanner() {
      showBanner("Click/tap to move", 0);
    }

    function hideMovementGateBanner() {
      if (!ui.questBanner || ui.questBanner.textContent !== "Click/tap to move") return;
      clearTimeout(bannerTimer);
      ui.questBanner.classList.add("hidden");
    }

    function showOnceBanner(id, message, duration) {
      if (hasSeenBanner(id)) return false;
      markBannerSeen(id);
      showBanner(message, duration);
      return true;
    }

    function showQuestBanner(quest, reward) {
      if (!quest) return;
      const firstQuest = !hasSeenBanner("first_quest_completion");
      if (firstQuest) {
        markBannerSeen("first_quest_completion");
      }
      showBanner(
        firstQuest
          ? `${quest.name} complete +${reward} QP. Open Menu > Rewards to spend Quest Points and review quests.`
          : `${quest.name} complete +${reward} QP`,
      );
    }

    return {
      hideMovementGateBanner,
      showBanner,
      showMovementGateBanner,
      showOnceBanner,
      showQuestBanner,
    };
  }

  function createGameRuntimeController({
    canvas,
    ui,
    documentRef,
    globalRef,
    getGame,
    setGame,
    getSave,
    setSave,
    saveSystem,
    shellUi,
    shopSystem,
    runUi,
    debugSystem,
    spriteSystem,
    bannerSystem,
    bindMovementInput,
    persist,
    renderMeta,
    loop,
  }) {
    if (typeof bindMovementInput !== "function") {
      throw new Error("Missing Tap Survivor runtime dependency: bindMovementInput must be a function");
    }

    let gameSpeed = 1;

    function getGameSpeed() {
      return gameSpeed;
    }

    function setGameSpeed(speed) {
      if (![1, 2, 5].includes(speed)) return;
      gameSpeed = speed;
      documentRef.body.dataset.gameSpeed = String(speed);
      ui.speedButtons.forEach((button) => {
        const active = Number(button.dataset.speed) === speed;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      runUi.updateRunHud();
    }

    function resetSave() {
      const resetAfterRemove = () => {
        setSave(saveSystem.defaultSave());
        setGame(null);
        runUi.hideEndScreen();
        ui.levelUp.classList.add("hidden");
        shopSystem.closeShop();
        shellUi.closeRunMenu(false);
        shellUi.showTitleScreen();
        persist();
        renderMeta();
      };
      const removed = saveSystem.removeSave();
      if (removed && typeof removed.then === "function") {
        void removed.then(resetAfterRemove);
      } else {
        resetAfterRemove();
      }
    }

    function startRuntime() {
      shellUi.bind();
      debugSystem.bind();
      setGameSpeed(1);
      ui.speedButtons.forEach((button) => {
        button.addEventListener?.("click", () => {
          setGameSpeed(Number(button.dataset.speed));
        });
      });
      bindLifecycleFlush();

      bindMovementInput({
        canvas,
        getGame,
      });
      bindFirstMoveGate();

      spriteSystem.loadSprites();
      renderMeta();
      globalRef.requestAnimationFrame(loop);
    }

    function bindFirstMoveGate() {
      const clearGate = (event) => {
        const game = getGame();
        if (!game?.running || game.paused || !game.awaitingFirstMoveInput) return;
        const rect = canvas.getBoundingClientRect();
        const point = event.touches ? event.touches[0] : event;
        game.player.targetX = ((point.clientX - rect.left) / rect.width) * canvas.width;
        game.player.targetY = ((point.clientY - rect.top) / rect.height) * canvas.height;
        game.awaitingFirstMoveInput = false;
        bannerSystem.hideMovementGateBanner();
      };
      canvas.addEventListener("mousedown", clearGate);
      canvas.addEventListener("touchstart", clearGate);
    }

    function bindLifecycleFlush() {
      const flush = () => {
        void persist();
      };
      if (documentRef?.addEventListener) {
        documentRef.addEventListener("visibilitychange", () => {
          if (documentRef.visibilityState === "hidden") flush();
        });
      }
      globalRef.addEventListener?.("pagehide", flush);
      globalRef.addEventListener?.("beforeunload", flush);
      bindCapacitorAppLifecycle(flush);
    }

    function bindCapacitorAppLifecycle(flush) {
      const app = globalRef.Capacitor?.Plugins?.App;
      if (!app?.addListener) return;
      try {
        const listener = app.addListener("appStateChange", ({ isActive }) => {
          if (!isActive) flush();
        });
        if (listener?.catch) listener.catch(() => {});
      } catch {
        // Browser and test runtimes may not expose Capacitor App events.
      }
    }

    function initializeRuntime() {
      const loaded = saveSystem.loadSave();
      if (loaded && typeof loaded.then === "function") {
        void loaded
          .then((loadedSave) => {
            setSave(loadedSave);
            startRuntime();
          })
          .catch(() => {
            setSave(saveSystem.defaultSave());
            startRuntime();
          });
        return;
      }
      setSave(loaded || getSave());
      startRuntime();
    }

    return {
      getGameSpeed,
      setGameSpeed,
      resetSave,
      initializeRuntime,
    };
  }

  /**
   * @typedef {{ src?: string, path?: string } | string} SpriteBackgroundDef
   * @typedef {Record<string, SpriteBackgroundDef>} SpriteBackgroundDefs
   * @typedef {{ backgrounds?: SpriteBackgroundDefs }} SpriteDefs
   * @typedef {{
   *   id?: string,
   *   name?: string,
   *   floorIds?: string[],
   *   backgroundAsset?: string | SpriteBackgroundDef,
   *   modifiers?: Record<string, unknown>
   * }} MapDef
   * @typedef {{
   *   id?: string,
   *   startsAt?: number,
   *   backgroundAsset?: string | SpriteBackgroundDef,
   *   modifiers?: Record<string, unknown>
   * }} LevelDef
   * @typedef {{
   *   map: MapDef,
   *   floor: LevelDef | null,
   *   modifiers: Record<string, unknown>,
   *   background: { id: string, spriteId: string, asset: string | SpriteBackgroundDef },
   *   floorPool: LevelDef[]
   * }} ResolvedMapState
   * @typedef {{
   *   towerFloor?: number,
   *   elapsed?: number,
   *   activeMap?: MapDef,
   *   activeFloor?: LevelDef | null,
   *   mapModifiers?: Record<string, unknown>,
   *   background?: { id: string, spriteId: string, asset: string | SpriteBackgroundDef },
   *   floorPool?: LevelDef[]
   * }} MapGame
   */

  /**
   * @param {{ mapDefs?: MapDef[], levelDefs?: LevelDef[], spriteDefs?: SpriteDefs }} options
   * @returns {{
   *   applyToGame(game: MapGame | null | undefined): ResolvedMapState | null,
   *   resolve(input?: { towerFloor?: number, elapsed?: number }): ResolvedMapState
   * }}
   */
  function createMapSystem({ mapDefs = [], levelDefs = [], spriteDefs = {} }) {
    const backgroundSprites = spriteDefs.backgrounds || {};
    const fallbackBackgroundId = backgroundSprites.tower_floor ? "tower_floor" : "";
    const fallbackMap = {
      id: "default_tower",
      name: "Default Tower",
      floorIds: levelDefs.map((level) => level.id).filter(Boolean),
      backgroundAsset: backgroundSprites[fallbackBackgroundId] || "",
      modifiers: {},
    };

    function usableMaps() {
      const maps = (mapDefs || []).filter((map) => map?.id);
      return maps.length ? maps : [fallbackMap];
    }

    function floorPoolForMap(map) {
      const ids = new Set(map?.floorIds || []);
      const floors = ids.size ? levelDefs.filter((level) => ids.has(level.id)) : levelDefs;
      return floors.length ? floors : levelDefs;
    }

    function resolveMap(towerFloor = 1) {
      const maps = usableMaps();
      const index = Math.max(0, Math.floor((Math.max(1, towerFloor) - 1) % maps.length));
      return maps[index] || fallbackMap;
    }

    function resolveFloor({ map, elapsed = 0 }) {
      const pool = floorPoolForMap(map).slice().sort((left, right) => (left.startsAt || 0) - (right.startsAt || 0));
      return pool.reduce((active, floor) => (elapsed >= (floor.startsAt || 0) ? floor : active), pool[0] || null);
    }

    function backgroundIdFor(entry) {
      const asset = entry?.backgroundAsset;
      if (!asset) return fallbackBackgroundId;
      const direct = Object.entries(backgroundSprites).find(([, value]) => {
        if (typeof value === "string") return value === asset;
        return value?.src === asset || value?.path === asset;
      });
      return direct?.[0] || fallbackBackgroundId;
    }

    function resolve({ towerFloor = 1, elapsed = 0 } = {}) {
      const map = resolveMap(towerFloor);
      const floor = resolveFloor({ map, elapsed });
      const backgroundId = backgroundIdFor(floor) || backgroundIdFor(map);
      return {
        map,
        floor,
        modifiers: { ...(map?.modifiers || {}), ...(floor?.modifiers || {}) },
        background: {
          id: backgroundId,
          spriteId: backgroundId ? `background:${backgroundId}` : "",
          asset: floor?.backgroundAsset || map?.backgroundAsset || "",
        },
        floorPool: floorPoolForMap(map),
      };
    }

    function applyToGame(game) {
      if (!game) return null;
      const resolved = resolve({ towerFloor: game.towerFloor || 1, elapsed: game.elapsed || 0 });
      game.activeMap = resolved.map;
      game.activeFloor = resolved.floor;
      game.mapModifiers = resolved.modifiers;
      game.background = resolved.background;
      game.floorPool = resolved.floorPool;
      return resolved;
    }

    return {
      applyToGame,
      resolve,
    };
  }

  const CURRENT_SAVE_VERSION = 3;

  function createDefaultSave({ starterQuestIds }) {
    return {
      saveVersion: CURRENT_SAVE_VERSION,
      coins: 0,
      towerFloor: 1,
      questPoints: 0,
      totalQuestPoints: 0,
      unlockedNodes: [],
      unlockedWeapons: ["spark_bolt"],
      selectedStartingWeapon: "spark_bolt",
      upgradeTiers: {},
      unlockedUpgrades: [],
      shopPurchases: {},
      seenBanners: [],
      unlockedRelics: [],
      equippedRelics: [],
      activeQuests: [...starterQuestIds],
      completedQuests: [],
      questProgress: {},
    };
  }

  const DEFAULT_CURRENT_SAVE_VERSION = 3;

  /**
   * Minimal persisted save shape used while stepping old saves forward.
   *
   * @typedef {Record<string, unknown> & {
   *   saveVersion?: number,
   *   shopPurchases?: Record<string, number>,
   *   seenBanners?: string[]
   * }} MigratingSave
   */

  /** @type {Record<number, (save: MigratingSave) => MigratingSave>} */
  const saveMigrations = {
    2(save) {
      return {
        ...save,
        shopPurchases: save.shopPurchases || {},
      };
    },
    3(save) {
      return {
        ...save,
        seenBanners: save.seenBanners || [],
      };
    },
  };

  /**
   * Guard for plain object save payloads before migration copies fields.
   *
   * @param {unknown} value
   * @returns {value is MigratingSave}
   */
  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  /**
   * Migrates an unknown persisted save payload to the current save schema version.
   *
   * @param {unknown} input
   * @param {{ currentSaveVersion?: number }} [options]
   * @returns {MigratingSave}
   */
  function migrateSave(input, options = {}) {
    const currentSaveVersion =
      options && typeof options === "object" && Number.isFinite(options.currentSaveVersion)
        ? options.currentSaveVersion
        : DEFAULT_CURRENT_SAVE_VERSION;
    let migrated = { ...(isPlainObject(input) ? input : {}) };
    let version = Math.max(1, Math.floor(migrated.saveVersion || 1));

    while (version < currentSaveVersion) {
      version += 1;
      migrated = saveMigrations[version]?.(migrated) || migrated;
      migrated.saveVersion = version;
    }

    migrated.saveVersion = currentSaveVersion;
    return migrated;
  }

  /**
   * @typedef {Record<string, unknown>} SaveData
   * @typedef {{ setCorruptBackupRaw?: (raw: string) => void }} CorruptBackupStorage
   * @typedef {() => SaveData} DefaultSaveFn
   * @typedef {(save: SaveData) => SaveData} NormalizeAndMigrateSaveFn
   * @typedef {{
   *   fromRaw(raw: string | null | undefined): SaveData,
   *   getLastLoadWarning(): string | null,
   *   storageReadFailed(): SaveData
   * }} SaveLoadHandler
   */

  /**
   * @param {{
   *   defaultSave: DefaultSaveFn,
   *   normalizeAndMigrateSave: NormalizeAndMigrateSaveFn,
   *   storage?: CorruptBackupStorage
   * }} options
   * @returns {SaveLoadHandler}
   */
  function createSaveLoadHandler({ defaultSave, normalizeAndMigrateSave, storage }) {
    let lastLoadWarning = null;

    function fromRaw(raw) {
      lastLoadWarning = null;

      if (!raw) {
        return normalizeAndMigrateSave({});
      }

      try {
        return normalizeAndMigrateSave(JSON.parse(raw));
      } catch {
        lastLoadWarning = "corrupt-save";
        storage?.setCorruptBackupRaw?.(raw);
        return defaultSave();
      }
    }

    function storageReadFailed() {
      lastLoadWarning = "storage-read-failed";
      return defaultSave();
    }

    function getLastLoadWarning() {
      return lastLoadWarning;
    }

    return {
      fromRaw,
      getLastLoadWarning,
      storageReadFailed,
    };
  }

  const DEFAULT_SAVE_NORMALIZE_VERSION = 3;

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function arrayValue(value) {
    return Array.isArray(value) ? value : [];
  }

  function objectValue(value) {
    return isPlainObject(value) ? value : {};
  }

  function createSaveNormalizer({
    currentSaveVersion = DEFAULT_SAVE_NORMALIZE_VERSION,
    defaultSave,
    isPlainObject: isPlainObjectValue = isPlainObject,
    questDefs,
    weaponUnlocks,
    upgradeDefs,
    shopItemById,
    questOpenIds,
  }) {
    const knownWeaponIds = new Set([
      "spark_bolt",
      ...arrayValue(weaponUnlocks)
        .map((unlock) => unlock.weaponId)
        .filter(Boolean),
    ]);

    function normalizeShopPurchases(purchases) {
      const normalizedPurchases = {};

      Object.entries(objectValue(purchases)).forEach(([id, rawTier]) => {
        const item = shopItemById.get(id);
        if (shopItemById.size && !item) return;

        const maxTier = Math.max(0, Math.floor(item?.maxTier || rawTier || 0));
        const tier = Math.min(maxTier, Math.max(0, Math.floor(rawTier || 0)));
        if (tier > 0) normalizedPurchases[id] = tier;
      });

      return normalizedPurchases;
    }

    function normalizeSave(input) {
      const normalized = { ...defaultSave(), ...(isPlainObjectValue(input) ? input : {}) };
      normalized.saveVersion = currentSaveVersion;
      normalized.unlockedWeapons = [
        ...new Set(["spark_bolt", ...arrayValue(normalized.unlockedWeapons)]),
      ];
      normalized.selectedStartingWeapon = normalizeSelectedStartingWeapon(
        normalized.selectedStartingWeapon,
        normalized.unlockedWeapons
      );
      normalized.coins = Math.max(0, Math.floor(normalized.coins || 0));
      normalized.towerFloor = Math.max(1, Math.floor(normalized.towerFloor || 1));
      normalized.unlockedNodes = arrayValue(normalized.unlockedNodes);
      normalized.upgradeTiers = objectValue(normalized.upgradeTiers);
      normalized.shopPurchases = normalizeShopPurchases(normalized.shopPurchases);
      normalized.seenBanners = [...new Set(arrayValue(normalized.seenBanners))];
      normalized.unlockedRelics = [...new Set(arrayValue(normalized.unlockedRelics))];
      normalized.equippedRelics = [
        ...new Set(
          arrayValue(normalized.equippedRelics).length
            ? arrayValue(normalized.equippedRelics)
            : normalized.unlockedRelics
        ),
      ]
        .filter((id) => normalized.unlockedRelics.includes(id))
        .slice(0, 5);
      normalized.activeQuests = arrayValue(normalized.activeQuests);
      normalized.completedQuests = arrayValue(normalized.completedQuests);
      normalized.questProgress = objectValue(normalized.questProgress);

      const ensureQuestOpen = (questId) => {
        if (!questId || !questDefs[questId]) return;
        if (
          !normalized.activeQuests.includes(questId) &&
          !normalized.completedQuests.includes(questId)
        ) {
          normalized.activeQuests.push(questId);
        }
        normalized.questProgress[questId] = normalized.questProgress[questId] || 0;
      };

      starterQuestAndUnlocks(normalized, ensureQuestOpen);

      normalized.unlockedUpgrades = Object.entries(normalized.upgradeTiers)
        .filter(([, tier]) => tier > 0)
        .map(([id]) => id);

      return normalized;
    }

    function normalizeSelectedStartingWeapon(value, unlockedWeapons) {
      if (
        typeof value === "string" &&
        knownWeaponIds.has(value) &&
        unlockedWeapons.includes(value)
      ) {
        return value;
      }
      return "spark_bolt";
    }

    function starterQuestAndUnlocks(normalized, ensureQuestOpen) {
      defaultSave().activeQuests.forEach((questId) => {
        ensureQuestOpen(questId);
      });

      normalized.completedQuests.forEach((questId) => {
        questOpenIds(questDefs[questId]).forEach(ensureQuestOpen);
      });

      normalized.unlockedNodes.forEach((nodeId) => {
        const unlock = weaponUnlocks.find((node) => node.id === nodeId);
        ensureQuestOpen(unlock?.opensQuest);
      });

      arrayValue(normalized.unlockedUpgrades).forEach((id) => {
        normalized.upgradeTiers[id] = Math.max(normalized.upgradeTiers[id] || 0, 1);
      });

      Object.entries(normalized.upgradeTiers).forEach(([upgradeId, tier]) => {
        if (tier > 0) {
          const upgrade = upgradeDefs.find((item) => item.id === upgradeId);
          ensureQuestOpen(upgrade?.opensQuest);
        }
      });
    }

    return {
      normalizeSave,
    };
  }

  /**
   * @typedef {{
   *   weaponId?: string,
   *   runUpgradeId?: string,
   *   name?: string,
   *   [key: string]: unknown
   * }} LevelUpChoice
   * @typedef {{ shopPurchases?: Record<string, number> }} ChoiceSave
   * @typedef {(choice: LevelUpChoice) => number} ChoiceWeightFn
   */

  /**
   * @param {LevelUpChoice[]} choices
   * @returns {LevelUpChoice[]}
   */
  function shuffleChoices(choices) {
    return choices
      .map((choice) => ({ choice, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ choice }) => choice);
  }

  /**
   * @param {LevelUpChoice[]} choices
   * @param {ChoiceWeightFn} weightForChoice
   * @returns {LevelUpChoice[]}
   */
  function weightedChoices(choices, weightForChoice) {
    return choices
      .map((choice) => ({
        choice,
        sort: Math.random() / Math.max(1, weightForChoice(choice)),
      }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ choice }) => choice);
  }

  /**
   * @param {LevelUpChoice} choice
   * @returns {string}
   */
  function choiceId(choice) {
    return choice.weaponId ? `weapon:${choice.weaponId}` : `run:${choice.runUpgradeId || choice.name}`;
  }

  /**
   * @param {ChoiceSave} save
   * @returns {number}
   */
  function shopFocusBonus(save) {
    return (save.shopPurchases?.relic_compass || 0) * 0.5;
  }

  /**
   * @typedef {{ x: number, y: number }} Point
   */

  /**
   * @param {Point} a
   * @param {Point} b
   * @returns {number}
   */
  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /**
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  /**
   * @param {number} seconds
   * @returns {string}
   */
  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(total / 60);
    const secs = String(total % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }

  /**
   * @typedef {object} PickupLootConfig
   * @property {number=} coinFloorRewardRate
   * @property {number=} normalCoinBaseValue
   * @property {number=} bossCoinBaseValue
   */

  function createPickupSystem({
    getGame,
    getSave,
    lootConfig = {},
    getRelicSpecialEffects,
    persist,
    renderMeta,
    collectXp,
    distance,
    randomRange,
  }) {
    const lootSettings = /** @type {PickupLootConfig} */ (lootConfig || {});

    function coinFloorRewardRate() {
      return Number.isFinite(lootSettings.coinFloorRewardRate)
        ? lootSettings.coinFloorRewardRate
        : 0.06;
    }

    function normalCoinBaseValue() {
      return Number.isFinite(lootSettings.normalCoinBaseValue)
        ? lootSettings.normalCoinBaseValue
        : 1;
    }

    function bossCoinBaseValue() {
      return Number.isFinite(lootSettings.bossCoinBaseValue) ? lootSettings.bossCoinBaseValue : 12;
    }

    function spawnLootDrops(enemy) {
      const game = getGame();
      if (enemy.boss || Math.random() < 0.34) {
        const value = coinValue(enemy.boss ? bossCoinBaseValue() : normalCoinBaseValue(), game.towerFloor);
        game.lootDrops.push({
          type: "coin",
          x: enemy.x + randomRange(-10, 10),
          y: enemy.y + randomRange(-10, 10),
          radius: enemy.boss ? 10 : 7,
          value,
        });
      }
      if (enemy.boss || Math.random() < 0.12) {
        game.lootDrops.push({
          type: "heart",
          x: enemy.x + randomRange(-12, 12),
          y: enemy.y + randomRange(-12, 12),
          radius: enemy.boss ? 11 : 8,
          healPercent: 0.2,
        });
      }
    }

    function coinValue(baseValue, towerFloor) {
      const floor = Math.max(1, Math.floor(towerFloor || 1));
      return Math.ceil(baseValue * (1 + (floor - 1) * coinFloorRewardRate()));
    }

    function pullDropTowardPlayer(drop, player, speed, dt) {
      const dx = player.x - drop.x;
      const dy = player.y - drop.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const step = Math.min(dist, speed * dt);
      drop.x += (dx / dist) * step;
      drop.y += (dy / dist) * step;
    }

    function updateXpDrops(dt) {
      const game = getGame();
      const player = game.player;
      game.xpDrops.forEach((drop) => {
        if (distance(player, drop) < player.pickupRadius) {
          pullDropTowardPlayer(drop, player, 480, dt);
        }
        if (distance(player, drop) < player.radius + drop.radius) {
          drop.collected = true;
          addPickupText(`+${drop.value} XP`, drop.x, drop.y, "#78e08f");
          collectXp(drop.value);
        }
      });
      game.xpDrops = game.xpDrops.filter((drop) => !drop.collected);
    }

    function updateLootDrops(dt) {
      const game = getGame();
      const player = game.player;
      game.lootDrops.forEach((drop) => {
        if (distance(player, drop) < player.pickupRadius) {
          pullDropTowardPlayer(drop, player, 540, dt);
        }
        if (distance(player, drop) < player.radius + drop.radius) {
          drop.collected = true;
          collectLoot(drop);
        }
      });
      game.lootDrops = game.lootDrops.filter((drop) => !drop.collected);
    }

    function collectLoot(drop) {
      const game = getGame();
      const save = getSave();
      if (drop.type === "coin") {
        const value = Math.ceil(drop.value * (1 + ((getRelicSpecialEffects?.() || {}).coinMultiplier || 0)));
        save.coins += value;
        addPickupText(`+${value}`, drop.x, drop.y, "#ffd166");
        persist();
        renderMeta();
      }
      if (drop.type === "heart") {
        const healAmount = Math.ceil(game.player.maxHp * drop.healPercent);
        game.player.hp = Math.min(game.player.maxHp, game.player.hp + healAmount);
        addPickupText(`+${healAmount} HP`, drop.x, drop.y, "#ff8fa3");
      }
    }

    function addPickupText(text, x, y, color) {
      const game = getGame();
      game.pickupTexts.push({ text, x, y, color, life: 0.85, maxLife: 0.85 });
    }

    function updatePickupTexts(dt) {
      const game = getGame();
      game.pickupTexts.forEach((text) => {
        text.y -= 28 * dt;
        text.life -= dt;
      });
      game.pickupTexts = game.pickupTexts.filter((text) => text.life > 0);
    }

    return {
      spawnLootDrops,
      updateXpDrops,
      updateLootDrops,
      updatePickupTexts,
    };
  }

  function createRelicSystem({ relicDefs, weaponDefs = {}, random = Math.random }) {
    function equippedRelics(save) {
      const equipped = new Set(save.equippedRelics || []);
      return (relicDefs || []).filter((relic) => equipped.has(relic.id)).slice(0, maxEquippedRelics(save));
    }

    function maxEquippedRelics(save) {
      return Math.min(5, Math.floor(Math.max(0, save.towerFloor || 1) / 10));
    }

    function relicNumber(save, field) {
      return equippedRelics(save).reduce((total, relic) => total + (relic[field] || 0), 0);
    }

    function relicBonusFor(save, upgradeId, field) {
      return equippedRelics(save)
        .filter((relic) => relic.targetUpgradeId === upgradeId)
        .reduce((total, relic) => total + (relic[field] || 0), 0);
    }

    function startingRunUpgradeTiers(save) {
      return equippedRelics(save).reduce((tiers, relic) => {
        const bonus = relic.startingTierBonus || 0;
        if (relic.targetUpgradeId && bonus > 0) {
          tiers[relic.targetUpgradeId] = (tiers[relic.targetUpgradeId] || 0) + bonus;
        }
        return tiers;
      }, {});
    }

    function maxEquippedWeapons(save) {
      return Math.max(1, 4 + relicNumber(save, "weaponSlotBonus"));
    }

    function getWeaponDamageMultiplier(save) {
      return equippedRelics(save).reduce((multiplier, relic) => multiplier * (relic.weaponDamageMultiplier || 1), 1);
    }

    function specialEffects(save) {
      return equippedRelics(save).reduce((effects, relic) => mergeSpecialAbility(effects, relic.specialAbility), {});
    }

    function mergeSpecialAbility(effects, ability) {
      if (!ability?.modifiers) return effects;
      Object.entries(ability.modifiers).forEach(([key, value]) => {
        if (!Number.isFinite(value)) return;
        effects[key] = (effects[key] || 0) + value;
      });
      return effects;
    }

    function grantRelic(save, relic) {
      if (!relic) return null;
      const unlocked = new Set(save.unlockedRelics || []);
      if (unlocked.has(relic.id)) return null;
      save.unlockedRelics = [...unlocked, relic.id];
      if ((save.equippedRelics || []).length < maxEquippedRelics(save)) {
        save.equippedRelics = [...new Set([...(save.equippedRelics || []), relic.id])];
      }
      return relic;
    }

    function setRelicEquipped(save, relicId, equipped) {
      const unlocked = new Set(save.unlockedRelics || []);
      if (!unlocked.has(relicId)) return false;
      const current = (save.equippedRelics || []).filter((id) => unlocked.has(id)).slice(0, maxEquippedRelics(save));
      if (!equipped) {
        save.equippedRelics = current.filter((id) => id !== relicId);
        return true;
      }
      if (current.includes(relicId)) return true;
      if (current.length >= maxEquippedRelics(save)) return false;
      save.equippedRelics = [...current, relicId];
      return true;
    }

    function grantRandomRelic(save) {
      const unlocked = new Set(save.unlockedRelics || []);
      const locked = (relicDefs || []).filter((relic) => !unlocked.has(relic.id));
      if (!locked.length) return null;
      const relic = locked[Math.floor(random() * locked.length)];
      return grantRelic(save, relic);
    }

    function relicChoices(save, equippedWeaponIds, count = 3) {
      const unlocked = new Set(save.unlockedRelics || []);
      const locked = (relicDefs || []).filter((relic) => !unlocked.has(relic.id));
      const relevantIds = relevantRunUpgradeIds(equippedWeaponIds);
      const relevant = locked.filter((relic) => relevantIds.has(relic.targetUpgradeId));
      const fallback = locked.filter((relic) => !relevantIds.has(relic.targetUpgradeId));
      return [...shuffleRelics(relevant), ...shuffleRelics(fallback)].slice(0, count);
    }

    function relevantRunUpgradeIds(equippedWeaponIds) {
      const ids = new Set(["run_fire_rate", "run_flat_damage", "run_percent_damage"]);
      const kinds = new Set((equippedWeaponIds || []).map((id) => weaponDefs[id]?.kind).filter(Boolean));
      if (kinds.has("projectile")) {
        ["run_projectile_pierce", "run_wall_bounce", "run_split_shot", "run_split_on_hit"].forEach((id) => ids.add(id));
      }
      if (["beam", "cone", "radial", "target_area", "lingering_area", "mine"].some((kind) => kinds.has(kind))) {
        ids.add("run_attack_radius");
      }
      return ids;
    }

    function shuffleRelics(relics) {
      return relics
        .map((relic) => ({ relic, sort: random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ relic }) => relic);
    }

    return {
      equippedRelics,
      maxEquippedRelics,
      maxEquippedWeapons,
      getWeaponDamageMultiplier,
      specialEffects,
      relicBonusFor,
      grantRelic,
      grantRandomRelic,
      relicChoices,
      setRelicEquipped,
      startingRunUpgradeTiers,
    };
  }

  const SHOP_FLOOR_PRICE_RATE = 0.03;
  const SHOP_INFLATION_RATE = 0.025;

  /**
   * @typedef {{ id: string, cost: number | number[], maxTier: number }} ShopPricingItem
   * @typedef {{ floorPriceRate?: number, inflationRate?: number }} ShopPricingConfig
   * @typedef {{
   *   coins: number,
   *   towerFloor?: number,
   *   shopPurchases?: Record<string, number>
   * }} ShopPricingSave
   * @typedef {{
   *   canBuy(item: ShopPricingItem): boolean,
   *   costFor(item: ShopPricingItem, tier: number): number,
   *   tierFor(item: ShopPricingItem): number
   * }} ShopPricingApi
   */

  /**
   * @param {{
   *   shopItemDefs: ShopPricingItem[],
   *   pricingConfig?: ShopPricingConfig,
   *   getSave: () => ShopPricingSave
   * }} options
   * @returns {ShopPricingApi}
   */
  function createShopPricing({ shopItemDefs, pricingConfig = {}, getSave }) {
    function floorPriceRate() {
      return Number.isFinite(pricingConfig.floorPriceRate)
        ? pricingConfig.floorPriceRate
        : SHOP_FLOOR_PRICE_RATE;
    }

    function inflationRate() {
      return Number.isFinite(pricingConfig.inflationRate)
        ? pricingConfig.inflationRate
        : SHOP_INFLATION_RATE;
    }

    function tierFor(item) {
      return getSave().shopPurchases?.[item.id] || 0;
    }

    function costFor(item, tier) {
      const baseCost = Array.isArray(item.cost) ? item.cost[tier] : item.cost;
      const floor = Math.max(1, getSave().towerFloor || 1);
      const floorMultiplier = floor <= 1 ? 1 : 1 + (floor - 1) * floorPriceRate();
      const inflationMultiplier = taperedInflationMultiplier(purchasedTierCount(item.id));
      return Math.ceil(baseCost * floorMultiplier * inflationMultiplier);
    }

    function taperedInflationMultiplier(purchasedTierCount) {
      return 1 + Math.log1p(Math.max(0, purchasedTierCount)) * inflationRate();
    }

    function purchasedTierCount(excludedItemId = "") {
      const purchases = getSave().shopPurchases || {};
      return shopItemDefs.reduce((total, item) => {
        if (item.id === excludedItemId) return total;
        return total + (purchases[item.id] || 0);
      }, 0);
    }

    function canBuy(item) {
      const save = getSave();
      const tier = tierFor(item);
      const cost = costFor(item, tier);
      return tier < item.maxTier && save.coins >= cost;
    }

    return {
      canBuy,
      costFor,
      tierFor,
    };
  }

  const MODULE_NATIVE_SHOP_SLOTS = Object.freeze(["shop"]);

  const MODULE_NATIVE_SHOP_PROOF_SLOTS = Object.freeze(["createShopSystem"]);

  /**
   * @param {any} [options]
   */
  function createShopSystem(options = {}) {
    const resolvedOptions = requireObject(options, "options");
    const documentRef = requireDocumentRef(resolvedOptions.documentRef);
    const ui = requireObject(resolvedOptions.ui, "ui");
    const effects = requireObject(resolvedOptions.effects, "effects");
    const shopPricing = requireObject(resolvedOptions.shopPricing, "shopPricing");
    const shopItemDefs = requireArray(resolvedOptions.shopItemDefs, "shopItemDefs");
    const getSave = requireFunction(resolvedOptions.getSave, "getSave");
    const getGame = requireFunction(resolvedOptions.getGame, "getGame");
    const persist = requireFunction(resolvedOptions.persist, "persist");
    const renderMeta = requireFunction(resolvedOptions.renderMeta, "renderMeta");
    const pricing = shopPricing.createShopPricing({
      shopItemDefs,
      pricingConfig: resolvedOptions.pricingConfig,
      getSave,
    });

    function canBuy(item) {
      return pricing.canBuy(item);
    }

    function buyItem(item) {
      if (!canBuy(item)) return;
      const save = getSave();
      const tier = pricing.tierFor(item);
      const cost = pricing.costFor(item, tier);
      save.coins -= cost;
      save.shopPurchases[item.id] = tier + 1;
      resolvedOptions.playPurchaseSfx?.();
      applyItemEffectToRun(item);
      persist();
      renderShop();
      showPurchaseNotice();
      renderMeta();
    }

    function showPurchaseNotice() {
      const message = "eh? The prices went up! Inflation huh.";
      resolvedOptions.onPurchaseNotice?.(message);
    }

    function applyItemEffectToRun(item) {
      effects.applyShopItemEffectToRun(getGame(), item);
    }

    function renderShop() {
      const save = getSave();
      if (isShopVisible()) resolvedOptions.onShopVisit?.();
      renderShopList(ui.shopItems, ui.shopCoinHud, save);
      renderShopList(ui.menuShopItems, ui.menuShopCoinHud, save);
      const notice = "Browser shop ready.";
      if (ui.shopNotice && !ui.shopNotice.textContent) ui.shopNotice.textContent = notice;
      if (ui.menuShopNotice && !ui.menuShopNotice.textContent) ui.menuShopNotice.textContent = notice;
    }

    function isShopVisible() {
      return !ui.shopModal?.classList.contains("hidden") || !ui.menuShopPanel?.classList.contains("hidden");
    }

    function renderShopList(container, coinHud, save) {
      if (!container || !coinHud) return;
      coinHud.textContent = `Coins: ${save.coins} | Tower Floor ${Math.max(1, save.towerFloor || 1)}`;
      container.innerHTML = "";
      if (!shopItemDefs.length) {
        const empty = documentRef.createElement("div");
        empty.className = "shop-item";
        empty.textContent = "No shop items yet.";
        container.appendChild(empty);
        return;
      }

      shopItemDefs.forEach((item) => {
        const tier = pricing.tierFor(item);
        const maxed = tier >= item.maxTier;
        const cost = pricing.costFor(item, tier);
        const affordable = !maxed && save.coins >= cost;
        const el = documentRef.createElement("div");
        el.className = `shop-item ${affordable ? "available" : "locked"}`;
        el.innerHTML = `
          <div class="shop-item-icon">
            ${item.spritePath ? `<img class="shop-item-sprite" src="${item.spritePath}" alt="" />` : ""}
          </div>
          <div class="shop-item-copy">
            <strong>${item.name}</strong>
            <span>${item.description}</span><br />
            <span>Tier: ${tier}/${item.maxTier}</span><br />
            <span>${maxed ? "Maxed" : affordable ? `Cost: ${cost} coins` : `Needs ${cost} coins`}</span>
          </div>
        `;
        const button = documentRef.createElement("button");
        button.textContent = maxed ? "Maxed" : `Buy Tier ${tier + 1}`;
        button.disabled = maxed || !affordable;
        button.addEventListener("click", () => buyItem(item));
        el.appendChild(button);
        container.appendChild(el);
      });
    }

    function openShop() {
      ui.shopModal.classList.remove("hidden");
      ui.menuShopPanel?.classList.remove("hidden");
      const game = getGame();
      if (game?.running && !game.paused) {
        game.paused = true;
        game.pauseReason = "shop";
      }
      renderShop();
    }

    function closeShop() {
      ui.shopModal.classList.add("hidden");
      ui.menuShopPanel?.classList.add("hidden");
      const game = getGame();
      if (game?.pauseReason === "shop") {
        game.paused = false;
        game.pauseReason = "";
      }
    }

    function getShopBonuses() {
      const save = getSave();
      const bonuses = effects.emptyShopBonuses();
      shopItemDefs.forEach((item) => {
        const tier = save.shopPurchases?.[item.id] || 0;
        effects.addShopItemBonus(bonuses, item, tier);
      });
      return bonuses;
    }

    return {
      closeShop,
      getShopBonuses,
      openShop,
      renderShop,
    };
  }

  function requireArray(value, name) {
    if (!Array.isArray(value)) {
      throw new Error(`Missing Tap Survivor native shop dependency: ${name}`);
    }
    return value;
  }

  function requireDocumentRef(value) {
    if (!value || typeof value.createElement !== "function") {
      throw new Error("Missing Tap Survivor native shop dependency: documentRef");
    }
    return value;
  }

  function requireFunction(value, name) {
    if (typeof value !== "function") {
      throw new Error(`Missing Tap Survivor native shop dependency: ${name}`);
    }
    return value;
  }

  function requireObject(value, name) {
    if (!value || typeof value !== "object") {
      throw new Error(`Missing Tap Survivor native shop dependency: ${name}`);
    }
    return value;
  }

  /**
   * @typedef {{
   *   id?: string,
   *   kind?: string,
   *   cooldown: number,
   *   damage: number,
   *   range?: number,
   *   radius?: number,
   *   upgradeId?: string,
   *   width?: number
   * }} WeaponDef
   * @typedef {Record<string, WeaponDef>} WeaponDefs
   * @typedef {{ fireRate?: number, attackRadius?: number, percentDamage?: number, flatDamage?: number }} ShopBonuses
   * @typedef {{
   *   areaRadiusBonus?: number,
   *   beamWidthBonus?: number,
   *   cooldownReduction?: number,
   *   damageBonus?: number,
   *   projectileSizeBonus?: number
   * }} RelicSpecialEffects
   * @typedef {{
   *   id: string,
   *   [key: string]: number | string | undefined
   * }} RunUpgradeDef
   * @typedef {{ playbackRate: number, minGapMs: number }} WeaponSfxOptions
   * @typedef {{
   *   projectileRadius(weapon: WeaponDef): number,
   *   projectileSkillModifier(weapon: WeaponDef, field: string): number,
   *   weaponCooldown(weapon: WeaponDef): number,
   *   weaponDamage(weaponId: string): number,
   *   weaponReach(weapon: WeaponDef): number,
   *   weaponSfxOptions(weapon: WeaponDef): WeaponSfxOptions,
   *   weaponWidth(weapon: WeaponDef): number
   * }} WeaponScalingApi
   */

  /**
   * @param {{
   *   content?: { runUpgrades?: RunUpgradeDef[] },
   *   weaponDefs: WeaponDefs,
   *   getUpgradeTier: (id: string | undefined) => number,
   *   getRunUpgradeTier: (id: string) => number,
   *   getShopBonuses?: () => ShopBonuses,
   *   getRelicSpecialEffects?: () => RelicSpecialEffects,
   *   getWeaponDamageMultiplier?: () => number,
   *   clamp: (value: number, min: number, max: number) => number
   * }} options
   * @returns {WeaponScalingApi}
   */
  function createWeaponScaling({
    content = {},
    weaponDefs,
    getUpgradeTier,
    getRunUpgradeTier,
    getShopBonuses,
    getRelicSpecialEffects,
    getWeaponDamageMultiplier,
    clamp,
  }) {
    function weaponCooldown(weapon) {
      const shopBonuses = getShopBonuses?.() || {};
      const relicEffects = getRelicSpecialEffects?.() || {};
      const rateTier =
        getUpgradeTier("fire_rate") +
        getRunUpgradeTier("run_fire_rate") +
        (shopBonuses.fireRate || 0);
      return (
        (weapon.cooldown / (1 + rateTier * 0.12 + (relicEffects.cooldownReduction || 0))) *
        projectileSkillModifier(weapon, "projectileCooldownMultiplier")
      );
    }

    function weaponSfxOptions(weapon) {
      const cooldown = Math.max(0.1, weaponCooldown(weapon));
      return {
        playbackRate: clamp(1.15 / cooldown, 0.75, 2.35),
        minGapMs: clamp(cooldown * 320, 35, 120),
      };
    }

    function weaponReach(weapon) {
      const shopBonuses = getShopBonuses?.() || {};
      const relicEffects = getRelicSpecialEffects?.() || {};
      const radiusTier =
        getUpgradeTier("attack_radius") +
        getRunUpgradeTier("run_attack_radius") +
        (shopBonuses.attackRadius || 0);
      return (weapon.range || 0) * (1 + radiusTier * 0.12 + (relicEffects.areaRadiusBonus || 0));
    }

    function weaponWidth(weapon) {
      const shopBonuses = getShopBonuses?.() || {};
      const relicEffects = getRelicSpecialEffects?.() || {};
      const radiusTier =
        getUpgradeTier("attack_radius") +
        getRunUpgradeTier("run_attack_radius") +
        (shopBonuses.attackRadius || 0);
      return (weapon.width || 0) * (1 + radiusTier * 0.1 + (relicEffects.beamWidthBonus || 0));
    }

    function projectileRadius(weapon) {
      const shopBonuses = getShopBonuses?.() || {};
      const relicEffects = getRelicSpecialEffects?.() || {};
      const radiusTier =
        getUpgradeTier("attack_radius") +
        getRunUpgradeTier("run_attack_radius") +
        (shopBonuses.attackRadius || 0);
      return (
        (weapon.radius || 0) * (1 + radiusTier * 0.12 + (relicEffects.projectileSizeBonus || 0))
      );
    }

    function weaponDamage(weaponId) {
      const weapon = weaponDefs[weaponId];
      const flatTier = getUpgradeTier("flat_damage") + getRunUpgradeTier("run_flat_damage");
      const shopBonuses = getShopBonuses?.() || {};
      const percentTier =
        getUpgradeTier("percent_damage") +
        getRunUpgradeTier("run_percent_damage") +
        getUpgradeTier(weapon.upgradeId) * 2 +
        (shopBonuses.percentDamage || 0);
      const relicEffects = getRelicSpecialEffects?.() || {};
      return (
        (weapon.damage + flatTier * 4 + (shopBonuses.flatDamage || 0)) *
        (1 + percentTier * 0.12 + (relicEffects.damageBonus || 0)) *
        (getWeaponDamageMultiplier?.() || 1) *
        projectileSkillModifier(weapon, "projectileDamageMultiplier")
      );
    }

    function projectileSkillModifier(weapon, field) {
      if (weapon?.kind !== "projectile") return 1;
      return (content?.runUpgrades || []).reduce((multiplier, upgrade) => {
        const tier = getRunUpgradeTier(upgrade.id);
        const value = upgrade[field];
        if (!tier || typeof value !== "number" || !Number.isFinite(value)) return multiplier;
        return multiplier * value ** tier;
      }, 1);
    }

    return {
      projectileRadius,
      projectileSkillModifier,
      weaponCooldown,
      weaponDamage,
      weaponReach,
      weaponSfxOptions,
      weaponWidth,
    };
  }

  /**
   * @typedef {{ x: number, y: number }} Point
   * @typedef {{ player: Point, enemies: Point[] }} TargetingGame
   * @typedef {(a: Point, b: Point) => number} DistanceFn
   */

  /**
   * @param {TargetingGame} game
   * @param {DistanceFn} distance
   * @returns {Point | null}
   */
  function nearestEnemy(game, distance) {
    if (!game.enemies.length) return null;

    const p = game.player;
    return game.enemies.reduce((best, enemy) =>
      distance(p, enemy) < distance(p, best) ? enemy : best
    );
  }

  function createRunLifecycle({
    ui,
    getGame,
    getSave,
    resetGameState,
    shopSystem,
    shellUi,
    runUi,
    relicSystem,
    persist,
    renderMeta,
    updateRunHud,
    showMovementGateBanner,
  }) {
    function startRun() {
      shellUi.closeStartFlow();
      shopSystem.closeShop();
      runUi.hideEndScreen();
      ui.levelUp.classList.add("hidden");
      shellUi.closeRunMenu(false);
      const game = resetGameState();
      game.awaitingFirstMoveInput = true;
      showMovementGateBanner();
    }

    function endRun(reason) {
      const game = getGame();
      if (!game) return;
      game.running = false;
      game.endReason = reason;
      runUi.showEndScreen(reason);
      persist();
      renderMeta();
    }

    function advanceTowerFloor() {
      const game = getGame();
      if (!game) return;
      const clearedFloor = game.towerFloor || 1;
      const relicDropCount = clearedFloor % 5 === 0 ? 2 : 1;
      showRelicChoice(clearedFloor, relicDropCount, []);
    }

    function showRelicChoice(clearedFloor, remainingPicks, awardedRelics) {
      const save = getSave();
      const game = getGame();
      const choices = relicSystem.relicChoices(save, game.player.equippedWeapons, 3);
      if (!choices.length) {
        finishBossClear(clearedFloor, awardedRelics);
        return;
      }
      game.paused = true;
      game.pauseReason = "relic";
      ui.relicChoiceTitle.textContent =
        remainingPicks > 1 ? `Choose Relic ${awardedRelics.length + 1}` : "Choose Relic";
      ui.relicChoiceText.textContent = "Pick one reward shaped by your current weapons.";
      ui.relicChoices.innerHTML = "";
      choices.forEach((relic) => {
        const button = document.createElement("button");
        button.className = relic.rarity === "green" ? "green-relic" : "";
        if (relic.backgroundColor && typeof button.style?.setProperty === "function") {
          button.style.setProperty("--relic-bg", relic.backgroundColor);
        } else if (relic.backgroundColor && button.style) {
          button.style["--relic-bg"] = relic.backgroundColor;
        }
        button.innerHTML = `
          <img class="level-choice-icon" src="${relic.iconPath || "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610"}" alt="" />
          <strong>${relic.name}</strong><br /><span>${relic.description}</span>
          ${relic.specialAbility ? `<br /><span>${relic.specialAbility.label}: ${relic.specialAbility.description}</span>` : ""}
        `;
        button.addEventListener("click", () => {
          const granted = relicSystem.grantRelic(save, relic);
          const nextAwarded = granted ? [...awardedRelics, granted] : awardedRelics;
          if (remainingPicks > 1) {
            showRelicChoice(clearedFloor, remainingPicks - 1, nextAwarded);
          } else {
            finishBossClear(clearedFloor, nextAwarded);
          }
        });
        ui.relicChoices.appendChild(button);
      });
      ui.relicChoice.classList.remove("hidden");
    }

    function finishBossClear(clearedFloor, awardedRelics) {
      const save = getSave();
      ui.relicChoice.classList.add("hidden");
      save.towerFloor = Math.max(save.towerFloor || 1, clearedFloor + 1);
      persist();
      const game = resetGameState();
      game.lastFloorClear = {
        floor: clearedFloor,
        relicName: awardedRelics.length
          ? awardedRelics.map((relic) => relic.name).join(" + ")
          : "No locked relics remaining",
      };
      updateRunHud();
      renderMeta();
    }

    return {
      advanceTowerFloor,
      endRun,
      startRun,
    };
  }

  function createRunStateSystem({
    canvas,
    mapSystem,
    getSave,
    getShopBonuses,
    getUpgradeTier,
    maxEquippedWeapons,
    weaponDefs = {},
  }) {
    function createPlayer() {
      const moveTier = getUpgradeTier("move_speed");
      const pickupTier = getUpgradeTier("pickup_radius");
      const hpTier = getUpgradeTier("max_hp");
      const shopBonuses = getShopBonuses();
      const maxHp = 100 + hpTier * 20 + shopBonuses.maxHp;
      return {
        x: canvas.width / 2,
        y: canvas.height / 2,
        targetX: canvas.width / 2,
        targetY: canvas.height / 2,
        radius: 16,
        speed: 185 + moveTier * 24 + shopBonuses.speed,
        hp: maxHp,
        maxHp,
        pickupRadius: 54 + pickupTier * 18 + shopBonuses.pickupRadius,
        projectileBlockCharge: 0,
        projectileBlockNeeded: 5,
        projectileBlockReady: false,
        xp: 0,
        level: 1,
        xpToLevel: 5,
        maxWeapons: maxEquippedWeapons(),
        equippedWeapons: [startingWeaponId()],
      };
    }

    function startingWeaponId() {
      const save = getSave();
      const selected = save?.selectedStartingWeapon;
      if (
        typeof selected === "string" &&
        weaponDefs[selected] &&
        (save.unlockedWeapons || []).includes(selected)
      ) {
        return selected;
      }
      return "spark_bolt";
    }

    function resetGameState() {
      const run = {
        running: true,
        paused: false,
        pauseReason: "",
        elapsed: 0,
        duration: 150,
        towerFloor: getSave().towerFloor || 1,
        bossSpawned: false,
        bossDefeated: false,
        player: createPlayer(),
        enemies: [],
        xpDrops: [],
        lootDrops: [],
        pickupTexts: [],
        bolts: [],
        enemyBolts: [],
        beams: [],
        areas: [],
        weaponBursts: [],
        weaponIconFlashes: {},
        bossAttacks: [],
        bossSpawnNotice: null,
        weaponTimers: {},
        runUpgradeTiers: {},
        spawnTimer: 0,
        bossAttackTimer: 3.8,
        bossAttackCooldownMax: 3.8,
        kills: 0,
        xpCollected: 0,
        laserDamage: 0,
        weaponDamage: {},
        levelUps: 0,
        endReason: "",
      };
      mapSystem?.applyToGame?.(run);
      return run;
    }

    function applyRunMetaUpgrades(game) {
      if (!game?.player) return;
      const p = game.player;
      p.speed = Math.max(p.speed, 185 + getUpgradeTier("move_speed") * 24);
      p.pickupRadius = Math.max(p.pickupRadius, 54 + getUpgradeTier("pickup_radius") * 18);
      const newMaxHp = 100 + getUpgradeTier("max_hp") * 20;
      if (newMaxHp > p.maxHp) {
        p.hp += newMaxHp - p.maxHp;
        p.maxHp = newMaxHp;
      }
    }

    return {
      resetGameState,
      applyRunMetaUpgrades,
    };
  }

  function createRunUi({
    ui,
    formatTime,
    getGame,
    getSave,
    getGameSpeed,
    maxEquippedWeapons,
    renderDebug,
  }) {
    function updateRunHud() {
      const game = getGame();
      if (!game) {
        if (ui.runHud)
          ui.runHud.textContent = `Speed x${getGameSpeed()} | Start a run to test movement, auto-attacks, XP, Laser, quests, and Quest Points.`;
        renderDebug();
        return;
      }
      const save = getSave();
      const boss = game.enemies.find((enemy) => enemy.boss);
      const bossText = boss
        ? ` | Boss HP ${Math.max(0, Math.ceil(boss.hp))}/${boss.maxHp}`
        : game.bossSpawned
          ? " | Boss defeated"
          : "";
      const floorText = game.lastFloorClear
        ? ` | Cleared Floor ${game.lastFloorClear.floor}: ${game.lastFloorClear.relicName}`
        : "";
      if (ui.runHud) {
        ui.runHud.textContent = [
          `Time ${formatTime(game.elapsed)}`,
          `Floor ${game.towerFloor}`,
          `Speed x${getGameSpeed()}`,
          `HP ${Math.max(0, Math.ceil(game.player.hp))}/${game.player.maxHp}`,
          `Coins ${save.coins}`,
          `Level ${game.player.level}`,
          `Kills ${game.kills}`,
          `Laser damage ${Math.floor(game.laserDamage)}`,
          `Weapons ${game.player.equippedWeapons.length}/${maxEquippedWeapons()}${bossText}${floorText}`,
        ].join(" | ");
      }
      renderDebug();
    }

    function showEndScreen(reason) {
      const game = getGame();
      const save = getSave();
      if (!game) return;
      ui.runStats.innerHTML = `
          <p>Result: ${reason}</p>
          <p>Tower floor: ${game.towerFloor}</p>
          <p>Time survived: ${formatTime(game.elapsed)}</p>
          <p>Enemies defeated: ${game.kills}</p>
          <p>Level reached: ${game.player.level}</p>
          <p>XP collected: ${game.xpCollected}</p>
          <p>Coins banked: ${save.coins}</p>
          <p>Laser damage dealt: ${Math.floor(game.laserDamage)}</p>
          <p>Quest Points: ${save.questPoints} available</p>
        `;
      ui.endScreen.classList.remove("hidden");
    }

    function hideEndScreen() {
      ui.endScreen.classList.add("hidden");
    }

    return {
      updateRunHud,
      showEndScreen,
      hideEndScreen,
    };
  }

  function createGameDependencyBag({ globalRef, documentRef = globalRef?.document }) {
    const rawContent = globalRef.TapSurvivorContent;
    const balanceRuntime = globalRef.TapSurvivorBalanceRuntime;
    if (typeof balanceRuntime?.configureDefaultProviders === "function") {
      balanceRuntime.configureDefaultProviders({
        content: rawContent,
        profiles: rawContent?.balanceProfiles,
        storage: createBalanceStorageProvider(globalRef),
      });
    }
    const configuredContent = balanceRuntime?.content?.() || rawContent;
    const content = configuredContent || {};
    const effects = globalRef.TapSurvivorEffects;
    const upgrades = globalRef.TapSurvivorUpgrades || {};
    if (typeof upgrades.configureDefaultProviders === "function") {
      upgrades.configureDefaultProviders({ content: configuredContent, effects });
    }
    const save = requireGlobal(globalRef, "TapSurvivorSave");
    const storage = requireGlobal(globalRef, "TapSurvivorStorage");
    if (typeof save.configureDefaultProviders === "function") {
      save.configureDefaultProviders({ storage });
    }
    const audio = requireGlobal(globalRef, "TapSurvivorAudio");
    if (typeof audio.configureDefaultProviders === "function") {
      audio.configureDefaultProviders({
        audioContextFactory: createAudioContextFactory(globalRef),
      });
    }
    const shellRelicUi = requireGlobal(globalRef, "TapSurvivorShellRelicUi");
    if (typeof shellRelicUi.configureDefaultProviders === "function") {
      shellRelicUi.configureDefaultProviders({
        scheduler: createShellRelicSchedulerProvider(globalRef),
      });
    }

    return {
      audio,
      assets: globalRef.TapSurvivorAssets || {},
      balance: { floorDifficulty },
      balanceRuntime,
      combat: { createCombatSystem },
      combatDamage: { createCombatDamageSystem },
      content,
      contentRegistry: { createContentRegistry },
      debug: requireGlobal(globalRef, "TapSurvivorDebug"),
      debugBalance: globalRef.TapSurvivorDebugBalance,
      effects: requireValue(effects, "TapSurvivorEffects"),
      enemies: { createEnemySystem },
      enemyBehaviors: { createEnemyBehaviorSystem },
      enemySpawning: { createEnemySpawnSystem },
      gameBanners: { createGameBannerSystem },
      gameRuntime: { createGameRuntimeController },
      input: {
        bindMovementInput: requireFunction(
          globalRef?.TapSurvivorInput?.bindMovementInput,
          "globalThis.TapSurvivorInput.bindMovementInput"
        ),
      },
      levelUp: requireGlobal(globalRef, "TapSurvivorLevelUp"),
      levelUpChoices: { choiceId, shopFocusBonus, shuffleChoices, weightedChoices },
      mapSystem: { createMapSystem },
      math: { clamp, distance, formatTime, randomRange },
      pickups: { createPickupSystem },
      progression: requireGlobal(globalRef, "TapSurvivorProgression"),
      quests: requireGlobal(globalRef, "TapSurvivorQuests"),
      relics: { createRelicSystem },
      renderEnemies: requireGlobal(globalRef, "TapSurvivorRenderEnemies"),
      renderHud: requireGlobal(globalRef, "TapSurvivorRenderHud"),
      renderSkillRail: requireGlobal(globalRef, "TapSurvivorRenderSkillRail"),
      rendering: requireGlobal(globalRef, "TapSurvivorRendering"),
      runLifecycle: { createRunLifecycle },
      runState: { createRunStateSystem },
      runUi: { createRunUi },
      runUpdate: requireGlobal(globalRef, "TapSurvivorRunUpdate"),
      save,
      saveCorruption: { createSaveLoadHandler },
      saveDefaults: { CURRENT_SAVE_VERSION, createDefaultSave },
      saveMigrations: { isPlainObject, migrateSave },
      saveNormalize: { arrayValue, createSaveNormalizer, objectValue },
      shellRelicUi,
      shellUi: requireGlobal(globalRef, "TapSurvivorShellUi"),
      shop: {
        createShopSystem: (options = {}) =>
          createShopSystem({
            ...options,
            documentRef: options.documentRef || documentRef,
          }),
      },
      shopPricing: { createShopPricing },
      sprites: requireGlobal(globalRef, "TapSurvivorSprites"),
      storage,
      ui: requireGlobal(globalRef, "TapSurvivorUi"),
      uiProgression: requireGlobal(globalRef, "TapSurvivorUiProgression"),
      upgrades,
      weaponBehaviors: requireGlobal(globalRef, "TapSurvivorWeaponBehaviors"),
      weaponCooldowns: { createWeaponScaling },
      weaponFire: requireGlobal(globalRef, "TapSurvivorWeaponFire"),
      weaponProjectiles: requireGlobal(globalRef, "TapSurvivorWeaponProjectiles"),
      weaponTargeting: { nearestEnemy },
    };
  }

  function requireGlobal(globalRef, name) {
    return requireValue(globalRef?.[name], name);
  }

  function createAudioContextFactory(globalRef) {
    return () => {
      const AudioContextRef = globalRef.AudioContext || globalRef.webkitAudioContext;
      return typeof AudioContextRef === "function" ? new AudioContextRef() : null;
    };
  }

  function createBalanceStorageProvider(globalRef) {
    return {
      getItem: (key) => globalRef?.localStorage?.getItem?.(key),
      removeItem: (key) => globalRef?.localStorage?.removeItem?.(key),
      setItem: (key, value) => globalRef?.localStorage?.setItem?.(key, value),
    };
  }

  function createShellRelicSchedulerProvider(globalRef) {
    return {
      clearTimeout: (timer) => globalRef?.clearTimeout?.(timer),
      setTimeout: (callback, delay) => globalRef?.setTimeout?.(callback, delay),
      animationSetTimeout: (callback, delay) => globalRef?.setTimeout?.(callback, delay),
    };
  }

  function requireValue(value, name) {
    if (!value) {
      throw new Error(`Missing Tap Survivor runtime dependency: globalThis.${name}`);
    }
    return value;
  }

  function requireFunction(value, name) {
    if (typeof value !== "function") {
      throw new Error(`Missing Tap Survivor runtime dependency: ${name}`);
    }
    return value;
  }

  globalThis.TapSurvivorGameDependencies = {
    createGameDependencyBag,
  };
})();
