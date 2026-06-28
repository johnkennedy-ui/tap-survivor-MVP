import { floorDifficulty } from "./balance.js";
import { createCombatDamageSystem } from "./combat-damage.js";
import { createContentRegistry } from "./content-registry.js";
import { createEffects } from "./effects.js";
import { createGameRuntimeController } from "./game-runtime.js";
import { createGameStateStore } from "./game-state-store.js";
import { createModuleRuntimePlatformAdapter } from "./module-runtime-platform-adapter.js";
import { createModuleRuntimeUiAdapters } from "./module-runtime-ui-adapters.js";
import { createMapSystem } from "./map-system.js";
import { clamp, distance, formatTime, randomRange } from "./math.js";
import { createPickupSystem } from "./pickups.js";
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
  "initialGame",
  "initialSave",
  "platformAdapters",
  "renderMetaSink",
  "spriteSystem",
  "storageAdapter",
  "uiAdapters",
]);

export const CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS = Object.freeze([
  "assets",
  "audio",
  "combat",
  "debug",
  "enemyBehaviors",
  "enemySpawning",
  "enemies",
  "gameBanners",
  "input",
  "levelUp",
  "progression",
  "quests",
  "renderEnemies",
  "renderHud",
  "renderSkillRail",
  "rendering",
  "shop",
  "sprites",
  "uiProgression",
  "upgrades",
  "weaponBehaviors",
  "weaponFire",
]);

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
  const saveSystem = createModuleSaveSystem({
    saveConfig: requireObject(saveConfig, "saveConfig"),
    contentRegistry,
  });
  const stateStore = createGameStateStore({
    initialGame: resolvedAdapters.initialGame || null,
    initialSave: resolvedAdapters.initialSave,
    renderMetaSink: resolvedAdapters.renderMetaSink,
    saveSystem,
  });
  const relics = createRelicSystem({
    relicDefs: contentRegistry.relicDefs,
    weaponDefs: contentRegistry.weaponDefs,
    random,
  });
  const uiAdapters = createModuleRuntimeUiAdapters({
    ...requireObject(resolvedAdapters.uiAdapters, "adapters.uiAdapters"),
    stateStore,
  });

  const moduleSystems = {
    balance: { floorDifficulty },
    combatDamage: { createCombatDamageSystem },
    content,
    contentRegistry,
    effects,
    gameRuntime: { createGameRuntimeController },
    gameStateStore: stateStore,
    mapSystem: { createMapSystem },
    math: { clamp, distance, formatTime, randomRange },
    moduleRuntimeUiAdapters: uiAdapters,
    pickups: { createPickupSystem },
    relics,
    runLifecycle: { createRunLifecycle },
    runState: { createRunStateSystem },
    runUi: { createRunUi },
    runUpdate: { createRunUpdater },
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
    bannerSystem: platformAdapters.bannerSystem,
    bindMovementInput: platformAdapters.bindMovementInput,
    canvas: platformAdapters.canvas,
    debugSystem: platformAdapters.debugSystem,
    getGame: stateStore.getGame,
    getSave: stateStore.getSave,
    loop: platformAdapters.loop,
    moduleSystems,
    persist: stateStore.persist,
    renderMeta: stateStore.renderMeta,
    runUi: uiAdapters.runUiAdapter,
    saveSystem,
    setGame: stateStore.setGame,
    setSave: stateStore.setSave,
    shellUi: uiAdapters.shellUiAdapter,
    shopSystem: uiAdapters.shopSystemAdapter,
    spriteSystem: requireAdapter(resolvedAdapters, "spriteSystem"),
    ui: uiAdapters.ui,
  };
}

function createModuleSaveSystem({ saveConfig, contentRegistry }) {
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
    storage: saveConfig.storage,
    storageAdapter: requireAdapter(saveConfig, "storageAdapter"),
    upgradeDefs: saveConfig.upgradeDefs || contentRegistry.upgradeDefs,
    weaponUnlocks: saveConfig.weaponUnlocks || contentRegistry.weaponUnlocks,
  });
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
