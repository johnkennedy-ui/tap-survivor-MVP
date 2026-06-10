const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  startRun: document.getElementById("startRun"),
  resetSave: document.getElementById("resetSave"),
  openMenu: document.getElementById("openMenu"),
  closeMenu: document.getElementById("closeMenu"),
  closeLevelUp: document.getElementById("closeLevelUp"),
  runMenu: document.getElementById("runMenu"),
  runHud: document.getElementById("runHud"),
  qpHud: document.getElementById("qpHud"),
  menuQpHud: document.getElementById("menuQpHud"),
  tree: document.getElementById("tree"),
  menuTree: document.getElementById("menuTree"),
  quests: document.getElementById("quests"),
  menuQuests: document.getElementById("menuQuests"),
  levelUp: document.getElementById("levelUp"),
  choices: document.getElementById("choices"),
  endScreen: document.getElementById("endScreen"),
  runStats: document.getElementById("runStats"),
  closeEnd: document.getElementById("closeEnd"),
  closeEndX: document.getElementById("closeEndX"),
};

const saveKey = "tap-survivor-mvp-save-v2";

const weaponDefs = {
  spark_bolt: {
    name: "Spark Bolt",
    description: "Fast single-target projectile.",
    upgradeId: "spark_damage",
    cooldown: 0.55,
    damage: 12,
    kind: "projectile",
    speed: 420,
    radius: 5,
    color: "#ffd166",
  },
  prism_beam: {
    name: "Prism Beam",
    description: "Piercing laser line.",
    upgradeId: "laser_damage",
    cooldown: 1.2,
    damage: 32,
    kind: "beam",
    range: 430,
    width: 24,
    color: "#b794ff",
    opensQuest: "use_laser_run",
  },
  frost_orb: {
    name: "Frost Orb",
    description: "Slow projectile with heavier impact.",
    upgradeId: "frost_damage",
    cooldown: 0.95,
    damage: 22,
    kind: "projectile",
    speed: 300,
    radius: 8,
    color: "#8de7ff",
  },
  flame_wave: {
    name: "Flame Wave",
    description: "Short cone that burns nearby enemies.",
    upgradeId: "flame_damage",
    cooldown: 1.15,
    damage: 26,
    kind: "cone",
    range: 210,
    width: 62,
    color: "#ff8a4c",
  },
  saw_drone: {
    name: "Saw Drone",
    description: "Close-range rotating damage pulse.",
    upgradeId: "saw_damage",
    cooldown: 0.75,
    damage: 18,
    kind: "radial",
    range: 92,
    color: "#d8dde8",
  },
  void_mine: {
    name: "Void Mine",
    description: "Drops a delayed trap at your feet.",
    upgradeId: "void_damage",
    cooldown: 1.65,
    damage: 36,
    kind: "mine",
    range: 86,
    color: "#7964ff",
  },
  chain_spark: {
    name: "Chain Spark",
    description: "Jumps through several nearby enemies.",
    upgradeId: "chain_damage",
    cooldown: 1.05,
    damage: 18,
    kind: "chain",
    jumps: 4,
    range: 280,
    color: "#f6f871",
  },
  moon_glaive: {
    name: "Moon Glaive",
    description: "Large piercing blade projectile.",
    upgradeId: "glaive_damage",
    cooldown: 1.35,
    damage: 30,
    kind: "projectile",
    speed: 250,
    radius: 12,
    pierce: 3,
    color: "#b7f7d4",
  },
  meteor_pin: {
    name: "Meteor Pin",
    description: "Calls a strike on the nearest enemy.",
    upgradeId: "meteor_damage",
    cooldown: 1.8,
    damage: 44,
    kind: "target_area",
    range: 72,
    color: "#ff5f56",
  },
  acid_pool: {
    name: "Acid Pool",
    description: "Leaves a damaging patch under enemies.",
    upgradeId: "acid_damage",
    cooldown: 1.55,
    damage: 12,
    kind: "lingering_area",
    range: 86,
    duration: 2.4,
    tick: 0.45,
    color: "#9be564",
  },
  shield_pulse: {
    name: "Shield Pulse",
    description: "Reliable personal-space burst.",
    upgradeId: "shield_damage",
    cooldown: 1.25,
    damage: 24,
    kind: "radial",
    range: 128,
    color: "#64b5ff",
  },
  nova_burst: {
    name: "Nova Burst",
    description: "Slow, wide blast around the player.",
    upgradeId: "nova_damage",
    cooldown: 2.2,
    damage: 42,
    kind: "radial",
    range: 170,
    color: "#ff74c8",
  },
};

const weaponUnlocks = [
  {
    id: "unlock_laser",
    weaponId: "prism_beam",
    cost: 1,
    branch: "Core",
    requiresQuest: "spark_bolt_mastery",
    opensQuest: "use_laser_run",
  },
  {
    id: "unlock_frost_orb",
    weaponId: "frost_orb",
    cost: 1,
    branch: "Control",
    requiresNode: "unlock_laser",
    requiresQuest: "use_laser_run",
    opensQuest: "frost_orb_mastery",
  },
  {
    id: "unlock_flame_wave",
    weaponId: "flame_wave",
    cost: 1,
    branch: "Area",
    requiresNode: "unlock_laser",
    requiresQuest: "use_laser_run",
    opensQuest: "flame_wave_mastery",
  },
  {
    id: "unlock_chain_spark",
    weaponId: "chain_spark",
    cost: 1,
    branch: "Arc",
    requiresNode: "unlock_laser",
    requiresQuest: "use_laser_run",
    opensQuest: "chain_spark_mastery",
  },
  {
    id: "unlock_void_mine",
    weaponId: "void_mine",
    cost: 2,
    branch: "Control",
    requiresNode: "unlock_frost_orb",
    requiresQuest: "frost_orb_mastery",
    opensQuest: "void_mine_mastery",
  },
  {
    id: "unlock_acid_pool",
    weaponId: "acid_pool",
    cost: 2,
    branch: "Control",
    requiresNode: "unlock_frost_orb",
    requiresQuest: "frost_orb_mastery",
    opensQuest: "acid_pool_mastery",
  },
  {
    id: "unlock_saw_drone",
    weaponId: "saw_drone",
    cost: 2,
    branch: "Area",
    requiresNode: "unlock_flame_wave",
    requiresQuest: "flame_wave_mastery",
    opensQuest: "saw_drone_mastery",
  },
  {
    id: "unlock_shield_pulse",
    weaponId: "shield_pulse",
    cost: 2,
    branch: "Area",
    requiresNode: "unlock_flame_wave",
    requiresQuest: "flame_wave_mastery",
    opensQuest: "shield_pulse_mastery",
  },
  {
    id: "unlock_moon_glaive",
    weaponId: "moon_glaive",
    cost: 2,
    branch: "Arc",
    requiresNode: "unlock_chain_spark",
    requiresQuest: "chain_spark_mastery",
    opensQuest: "moon_glaive_mastery",
  },
  {
    id: "unlock_meteor_pin",
    weaponId: "meteor_pin",
    cost: 3,
    branch: "Arc",
    requiresNode: "unlock_moon_glaive",
    requiresQuest: "moon_glaive_mastery",
    opensQuest: "meteor_pin_mastery",
  },
  {
    id: "unlock_nova_burst",
    weaponId: "nova_burst",
    cost: 3,
    branch: "Core",
    requiresNode: "unlock_shield_pulse",
    requiresQuest: "shield_pulse_mastery",
    opensQuest: "nova_burst_mastery",
  },
];

