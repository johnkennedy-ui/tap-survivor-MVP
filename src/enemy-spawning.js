(() => {
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
}) {
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
      null,
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
      edgeDistances.push(((dirX > 0 ? canvas.width + spawnEntryMargin : -spawnEntryMargin) - player.x) / dirX);
    }
    if (Math.abs(dirY) > 0.0001) {
      edgeDistances.push(((dirY > 0 ? canvas.height + spawnEntryMargin : -spawnEntryMargin) - player.y) / dirY);
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
      shootTimer: Math.random() * cooldown,
    });
  }

  return {
    spawnEnemies,
  };
}

globalThis.TapSurvivorEnemySpawning = {
  createEnemySpawnSystem,
};
})();
