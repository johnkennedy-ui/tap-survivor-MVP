import { floorDifficulty } from "./balance.js";
import { createRuntimeBalanceProvider } from "./balance-runtime.js";
import { createAssetResolver } from "./assets.js";
import { createCombatSystem } from "./combat.js";
import { createCombatDamageSystem } from "./combat-damage.js";
import { createContentRegistry } from "./content-registry.js";
import { createDebugSystem } from "./debug.js";
import { createEnemyBehaviorSystem } from "./enemy-behaviors.js";
import { createEnemySpawnSystem } from "./enemy-spawning.js";
import { createEnemySystem } from "./enemies.js";
import { createEffects } from "./effects.js";
import { createGameBannerSystem } from "./game-banners.js";
import { createGameRuntimeController } from "./game-runtime.js";
import { bindMovementInput } from "./input.js";
import { createMapSystem } from "./map-system.js";
import { createLevelUpSystem } from "./level-up.js";
import { choiceId, shopFocusBonus, shuffleChoices, weightedChoices } from "./level-up-choices.js";
import { clamp, distance, formatTime, randomRange } from "./math.js";
import { createModuleRuntimeAudioAdapter } from "./module-runtime-audio-adapter.js";
import { createPickupSystem } from "./pickups.js";
import { createProgressionSystem } from "./progression.js";
import { createQuestSystem, questOpenIds } from "./quests.js";
import { createRelicSystem } from "./relics.js";
import { createEnemyRenderer } from "./render-enemies.js";
import { createHudRenderer } from "./render-hud.js";
import { createSkillRailRenderer } from "./render-skill-rail.js";
import { createRenderer } from "./rendering.js";
import { createSaveLoadHandler } from "./save-corruption.js";
import { CURRENT_SAVE_VERSION, createDefaultSave } from "./save-defaults.js";
import { isPlainObject, migrateSave } from "./save-migrations.js";
import { arrayValue, createSaveNormalizer, objectValue } from "./save-normalize.js";
import { createSaveSystem } from "./save.js";
import { createStorageProvider } from "./storage-adapter.js";
import { createShellRelicUi } from "./shell-relic-ui.js";
import { createShellUiController } from "./shell-ui-classic-adapter.js";
import { createShopSystem } from "./shop.js";
import { createShopPricing } from "./shop-pricing.js";
import { createSpriteSheetRenderer, createSpriteSystem } from "./sprites.js";
import { createUpgradeContent } from "./upgrades.js";
import { createUi, createUiRenderer } from "./ui.js";
import { createUiProgressionRenderer } from "./ui-progression.js";
import { createWeaponBehaviorSystem } from "./weapon-behaviors.js";
import { createWeaponScaling } from "./weapon-cooldowns.js";
import { createWeaponFireSystem } from "./weapon-fire.js";
import { createWeaponProjectileSystem, rotateVector } from "./weapon-projectiles.js";
import { nearestEnemy } from "./weapon-targeting.js";
import { createRunLifecycle } from "./run-lifecycle.js";
import { createRunStateSystem } from "./run-state.js";
import { createRunUi } from "./run-ui.js";
import { createRunUpdater } from "./run-update.js";

