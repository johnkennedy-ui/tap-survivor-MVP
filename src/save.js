(() => {
  const {
    createDefaultSave,
  } = globalThis.TapSurvivorSaveDefaults;

  const {
    migrateSave,
  } = globalThis.TapSurvivorSaveMigrations;

  const {
    createSaveNormalizer,
  } = globalThis.TapSurvivorSaveNormalize;

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
    const storage =
      storageAdapter ||
      globalThis.TapSurvivorStorage?.createStorageAdapter({
        saveKey,
        legacySaveKey,
      });
    let lastLoadWarning = null;

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

    function loadSave() {
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

      try {
        const raw = storage?.getSaveRaw?.();
        if (raw && typeof raw.then === "function") {
          return raw
            .then(fromRaw)
            .catch(() => {
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
