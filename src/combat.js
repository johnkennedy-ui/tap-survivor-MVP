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
  getWeaponDamageMultiplier,
  advanceTowerFloor,
  endRun,
  distance,
  clamp,
}) {
  const enemies = globalThis.TapSurvivorEnemies.createEnemySystem({
    canvas,
    enemyTypes,
    getGame,
    distance,
    clamp,
  });
  const weaponFire = globalThis.TapSurvivorWeaponFire.createWeaponFireSystem({
    canvas,
    weaponDefs,
    getGame,
    getUpgradeTier,
    getRunUpgradeTier,
    getShopBonuses,
    getWeaponDamageMultiplier,
    addQuestProgress,
    damageEnemy,
    reapEnemies,
    distance,
    clamp,
  });

  function getRunUpgradeTier(id) {
    const game = getGame();
    return game?.runUpgradeTiers?.[id] || 0;
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
        advanceTowerFloor?.();
      }
    });
    game.enemies = game.enemies.filter((enemy) => enemy.hp > 0);
  }

  return {
    spawnEnemies: enemies.spawnEnemies,
    spawnBoss: enemies.spawnBoss,
    updateBossSpecials: enemies.updateBossSpecials,
    updateEnemies: enemies.updateEnemies,
    updateWeapons: weaponFire.updateWeapons,
    updateBolts: weaponFire.updateBolts,
    updateAreas: weaponFire.updateAreas,
    updateBeams: weaponFire.updateBeams,
    updateWeaponBursts: weaponFire.updateWeaponBursts,
    getRunUpgradeTier,
  };
}

globalThis.TapSurvivorCombat = {
  createCombatSystem,
};
})();
