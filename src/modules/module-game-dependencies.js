import { floorDifficulty } from "./balance.js";
import { createCombatDamageSystem } from "./combat-damage.js";
import { createContentRegistry } from "./content-registry.js";
import { createEffects } from "./effects.js";
import { createGameRuntimeController } from "./game-runtime.js";
import { createGameStateStore } from "./game-state-store.js";
import { createModuleRuntimeAssetsAdapter } from "./module-runtime-assets-adapter.js";
import { createModuleRuntimeAudioAdapter } from "./module-runtime-audio-adapter.js";
import { createModuleRuntimeGameplayAdapter } from "./module-runtime-gameplay-adapter.js";
import { createModuleRuntimePlatformAdapter } from "./module-runtime-platform-adapter.js";
import { createModuleRuntimeProgressionAdapter } from "./module-runtime-progression-adapter.js";
import { createModuleRuntimeRenderingAdapter } from "./module-runtime-rendering-adapter.js";
import { createModuleRuntimeSpriteAdapter } from "./module-runtime-sprite-adapter.js";
import { createModuleRuntimeStorageAdapter } from "./module-runtime-storage-adapter.js";
import { createModuleRuntimeUiAdapters } from "./module-runtime-ui-adapters.js";
import { createDebugRuntimeHarness } from "../debug-runtime-harness.js";
import { choiceId, shopFocusBonus, shuffleChoices, weightedChoices } from "./level-up-choices.js";
import { createMapSystem } from "./map-system.js";
import { clamp, distance, formatTime, randomRange } from "./math.js";
import { createPickupSystem } from "./pickups.js";
import { createRelicProgression } from "./relic-progression.js";
import { createRelicSystem } from "./relics.js";
import { createRunLifecycle } from "./run-lifecycle.js";
import { createRunStateSystem } from "./run-state.js";
import { createRunUpdater } from "./run-update.js";
import { createRunUi } from "./run-ui.js";
import { createSaveLoadHandler } from "./save-corruption.js";
import { CURRENT_SAVE_VERSION, createDefaultSave } from "./save-defaults.js";
import { isPlainObject, migrateSave } from "./save-migrations.js";
import { createSaveNormalizer } from "./save-normalize.js";
import { createSaveSystem } from "./save.js";
import { createShellRelicController } from "./shell-relic-controller.js";
import { createShellRelicPresenter } from "./shell-relic-presenter.js";
import { createShellRelicUiAdapter } from "./shell-relic-ui.js";
import { createShellUiController } from "./shell-ui-controller.js";
import { createShellUiDomAdapter } from "./shell-ui-dom-adapter.js";
import { createShellUiPresenter } from "./shell-ui-presenter.js";
import { createShopSystem } from "./shop.js";
import { createShopPricing } from "./shop-pricing.js";
import { createWeaponScaling } from "./weapon-cooldowns.js";
import { createWeaponProjectileSystem, rotateVector } from "./weapon-projectiles.js";
import { nearestEnemy } from "./weapon-targeting.js";

export const MODULE_NATIVE_GAME_DEPENDENCY_SLOTS = Object.freeze([
  "balance",
  "combatDamage",
  "contentRegistry",
  "effects",
  "gameRuntime",
  "gameStateStore",
  "mapSystem",
  "math",
  "levelUpChoices",
  "moduleRuntimeAssetsAdapter",
  "moduleRuntimeAudioAdapter",
  "moduleRuntimeGameplayAdapter",
  "moduleRuntimeProgressionAdapter",
  "moduleRuntimeRenderingAdapter",
  "moduleRuntimeSpriteAdapter",
  "moduleRuntimeStorageAdapter",
  "moduleRuntimeUiAdapters",
  "pickups",
  "relics",
  "runLifecycle",
  "runState",
  "runUi",
  "runUpdate",
  "save",
  "saveCorruption",
  "saveDefaults",
  "saveMigrations",
  "saveNormalize",
  "shellRelicController",
  "shellRelicPresenter",
  "shellRelicUi",
  "shellUiController",
  "shellUiDomAdapter",
  "shellUiPresenter",
  "shopPricing",
  "weaponCooldowns",
  "weaponProjectiles",
  "weaponTargeting",
]);

export const INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS = Object.freeze([
  "assetAdapters",
  "audioAdapters",
  "gameplayAdapters",
  "initialGame",
  "initialSave",
  "platformAdapters",
  "progressionAdapters",
  "renderingAdapters",
  "renderMetaSink",
  "spriteAdapters",
  "storageAdapters",
  "uiAdapters",
]);