export function createGameDependencyBag({ globalRef, documentRef = globalRef?.document }) {
  const rawContent = globalRef.TapSurvivorContent;
  const profiles = rawContent?.balanceProfiles;
  const balanceRuntime = createRuntimeBalanceProvider();
  if (rawContent && typeof rawContent === "object" && Array.isArray(profiles)) {
    balanceRuntime.configureDefaultProviders({
      content: rawContent,
      profiles,
      profileSearch: createBalanceProfileSearchProvider(globalRef),
      storage: createBalanceStorageProvider(globalRef),
    });
  }
  const configuredContent = rawContent && typeof rawContent === "object" && Array.isArray(profiles)
    ? balanceRuntime.content()
    : rawContent;
  const content = configuredContent || {};
  const assets = {
    createAssetResolver(assetContent) {
      return createAssetResolver({ content: assetContent });
    },
  };
  const effects = createEffects();
  const levelUp = {
    createLevelUpSystem(options = {}) {
      return createLevelUpSystem({
        ...options,
        documentRef: options.documentRef || documentRef,
      });
    },
  };
  const upgrades = { createUpgradeContent };
  const save = { createSaveSystem };
  const storage = createStorageProvider({
    platformCapabilities: createStoragePlatformCapabilities(globalRef),
  });
  const audio = createModuleRuntimeAudioAdapter({
    audioContextFactory: createAudioContextFactory(globalRef),
    audioFactory: createAudioFactory(globalRef),
    clock: createClock(globalRef),
  }).audio;
  const shellRelicUi = createShellRelicUiDependency(globalRef);
  const shellUi = {
    createShellUiController(options = {}) {
      return createShellUiController({
        ...options,
        documentRef: options.documentRef || documentRef,
      });
    },
  };

  return {
    audio,
    assets,
    balance: { floorDifficulty },
    balanceRuntime,
    combat: { createCombatSystem },
    combatDamage: { createCombatDamageSystem },
    content,
    contentRegistry: { createContentRegistry },
    debug: { createDebugSystem },
    debugBalance: balanceRuntime,
    effects,
    enemies: { createEnemySystem },
    enemyBehaviors: { createEnemyBehaviorSystem },
    enemySpawning: { createEnemySpawnSystem },
    gameBanners: { createGameBannerSystem },
    gameRuntime: { createGameRuntimeController },
    input: { bindMovementInput },
    levelUp,
    levelUpChoices: { choiceId, shopFocusBonus, shuffleChoices, weightedChoices },
    mapSystem: { createMapSystem },
    math: { clamp, distance, formatTime, randomRange },
    pickups: { createPickupSystem },
    progression: { createProgressionSystem },
    quests: { createQuestSystem, questOpenIds },
    relics: { createRelicSystem },
    renderEnemies: { createEnemyRenderer },
    renderHud: { createHudRenderer },
    renderSkillRail: { createSkillRailRenderer },
    rendering: { createRenderer },
    runLifecycle: { createRunLifecycle },
    runState: { createRunStateSystem },
    runUi: { createRunUi },
    runUpdate: { createRunUpdater },
    save,
    saveCorruption: { createSaveLoadHandler },
    saveDefaults: { CURRENT_SAVE_VERSION, createDefaultSave },
    saveMigrations: { isPlainObject, migrateSave },
    saveNormalize: { arrayValue, createSaveNormalizer, objectValue },
    shellRelicUi,
    shellUi,
    shop: {
      createShopSystem: (options = {}) =>
        createShopSystem({
          ...options,
          documentRef: options.documentRef || documentRef,
        }),
    },
    shopPricing: { createShopPricing },
    sprites: { createSpriteSystem, createSpriteSheetRenderer },
    storage,
    ui: {
      createUi: (options = {}) =>
        createUi({
          ...options,
          documentRef: options.documentRef || documentRef,
        }),
      createUiRenderer: (options = {}) =>
        createUiRenderer({
          ...options,
          documentRef: options.documentRef || documentRef,
        }),
    },
    uiProgression: {
      createUiProgressionRenderer: (options = {}) =>
        createUiProgressionRenderer({
          ...options,
          documentRef: options.documentRef || documentRef,
        }),
    },
    upgrades,
    weaponBehaviors: { createWeaponBehaviorSystem },
    weaponCooldowns: { createWeaponScaling },
    weaponFire: { createWeaponFireSystem },
    weaponProjectiles: { createWeaponProjectileSystem, rotateVector },
    weaponTargeting: { nearestEnemy },
  };
}

function createAudioContextFactory(globalRef) {
  return () => {
    const AudioContextRef = globalRef?.AudioContext || globalRef?.webkitAudioContext;
    return typeof AudioContextRef === "function" ? new AudioContextRef() : null;
  };
}

function createAudioFactory(globalRef) {
  return (src) => {
    const AudioRef = globalRef?.Audio;
    return typeof AudioRef === "function" ? new AudioRef(src) : null;
  };
}

function createClock(globalRef) {
  return () => globalRef?.performance?.now?.() || 0;
}

function createBalanceStorageProvider(globalRef) {
  return {
    getItem: (key) => globalRef?.localStorage?.getItem?.(key),
    removeItem: (key) => globalRef?.localStorage?.removeItem?.(key),
    setItem: (key, value) => globalRef?.localStorage?.setItem?.(key, value),
  };
}

function createBalanceProfileSearchProvider(globalRef) {
  return () => globalRef?.location?.search || "";
}

function createStoragePlatformCapabilities(globalRef) {
  return {
    getLocalStorage: () => globalRef?.localStorage || null,
    getPreferences: () => globalRef?.Capacitor?.Plugins?.Preferences || null,
  };
}

function createShellRelicSchedulerProvider(globalRef) {
  return {
    clearTimeout: (timer) => globalRef?.clearTimeout?.(timer),
    setTimeout: (callback, delay) => globalRef?.setTimeout?.(callback, delay),
    animationSetTimeout: (callback, delay) => globalRef?.setTimeout?.(callback, delay),
  };
}

function createShellRelicUiDependency(globalRef) {
  const scheduler = createShellRelicSchedulerProvider(globalRef);
  const imageFactory = () => {
    const ImageRef = globalRef?.Image;
    return typeof ImageRef === "function" ? new ImageRef() : null;
  };
  return {
    createShellRelicUi(options = {}) {
      return createShellRelicUi({
        ...options,
        scheduler: options.scheduler || scheduler,
        imageFactory: options.imageFactory || imageFactory,
      });
    },
  };
}
