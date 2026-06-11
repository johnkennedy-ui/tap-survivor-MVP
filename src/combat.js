(() => {
function createCombatSystem({
  canvas,
  enemyTypes,
  weaponDefs,
  getGame,
  getUpgradeTier,
  getShopBonuses,
  addQuestProgress,
  addQuestProgressForWeapon,
  addQuestProgressGroup,
  killQuestIds,
  damageQuestIds,
  bossQuestIds,
  spawnLootDrops,
  endRun,
  distance,
  clamp,
}) {
  function spawnEnemies(dt) {
    const game = getGame();
    game.spawnTimer -= dt;
    if (game.spawnTimer > 0) return;
    game.spawnTimer = Math.max(0.35, 1.1 - game.elapsed / 150);
    spawnPatternPositions(2).forEach((position, index) => {
      const type = chooseEnemyType(index);
      spawnEnemy(type, position);
    });
  }

  function availableEnemyTypes() {
    const game = getGame();
    return enemyTypes.slice(0, Math.min(enemyTypes.length, 1 + Math.floor(game.elapsed / 30)));
  }

  function chooseEnemyType(offset = 0) {
    const available = availableEnemyTypes();
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
    game.enemies.push({
      type: type.id,
      name: type.name,
      color: type.color,
      assetId: type.assetId || type.id,
      x: position.x,
      y: position.y,
      radius: type.radius,
      hp: type.hp + game.elapsed * type.hpScale,
      speed: type.speed + game.elapsed * type.speedScale,
      damage: type.damage,
      touchCooldown: type.touchCooldown,
      xp: type.xp,
      touchTimer: 0,
    });
  }

  function spawnBoss() {
    const game = getGame();
    if (game.bossSpawned) return;
    game.bossSpawned = true;
    game.enemies.push({
      boss: true,
      assetId: "boss",
      x: canvas.width / 2,
      y: -52,
      radius: 38,
      hp: 1400 + game.kills * 6,
      maxHp: 1400 + game.kills * 6,
      speed: 42,
      damage: 22,
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
      enemy.x += (dx / dist) * enemy.speed * dt;
      enemy.y += (dy / dist) * enemy.speed * dt;
      enemy.touchTimer -= dt;
      if (dist < p.radius + enemy.radius && enemy.touchTimer <= 0) {
        p.hp -= enemy.damage;
        enemy.touchTimer = enemy.touchCooldown;
      }
    });
  }

  function updateWeapons(dt) {
    const game = getGame();
    game.player.equippedWeapons.forEach((weaponId) => {
      const weapon = weaponDefs[weaponId];
      game.weaponTimers[weaponId] = (game.weaponTimers[weaponId] || 0) - dt;
      if (game.weaponTimers[weaponId] <= 0) {
        game.weaponTimers[weaponId] = weaponCooldown(weapon);
        fireWeapon(weaponId);
      }
    });
  }

  function getRunUpgradeTier(id) {
    const game = getGame();
    return Math.min(3, game?.runUpgradeTiers?.[id] || 0);
  }

  function weaponCooldown(weapon) {
    const rateTier = getUpgradeTier("fire_rate") + getRunUpgradeTier("run_fire_rate");
    return weapon.cooldown / (1 + rateTier * 0.12);
  }

  function weaponReach(weapon) {
    const radiusTier = getUpgradeTier("attack_radius") + getRunUpgradeTier("run_attack_radius");
    return (weapon.range || 0) * (1 + radiusTier * 0.12);
  }

  function weaponWidth(weapon) {
    const radiusTier = getUpgradeTier("attack_radius") + getRunUpgradeTier("run_attack_radius");
    return (weapon.width || 0) * (1 + radiusTier * 0.1);
  }

  function projectileRadius(weapon) {
    const radiusTier = getUpgradeTier("attack_radius") + getRunUpgradeTier("run_attack_radius");
    return (weapon.radius || 0) * (1 + radiusTier * 0.12);
  }

  function weaponDamage(weaponId) {
    const weapon = weaponDefs[weaponId];
    const flatTier = getUpgradeTier("flat_damage") + getRunUpgradeTier("run_flat_damage");
    const shopBonuses = getShopBonuses?.() || {};
    const percentTier =
      getUpgradeTier("percent_damage") +
      getRunUpgradeTier("run_percent_damage") +
      getUpgradeTier(weapon.upgradeId) * 2;
    return (weapon.damage + flatTier * 4 + (shopBonuses.flatDamage || 0)) * (1 + percentTier * 0.12);
  }

  function fireWeapon(weaponId) {
    const weapon = weaponDefs[weaponId];
    if (!weapon) return;
    if (weapon.kind === "radial") fireRadial(weaponId);
    if (weapon.kind === "beam") fireBeam(weaponId);
    if (weapon.kind === "cone") fireCone(weaponId);
    if (weapon.kind === "chain") fireChain(weaponId);
    if (weapon.kind === "projectile") fireProjectile(weaponId);
    if (weapon.kind === "target_area") fireTargetArea(weaponId);
    if (weapon.kind === "lingering_area") fireLingeringArea(weaponId);
    if (weapon.kind === "mine") fireMine(weaponId);
  }

  function fireProjectile(weaponId) {
    const game = getGame();
    const weapon = weaponDefs[weaponId];
    const target = nearestEnemy();
    if (!target) return;
    const p = game.player;
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    game.bolts.push({
      weaponId,
      x: p.x,
      y: p.y,
      vx: (dx / dist) * weapon.speed,
      vy: (dy / dist) * weapon.speed,
      radius: projectileRadius(weapon),
      damage: weaponDamage(weaponId),
      life: 1.8,
      pierce: weapon.pierce || 0,
      hit: new Set(),
      color: weapon.color,
    });
  }

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
      x: p.x,
      y: p.y,
      endX: p.x + dirX * weaponReach(weapon),
      endY: p.y + dirY * weaponReach(weapon),
      width: 10,
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
    game.enemies.forEach((enemy) => {
      if (distance(p, enemy) <= weaponReach(weapon) + enemy.radius) {
        damageEnemy(enemy, weaponDamage(weaponId), weaponId);
      }
    });
    game.areas.push({
      x: p.x,
      y: p.y,
      radius: weaponReach(weapon),
      color: weapon.color,
      life: 0.24,
      visualOnly: true,
    });
    reapEnemies();
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
    game.areas.push({
      weaponId,
      x: p.x,
      y: p.y,
      radius: weaponReach(weapon),
      color: weapon.color,
      life: 1.1,
      tick: 1.1,
      tickTimer: 0.18,
      damage: weaponDamage(weaponId),
    });
  }

  function updateBolts(dt) {
    const game = getGame();
    game.bolts.forEach((bolt) => {
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      bolt.life -= dt;
      const enemy = game.enemies.find(
        (candidate) =>
          !bolt.hit.has(candidate) && distance(bolt, candidate) < bolt.radius + candidate.radius,
      );
      if (enemy) {
        damageEnemy(enemy, bolt.damage, bolt.weaponId);
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

  function updateAreas(dt) {
    const game = getGame();
    game.areas.forEach((area) => {
      area.life -= dt;
      if (area.visualOnly || !area.weaponId) return;
      area.tickTimer -= dt;
      if (area.tickTimer > 0) return;
      area.tickTimer = area.tick;
      game.enemies.forEach((enemy) => {
        if (distance(area, enemy) <= area.radius + enemy.radius) {
          damageEnemy(enemy, area.damage, area.weaponId);
        }
      });
    });
    game.areas = game.areas.filter((area) => area.life > 0);
    reapEnemies();
  }

  function updateBeams(dt) {
    const game = getGame();
    game.beams.forEach((beam) => (beam.life -= dt));
    game.beams = game.beams.filter((beam) => beam.life > 0);
  }

  function damageEnemy(enemy, amount, weaponId) {
    const game = getGame();
    const before = enemy.hp;
    enemy.hp -= amount;
    const dealt = Math.max(0, Math.min(before, amount));
    game.weaponDamage[weaponId] = (game.weaponDamage[weaponId] || 0) + dealt;
    addQuestProgressGroup(damageQuestIds, dealt);
    addQuestProgressForWeapon(weaponId, dealt);
    return dealt;
  }

  function reapEnemies() {
    const game = getGame();
    const dead = game.enemies.filter((enemy) => enemy.hp <= 0);
    dead.forEach((enemy) => {
      game.kills += 1;
      addQuestProgressGroup(killQuestIds, 1);
      game.xpDrops.push({ x: enemy.x, y: enemy.y, radius: enemy.boss ? 12 : 7, value: enemy.boss ? 8 : enemy.xp });
      spawnLootDrops(enemy);
      if (enemy.boss) {
        game.bossDefeated = true;
        addQuestProgressGroup(bossQuestIds, 1);
        endRun("Boss defeated");
      }
    });
    game.enemies = game.enemies.filter((enemy) => enemy.hp > 0);
  }

  function nearestEnemy() {
    const game = getGame();
    if (!game.enemies.length) return null;
    const p = game.player;
    return game.enemies.reduce((best, enemy) =>
      distance(p, enemy) < distance(p, best) ? enemy : best,
    );
  }

  return {
    spawnEnemies,
    spawnBoss,
    updateBossSpecials,
    updateEnemies,
    updateWeapons,
    updateBolts,
    updateAreas,
    updateBeams,
    getRunUpgradeTier,
  };
}

globalThis.TapSurvivorCombat = {
  createCombatSystem,
};
})();
