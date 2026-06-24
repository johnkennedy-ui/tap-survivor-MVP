const dependencies = globalThis.TapSurvivorGameDependencies.createGameDependencyBag({
  globalRef: globalThis,
});
const {
  audio: audioDependencies,
  combat: combatDependencies,
  content,
  contentRegistry,
  debug: debugDependencies,
  debugBalance,
  effects,
  gameBanners,
  gameRuntime: gameRuntimeDependencies,
  input,
  levelUp,
  mapSystem: mapSystemDependencies,
  math,
  pickups,
  progression,
  quests,
  relics,
  renderEnemies,
  renderHud,
  rendering,
  runLifecycle: runLifecycleDependencies,
  runState,
  runUi: runUiDependencies,
  runUpdate,
  save: saveDependencies,
  shellUi: shellUiDependencies,
  shop,
  sprites,
  storage,
  ui: uiDependencies,
  upgrades: upgradeContent,
} = dependencies;

const ui = uiDependencies.createUi();
const canvas = ui.canvas;
const ctx = canvas.getContext("2d");

const saveKey = "tap-survivor-mvp-save-v2";
const legacySaveKey = "tap-survivor-mvp-save-v1";

const { clamp, distance, randomRange, formatTime } = math;
const { questOpenIds } = quests;
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
  mapDefs,
  tuningDefs,
  shopItemDefs,
  relicDefs,
} = contentRegistry.createContentRegistry({
  content,
  upgradeContent,
});
const skillEffectSprites = spriteDefs.weapons || {};
const spriteHelpers = sprites;
const spriteSystem = spriteHelpers.createSpriteSystem({ ctx, spriteDefs });
const spriteSheetRenderer = spriteHelpers.createSpriteSheetRenderer({
  ctx,
  spriteSheets: spriteDefs.spriteSheets || {},
});
const audioSystem = audioDependencies.createAudioSystem({ sfxDefs });
const mapSystem = mapSystemDependencies.createMapSystem({
  mapDefs,
  levelDefs,
  spriteDefs,
});

const storageAdapter = storage.createStorageAdapter({
  saveKey,
  legacySaveKey,
});
const saveSystem = saveDependencies.createSaveSystem({
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
const bannerSystem = gameBanners.createGameBannerSystem({
  ui,
  getSave: () => save,
  persist,
});
const questSystem = quests.createQuestSystem({
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

const progressionSystem = progression.createProgressionSystem({
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

const uiRenderer = uiDependencies.createUiRenderer({
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

const shopSystem = shop.createShopSystem({
  ui,
  shopItemDefs,
  pricingConfig: tuningDefs.shop,
  getSave: () => save,
  getGame: () => game,
  onShopVisit: () => bannerSystem.showOnceBanner("first_shop_visit", "Coins buy permanent power upgrades."),
  onPurchaseNotice: (message) => bannerSystem.showBanner(message),
  playPurchaseSfx: audioSystem.playShopPurchase,
  persist,
  renderMeta,
});

const relicSystem = relics.createRelicSystem({
  relicDefs,
  weaponDefs,
});

const runStateSystem = runState.createRunStateSystem({
  canvas,
  mapSystem,
  getSave: () => save,
  getShopBonuses: () => shopSystem.getShopBonuses(),
  getUpgradeTier,
  maxEquippedWeapons,
  weaponDefs,
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
  effects.applyRelicSpecialEffects(game, getRelicSpecialEffects());
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

const pickupSystem = pickups.createPickupSystem({
  getGame: () => game,
  getSave: () => save,
  lootConfig: tuningDefs.loot,
  getRelicSpecialEffects,
  persist,
  renderMeta,
  collectXp: (value) => runUpdater?.collectXp(value),
  distance,
  randomRange,
});

const combat = combatDependencies.createCombatSystem({
  canvas,
  enemyTypes,
  bossConfig,
  bossAbilities,
  levelDefs,
  getActiveFloorDef: () => game?.activeFloor,
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

const levelUpSystem = levelUp.createLevelUpSystem({
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

runUpdater = runUpdate.createRunUpdater({
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
  mapSystem,
  clamp,
});

const shellUi = shellUiDependencies.createShellUiController({
  ui,
  getGame: () => game,
  getSave: () => save,
  weaponDefs,
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

const debugSystem = debugDependencies.createDebugSystem({
  ui,
  getGame: () => game,
  getSave: () => save,
  getRunUpgradeTier,
  maxEquippedWeapons,
  getWeaponDamageMultiplier,
  getActiveProfile: () => debugBalance?.getActiveProfile?.() || "default",
  relicDefs,
  runUpgradeDefs,
});

const runUi = runUiDependencies.createRunUi({
  ui,
  formatTime,
  getGame: () => game,
  getSave: () => save,
  getGameSpeed: () => gameRuntime?.getGameSpeed() || 1,
  maxEquippedWeapons,
  renderDebug: () => debugSystem.render(),
});

runLifecycle = runLifecycleDependencies.createRunLifecycle({
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

const renderer = rendering.createRenderer({
  canvas,
  ctx,
  clamp,
  createEnemyRenderer: renderEnemies.createEnemyRenderer,
  createHudRenderer: renderHud.createHudRenderer,
  drawImage: spriteSystem.drawImage,
  drawSprite: spriteSystem.drawSprite,
  runUpgradeDefs,
  skillEffectSprites,
  spriteSheetRenderer,
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

gameRuntime = gameRuntimeDependencies.createGameRuntimeController({
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
  bindMovementInput: input.bindMovementInput,
  persist,
  renderMeta,
  loop,
});

gameRuntime.initializeRuntime();
