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

  const moduleSystems = {
    balance: { floorDifficulty },
    combatDamage: { createCombatDamageSystem },
    content,
    contentRegistry,
    effects,
    gameRuntime: { createGameRuntimeController },
    gameStateStore: stateStore,
    levelUpChoices,
    mapSystem: { createMapSystem },
    math: { clamp, distance, formatTime, randomRange },
    moduleRuntimeGameplayAdapter: gameplayAdapters,
    moduleRuntimeAssetsAdapter: assetAdapters,
    moduleRuntimeAudioAdapter: audioAdapters,
    moduleRuntimeProgressionAdapter: progressionAdapters,
    moduleRuntimeRenderingAdapter: renderingAdapters,
    moduleRuntimeSpriteAdapter: spriteAdapters,
    moduleRuntimeStorageAdapter: storageAdapters,
    moduleRuntimeUiAdapters: uiAdapters,
    pickups: { createPickupSystem },
    relicProgression: { createRelicProgression },
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
    assets: assetAdapters.assets,
    audio: audioAdapters.audio,
    bannerSystem: platformAdapters.bannerSystem,
    bindMovementInput: platformAdapters.bindMovementInput,
    canvas: platformAdapters.canvas,
    combat: gameplayAdapters.combat,
    debugSystem: platformAdapters.debugSystem,
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
