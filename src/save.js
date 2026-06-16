(() => {
const CURRENT_SAVE_VERSION = 3;

function createSaveSystem({
  saveKey,
  legacySaveKey,
  starterQuestIds,
  questDefs,
  weaponUnlocks,
  upgradeDefs,
  shopItemDefs = [],
  questOpenIds,
  storageAdapter,
}) {
  const shopItemById = new Map(shopItemDefs.map((item) => [item.id, item]));
  const storage = storageAdapter || globalThis.TapSurvivorStorage?.createStorageAdapter({ saveKey, legacySaveKey });
  let lastLoadWarning = null;
  const saveMigrations = {
    2(save) {
      return {
        ...save,
        shopPurchases: save.shopPurchases || {},
      };
    },
    3(save) {
      return {
        ...save,
        seenBanners: save.seenBanners || [],
      };
    },
  };

  function defaultSave() {
    return {
      saveVersion: CURRENT_SAVE_VERSION,
      coins: 0,
      towerFloor: 1,
      questPoints: 0,
      totalQuestPoints: 0,
      unlockedNodes: [],
      unlockedWeapons: ["spark_bolt"],
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

  function loadSave() {
    function fromRaw(raw) {
      lastLoadWarning = null;
      if (!raw) return normalizeAndMigrateSave({});
      try {
        return normalizeAndMigrateSave(JSON.parse(raw));
      } catch {
        lastLoadWarning = "corrupt-save";
        storage?.setCorruptBackupRaw?.(raw);
        return defaultSave();
      }
    }

    try {
      const raw = storage?.getSaveRaw?.();
      if (raw && typeof raw.then === "function") {
        return raw.then(fromRaw).catch(() => {
          lastLoadWarning = "storage-read-failed";
          return defaultSave();
        });
      }
      return fromRaw(raw);
    } catch {
      lastLoadWarning = "storage-read-failed";
      return defaultSave();
    }
  }

  function normalizeAndMigrateSave(input) {
    return normalizeSave({ ...defaultSave(), ...migrateSave(input) });
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function arrayValue(value) {
    return Array.isArray(value) ? value : [];
  }

  function objectValue(value) {
    return isPlainObject(value) ? value : {};
  }

  function migrateSave(input) {
    let migrated = { ...(isPlainObject(input) ? input : {}) };
    let version = Math.max(1, Math.floor(migrated.saveVersion || 1));
    while (version < CURRENT_SAVE_VERSION) {
      version += 1;
      migrated = saveMigrations[version]?.(migrated) || migrated;
      migrated.saveVersion = version;
    }
    migrated.saveVersion = CURRENT_SAVE_VERSION;
    return migrated;
  }

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
    normalized.unlockedWeapons = [...new Set(["spark_bolt", ...arrayValue(normalized.unlockedWeapons)])];
    normalized.coins = Math.max(0, Math.floor(normalized.coins || 0));
    normalized.towerFloor = Math.max(1, Math.floor(normalized.towerFloor || 1));
    normalized.unlockedNodes = arrayValue(normalized.unlockedNodes);
    normalized.upgradeTiers = objectValue(normalized.upgradeTiers);
    normalized.shopPurchases = normalizeShopPurchases(normalized.shopPurchases);
    normalized.seenBanners = [...new Set(arrayValue(normalized.seenBanners))];
    normalized.unlockedRelics = [...new Set(arrayValue(normalized.unlockedRelics))];
    normalized.equippedRelics = [...new Set(arrayValue(normalized.equippedRelics).length ? arrayValue(normalized.equippedRelics) : normalized.unlockedRelics)]
      .filter((id) => normalized.unlockedRelics.includes(id))
      .slice(0, 5);
    normalized.activeQuests = arrayValue(normalized.activeQuests);
    normalized.completedQuests = arrayValue(normalized.completedQuests);
    normalized.questProgress = objectValue(normalized.questProgress);
    const ensureQuestOpen = (questId) => {
      if (!questId || !questDefs[questId]) return;
      if (!normalized.activeQuests.includes(questId) && !normalized.completedQuests.includes(questId)) {
        normalized.activeQuests.push(questId);
      }
      normalized.questProgress[questId] = normalized.questProgress[questId] || 0;
    };
    starterQuestIds.forEach((questId) => {
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
    normalized.unlockedUpgrades = Object.entries(normalized.upgradeTiers)
      .filter(([, tier]) => tier > 0)
      .map(([id]) => id);
    return normalized;
  }

  function persist(save) {
    save.unlockedUpgrades = Object.entries(save.upgradeTiers)
      .filter(([, tier]) => tier > 0)
      .map(([id]) => id);
    return storage?.setSaveRaw?.(JSON.stringify(save)) ?? false;
  }

  function removeSave() {
    return storage?.removeSaveRaw?.() ?? false;
  }

  function getLastLoadWarning() {
    return lastLoadWarning;
  }

  return {
    defaultSave,
    loadSave,
    getLastLoadWarning,
    normalizeSave,
    persist,
    removeSave,
  };
}

globalThis.TapSurvivorSave = {
  createSaveSystem,
};
})();
