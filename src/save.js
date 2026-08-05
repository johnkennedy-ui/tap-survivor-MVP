// GENERATED FILE. Do not edit directly.
// Source: src/modules/save.js
// Run: npm run build:bridges
(() => {
  "use strict";

  /**
   * @typedef {Record<string, unknown>} SaveData
   * @typedef {{ setCorruptBackupRaw?: (raw: string) => void }} CorruptBackupStorage
   * @typedef {() => SaveData} DefaultSaveFn
   * @typedef {(save: SaveData) => SaveData} NormalizeAndMigrateSaveFn
   * @typedef {{
   *   fromRaw(raw: string | null | undefined): SaveData,
   *   getLastLoadWarning(): string | null,
   *   storageReadFailed(): SaveData
   * }} SaveLoadHandler
   */

  /**
   * @param {{
   *   defaultSave: DefaultSaveFn,
   *   normalizeAndMigrateSave: NormalizeAndMigrateSaveFn,
   *   storage?: CorruptBackupStorage
   * }} options
   * @returns {SaveLoadHandler}
   */
  function createSaveLoadHandler({ defaultSave, normalizeAndMigrateSave, storage }) {
    let lastLoadWarning = null;

    function fromRaw(raw) {
      lastLoadWarning = null;

      if (!raw) {
        return normalizeAndMigrateSave({});
      }

      try {
        return normalizeAndMigrateSave(JSON.parse(raw));
      } catch {
        lastLoadWarning = "corrupt-save";
        storage?.setCorruptBackupRaw?.(raw);
        return defaultSave();
      }
    }

    function storageReadFailed() {
      lastLoadWarning = "storage-read-failed";
      return defaultSave();
    }

    function getLastLoadWarning() {
      return lastLoadWarning;
    }

    return {
      fromRaw,
      getLastLoadWarning,
      storageReadFailed,
    };
  }

  const DEFAULT_SAVE_NORMALIZE_VERSION = 3;

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function arrayValue(value) {
    return Array.isArray(value) ? value : [];
  }

  function objectValue(value) {
    return isPlainObject(value) ? value : {};
  }

  function createSaveNormalizer({
    currentSaveVersion = DEFAULT_SAVE_NORMALIZE_VERSION,
    defaultSave,
    isPlainObject: isPlainObjectValue = isPlainObject,
    questDefs,
    weaponUnlocks,
    upgradeDefs,
    shopItemById,
    questOpenIds,
  }) {
    const knownWeaponIds = new Set([
      "spark_bolt",
      ...arrayValue(weaponUnlocks)
        .map((unlock) => unlock.weaponId)
        .filter(Boolean),
    ]);

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
      const normalized = { ...defaultSave(), ...(isPlainObjectValue(input) ? input : {}) };
      normalized.saveVersion = currentSaveVersion;
      normalized.unlockedWeapons = [
        ...new Set(["spark_bolt", ...arrayValue(normalized.unlockedWeapons)]),
      ];
      normalized.selectedStartingWeapon = normalizeSelectedStartingWeapon(
        normalized.selectedStartingWeapon,
        normalized.unlockedWeapons
      );
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

    function normalizeSelectedStartingWeapon(value, unlockedWeapons) {
      if (
        typeof value === "string" &&
        knownWeaponIds.has(value) &&
        unlockedWeapons.includes(value)
      ) {
        return value;
      }
      return "spark_bolt";
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

  function createSaveSystem({
    saveKey,
    legacySaveKey,
    saveNormalize,
    saveCorruption,
    saveDefaults,
    saveMigrations,
    starterQuestIds,
    questDefs,
    weaponUnlocks,
    upgradeDefs,
    shopItemDefs = [],
    questOpenIds,
    storage,
    storageAdapter,
  }) {
    const { createSaveNormalizer } = saveNormalize;
    const { createSaveLoadHandler } = saveCorruption;
    const { createDefaultSave } = saveDefaults;
    const { migrateSave } = saveMigrations;
    const currentSaveVersion = saveDefaults.CURRENT_SAVE_VERSION;
    const shopItemById = new Map(shopItemDefs.map((item) => [item.id, item]));
    const activeStorage =
      storageAdapter ||
      storage?.createStorageAdapter({
        saveKey,
        legacySaveKey,
      });

    function defaultSave() {
      return createDefaultSave({ starterQuestIds });
    }

    const { normalizeSave } = createSaveNormalizer({
      currentSaveVersion,
      defaultSave,
      isPlainObject: saveMigrations.isPlainObject,
      questDefs,
      weaponUnlocks,
      upgradeDefs,
      shopItemById,
      questOpenIds,
    });

    const saveLoadHandler = createSaveLoadHandler({
      defaultSave,
      normalizeAndMigrateSave,
      storage: activeStorage,
    });

    function loadSave() {
      try {
        const raw = activeStorage?.getSaveRaw?.();
        if (raw && typeof raw.then === "function") {
          return raw.then(saveLoadHandler.fromRaw).catch(saveLoadHandler.storageReadFailed);
        }

        return saveLoadHandler.fromRaw(raw);
      } catch {
        return saveLoadHandler.storageReadFailed();
      }
    }

    function normalizeAndMigrateSave(input) {
      return normalizeSave({
        ...defaultSave(),
        ...migrateSave(input, { currentSaveVersion }),
      });
    }

    function persist(save) {
      const unlockedUpgrades = Object.entries(save.upgradeTiers)
        .filter(([, tier]) => tier > 0)
        .map(([id]) => id);

      save.unlockedUpgrades = unlockedUpgrades;
      return activeStorage?.setSaveRaw?.(JSON.stringify(save)) ?? false;
    }

    function removeSave() {
      return activeStorage?.removeSaveRaw?.() ?? false;
    }

    function getLastLoadWarning() {
      return saveLoadHandler.getLastLoadWarning();
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

  function createClassicSaveSystem(options = {}) {
    const callerOptions = options || {};
    const hasCallerStorage = Object.prototype.hasOwnProperty.call(callerOptions, "storage");
    const hasCallerStorageAdapter = Boolean(callerOptions.storageAdapter);
    const defaultStorage =
      hasCallerStorage || hasCallerStorageAdapter ? {} : { storage: configuredDefaultStorage() };

    return createSaveSystem({
      saveNormalize: { arrayValue, createSaveNormalizer, objectValue },
      saveCorruption: { createSaveLoadHandler },
      ...defaultStorage,
      ...options,
    });
  }

  let defaultProviders = {};

  function missingDefaultProviderNames() {
    const missingProviders = [];
    if (defaultProviders.storage == null) missingProviders.push("storage");
    return missingProviders;
  }

  function createMissingDefaultProviderError(missingProviders) {
    const error = new Error(
      `Missing Tap Survivor save default providers: ${missingProviders.join(", ")}`
    );
    error.name = "TapSurvivorSaveProviderError";
    error.code = "TAP_SURVIVOR_SAVE_PROVIDER_MISSING";
    error.missing = missingProviders;
    error.missingProviders = missingProviders;
    return error;
  }

  function configuredDefaultStorage() {
    const missingProviders = missingDefaultProviderNames();
    if (missingProviders.length) throw createMissingDefaultProviderError(missingProviders);
    return defaultProviders.storage;
  }

  function configureDefaultProviders({ storage } = {}) {
    defaultProviders = { storage };
    const missingProviders = missingDefaultProviderNames();
    if (missingProviders.length) throw createMissingDefaultProviderError(missingProviders);
    return defaultProviders.storage;
  }

  globalThis.TapSurvivorSave = {
    createSaveSystem: createClassicSaveSystem,
    configureDefaultProviders,
  };
})();
