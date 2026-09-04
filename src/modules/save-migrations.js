const DEFAULT_CURRENT_SAVE_VERSION = 4;

const LEGACY_META_UPGRADE_COSTS = {
  attack_radius: [1, 2, 3],
  fire_rate: [1, 2, 3, 4, 5],
  flat_damage: [1, 2, 3],
  max_hp: [1, 2, 3],
  move_speed: [1, 2, 3],
  percent_damage: [1, 2, 3, 4, 5],
  pickup_radius: [1, 2, 3],
};

const LEGACY_WEAPON_DAMAGE_UPGRADE_IDS = [
  "acid_damage",
  "chain_damage",
  "fire_staff_damage",
  "flame_damage",
  "frost_damage",
  "glaive_damage",
  "laser_damage",
  "laser_staff_damage",
  "lightning_damage",
  "meteor_damage",
  "nova_damage",
  "saw_damage",
  "shield_damage",
  "spark_damage",
  "void_damage",
  "water_staff_damage",
];

const LEGACY_PERMANENT_UPGRADE_COSTS = Object.freeze({
  ...LEGACY_META_UPGRADE_COSTS,
  ...Object.fromEntries(LEGACY_WEAPON_DAMAGE_UPGRADE_IDS.map((id) => [id, [1, 2, 3, 4, 5]])),
});

function positiveTier(value, maxTier) {
  const tier = Number(value);
  if (!Number.isFinite(tier)) return 0;
  return Math.min(maxTier, Math.max(0, Math.floor(tier)));
}

/**
 * Returns the QP actually spent on legacy permanent upgrade tiers.
 * Unknown IDs never receive a refund because they have no verifiable cost.
 *
 * @param {MigratingSave} save
 */
function legacyPermanentUpgradeRefund(save) {
  const storedTiers = isPlainObject(save?.upgradeTiers) ? save.upgradeTiers : {};
  const unlocked = new Set(Array.isArray(save?.unlockedUpgrades) ? save.unlockedUpgrades : []);
  return Object.entries(LEGACY_PERMANENT_UPGRADE_COSTS).reduce((refund, [id, costs]) => {
    const tier = Math.max(positiveTier(storedTiers[id], costs.length), unlocked.has(id) ? 1 : 0);
    return refund + costs.slice(0, tier).reduce((total, cost) => total + cost, 0);
  }, 0);
}

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
  4(save) {
    const refund = legacyPermanentUpgradeRefund(save);
    return {
      ...save,
      questPoints: Math.max(0, Math.floor(Number(save.questPoints) || 0)) + refund,
      upgradeTiers: {},
      unlockedUpgrades: [],
      legacyPermanentUpgradeRefundVersion: 4,
    };
  },
};

/**
 * Guard for plain object save payloads before migration copies fields.
 *
 * @param {unknown} value
 * @returns {value is MigratingSave}
 */
export function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Migrates an unknown persisted save payload to the current save schema version.
 *
 * @param {unknown} input
 * @param {{ currentSaveVersion?: number }} [options]
 * @returns {MigratingSave}
 */
export function migrateSave(input, options = {}) {
  const currentSaveVersion =
    options && typeof options === "object" && Number.isFinite(options.currentSaveVersion)
      ? options.currentSaveVersion
      : DEFAULT_CURRENT_SAVE_VERSION;
  let migrated = { ...(isPlainObject(input) ? input : {}) };
  let version = Math.max(1, Math.floor(migrated.saveVersion || 1));

  while (version < currentSaveVersion) {
    version += 1;
    migrated = saveMigrations[version]?.(migrated) || migrated;
    migrated.saveVersion = version;
  }

  migrated.saveVersion = currentSaveVersion;
  return migrated;
}
