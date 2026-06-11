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
const relicDefs = content.relics || [];
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

const uiRenderer = globalThis.TapSurvivorUi.createUiRenderer({
  ui,
  weaponDefs,
  weaponUnlocks,
  upgradeDefs,
  questDefs,
  getSave: () => save,
  getUpgradeTier,
  hasNode,
  isNodeVisible,
  isQuestComplete,
  nodeGateStatus,
  buyWeaponUnlock,
  buyUpgrade,
});

const shopSystem = globalThis.TapSurvivorShop.createShopSystem({
  ui,
  shopItemDefs,
  getSave: () => save,
  getGame: () => game,
  persist,
  renderMeta,
});

function renderMeta() {
  uiRenderer.renderMeta();
}

function renderTree(container) {
  uiRenderer.renderTree(container);
}

function renderQuests(container) {
  uiRenderer.renderQuests(container);
}

function resetGameState() {
  const moveTier = getUpgradeTier("move_speed");
  const pickupTier = getUpgradeTier("pickup_radius");
  const hpTier = getUpgradeTier("max_hp");
  const shopBonuses = shopSystem.getShopBonuses();
  const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    targetX: canvas.width / 2,
    targetY: canvas.height / 2,
    radius: 16,
    speed: 185 + moveTier * 24 + shopBonuses.speed,
    hp: 100 + hpTier * 20 + shopBonuses.maxHp,
    maxHp: 100 + hpTier * 20 + shopBonuses.maxHp,
    pickupRadius: 54 + pickupTier * 18 + shopBonuses.pickupRadius,
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
    towerFloor: save.towerFloor || 1,
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

const pickupSystem = globalThis.TapSurvivorPickups.createPickupSystem({
  getGame: () => game,
  getSave: () => save,
  persist,
  renderMeta,
  collectXp,
  distance,
  randomRange,
});

const combat = globalThis.TapSurvivorCombat.createCombatSystem({
  canvas,
  enemyTypes,
  weaponDefs,
  getGame: () => game,
  getUpgradeTier,
  getShopBonuses: () => shopSystem.getShopBonuses(),
  addQuestProgress,
  addQuestProgressForWeapon: questSystem.addQuestProgressForWeapon,
  addQuestProgressGroup,
  killQuestIds,
  damageQuestIds,
  bossQuestIds,
  spawnLootDrops: pickupSystem.spawnLootDrops,
  advanceTowerFloor,
  endRun,
  distance,
  clamp,
});

const levelUpSystem = globalThis.TapSurvivorLevelUp.createLevelUpSystem({
  ui,
  weaponDefs,
  runUpgradeDefs,
  relicDefs,
  getSave: () => save,
  getGame: () => game,
  getRunUpgradeTier,
  activeQuestWeaponIds: () => questSystem.activeQuestWeaponIds(),
});

function startRun() {
  closeStartMenu();
  shopSystem.closeShop();
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
    <p>Tower floor: ${game.towerFloor}</p>
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

function advanceTowerFloor() {
  if (!game) return;
  const clearedFloor = game.towerFloor || 1;
  const awardedRelic = grantRandomRelic();
  save.towerFloor = Math.max(save.towerFloor || 1, clearedFloor + 1);
  persist();
  resetGameState();
  game.lastFloorClear = {
    floor: clearedFloor,
    relicName: awardedRelic?.name || "No locked relics remaining",
  };
  updateRunHud();
  renderMeta();
}

function grantRandomRelic() {
  const unlocked = new Set(save.unlockedRelics || []);
  const locked = relicDefs.filter((relic) => !unlocked.has(relic.id));
  if (!locked.length) return null;
  const relic = locked[Math.floor(Math.random() * locked.length)];
  save.unlockedRelics = [...unlocked, relic.id];
  save.equippedRelics = [...new Set([...(save.equippedRelics || []), relic.id])];
  return relic;
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
  pickupSystem.updateXpDrops(dt);
  pickupSystem.updateLootDrops(dt);

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

function showLevelUp() {
  levelUpSystem.showLevelUp();
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
  drawImage: spriteSystem.drawImage,
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
  const floorText = game.lastFloorClear ? ` | Cleared Floor ${game.lastFloorClear.floor}: ${game.lastFloorClear.relicName}` : "";
  ui.runHud.textContent = `Time ${formatTime(game.elapsed)} | Floor ${game.towerFloor} | Speed x${gameSpeed} | HP ${Math.max(0, Math.ceil(game.player.hp))}/${game.player.maxHp} | Coins ${save.coins} | Level ${game.player.level} | Kills ${game.kills} | Laser damage ${Math.floor(game.laserDamage)} | Weapons ${game.player.equippedWeapons.length}${bossText}${floorText}`;
}

function openRunMenu() {
  ui.runMenu.classList.remove("hidden");
  ui.openMenu.setAttribute("aria-expanded", "true");
  ui.exitRun.disabled = !game?.running;
  if (game?.running && !game.paused) {
    game.paused = true;
    game.pauseReason = "menu";
  }
  renderMeta();
}

function closeRunMenu(resume = true) {
  ui.runMenu.classList.add("hidden");
  ui.openMenu.setAttribute("aria-expanded", "false");
  if (resume && game?.pauseReason === "menu") {
    game.paused = false;
    game.pauseReason = "";
  }
}

function showStartMenu() {
  ui.startMenu.classList.remove("hidden");
}

function closeStartMenu() {
  ui.startMenu.classList.add("hidden");
}

function toggleRunMenu() {
  if (ui.runMenu.classList.contains("hidden")) {
    openRunMenu();
    return;
  }
  closeRunMenu(true);
}

function isFullscreen() {
  return document.fullscreenElement || document.webkitFullscreenElement;
}

function updateFullscreenButton() {
  const fullscreen = Boolean(isFullscreen());
  const label = fullscreen ? "Exit Full Screen" : "Full Screen";
  ui.fullscreenButton.textContent = label;
  ui.startMenuFullscreen.textContent = label;
  ui.fullscreenButton.setAttribute("aria-pressed", String(fullscreen));
  ui.startMenuFullscreen.setAttribute("aria-pressed", String(fullscreen));
}

function toggleFullscreen() {
  const target = ui.canvas.parentElement || document.documentElement;
  if (isFullscreen()) {
    const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
    const result = exitFullscreen?.call(document);
    result?.catch?.(() => {});
    return;
  }

  const requestFullscreen = target.requestFullscreen || target.webkitRequestFullscreen;
  const result = requestFullscreen?.call(target);
  result?.catch?.(() => {});
}

function closeLevelUpMenu() {
  levelUpSystem.closeLevelUpMenu();
}

function openShopMenu() {
  closeStartMenu();
  shopSystem.openShop();
}

function closeShopMenu() {
  shopSystem.closeShop();
  if (!game?.running) showStartMenu();
}

function exitRun() {
  if (!game?.running) return;
  closeRunMenu(false);
  game.paused = false;
  game.pauseReason = "";
  endRun("Run exited");
}

function closeEndScreen() {
  ui.endScreen.classList.add("hidden");
  showStartMenu();
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
ui.startMenuStartRun.addEventListener("click", startRun);
ui.openShop.addEventListener("click", openShopMenu);
ui.startMenuOpenShop.addEventListener("click", openShopMenu);
ui.closeShop.addEventListener("click", closeShopMenu);
ui.closeShopBottom.addEventListener("click", closeShopMenu);
ui.openMenu.addEventListener("click", toggleRunMenu);
ui.closeMenu.addEventListener("click", () => closeRunMenu(true));
ui.closeLevelUp.addEventListener("click", closeLevelUpMenu);
ui.fullscreenButton.addEventListener("click", toggleFullscreen);
ui.startMenuFullscreen.addEventListener("click", toggleFullscreen);
ui.exitRun.addEventListener("click", exitRun);
document.addEventListener?.("fullscreenchange", updateFullscreenButton);
document.addEventListener?.("webkitfullscreenchange", updateFullscreenButton);
ui.speedButtons.forEach((button) => {
  button.addEventListener("click", () => setGameSpeed(Number(button.dataset.speed)));
});
setGameSpeed(1);
updateFullscreenButton();
ui.resetSave.addEventListener("click", () => {
  localStorage.removeItem(saveKey);
  localStorage.removeItem(legacySaveKey);
  save = saveSystem.defaultSave();
  game = null;
  ui.endScreen.classList.add("hidden");
  ui.levelUp.classList.add("hidden");
  shopSystem.closeShop();
  closeRunMenu(false);
  showStartMenu();
  persist();
  renderMeta();
});
ui.closeEnd.addEventListener("click", closeEndScreen);
ui.closeEndX.addEventListener("click", closeEndScreen);

globalThis.TapSurvivorInput.bindMovementInput({
  canvas,
  getGame: () => game,
});

spriteSystem.loadSprites();
renderMeta();
requestAnimationFrame(loop);
