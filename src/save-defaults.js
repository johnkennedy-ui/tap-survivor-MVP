// GENERATED FILE. Do not edit directly.
// Source: src/modules/save-defaults.js
// Run: npm run build:bridges
// Retired global: TapSurvivorSaveDefaults. Exports are supplied through the game dependency bag.
(() => {
  "use strict";

  const CURRENT_SAVE_VERSION = 3;

  function createDefaultSave({ starterQuestIds }) {
    return {
      saveVersion: CURRENT_SAVE_VERSION,
      coins: 0,
      towerFloor: 1,
      questPoints: 0,
      totalQuestPoints: 0,
      unlockedNodes: [],
      unlockedWeapons: ["spark_bolt"],
      selectedStartingWeapon: "spark_bolt",
      upgradeTiers: {},
      unlockedUpgrades: [],
      shopPurchases: {},
      seenBanners: [],
      unlockedRelics: [],
      equippedRelics: [],
      activeQuests: [...starterQuestIds],
      completedQuests: [],
      questProgress: {},
    };
  }

})();
