// GENERATED FILE. Do not edit directly.
// Source: src/modules/game-dependencies.js
// Run: npm run build:bridges
(() => {
  "use strict";

  function createGameDependencyBag({ globalRef }) {
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
      gameBanners: requireGlobal(globalRef, "TapSurvivorGameBanners"),
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
      shop: requireGlobal(globalRef, "TapSurvivorShop"),
      shopPricing: requireGlobal(globalRef, "TapSurvivorShopPricing"),
      sprites: requireGlobal(globalRef, "TapSurvivorSprites"),
      storage: requireGlobal(globalRef, "TapSurvivorStorage"),
      ui: requireGlobal(globalRef, "TapSurvivorUi"),
      uiProgression: requireGlobal(globalRef, "TapSurvivorUiProgression"),
      upgrades: globalRef.TapSurvivorUpgrades || {},
      weaponCooldowns: requireGlobal(globalRef, "TapSurvivorWeaponCooldowns"),
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

  globalThis.TapSurvivorGameDependencies = {
    createGameDependencyBag,
  };
})();
