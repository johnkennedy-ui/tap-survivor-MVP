(() => {
function createEnemySystem({
  canvas,
  enemyTypes,
  bossConfig = {},
  bossAbilities = {},
  levelDefs = [],
  getGame,
  distance,
  clamp,
  damagePlayer,
  onBossSpawn,
}) {
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
  const boltConfig = bossConfig.enemyBolt || {};
  const projectileScaling = bossConfig.projectileScaling || {};
  const fallbackAbility = bossKinds[0] || "warden";
  const floorDifficulty = globalThis.TapSurvivorBalance.floorDifficulty;
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
      (1.1 - game.elapsed / 150) / (floorDifficulty(game.towerFloor).spawnRate * levelSpawnRate),
    );
    spawnPatternPositions(spawnCount).forEach((position, index) => {
      const type = chooseEnemyType(index, levelEnemyTypes(level));
      spawnEnemy(type, position);
    });
  }

  function activeLevelDef() {
    const game = getGame();
    return orderedLevelDefs.reduce(
      (active, level) => (game.elapsed >= level.startsAt ? level : active),
      null,
    );
  }

  function levelEnemyTypes(level) {
    if (!level?.enemyIds?.length) return availableEnemyTypes();
    const game = getGame();
    const configured = level.enemyIds.map((id) => enemyTypeById[id]).filter((type) => type && isEnemyAvailable(type, game));
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
    return available[(Math.floor(Math.random() * available.length) + offset) % available.length];
  }

  function spawnPatternPositions(count) {
    const game = getGame();
    const p = game.player;
    const baseAngle = Math.random() * Math.PI * 2;
    const pattern = Math.floor(Math.random() * 4);
    return Array.from({ length: count }, (_, index) => {
      const mirrored = index % 2 === 0 ? 0 : Math.PI;
      const angleOffsets = [mirrored, index * 0.85, (index - 0.5) * 0.55, index * 1.7];
      const radiusOffsets = [0, index * 42, index % 2 === 0 ? -45 : 70, index * 95];
      const angle = baseAngle + angleOffsets[pattern];
      const radius = 220 + Math.random() * 110 + radiusOffsets[pattern];
      return {
        x: clamp(p.x + Math.cos(angle) * radius, 18, canvas.width - 18),
        y: clamp(p.y + Math.sin(angle) * radius, 18, canvas.height - 18),
      };
    });
  }

  function spawnEnemy(type, position) {
    const game = getGame();
    const difficulty = floorDifficulty(game.towerFloor);
    const cooldown = scaledProjectileCooldown(type.projectileCooldown || 0, game);
    const speed = scaledProjectileSpeed(type.projectileSpeed || 0, game);
    game.enemies.push({
      type: type.id,
      name: type.name,
      color: type.color,
      assetId: type.assetId || type.id,
      x: position.x,
      y: position.y,
      radius: type.radius,
      hp: (type.hp + game.elapsed * type.hpScale) * difficulty.hp,
      speed: type.speed + game.elapsed * type.speedScale,
      damage: type.damage * difficulty.damage,
      touchCooldown: type.touchCooldown,
      xp: type.xp,
      touchTimer: 0,
      attackRange: type.attackRange || 0,
      projectileCooldown: cooldown,
      projectileSpeed: speed,
      projectileDamage: (type.projectileDamage || type.damage) * difficulty.damage,
      shootTimer: Math.random() * cooldown,
    });
  }

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
    game.bossSpawnNotice = { text: superBoss ? "SUPER BOSS INCOMING" : "BOSS INCOMING", life: bossNoticeLife, maxLife: bossNoticeLife };
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
      shootTimer: turretBoss ? bossAbilities.turret.initialShootTimer / projectileFireRateScale(game) : 0,
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
    updateBossAttacks(dt);
    const boss = game.enemies.find((enemy) => enemy.boss);
    if (!boss || boss.dropTimer > 0) return;
    game.bossAttackTimer -= dt;
    if (game.bossAttackTimer <= 0) {
      const chargerBoss = hasBossAbility(boss, "charger");
      const wardenBoss = hasBossAbility(boss, "warden");
      if (chargerBoss) {
        startBossCharge(boss);
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
    boss.chargeSpeed = boss.superBoss ? bossAbilities.charger.superChargeSpeed : bossAbilities.charger.chargeSpeed;
  }

  function updateBossAttacks(dt) {
    const game = getGame();
    const p = game.player;
    game.bossAttacks.forEach((attack) => {
      attack.age += dt;
      if (!attack.hit && attack.age >= attack.windup) {
        attack.hit = true;
        if (attack.type === "boss_slash" ? playerInSlash(p, attack) : distance(p, attack) <= p.radius + attack.radius) {
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

  function updateEnemies(dt) {
    const game = getGame();
    const p = game.player;
    game.enemies.forEach((enemy) => {
      if (enemy.boss && enemy.dropTimer > 0) {
        enemy.dropTimer = Math.max(0, enemy.dropTimer - dt);
        const progress = 1 - enemy.dropTimer / enemy.dropWindup;
        enemy.x = enemy.startX + (enemy.landingX - enemy.startX) * progress;
        enemy.y = enemy.startY + (enemy.landingY - enemy.startY) * progress;
        return;
      }
      const dx = p.x - enemy.x;
      const dy = p.y - enemy.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      if (hasBossAbility(enemy, "charger") && updateBossCharge(enemy, dt)) {
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
    boss.x = clamp(boss.x + boss.chargeDirX * boss.chargeSpeed * dt, boss.radius, canvas.width - boss.radius);
    boss.y = clamp(boss.y + boss.chargeDirY * boss.chargeSpeed * dt, boss.radius, canvas.height - boss.radius);
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
    game.enemyBolts.push({
      x: enemy.x,
      y: enemy.y,
      vx: dirX * enemy.projectileSpeed,
      vy: dirY * enemy.projectileSpeed,
      radius: boltConfig.radius || 5,
      damage: enemy.projectileDamage,
      life: boltConfig.life || 2.2,
      maxLife: boltConfig.life || 2.2,
      color: enemy.color,
    });
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
        bolt.y < canvas.height + 24,
    );
  }

  return {
    spawnEnemies,
    spawnBoss,
    updateBossSpecials,
    updateEnemies,
    updateEnemyBolts,
  };
}

globalThis.TapSurvivorEnemies = {
  createEnemySystem,
};
})();
