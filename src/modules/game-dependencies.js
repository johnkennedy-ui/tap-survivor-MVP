import { createGameBannerSystem } from "./game-banners.js";
import { createShopSystem } from "./shop.js";
import { createWeaponScaling } from "./weapon-cooldowns.js";

export function createGameDependencyBag({ globalRef, documentRef = globalRef?.document }) {
  return {
    audio: requireGlobal(globalRef, "TapSurvivorAudio"),
    assets: globalRef.TapSurvivorAssets || {},
    balance: requireGlobal(globalRef, "TapSurvivorBalance"),
    balanceRuntime: globalRef.TapSurvivorBalanceRuntime,
    combat: requireGlobal(globalRef, "TapSurvivorCombat"),
    combatDamage: requireGlobal(globalRef, "TapSurvivorCombatDamage"),
    content: globalRef.TapSurvivorBalanceRuntime?.content?.() || globalRef.TapSurvivorContent || {},
    contentRegistry: requireGlobal(globalRef, "TapSurvivorContentRegistry"),
    debug: requireGlobal(globalRef, "TapSurvivorDebug"),
    debugBalance: globalRef.TapSurvivorDebugBalance,
    effects: requireGlobal(globalRef, "TapSurvivorEffects"),
    enemies: requireGlobal(globalRef, "TapSurvivorEnemies"),
    enemyBehaviors: requireGlobal(globalRef, "TapSurvivorEnemyBehaviors"),
    enemySpawning: requireGlobal(globalRef, "TapSurvivorEnemySpawning"),
    gameBanners: { createGameBannerSystem },
    gameRuntime: requireGlobal(globalRef, "TapSurvivorGameRuntime"),
    input: {
      bindMovementInput: requireFunction(
        globalRef?.TapSurvivorInput?.bindMovementInput,
        "globalThis.TapSurvivorInput.bindMovementInput"
      ),
    },
    levelUp: requireGlobal(globalRef, "TapSurvivorLevelUp"),
    levelUpChoices: requireGlobal(globalRef, "TapSurvivorLevelUpChoices"),
    mapSystem: requireGlobal(globalRef, "TapSurvivorMapSystem"),
    math: requireGlobal(globalRef, "TapSurvivorMath"),
    pickups: requireGlobal(globalRef, "TapSurvivorPickups"),
    progression: requireGlobal(globalRef, "TapSurvivorProgression"),
    quests: requireGlobal(globalRef, "TapSurvivorQuests"),
    relics: requireGlobal(globalRef, "TapSurvivorRelics"),
    renderEnemies: requireGlobal(globalRef, "TapSurvivorRenderEnemies"),
    renderHud: requireGlobal(globalRef, "TapSurvivorRenderHud"),
    renderSkillRail: requireGlobal(globalRef, "TapSurvivorRenderSkillRail"),
    rendering: requireGlobal(globalRef, "TapSurvivorRendering"),
    runLifecycle: requireGlobal(globalRef, "TapSurvivorRunLifecycle"),
    runState: requireGlobal(globalRef, "TapSurvivorRunState"),
    runUi: requireGlobal(globalRef, "TapSurvivorRunUi"),
    runUpdate: requireGlobal(globalRef, "TapSurvivorRunUpdate"),
    save: requireGlobal(globalRef, "TapSurvivorSave"),
    saveCorruption: requireGlobal(globalRef, "TapSurvivorSaveCorruption"),
    saveDefaults: requireGlobal(globalRef, "TapSurvivorSaveDefaults"),
    saveMigrations: requireGlobal(globalRef, "TapSurvivorSaveMigrations"),
    saveNormalize: requireGlobal(globalRef, "TapSurvivorSaveNormalize"),
    shellRelicUi: requireGlobal(globalRef, "TapSurvivorShellRelicUi"),
    shellUi: requireGlobal(globalRef, "TapSurvivorShellUi"),
    shop: {
      createShopSystem: (options = {}) =>
        createShopSystem({
          ...options,
          documentRef: options.documentRef || documentRef,
        }),
    },
    shopPricing: requireGlobal(globalRef, "TapSurvivorShopPricing"),
    sprites: requireGlobal(globalRef, "TapSurvivorSprites"),
    storage: requireGlobal(globalRef, "TapSurvivorStorage"),
    ui: requireGlobal(globalRef, "TapSurvivorUi"),
    uiProgression: requireGlobal(globalRef, "TapSurvivorUiProgression"),
    upgrades: globalRef.TapSurvivorUpgrades || {},
    weaponBehaviors: requireGlobal(globalRef, "TapSurvivorWeaponBehaviors"),
    weaponCooldowns: { createWeaponScaling },
    weaponFire: requireGlobal(globalRef, "TapSurvivorWeaponFire"),
    weaponProjectiles: requireGlobal(globalRef, "TapSurvivorWeaponProjectiles"),
    weaponTargeting: requireGlobal(globalRef, "TapSurvivorWeaponTargeting"),
  };
}

function requireGlobal(globalRef, name) {
  const value = globalRef?.[name];
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
