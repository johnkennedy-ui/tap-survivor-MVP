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
  onShopVisit: () => showOnceBanner("first_shop_visit", "Shop spends coins on permanent power. Use Menu > Shop during a run, or Shop before starting, to buy upgrades."),
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
    showOnceBanner(
      superBoss ? "first_super_boss_fight" : "first_boss_fight",
      superBoss
        ? "Super bosses combine powers. Keep moving, use Menu > Inventory to review relics, and expect two relic picks if you win."
        : "Boss fight. Watch the top health bar and special meter. Open Menu if you need to pause and check Rewards, Inventory, or Shop.",
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
  getGameSpeed: () => gameSpeed,
  maxEquippedWeapons,
  renderDebug: () => debugSystem.render(),
});

function startRun() {
  shellUi.closeStartFlow();
  shopSystem.closeShop();
  runUi.hideEndScreen();
  ui.levelUp.classList.add("hidden");
  shellUi.closeRunMenu(false);
  resetGameState();
  game.awaitingFirstMoveInput = true;
  showMovementGateBanner();
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
    button.className = relic.rarity === "green" ? "green-relic" : "";
    if (relic.backgroundColor && typeof button.style?.setProperty === "function") button.style.setProperty("--relic-bg", relic.backgroundColor);
    else if (relic.backgroundColor && button.style) button.style["--relic-bg"] = relic.backgroundColor;
    button.innerHTML = `
      <img class="level-choice-icon" src="${relic.iconPath || "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610"}" alt="" />
      <strong>${relic.name}</strong><br /><span>${relic.description}</span>
      ${relic.specialAbility ? `<br /><span>${relic.specialAbility.label}: ${relic.specialAbility.description}</span>` : ""}
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

let bannerTimer = 0;
function hasSeenBanner(id) {
  return save.seenBanners?.includes(id);
}

function markBannerSeen(id) {
  save.seenBanners = [...new Set([...(save.seenBanners || []), id])];
  persist();
}

function showBanner(message, duration = 5200) {
  if (!ui.questBanner || !message) return;
  ui.questBanner.textContent = message;
  ui.questBanner.classList.remove("hidden");
  clearTimeout(bannerTimer);
  if (duration > 0) {
    bannerTimer = setTimeout(() => ui.questBanner.classList.add("hidden"), duration);
  }
}

function showMovementGateBanner() {
  showBanner("Click/tap to move", 0);
}

function hideMovementGateBanner() {
  if (!ui.questBanner || ui.questBanner.textContent !== "Click/tap to move") return;
  clearTimeout(bannerTimer);
  ui.questBanner.classList.add("hidden");
}

function showOnceBanner(id, message, duration) {
  if (hasSeenBanner(id)) return false;
  markBannerSeen(id);
  showBanner(message, duration);
  return true;
}

function showQuestBanner(quest, reward) {
  if (!quest) return;
  const firstQuest = !hasSeenBanner("first_quest_completion");
  if (firstQuest) {
    markBannerSeen("first_quest_completion");
  }
  showBanner(
    firstQuest
      ? `${quest.name} complete +${reward} QP. Open Menu > Rewards to spend Quest Points and review quests.`
      : `${quest.name} complete +${reward} QP`,
  );
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
  const resetAfterRemove = () => {
    save = saveSystem.defaultSave();
    game = null;
    runUi.hideEndScreen();
    ui.levelUp.classList.add("hidden");
    shopSystem.closeShop();
    shellUi.closeRunMenu(false);
    shellUi.showTitleScreen();
    persist();
    renderMeta();
  };
  const removed = saveSystem.removeSave();
  if (removed && typeof removed.then === "function") {
    void removed.then(resetAfterRemove);
  } else {
    resetAfterRemove();
  }
}

function startRuntime() {
  shellUi.bind();
  debugSystem.bind();
  setGameSpeed(1);
  bindLifecycleFlush();

  globalThis.TapSurvivorInput.bindMovementInput({
    canvas,
    getGame: () => game,
    onFirstMoveInput: hideMovementGateBanner,
  });

  spriteSystem.loadSprites();
  renderMeta();
  requestAnimationFrame(loop);
}

function bindLifecycleFlush() {
  const flush = () => {
    void flushSave();
  };
  if (document?.addEventListener) {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
  }
  globalThis.addEventListener?.("pagehide", flush);
  globalThis.addEventListener?.("beforeunload", flush);
  bindCapacitorAppLifecycle(flush);
}

function bindCapacitorAppLifecycle(flush) {
  const app = globalThis.Capacitor?.Plugins?.App;
  if (!app?.addListener) return;
  try {
    const listener = app.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) flush();
    });
    if (listener?.catch) listener.catch(() => {});
  } catch {
    // Browser and test runtimes may not expose Capacitor App events.
  }
}

function initializeRuntime() {
  const loaded = saveSystem.loadSave();
  if (loaded && typeof loaded.then === "function") {
    void loaded.then((loadedSave) => {
      save = loadedSave;
      startRuntime();
    }).catch(() => {
      save = saveSystem.defaultSave();
      startRuntime();
    });
    return;
  }
  save = loaded;
  startRuntime();
}

initializeRuntime();
