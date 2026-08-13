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

  const DEFAULT_SHOP_BONUS_STATS = [
    "speed",
    "pickupRadius",
    "maxHp",
    "flatDamage",
    "attackRadius",
    "fireRate",
    "percentDamage",
    "relicFocus",
  ];

  function createEffects({ contentSchema = {} } = {}) {
    const shopBonusStats =
      contentSchema["effectRegistries"]?.["shopItem"]?.["stats"] ||
      DEFAULT_SHOP_BONUS_STATS;

    function applyPlayerStatEffect(player, effect) {
      const handler = PLAYER_STAT_EFFECTS[effect?.stat];
      if (!player || !handler) return false;
      handler(player, effect.value || 0);
      return true;
    }

    function applyRunUpgradeEffects(game, effects) {
      (effects || []).forEach((effect) => {
        if (effect.type === "playerStatAdd") {
          applyPlayerStatEffect(game.player, effect);
          return;
        }
        if (effect.type === "playerHeal") {
          game.player.hp = Math.min(game.player.maxHp, game.player.hp + effect.value);
        }
      });
    }

    function applyShopItemEffectToRun(game, item) {
      if (!game?.running || !game.player || !item?.effect) return false;
      return applyPlayerStatEffect(game.player, item.effect);
    }

    function emptyShopBonuses() {
      return Object.fromEntries(shopBonusStats.map((stat) => [stat, 0]));
    }

    function addShopItemBonus(bonuses, item, tier) {
      if (!item?.effect || !Object.prototype.hasOwnProperty.call(bonuses, item.effect.stat)) return;
      bonuses[item.effect.stat] += item.effect.value * tier;
    }

    function applyRelicSpecialEffects(game, effects = {}) {
      const player = game?.player;
      if (!player) return;
      if (effects.maxHpBonus) {
        player.maxHp += effects.maxHpBonus;
        player.hp += effects.maxHpBonus;
      }
      if (effects.maxHpMultiplier) {
        const nextMaxHp = Math.ceil(player.maxHp * (1 + effects.maxHpMultiplier));
        player.hp += nextMaxHp - player.maxHp;
        player.maxHp = nextMaxHp;
      }
      if (effects.speedBonus) player.speed += effects.speedBonus;
      if (effects.speedMultiplier) player.speed *= 1 + effects.speedMultiplier;
      if (effects.pickupRadiusBonus) player.pickupRadius += effects.pickupRadiusBonus;
      if (effects.pickupRadiusMultiplier) player.pickupRadius *= 1 + effects.pickupRadiusMultiplier;
    }

    return {
      applyRunUpgradeEffects,
      applyShopItemEffectToRun,
      emptyShopBonuses,
      addShopItemBonus,
      applyRelicSpecialEffects,
    };
  }

  const PLAYER_STAT_EFFECTS = {
    speed(player, value) {
      player.speed += value;
    },
    pickupRadius(player, value) {
      player.pickupRadius += value;
    },
    maxHp(player, value) {
      player.maxHp += value;
      player.hp += value;
    },
  };

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

  const MODULE_NATIVE_ENEMY_BEHAVIOR_PROOF_SLOTS = Object.freeze(["createEnemyBehaviorSystem"]);

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

  function createSaveSystem({
    saveKey,
    legacySaveKey,
    saveNormalize,
    saveCorruption,
    saveDefaults,
    saveMigrations,
    starterQuestIds,
    questDefs,
    weaponUnlocks,
    upgradeDefs,
    shopItemDefs = [],
    questOpenIds,
    storage,
    storageAdapter,
  }) {
    const { createSaveNormalizer } = saveNormalize;
    const { createSaveLoadHandler } = saveCorruption;
    const { createDefaultSave } = saveDefaults;
    const { migrateSave } = saveMigrations;
    const currentSaveVersion = saveDefaults.CURRENT_SAVE_VERSION;
    const shopItemById = new Map(shopItemDefs.map((item) => [item.id, item]));
    const activeStorage =
      storageAdapter ||
      storage?.createStorageAdapter({
        saveKey,
        legacySaveKey,
      });

    function defaultSave() {
      return createDefaultSave({ starterQuestIds });
    }

    const { normalizeSave } = createSaveNormalizer({
      currentSaveVersion,
      defaultSave,
      isPlainObject: saveMigrations.isPlainObject,
      questDefs,
      weaponUnlocks,
      upgradeDefs,
      shopItemById,
      questOpenIds,
    });

    const saveLoadHandler = createSaveLoadHandler({
      defaultSave,
      normalizeAndMigrateSave,
      storage: activeStorage,
    });

    function loadSave() {
      try {
        const raw = activeStorage?.getSaveRaw?.();
        if (raw && typeof raw.then === "function") {
          return raw.then(saveLoadHandler.fromRaw).catch(saveLoadHandler.storageReadFailed);
        }

        return saveLoadHandler.fromRaw(raw);
      } catch {
        return saveLoadHandler.storageReadFailed();
      }
    }

    function normalizeAndMigrateSave(input) {
      return normalizeSave({
        ...defaultSave(),
        ...migrateSave(input, { currentSaveVersion }),
      });
    }

    function persist(save) {
      const unlockedUpgrades = Object.entries(save.upgradeTiers)
        .filter(([, tier]) => tier > 0)
        .map(([id]) => id);

      save.unlockedUpgrades = unlockedUpgrades;
      return activeStorage?.setSaveRaw?.(JSON.stringify(save)) ?? false;
    }

    function removeSave() {
      return activeStorage?.removeSaveRaw?.() ?? false;
    }

    function getLastLoadWarning() {
      return saveLoadHandler.getLastLoadWarning();
    }

    return {
      defaultSave,
      loadSave,
      getLastLoadWarning,
      normalizeSave,
      persist,
      removeSave,
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

  const MODULE_NATIVE_PROGRESSION_SLOTS = Object.freeze(["progression"]);

  const MODULE_NATIVE_PROGRESSION_PROOF_SLOTS = Object.freeze(["createProgressionSystem"]);

  /**
   * @param {{
   *   weaponDefs: Record<string, any>,
   *   weaponUnlocks: Array<any>,
   *   upgradeDefs: Array<any>,
   *   questDefs: Record<string, any>,
   *   getSave: () => any,
   *   openQuest: (id: string) => void,
   *   persist: () => void,
   *   renderMeta: () => void,
   *   applyRunMetaUpgrades: () => void,
   * }} options
   */
  function createProgressionSystem({
    weaponDefs,
    weaponUnlocks,
    upgradeDefs,
    questDefs,
    getSave,
    openQuest,
    persist,
    renderMeta,
    applyRunMetaUpgrades,
  }) {
    const maxTierByUpgradeId = new Map(upgradeDefs.map((upgrade) => [upgrade.id, upgrade.maxTier]));

    function hasNode(id) {
      return getSave().unlockedNodes.includes(id);
    }

    function getUpgradeTier(id) {
      const tier = getSave().upgradeTiers[id] || 0;
      const maxTier = maxTierByUpgradeId.get(id);
      return Math.min(maxTier || tier, tier);
    }

    function isQuestComplete(id) {
      return !id || getSave().completedQuests.includes(id);
    }

    function labelUnlock(id) {
      const unlock = weaponUnlocks.find((node) => node.id === id);
      return unlock ? weaponDefs[unlock.weaponId].name : id;
    }

    function isNodeVisible(node) {
      return !node.requiresNode || hasNode(node.requiresNode);
    }

    function nodeGateStatus(node) {
      const save = getSave();
      if (node.requiresNode && !hasNode(node.requiresNode)) {
        return `Requires ${labelUnlock(node.requiresNode)}`;
      }
      if (node.requiresQuest && !isQuestComplete(node.requiresQuest)) {
        return `Complete quest: ${questDefs[node.requiresQuest]?.name || node.requiresQuest}`;
      }
      if (save.questPoints < node.cost) {
        return `Needs ${node.cost} QP`;
      }
      return "";
    }

    function buyWeaponUnlock(unlock) {
      const save = getSave();
      if (hasNode(unlock.id) || nodeGateStatus(unlock)) return;
      save.questPoints -= unlock.cost;
      save.unlockedNodes.push(unlock.id);
      if (!save.unlockedWeapons.includes(unlock.weaponId)) {
        save.unlockedWeapons.push(unlock.weaponId);
      }
      if (unlock.opensQuest) openQuest(unlock.opensQuest);
      persist();
      renderMeta();
    }

    function buyUpgrade(upgrade) {
      const save = getSave();
      const tier = getUpgradeTier(upgrade.id);
      if (tier >= upgrade.maxTier) return;
      if (upgrade.requiresWeapon && !save.unlockedWeapons.includes(upgrade.requiresWeapon)) return;
      if (upgrade.requiresNode && !hasNode(upgrade.requiresNode)) return;
      if (upgrade.requiresQuest && !isQuestComplete(upgrade.requiresQuest)) return;
      const cost = upgrade.cost[tier];
      if (save.questPoints < cost) return;
      save.questPoints -= cost;
      save.upgradeTiers[upgrade.id] = tier + 1;
      if (upgrade.opensQuest && tier === 0) openQuest(upgrade.opensQuest);
      persist();
      applyRunMetaUpgrades();
      renderMeta();
    }

    return {
      hasNode,
      getUpgradeTier,
      isQuestComplete,
      isNodeVisible,
      nodeGateStatus,
      buyWeaponUnlock,
      buyUpgrade,
    };
  }

  const MODULE_NATIVE_QUEST_SLOTS = Object.freeze(["quests"]);

  const MODULE_NATIVE_QUEST_PROOF_SLOTS = Object.freeze([
    "createQuestSystem",
    "questOpenIds",
  ]);

  /**
   * @param {any} quest
   */
  function questOpenIds(quest) {
    return [quest?.opensQuest, ...(quest?.opensQuests || [])].filter(Boolean);
  }

  /**
   * @param {{
   *   getSave: () => any,
   *   onQuestComplete?: (quest: any, reward: number) => void,
   *   persist: () => void,
   *   questDefs: Record<string, any>,
   *   renderMeta: () => void,
   * }} options
   */
  function createQuestSystem({ questDefs, getSave, persist, renderMeta, onQuestComplete }) {
    function hasQuest(id) {
      const save = getSave();
      return save.activeQuests.includes(id) || save.completedQuests.includes(id);
    }

    function openQuest(id) {
      const save = getSave();
      if (!questDefs[id] || hasQuest(id)) return;
      save.activeQuests.push(id);
      save.questProgress[id] = save.questProgress[id] || 0;
      persist();
    }

    function completeQuest(id) {
      const save = getSave();
      if (!save.activeQuests.includes(id) || save.completedQuests.includes(id)) return;
      save.activeQuests = save.activeQuests.filter((questId) => questId !== id);
      save.completedQuests.push(id);
      const reward = questDefs[id].rewardQp || 0;
      save.questPoints += reward;
      save.totalQuestPoints += reward;
      questOpenIds(questDefs[id]).forEach(openQuest);
      persist();
      renderMeta();
      onQuestComplete?.(questDefs[id], reward);
    }

    function addQuestProgress(id, amount) {
      const save = getSave();
      if (!questDefs[id] || !save.activeQuests.includes(id)) return;
      save.questProgress[id] = Math.min(
        questDefs[id].target,
        (save.questProgress[id] || 0) + amount,
      );
      if (save.questProgress[id] >= questDefs[id].target) completeQuest(id);
    }

    function addQuestProgressGroup(ids, amount) {
      ids.forEach((questId) => addQuestProgress(questId, amount));
    }

    function addQuestProgressForWeapon(weaponId, amount) {
      const save = getSave();
      save.activeQuests
        .filter((questId) => questDefs[questId]?.weaponId === weaponId)
        .forEach((questId) => addQuestProgress(questId, amount));
    }

    function activeQuestWeaponIds() {
      const save = getSave();
      return save.activeQuests
        .map((questId) => questDefs[questId]?.weaponId)
        .filter(Boolean);
    }

    return {
      activeQuestWeaponIds,
      addQuestProgress,
      addQuestProgressForWeapon,
      addQuestProgressGroup,
      completeQuest,
      hasQuest,
      openQuest,
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
   * @param {any} [options]
   */
  function createShellRelicUiAdapter(options = {}) {
    const {
      presenter,
      documentRef,
      root,
      onEquip,
      onUnequip,
      onSelect,
      onLockedSelect,
      getSave,
      relicSystem,
      persist,
      renderMeta,
      scheduler = {},
      lockPopupDelayMs = 1800,
      previewAdapter = {},
    } = options;
    let lockPopup = null;
    let lockPopupHideTimer = null;
    const previewDisposers = [];

    if (!presenter || typeof presenter.createInventoryViewModel !== "function") {
      throw new Error("Missing Tap Survivor module shell relic UI dependency: presenter");
    }
    if (!documentRef || typeof documentRef.createElement !== "function") {
      throw new Error("Missing Tap Survivor module shell relic UI dependency: documentRef");
    }
    if (!root || typeof root.appendChild !== "function") {
      throw new Error("Missing Tap Survivor module shell relic UI dependency: root");
    }

    function renderShellRelics(save = {}, renderOptions = {}) {
      return renderViewModel(presenter.createInventoryViewModel(save), renderOptions);
    }

    function renderViewModel(model, renderOptions = {}) {
      const selectedRelicId = renderOptions.selectedRelicId || model.selectedRelicId || "";
      const selectedRelic = findRelic(model, selectedRelicId);
      clearRoot(root);
      root.appendChild(createCharacterPanel(model));
      root.appendChild(createSummary(model));
      root.appendChild(createSlotList(model));
      root.appendChild(createAvailableList(model, selectedRelicId));
      if (selectedRelic) root.appendChild(createDetail(model, selectedRelic));
      return model;
    }

    function createCharacterPanel(model) {
      const panel = documentRef.createElement("section");
      panel.className = "relic-character-panel";
      appendText(documentRef, panel, "strong", "Character");
      appendText(documentRef, panel, "span", `Tower level ${model.towerFloor}`);
      return panel;
    }

    function createSummary(model) {
      const summary = documentRef.createElement("section");
      summary.className = "shell-relic-summary";
      model.summaryRows.forEach((row) => {
        const item = documentRef.createElement("div");
        item.className = "shell-relic-summary-row";
        item.textContent = `${row.label}: ${row.value}`;
        summary.appendChild(item);
      });
      appendText(documentRef, summary, "div", `Can equip more: ${model.canEquipMore ? "Yes" : "No"}`, {
        className: "shell-relic-summary-row",
      });
      appendBonusRows(documentRef, summary, "Run-start bonuses", model.bonuses?.startingRunUpgradeTiers);
      appendBonusRows(documentRef, summary, "Max-tier bonuses", model.bonuses?.maxTierBonuses);
      appendModifierRows(documentRef, summary, model.specialModifiers);
      return summary;
    }

    function createSlotList(model) {
      const list = documentRef.createElement("section");
      list.className = "shell-relic-slots";
      model.slots.forEach((slot) => {
        const item = documentRef.createElement("article");
        const relic = slot.relic;
        item.className = [
          "relic-slot",
          slot.unlocked ? "unlocked" : "locked",
          relic ? "equipped" : "empty",
          relic?.rarity === "green" ? "green-relic" : "",
        ]
          .filter(Boolean)
          .join(" ");
        item.dataset.slotIndex = String(slot.index);
        if (relic) item.dataset.relicId = relic.id;
        setRelicBackground(item, relic);
        appendText(documentRef, item, "span", slot.label, { className: "relic-slot-index" });
        if (!slot.unlocked) {
          appendText(documentRef, item, "strong", "Locked");
          appendText(documentRef, item, "span", `Unlocked at tower level ${slot.unlockLevel}.`);
        } else if (!relic) {
          appendText(documentRef, item, "strong", "Empty relic slot");
          appendText(documentRef, item, "span", "Equip an unlocked relic below.");
        } else {
          item.appendChild(createRelicImage(documentRef, relic));
          appendText(documentRef, item, "strong", relic.name);
          appendText(documentRef, item, "span", relic.description);
          const button = documentRef.createElement("button");
          button.type = "button";
          button.textContent = "Unequip";
          button.dataset.action = "unequip";
          button.addEventListener("click", () => {
            const changed = commitRelicState(relic, false);
            onUnequip?.(relic, model, { changed });
          });
          item.appendChild(button);
        }
        list.appendChild(item);
      });
      return list;
    }

    function createAvailableList(model, selectedRelicId) {
      const list = documentRef.createElement("section");
      list.className = "relic-icon-grid shell-relic-available";
      if (!model.availableRelics.length) {
        appendText(documentRef, list, "div", "All relics are equipped.", { className: "relic-item locked" });
        return list;
      }
      model.availableRelics.forEach((relic) => {
        const button = documentRef.createElement("button");
        button.type = "button";
        button.className = [
          "relic-icon-button",
          "shell-relic-row",
          relic.unlocked ? "available" : "locked",
          relic.id === selectedRelicId ? "selected" : "",
          relic.rarity === "green" ? "green-relic" : "",
        ]
          .filter(Boolean)
          .join(" ");
        button.disabled = false;
        button.dataset.relicId = relic.id;
        button.dataset.unlocked = String(relic.unlocked);
        setAriaLabel(button, relic.unlocked ? `View ${relic.name}` : `${relic.name} locked`);
        setRelicBackground(button, relic);
        button.appendChild(createRelicImage(documentRef, relic));
        appendText(documentRef, button, "span", relic.name);
        if (!relic.unlocked) appendText(documentRef, button, "em", "Locked", { className: "relic-lock-badge" });
        if (relic.linkedSkill) appendText(documentRef, button, "span", `Linked skill: ${relic.linkedSkill.name}`);
        button.addEventListener("click", () => {
          if (relic.unlocked) onSelect?.(relic, model);
          else {
            showLockedMessage();
            onLockedSelect?.(relic, model);
          }
        });
        list.appendChild(button);
      });
      return list;
    }

    function createDetail(model, relic) {
      const detail = documentRef.createElement("section");
      detail.className = `relic-detail-screen ${relic.rarity === "green" ? "green-relic" : ""}`;
      detail.dataset.relicId = relic.id;
      setRelicBackground(detail, relic);
      detail.appendChild(createRelicPreview(relic));
      appendText(documentRef, detail, "span", "Selected relic", { className: "relic-slot-index" });
      appendText(documentRef, detail, "strong", relic.name);
      appendText(documentRef, detail, "p", relic.description);
      if (relic.specialAbility) {
        appendText(documentRef, detail, "p", `${relic.specialAbility.label}: ${relic.specialAbility.description}`, {
          className: "relic-special-ability",
        });
      }
      if (relic.linkedSkill) appendText(documentRef, detail, "p", `Linked skill: ${relic.linkedSkill.name}`);

      const actions = documentRef.createElement("div");
      actions.className = "relic-detail-actions";
      const equipButton = documentRef.createElement("button");
      equipButton.type = "button";
      equipButton.textContent = "Equip relic";
      equipButton.dataset.action = "equip";
      equipButton.disabled = !relic.unlocked || relic.equipped || !model.canEquipMore;
      equipButton.addEventListener("click", () => {
        if (!equipButton.disabled) {
          const changed = commitRelicState(relic, true);
          onEquip?.(relic, model, { changed });
        }
      });
      const cancelButton = documentRef.createElement("button");
      cancelButton.type = "button";
      cancelButton.textContent = "Cancel";
      cancelButton.dataset.action = "cancel";
      cancelButton.addEventListener("click", () => onSelect?.(null, model));
      actions.appendChild(equipButton);
      actions.appendChild(cancelButton);
      detail.appendChild(actions);
      return detail;
    }

    return {
      dispose,
      renderShellRelics,
      renderViewModel,
      showLockedMessage,
    };

    function commitRelicState(relic, equipped) {
      const save = getSave?.();
      const changed = Boolean(save && relicSystem?.setRelicEquipped?.(save, relic.id, equipped));
      if (!changed) return false;
      persist?.(save);
      renderShellRelics(save);
      renderMeta?.(save);
      return true;
    }

    function showLockedMessage() {
      if (!lockPopup) {
        lockPopup = documentRef.createElement("div");
        lockPopup.className = "relic-lock-popup";
        root.appendChild(lockPopup);
      }
      lockPopup.textContent = "Locked, play more to unlock this skill.";
      removeClass(lockPopup, "hidden");
      if (lockPopupHideTimer) scheduler.clearTimeout?.(lockPopupHideTimer);
      lockPopupHideTimer =
        scheduler.setTimeout?.(() => {
          if (lockPopup?.isConnected !== false) addClass(lockPopup, "hidden");
          lockPopupHideTimer = null;
        }, lockPopupDelayMs) || null;
      return lockPopup;
    }

    function dispose() {
      if (lockPopupHideTimer) scheduler.clearTimeout?.(lockPopupHideTimer);
      lockPopupHideTimer = null;
      while (previewDisposers.length) previewDisposers.pop()?.();
    }

    function createRelicPreview(relic) {
      const sprite = previewAdapter.runUpgradeSprite?.(relic.targetUpgradeId);
      const frames = Array.isArray(sprite?.frames) ? sprite.frames : [];
      const source = previewAdapter.spriteSource?.(sprite) || sprite?.src || sprite?.path || sprite?.iconSrc || "";
      if (frames.length && source && previewAdapter.createCanvas && previewAdapter.createImage) {
        const canvas =
          previewAdapter.createCanvas({
            className: "relic-detail-preview relic-detail-canvas",
            height: 112,
            relic,
            sprite,
            width: 112,
          }) || documentRef.createElement("canvas");
        canvas.className = "relic-detail-preview relic-detail-canvas";
        canvas.width = 112;
        canvas.height = 112;
        if (startAnimatedPreview({ canvas, frames, relic, source, sprite })) return canvas;
      }
      return createRelicImage(documentRef, relic, "relic-detail-preview");
    }

    function startAnimatedPreview({ canvas, frames, relic, source, sprite }) {
      const context = previewAdapter.getContext?.(canvas, { willReadFrequently: true }) || canvas.getContext?.("2d", { willReadFrequently: true });
      const image = previewAdapter.createImage?.({ relic, source, sprite });
      if (!context || !image) return false;
      let frameIndex = 0;
      let timer = null;
      let stopped = false;

      function drawFrame() {
        if (stopped || canvas.isConnected === false) return;
        const frame = frames[frameIndex % frames.length];
        frameIndex += 1;
        previewAdapter.clearFrame?.({ canvas, context, sprite });
        if (!previewAdapter.clearFrame) context.clearRect?.(0, 0, canvas.width, canvas.height);
        context.imageSmoothingEnabled = false;
        previewAdapter.drawFrame?.({ canvas, context, frame, image, sprite });
        if (!previewAdapter.drawFrame) {
          context.drawImage?.(image, frame.x, frame.y, frame.width, frame.height, 0, 0, canvas.width, canvas.height);
        }
        previewAdapter.applyTransparency?.({ canvas, context, sprite });
        timer = scheduler.setTimeout?.(drawFrame, 1000 / Math.max(1, sprite.fps || 10)) || null;
      }

      const onLoad = () => drawFrame();
      if (typeof image.addEventListener === "function") image.addEventListener("load", onLoad, { once: true });
      else previewAdapter.onImageLoad?.(image, onLoad) ?? onLoad();
      if ("src" in image) image.src = source;
      else previewAdapter.setImageSource?.(image, source);
      previewDisposers.push(() => {
        stopped = true;
        if (timer) scheduler.clearTimeout?.(timer);
        previewAdapter.disposeImage?.(image);
      });
      return true;
    }
  }

  /**
   * Classic shell relic UI compatibility adapter.
   *
   * This preserves the production API consumed by src/shell-ui.js while keeping
   * the implementation in the module tree for generated bridge output.
   *
   * @param {any} [options]
   */
  function createShellRelicUi(options = {}) {
    const {
      ui,
      content = {},
      documentRef = document,
      assetResolver,
      getSave,
      relicDefs = [],
      relicSystem,
      persist,
      renderMeta,
      scheduler = {
        clearTimeout: (timer) => clearTimeout(timer),
        setTimeout: (callback, delay) => setTimeout(callback, delay),
        animationSetTimeout: (callback, delay) => setTimeout(callback, delay),
      },
      imageFactory = () => (typeof Image === "undefined" ? null : new Image()),
    } = options;

    function renderInventory() {
      if (!ui.menuRelicSlots || !ui.menuRelicInventory || !relicSystem) return;
      const save = getSave();
      const slots = relicSystem.maxEquippedRelics(save);
      const equippedRelics = relicSystem.equippedRelics(save);
      const equipped = new Set(equippedRelics.map((relic) => relic.id));
      const unlocked = new Set(save.unlockedRelics || []);
      const nextLevel = slots >= 5 ? null : (slots + 1) * 10;
      ui.menuRelicSlots.textContent = `Relic slots: ${slots}/5 unlocked. ${
        nextLevel ? `Next slot at tower level ${nextLevel}.` : "Maximum slots unlocked."
      }`;
      ui.menuRelicInventory.innerHTML = "";
      const loadout = documentRef.createElement("div");
      loadout.className = "relic-loadout";
      loadout.appendChild(createCharacterPanel(save));

      const slotGrid = documentRef.createElement("div");
      slotGrid.className = "relic-slots";
      for (let index = 0; index < 5; index += 1) {
        slotGrid.appendChild(createRelicSlot(index, slots, equippedRelics[index]));
      }
      loadout.appendChild(slotGrid);
      ui.menuRelicInventory.appendChild(loadout);

      const inventoryRelics = relicDefs.filter((relic) => !equipped.has(relic.id));
      const list = documentRef.createElement("div");
      list.className = "relic-icon-grid";
      if (!inventoryRelics.length) {
        const empty = documentRef.createElement("div");
        empty.className = "relic-item locked";
        empty.textContent = "All relics are equipped.";
        list.appendChild(empty);
        ui.menuRelicInventory.appendChild(list);
        return;
      }
      inventoryRelics.forEach((relic) => {
        list.appendChild(createRelicIconButton(relic, unlocked.has(relic.id)));
      });
      ui.menuRelicInventory.appendChild(list);
    }

    function createRelicIconButton(relic, isUnlocked = true) {
      const button = documentRef.createElement("button");
      button.className = `relic-icon-button ${isUnlocked ? "available" : "locked"} ${
        relic.rarity === "green" ? "green-relic" : ""
      }`;
      setRelicBackground(button, relic);
      button.type = "button";
      button.setAttribute("aria-label", isUnlocked ? `View ${relic.name}` : `${relic.name} locked`);
      button.innerHTML = `
        <img class="relic-icon" src="${relicIconSrc(relic)}" alt="" />
        <span>${relic.name}</span>
        ${isUnlocked ? "" : '<em class="relic-lock-badge">Locked</em>'}
      `;
      button.addEventListener("click", () => {
        if (!isUnlocked) {
          showRelicLockedMessage();
          return;
        }
        openRelicDetail(relic);
      });
      return button;
    }

    function relicIconSrc(relic) {
      return assetResolver.relicIcon(relic);
    }

    function showRelicLockedMessage() {
      if (!ui.menuRelicInventory) return;
      let popup = ui.menuRelicInventory.querySelector?.(".relic-lock-popup");
      if (!popup) {
        popup = documentRef.createElement("div");
        popup.className = "relic-lock-popup";
        ui.menuRelicInventory.prepend?.(popup) || ui.menuRelicInventory.appendChild(popup);
      }
      popup.textContent = "Locked, play more to unlock this skill.";
      popup.classList.remove("hidden");
      scheduler.clearTimeout?.(popup.hideTimer);
      popup.hideTimer = scheduler.setTimeout?.(() => {
        if (popup.isConnected) popup.classList.add("hidden");
      }, 1800);
    }

    function openRelicDetail(relic) {
      const save = getSave();
      const slots = relicSystem.maxEquippedRelics(save);
      const equippedRelics = relicSystem.equippedRelics(save);
      const canEquip = equippedRelics.length < slots;
      const skill = (content?.runUpgrades || []).find((upgrade) => upgrade.id === relic.targetUpgradeId);
      ui.menuRelicSlots.textContent = relic.name;
      ui.menuRelicInventory.innerHTML = "";

      const detail = documentRef.createElement("div");
      detail.className = `relic-detail-screen ${relic.rarity === "green" ? "green-relic" : ""}`;
      setRelicBackground(detail, relic);
      const preview = createRelicSkillPreview(relic);
      detail.appendChild(preview);
      const copy = documentRef.createElement("div");
      copy.className = "relic-detail-copy";
      copy.innerHTML = `
        <span class="relic-slot-index">Selected relic</span>
        <strong>${relic.name}</strong>
        <p>${relic.description}</p>
        ${relic.specialAbility ? `<p><strong>${relic.specialAbility.label}</strong>: ${relic.specialAbility.description}</p>` : ""}
        ${skill ? `<p>Linked skill: ${skill.name}</p>` : ""}
      `;
      detail.appendChild(copy);

      const actions = documentRef.createElement("div");
      actions.className = "relic-detail-actions";
      const equipButton = documentRef.createElement("button");
      equipButton.type = "button";
      equipButton.textContent = "Equip relic";
      equipButton.disabled = !canEquip;
      equipButton.addEventListener("click", () => {
        if (relicSystem.setRelicEquipped(save, relic.id, true)) {
          persist?.();
          renderInventory();
          renderMeta();
        }
      });
      const cancelButton = documentRef.createElement("button");
      cancelButton.type = "button";
      cancelButton.textContent = "Cancel";
      cancelButton.addEventListener("click", renderInventory);
      actions.appendChild(equipButton);
      actions.appendChild(cancelButton);
      detail.appendChild(actions);
      ui.menuRelicInventory.appendChild(detail);
    }

    function createRelicSkillPreview(relic) {
      const sprite = assetResolver.runUpgradeSprite(relic.targetUpgradeId);
      const frames = Array.isArray(sprite?.frames) ? sprite.frames : [];
      const image = imageFactory();
      if (frames.length && image) {
        const canvas = documentRef.createElement("canvas");
        canvas.className = "relic-detail-preview relic-detail-canvas";
        canvas.width = 112;
        canvas.height = 112;
        if (animateRelicSkillPreview(canvas, sprite, image)) return canvas;
      }
      const fallbackImage = documentRef.createElement("img");
      fallbackImage.className = "relic-detail-preview";
      fallbackImage.src = relicIconSrc(relic);
      fallbackImage.alt = "";
      return fallbackImage;
    }

    function animateRelicSkillPreview(canvas, sprite, image) {
      const ctx = canvas.getContext?.("2d", { willReadFrequently: true });
      const frames = Array.isArray(sprite?.frames) ? sprite.frames : [];
      const src = assetResolver.spriteSource(sprite);
      if (!ctx || !frames.length || !src) return false;
      let frameIndex = 0;
      function drawFrame() {
        if (canvas.isConnected === false) return;
        const frame = frames[frameIndex % frames.length];
        frameIndex += 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height, 0, 0, canvas.width, canvas.height);
        applyPreviewTransparency(ctx, canvas.width, canvas.height, sprite);
        scheduler.animationSetTimeout?.(drawFrame, 1000 / Math.max(1, sprite.fps || 10));
      }
      image.addEventListener?.("load", drawFrame, { once: true });
      image.src = src;
      return true;
    }

    function applyPreviewTransparency(ctx, width, height, sprite) {
      const color = sprite?.transparentColor;
      if (!Array.isArray(color) || color.length < 3) return;
      const tolerance = Math.max(0, Number(sprite.transparentTolerance ?? 28));
      try {
        const pixels = ctx.getImageData(0, 0, width, height);
        const data = pixels.data;
        for (let index = 0; index < data.length; index += 4) {
          const delta = Math.abs(data[index] - color[0]) + Math.abs(data[index + 1] - color[1]) + Math.abs(data[index + 2] - color[2]);
          if (delta <= tolerance) data[index + 3] = 0;
        }
        ctx.putImageData(pixels, 0, 0);
      } catch {
        // If a browser blocks pixel reads, the preview still shows the untrimmed frame.
      }
    }

    function createCharacterPanel(save) {
      const panel = documentRef.createElement("div");
      panel.className = "relic-character-panel";
      const playerSprite = content?.assets?.sprites?.player || "assets/kenney/desert-shooter/player.png?v=kenney-20260610";
      panel.innerHTML = `
        <img class="relic-character-sprite" src="${playerSprite}" alt="" />
        <span>
          <strong>Character</strong>
          <span>Tower level ${Math.max(1, save.towerFloor || 1)}</span>
        </span>
      `;
      return panel;
    }

    function createRelicSlot(index, unlockedSlots, relic) {
      const slot = documentRef.createElement("div");
      const unlockLevel = (index + 1) * 10;
      const unlocked = index < unlockedSlots;
      slot.className = `relic-slot ${unlocked ? (relic ? "equipped" : "empty") : "locked"} ${relic?.rarity === "green" ? "green-relic" : ""}`;
      setRelicBackground(slot, relic);
      if (!unlocked) {
        slot.innerHTML = `
          <span class="relic-slot-index">Slot ${index + 1}</span>
          <strong>Locked</strong>
          <span>Unlocked at tower level ${unlockLevel}.</span>
        `;
        return slot;
      }
      if (!relic) {
        slot.innerHTML = `
          <span class="relic-slot-index">Slot ${index + 1}</span>
          <strong>Empty relic slot</strong>
          <span>Equip an unlocked relic below.</span>
        `;
        return slot;
      }

      slot.innerHTML = `
        <img class="relic-icon" src="${relicIconSrc(relic)}" alt="" />
        <span>
          <span class="relic-slot-index">Slot ${index + 1}</span>
          <strong>${relic.name}</strong>
          <span>${relic.description}</span>
        </span>
      `;
      const button = documentRef.createElement("button");
      button.textContent = "Unequip";
      button.addEventListener("click", () => {
        const save = getSave();
        if (relicSystem.setRelicEquipped(save, relic.id, false)) {
          persist?.();
          renderInventory();
          renderMeta();
        }
      });
      slot.appendChild(button);
      return slot;
    }

    return {
      renderInventory,
    };
  }

  function appendBonusRows(documentRef, parent, label, values = {}) {
    Object.entries(values)
      .filter(([, value]) => value)
      .sort(([left], [right]) => left.localeCompare(right))
      .forEach(([key, value]) => {
        appendText(documentRef, parent, "div", `${label}: ${key} +${value}`, { className: "shell-relic-bonus-row" });
      });
  }

  function appendModifierRows(documentRef, parent, modifiers = []) {
    modifiers.forEach((modifier) => {
      appendText(documentRef, parent, "div", `Special modifier: ${modifier.key} +${modifier.value}`, {
        className: "shell-relic-special-row",
      });
    });
  }

  function findRelic(model, relicId) {
    if (!relicId) return null;
    return [...(model.equippedRelics || []), ...(model.availableRelics || [])].find((relic) => relic.id === relicId) || null;
  }

  function createRelicImage(documentRef, relic, className = "relic-icon") {
    const image = documentRef.createElement("img");
    image.className = className;
    image.src = relic?.iconSrc || "";
    image.alt = "";
    return image;
  }

  function appendText(documentRef, parent, tagName, text, attributes = {}) {
    const item = documentRef.createElement(tagName);
    item.textContent = text;
    Object.assign(item, attributes);
    parent.appendChild(item);
    return item;
  }

  function setAriaLabel(element, label) {
    if (typeof element.setAttribute === "function") element.setAttribute("aria-label", label);
    else element.ariaLabel = label;
  }

  function setRelicBackground(element, relic) {
    if (!element?.style || !relic?.backgroundColor) return;
    if (typeof element.style.setProperty === "function") element.style.setProperty("--relic-bg", relic.backgroundColor);
    else element.style["--relic-bg"] = relic.backgroundColor;
  }

  function addClass(element, className) {
    const current = new Set(String(element.className || "").split(/\s+/).filter(Boolean));
    current.add(className);
    element.className = [...current].join(" ");
  }

  function removeClass(element, className) {
    const current = new Set(String(element.className || "").split(/\s+/).filter(Boolean));
    current.delete(className);
    element.className = [...current].join(" ");
  }

  function clearRoot(root) {
    if (typeof root.replaceChildren === "function") {
      root.replaceChildren();
      return;
    }
    root.innerHTML = "";
    if (Array.isArray(root.children)) root.children.length = 0;
  }

  /** @typedef {import("../types/content.js").GeneratedContent} GeneratedContent */
  /** @typedef {import("../types/content.js").ContentEntry} ContentEntry */
  /** @typedef {import("../types/content.js").RunUpgradeDef} RunUpgradeDef */
  /** @typedef {import("../types/content.js").WeaponDef} WeaponDef */
  /** @typedef {Record<string, WeaponDef>} WeaponDefs */
  /** @typedef {{ applyRunUpgradeEffects(game: object, effects: ContentEntry[]): void }} UpgradeEffects */
  /** @typedef {{ content?: GeneratedContent, effects?: UpgradeEffects }} CreateUpgradeContentOptions */

  /** @param {WeaponDefs} weaponDefs @param {WeaponDef} weapon @returns {string | undefined} */
  function weaponIdForDef(weaponDefs, weapon) {
    return Object.keys(weaponDefs).find((id) => weaponDefs[id] === weapon);
  }

  /** @param {CreateUpgradeContentOptions} [options] */
  function createUpgradeContent({ content = {}, effects } = {}) {
    const metaUpgradeDefs = content.metaUpgrades || [];
    /** @param {WeaponDefs} weaponDefs @returns {ContentEntry[]} */
    function createUpgradeDefs(weaponDefs) {
      return [
        ...Object.values(weaponDefs).map((weapon) => {
          const weaponId = weaponIdForDef(weaponDefs, weapon);
          return {
            id: weapon.upgradeId,
            name: `${weapon.name} Damage`,
            description: `Increase ${weapon.name} damage.`,
            cost: [1, 2, 3, 4, 5],
            maxTier: 5,
            requiresWeapon: weaponId,
            requiresQuest: weapon.upgradeId === "laser_damage" ? "use_laser_run" : `${weaponId}_mastery`,
            opensQuest: weapon.upgradeId === "laser_damage" ? "laser_damage_5000" : null,
          };
        }),
        ...metaUpgradeDefs,
      ];
    }

    /** @type {RunUpgradeDef[]} */
    const runUpgradeDefs = (content.runUpgrades || []).map((upgrade) => ({
      ...upgrade,
      apply: upgrade.effects?.length ? (game) => effects.applyRunUpgradeEffects(game, upgrade.effects) : undefined,
    }));

    return {
      createUpgradeDefs,
      runUpgradeDefs,
    };
  }

  const MODULE_NATIVE_UI_SLOTS = Object.freeze([
    "canvas",
    "choices",
    "closeEnd",
    "closeEndX",
    "closeLevelUp",
    "closeMenu",
    "closeShop",
    "closeShopBottom",
    "debugPanel",
    "debugStats",
    "endScreen",
    "exitRun",
    "fullscreenButton",
    "levelUp",
    "menuInventoryPanel",
    "menuInventoryTab",
    "menuProgressPanel",
    "menuProgressTab",
    "menuQpHud",
    "menuQuests",
    "menuRelicInventory",
    "menuRelicSlots",
    "menuShopCoinHud",
    "menuShopItems",
    "menuShopNotice",
    "menuShopPanel",
    "menuShopTab",
    "menuTree",
    "muteAudio",
    "openMenu",
    "questBanner",
    "relicChoice",
    "relicChoices",
    "relicChoiceText",
    "relicChoiceTitle",
    "runHud",
    "runMenu",
    "runStats",
    "shopCoinHud",
    "shopItems",
    "shopModal",
    "shopNotice",
    "speedButtons",
    "startTransition",
    "titleScreen",
    "titleStartGame",
    "toggleDebug",
  ]);

  const MODULE_NATIVE_UI_RENDERER_PROOF_SLOTS = Object.freeze([
    "createUi",
    "createUiRenderer",
  ]);

  /**
   * @typedef {object} UiRendererOptions
   * @property {*} [ui]
   * @property {*} [uiProgression]
   * @property {Document} [documentRef]
   * @property {*} [weaponDefs]
   * @property {*} [weaponUnlocks]
   * @property {*} [upgradeDefs]
   * @property {*} [questDefs]
   * @property {() => *} [getSave]
   * @property {(upgradeId: string) => number} [getUpgradeTier]
   * @property {(nodeId: string) => boolean} [hasNode]
   * @property {(unlock: *) => boolean} [isNodeVisible]
   * @property {(questId: string) => boolean} [isQuestComplete]
   * @property {(unlock: *) => string | null | undefined} [nodeGateStatus]
   * @property {(unlock: *) => *} [buyWeaponUnlock]
   * @property {(upgrade: *) => *} [buyUpgrade]
   */

  function createUi(options = {}) {
    const documentRef = options.documentRef;
    const canvas = options.canvas || documentRef?.getElementById?.("game") || null;
    const get = (id) => documentRef?.getElementById?.(id) || null;

    return {
      canvas,
      choices: get("choices"),
      closeEnd: get("closeEnd"),
      closeEndX: get("closeEndX"),
      closeLevelUp: get("closeLevelUp"),
      closeMenu: get("closeMenu"),
      closeShop: get("closeShop"),
      closeShopBottom: get("closeShopBottom"),
      debugPanel: get("debugPanel"),
      debugStats: get("debugStats"),
      endScreen: get("endScreen"),
      exitRun: get("exitRun"),
      fullscreenButton: get("fullscreenButton"),
      levelUp: get("levelUp"),
      menuInventoryPanel: get("menuInventoryPanel"),
      menuInventoryTab: get("menuInventoryTab"),
      menuProgressPanel: get("menuProgressPanel"),
      menuProgressTab: get("menuProgressTab"),
      menuQpHud: get("menuQpHud"),
      menuQuests: get("menuQuests"),
      menuRelicInventory: get("menuRelicInventory"),
      menuRelicSlots: get("menuRelicSlots"),
      menuShopCoinHud: get("menuShopCoinHud"),
      menuShopItems: get("menuShopItems"),
      menuShopNotice: get("menuShopNotice"),
      menuShopPanel: get("menuShopPanel"),
      menuShopTab: get("menuShopTab"),
      menuTree: get("menuTree"),
      muteAudio: get("muteAudio"),
      openMenu: get("openMenu"),
      questBanner: get("questBanner"),
      relicChoice: get("relicChoice"),
      relicChoices: get("relicChoices"),
      relicChoiceText: get("relicChoiceText"),
      relicChoiceTitle: get("relicChoiceTitle"),
      runHud: get("runHud"),
      runMenu: get("runMenu"),
      runStats: get("runStats"),
      shopCoinHud: get("shopCoinHud"),
      shopItems: get("shopItems"),
      shopModal: get("shopModal"),
      shopNotice: get("shopNotice"),
      speedButtons: [...(documentRef?.querySelectorAll?.("[data-speed]") || [])],
      startTransition: get("startTransition"),
      titleScreen: get("titleScreen"),
      titleStartGame: get("titleStartGame"),
      toggleDebug: get("toggleDebug"),
    };
  }

  /**
   * @param {UiRendererOptions} [options]
   */
  function createUiRenderer({
    ui,
    uiProgression,
    documentRef,
    weaponDefs,
    weaponUnlocks,
    upgradeDefs,
    questDefs,
    getSave,
    getUpgradeTier,
    hasNode,
    isNodeVisible,
    isQuestComplete,
    nodeGateStatus,
    buyWeaponUnlock,
    buyUpgrade,
  } = {}) {
    if (!ui || typeof ui !== "object") {
      throw new Error("Missing Tap Survivor module UI dependency: ui");
    }
    if (!uiProgression || typeof uiProgression.createUiProgressionRenderer !== "function") {
      throw new Error("Missing Tap Survivor module UI dependency: uiProgression");
    }

    return uiProgression.createUiProgressionRenderer({
      ui,
      weaponDefs,
      weaponUnlocks,
      upgradeDefs,
      questDefs,
      getSave,
      documentRef,
      getUpgradeTier,
      hasNode,
      isNodeVisible,
      isQuestComplete,
      nodeGateStatus,
      buyWeaponUnlock,
      buyUpgrade,
    });
  }

  const MODULE_NATIVE_UI_PROGRESSION_RENDERER_PROOF_SLOTS = Object.freeze([
    "renderMeta",
    "renderTree",
    "renderQuests",
  ]);

  /**
   * @typedef {object} UiProgressionRendererOptions
   * @property {*} [ui]
   * @property {*} [assets]
   * @property {*} [weaponDefs]
   * @property {*} [weaponUnlocks]
   * @property {*} [upgradeDefs]
   * @property {*} [questDefs]
   * @property {() => *} [getSave]
   * @property {(upgradeId: string) => number} [getUpgradeTier]
   * @property {(nodeId: string) => boolean} [hasNode]
   * @property {(unlock: *) => boolean} [isNodeVisible]
   * @property {(questId: string) => boolean} [isQuestComplete]
   * @property {(unlock: *) => string | null | undefined} [nodeGateStatus]
   * @property {(unlock: *) => *} [buyWeaponUnlock]
   * @property {(upgrade: *) => *} [buyUpgrade]
   * @property {Document} [documentRef]
   */

  /**
   * @param {UiProgressionRendererOptions} [options]
   */
  function createUiProgressionRenderer({
    ui,
    assets,
    weaponDefs,
    weaponUnlocks,
    upgradeDefs,
    questDefs,
    getSave,
    getUpgradeTier,
    hasNode,
    isNodeVisible,
    isQuestComplete,
    nodeGateStatus,
    buyWeaponUnlock,
    buyUpgrade,
    documentRef,
  } = {}) {
    const resolvedUi = requireObject(ui, "ui");
    const assetResolver = assets?.createAssetResolver?.();

    function renderMeta() {
      const save = getSave();
      const qpText = `Coins: ${save.coins} | Quest Points: ${save.questPoints} available, ${save.totalQuestPoints} earned.`;
      if (resolvedUi.menuQpHud) resolvedUi.menuQpHud.textContent = qpText;

      if (resolvedUi.menuTree) renderTree(resolvedUi.menuTree);
      if (resolvedUi.menuQuests) renderQuests(resolvedUi.menuQuests);
    }

    function renderTree(container) {
      if (!container) return;
      const doc = requireDocument(documentRef);
      const save = getSave();
      container.innerHTML = "";
      const availableWeaponUnlocks = weaponUnlocks.filter(
        (unlock) => !hasNode(unlock.id) && isNodeVisible(unlock)
      );
      const availableUpgrades = upgradeDefs.filter((upgrade) => {
        if (!Array.isArray(upgrade.cost) || !Number.isFinite(upgrade.maxTier)) return false;
        const tier = getUpgradeTier(upgrade.id);
        if (tier >= upgrade.maxTier) return false;
        if (upgrade.requiresWeapon && !save.unlockedWeapons.includes(upgrade.requiresWeapon)) return false;
        if (upgrade.requiresNode && !hasNode(upgrade.requiresNode)) return false;
        return !upgrade.requiresQuest || isQuestComplete(upgrade.requiresQuest);
      });

      if (!availableWeaponUnlocks.length && !availableUpgrades.length) {
        const empty = doc.createElement("div");
        empty.className = "node";
        empty.textContent = "No available skill nodes. Complete active quests to reveal the next branch.";
        container.appendChild(empty);
        return;
      }

      availableWeaponUnlocks.forEach((unlock) => {
        const weapon = weaponDefs[unlock.weaponId];
        const gateStatus = nodeGateStatus(unlock);
        const el = doc.createElement("div");
        el.className = `node ${gateStatus ? "locked" : "available"}`;
        el.innerHTML = `
          <strong>Unlock ${weapon.name}</strong>
          <span>${weapon.description}</span><br />
          <span>Branch: ${unlock.branch} | Cost: ${unlock.cost} QP</span><br />
          <span>${gateStatus || "Ready to unlock"}</span>
        `;
        const iconSource = assetResolver?.weaponIcon?.(unlock.weaponId);
        if (iconSource) {
          const icon = doc.createElement("img");
          icon.className = "level-choice-icon";
          icon.src = iconSource;
          icon.alt = `${weapon.name} skill icon`;
          el.prepend?.(icon);
        }
        const button = doc.createElement("button");
        button.textContent = gateStatus ? "Locked" : "Unlock";
        button.disabled = Boolean(gateStatus);
        button.addEventListener("click", () => buyWeaponUnlock(unlock));
        el.appendChild(button);
        container.appendChild(el);
      });

      availableUpgrades.forEach((upgrade) => {
        const save = getSave();
        const tier = getUpgradeTier(upgrade.id);
        const nextCost = upgrade.cost[tier];
        const canBuy = save.questPoints >= nextCost;
        const el = doc.createElement("div");
        el.className = `node ${canBuy ? "available" : "locked"}`;
        el.innerHTML = `
          <strong>${upgrade.name}</strong>
          <span>${upgrade.description}</span><br />
          <span>Tier: ${tier}/${upgrade.maxTier}</span><br />
          <span>${canBuy ? `Next cost: ${nextCost} QP` : `Needs ${nextCost} QP`}</span>
        `;
        const button = doc.createElement("button");
        button.textContent = `Buy Tier ${tier + 1}`;
        button.disabled = !canBuy;
        button.addEventListener("click", () => buyUpgrade(upgrade));
        el.appendChild(button);
        container.appendChild(el);
      });
    }

    function renderQuests(container) {
      if (!container) return;
      const doc = requireDocument(documentRef);
      const save = getSave();
      container.innerHTML = "";
      const activeQuestIds = Object.keys(questDefs).filter((id) => save.activeQuests.includes(id));
      if (!activeQuestIds.length) {
        const empty = doc.createElement("div");
        empty.className = "quest";
        empty.textContent = "No active quests. Unlock the next available skill node to reveal one.";
        container.appendChild(empty);
        return;
      }

      activeQuestIds.forEach((id) => {
        const quest = questDefs[id];
        const progress = save.questProgress[id] || 0;
        const el = doc.createElement("div");
        el.className = "quest active";
        el.innerHTML = `
          <strong>${quest.name}</strong>
          <span>${quest.description}</span><br />
          <span>Status: Active</span><br />
          <span>Progress: ${Math.floor(progress)} / ${quest.target}</span><br />
          <span>Reward: ${quest.rewardQp} QP</span>
        `;
        container.appendChild(el);
      });
    }

    return {
      renderMeta,
      renderQuests,
      renderTree,
    };
  }

  function requireObject(value, name) {
    if (!value || typeof value !== "object") {
      throw new Error(`Missing Tap Survivor module UI progression dependency: ${name}`);
    }
    return value;
  }

  function requireDocument(documentRef) {
    if (!documentRef || typeof documentRef.createElement !== "function") {
      throw new Error("Missing Tap Survivor module UI progression dependency: documentRef");
    }
    return documentRef;
  }

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

  const MODULE_NATIVE_WEAPON_FIRE_SLOTS = Object.freeze(["weaponFire"]);

  const MODULE_NATIVE_WEAPON_FIRE_PROOF_SLOTS = Object.freeze(["createWeaponFireSystem"]);

  /**
   * @param {any} [options]
   */
  function createWeaponFireSystem({
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
    damageEnemy,
    reapEnemies,
    distance,
    clamp,
    weaponBehaviors,
    weaponCooldowns,
    weaponProjectiles,
    weaponTargeting,
  } = {}) {
    const nearestEnemy = () => weaponTargeting.nearestEnemy(getGame(), distance);
    const scaling = weaponCooldowns.createWeaponScaling({
      content,
      weaponDefs,
      getUpgradeTier,
      getRunUpgradeTier,
      getShopBonuses,
      getRelicSpecialEffects,
      getWeaponDamageMultiplier,
      clamp,
    });
    const projectileSystem = weaponProjectiles.createWeaponProjectileSystem({
      canvas,
      weaponDefs,
      getGame,
      getRunUpgradeTier,
      getRelicSpecialEffects,
      nearestEnemy,
      projectileRadius: scaling.projectileRadius,
      weaponDamage: scaling.weaponDamage,
      projectileSkillModifier: scaling.projectileSkillModifier,
      damageEnemy,
      reapEnemies,
      distance,
      clamp,
    });
    const behaviorSystem = weaponBehaviors.createWeaponBehaviorSystem({
      weaponDefs,
      getGame,
      nearestEnemy,
      weaponDamage: scaling.weaponDamage,
      weaponReach: scaling.weaponReach,
      weaponWidth: scaling.weaponWidth,
      damageEnemy,
      reapEnemies,
      addQuestProgress,
      distance,
    });

    const weaponKindHandlers = {
      radial: behaviorSystem.fireRadial,
      beam: behaviorSystem.fireBeam,
      cone: behaviorSystem.fireCone,
      chain: behaviorSystem.fireChain,
      projectile: projectileSystem.fireProjectile,
      target_area: behaviorSystem.fireTargetArea,
      lingering_area: behaviorSystem.fireLingeringArea,
      mine: behaviorSystem.fireMine,
    };

    function updateWeapons(dt) {
      const game = getGame();
      game.player.equippedWeapons.forEach((weaponId) => {
        const weapon = weaponDefs[weaponId];
        game.weaponTimers[weaponId] = (game.weaponTimers[weaponId] || 0) - dt;
        if (game.weaponTimers[weaponId] <= 0) {
          game.weaponTimers[weaponId] = scaling.weaponCooldown(weapon);
          fireWeapon(weaponId);
        }
      });
    }

    function fireWeapon(weaponId) {
      const weapon = weaponDefs[weaponId];
      if (!weapon) return;
      setPlayerAttackAnimation(weapon);
      playWeaponSfx?.(weaponId, weaponSfxOptions(weapon));
      flashWeaponIcon(weaponId);
      addWeaponBurst(weaponId, weapon);
      weaponKindHandlers[weapon.kind]?.(weaponId);
    }

    function weaponSfxOptions(weapon) {
      return scaling.weaponSfxOptions(weapon);
    }

    function flashWeaponIcon(weaponId) {
      const game = getGame();
      game.weaponIconFlashes ||= {};
      game.weaponIconFlashes[weaponId] = 1;
    }

    function setPlayerAttackAnimation(weapon) {
      const player = getGame()?.player;
      if (!player) return;
      player.actionSprite = playerAttackSprite(weapon.kind);
      player.actionTimer = 0.22;
    }

    function playerAttackSprite(kind) {
      if (kind === "beam" || kind === "cone" || kind === "chain") return "cast_beam";
      if (
        kind === "radial" ||
        kind === "target_area" ||
        kind === "lingering_area" ||
        kind === "mine"
      )
        return "sweep";
      return "cast_orb";
    }

    function addWeaponBurst(weaponId, weapon) {
      const game = getGame();
      const p = game.player;
      game.weaponBursts.push({
        weaponId,
        x: p.x,
        y: p.y,
        radius: Math.max(20, weapon.radius || weapon.width || 26),
        color: weapon.color,
        life: 0.32,
        maxLife: 0.32,
      });
    }

    return {
      updateWeapons,
      updateBolts: projectileSystem.updateBolts,
      updateAreas: behaviorSystem.updateAreas,
      updateBeams: behaviorSystem.updateBeams,
      updateWeaponBursts: behaviorSystem.updateWeaponBursts,
    };
  }

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

  function createRunUpdater({
    canvas,
    getGame,
    combat,
    pickupSystem,
    addQuestProgressGroup,
    survivalQuestIds,
    xpQuestIds,
    levelQuestIds,
    showLevelUp,
    endRun,
    getRelicSpecialEffects,
    mapSystem,
    clamp,
  }) {
    function movePlayer(player, dt) {
      const dx = player.targetX - player.x;
      const dy = player.targetY - player.y;
      const dist = Math.hypot(dx, dy);
      player.moving = dist > 3;
      if (dist > 3) {
        player.facingX = dx / dist;
        player.facingY = dy / dist;
        const step = Math.min(dist, player.speed * dt);
        player.x += player.facingX * step;
        player.y += player.facingY * step;
      }
      player.x = clamp(player.x, 18, canvas.width - 18);
      player.y = clamp(player.y, 18, canvas.height - 18);
    }

    function update(dt) {
      const game = getGame();
      if (!game || !game.running || game.paused) return;
      const player = game.player;
      if (game.awaitingFirstMoveInput) return;
      game.elapsed += dt;
      mapSystem?.applyToGame?.(game);
      addQuestProgressGroup(survivalQuestIds, dt);
      if (game.elapsed >= game.duration) {
        combat.spawnBoss();
      }

      movePlayer(player, dt);
      combat.spawnEnemies(dt);
      combat.updateEnemies(dt);
      combat.updateEnemyBolts(dt);
      combat.updateBossSpecials(dt);
      combat.updateWeapons(dt);
      combat.updateBolts(dt);
      combat.updateAreas(dt);
      combat.updateBeams(dt);
      combat.updateWeaponBursts(dt);
      updateRelicTimers(player, dt);
      updatePlayerAnimation(player, dt);
      pickupSystem.updateXpDrops(dt);
      pickupSystem.updateLootDrops(dt);
      pickupSystem.updatePickupTexts(dt);

      if (player.hp <= 0) endRun("Player defeated");
    }

    function updatePlayerAnimation(player, dt) {
      if (!player.actionTimer) return;
      player.actionTimer = Math.max(0, player.actionTimer - dt);
      if (player.actionTimer <= 0) player.actionSprite = "";
    }

    function updateRelicTimers(player, dt) {
      player.invincibleTimer = Math.max(0, (player.invincibleTimer || 0) - dt);
      player.blinkTimer = Math.max(0, (player.blinkTimer || 0) - dt);
      player.teleportCooldown = Math.max(0, (player.teleportCooldown || 0) - dt);
    }

    function collectXp(value) {
      const game = getGame();
      if (!game?.player) return;
      const player = game.player;
      const xpValue = Math.ceil(value * (1 + ((getRelicSpecialEffects?.() || {}).xpMultiplier || 0)));
      player.xp += xpValue;
      game.xpCollected += xpValue;
      addQuestProgressGroup(xpQuestIds, value);
      if (player.xp >= player.xpToLevel) {
        player.xp -= player.xpToLevel;
        player.level += 1;
        player.xpToLevel += 4;
        game.levelUps += 1;
        addQuestProgressGroup(levelQuestIds, 1);
        showLevelUp();
      }
    }

    return {
      update,
      collectXp,
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
    const effects = createEffects();
    const upgrades = { createUpgradeContent };
    const save = { createSaveSystem };
    const storage = requireGlobal(globalRef, "TapSurvivorStorage");
    if (typeof storage.configureDefaultProviders === "function") {
      storage.configureDefaultProviders({
        platformCapabilities: createStoragePlatformCapabilities(globalRef),
      });
    }
    const audio = requireGlobal(globalRef, "TapSurvivorAudio");
    if (typeof audio.configureDefaultProviders === "function") {
      audio.configureDefaultProviders({
        audioContextFactory: createAudioContextFactory(globalRef),
      });
    }
    const shellRelicUi = createShellRelicUiDependency(globalRef);

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
      effects,
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
      progression: { createProgressionSystem },
      quests: { createQuestSystem, questOpenIds },
      relics: { createRelicSystem },
      renderEnemies: requireGlobal(globalRef, "TapSurvivorRenderEnemies"),
      renderHud: requireGlobal(globalRef, "TapSurvivorRenderHud"),
      renderSkillRail: requireGlobal(globalRef, "TapSurvivorRenderSkillRail"),
      rendering: requireGlobal(globalRef, "TapSurvivorRendering"),
      runLifecycle: { createRunLifecycle },
      runState: { createRunStateSystem },
      runUi: { createRunUi },
      runUpdate: { createRunUpdater },
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
      ui: {
        createUi: (options = {}) =>
          createUi({
            ...options,
            documentRef: options.documentRef || documentRef,
          }),
        createUiRenderer: (options = {}) =>
          createUiRenderer({
            ...options,
            documentRef: options.documentRef || documentRef,
          }),
      },
      uiProgression: {
        createUiProgressionRenderer: (options = {}) =>
          createUiProgressionRenderer({
            ...options,
            documentRef: options.documentRef || documentRef,
          }),
      },
      upgrades,
      weaponBehaviors: { createWeaponBehaviorSystem },
      weaponCooldowns: { createWeaponScaling },
      weaponFire: { createWeaponFireSystem },
      weaponProjectiles: { createWeaponProjectileSystem, rotateVector },
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

  function createStoragePlatformCapabilities(globalRef) {
    return {
      getLocalStorage: () => globalRef?.localStorage || null,
      getPreferences: () => globalRef?.Capacitor?.Plugins?.Preferences || null,
    };
  }

  function createShellRelicSchedulerProvider(globalRef) {
    return {
      clearTimeout: (timer) => globalRef?.clearTimeout?.(timer),
      setTimeout: (callback, delay) => globalRef?.setTimeout?.(callback, delay),
      animationSetTimeout: (callback, delay) => globalRef?.setTimeout?.(callback, delay),
    };
  }

  function createShellRelicUiDependency(globalRef) {
    const scheduler = createShellRelicSchedulerProvider(globalRef);
    const imageFactory = () => {
      const ImageRef = globalRef?.Image;
      return typeof ImageRef === "function" ? new ImageRef() : null;
    };
    return {
      createShellRelicUi(options = {}) {
        return createShellRelicUi({
          ...options,
          scheduler: options.scheduler || scheduler,
          imageFactory: options.imageFactory || imageFactory,
        });
      },
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
