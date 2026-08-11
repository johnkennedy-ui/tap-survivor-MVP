import { floorDifficulty } from "./balance.js";
import { createCombatSystem } from "./combat.js";
import { createCombatDamageSystem } from "./combat-damage.js";
import { createContentRegistry } from "./content-registry.js";
import { createEnemyBehaviorSystem } from "./enemy-behaviors.js";
import { createEnemySpawnSystem } from "./enemy-spawning.js";
import { createEnemySystem } from "./enemies.js";
import { createGameBannerSystem } from "./game-banners.js";
import { createGameRuntimeController } from "./game-runtime.js";
import { createMapSystem } from "./map-system.js";
import { choiceId, shopFocusBonus, shuffleChoices, weightedChoices } from "./level-up-choices.js";
import { clamp, distance, formatTime, randomRange } from "./math.js";
import { createPickupSystem } from "./pickups.js";
import { createRelicSystem } from "./relics.js";
import { createSaveLoadHandler } from "./save-corruption.js";
import { CURRENT_SAVE_VERSION, createDefaultSave } from "./save-defaults.js";
import { isPlainObject, migrateSave } from "./save-migrations.js";
import { arrayValue, createSaveNormalizer, objectValue } from "./save-normalize.js";
import { createShopSystem } from "./shop.js";
import { createShopPricing } from "./shop-pricing.js";
import { createWeaponScaling } from "./weapon-cooldowns.js";
import { nearestEnemy } from "./weapon-targeting.js";
import { createRunLifecycle } from "./run-lifecycle.js";
import { createRunStateSystem } from "./run-state.js";
import { createRunUi } from "./run-ui.js";

