export const CURRENT_SAVE_VERSION = 3;

export function createDefaultSave({ starterQuestIds }) {
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
