export const MODULE_NATIVE_ENEMY_SPAWN_SLOTS = Object.freeze(["enemySpawning"]);

export const MODULE_NATIVE_ENEMY_SPAWN_PROOF_SLOTS = Object.freeze(["createEnemySpawnSystem"]);

/**
 * @param {any} [options]
 */
export function createEnemySpawnSystem({
  canvas,
  spatial,
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
    const position = spatial?.spawnPosition(getGame(), angle, spawnEntryMargin);
    if (position) return position;
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
    const opened = spatial?.openPosition?.(game, position, type.radius) || position;
    const spawn = preserveSpawnEntryBand(game, position, opened, type.radius);
    game.enemies.push({
      type: type.id,
      name: type.name,
      color: type.color,
      assetId: type.assetId || type.id,
      towerFloor: game.towerFloor,
      x: spawn.x,
      y: spawn.y,
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
      facingX: game.player.x - spawn.x,
      facingY: game.player.y - spawn.y,
    });
  }

  function preserveSpawnEntryBand(game, requested, opened, radius) {
    const visible = spatial?.visibleBounds?.(game);
    if (!visible || withinEntryBand(opened, visible) || !spatial?.solidWalls) return opened;
    const walls = spatial.solidWalls(game);
    const candidates = [opened];
    for (const wall of walls) {
      candidates.push(
        { x: wall.x - radius, y: requested.y },
        { x: wall.x + wall.width + radius, y: requested.y },
        { x: requested.x, y: wall.y - radius },
        { x: requested.x, y: wall.y + wall.height + radius }
      );
    }
    const valid = candidates.filter(
      (candidate) => withinEntryBand(candidate, visible) && clearOfWalls(candidate, radius, walls)
    );
    if (!valid.length) return opened;
    return valid.reduce((best, candidate) =>
      distanceSquared(candidate, requested) < distanceSquared(best, requested) ? candidate : best
    );
  }

  function withinEntryBand(point, visible) {
    return (
      point.x >= visible.left - spawnEntryMargin &&
      point.x <= visible.right + spawnEntryMargin &&
      point.y >= visible.top - spawnEntryMargin &&
      point.y <= visible.bottom + spawnEntryMargin &&
      (point.x < visible.left ||
        point.x > visible.right ||
        point.y < visible.top ||
        point.y > visible.bottom)
    );
  }

  function clearOfWalls(point, radius, walls) {
    return walls.every((wall) => {
      const x = Math.max(wall.x, Math.min(wall.x + wall.width, point.x));
      const y = Math.max(wall.y, Math.min(wall.y + wall.height, point.y));
      return Math.hypot(point.x - x, point.y - y) >= radius - 0.0001;
    });
  }

  function distanceSquared(first, second) {
    return (first.x - second.x) ** 2 + (first.y - second.y) ** 2;
  }

  return {
    spawnEnemies,
  };
}