export function createGameDependencyBag({ globalRef, documentRef = globalRef?.document }) {
  const rawContent = globalRef.TapSurvivorContent;
  const balanceRuntime = globalRef.TapSurvivorBalanceRuntime;
  if (typeof balanceRuntime?.configureDefaultProviders === "function") {
    balanceRuntime.configureDefaultProviders({
      content: rawContent,
      profiles: rawContent?.balanceProfiles,
      storage: createBalanceStorageProvider(globalRef),
    });
  }
  const configuredContent = balanceRuntime?.content?.() || rawContent;
  const content = configuredContent || {};
  const effects = globalRef.TapSurvivorEffects;
  const upgrades = globalRef.TapSurvivorUpgrades || {};
  if (typeof upgrades.configureDefaultProviders === "function") {
    upgrades.configureDefaultProviders({ content: configuredContent, effects });
  }
  const save = requireGlobal(globalRef, "TapSurvivorSave");
  const storage = requireGlobal(globalRef, "TapSurvivorStorage");
  if (typeof save.configureDefaultProviders === "function") {
    save.configureDefaultProviders({ storage });
  }
  const audio = requireGlobal(globalRef, "TapSurvivorAudio");
  if (typeof audio.configureDefaultProviders === "function") {
    audio.configureDefaultProviders({
      audioContextFactory: createAudioContextFactory(globalRef),
    });
  }
  const shellRelicUi = requireGlobal(globalRef, "TapSurvivorShellRelicUi");
  if (typeof shellRelicUi.configureDefaultProviders === "function") {
    shellRelicUi.configureDefaultProviders({
      scheduler: createShellRelicSchedulerProvider(globalRef),
    });
  }

  return {
    audio,
    assets: globalRef.TapSurvivorAssets || {},
    balance: { floorDifficulty },
    balanceRuntime,
    combat: { createCombatSystem },
    combatDamage: { createCombatDamageSystem },
    content,
    contentRegistry: { createContentRegistry },
    debug: requireGlobal(globalRef, "TapSurvivorDebug"),
    debugBalance: globalRef.TapSurvivorDebugBalance,
    effects: requireValue(effects, "TapSurvivorEffects"),
    enemies: { createEnemySystem },
    enemyBehaviors: { createEnemyBehaviorSystem },
    enemySpawning: { createEnemySpawnSystem },
    gameBanners: { createGameBannerSystem },
    gameRuntime: { createGameRuntimeController },
    input: {
      bindMovementInput: requireFunction(
        globalRef?.TapSurvivorInput?.bindMovementInput,
        "globalThis.TapSurvivorInput.bindMovementInput"
      ),
    },
    levelUp: requireGlobal(globalRef, "TapSurvivorLevelUp"),
    levelUpChoices: { choiceId, shopFocusBonus, shuffleChoices, weightedChoices },
    mapSystem: { createMapSystem },
    math: { clamp, distance, formatTime, randomRange },
    pickups: { createPickupSystem },
    progression: requireGlobal(globalRef, "TapSurvivorProgression"),
    quests: requireGlobal(globalRef, "TapSurvivorQuests"),
    relics: { createRelicSystem },
    renderEnemies: requireGlobal(globalRef, "TapSurvivorRenderEnemies"),
    renderHud: requireGlobal(globalRef, "TapSurvivorRenderHud"),
    renderSkillRail: requireGlobal(globalRef, "TapSurvivorRenderSkillRail"),
    rendering: requireGlobal(globalRef, "TapSurvivorRendering"),
    runLifecycle: { createRunLifecycle },
    runState: { createRunStateSystem },
    runUi: { createRunUi },
    runUpdate: requireGlobal(globalRef, "TapSurvivorRunUpdate"),
    save,
    saveCorruption: { createSaveLoadHandler },
    saveDefaults: { CURRENT_SAVE_VERSION, createDefaultSave },
    saveMigrations: { isPlainObject, migrateSave },
    saveNormalize: { arrayValue, createSaveNormalizer, objectValue },
    shellRelicUi,
    shellUi: requireGlobal(globalRef, "TapSurvivorShellUi"),
    shop: {
      createShopSystem: (options = {}) =>
        createShopSystem({
          ...options,
          documentRef: options.documentRef || documentRef,
        }),
    },
    shopPricing: { createShopPricing },
    sprites: requireGlobal(globalRef, "TapSurvivorSprites"),
    storage,
    ui: requireGlobal(globalRef, "TapSurvivorUi"),
    uiProgression: requireGlobal(globalRef, "TapSurvivorUiProgression"),
    upgrades,
    weaponBehaviors: requireGlobal(globalRef, "TapSurvivorWeaponBehaviors"),
    weaponCooldowns: { createWeaponScaling },
    weaponFire: requireGlobal(globalRef, "TapSurvivorWeaponFire"),
    weaponProjectiles: requireGlobal(globalRef, "TapSurvivorWeaponProjectiles"),
    weaponTargeting: { nearestEnemy },
  };
}

function requireGlobal(globalRef, name) {
  return requireValue(globalRef?.[name], name);
}

function createAudioContextFactory(globalRef) {
  return () => {
    const AudioContextRef = globalRef.AudioContext || globalRef.webkitAudioContext;
    return typeof AudioContextRef === "function" ? new AudioContextRef() : null;
  };
}

function createBalanceStorageProvider(globalRef) {
  return {
    getItem: (key) => globalRef?.localStorage?.getItem?.(key),
    removeItem: (key) => globalRef?.localStorage?.removeItem?.(key),
    setItem: (key, value) => globalRef?.localStorage?.setItem?.(key, value),
  };
}

function createShellRelicSchedulerProvider(globalRef) {
  return {
    clearTimeout: (timer) => globalRef?.clearTimeout?.(timer),
    setTimeout: (callback, delay) => globalRef?.setTimeout?.(callback, delay),
    animationSetTimeout: (callback, delay) => globalRef?.setTimeout?.(callback, delay),
  };
}

function requireValue(value, name) {
  if (!value) {
    throw new Error(`Missing Tap Survivor runtime dependency: globalThis.${name}`);
  }
  return value;
}

function requireFunction(value, name) {
  if (typeof value !== "function") {
    throw new Error(`Missing Tap Survivor runtime dependency: ${name}`);
  }
  return value;
}
