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
  bossConfig,
  bossAbilities,
  levelDefs,
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
  onQuestComplete: showQuestBanner,
});
let game = null;
let lastFrame = performance.now();
let gameSpeed = 1;
let runUpdater = null;

function persist() {
  saveSystem.persist(save);
}

function addQuestProgress(id, amount) {
  questSystem.addQuestProgress(id, amount);
}

function addQuestProgressGroup(ids, amount) {
  questSystem.addQuestProgressGroup(ids, amount);
}

const progressionSystem = globalThis.TapSurvivorProgression.createProgressionSystem({
  weaponDefs,
  weaponUnlocks,
  upgradeDefs,
  questDefs,
  getSave: () => save,
  openQuest: (id) => questSystem.openQuest(id),
  persist,
  renderMeta,
  applyRunMetaUpgrades,
});
const {
  hasNode,
  getUpgradeTier,
  isQuestComplete,
  isNodeVisible,
  nodeGateStatus,
  buyWeaponUnlock,
  buyUpgrade,
} = progressionSystem;

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
  weaponDefs,
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
  collectXp: (value) => runUpdater?.collectXp(value),
  distance,
  randomRange,
});

const combat = globalThis.TapSurvivorCombat.createCombatSystem({
  canvas,
  enemyTypes,
  bossConfig,
  bossAbilities,
  levelDefs,
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

runUpdater = globalThis.TapSurvivorRunUpdate.createRunUpdater({
  canvas,
  getGame: () => game,
  combat,
  pickupSystem,
  addQuestProgressGroup,
  survivalQuestIds,
  xpQuestIds,
  levelQuestIds,
  showLevelUp: () => levelUpSystem.showLevelUp(),
  endRun,
  clamp,
});

const shellUi = globalThis.TapSurvivorShellUi.createShellUiController({
  ui,
  getGame: () => game,
  getSave: () => save,
  relicDefs,
  relicSystem,
  shopSystem,
  startRun,
  exitRun,
  resetSave,
  closeLevelUpMenu,
  closeEndScreen,
  setGameSpeed,
  persist,
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
  const relicDropCount = clearedFloor % 5 === 0 ? 2 : 1;
  showRelicChoice(clearedFloor, relicDropCount, []);
}

function showRelicChoice(clearedFloor, remainingPicks, awardedRelics) {
  const choices = relicSystem.relicChoices(save, game.player.equippedWeapons, 3);
  if (!choices.length) {
    finishBossClear(clearedFloor, awardedRelics);
    return;
  }
  game.paused = true;
  game.pauseReason = "relic";
  ui.relicChoiceTitle.textContent = remainingPicks > 1 ? `Choose Relic ${awardedRelics.length + 1}` : "Choose Relic";
  ui.relicChoiceText.textContent = "Pick one reward shaped by your current weapons.";
  ui.relicChoices.innerHTML = "";
  choices.forEach((relic) => {
    const button = document.createElement("button");
    button.innerHTML = `
      <img class="level-choice-icon" src="${relic.iconPath || "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610"}" alt="" />
      <strong>${relic.name}</strong><br /><span>${relic.description}</span>
    `;
    button.addEventListener("click", () => {
      const granted = relicSystem.grantRelic(save, relic);
      const nextAwarded = granted ? [...awardedRelics, granted] : awardedRelics;
      if (remainingPicks > 1) {
        showRelicChoice(clearedFloor, remainingPicks - 1, nextAwarded);
      } else {
        finishBossClear(clearedFloor, nextAwarded);
      }
    });
    ui.relicChoices.appendChild(button);
  });
  ui.relicChoice.classList.remove("hidden");
}

function finishBossClear(clearedFloor, awardedRelics) {
  ui.relicChoice.classList.add("hidden");
  save.towerFloor = Math.max(save.towerFloor || 1, clearedFloor + 1);
  persist();
  resetGameState();
  game.lastFloorClear = {
    floor: clearedFloor,
    relicName: awardedRelics.length ? awardedRelics.map((relic) => relic.name).join(" + ") : "No locked relics remaining",
  };
  updateRunHud();
  renderMeta();
}

let questBannerTimer = 0;
function showQuestBanner(quest, reward) {
  if (!ui.questBanner || !quest) return;
  ui.questBanner.textContent = `${quest.name} complete +${reward} QP`;
  ui.questBanner.classList.remove("hidden");
  clearTimeout(questBannerTimer);
  questBannerTimer = setTimeout(() => ui.questBanner.classList.add("hidden"), 3000);
}

function maxEquippedWeapons() {
  return relicSystem.maxEquippedWeapons(save);
}

function getWeaponDamageMultiplier() {
  return relicSystem.getWeaponDamageMultiplier(save);
}

function getRunUpgradeTier(id) {
  return combat.getRunUpgradeTier(id);
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
  runUpdater.update(dt * gameSpeed);
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