export const CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS = Object.freeze([]);

export function createModuleGameDependencyBag({
  adapters,
  content = {},
  contentSchema = {},
  random,
  saveConfig,
  shopPricingConfig = {},
  upgradeContent = {},
}) {
  const resolvedAdapters = requireObject(adapters, "adapters");
  const platformAdapters = createModuleRuntimePlatformAdapter(
    requireObject(resolvedAdapters.platformAdapters, "adapters.platformAdapters")
  );
  const contentRegistry = createContentRegistry({ content, upgradeContent });
  const effects = createEffects({ contentSchema });
  const assetAdapters = createModuleRuntimeAssetsAdapter({
    ...requireObject(resolvedAdapters.assetAdapters, "adapters.assetAdapters"),
    assetDefs: /** @type {any} */ (content).assets || {},
  });
  const audioAdapters = createModuleRuntimeAudioAdapter({
    ...requireObject(resolvedAdapters.audioAdapters, "adapters.audioAdapters"),
    sfxDefs: contentRegistry.sfxDefs,
  });
  const audioSystem = audioAdapters.audio.createAudioSystem();
  const storageAdapters = createModuleRuntimeStorageAdapter(
    createModuleRuntimeStorageAdapterOptions({
      saveConfig: requireObject(saveConfig, "saveConfig"),
      storageAdapters: requireObject(resolvedAdapters.storageAdapters, "adapters.storageAdapters"),
    })
  );
  const saveSystem = createModuleSaveSystem({
    saveConfig: requireObject(saveConfig, "saveConfig"),
    contentRegistry,
    storageAdapter: storageAdapters.storageAdapter,
  });
  let uiProgressionRenderer = null;
  const stateStore = createGameStateStore({
    initialGame: resolvedAdapters.initialGame || null,
    initialSave: resolvedAdapters.initialSave,
    renderMetaSink: (payload) => {
      const result = resolvedAdapters.renderMetaSink?.(payload);
      uiProgressionRenderer?.renderMeta?.();
      return result;
    },
    saveSystem,
  });
  const injectedUiAdapters = requireObject(resolvedAdapters.uiAdapters, "adapters.uiAdapters");
  if (typeof injectedUiAdapters.bindShopSystem === "function") {
    const nativeShopSystem = createShopSystem({
      documentRef: injectedUiAdapters.shopDocumentRef,
      effects,
      getGame: stateStore.getGame,
      getSave: stateStore.getSave,
      onPurchaseNotice: (message) => platformAdapters.bannerSystem.showBanner?.(message),
      onShopVisit: () =>
        platformAdapters.bannerSystem.showOnceBanner?.(
          "first_shop_visit",
          "Coins buy permanent power upgrades."
        ),
      persist: stateStore.persist,
      playPurchaseSfx: audioSystem.playShopPurchase,
      pricingConfig: shopPricingConfig,
      renderMeta: stateStore.renderMeta,
      shopItemDefs: contentRegistry.shopItemDefs,
      shopPricing: { createShopPricing },
      ui: injectedUiAdapters.ui,
    });
    injectedUiAdapters.bindShopSystem(nativeShopSystem);
  }
  const relics = createRelicSystem({
    relicDefs: contentRegistry.relicDefs,
    weaponDefs: contentRegistry.weaponDefs,
    progressionConfig: contentRegistry.tuningDefs.progression,
    random,
  });
  const uiAdapters = createModuleRuntimeUiAdapters({
    ...injectedUiAdapters,
    stateStore,
  });
  const spriteAdapters = createModuleRuntimeSpriteAdapter(
    requireObject(resolvedAdapters.spriteAdapters, "adapters.spriteAdapters")
  );
  const renderingAdapters = createModuleRuntimeRenderingAdapter({
    ...requireObject(resolvedAdapters.renderingAdapters, "adapters.renderingAdapters"),
    assetAdapters,
    platformAdapters,
    spriteAdapters,
    uiAdapters,
  });
  const gameplayAdapters = createModuleRuntimeGameplayAdapter({
    ...requireObject(resolvedAdapters.gameplayAdapters, "adapters.gameplayAdapters"),
    balance: { floorDifficulty },
    combatDamage: { createCombatDamageSystem },
    effects,
    math: { clamp, distance, formatTime, randomRange },
    pickups: { createPickupSystem },
    runState: { createRunStateSystem },
    runUpdate: { createRunUpdater },
    weaponCooldowns: { createWeaponScaling },
    weaponProjectiles: { createWeaponProjectileSystem, rotateVector },
    weaponTargeting: { nearestEnemy },
  });
  const levelUpChoices = { choiceId, shopFocusBonus, shuffleChoices, weightedChoices };
  const progressionAdapters = createModuleRuntimeProgressionAdapter({
    ...requireObject(resolvedAdapters.progressionAdapters, "adapters.progressionAdapters"),
    balance: { floorDifficulty },
    content,
    contentRegistry,
    effects,
    levelUpChoices,
    relicProgression: { createRelicProgression },
    relics,
    save: saveSystem,
    shopPricing: { createShopPricing },
  });
  const mapSystemInstance = createMapSystem({
    levelDefs: contentRegistry.levelDefs,
    mapDefs: contentRegistry.mapDefs,
    spriteDefs: contentRegistry.spriteDefs,
  });
  const getUpgradeTier = (id) => {
    const tier =
      saveSystem.getSave?.().upgradeTiers?.[id] || stateStore.getSave().upgradeTiers?.[id] || 0;
    const upgrade = contentRegistry.upgradeDefs.find((entry) => entry.id === id);
    return Math.min(upgrade?.maxTier || tier, tier);
  };
  const maxEquippedWeapons = () => relics.maxEquippedWeapons(stateStore.getSave());
  const runStateSystem = createRunStateSystem({
    canvas: platformAdapters.canvas,
    getSave: stateStore.getSave,
    getShopBonuses: () => uiAdapters.shopSystemAdapter.getShopBonuses?.() || {},
    getUpgradeTier,
    mapSystem: mapSystemInstance,
    maxEquippedWeapons,
    weaponDefs: contentRegistry.weaponDefs,
  });
  const getRelicSpecialEffects = () => relics.specialEffects(stateStore.getSave());
  const getWeaponDamageMultiplier = () => relics.getWeaponDamageMultiplier(stateStore.getSave());
  const questSystem = createQuestSystemFacade(
    progressionAdapters.quests.createQuestSystem?.({
      questDefs: contentRegistry.questDefs,
      getSave: stateStore.getSave,
      persist: stateStore.persist,
      renderMeta: stateStore.renderMeta,
      onQuestComplete: (quest, reward) =>
        platformAdapters.bannerSystem.showQuestBanner?.(quest, reward),
    })
  );
  const progressionSystem = progressionAdapters.progression.createProgressionSystem({
    applyRunMetaUpgrades: (game) => runStateSystem.applyRunMetaUpgrades(game),
    getSave: stateStore.getSave,
    openQuest: questSystem.openQuest,
    persist: stateStore.persist,
    questDefs: contentRegistry.questDefs,
    renderMeta: stateStore.renderMeta,
    upgradeDefs: contentRegistry.upgradeDefs,
    weaponDefs: contentRegistry.weaponDefs,
    weaponUnlocks: contentRegistry.weaponUnlocks,
  });
  uiProgressionRenderer = progressionAdapters.uiProgression.createUiProgressionRenderer({
    assets: assetAdapters.assets,
    buyUpgrade: progressionSystem.buyUpgrade,
    buyWeaponUnlock: progressionSystem.buyWeaponUnlock,
    documentRef: injectedUiAdapters.shopDocumentRef,
    getSave: stateStore.getSave,
    getUpgradeTier: progressionSystem.getUpgradeTier,
    hasNode: progressionSystem.hasNode,
    isNodeVisible: progressionSystem.isNodeVisible,
    isQuestComplete: progressionSystem.isQuestComplete,
    nodeGateStatus: progressionSystem.nodeGateStatus,
    progressionConfig: contentRegistry.tuningDefs.progression,
    questDefs: contentRegistry.questDefs,
    ui: uiAdapters.ui,
    upgradeDefs: contentRegistry.upgradeDefs,
    weaponDefs: contentRegistry.weaponDefs,
    weaponUnlocks: contentRegistry.weaponUnlocks,
  });
  uiProgressionRenderer?.renderMeta?.();
  let runUpdater = null;
  let boundRunLifecycle = null;
  const advanceTowerFloor = () => {
    if (typeof boundRunLifecycle?.advanceTowerFloor === "function") {
      return boundRunLifecycle.advanceTowerFloor();
    }
    return advanceTowerFloorFallback(stateStore);
  };
  const bindRunLifecycle = (runLifecycle) => {
    boundRunLifecycle =
      runLifecycle && typeof runLifecycle.advanceTowerFloor === "function" ? runLifecycle : null;
    return Boolean(boundRunLifecycle);
  };
  const pickupSystem = createPickupSystem({
    getGame: stateStore.getGame,
    getSave: stateStore.getSave,
    lootConfig: contentRegistry.tuningDefs.loot,
    getRelicSpecialEffects,
    persist: stateStore.persist,
    renderMeta: stateStore.renderMeta,
    collectXp: (value) => runUpdater?.collectXp?.(value),
    distance,
    randomRange,
  });
  const combatSystem = gameplayAdapters.combat.createCombatSystem({
    canvas: platformAdapters.canvas,
    balance: { floorDifficulty },
    combatDamage: { createCombatDamageSystem },
    content,
    enemies: gameplayAdapters.enemies,
    enemyBehaviors: gameplayAdapters.enemyBehaviors,
    enemySpawning: gameplayAdapters.enemySpawning,
    enemyTypes: contentRegistry.enemyTypes,
    bossConfig: contentRegistry.bossConfig,
    bossAbilities: contentRegistry.bossAbilities,
    levelDefs: contentRegistry.levelDefs,
    getActiveFloorDef: () => stateStore.getGame()?.activeFloor,
    weaponDefs: contentRegistry.weaponDefs,
    getGame: stateStore.getGame,
    getUpgradeTier,
    getShopBonuses: () => uiAdapters.shopSystemAdapter.getShopBonuses?.() || {},
    getRelicSpecialEffects,
    addQuestProgress: questSystem.addQuestProgress,
    addQuestProgressForWeapon: questSystem.addQuestProgressForWeapon,
    addQuestProgressGroup: questSystem.addQuestProgressGroup,
    killQuestIds: contentRegistry.killQuestIds,
    damageQuestIds: contentRegistry.damageQuestIds,
    bossQuestIds: contentRegistry.bossQuestIds,
    spawnLootDrops: pickupSystem.spawnLootDrops,
    getWeaponDamageMultiplier,
    playWeaponSfx: audioSystem.playWeapon,
    advanceTowerFloor,
    endRun: (reason) => endRun({ reason, stateStore, uiAdapters }),
    onBossSpawn: ({ superBoss }) =>
      platformAdapters.bannerSystem.showOnceBanner?.(
        superBoss ? "first_super_boss_fight" : "first_boss_fight",
        superBoss
          ? "Super bosses combine powers. Keep moving and expect two relic picks if you win."
          : "Boss fight. Watch the top health bar and special meter."
      ),
    distance,
    clamp,
    weaponBehaviors: gameplayAdapters.weaponBehaviors,
    weaponCooldowns: { createWeaponScaling },
    weaponFire: gameplayAdapters.weaponFire,
    weaponProjectiles: { createWeaponProjectileSystem, rotateVector },
    weaponTargeting: { nearestEnemy },
  });
  const levelUpSystem = progressionAdapters.levelUp.createLevelUpSystem({
    activeQuestWeaponIds: questSystem.activeQuestWeaponIds,
    assets: assetAdapters.assets,
    content,
    documentRef: injectedUiAdapters.shopDocumentRef,
    getGame: stateStore.getGame,
    getRunUpgradeTier: (id) => combatSystem.getRunUpgradeTier?.(id) || 0,
    getSave: stateStore.getSave,
    levelUpChoices,
    maxEquippedWeapons,
    playChoiceSfx: (choice) => {
      if (choice?.weaponId) audioSystem.playWeapon(choice.weaponId);
      if (choice?.runUpgradeId) audioSystem.playRunUpgrade(choice.runUpgradeId);
    },
    relicDefs: contentRegistry.relicDefs,
    random,
    runUpgradeDefs: contentRegistry.runUpgradeDefs,
    ui: uiAdapters.ui,
    weaponDefs: contentRegistry.weaponDefs,
  });
  if (typeof injectedUiAdapters.bindRuntimeUiActions === "function") {
    injectedUiAdapters.bindRuntimeUiActions({
      closeEndScreen: () => {
        uiAdapters.runUiAdapter.hideEndScreen?.();
        uiAdapters.shellUiAdapter.showTitleScreen?.();
        return true;
      },
      closeLevelUpMenu: () => {
        if (typeof levelUpSystem?.closeLevelUpMenu !== "function") return false;
        levelUpSystem.closeLevelUpMenu();
        return true;
      },
      closeShopMenu: () => {
        uiAdapters.shopSystemAdapter.closeShop?.();
        if (!stateStore.getGame()?.running) uiAdapters.shellUiAdapter.showTitleScreen?.();
        return true;
      },
      exitRun: () => {
        const game = stateStore.getGame();
        if (!game?.running) return false;
        uiAdapters.shellUiAdapter.closeRunMenu?.(false);
        game.paused = false;
        game.pauseReason = "";
        return endRun({ reason: "Run exited", stateStore, uiAdapters });
      },
      isAudioMuted: () => audioSystem.isMuted?.() ?? false,
      setRunMenuOpen: (open) => {
        const game = stateStore.getGame();
        if (!game?.running) return false;
        if (open) {
          if (!game.paused) {
            game.paused = true;
            game.pauseReason = "menu";
          }
        } else if (game.pauseReason === "menu") {
          game.paused = false;
          game.pauseReason = "";
        }
        return true;
      },
      toggleAudioMute: () => audioSystem.toggleMuted?.() ?? false,
    });
  }
  if (hasCombatRuntime(combatSystem)) {
    runUpdater = createRunUpdater({
      canvas: platformAdapters.canvas,
      getGame: stateStore.getGame,
      combat: combatSystem,
      pickupSystem,
      addQuestProgressGroup: questSystem.addQuestProgressGroup,
      survivalQuestIds: contentRegistry.survivalQuestIds,
      xpQuestIds: contentRegistry.xpQuestIds,
      levelQuestIds: contentRegistry.levelQuestIds,
      showLevelUp: () => {
        if (typeof levelUpSystem?.showLevelUp === "function") {
          return levelUpSystem.showLevelUp();
        }
        return showLevelUp(uiAdapters, stateStore);
      },
      endRun: (reason) => endRun({ reason, stateStore, uiAdapters }),
      getRelicSpecialEffects,
      mapSystem: mapSystemInstance,
      clamp,
    });
  }
  const resetGameState = () => {
    const run = runStateSystem.resetGameState();
    effects.applyRelicSpecialEffects(run, getRelicSpecialEffects());
    applyRelicStartingRunUpgrades({
      effects,
      relics,
      run,
      runUpgradeDefs: contentRegistry.runUpgradeDefs,
      save: stateStore.getSave(),
    });
    return run;
  };

  const debugRuntime = createDebugRuntimeHarness({
    combat: combatSystem,
    contentRegistry,
    effects,
    getGame: stateStore.getGame,
    pickupSystem,
  });
  platformAdapters.debugSystem.setRuntime?.(debugRuntime);

  const moduleSystems = {
    balance: { floorDifficulty },
    combatDamage: { createCombatDamageSystem },
    content,
    contentRegistry,
    effects,
    gameRuntime: { createGameRuntimeController },
    gameStateStore: stateStore,
    levelUpChoices,
    mapSystem: { createMapSystem, instance: mapSystemInstance },
    math: { clamp, distance, formatTime, randomRange },
    moduleRuntimeGameplayAdapter: gameplayAdapters,
    moduleRuntimeAssetsAdapter: assetAdapters,
    moduleRuntimeAudioAdapter: audioAdapters,
    moduleRuntimeProgressionAdapter: progressionAdapters,
    moduleRuntimeRenderingAdapter: renderingAdapters,
    moduleRuntimeSpriteAdapter: spriteAdapters,
    moduleRuntimeStorageAdapter: storageAdapters,
    moduleRuntimeUiAdapters: uiAdapters,
    progression: progressionSystem,
    uiProgression: uiProgressionRenderer,
    pickups: { createPickupSystem, instance: pickupSystem },
    relicProgression: { createRelicProgression },
    relics,
    runLifecycle: { createRunLifecycle },
    runState: { createRunStateSystem, instance: runStateSystem },
    runUi: { createRunUi },
    runUpdate: { createRunUpdater, instance: runUpdater },
    save: saveSystem,
    saveCorruption: { createSaveLoadHandler },
    saveDefaults: { CURRENT_SAVE_VERSION, createDefaultSave },
    saveMigrations: { isPlainObject, migrateSave },
    saveNormalize: { createSaveNormalizer },
    shellRelicController: { createShellRelicController },
    shellRelicPresenter: { createShellRelicPresenter },
    shellRelicUi: { createShellRelicUiAdapter },
    shellUiController: { createShellUiController },
    shellUiDomAdapter: { createShellUiDomAdapter },
    shellUiPresenter: { createShellUiPresenter },
    shopPricing: createShopPricing({
      shopItemDefs: contentRegistry.shopItemDefs,
      pricingConfig: shopPricingConfig,
      getSave: stateStore.getSave,
    }),
    weaponCooldowns: { createWeaponScaling },
    weaponProjectiles: { createWeaponProjectileSystem, rotateVector },
    weaponTargeting: { nearestEnemy },
  };

  return {
    assets: assetAdapters.assets,
    audio: audioAdapters.audio,
    audioSystem,
    bannerSystem: platformAdapters.bannerSystem,
    bindRunLifecycle,
    bindMovementInput: platformAdapters.bindMovementInput,
    canvas: platformAdapters.canvas,
    combat: gameplayAdapters.combat,
    debugSystem: platformAdapters.debugSystem,
    debugRuntime,
    enemies: gameplayAdapters.enemies,
    enemyBehaviors: gameplayAdapters.enemyBehaviors,
    enemySpawning: gameplayAdapters.enemySpawning,
    getGame: stateStore.getGame,
    getSave: stateStore.getSave,
    loop: platformAdapters.loop,
    levelUp: progressionAdapters.levelUp,
    moduleSystems,
    persist: stateStore.persist,
    progression: progressionAdapters.progression,
    quests: progressionAdapters.quests,
    renderEnemies: renderingAdapters.renderEnemies,
    renderHud: renderingAdapters.renderHud,
    renderPlayer: renderingAdapters.renderPlayer,
    renderMeta: stateStore.renderMeta,
    renderSkillRail: renderingAdapters.renderSkillRail,
    rendering: renderingAdapters.rendering,
    relicSystem: relics,
    resetGameState,
    runUpdater,
    runUi: uiAdapters.runUiAdapter,
    saveSystem,
    setGame: stateStore.setGame,
    setSave: stateStore.setSave,
    shellUi: uiAdapters.shellUiAdapter,
    shop: progressionAdapters.shop,
    shopSystem: uiAdapters.shopSystemAdapter,
    spriteSystem: spriteAdapters.spriteSystem,
    ui: uiAdapters.ui,
    uiProgression: progressionAdapters.uiProgression,
    upgrades: progressionAdapters.upgrades,
    weaponBehaviors: gameplayAdapters.weaponBehaviors,
    weaponFire: gameplayAdapters.weaponFire,
  };
}

