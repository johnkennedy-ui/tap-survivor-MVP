// GENERATED FILE. Do not edit directly.
// Source: src/modules/save-migrations.js
// Run: npm run build:bridges
(() => {
  "use strict";

  const { CURRENT_SAVE_VERSION } = globalThis.TapSurvivorSaveDefaults;

  /**
   * Minimal persisted save shape used while stepping old saves forward.
   *
   * @typedef {Record<string, unknown> & {
   *   saveVersion?: number,
   *   shopPurchases?: Record<string, number>,
   *   seenBanners?: string[]
   * }} MigratingSave
   */

  /** @type {Record<number, (save: MigratingSave) => MigratingSave>} */
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

  /**
   * Guard for plain object save payloads before migration copies fields.
   *
   * @param {unknown} value
   * @returns {value is MigratingSave}
   */
  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  /**
   * Migrates an unknown persisted save payload to the current save schema version.
   *
   * @param {unknown} input
   * @returns {MigratingSave}
   */
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
