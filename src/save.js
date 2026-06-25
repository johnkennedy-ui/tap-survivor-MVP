// GENERATED FILE. Do not edit directly.
// Source: src/modules/save.js
// Run: npm run build:bridges
(() => {
  "use strict";

  const { createSaveNormalizer } = globalThis.TapSurvivorSaveNormalize;

  const { createSaveLoadHandler } = globalThis.TapSurvivorSaveCorruption;

  function createSaveSystem({
    saveKey,
    legacySaveKey,
    saveDefaults,
    saveMigrations,
    starterQuestIds,
    questDefs,
    weaponUnlocks,
    upgradeDefs,
    shopItemDefs = [],
    questOpenIds,
    storageAdapter,
  }) {
    const { createDefaultSave } = saveDefaults;
    const { migrateSave } = saveMigrations;
    const shopItemById = new Map(shopItemDefs.map((item) => [item.id, item]));
    const storage =
      storageAdapter ||
      globalThis.TapSurvivorStorage?.createStorageAdapter({
        saveKey,
        legacySaveKey,
      });

    function defaultSave() {
      return createDefaultSave({ starterQuestIds });
    }

    const { normalizeSave } = createSaveNormalizer({
      defaultSave,
      questDefs,
      weaponUnlocks,
      upgradeDefs,
      shopItemById,
      questOpenIds,
    });

    const saveLoadHandler = createSaveLoadHandler({
      defaultSave,
      normalizeAndMigrateSave,
      storage,
    });

    function loadSave() {
      try {
        const raw = storage?.getSaveRaw?.();
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
        ...migrateSave(input),
      });
    }

    function persist(save) {
      const unlockedUpgrades = Object.entries(save.upgradeTiers)
        .filter(([, tier]) => tier > 0)
        .map(([id]) => id);

      save.unlockedUpgrades = unlockedUpgrades;
      return storage?.setSaveRaw?.(JSON.stringify(save)) ?? false;
    }

    function removeSave() {
      return storage?.removeSaveRaw?.() ?? false;
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

  globalThis.TapSurvivorSave = {
    createSaveSystem,
  };
})();
