const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  startRun: document.getElementById("startRun"),
  resetSave: document.getElementById("resetSave"),
  openMenu: document.getElementById("openMenu"),
  closeMenu: document.getElementById("closeMenu"),
  closeLevelUp: document.getElementById("closeLevelUp"),
  speedButtons: [...document.querySelectorAll("[data-speed]")],
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

const content = globalThis.TapSurvivorContent || {};
const upgradeContent = globalThis.TapSurvivorUpgrades || {};
const weaponDefs = content.weapons || {};
const weaponUnlocks = content.weaponUnlocks || [];
const spriteDefs = content.assets?.sprites || {};
const sprites = {};

function registerSprite(id, src) {
  if (!src || typeof Image === "undefined") return;
  const image = new Image();
  image.src = src;
  sprites[id] = image;
}

function loadSprites() {
  registerSprite("player", spriteDefs.player);
  Object.entries(spriteDefs.enemies || {}).forEach(([id, src]) => registerSprite(`enemy:${id}`, src));
  Object.entries(spriteDefs.weapons || {}).forEach(([id, src]) => registerSprite(`weapon:${id}`, src));
  Object.entries(spriteDefs.ui || {}).forEach(([id, src]) => registerSprite(`ui:${id}`, src));
}

function drawSprite(id, x, y, size, rotation = 0) {
  const image = sprites[id];
  if (!image?.complete || !image.naturalWidth) return false;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}

const upgradeDefs = upgradeContent.createUpgradeDefs?.(weaponDefs) || [];

const questDefs = content.quests || {};
const questGroups = content.questGroups || {};
const starterQuestIds = questGroups.starter || [];
const killQuestIds = questGroups.kill || [];
const damageQuestIds = questGroups.damage || [];
const survivalQuestIds = questGroups.survival || [];
const xpQuestIds = questGroups.xp || [];
const levelQuestIds = questGroups.level || [];
const bossQuestIds = questGroups.boss || [];

const runUpgradeDefs = upgradeContent.runUpgradeDefs || [];

const enemyTypes = content.enemyTypes || [];
const shopItemDefs = content.shopItems || [];
const levelDefs = content.levels || [];

let save = loadSave();
let game = null;
let lastFrame = performance.now();
let gameSpeed = 1;

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
    bossAttacks: [],
    weaponTimers: {},
    runUpgradeTiers: {},
    spawnTimer: 0,
    bossAttackTimer: 3.8,
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
  updateBossSpecials(dt);
  updateWeapons(dt);
  updateBolts(dt);
  updateAreas(dt);
  updateBeams(dt);
  updateXpDrops(dt);
  updateLootDrops(dt);

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
    assetId: type.assetId || type.id,
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
    assetId: "boss",
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

function updateBossSpecials(dt) {
  const boss = game.enemies.find((enemy) => enemy.boss);
  if (!boss) return;
  game.bossAttackTimer -= dt;
  if (game.bossAttackTimer <= 0) {
    game.bossAttackTimer = 4.6;
    game.bossAttacks.push({
      type: "shockwave",
      x: boss.x,
      y: boss.y,
      radius: 165,
      damage: 26,
      age: 0,
      windup: 0.9,
      hit: false,
    });
  }

  const p = game.player;
  game.bossAttacks.forEach((attack) => {
    attack.age += dt;
    if (!attack.hit && attack.age >= attack.windup) {
      attack.hit = true;
      if (distance(p, attack) <= p.radius + attack.radius) {
        p.hp -= attack.damage;
      }
    }
  });
  game.bossAttacks = game.bossAttacks.filter((attack) => attack.age <= attack.windup + 0.35);
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
      addQuestProgressGroup(bossQuestIds, 1);
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

function pullDropTowardPlayer(drop, player, speed, dt) {
  const dx = player.x - drop.x;
  const dy = player.y - drop.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const step = Math.min(dist, speed * dt);
  drop.x += (dx / dist) * step;
  drop.y += (dy / dist) * step;
}

function updateXpDrops(dt) {
  const p = game.player;
  game.xpDrops.forEach((drop) => {
    if (distance(p, drop) < p.pickupRadius) {
      pullDropTowardPlayer(drop, p, 480, dt);
    }
    if (distance(p, drop) < p.radius + drop.radius) {
      drop.collected = true;
      collectXp(drop.value);
    }
  });
  game.xpDrops = game.xpDrops.filter((drop) => !drop.collected);
}

function updateLootDrops(dt) {
  const p = game.player;
  game.lootDrops.forEach((drop) => {
    if (distance(p, drop) < p.pickupRadius) {
      pullDropTowardPlayer(drop, p, 540, dt);
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
          upgrade.apply?.(game);
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

const renderer = globalThis.TapSurvivorRendering.createRenderer({
  canvas,
  ctx,
  drawSprite,
  weaponDefs,
});

function draw() {
  renderer.draw(game);
}

function updateRunHud() {
  if (!game) {
    ui.runHud.textContent = `Speed x${gameSpeed} | Start a run to test movement, auto-attacks, XP, Laser, quests, and Quest Points.`;
    return;
  }
  const boss = game.enemies.find((enemy) => enemy.boss);
  const bossText = boss ? ` | Boss HP ${Math.max(0, Math.ceil(boss.hp))}/${boss.maxHp}` : game.bossSpawned ? " | Boss defeated" : "";
  ui.runHud.textContent = `Time ${formatTime(game.elapsed)} | Speed x${gameSpeed} | HP ${Math.max(0, Math.ceil(game.player.hp))}/${game.player.maxHp} | Coins ${save.coins} | Level ${game.player.level} | Kills ${game.kills} | Laser damage ${Math.floor(game.laserDamage)} | Weapons ${game.player.equippedWeapons.length}${bossText}`;
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
  update(dt * gameSpeed);
  draw();
  updateRunHud();
  requestAnimationFrame(loop);
}

function setGameSpeed(speed) {
  if (![1, 2, 5].includes(speed)) return;
  gameSpeed = speed;
  document.body.dataset.gameSpeed = String(speed);
  ui.speedButtons.forEach((button) => {
    const active = Number(button.dataset.speed) === speed;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  updateRunHud();
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
ui.speedButtons.forEach((button) => {
  button.addEventListener("click", () => setGameSpeed(Number(button.dataset.speed)));
});
setGameSpeed(1);
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

loadSprites();
renderMeta();
requestAnimationFrame(loop);