function createModuleSaveSystem({ saveConfig, contentRegistry, storageAdapter }) {
  return createSaveSystem({
    saveCorruption: { createSaveLoadHandler },
    saveDefaults: { CURRENT_SAVE_VERSION, createDefaultSave },
    saveMigrations: { isPlainObject, migrateSave },
    saveNormalize: { createSaveNormalizer },
    legacySaveKey: requireString(saveConfig.legacySaveKey, "saveConfig.legacySaveKey"),
    questDefs: saveConfig.questDefs || contentRegistry.questDefs,
    questOpenIds: saveConfig.questOpenIds || ((quest) => quest?.opens || []),
    saveKey: requireString(saveConfig.saveKey, "saveConfig.saveKey"),
    shopItemDefs: saveConfig.shopItemDefs || contentRegistry.shopItemDefs,
    starterQuestIds: saveConfig.starterQuestIds || contentRegistry.starterQuestIds,
    storage: null,
    storageAdapter: requireAdapter({ storageAdapter }, "storageAdapter"),
    upgradeDefs: saveConfig.upgradeDefs || contentRegistry.upgradeDefs,
    weaponUnlocks: saveConfig.weaponUnlocks || contentRegistry.weaponUnlocks,
  });
}

function createModuleRuntimeStorageAdapterOptions({ saveConfig, storageAdapters }) {
  return {
    ...storageAdapters,
    legacySaveKey: storageAdapters.legacySaveKey || saveConfig.legacySaveKey,
    saveKey: storageAdapters.saveKey || saveConfig.saveKey,
  };
}

