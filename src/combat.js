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
  weaponFire,
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
  const weaponFireSystem = weaponFire.createWeaponFireSystem({
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
    updateWeapons: weaponFireSystem.updateWeapons,
    updateBolts: weaponFireSystem.updateBolts,
    updateAreas: weaponFireSystem.updateAreas,
    updateBeams: weaponFireSystem.updateBeams,
    updateWeaponBursts: weaponFireSystem.updateWeaponBursts,
    getRunUpgradeTier,
  };
}

globalThis.TapSurvivorCombat = {
  createCombatSystem,
};
})();
