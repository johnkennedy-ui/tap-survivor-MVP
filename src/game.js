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
  sfxDefs,
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
const audioSystem = globalThis.TapSurvivorAudio.createAudioSystem({ sfxDefs });

const storageAdapter = globalThis.TapSurvivorStorage.createStorageAdapter({
  saveKey,
  legacySaveKey,
});
const saveSystem = globalThis.TapSurvivorSave.createSaveSystem({
  saveKey,
  legacySaveKey,
  starterQuestIds,
  questDefs,
  weaponUnlocks,
  upgradeDefs,
  shopItemDefs,
  questOpenIds,
  storageAdapter,
});

let save = saveSystem.defaultSave();
const bannerSystem = globalThis.TapSurvivorGameBanners.createGameBannerSystem({
  ui,
  getSave: () => save,
  persist,
});
const questSystem = globalThis.TapSurvivorQuests.createQuestSystem({
  questDefs,
  getSave: () => save,
  persist,
  renderMeta,
  onQuestComplete: bannerSystem.showQuestBanner,
});
let game = null;
let lastFrame = performance.now();
let runUpdater = null;
let runLifecycle = null;
let gameRuntime = null;

function persist() {
  return saveSystem.persist(save);
}

function flushSave() {
  return persist();
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
  onShopVisit: () => bannerSystem.showOnceBanner("first_shop_visit", "Coins buy permanent power upgrades."),
  onPurchaseNotice: (message) => bannerSystem.showBanner(message),
  playPurchaseSfx: audioSystem.playShopPurchase,
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
  globalThis.TapSurvivorEffects.applyRelicSpecialEffects(game, getRelicSpecialEffects());
  applyRelicStartingRunUpgrades(game);
  return game;
}

function applyRelicStartingRunUpgrades(run) {
  const startingTiers = relicSystem.startingRunUpgradeTiers(save);
  Object.entries(startingTiers).forEach(([upgradeId, tier]) => {
    const upgrade = runUpgradeDefs.find((item) => item.id === upgradeId);
    if (!upgrade) return;
    const maxTier = upgrade.maxTier + relicSystem.relicBonusFor(save, upgradeId, "maxTierBonus");
    const appliedTier = Math.min(Math.max(0, Math.floor(tier)), maxTier);
    if (appliedTier <= 0) return;
    run.runUpgradeTiers[upgradeId] = Math.max(run.runUpgradeTiers[upgradeId] || 0, appliedTier);
    for (let index = 0; index < appliedTier; index += 1) {
      upgrade.apply?.(run);
    }
  });
}

const pickupSystem = globalThis.TapSurvivorPickups.createPickupSystem({
  getGame: () => game,
  getSave: () => save,
  getRelicSpecialEffects,
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
  getRelicSpecialEffects,
  addQuestProgress,
  addQuestProgressForWeapon: questSystem.addQuestProgressForWeapon,
  addQuestProgressGroup,
  killQuestIds,
  damageQuestIds,
  bossQuestIds,
  spawnLootDrops: pickupSystem.spawnLootDrops,
  getWeaponDamageMultiplier,
  playWeaponSfx: audioSystem.playWeapon,
  advanceTowerFloor,
  endRun,
  onBossSpawn: ({ superBoss }) =>
    bannerSystem.showOnceBanner(
      superBoss ? "first_super_boss_fight" : "first_boss_fight",
      superBoss
        ? "Super bosses combine powers. Keep moving, use Menu > Inventory to review relics, and expect two relic picks if you win."
        : "Boss fight. Watch the top health bar and special meter. Open Menu if you need to pause and check Rewards or Inventory.",
    ),
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
  playChoiceSfx: playLevelChoiceSfx,
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
  getRelicSpecialEffects,
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
  playStartLaugh: audioSystem.playStartLaugh,
  toggleAudioMute,
  isAudioMuted: audioSystem.isMuted,
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
  getGameSpeed: () => gameRuntime?.getGameSpeed() || 1,
  maxEquippedWeapons,
  renderDebug: () => debugSystem.render(),
});

runLifecycle = globalThis.TapSurvivorRunLifecycle.createRunLifecycle({
  ui,
  getGame: () => game,
  getSave: () => save,
  resetGameState,
  shopSystem,
  shellUi,
  runUi,
  relicSystem,
  persist,
  renderMeta,
  updateRunHud,
  showMovementGateBanner: bannerSystem.showMovementGateBanner,
});

function startRun() {
  runLifecycle.startRun();
}

function endRun(reason) {
  runLifecycle.endRun(reason);
}

function advanceTowerFloor() {
  runLifecycle.advanceTowerFloor();
}

function maxEquippedWeapons() {
  return relicSystem.maxEquippedWeapons(save);
}

function getWeaponDamageMultiplier() {
  return relicSystem.getWeaponDamageMultiplier(save);
}

function getRelicSpecialEffects() {
  return relicSystem.specialEffects(save);
}

function getRunUpgradeTier(id) {
  return combat.getRunUpgradeTier(id);
}

function playLevelChoiceSfx(choice) {
  if (choice.weaponId) audioSystem.playWeapon(choice.weaponId);
  if (choice.runUpgradeId) audioSystem.playRunUpgrade(choice.runUpgradeId);
}

function applyRunMetaUpgrades() {
  runStateSystem.applyRunMetaUpgrades(game);
}

function toggleAudioMute() {
  return audioSystem.toggleMuted();
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
  shellUi.showTitleScreen();
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  runUpdater.update(dt * (gameRuntime?.getGameSpeed() || 1));
  draw();
  updateRunHud();
  requestAnimationFrame(loop);
}

function setGameSpeed(speed) {
  gameRuntime.setGameSpeed(speed);
}

function resetSave() {
  gameRuntime.resetSave();
}

gameRuntime = globalThis.TapSurvivorGameRuntime.createGameRuntimeController({
  canvas,
  ui,
  documentRef: document,
  globalRef: globalThis,
  getGame: () => game,
  setGame: (nextGame) => {
    game = nextGame;
  },
  getSave: () => save,
  setSave: (nextSave) => {
    save = nextSave;
  },
  saveSystem,
  shellUi,
  shopSystem,
  runUi,
  debugSystem,
  spriteSystem,
  bannerSystem,
  persist,
  renderMeta,
  loop,
});

gameRuntime.initializeRuntime();
