import { floorDifficulty } from "./balance.js";
import { createCombatDamageSystem } from "./combat-damage.js";
import { createContentRegistry } from "./content-registry.js";
import { createEffects } from "./effects.js";
import { createGameRuntimeController } from "./game-runtime.js";
import { createGameStateStore } from "./game-state-store.js";
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
  "bannerSystem",
  "bindMovementInput",
  "canvas",
  "debugSystem",
  "initialGame",
  "initialSave",
  "loop",
  "renderMetaSink",
  "runUiAdapter",
  "shellUiAdapter",
  "shopSystemAdapter",
  "spriteSystem",
  "storageAdapter",
  "ui",
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
  "ui",
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
    bannerSystem: requireAdapter(resolvedAdapters, "bannerSystem"),
    bindMovementInput: requireFunction(
      resolvedAdapters.bindMovementInput,
      "adapters.bindMovementInput"
    ),
    canvas: requireAdapter(resolvedAdapters, "canvas"),
    debugSystem: requireAdapter(resolvedAdapters, "debugSystem"),
    getGame: stateStore.getGame,
    getSave: stateStore.getSave,
    loop: requireFunction(resolvedAdapters.loop, "adapters.loop"),
    moduleSystems,
    persist: stateStore.persist,
    renderMeta: stateStore.renderMeta,
    runUi: requireAdapter(resolvedAdapters, "runUiAdapter"),
    saveSystem,
    setGame: stateStore.setGame,
    setSave: stateStore.setSave,
    shellUi: requireAdapter(resolvedAdapters, "shellUiAdapter"),
    shopSystem: requireAdapter(resolvedAdapters, "shopSystemAdapter"),
    spriteSystem: requireAdapter(resolvedAdapters, "spriteSystem"),
    ui: requireAdapter(resolvedAdapters, "ui"),
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

function requireFunction(value, name) {
  if (typeof value !== "function") {
    throw new Error(`Missing Tap Survivor module dependency adapter: ${name}`);
  }
  return value;
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
