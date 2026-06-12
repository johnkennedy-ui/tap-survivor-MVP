const ui = globalThis.TapSurvivorUi.createUi();
const canvas = ui.canvas;
const ctx = canvas.getContext("2d");

const saveKey = "tap-survivor-mvp-save-v2";
const legacySaveKey = "tap-survivor-mvp-save-v1";

const content = globalThis.TapSurvivorContent || {};
const upgradeContent = globalThis.TapSurvivorUpgrades || {};
const { clamp, distance, randomRange, formatTime } = globalThis.TapSurvivorMath;
const { questOpenIds } = globalThis.TapSurvivorQuests;
const {
  weaponDefs,
  weaponUnlocks,
  spriteDefs,
  upgradeDefs,
  questDefs,
  starterQuestIds,
  killQuestIds,
  damageQuestIds,
  survivalQuestIds,
  xpQuestIds,
  levelQuestIds,
  bossQuestIds,
  runUpgradeDefs,
  enemyTypes,
  shopItemDefs,
  relicDefs,
} = globalThis.TapSurvivorContentRegistry.createContentRegistry({
  content,
  upgradeContent,
});
const spriteSystem = globalThis.TapSurvivorSprites.createSpriteSystem({ ctx, spriteDefs });

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

const relicSystem = globalThis.TapSurvivorRelics.createRelicSystem({
  relicDefs,
});

const runStateSystem = globalThis.TapSurvivorRunState.createRunStateSystem({
  canvas,
  getSave: () => save,
  getShopBonuses: () => shopSystem.getShopBonuses(),
  getUpgradeTier,
  maxEquippedWeapons,
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
  game = runStateSystem.resetGameState();
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
  getWeaponDamageMultiplier,
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
  maxEquippedWeapons,
  activeQuestWeaponIds: () => questSystem.activeQuestWeaponIds(),
});

const shellUi = globalThis.TapSurvivorShellUi.createShellUiController({
  ui,
  getGame: () => game,
  shopSystem,
  startRun,
  exitRun,
  resetSave,
  closeLevelUpMenu,
  closeEndScreen,
  setGameSpeed,
  renderMeta,
});

const debugSystem = globalThis.TapSurvivorDebug.createDebugSystem({
  ui,
  getGame: () => game,
  getSave: () => save,
  getRunUpgradeTier,
  maxEquippedWeapons,
  getWeaponDamageMultiplier,
  relicDefs,
  runUpgradeDefs,
});

const runUi = globalThis.TapSurvivorRunUi.createRunUi({
  ui,
  formatTime,
  getGame: () => game,
  getSave: () => save,
  getGameSpeed: () => gameSpeed,
  maxEquippedWeapons,
  renderDebug: () => debugSystem.render(),
});

function startRun() {
  shellUi.closeStartMenu();
  shopSystem.closeShop();
  runUi.hideEndScreen();
  ui.levelUp.classList.add("hidden");
  shellUi.closeRunMenu(false);
  resetGameState();
}

function endRun(reason) {
  if (!game) return;
  game.running = false;
  game.endReason = reason;
  runUi.showEndScreen(reason);
  persist();
  renderMeta();
}

function advanceTowerFloor() {
  if (!game) return;
  const clearedFloor = game.towerFloor || 1;
  const awardedRelic = relicSystem.grantRandomRelic(save);
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

function maxEquippedWeapons() {
  return relicSystem.maxEquippedWeapons(save);
}

function getWeaponDamageMultiplier() {
  return relicSystem.getWeaponDamageMultiplier(save);
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
  updateWeaponBursts(dt);
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

function updateWeaponBursts(dt) {
  combat.updateWeaponBursts(dt);
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
  runStateSystem.applyRunMetaUpgrades(game);
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
  runUi.updateRunHud();
}

function closeLevelUpMenu() {
  levelUpSystem.closeLevelUpMenu();
}

function exitRun() {
  if (!game?.running) return;
  shellUi.closeRunMenu(false);
  game.paused = false;
  game.pauseReason = "";
  endRun("Run exited");
}

function closeEndScreen() {
  runUi.hideEndScreen();
  shellUi.showStartMenu();
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

function resetSave() {
  localStorage.removeItem(saveKey);
  localStorage.removeItem(legacySaveKey);
  save = saveSystem.defaultSave();
  game = null;
  runUi.hideEndScreen();
  ui.levelUp.classList.add("hidden");
  shopSystem.closeShop();
  shellUi.closeRunMenu(false);
  shellUi.showStartMenu();
  persist();
  renderMeta();
}

shellUi.bind();
debugSystem.bind();
setGameSpeed(1);

globalThis.TapSurvivorInput.bindMovementInput({
  canvas,
  getGame: () => game,
});

spriteSystem.loadSprites();
renderMeta();
requestAnimationFrame(loop);
