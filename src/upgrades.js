(() => {
function weaponIdForDef(weaponDefs, weapon) {
  return Object.keys(weaponDefs).find((id) => weaponDefs[id] === weapon);
}

function createUpgradeDefs(weaponDefs) {
  return [
    ...Object.values(weaponDefs).map((weapon) => {
      const weaponId = weaponIdForDef(weaponDefs, weapon);
      return {
        id: weapon.upgradeId,
        name: `${weapon.name} Damage`,
        description: `Increase ${weapon.name} damage.`,
        cost: [1, 2, 3],
        maxTier: 3,
        requiresWeapon: weaponId,
        requiresQuest: weapon.upgradeId === "laser_damage" ? "use_laser_run" : `${weaponId}_mastery`,
        opensQuest: weapon.upgradeId === "laser_damage" ? "laser_damage_5000" : null,
      };
    }),
    {
      id: "move_speed",
      name: "Move Speed",
      description: "Move faster during runs.",
      cost: [1, 2, 3],
      maxTier: 3,
      requiresNode: "unlock_laser",
      requiresQuest: "first_blood",
    },
    {
      id: "pickup_radius",
      name: "Pickup Radius",
      description: "Collect XP from farther away.",
      cost: [1, 2, 3],
      maxTier: 3,
      requiresNode: "unlock_frost_orb",
      requiresQuest: "gatherer",
    },
    {
      id: "max_hp",
      name: "Max HP",
      description: "Start each run with more health.",
      cost: [1, 2, 3],
      maxTier: 3,
      requiresNode: "unlock_shield_pulse",
      requiresQuest: "survivor_60",
    },
    {
      id: "attack_radius",
      name: "Attack Radius",
      description: "Increase projectile size and area weapon reach.",
      cost: [1, 2, 3],
      maxTier: 3,
      requiresNode: "unlock_flame_wave",
      requiresQuest: "crowd_control",
    },
    {
      id: "fire_rate",
      name: "Fire Rate",
      description: "Reduce weapon cooldowns.",
      cost: [1, 2, 3],
      maxTier: 3,
      requiresNode: "unlock_chain_spark",
      requiresQuest: "rapid_growth",
    },
    {
      id: "flat_damage",
      name: "Flat Damage",
      description: "Add fixed damage to every weapon hit.",
      cost: [1, 2, 3],
      maxTier: 3,
      requiresNode: "unlock_saw_drone",
      requiresQuest: "heavy_hits",
    },
    {
      id: "percent_damage",
      name: "Percent Damage",
      description: "Multiply all weapon damage.",
      cost: [1, 2, 3],
      maxTier: 3,
      requiresNode: "unlock_meteor_pin",
      requiresQuest: "boss_hunter",
    },
  ];
}

const runUpgradeDefs = [
  {
    id: "run_move_speed",
    name: "Move Speed",
    description: "Move faster for this run.",
    maxTier: 3,
    apply: (game) => (game.player.speed += 32),
  },
  {
    id: "run_pickup_radius",
    name: "Pickup Radius",
    description: "Collect XP from farther away this run.",
    maxTier: 3,
    apply: (game) => (game.player.pickupRadius += 22),
  },
  {
    id: "run_max_hp",
    name: "Max HP",
    description: "Recover and increase HP for this run.",
    maxTier: 3,
    apply: (game) => {
      game.player.maxHp += 18;
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + 36);
    },
  },
  {
    id: "run_attack_radius",
    name: "Attack Radius",
    description: "Increase projectile size and area reach for this run.",
    maxTier: 3,
  },
  {
    id: "run_fire_rate",
    name: "Fire Rate",
    description: "Reduce weapon cooldowns for this run.",
    maxTier: 3,
  },
  {
    id: "run_flat_damage",
    name: "Flat Damage",
    description: "Add fixed damage to every weapon hit this run.",
    maxTier: 3,
  },
  {
    id: "run_percent_damage",
    name: "Percent Damage",
    description: "Multiply all weapon damage this run.",
    maxTier: 3,
  },
];

globalThis.TapSurvivorUpgrades = {
  createUpgradeDefs,
  runUpgradeDefs,
};
})();
