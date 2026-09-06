// GENERATED FILE. Do not edit directly.
// Source: src/modules/save.js
// Run: npm run build:bridges
// Retired global: TapSurvivorSave. Exports are supplied through the game dependency bag.
(() => {
  "use strict";

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
})();