function createQuestSystemFacade(questSystem = {}) {
  const noop = () => {};
  return {
    activeQuestWeaponIds:
      typeof questSystem.activeQuestWeaponIds === "function"
        ? questSystem.activeQuestWeaponIds
        : () => [],
    addQuestProgress:
      typeof questSystem.addQuestProgress === "function" ? questSystem.addQuestProgress : noop,
    addQuestProgressForWeapon:
      typeof questSystem.addQuestProgressForWeapon === "function"
        ? questSystem.addQuestProgressForWeapon
        : noop,
    addQuestProgressGroup:
      typeof questSystem.addQuestProgressGroup === "function"
        ? questSystem.addQuestProgressGroup
        : noop,
    openQuest: typeof questSystem.openQuest === "function" ? questSystem.openQuest : noop,
  };
}

function hasCombatRuntime(combatSystem) {
  return [
    "spawnEnemies",
    "spawnBoss",
    "updateBossSpecials",
    "updateEnemies",
    "updateEnemyBolts",
    "updateWeapons",
    "updateBolts",
    "updateAreas",
    "updateBeams",
    "updateWeaponBursts",
  ].every((name) => typeof combatSystem?.[name] === "function");
}

export function applyRelicStartingRunUpgrades({ effects, relics, run, runUpgradeDefs, save }) {
  const startingTiers = relics.startingRunUpgradeTiers(save) || {};
  const candidates = runUpgradeDefs
    .map((upgrade, registryIndex) => {
      const requestedTier = Number(startingTiers[upgrade.id]);
      const maxTier = upgrade.maxTier + relics.relicBonusFor(save, upgrade.id, "maxTierBonus");
      const appliedTier = Number.isFinite(requestedTier)
        ? Math.min(Math.max(0, Math.floor(requestedTier)), maxTier)
        : 0;
      return {
        appliedTier,
        exclusiveGroup:
          typeof upgrade.exclusiveGroup === "string" && upgrade.exclusiveGroup
            ? upgrade.exclusiveGroup
            : "",
        registryIndex,
        upgrade,
      };
    })
    .filter((candidate) => candidate.appliedTier > 0);
  const selectedByExclusiveGroup = new Map();
  candidates.forEach((candidate) => {
    if (!candidate.exclusiveGroup) return;
    const selected = selectedByExclusiveGroup.get(candidate.exclusiveGroup);
    if (!selected || candidate.appliedTier > selected.appliedTier) {
      selectedByExclusiveGroup.set(candidate.exclusiveGroup, candidate);
    }
  });
  candidates
    .filter(
      (candidate) =>
        !candidate.exclusiveGroup ||
        selectedByExclusiveGroup.get(candidate.exclusiveGroup) === candidate
    )
    .sort((left, right) => left.registryIndex - right.registryIndex)
    .forEach(({ appliedTier, upgrade }) => {
      run.runUpgradeTiers[upgrade.id] = Math.max(run.runUpgradeTiers[upgrade.id] || 0, appliedTier);
      for (let index = 0; index < appliedTier; index += 1) {
        if (typeof upgrade.apply === "function") {
          upgrade.apply(run);
        } else {
          effects.applyRunUpgradeEffects(run, upgrade.effects || []);
        }
      }
    });
}