const upgradeDefs = [
  ...Object.values(weaponDefs).map((weapon) => ({
    id: weapon.upgradeId,
    name: `${weapon.name} Damage`,
    description: `Increase ${weapon.name} damage.`,
    cost: [1, 2, 3],
    maxTier: 3,
    requiresWeapon: Object.keys(weaponDefs).find((id) => weaponDefs[id] === weapon),
    requiresQuest:
      weapon.upgradeId === "laser_damage" ? "use_laser_run" : `${Object.keys(weaponDefs).find((id) => weaponDefs[id] === weapon)}_mastery`,
    opensQuest: weapon.upgradeId === "laser_damage" ? "laser_damage_5000" : null,
  })),
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

const questDefs = {
  spark_bolt_mastery: {
    name: "Spark Basics",
    description: "Deal 300 damage with Spark Bolt.",
    weaponId: "spark_bolt",
    target: 300,
    rewardQp: 1,
    opensQuest: "heavy_hits",
  },
  first_blood: {
    name: "First Blood",
    description: "Defeat 15 enemies.",
    target: 15,
    rewardQp: 1,
    opensQuest: "crowd_control",
  },
  gatherer: {
    name: "Field Gatherer",
    description: "Collect 25 XP gems.",
    target: 25,
    rewardQp: 1,
    opensQuest: "rapid_growth",
    opensQuests: ["gem_hoarder"],
  },
  survivor_60: {
    name: "Hold the Line",
    description: "Survive for 60 seconds.",
    target: 60,
    rewardQp: 1,
    opensQuest: "survivor_180",
  },
  crowd_control: {
    name: "Crowd Control",
    description: "Defeat 50 enemies.",
    target: 50,
    rewardQp: 2,
    opensQuest: "exterminator",
  },
  rapid_growth: {
    name: "Rapid Growth",
    description: "Gain 4 levels.",
    target: 4,
    rewardQp: 2,
    opensQuest: "power_climb",
  },
  heavy_hits: {
    name: "Heavy Hits",
    description: "Deal 2,500 total weapon damage.",
    target: 2500,
    rewardQp: 2,
    opensQuest: "damage_dealer",
  },
  survivor_180: {
    name: "Long Stand",
    description: "Survive for 180 seconds.",
    target: 180,
    rewardQp: 2,
    opensQuest: "survivor_300",
  },
  survivor_300: {
    name: "Five-Minute Stand",
    description: "Survive for 300 seconds.",
    target: 300,
    rewardQp: 3,
  },
  exterminator: {
    name: "Exterminator",
    description: "Defeat 150 enemies.",
    target: 150,
    rewardQp: 3,
    opensQuest: "reaper",
  },
  reaper: {
    name: "Reaper",
    description: "Defeat 350 enemies.",
    target: 350,
    rewardQp: 4,
  },
  power_climb: {
    name: "Power Climb",
    description: "Gain 8 levels.",
    target: 8,
    rewardQp: 3,
    opensQuest: "apex_growth",
  },
  apex_growth: {
    name: "Apex Growth",
    description: "Gain 12 levels.",
    target: 12,
    rewardQp: 4,
  },
  damage_dealer: {
    name: "Damage Dealer",
    description: "Deal 10,000 total weapon damage.",
    target: 10000,
    rewardQp: 3,
    opensQuest: "apocalypse_damage",
  },
  apocalypse_damage: {
    name: "Apocalypse Damage",
    description: "Deal 25,000 total weapon damage.",
    target: 25000,
    rewardQp: 4,
  },
  gem_hoarder: {
    name: "Gem Hoarder",
    description: "Collect 75 XP gems.",
    target: 75,
    rewardQp: 2,
    opensQuest: "gem_flood",
  },
  gem_flood: {
    name: "Gem Flood",
    description: "Collect 150 XP gems.",
    target: 150,
    rewardQp: 3,
  },
  use_laser_run: {
    name: "Use Laser in a run",
    description: "Fire Prism Beam during a run.",
    weaponId: "prism_beam",
    target: 1,
    rewardQp: 2,
  },
  laser_damage_5000: {
    name: "Deal 5,000 damage with Laser",
    description: "Deal 5,000 total damage with Prism Beam.",
    weaponId: "prism_beam",
    target: 5000,
    rewardQp: 2,
  },
  frost_orb_mastery: {
    name: "Frost Control",
    description: "Deal 350 damage with Frost Orb.",
    weaponId: "frost_orb",
    target: 350,
    rewardQp: 2,
  },
  flame_wave_mastery: {
    name: "Flame Sweep",
    description: "Deal 350 damage with Flame Wave.",
    weaponId: "flame_wave",
    target: 350,
    rewardQp: 2,
  },
  chain_spark_mastery: {
    name: "Arc Current",
    description: "Deal 350 damage with Chain Spark.",
    weaponId: "chain_spark",
    target: 350,
    rewardQp: 2,
  },
  void_mine_mastery: {
    name: "Trap Field",
    description: "Deal 500 damage with Void Mine.",
    weaponId: "void_mine",
    target: 500,
    rewardQp: 2,
  },
  acid_pool_mastery: {
    name: "Corrosion Field",
    description: "Deal 500 damage with Acid Pool.",
    weaponId: "acid_pool",
    target: 500,
    rewardQp: 2,
  },
  saw_drone_mastery: {
    name: "Close Orbit",
    description: "Deal 500 damage with Saw Drone.",
    weaponId: "saw_drone",
    target: 500,
    rewardQp: 2,
  },
  shield_pulse_mastery: {
    name: "Pulse Guard",
    description: "Deal 500 damage with Shield Pulse.",
    weaponId: "shield_pulse",
    target: 500,
    rewardQp: 2,
  },
  moon_glaive_mastery: {
    name: "Lunar Cut",
    description: "Deal 650 damage with Moon Glaive.",
    weaponId: "moon_glaive",
    target: 650,
    rewardQp: 3,
  },
  meteor_pin_mastery: {
    name: "Meteor Mark",
    description: "Deal 800 damage with Meteor Pin.",
    weaponId: "meteor_pin",
    target: 800,
    rewardQp: 3,
  },
  nova_burst_mastery: {
    name: "Nova Core",
    description: "Deal 1,000 damage with Nova Burst.",
    weaponId: "nova_burst",
    target: 1000,
    rewardQp: 4,
  },
  boss_hunter: {
    name: "Boss Hunter",
    description: "Defeat the 6-minute boss.",
    target: 1,
    rewardQp: 4,
  },
};

const starterQuestIds = ["spark_bolt_mastery", "first_blood", "gatherer", "survivor_60"];
const killQuestIds = ["first_blood", "crowd_control", "exterminator", "reaper"];
const damageQuestIds = ["heavy_hits", "damage_dealer", "apocalypse_damage"];
const survivalQuestIds = ["survivor_60", "survivor_180", "survivor_300"];
const xpQuestIds = ["gatherer", "gem_hoarder", "gem_flood"];
const levelQuestIds = ["rapid_growth", "power_climb", "apex_growth"];

const runUpgradeDefs = [
  {
    id: "run_move_speed",
    name: "Move Speed",
    description: "Move faster for this run.",
    maxTier: 3,
    apply: () => (game.player.speed += 32),
  },
  {
    id: "run_pickup_radius",
    name: "Pickup Radius",
    description: "Collect XP from farther away this run.",
    maxTier: 3,
    apply: () => (game.player.pickupRadius += 22),
  },
  {
    id: "run_max_hp",
    name: "Max HP",
    description: "Recover and increase HP for this run.",
    maxTier: 3,
    apply: () => {
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

const enemyTypes = [
  {
    id: "drifter",
    name: "Drifter",
    color: "#f06a78",
    radius: 13,
    hp: 18,
    hpScale: 0.12,
    speed: 52,
    speedScale: 0.08,
    damage: 9,
    touchCooldown: 0.55,
    xp: 1,
  },
  {
    id: "skitter",
    name: "Skitter",
    color: "#ffd166",
    radius: 9,
    hp: 11,
    hpScale: 0.08,
    speed: 94,
    speedScale: 0.12,
    damage: 7,
    touchCooldown: 0.38,
    xp: 1,
  },
  {
    id: "bulwark",
    name: "Bulwark",
    color: "#8de7ff",
    radius: 20,
    hp: 56,
    hpScale: 0.2,
    speed: 34,
    speedScale: 0.04,
    damage: 14,
    touchCooldown: 0.75,
    xp: 2,
  },
];

let save = loadSave();
let game = null;
let lastFrame = performance.now();

function defaultSave() {
  return {
    coins: 0,
    questPoints: 0,
    totalQuestPoints: 0,
    unlockedNodes: [],
    unlockedWeapons: ["spark_bolt"],
    upgradeTiers: {},
    unlockedUpgrades: [],
    activeQuests: [...starterQuestIds],
    completedQuests: [],
    questProgress: {},
  };
}

function loadSave() {
  try {
    const raw = localStorage.getItem(saveKey) || localStorage.getItem("tap-survivor-mvp-save-v1");
    const loaded = raw ? JSON.parse(raw) : {};
    return normalizeSave({ ...defaultSave(), ...loaded });
  } catch {
    return defaultSave();
  }
}

function normalizeSave(input) {
  const normalized = { ...defaultSave(), ...input };
  normalized.unlockedWeapons = [...new Set(["spark_bolt", ...(normalized.unlockedWeapons || [])])];
  normalized.coins = Math.max(0, Math.floor(normalized.coins || 0));
  normalized.unlockedNodes = normalized.unlockedNodes || [];
  normalized.upgradeTiers = normalized.upgradeTiers || {};
  normalized.activeQuests = normalized.activeQuests || [];
  normalized.completedQuests = normalized.completedQuests || [];
  normalized.questProgress = normalized.questProgress || {};
  const ensureQuestOpen = (questId) => {
    if (!questId || !questDefs[questId]) return;
    if (!normalized.activeQuests.includes(questId) && !normalized.completedQuests.includes(questId)) {
      normalized.activeQuests.push(questId);
    }
    normalized.questProgress[questId] = normalized.questProgress[questId] || 0;
  };
  starterQuestIds.forEach((questId) => {
    ensureQuestOpen(questId);
  });
  normalized.completedQuests.forEach((questId) => {
    questOpenIds(questDefs[questId]).forEach(ensureQuestOpen);
  });
  normalized.unlockedNodes.forEach((nodeId) => {
    const unlock = weaponUnlocks.find((node) => node.id === nodeId);
    ensureQuestOpen(unlock?.opensQuest);
  });
  (normalized.unlockedUpgrades || []).forEach((id) => {
    normalized.upgradeTiers[id] = Math.max(normalized.upgradeTiers[id] || 0, 1);
  });
  Object.entries(normalized.upgradeTiers).forEach(([upgradeId, tier]) => {
    if (tier > 0) {
      const upgrade = upgradeDefs.find((item) => item.id === upgradeId);
      ensureQuestOpen(upgrade?.opensQuest);
    }
  });
  normalized.unlockedUpgrades = Object.entries(normalized.upgradeTiers)
    .filter(([, tier]) => tier > 0)
    .map(([id]) => id);
  return normalized;
}

function persist() {
  save.unlockedUpgrades = Object.entries(save.upgradeTiers)
    .filter(([, tier]) => tier > 0)
    .map(([id]) => id);
  localStorage.setItem(saveKey, JSON.stringify(save));
}

function hasNode(id) {
  return save.unlockedNodes.includes(id);
}

function getUpgradeTier(id) {
  return Math.min(3, save.upgradeTiers[id] || 0);
}

function isQuestComplete(id) {
  return !id || save.completedQuests.includes(id);
}

function questOpenIds(quest) {
  return [quest?.opensQuest, ...(quest?.opensQuests || [])].filter(Boolean);
}

function weaponUnlockFor(weaponId) {
  return weaponUnlocks.find((unlock) => unlock.weaponId === weaponId);
}

function isNodeVisible(node) {
  return !node.requiresNode || hasNode(node.requiresNode);
}

function nodeGateStatus(node) {
  if (node.requiresNode && !hasNode(node.requiresNode)) {
    return `Requires ${labelUnlock(node.requiresNode)}`;
  }
  if (node.requiresQuest && !isQuestComplete(node.requiresQuest)) {
    return `Complete quest: ${questDefs[node.requiresQuest]?.name || node.requiresQuest}`;
  }
  if (save.questPoints < node.cost) {
    return `Needs ${node.cost} QP`;
  }
  return "";
}

function canBuyNode(node) {
  return !nodeGateStatus(node);
}

function labelUnlock(id) {
  const unlock = weaponUnlocks.find((node) => node.id === id);
  return unlock ? weaponDefs[unlock.weaponId].name : id;
}

function hasQuest(id) {
  return save.activeQuests.includes(id) || save.completedQuests.includes(id);
}

function openQuest(id) {
  if (!questDefs[id] || hasQuest(id)) return;
  save.activeQuests.push(id);
  save.questProgress[id] = save.questProgress[id] || 0;
  persist();
}

function completeQuest(id) {
  if (!save.activeQuests.includes(id) || save.completedQuests.includes(id)) return;
  save.activeQuests = save.activeQuests.filter((questId) => questId !== id);
  save.completedQuests.push(id);
  const reward = questDefs[id].rewardQp || 0;
  save.questPoints += reward;
  save.totalQuestPoints += reward;
  questOpenIds(questDefs[id]).forEach(openQuest);
  persist();
  renderMeta();
}

function addQuestProgress(id, amount) {
  if (!questDefs[id] || !save.activeQuests.includes(id)) return;
  save.questProgress[id] = Math.min(
    questDefs[id].target,
    (save.questProgress[id] || 0) + amount,
  );
  if (save.questProgress[id] >= questDefs[id].target) completeQuest(id);
}

function addQuestProgressGroup(ids, amount) {
  ids.forEach((questId) => addQuestProgress(questId, amount));
}

function buyWeaponUnlock(unlock) {
  if (hasNode(unlock.id) || !canBuyNode(unlock)) return;
  save.questPoints -= unlock.cost;
  save.unlockedNodes.push(unlock.id);
  if (!save.unlockedWeapons.includes(unlock.weaponId)) {
    save.unlockedWeapons.push(unlock.weaponId);
  }
  if (unlock.opensQuest) openQuest(unlock.opensQuest);
  persist();
  renderMeta();
}

function buyUpgrade(upgrade) {
  const tier = getUpgradeTier(upgrade.id);
  if (tier >= upgrade.maxTier) return;
  if (upgrade.requiresWeapon && !save.unlockedWeapons.includes(upgrade.requiresWeapon)) return;
  if (upgrade.requiresNode && !hasNode(upgrade.requiresNode)) return;
  if (upgrade.requiresQuest && !isQuestComplete(upgrade.requiresQuest)) return;
  const cost = upgrade.cost[tier];
  if (save.questPoints < cost) return;
  save.questPoints -= cost;
  save.upgradeTiers[upgrade.id] = tier + 1;
  if (upgrade.opensQuest && tier === 0) openQuest(upgrade.opensQuest);
  persist();
  applyRunMetaUpgrades();
  renderMeta();
}

function renderMeta() {
  const qpText = `Coins: ${save.coins} | Quest Points: ${save.questPoints} available, ${save.totalQuestPoints} earned.`;
  ui.qpHud.textContent = qpText;
  ui.menuQpHud.textContent = qpText;

  renderTree(ui.tree);
  renderTree(ui.menuTree);
  renderQuests(ui.quests);
  renderQuests(ui.menuQuests);
}

function renderTree(container) {
  container.innerHTML = "";
  const availableWeaponUnlocks = weaponUnlocks.filter((unlock) => !hasNode(unlock.id) && isNodeVisible(unlock));
  const availableUpgrades = upgradeDefs.filter((upgrade) => {
    const tier = getUpgradeTier(upgrade.id);
    if (tier >= upgrade.maxTier) return false;
    if (upgrade.requiresWeapon && !save.unlockedWeapons.includes(upgrade.requiresWeapon)) return false;
    if (upgrade.requiresNode && !hasNode(upgrade.requiresNode)) return false;
    return !upgrade.requiresQuest || isQuestComplete(upgrade.requiresQuest);
  });

  if (!availableWeaponUnlocks.length && !availableUpgrades.length) {
    const empty = document.createElement("div");
    empty.className = "node";
    empty.textContent = "No available skill nodes. Complete active quests to reveal the next branch.";
    container.appendChild(empty);
    return;
  }

  availableWeaponUnlocks.forEach((unlock) => {
    const weapon = weaponDefs[unlock.weaponId];
    const gateStatus = nodeGateStatus(unlock);
    const el = document.createElement("div");
    el.className = `node ${gateStatus ? "locked" : "available"}`;
    el.innerHTML = `
      <strong>Unlock ${weapon.name}</strong>
      <span>${weapon.description}</span><br />
      <span>Branch: ${unlock.branch} | Cost: ${unlock.cost} QP</span><br />
      <span>${gateStatus || "Ready to unlock"}</span>
    `;
    const button = document.createElement("button");
    button.textContent = gateStatus ? "Locked" : "Unlock";
    button.disabled = Boolean(gateStatus);
    button.addEventListener("click", () => buyWeaponUnlock(unlock));
    el.appendChild(button);
    container.appendChild(el);
  });

  availableUpgrades.forEach((upgrade) => {
    const tier = getUpgradeTier(upgrade.id);
    const nextCost = upgrade.cost[tier];
    const canBuy = save.questPoints >= nextCost;
    const el = document.createElement("div");
    el.className = `node ${canBuy ? "available" : "locked"}`;
    el.innerHTML = `
      <strong>${upgrade.name}</strong>
      <span>${upgrade.description}</span><br />
      <span>Tier: ${tier}/${upgrade.maxTier}</span><br />
      <span>${canBuy ? `Next cost: ${nextCost} QP` : `Needs ${nextCost} QP`}</span>
    `;
    const button = document.createElement("button");
    button.textContent = `Buy Tier ${tier + 1}`;
    button.disabled = !canBuy;
    button.addEventListener("click", () => buyUpgrade(upgrade));
    el.appendChild(button);
    container.appendChild(el);
  });
}

function renderQuests(container) {
  container.innerHTML = "";
  const activeQuestIds = Object.keys(questDefs).filter((id) => save.activeQuests.includes(id));
  if (!activeQuestIds.length) {
    const empty = document.createElement("div");
    empty.className = "quest";
    empty.textContent = "No active quests. Unlock the next available skill node to reveal one.";
    container.appendChild(empty);
    return;
  }

  activeQuestIds.forEach((id) => {
    const quest = questDefs[id];
    const progress = save.questProgress[id] || 0;
    const el = document.createElement("div");
    el.className = "quest active";
    el.innerHTML = `
      <strong>${quest.name}</strong>
      <span>${quest.description}</span><br />
      <span>Status: Active</span><br />
      <span>Progress: ${Math.floor(progress)} / ${quest.target}</span><br />
      <span>Reward: ${quest.rewardQp} QP</span>
    `;
    container.appendChild(el);
  });
}

function resetGameState() {
  const moveTier = getUpgradeTier("move_speed");
  const pickupTier = getUpgradeTier("pickup_radius");
  const hpTier = getUpgradeTier("max_hp");
  const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    targetX: canvas.width / 2,
    targetY: canvas.height / 2,
    radius: 16,
    speed: 185 + moveTier * 24,
    hp: 100 + hpTier * 20,
    maxHp: 100 + hpTier * 20,
    pickupRadius: 54 + pickupTier * 18,
    xp: 0,
    level: 1,
    xpToLevel: 5,
    equippedWeapons: ["spark_bolt"],
  };

  game = {
    running: true,
    paused: false,
    pauseReason: "",
    elapsed: 0,
    duration: 360,
    bossSpawned: false,
    bossDefeated: false,
    player,
    enemies: [],
    xpDrops: [],
    lootDrops: [],
    bolts: [],
    beams: [],
    areas: [],
    weaponTimers: {},
    runUpgradeTiers: {},
    spawnTimer: 0,
    kills: 0,
    xpCollected: 0,
    laserDamage: 0,
    weaponDamage: {},
    levelUps: 0,
    endReason: "",
  };
}

function startRun() {
  ui.endScreen.classList.add("hidden");
  ui.levelUp.classList.add("hidden");
  closeRunMenu(false);
  resetGameState();
}

function endRun(reason) {
  if (!game) return;
  game.running = false;
  game.endReason = reason;
  ui.runStats.innerHTML = `
    <p>Result: ${reason}</p>
    <p>Time survived: ${formatTime(game.elapsed)}</p>
    <p>Enemies defeated: ${game.kills}</p>
    <p>Level reached: ${game.player.level}</p>
    <p>XP collected: ${game.xpCollected}</p>
    <p>Coins banked: ${save.coins}</p>
    <p>Laser damage dealt: ${Math.floor(game.laserDamage)}</p>
    <p>Quest Points: ${save.questPoints} available</p>
  `;
  ui.endScreen.classList.remove("hidden");
  persist();
  renderMeta();
}

function update(dt) {
  if (!game || !game.running || game.paused) return;
  const p = game.player;
  game.elapsed += dt;
  addQuestProgressGroup(survivalQuestIds, dt);
  if (game.elapsed >= game.duration) {
    spawnBoss();
  }

  movePlayer(p, dt);
  spawnEnemies(dt);
  updateEnemies(dt);
  updateWeapons(dt);
  updateBolts(dt);
  updateAreas(dt);
  updateBeams(dt);
  updateXpDrops();
  updateLootDrops();

  if (p.hp <= 0) endRun("Player defeated");
}

function movePlayer(p, dt) {
  const dx = p.targetX - p.x;
  const dy = p.targetY - p.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 3) {
    const step = Math.min(dist, p.speed * dt);
    p.x += (dx / dist) * step;
    p.y += (dy / dist) * step;
  }
  p.x = clamp(p.x, 18, canvas.width - 18);
  p.y = clamp(p.y, 18, canvas.height - 18);
}

function spawnEnemies(dt) {
  game.spawnTimer -= dt;
  if (game.spawnTimer > 0) return;
  game.spawnTimer = Math.max(0.35, 1.1 - game.elapsed / 150);
  spawnPatternPositions(2).forEach((position, index) => {
    const type = chooseEnemyType(index);
    spawnEnemy(type, position);
  });
}

function availableEnemyTypes() {
  return enemyTypes.slice(0, Math.min(enemyTypes.length, 1 + Math.floor(game.elapsed / 30)));
}

function chooseEnemyType(offset = 0) {
  const available = availableEnemyTypes();
  return available[(Math.floor(Math.random() * available.length) + offset) % available.length];
}

function spawnPatternPositions(count) {
  const p = game.player;
  const baseAngle = Math.random() * Math.PI * 2;
  const pattern = Math.floor(Math.random() * 4);
  return Array.from({ length: count }, (_, index) => {
    const mirrored = index % 2 === 0 ? 0 : Math.PI;
    const angleOffsets = [mirrored, index * 0.85, (index - 0.5) * 0.55, index * 1.7];
    const radiusOffsets = [0, index * 42, index % 2 === 0 ? -45 : 70, index * 95];
    const angle = baseAngle + angleOffsets[pattern];
    const radius = 220 + Math.random() * 110 + radiusOffsets[pattern];
    return {
      x: clamp(p.x + Math.cos(angle) * radius, 18, canvas.width - 18),
      y: clamp(p.y + Math.sin(angle) * radius, 18, canvas.height - 18),
    };
  });
}

function spawnEnemy(type, position) {
  game.enemies.push({
    type: type.id,
    name: type.name,
    color: type.color,
    x: position.x,
    y: position.y,
    radius: type.radius,
    hp: type.hp + game.elapsed * type.hpScale,
    speed: type.speed + game.elapsed * type.speedScale,
    damage: type.damage,
    touchCooldown: type.touchCooldown,
    xp: type.xp,
    touchTimer: 0,
  });
}

function spawnBoss() {
  if (game.bossSpawned) return;
  game.bossSpawned = true;
  game.enemies.push({
    boss: true,
    x: canvas.width / 2,
    y: -52,
    radius: 38,
    hp: 1400 + game.kills * 6,
    maxHp: 1400 + game.kills * 6,
    speed: 42,
    damage: 22,
    touchCooldown: 0.8,
    touchTimer: 0,
  });
}

function updateEnemies(dt) {
  const p = game.player;
  game.enemies.forEach((enemy) => {
    const dx = p.x - enemy.x;
    const dy = p.y - enemy.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    enemy.x += (dx / dist) * enemy.speed * dt;
    enemy.y += (dy / dist) * enemy.speed * dt;
    enemy.touchTimer -= dt;
    if (dist < p.radius + enemy.radius && enemy.touchTimer <= 0) {
      p.hp -= enemy.damage;
      enemy.touchTimer = enemy.touchCooldown;
    }
  });
}

function updateWeapons(dt) {
  game.player.equippedWeapons.forEach((weaponId) => {
    const weapon = weaponDefs[weaponId];
    game.weaponTimers[weaponId] = (game.weaponTimers[weaponId] || 0) - dt;
    if (game.weaponTimers[weaponId] <= 0) {
      game.weaponTimers[weaponId] = weaponCooldown(weapon);
      fireWeapon(weaponId);
    }
  });
}

function getRunUpgradeTier(id) {
  return Math.min(3, game?.runUpgradeTiers?.[id] || 0);
}

function weaponCooldown(weapon) {
  const rateTier = getUpgradeTier("fire_rate") + getRunUpgradeTier("run_fire_rate");
  return weapon.cooldown / (1 + rateTier * 0.12);
}

function weaponReach(weapon) {
  const radiusTier = getUpgradeTier("attack_radius") + getRunUpgradeTier("run_attack_radius");
  return (weapon.range || 0) * (1 + radiusTier * 0.12);
}

function weaponWidth(weapon) {
  const radiusTier = getUpgradeTier("attack_radius") + getRunUpgradeTier("run_attack_radius");
  return (weapon.width || 0) * (1 + radiusTier * 0.1);
}

function projectileRadius(weapon) {
  const radiusTier = getUpgradeTier("attack_radius") + getRunUpgradeTier("run_attack_radius");
  return (weapon.radius || 0) * (1 + radiusTier * 0.12);
}

function weaponDamage(weaponId) {
  const weapon = weaponDefs[weaponId];
  const flatTier = getUpgradeTier("flat_damage") + getRunUpgradeTier("run_flat_damage");
  const percentTier =
    getUpgradeTier("percent_damage") +
    getRunUpgradeTier("run_percent_damage") +
    getUpgradeTier(weapon.upgradeId) * 2;
  return (weapon.damage + flatTier * 4) * (1 + percentTier * 0.12);
}

function fireWeapon(weaponId) {
  const weapon = weaponDefs[weaponId];
  if (!weapon) return;
  if (weapon.kind === "radial") fireRadial(weaponId);
  if (weapon.kind === "beam") fireBeam(weaponId);
  if (weapon.kind === "cone") fireCone(weaponId);
  if (weapon.kind === "chain") fireChain(weaponId);
  if (weapon.kind === "projectile") fireProjectile(weaponId);
  if (weapon.kind === "target_area") fireTargetArea(weaponId);
  if (weapon.kind === "lingering_area") fireLingeringArea(weaponId);
  if (weapon.kind === "mine") fireMine(weaponId);
}

function fireProjectile(weaponId) {
  const weapon = weaponDefs[weaponId];
  const target = nearestEnemy();
  if (!target) return;
  const p = game.player;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  game.bolts.push({
    weaponId,
    x: p.x,
    y: p.y,
    vx: (dx / dist) * weapon.speed,
    vy: (dy / dist) * weapon.speed,
    radius: projectileRadius(weapon),
    damage: weaponDamage(weaponId),
    life: 1.8,
    pierce: weapon.pierce || 0,
    hit: new Set(),
    color: weapon.color,
  });
}

function fireBeam(weaponId) {
  const weapon = weaponDefs[weaponId];
  const target = nearestEnemy();
  if (!target) return;
  const p = game.player;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const dirX = dx / dist;
  const dirY = dy / dist;
  let dealt = 0;

  game.enemies.forEach((enemy) => {
    const toEnemyX = enemy.x - p.x;
    const toEnemyY = enemy.y - p.y;
    const along = toEnemyX * dirX + toEnemyY * dirY;
    const reach = weaponReach(weapon);
    if (along < 0 || along > reach) return;
    const side = Math.abs(toEnemyX * dirY - toEnemyY * dirX);
    if (side <= weaponWidth(weapon) + enemy.radius) {
      dealt += damageEnemy(enemy, weaponDamage(weaponId), weaponId);
    }
  });

  if (dealt > 0 && weaponId === "prism_beam") {
    game.laserDamage += dealt;
    addQuestProgress("use_laser_run", 1);
    addQuestProgress("laser_damage_5000", dealt);
  }

  game.beams.push({
    x: p.x,
    y: p.y,
    endX: p.x + dirX * weaponReach(weapon),
    endY: p.y + dirY * weaponReach(weapon),
    width: 10,
    color: weapon.color,
    life: 0.16,
  });
  reapEnemies();
}

function fireCone(weaponId) {
  const weapon = weaponDefs[weaponId];
  const target = nearestEnemy();
  if (!target) return;
  const p = game.player;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const dirX = dx / dist;
  const dirY = dy / dist;
  game.enemies.forEach((enemy) => {
    const toEnemyX = enemy.x - p.x;
    const toEnemyY = enemy.y - p.y;
    const along = toEnemyX * dirX + toEnemyY * dirY;
    const reach = weaponReach(weapon);
    if (along < 0 || along > reach) return;
    const side = Math.abs(toEnemyX * dirY - toEnemyY * dirX);
    if (side <= weaponWidth(weapon)) damageEnemy(enemy, weaponDamage(weaponId), weaponId);
  });
  game.beams.push({
    x: p.x,
    y: p.y,
    endX: p.x + dirX * weaponReach(weapon),
    endY: p.y + dirY * weaponReach(weapon),
    width: weaponWidth(weapon),
    color: weapon.color,
    life: 0.14,
  });
  reapEnemies();
}

function fireRadial(weaponId) {
  const weapon = weaponDefs[weaponId];
  const p = game.player;
  game.enemies.forEach((enemy) => {
    if (distance(p, enemy) <= weaponReach(weapon) + enemy.radius) {
      damageEnemy(enemy, weaponDamage(weaponId), weaponId);
    }
  });
  game.areas.push({
    x: p.x,
    y: p.y,
    radius: weaponReach(weapon),
    color: weapon.color,
    life: 0.24,
    visualOnly: true,
  });
  reapEnemies();
}

function fireChain(weaponId) {
  const weapon = weaponDefs[weaponId];
  const p = game.player;
  const targets = [...game.enemies]
    .sort((a, b) => distance(p, a) - distance(p, b))
    .slice(0, weapon.jumps);
  let from = p;
  targets.forEach((enemy) => {
    if (distance(from, enemy) > weaponReach(weapon)) return;
    damageEnemy(enemy, weaponDamage(weaponId), weaponId);
    game.beams.push({
      x: from.x,
      y: from.y,
      endX: enemy.x,
      endY: enemy.y,
      width: 4,
      color: weapon.color,
      life: 0.12,
    });
    from = enemy;
  });
  reapEnemies();
}

function fireTargetArea(weaponId) {
  const weapon = weaponDefs[weaponId];
  const target = nearestEnemy();
  if (!target) return;
  game.enemies.forEach((enemy) => {
    if (distance(target, enemy) <= weaponReach(weapon) + enemy.radius) {
      damageEnemy(enemy, weaponDamage(weaponId), weaponId);
    }
  });
  game.areas.push({
    x: target.x,
    y: target.y,
    radius: weaponReach(weapon),
    color: weapon.color,
    life: 0.28,
    visualOnly: true,
  });
  reapEnemies();
}

function fireLingeringArea(weaponId) {
  const weapon = weaponDefs[weaponId];
  const target = nearestEnemy();
  if (!target) return;
  game.areas.push({
    weaponId,
    x: target.x,
    y: target.y,
    radius: weaponReach(weapon),
    color: weapon.color,
    life: weapon.duration,
    tick: weapon.tick,
    tickTimer: 0,
    damage: weaponDamage(weaponId),
  });
}

function fireMine(weaponId) {
  const weapon = weaponDefs[weaponId];
  const p = game.player;
  game.areas.push({
    weaponId,
    x: p.x,
    y: p.y,
    radius: weaponReach(weapon),
    color: weapon.color,
    life: 1.1,
    tick: 1.1,
    tickTimer: 0.18,
    damage: weaponDamage(weaponId),
  });
}

function updateBolts(dt) {
  game.bolts.forEach((bolt) => {
    bolt.x += bolt.vx * dt;
    bolt.y += bolt.vy * dt;
    bolt.life -= dt;
    const enemy = game.enemies.find(
      (candidate) =>
        !bolt.hit.has(candidate) && distance(bolt, candidate) < bolt.radius + candidate.radius,
    );
    if (enemy) {
      damageEnemy(enemy, bolt.damage, bolt.weaponId);
      bolt.hit.add(enemy);
      if (bolt.pierce > 0) {
        bolt.pierce -= 1;
      } else {
        bolt.life = 0;
      }
    }
  });
  game.bolts = game.bolts.filter((bolt) => bolt.life > 0);
  reapEnemies();
}

function updateAreas(dt) {
  game.areas.forEach((area) => {
    area.life -= dt;
    if (area.visualOnly || !area.weaponId) return;
    area.tickTimer -= dt;
    if (area.tickTimer > 0) return;
    area.tickTimer = area.tick;
    game.enemies.forEach((enemy) => {
      if (distance(area, enemy) <= area.radius + enemy.radius) {
        damageEnemy(enemy, area.damage, area.weaponId);
      }
    });
  });
  game.areas = game.areas.filter((area) => area.life > 0);
  reapEnemies();
}

function updateBeams(dt) {
  game.beams.forEach((beam) => (beam.life -= dt));
  game.beams = game.beams.filter((beam) => beam.life > 0);
}

function damageEnemy(enemy, amount, weaponId) {
  const before = enemy.hp;
  enemy.hp -= amount;
  const dealt = Math.max(0, Math.min(before, amount));
  game.weaponDamage[weaponId] = (game.weaponDamage[weaponId] || 0) + dealt;
  addQuestProgressGroup(damageQuestIds, dealt);
  addQuestProgress(`${weaponId}_mastery`, dealt);
  return dealt;
}

function reapEnemies() {
  const dead = game.enemies.filter((enemy) => enemy.hp <= 0);
  dead.forEach((enemy) => {
    game.kills += 1;
    addQuestProgressGroup(killQuestIds, 1);
    game.xpDrops.push({ x: enemy.x, y: enemy.y, radius: enemy.boss ? 12 : 7, value: enemy.boss ? 8 : enemy.xp });
    spawnLootDrops(enemy);
    if (enemy.boss) {
      game.bossDefeated = true;
      addQuestProgress("boss_hunter", 1);
      endRun("Boss defeated");
    }
  });
  game.enemies = game.enemies.filter((enemy) => enemy.hp > 0);
}

function spawnLootDrops(enemy) {
  if (enemy.boss || Math.random() < 0.34) {
    game.lootDrops.push({
      type: "coin",
      x: enemy.x + randomRange(-10, 10),
      y: enemy.y + randomRange(-10, 10),
      radius: enemy.boss ? 10 : 7,
      value: enemy.boss ? 12 : 1,
    });
  }
  if (enemy.boss || Math.random() < 0.12) {
    game.lootDrops.push({
      type: "heart",
      x: enemy.x + randomRange(-12, 12),
      y: enemy.y + randomRange(-12, 12),
      radius: enemy.boss ? 11 : 8,
      value: enemy.boss ? 40 : 22,
    });
  }
}

function updateXpDrops() {
  const p = game.player;
  game.xpDrops.forEach((drop) => {
    if (distance(p, drop) < p.pickupRadius) {
      const dx = p.x - drop.x;
      const dy = p.y - drop.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      drop.x += (dx / dist) * 8;
      drop.y += (dy / dist) * 8;
    }
    if (distance(p, drop) < p.radius + drop.radius) {
      drop.collected = true;
      collectXp(drop.value);
    }
  });
  game.xpDrops = game.xpDrops.filter((drop) => !drop.collected);
}

function updateLootDrops() {
  const p = game.player;
  game.lootDrops.forEach((drop) => {
    if (distance(p, drop) < p.pickupRadius) {
      const dx = p.x - drop.x;
      const dy = p.y - drop.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      drop.x += (dx / dist) * 9;
      drop.y += (dy / dist) * 9;
    }
    if (distance(p, drop) < p.radius + drop.radius) {
      drop.collected = true;
      collectLoot(drop);
    }
  });
  game.lootDrops = game.lootDrops.filter((drop) => !drop.collected);
}

function collectLoot(drop) {
  if (drop.type === "coin") {
    save.coins += drop.value;
    persist();
    renderMeta();
  }
  if (drop.type === "heart") {
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + drop.value);
  }
}

function collectXp(value) {
  const p = game.player;
  p.xp += value;
  game.xpCollected += value;
  addQuestProgressGroup(xpQuestIds, value);
  if (p.xp >= p.xpToLevel) {
    p.xp -= p.xpToLevel;
    p.level += 1;
    p.xpToLevel += 4;
    game.levelUps += 1;
    addQuestProgressGroup(levelQuestIds, 1);
    showLevelUp();
  }
}

function activeQuestWeaponIds() {
  return save.activeQuests
    .map((questId) => questDefs[questId]?.weaponId)
    .filter(Boolean);
}

function showLevelUp() {
  game.paused = true;
  game.pauseReason = "level";
  ui.choices.innerHTML = "";
  const weaponChoices = save.unlockedWeapons
    .filter((weaponId) => !game.player.equippedWeapons.includes(weaponId))
    .map((weaponId) => ({
      weaponId,
      name: weaponDefs[weaponId].name,
      description: `Equip ${weaponDefs[weaponId].name} for this run.`,
      apply: () => game.player.equippedWeapons.push(weaponId),
    }));
  const questWeaponIds = activeQuestWeaponIds();
  const questWeaponChoices = weaponChoices.filter((choice) =>
    questWeaponIds.includes(choice.weaponId),
  );
  const otherWeaponChoices = weaponChoices.filter((choice) => !questWeaponChoices.includes(choice));
  const runUpgradeChoices = runUpgradeDefs
    .filter((upgrade) => getRunUpgradeTier(upgrade.id) < upgrade.maxTier)
    .map((upgrade) => {
      const tier = getRunUpgradeTier(upgrade.id);
      return {
        name: `${upgrade.name} ${tier + 1}`,
        description: `${upgrade.description} Tier ${tier + 1}/${upgrade.maxTier}.`,
        apply: () => {
          game.runUpgradeTiers[upgrade.id] = tier + 1;
          upgrade.apply?.();
        },
      };
    });
  const choices = [
    ...questWeaponChoices,
    ...shuffleChoices([...otherWeaponChoices, ...runUpgradeChoices]),
  ].slice(0, 3);

  if (!choices.length) {
    choices.push({
      name: "Repair",
      description: "Recover 30 HP.",
      apply: () => {
        game.player.hp = Math.min(game.player.maxHp, game.player.hp + 30);
      },
    });
  }

  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.innerHTML = `<strong>${choice.name}</strong><br /><span>${choice.description}</span>`;
    button.addEventListener("click", () => {
      choice.apply();
      game.paused = false;
      game.pauseReason = "";
      ui.levelUp.classList.add("hidden");
    });
    ui.choices.appendChild(button);
  });
  ui.levelUp.classList.remove("hidden");
}

