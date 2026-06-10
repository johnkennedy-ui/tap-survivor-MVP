const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  startRun: document.getElementById("startRun"),
  resetSave: document.getElementById("resetSave"),
  openMenu: document.getElementById("openMenu"),
  closeMenu: document.getElementById("closeMenu"),
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
  { id: "unlock_laser", weaponId: "prism_beam", cost: 0, opensQuest: "use_laser_run" },
  { id: "unlock_frost_orb", weaponId: "frost_orb", cost: 0 },
  { id: "unlock_flame_wave", weaponId: "flame_wave", cost: 0 },
  { id: "unlock_saw_drone", weaponId: "saw_drone", cost: 0 },
  { id: "unlock_void_mine", weaponId: "void_mine", cost: 0 },
  { id: "unlock_chain_spark", weaponId: "chain_spark", cost: 0 },
  { id: "unlock_moon_glaive", weaponId: "moon_glaive", cost: 0 },
  { id: "unlock_meteor_pin", weaponId: "meteor_pin", cost: 0 },
  { id: "unlock_acid_pool", weaponId: "acid_pool", cost: 0 },
  { id: "unlock_shield_pulse", weaponId: "shield_pulse", cost: 0 },
  { id: "unlock_nova_burst", weaponId: "nova_burst", cost: 0 },
];

const upgradeDefs = [
  ...Object.values(weaponDefs).map((weapon) => ({
    id: weapon.upgradeId,
    name: `${weapon.name} Damage`,
    description: `Increase ${weapon.name} damage.`,
    cost: [1, 2, 3],
    maxTier: 3,
    requiresWeapon: Object.keys(weaponDefs).find((id) => weaponDefs[id] === weapon),
    opensQuest: weapon.upgradeId === "laser_damage" ? "laser_damage_5000" : null,
  })),
  {
    id: "move_speed",
    name: "Move Speed",
    description: "Move faster during runs.",
    cost: [1, 2, 3],
    maxTier: 3,
  },
  {
    id: "pickup_radius",
    name: "Pickup Radius",
    description: "Collect XP from farther away.",
    cost: [1, 2, 3],
    maxTier: 3,
  },
  {
    id: "max_hp",
    name: "Max HP",
    description: "Start each run with more health.",
    cost: [1, 2, 3],
    maxTier: 3,
  },
];

const questDefs = {
  use_laser_run: {
    name: "Use Laser in a run",
    description: "Fire Prism Beam during a run.",
    target: 1,
    rewardQp: 1,
  },
  laser_damage_5000: {
    name: "Deal 5,000 damage with Laser",
    description: "Deal 5,000 total damage with Prism Beam.",
    target: 5000,
    rewardQp: 1,
  },
};

let save = loadSave();
let game = null;
let lastFrame = performance.now();

