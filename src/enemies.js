(() => {
function createEnemySystem({
  canvas,
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
  const spawnEntryMargin = bossConfig.spawnEntryMargin || 72;
  const boltConfig = bossConfig.enemyBolt || {};
  const projectileScaling = bossConfig.projectileScaling || {};
  const fallbackAbility = bossKinds[0] || "warden";
  const floorDifficulty = globalThis.TapSurvivorBalance.floorDifficulty;
  const behaviorSystem = globalThis.TapSurvivorEnemyBehaviors.createEnemyBehaviorSystem({
    canvas,
    bossAbilities,
    boltConfig,
    getGame,
    distance,
    clamp,
    damagePlayer,
  });
  const spawnSystem = globalThis.TapSurvivorEnemySpawning.createEnemySpawnSystem({
    canvas,
    enemyTypes,
    levelDefs,
    getActiveFloorDef,
    getGame,
    floorDifficulty,
    spawnEntryMargin,
    scaledProjectileCooldown,
    scaledProjectileSpeed,
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
    spawnEnemies: spawnSystem.spawnEnemies,
    spawnBoss,
    updateBossSpecials,
    updateEnemies: behaviorSystem.updateEnemies,
    updateEnemyBolts: behaviorSystem.updateEnemyBolts,
  };
}

globalThis.TapSurvivorEnemies = {
  createEnemySystem,
};
})();