function shuffleChoices(choices) {
  return choices
    .map((choice) => ({ choice, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ choice }) => choice);
}

function applyRunMetaUpgrades() {
  if (!game?.player) return;
  const p = game.player;
  p.speed = Math.max(p.speed, 185 + getUpgradeTier("move_speed") * 24);
  p.pickupRadius = Math.max(p.pickupRadius, 54 + getUpgradeTier("pickup_radius") * 18);
  const newMaxHp = 100 + getUpgradeTier("max_hp") * 20;
  if (newMaxHp > p.maxHp) {
    p.hp += newMaxHp - p.maxHp;
    p.maxHp = newMaxHp;
  }
}

function nearestEnemy() {
  if (!game.enemies.length) return null;
  const p = game.player;
  return game.enemies.reduce((best, enemy) =>
    distance(p, enemy) < distance(p, best) ? enemy : best,
  );
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawArena();
  if (!game) {
    drawMenuHint();
    return;
  }

  game.areas.forEach(drawArea);
  game.xpDrops.forEach(drawXp);
  game.lootDrops.forEach(drawLoot);
  game.bolts.forEach(drawBolt);
  game.enemies.forEach(drawEnemy);
  game.beams.forEach(drawBeam);
  drawPlayer(game.player);
  drawGameHud();
}