function defaultSave() {
  return {
    questPoints: 0,
    totalQuestPoints: 0,
    unlockedNodes: [],
    unlockedWeapons: ["spark_bolt"],
    upgradeTiers: {},
    unlockedUpgrades: [],
    activeQuests: [],
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
  normalized.unlockedNodes = normalized.unlockedNodes || [];
  normalized.upgradeTiers = normalized.upgradeTiers || {};
  (normalized.unlockedUpgrades || []).forEach((id) => {
    normalized.upgradeTiers[id] = Math.max(normalized.upgradeTiers[id] || 0, 1);
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
  persist();
  renderMeta();
}

function addQuestProgress(id, amount) {
  if (!save.activeQuests.includes(id)) return;
  save.questProgress[id] = Math.min(
    questDefs[id].target,
    (save.questProgress[id] || 0) + amount,
  );
  if (save.questProgress[id] >= questDefs[id].target) completeQuest(id);
}

function buyWeaponUnlock(unlock) {
  if (hasNode(unlock.id) || save.questPoints < unlock.cost) return;
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
  const qpText = `Quest Points: ${save.questPoints} available, ${save.totalQuestPoints} earned.`;
  ui.qpHud.textContent = qpText;
  ui.menuQpHud.textContent = qpText;

  renderTree(ui.tree);
  renderTree(ui.menuTree);
  renderQuests(ui.quests);
  renderQuests(ui.menuQuests);
}

function renderTree(container) {
  container.innerHTML = "";
  weaponUnlocks.forEach((unlock) => {
    const weapon = weaponDefs[unlock.weaponId];
    const bought = hasNode(unlock.id);
    const canBuy = !bought && save.questPoints >= unlock.cost;
    const el = document.createElement("div");
    el.className = "node";
    el.innerHTML = `
      <strong>Unlock ${weapon.name}</strong>
      <span>${weapon.description}</span><br />
      <span>Cost: ${unlock.cost} QP</span>
    `;
    const button = document.createElement("button");
    button.textContent = bought ? "Unlocked" : "Unlock";
    button.disabled = bought || !canBuy;
    button.addEventListener("click", () => buyWeaponUnlock(unlock));
    el.appendChild(button);
    container.appendChild(el);
  });

  upgradeDefs.forEach((upgrade) => {
    const tier = getUpgradeTier(upgrade.id);
    const maxed = tier >= upgrade.maxTier;
    const lockedByWeapon =
      upgrade.requiresWeapon && !save.unlockedWeapons.includes(upgrade.requiresWeapon);
    const nextCost = maxed ? 0 : upgrade.cost[tier];
    const canBuy = !maxed && !lockedByWeapon && save.questPoints >= nextCost;
    const el = document.createElement("div");
    el.className = "node";
    el.innerHTML = `
      <strong>${upgrade.name}</strong>
      <span>${upgrade.description}</span><br />
      <span>Tier: ${tier}/${upgrade.maxTier}${lockedByWeapon ? ` | Requires: ${weaponDefs[upgrade.requiresWeapon].name}` : ""}</span><br />
      <span>${maxed ? "Maxed" : `Next cost: ${nextCost} QP`}</span>
    `;
    const button = document.createElement("button");
    button.textContent = maxed ? "Max Tier" : lockedByWeapon ? "Weapon locked" : `Buy Tier ${tier + 1}`;
    button.disabled = maxed || lockedByWeapon || !canBuy;
    button.addEventListener("click", () => buyUpgrade(upgrade));
    el.appendChild(button);
    container.appendChild(el);
  });
}

function renderQuests(container) {
  container.innerHTML = "";
  Object.entries(questDefs).forEach(([id, quest]) => {
    const complete = save.completedQuests.includes(id);
    const active = save.activeQuests.includes(id);
    const progress = save.questProgress[id] || 0;
    const el = document.createElement("div");
    el.className = `quest ${complete ? "complete" : active ? "active" : ""}`;
    el.innerHTML = `
      <strong>${quest.name}</strong>
      <span>${quest.description}</span><br />
      <span>Status: ${complete ? "Completed" : active ? "Active" : "Locked"}</span><br />
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
    duration: 120,
    player,
    enemies: [],
    xpDrops: [],
    bolts: [],
    beams: [],
    areas: [],
    weaponTimers: {},
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
  if (game.elapsed >= game.duration) {
    endRun("Timer complete");
    return;
  }

  movePlayer(p, dt);
  spawnEnemies(dt);
  updateEnemies(dt);
  updateWeapons(dt);
  updateBolts(dt);
  updateAreas(dt);
  updateBeams(dt);
  updateXpDrops();

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
  const edge = Math.floor(Math.random() * 4);
  game.enemies.push({
    x: edge === 0 ? -20 : edge === 1 ? canvas.width + 20 : Math.random() * canvas.width,
    y: edge === 2 ? -20 : edge === 3 ? canvas.height + 20 : Math.random() * canvas.height,
    radius: 13,
    hp: 18 + game.elapsed * 0.12,
    speed: 52 + game.elapsed * 0.08,
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
      p.hp -= 9;
      enemy.touchTimer = 0.55;
    }
  });
}

function updateWeapons(dt) {
  game.player.equippedWeapons.forEach((weaponId) => {
    const weapon = weaponDefs[weaponId];
    game.weaponTimers[weaponId] = (game.weaponTimers[weaponId] || 0) - dt;
    if (game.weaponTimers[weaponId] <= 0) {
      game.weaponTimers[weaponId] = weapon.cooldown;
      fireWeapon(weaponId);
    }
  });
}

function weaponDamage(weaponId) {
  const weapon = weaponDefs[weaponId];
  return weapon.damage * (1 + getUpgradeTier(weapon.upgradeId) * 0.25);
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
    radius: weapon.radius,
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
    if (along < 0 || along > weapon.range) return;
    const side = Math.abs(toEnemyX * dirY - toEnemyY * dirX);
    if (side <= weapon.width + enemy.radius) {
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
    endX: p.x + dirX * weapon.range,
    endY: p.y + dirY * weapon.range,
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
    if (along < 0 || along > weapon.range) return;
    const side = Math.abs(toEnemyX * dirY - toEnemyY * dirX);
    if (side <= weapon.width) damageEnemy(enemy, weaponDamage(weaponId), weaponId);
  });
  game.beams.push({
    x: p.x,
    y: p.y,
    endX: p.x + dirX * weapon.range,
    endY: p.y + dirY * weapon.range,
    width: weapon.width,
    color: weapon.color,
    life: 0.14,
  });
  reapEnemies();
}

function fireRadial(weaponId) {
  const weapon = weaponDefs[weaponId];
  const p = game.player;
  game.enemies.forEach((enemy) => {
    if (distance(p, enemy) <= weapon.range + enemy.radius) {
      damageEnemy(enemy, weaponDamage(weaponId), weaponId);
    }
  });
  game.areas.push({
    x: p.x,
    y: p.y,
    radius: weapon.range,
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
    if (distance(from, enemy) > weapon.range) return;
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
    if (distance(target, enemy) <= weapon.range + enemy.radius) {
      damageEnemy(enemy, weaponDamage(weaponId), weaponId);
    }
  });
  game.areas.push({
    x: target.x,
    y: target.y,
    radius: weapon.range,
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
    radius: weapon.range,
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
    radius: weapon.range,
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
  return dealt;
}

function reapEnemies() {
  const dead = game.enemies.filter((enemy) => enemy.hp <= 0);
  dead.forEach((enemy) => {
    game.kills += 1;
    game.xpDrops.push({ x: enemy.x, y: enemy.y, radius: 7, value: 1 });
  });
  game.enemies = game.enemies.filter((enemy) => enemy.hp > 0);
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

function collectXp(value) {
  const p = game.player;
  p.xp += value;
  game.xpCollected += value;
  if (p.xp >= p.xpToLevel) {
    p.xp -= p.xpToLevel;
    p.level += 1;
    p.xpToLevel += 4;
    game.levelUps += 1;
    showLevelUp();
  }
}

function showLevelUp() {
  game.paused = true;
  game.pauseReason = "level";
  ui.choices.innerHTML = "";
  const choices = [
    ...save.unlockedWeapons
      .filter((weaponId) => !game.player.equippedWeapons.includes(weaponId))
      .map((weaponId) => ({
        name: weaponDefs[weaponId].name,
        description: `Equip ${weaponDefs[weaponId].name} for this run.`,
        apply: () => game.player.equippedWeapons.push(weaponId),
      })),
    {
      name: "Move Speed",
      description: "Move faster for this run.",
      apply: () => (game.player.speed += 32),
    },
    {
      name: "Pickup Radius",
      description: "Collect XP from farther away this run.",
      apply: () => (game.player.pickupRadius += 22),
    },
    {
      name: "Max HP",
      description: "Recover and increase HP for this run.",
      apply: () => {
        game.player.maxHp += 18;
        game.player.hp = Math.min(game.player.maxHp, game.player.hp + 36);
      },
    },
  ].slice(0, 6);

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

function drawEnemy(enemy) {
  ctx.fillStyle = "#f06a78";
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawXp(drop) {
  ctx.fillStyle = "#78e08f";
  ctx.beginPath();
  ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
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
  ctx.fillStyle = "rgba(10, 14, 20, 0.74)";
  ctx.fillRect(16, 16, 390, 106);
  ctx.fillStyle = "#f3f6fb";
  ctx.font = "14px sans-serif";
  ctx.fillText(`Time: ${formatTime(game.elapsed)} / ${formatTime(game.duration)}`, 28, 40);
  ctx.fillText(`HP: ${Math.max(0, Math.ceil(p.hp))}/${p.maxHp}`, 28, 62);
  ctx.fillText(`Level: ${p.level} | XP: ${p.xp}/${p.xpToLevel} | Kills: ${game.kills}`, 28, 84);
  ctx.fillText(`Weapons: ${p.equippedWeapons.map((id) => weaponDefs[id].name).join(", ")}`, 28, 106);
}

function updateRunHud() {
  if (!game) return;
  ui.runHud.textContent = `Time ${formatTime(game.elapsed)} | HP ${Math.max(0, Math.ceil(game.player.hp))}/${game.player.maxHp} | Level ${game.player.level} | Kills ${game.kills} | Laser damage ${Math.floor(game.laserDamage)} | Weapons ${game.player.equippedWeapons.length}`;
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

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

ui.startRun.addEventListener("click", startRun);
ui.openMenu.addEventListener("click", openRunMenu);
ui.closeMenu.addEventListener("click", () => closeRunMenu(true));
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
ui.closeEnd.addEventListener("click", () => ui.endScreen.classList.add("hidden"));

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
