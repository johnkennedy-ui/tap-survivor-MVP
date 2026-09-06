/** @typedef {import("../../types/content.js").GeneratedContent} GeneratedContent */
/** @typedef {import("../../types/content.js").ContentEntry} ContentEntry */
/** @typedef {import("../../types/content.js").RunUpgradeDef} RunUpgradeDef */
/** @typedef {import("../../types/content.js").WeaponDef} WeaponDef */
/** @typedef {Record<string, WeaponDef>} WeaponDefs */
/** @typedef {{ applyRunUpgradeEffects(game: object, effects: ContentEntry[]): void }} UpgradeEffects */
/** @typedef {{ content?: GeneratedContent, effects?: UpgradeEffects }} CreateUpgradeContentOptions */

/** @param {WeaponDefs} weaponDefs @param {WeaponDef} weapon @returns {string | undefined} */
function weaponIdForDef(weaponDefs, weapon) {
  return Object.keys(weaponDefs).find((id) => weaponDefs[id] === weapon);
}

/** @param {CreateUpgradeContentOptions} [options] */
export function createUpgradeContent({ content = {}, effects } = {}) {
  /** @returns {ContentEntry[]} */
  function createUpgradeDefs(weaponDefs) {
    // QP progression is intentionally weapon-only. The production registry
    // marks retired entries explicitly; unmarked fixture content keeps the
    // generic helper contract used by module integration tests.
    const metaUpgradeDefs = content.metaUpgrades || [];
    if (metaUpgradeDefs.length && metaUpgradeDefs.every((upgrade) => upgrade.retired)) return [];
    return [
      ...Object.values(weaponDefs).map((weapon) => ({
        id: weapon.upgradeId,
        name: `${weapon.name} Damage`,
        description: `Increase ${weapon.name} damage.`,
        cost: [1, 2, 3, 4, 5],
        maxTier: 5,
        requiresWeapon: weaponIdForDef(weaponDefs, weapon),
      })),
      ...metaUpgradeDefs.filter((upgrade) => !upgrade.retired),
    ];
  }

  /** @param {WeaponDefs} weaponDefs @returns {RunUpgradeDef[]} */
  function weaponDamageRunUpgrades(weaponDefs) {
    // Weapon IDs generate their own run upgrade IDs (for example laser_damage).
    return Object.values(weaponDefs).map((weapon) => {
      const weaponId = weaponIdForDef(weaponDefs, weapon);
      return {
        id: weapon.upgradeId,
        name: `${weapon.name} Damage`,
        description: `Increase ${weapon.name} damage.`,
        maxTier: 5,
        requiresWeapon: weaponId,
      };
    });
  }

  /** @type {RunUpgradeDef[]} */
  const runUpgradeDefs = [
    ...(content.runUpgrades || []).map((upgrade) => ({
      ...upgrade,
      apply: upgrade.effects?.length
        ? (game) => effects.applyRunUpgradeEffects(game, upgrade.effects)
        : undefined,
    })),
    ...weaponDamageRunUpgrades(content.weapons || {}),
  ];

  return {
    createUpgradeDefs,
    runUpgradeDefs,
  };
}
