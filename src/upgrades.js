(() => {
function weaponIdForDef(weaponDefs, weapon) {
  return Object.keys(weaponDefs).find((id) => weaponDefs[id] === weapon);
}

function createUpgradeDefs(weaponDefs) {
  const metaUpgradeDefs = globalThis.TapSurvivorContent?.metaUpgrades || [];
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

function applyRunUpgradeEffects(game, effects) {
  (effects || []).forEach((effect) => {
    if (effect.type === "playerStatAdd") {
      game.player[effect.stat] += effect.value;
      return;
    }
    if (effect.type === "playerHeal") {
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + effect.value);
    }
  });
}

const runUpgradeDefs = (globalThis.TapSurvivorContent?.runUpgrades || []).map((upgrade) => ({
  ...upgrade,
  apply: upgrade.effects?.length ? (game) => applyRunUpgradeEffects(game, upgrade.effects) : undefined,
}));

globalThis.TapSurvivorUpgrades = {
  createUpgradeDefs,
  runUpgradeDefs,
};
})();
