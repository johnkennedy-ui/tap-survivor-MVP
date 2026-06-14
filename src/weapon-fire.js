(() => {
function createWeaponFireSystem({
  canvas,
  weaponDefs,
  getGame,
  getUpgradeTier,
  getRunUpgradeTier,
  getShopBonuses,
  getWeaponDamageMultiplier,
  playWeaponSfx,
  addQuestProgress,
  damageEnemy,
  reapEnemies,
  distance,
  clamp,
}) {
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

  function weaponCooldown(weapon) {
    const shopBonuses = getShopBonuses?.() || {};
    const rateTier = getUpgradeTier("fire_rate") + getRunUpgradeTier("run_fire_rate") + (shopBonuses.fireRate || 0);
    return weapon.cooldown / (1 + rateTier * 0.12);
  }

  function weaponReach(weapon) {
    const shopBonuses = getShopBonuses?.() || {};
    const radiusTier = getUpgradeTier("attack_radius") + getRunUpgradeTier("run_attack_radius") + (shopBonuses.attackRadius || 0);
    return (weapon.range || 0) * (1 + radiusTier * 0.12);
  }

  function weaponWidth(weapon) {
    const shopBonuses = getShopBonuses?.() || {};
    const radiusTier = getUpgradeTier("attack_radius") + getRunUpgradeTier("run_attack_radius") + (shopBonuses.attackRadius || 0);
    return (weapon.width || 0) * (1 + radiusTier * 0.1);
  }

  function projectileRadius(weapon) {
    const shopBonuses = getShopBonuses?.() || {};
    const radiusTier = getUpgradeTier("attack_radius") + getRunUpgradeTier("run_attack_radius") + (shopBonuses.attackRadius || 0);
    return (weapon.radius || 0) * (1 + radiusTier * 0.12);
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
    return (weapon.damage + flatTier * 4 + (shopBonuses.flatDamage || 0)) * (1 + percentTier * 0.12) * (getWeaponDamageMultiplier?.() || 1);
  }

  const weaponKindHandlers = {
    radial: fireRadial,
    beam: fireBeam,
    cone: fireCone,
    chain: fireChain,
    projectile: fireProjectile,
    target_area: fireTargetArea,
    lingering_area: fireLingeringArea,
    mine: fireMine,
  };

  function fireWeapon(weaponId) {
    const weapon = weaponDefs[weaponId];
    if (!weapon) return;
    setPlayerAttackAnimation(weapon);
    playWeaponSfx?.(weaponId);
    addWeaponBurst(weaponId, weapon);
    weaponKindHandlers[weapon.kind]?.(weaponId);
  }

  function setPlayerAttackAnimation(weapon) {
    const player = getGame()?.player;
    if (!player) return;
    player.actionSprite = playerAttackSprite(weapon.kind);
    player.actionTimer = 0.22;
  }

  function playerAttackSprite(kind) {
    if (kind === "beam" || kind === "cone" || kind === "chain") return "cast_beam";
    if (kind === "radial" || kind === "target_area" || kind === "lingering_area" || kind === "mine") return "sweep";
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

  function fireProjectile(weaponId) {
    const game = getGame();
    const weapon = weaponDefs[weaponId];
    const target = nearestEnemy();
    if (!target) return;
    const p = game.player;
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const speed = weapon.speed;
    const baseVx = (dx / dist) * speed;
    const baseVy = (dy / dist) * speed;
    const splitTier = getRunUpgradeTier("run_split_shot");
    const spread = 0.26;

    spawnProjectileBolt(weaponId, p.x, p.y, baseVx, baseVy);
    if (splitTier >= 1) {
      spawnProjectileBolt(weaponId, p.x, p.y, ...rotateVector(baseVx, baseVy, -spread));
      spawnProjectileBolt(weaponId, p.x, p.y, ...rotateVector(baseVx, baseVy, spread));
    }
    if (splitTier >= 2) {
      spawnProjectileBolt(weaponId, p.x, p.y, ...rotateVector(baseVx, baseVy, -spread * 2));
      spawnProjectileBolt(weaponId, p.x, p.y, ...rotateVector(baseVx, baseVy, spread * 2));
    }
  }

  function rotateVector(vx, vy, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [vx * cos - vy * sin, vx * sin + vy * cos];
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
          !bolt.hit.has(candidate) && distance(bolt, candidate) < bolt.radius + candidate.radius,
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
      spawnProjectileBolt(bolt.weaponId, bolt.x, bolt.y, (vx / magnitude) * speed, (vy / magnitude) * speed, {
        damage: bolt.damage * 0.55,
        life: 0.9,
        pierce: 0,
        bounces: 0,
        splitDepth: bolt.splitDepth + 1,
        hit: new Set(bolt.hit),
      });
    });
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

  function updateWeaponBursts(dt) {
    const game = getGame();
    game.weaponBursts.forEach((burst) => (burst.life -= dt));
    game.weaponBursts = game.weaponBursts.filter((burst) => burst.life > 0);
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
    updateWeapons,
    updateBolts,
    updateAreas,
    updateBeams,
    updateWeaponBursts,
  };
}

globalThis.TapSurvivorWeaponFire = {
  createWeaponFireSystem,
};
})();
