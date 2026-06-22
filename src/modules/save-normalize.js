const { CURRENT_SAVE_VERSION } = globalThis.TapSurvivorSaveDefaults;
const { isPlainObject } = globalThis.TapSurvivorSaveMigrations;

export function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

export function objectValue(value) {
  return isPlainObject(value) ? value : {};
}

export function createSaveNormalizer({
  defaultSave,
  questDefs,
  weaponUnlocks,
  upgradeDefs,
  shopItemById,
  questOpenIds,
}) {
  function normalizeShopPurchases(purchases) {
    const normalizedPurchases = {};

    Object.entries(objectValue(purchases)).forEach(([id, rawTier]) => {
      const item = shopItemById.get(id);
      if (shopItemById.size && !item) return;

      const maxTier = Math.max(0, Math.floor(item?.maxTier || rawTier || 0));
      const tier = Math.min(maxTier, Math.max(0, Math.floor(rawTier || 0)));
      if (tier > 0) normalizedPurchases[id] = tier;
    });

    return normalizedPurchases;
  }

  function normalizeSave(input) {
    const normalized = { ...defaultSave(), ...(isPlainObject(input) ? input : {}) };
    normalized.saveVersion = CURRENT_SAVE_VERSION;
    normalized.unlockedWeapons = [
      ...new Set(["spark_bolt", ...arrayValue(normalized.unlockedWeapons)]),
    ];
    normalized.coins = Math.max(0, Math.floor(normalized.coins || 0));
    normalized.towerFloor = Math.max(1, Math.floor(normalized.towerFloor || 1));
    normalized.unlockedNodes = arrayValue(normalized.unlockedNodes);
    normalized.upgradeTiers = objectValue(normalized.upgradeTiers);
    normalized.shopPurchases = normalizeShopPurchases(normalized.shopPurchases);
    normalized.seenBanners = [...new Set(arrayValue(normalized.seenBanners))];
    normalized.unlockedRelics = [...new Set(arrayValue(normalized.unlockedRelics))];
    normalized.equippedRelics = [
      ...new Set(
        arrayValue(normalized.equippedRelics).length
          ? arrayValue(normalized.equippedRelics)
          : normalized.unlockedRelics
      ),
    ]
      .filter((id) => normalized.unlockedRelics.includes(id))
      .slice(0, 5);
    normalized.activeQuests = arrayValue(normalized.activeQuests);
    normalized.completedQuests = arrayValue(normalized.completedQuests);
    normalized.questProgress = objectValue(normalized.questProgress);

    const ensureQuestOpen = (questId) => {
      if (!questId || !questDefs[questId]) return;
      if (
        !normalized.activeQuests.includes(questId) &&
        !normalized.completedQuests.includes(questId)
      ) {
        normalized.activeQuests.push(questId);
      }
      normalized.questProgress[questId] = normalized.questProgress[questId] || 0;
    };

    starterQuestAndUnlocks(normalized, ensureQuestOpen);

    normalized.unlockedUpgrades = Object.entries(normalized.upgradeTiers)
      .filter(([, tier]) => tier > 0)
      .map(([id]) => id);

    return normalized;
  }

  function starterQuestAndUnlocks(normalized, ensureQuestOpen) {
    defaultSave().activeQuests.forEach((questId) => {
      ensureQuestOpen(questId);
    });

    normalized.completedQuests.forEach((questId) => {
      questOpenIds(questDefs[questId]).forEach(ensureQuestOpen);
    });

    normalized.unlockedNodes.forEach((nodeId) => {
      const unlock = weaponUnlocks.find((node) => node.id === nodeId);
      ensureQuestOpen(unlock?.opensQuest);
    });

    arrayValue(normalized.unlockedUpgrades).forEach((id) => {
      normalized.upgradeTiers[id] = Math.max(normalized.upgradeTiers[id] || 0, 1);
    });

    Object.entries(normalized.upgradeTiers).forEach(([upgradeId, tier]) => {
      if (tier > 0) {
        const upgrade = upgradeDefs.find((item) => item.id === upgradeId);
        ensureQuestOpen(upgrade?.opensQuest);
      }
    });
  }

  return {
    normalizeSave,
  };
}
