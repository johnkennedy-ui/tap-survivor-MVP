(() => {
  const { CURRENT_SAVE_VERSION } = globalThis.TapSurvivorSaveDefaults;

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

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

  globalThis.TapSurvivorSaveMigrations = {
    isPlainObject,
    migrateSave,
  };
})();
