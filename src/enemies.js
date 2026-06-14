(() => {
function createEnemySystem({
  canvas,
  enemyTypes,
  levelDefs = [],
  getGame,
  distance,
  clamp,
}) {
  const bossKinds = ["warden", "charger", "turret"];
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
      projectileCooldown: type.projectileCooldown || 0,
      projectileSpeed: type.projectileSpeed || 0,
      projectileDamage: (type.projectileDamage || type.damage) * difficulty.damage,
      shootTimer: Math.random() * (type.projectileCooldown || 0),
    });
  }

  function spawnBoss() {
    const game = getGame();
    if (game.bossSpawned) return;
    game.bossSpawned = true;
    const difficulty = floorDifficulty(game.towerFloor);
    const superBoss = game.towerFloor % 5 === 0;
    const bossKind = bossKinds[Math.floor(Math.random() * bossKinds.length)];
    const bossHp = (1400 + game.kills * 6) * difficulty.hp;
    const landingX = 72 + Math.random() * (canvas.width - 144);
    const landingY = 90 + Math.random() * (canvas.height - 180);
    const sideEntry = landingX < 150 || landingX > canvas.width - 150;
    const startX = sideEntry ? (landingX < canvas.width / 2 ? -52 : canvas.width + 52) : landingX;
    const startY = sideEntry ? landingY : -72;
    if (!sideEntry) {
      game.bossAttacks.push({
        type: "boss_drop",
        x: landingX,
        y: landingY,
        radius: superBoss ? 138 : 118,
        damage: (superBoss ? 34 : 26) * difficulty.damage,
        age: 0,
        windup: 1.15,
        hit: false,
      });
    }
    game.bossSpawnNotice = { text: superBoss ? "SUPER BOSS INCOMING" : "BOSS INCOMING", life: 2.1, maxLife: 2.1 };
    game.enemies.push({
      boss: true,
      superBoss,
      bossKind,
      assetId: "boss",
      color: bossKind === "turret" ? "#b794ff" : bossKind === "charger" ? "#ff5f56" : "#ff4f8b",
      x: startX,
      y: startY,
      startX,
      startY,
      landingX,
      landingY,
      dropTimer: sideEntry ? 0 : 1.15,
      dropWindup: 1.15,
      radius: 38,
      hp: superBoss ? bossHp * 1.35 : bossHp,
      maxHp: superBoss ? bossHp * 1.35 : bossHp,
      speed: bossKind === "charger" ? 68 : bossKind === "turret" ? 0 : 42,
      damage: 22 * difficulty.damage,
      touchCooldown: 0.8,
      touchTimer: 0,
      attackRange: bossKind === "turret" ? 999 : 0,
      projectileCooldown: bossKind === "turret" ? 1.05 : 0,
      projectileSpeed: bossKind === "turret" ? 280 : 0,
      projectileDamage: (superBoss ? 20 : 15) * difficulty.damage,
      shootTimer: bossKind === "turret" ? 0.8 : 0,
    });
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
      if (boss.bossKind === "charger") {
        game.bossAttackTimer = 3.8;
        startBossCharge(boss);
      } else if (boss.bossKind === "warden") {
        game.bossAttackTimer = 4.6;
        game.bossAttacks.push({
          type: "shockwave",
          x: boss.x,
          y: boss.y,
          radius: 165,
          damage: 26,
          age: 0,
          windup: 0.9,
          hit: false,
        });
      } else {
        game.bossAttackTimer = 3.2;
      }
    }

  }

  function startBossCharge(boss) {
    const game = getGame();
    const p = game.player;
    const dx = p.x - boss.x;
    const dy = p.y - boss.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    boss.chargeState = "windup";
    boss.chargeTimer = 0.78;
    boss.chargeDirX = dx / dist;
    boss.chargeDirY = dy / dist;
    boss.chargeSpeed = boss.superBoss ? 620 : 520;
  }

  function updateBossAttacks(dt) {
    const game = getGame();
    const p = game.player;
    game.bossAttacks.forEach((attack) => {
      attack.age += dt;
      if (!attack.hit && attack.age >= attack.windup) {
        attack.hit = true;
        if (attack.type === "boss_slash" ? playerInSlash(p, attack) : distance(p, attack) <= p.radius + attack.radius) {
          p.hp -= attack.damage;
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
      if (enemy.bossKind === "charger" && updateBossCharge(enemy, dt)) {
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
        boss.chargeTimer = 0.56;
      }
      return true;
    }
    boss.x = clamp(boss.x + boss.chargeDirX * boss.chargeSpeed * dt, boss.radius, canvas.width - boss.radius);
    boss.y = clamp(boss.y + boss.chargeDirY * boss.chargeSpeed * dt, boss.radius, canvas.height - boss.radius);
    if (boss.chargeTimer <= 0) {
      game.bossAttacks.push({
        type: "boss_slash",
        x: boss.x + boss.chargeDirX * 58,
        y: boss.y + boss.chargeDirY * 58,
        dirX: boss.chargeDirX,
        dirY: boss.chargeDirY,
        arc: Math.PI * 0.72,
        radius: boss.superBoss ? 138 : 112,
        damage: boss.damage * (boss.superBoss ? 1.55 : 1.2),
        age: 0,
        windup: 0.35,
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
      p.hp -= enemy.damage;
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
      radius: 5,
      damage: enemy.projectileDamage,
      life: 2.2,
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
          p.hp -= bolt.damage;
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
