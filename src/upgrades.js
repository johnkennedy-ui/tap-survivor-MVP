// GENERATED FILE. Do not edit directly.
// Source: src/modules/upgrades.js
// Run: npm run build:bridges
// Retired global: TapSurvivorUpgrades. Exports are supplied through the game dependency bag.
(() => {
  "use strict";

  /** @typedef {import("../types/content.js").GeneratedContent} GeneratedContent */
  /** @typedef {import("../types/content.js").ContentEntry} ContentEntry */
  /** @typedef {import("../types/content.js").RunUpgradeDef} RunUpgradeDef */
  /** @typedef {import("../types/content.js").WeaponDef} WeaponDef */
  /** @typedef {Record<string, WeaponDef>} WeaponDefs */
  /** @typedef {{ applyRunUpgradeEffects(game: object, effects: ContentEntry[]): void }} UpgradeEffects */
  /** @typedef {{ content?: GeneratedContent, effects?: UpgradeEffects }} CreateUpgradeContentOptions */

  /** @param {WeaponDefs} weaponDefs @param {WeaponDef} weapon @returns {string | undefined} */
  function weaponIdForDef(weaponDefs, weapon) {
    return Object.keys(weaponDefs).find((id) => weaponDefs[id] === weapon);
  }

  /** @param {CreateUpgradeContentOptions} [options] */
  function createUpgradeContent({ content = {}, effects } = {}) {
    const metaUpgradeDefs = content.metaUpgrades || [];
    /** @param {WeaponDefs} weaponDefs @returns {ContentEntry[]} */
    function createUpgradeDefs(weaponDefs) {
      return [
        ...Object.values(weaponDefs).map((weapon) => {
          const weaponId = weaponIdForDef(weaponDefs, weapon);
          return {
            id: weapon.upgradeId,
            name: `${weapon.name} Damage`,
            description: `Increase ${weapon.name} damage.`,
            cost: [1, 2, 3, 4, 5],
            maxTier: 5,
            requiresWeapon: weaponId,
            requiresQuest: weapon.upgradeId === "laser_damage" ? "use_laser_run" : `${weaponId}_mastery`,
            opensQuest: weapon.upgradeId === "laser_damage" ? "laser_damage_5000" : null,
          };
        }),
        ...metaUpgradeDefs,
      ];
    }

    /** @type {RunUpgradeDef[]} */
    const runUpgradeDefs = (content.runUpgrades || []).map((upgrade) => ({
      ...upgrade,
      apply: upgrade.effects?.length ? (game) => effects.applyRunUpgradeEffects(game, upgrade.effects) : undefined,
    }));

    return {
      createUpgradeDefs,
      runUpgradeDefs,
    };
  }
})();
