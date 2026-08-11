// GENERATED FILE. Do not edit directly.
// Source: src/modules/combat.js
// Run: npm run build:bridges
// Retired global: TapSurvivorCombat. Exports are supplied through the game dependency bag.
(() => {
  "use strict";

  const MODULE_NATIVE_COMBAT_SLOTS = Object.freeze(["combat"]);

  const MODULE_NATIVE_COMBAT_PROOF_SLOTS = Object.freeze(["createCombatSystem"]);

  /**
   * @param {any} [options]
   */
  function createCombatSystem({
    canvas,
    balance,
    combatDamage,
    content,
    enemies,
    enemyBehaviors,
    enemySpawning,
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
    weaponBehaviors,
    weaponCooldowns,
    weaponFire,
    weaponProjectiles,
    weaponTargeting,
  } = {}) {
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
      balance,
      enemyBehaviors,
      enemySpawning,
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
      weaponBehaviors,
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
})();
