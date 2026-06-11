(() => {
function createSaveSystem({
  saveKey,
  legacySaveKey,
  starterQuestIds,
  questDefs,
  weaponUnlocks,
  upgradeDefs,
  questOpenIds,
}) {
  function defaultSave() {
    return {
      coins: 0,
      towerFloor: 1,
      questPoints: 0,
      totalQuestPoints: 0,
      unlockedNodes: [],
      unlockedWeapons: ["spark_bolt"],
      upgradeTiers: {},
      unlockedUpgrades: [],
      shopPurchases: {},
      activeQuests: [...starterQuestIds],
      completedQuests: [],
      questProgress: {},
    };
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(saveKey) || localStorage.getItem(legacySaveKey);
      const loaded = raw ? JSON.parse(raw) : {};
      return normalizeSave({ ...defaultSave(), ...loaded });
    } catch {
      return defaultSave();
    }
  }

  function normalizeSave(input) {
    const normalized = { ...defaultSave(), ...input };
    normalized.unlockedWeapons = [...new Set(["spark_bolt", ...(normalized.unlockedWeapons || [])])];
    normalized.coins = Math.max(0, Math.floor(normalized.coins || 0));
    normalized.towerFloor = Math.max(1, Math.floor(normalized.towerFloor || 1));
    normalized.unlockedNodes = normalized.unlockedNodes || [];
    normalized.upgradeTiers = normalized.upgradeTiers || {};
    normalized.shopPurchases = normalized.shopPurchases || {};
    normalized.activeQuests = normalized.activeQuests || [];
    normalized.completedQuests = normalized.completedQuests || [];
    normalized.questProgress = normalized.questProgress || {};
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
    (normalized.unlockedUpgrades || []).forEach((id) => {
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
    localStorage.setItem(saveKey, JSON.stringify(save));
  }

  return {
    defaultSave,
    loadSave,
    normalizeSave,
    persist,
  };
}

globalThis.TapSurvivorSave = {
  createSaveSystem,
};
})();
