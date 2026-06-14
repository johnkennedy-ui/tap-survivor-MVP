(() => {
function createEnemySystem({
  canvas,
  enemyTypes,
  levelDefs = [],
  getGame,
  distance,
  clamp,
}) {
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
    return (!type.minTowerFloor || game.towerFloor >= type.minTowerFloor) &&
      (!type.minPlayerLevel || game.player.level >= type.minPlayerLevel);
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
    const bossHp = (1400 + game.kills * 6) * difficulty.hp;
    game.enemies.push({
      boss: true,
      superBoss,
      assetId: "boss",
      x: canvas.width / 2,
      y: -52,
      radius: 38,
      hp: superBoss ? bossHp * 1.35 : bossHp,
      maxHp: superBoss ? bossHp * 1.35 : bossHp,
      speed: 42,
      damage: 22 * difficulty.damage,
      touchCooldown: 0.8,
      touchTimer: 0,
    });
  }

  function updateBossSpecials(dt) {
    const game = getGame();
    const boss = game.enemies.find((enemy) => enemy.boss);
    if (!boss) return;
    game.bossAttackTimer -= dt;
    if (game.bossAttackTimer <= 0) {
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
    }

    const p = game.player;
    game.bossAttacks.forEach((attack) => {
      attack.age += dt;
      if (!attack.hit && attack.age >= attack.windup) {
        attack.hit = true;
        if (distance(p, attack) <= p.radius + attack.radius) {
          p.hp -= attack.damage;
        }
      }
    });
    game.bossAttacks = game.bossAttacks.filter((attack) => attack.age <= attack.windup + 0.35);
  }

  function updateEnemies(dt) {
    const game = getGame();
    const p = game.player;
    game.enemies.forEach((enemy) => {
      const dx = p.x - enemy.x;
      const dy = p.y - enemy.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
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
      enemy.touchTimer -= dt;
      if (dist < p.radius + enemy.radius && enemy.touchTimer <= 0) {
        p.hp -= enemy.damage;
        enemy.touchTimer = enemy.touchCooldown;
      }
    });
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
        p.hp -= bolt.damage;
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
