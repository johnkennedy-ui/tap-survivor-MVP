// GENERATED FILE. Do not edit directly.
// Source: src/modules/upgrades.js
// Run: npm run build:bridges
(() => {
  "use strict";

  function weaponIdForDef(weaponDefs, weapon) {
    return Object.keys(weaponDefs).find((id) => weaponDefs[id] === weapon);
  }

  function createUpgradeContent({ content = {}, effects = {} } = {}) {
    const metaUpgradeDefs = content.metaUpgrades || [];
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

    const runUpgradeDefs = (content.runUpgrades || []).map((upgrade) => ({
      ...upgrade,
      apply: upgrade.effects?.length ? (game) => effects.applyRunUpgradeEffects(game, upgrade.effects) : undefined,
    }));

    return {
      createUpgradeDefs,
      runUpgradeDefs,
    };
  }

  const defaultUpgradeContent = createUpgradeContent({
    content: globalThis.TapSurvivorContent || {},
    effects: globalThis.TapSurvivorEffects,
  });

  globalThis.TapSurvivorUpgrades = {
    createUpgradeContent,
    createUpgradeDefs: defaultUpgradeContent.createUpgradeDefs,
    runUpgradeDefs: defaultUpgradeContent.runUpgradeDefs,
  };
})();
