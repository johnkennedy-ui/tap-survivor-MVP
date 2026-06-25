export function createGameDependencyBag({ globalRef }) {
  return {
    audio: requireGlobal(globalRef, "TapSurvivorAudio"),
    balanceRuntime: globalRef.TapSurvivorBalanceRuntime,
    combat: requireGlobal(globalRef, "TapSurvivorCombat"),
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
    saveDefaults: requireGlobal(globalRef, "TapSurvivorSaveDefaults"),
    saveMigrations: requireGlobal(globalRef, "TapSurvivorSaveMigrations"),
    shellUi: requireGlobal(globalRef, "TapSurvivorShellUi"),
    shop: requireGlobal(globalRef, "TapSurvivorShop"),
    sprites: requireGlobal(globalRef, "TapSurvivorSprites"),
    storage: requireGlobal(globalRef, "TapSurvivorStorage"),
    ui: requireGlobal(globalRef, "TapSurvivorUi"),
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
