const ui = globalThis.TapSurvivorUi.createUi();
const canvas = ui.canvas;
const ctx = canvas.getContext("2d");

const saveKey = "tap-survivor-mvp-save-v2";
const legacySaveKey = "tap-survivor-mvp-save-v1";

const content = globalThis.TapSurvivorContent || {};
const upgradeContent = globalThis.TapSurvivorUpgrades || {};
const { clamp, distance, formatTime, randomRange } = globalThis.TapSurvivorMath;
const { questOpenIds } = globalThis.TapSurvivorQuests;
const weaponDefs = content.weapons || {};
const weaponUnlocks = content.weaponUnlocks || [];
const spriteDefs = content.assets?.sprites || {};
const spriteSystem = globalThis.TapSurvivorSprites.createSpriteSystem({ ctx, spriteDefs });

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

const saveSystem = globalThis.TapSurvivorSave.createSaveSystem({
  saveKey,
  legacySaveKey,
  starterQuestIds,
  questDefs,
  weaponUnlocks,
  upgradeDefs,
  questOpenIds,
});

let save = saveSystem.loadSave();
const questSystem = globalThis.TapSurvivorQuests.createQuestSystem({
  questDefs,
  getSave: () => save,
  persist,
  renderMeta,
});
let game = null;
let lastFrame = performance.now();
let gameSpeed = 1;

function persist() {
  saveSystem.persist(save);
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
  return questSystem.hasQuest(id);
}

function openQuest(id) {
  questSystem.openQuest(id);
}

function completeQuest(id) {
  questSystem.completeQuest(id);
}

function addQuestProgress(id, amount) {
  questSystem.addQuestProgress(id, amount);
}

function addQuestProgressGroup(ids, amount) {
  questSystem.addQuestProgressGroup(ids, amount);
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

const combat = globalThis.TapSurvivorCombat.createCombatSystem({
  canvas,
  enemyTypes,
  weaponDefs,
  getGame: () => game,
  getUpgradeTier,
  addQuestProgress,
  addQuestProgressGroup,
  killQuestIds,
  damageQuestIds,
  bossQuestIds,
  spawnLootDrops,
  endRun,
  distance,
  clamp,
});

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
  combat.spawnEnemies(dt);
}

function spawnBoss() {
  combat.spawnBoss();
}

function updateBossSpecials(dt) {
  combat.updateBossSpecials(dt);
}

function updateEnemies(dt) {
  combat.updateEnemies(dt);
}

function updateWeapons(dt) {
  combat.updateWeapons(dt);
}

function getRunUpgradeTier(id) {
  return combat.getRunUpgradeTier(id);
}

function updateBolts(dt) {
  combat.updateBolts(dt);
}

function updateAreas(dt) {
  combat.updateAreas(dt);
}

function updateBeams(dt) {
  combat.updateBeams(dt);
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
  return questSystem.activeQuestWeaponIds();
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

const renderer = globalThis.TapSurvivorRendering.createRenderer({
  canvas,
  ctx,
  drawSprite: spriteSystem.drawSprite,
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
  localStorage.removeItem(legacySaveKey);
  save = saveSystem.defaultSave();
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

spriteSystem.loadSprites();
renderMeta();
requestAnimationFrame(loop);
