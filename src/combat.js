(() => {
function createCombatSystem({
  canvas,
  combatDamage,
  content,
  enemies,
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
  weaponCooldowns,
  weaponProjectiles,
  weaponTargeting,
}) {
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
  const weaponFire = globalThis.TapSurvivorWeaponFire.createWeaponFireSystem({
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