function showLevelUp(uiAdapters, stateStore) {
  const game = stateStore.getGame();
  if (game) {
    game.paused = true;
    game.pauseReason = "level";
  }
  uiAdapters.ui.levelUp?.classList?.remove?.("hidden");
  return true;
}

function advanceTowerFloorFallback(stateStore) {
  const game = stateStore.getGame();
  const save = stateStore.getSave();
  if (!game || !save) return false;
  const clearedFloor = game.towerFloor || 1;
  save.towerFloor = Math.max(save.towerFloor || 1, clearedFloor + 1);
  stateStore.persist();
  stateStore.renderMeta();
  return true;
}

function endRun({ reason, stateStore, uiAdapters }) {
  const game = stateStore.getGame();
  if (!game) return false;
  game.running = false;
  game.endReason = reason;
  uiAdapters.runUiAdapter.showEndScreen?.(reason);
  stateStore.persist();
  stateStore.renderMeta();
  return true;
}

function requireAdapter(source, name) {
  if (!source?.[name]) {
    throw new Error(`Missing Tap Survivor module dependency adapter: ${name}`);
  }
  return source[name];
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module dependency options: ${name}`);
  }
  return value;
}

function requireString(value, name) {
  if (!value) {
    throw new Error(`Missing Tap Survivor module dependency option: ${name}`);
  }
  return value;
}