function drawArena() {
  ctx.fillStyle = "#17202c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#243244";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawMenuHint() {
  ctx.fillStyle = "#f3f6fb";
  ctx.font = "700 28px sans-serif";
  ctx.fillText("Tap Survivor MVP", 36, 58);
  ctx.font = "16px sans-serif";
  ctx.fillText("Unlock weapons, then start a run.", 36, 88);
}

function drawPlayer(p) {
  drawPlayerHpBar(p);
  ctx.fillStyle = "#69d2ff";
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(105, 210, 255, 0.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.pickupRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#dff6ff";
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.targetX, p.targetY);
  ctx.stroke();
}

function drawPlayerHpBar(p) {
  const width = 44;
  const height = 6;
  const x = p.x - width / 2;
  const y = p.y - p.radius - 16;
  const fillWidth = width * clamp(p.hp / p.maxHp, 0, 1);
  ctx.fillStyle = "rgba(10, 14, 20, 0.82)";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = fillWidth > width * 0.35 ? "#78e08f" : "#ff6b6b";
  ctx.fillRect(x, y, fillWidth, height);
  ctx.strokeStyle = "#f3f6fb";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
}

function drawEnemy(enemy) {
  ctx.fillStyle = enemy.boss ? "#ff4f8b" : enemy.color;
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
  ctx.fill();
  if (enemy.boss) {
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "#f3f6fb";
    ctx.font = "700 14px sans-serif";
    ctx.fillText("BOSS", enemy.x - 19, enemy.y - enemy.radius - 10);
  } else if (enemy.type === "skitter") {
    ctx.fillStyle = "#17202c";
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.type === "bulwark") {
    ctx.strokeStyle = "#dff6ff";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawXp(drop) {
  ctx.fillStyle = "#78e08f";
  ctx.beginPath();
  ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawLoot(drop) {
  if (drop.type === "coin") {
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff0a8";
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }

  ctx.fillStyle = "#ff5f7a";
  ctx.beginPath();
  ctx.arc(drop.x - drop.radius * 0.34, drop.y - drop.radius * 0.18, drop.radius * 0.5, 0, Math.PI * 2);
  ctx.arc(drop.x + drop.radius * 0.34, drop.y - drop.radius * 0.18, drop.radius * 0.5, 0, Math.PI * 2);
  ctx.moveTo(drop.x - drop.radius, drop.y);
  ctx.lineTo(drop.x, drop.y + drop.radius);
  ctx.lineTo(drop.x + drop.radius, drop.y);
  ctx.closePath();
  ctx.fill();
}

function drawBolt(bolt) {
  ctx.fillStyle = bolt.color;
  ctx.beginPath();
  ctx.arc(bolt.x, bolt.y, bolt.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawBeam(beam) {
  ctx.strokeStyle = beam.color;
  ctx.lineWidth = beam.width;
  ctx.globalAlpha = Math.max(0.2, beam.life / 0.24);
  ctx.beginPath();
  ctx.moveTo(beam.x, beam.y);
  ctx.lineTo(beam.endX, beam.endY);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawArea(area) {
  ctx.strokeStyle = area.color;
  ctx.fillStyle = area.color;
  ctx.globalAlpha = Math.max(0.1, Math.min(0.32, area.life));
  ctx.beginPath();
  ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.8;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawGameHud() {
  const p = game.player;
  const boss = game.enemies.find((enemy) => enemy.boss);
  ctx.fillStyle = "rgba(10, 14, 20, 0.74)";
  ctx.fillRect(16, 16, 430, boss ? 128 : 106);
  ctx.fillStyle = "#f3f6fb";
  ctx.font = "14px sans-serif";
  ctx.fillText(`Time: ${formatTime(game.elapsed)} / ${formatTime(game.duration)}`, 28, 40);
  ctx.fillText(`HP: ${Math.max(0, Math.ceil(p.hp))}/${p.maxHp}`, 28, 62);
  ctx.fillText(`Level: ${p.level} | XP: ${p.xp}/${p.xpToLevel} | Kills: ${game.kills}`, 28, 84);
  ctx.fillText(`Coins: ${save.coins} | Weapons: ${p.equippedWeapons.map((id) => weaponDefs[id].name).join(", ")}`, 28, 106);
  if (boss) {
    ctx.fillText(`Boss HP: ${Math.max(0, Math.ceil(boss.hp))}/${boss.maxHp}`, 28, 128);
  }
}

function updateRunHud() {
  if (!game) return;
  const boss = game.enemies.find((enemy) => enemy.boss);
  const bossText = boss ? ` | Boss HP ${Math.max(0, Math.ceil(boss.hp))}/${boss.maxHp}` : game.bossSpawned ? " | Boss defeated" : "";
  ui.runHud.textContent = `Time ${formatTime(game.elapsed)} | HP ${Math.max(0, Math.ceil(game.player.hp))}/${game.player.maxHp} | Coins ${save.coins} | Level ${game.player.level} | Kills ${game.kills} | Laser damage ${Math.floor(game.laserDamage)} | Weapons ${game.player.equippedWeapons.length}${bossText}`;
}

function openRunMenu() {
  ui.runMenu.classList.remove("hidden");
  if (game?.running && !game.paused) {
    game.paused = true;
    game.pauseReason = "menu";
  }
  renderMeta();
}

function closeRunMenu(resume = true) {
  ui.runMenu.classList.add("hidden");
  if (resume && game?.pauseReason === "menu") {
    game.paused = false;
    game.pauseReason = "";
  }
}

function closeLevelUpMenu() {
  ui.levelUp.classList.add("hidden");
  if (game?.pauseReason === "level") {
    game.paused = false;
    game.pauseReason = "";
  }
}

function closeEndScreen() {
  ui.endScreen.classList.add("hidden");
}

function setTargetFromEvent(event) {
  if (!game || !game.running || game.paused) return;
  const rect = canvas.getBoundingClientRect();
  const point = event.touches ? event.touches[0] : event;
  game.player.targetX = ((point.clientX - rect.left) / rect.width) * canvas.width;
  game.player.targetY = ((point.clientY - rect.top) / rect.height) * canvas.height;
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  update(dt);
  draw();
  updateRunHud();
  requestAnimationFrame(loop);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

ui.startRun.addEventListener("click", startRun);
ui.openMenu.addEventListener("click", openRunMenu);
ui.closeMenu.addEventListener("click", () => closeRunMenu(true));
ui.closeLevelUp.addEventListener("click", closeLevelUpMenu);
ui.resetSave.addEventListener("click", () => {
  localStorage.removeItem(saveKey);
  localStorage.removeItem("tap-survivor-mvp-save-v1");
  save = defaultSave();
  game = null;
  ui.endScreen.classList.add("hidden");
  ui.levelUp.classList.add("hidden");
  closeRunMenu(false);
  persist();
  renderMeta();
});
ui.closeEnd.addEventListener("click", closeEndScreen);
ui.closeEndX.addEventListener("click", closeEndScreen);

canvas.addEventListener("mousedown", setTargetFromEvent);
canvas.addEventListener("mousemove", (event) => {
  if (event.buttons === 1) setTargetFromEvent(event);
});
canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
  setTargetFromEvent(event);
});
canvas.addEventListener("touchmove", (event) => {
  event.preventDefault();
  setTargetFromEvent(event);
});

renderMeta();
requestAnimationFrame(loop);
