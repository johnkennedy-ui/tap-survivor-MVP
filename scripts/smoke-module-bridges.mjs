import { readFileSync } from "node:fs";
import vm from "node:vm";

import { floorDifficulty as moduleFloorDifficulty } from "../src/modules/balance.js";
import { createContentRegistry as createModuleContentRegistry } from "../src/modules/content-registry.js";
import { createEffects as createModuleEffects } from "../src/modules/effects.js";
import { createGameBannerSystem as createModuleGameBannerSystem } from "../src/modules/game-banners.js";
import { createGameDependencyBag as createModuleGameDependencyBag } from "../src/modules/game-dependencies.js";
import { createGameRuntimeController as createModuleGameRuntimeController } from "../src/modules/game-runtime.js";
import { createCombatDamageSystem as createModuleCombatDamageSystem } from "../src/modules/combat-damage.js";
import { createPickupSystem as createModulePickupSystem } from "../src/modules/pickups.js";
import { createRunLifecycle as createModuleRunLifecycle } from "../src/modules/run-lifecycle.js";
import { createRunStateSystem as createModuleRunStateSystem } from "../src/modules/run-state.js";
import { createRunUi as createModuleRunUi } from "../src/modules/run-ui.js";
import { createRunUpdater as createModuleRunUpdater } from "../src/modules/run-update.js";
import { createRelicSystem as createModuleRelicSystem } from "../src/modules/relics.js";
import { createShellRelicUi as createModuleShellRelicUi } from "../src/modules/shell-relic-ui.js";
import { createShellUiController as createModuleShellUiController } from "../src/modules/shell-ui-controller.js";
import {
  choiceId as moduleChoiceId,
  shopFocusBonus as moduleShopFocusBonus,
  shuffleChoices as moduleShuffleChoices,
  weightedChoices as moduleWeightedChoices,
} from "../src/modules/level-up-choices.js";
import { createMapSystem as createModuleMapSystem } from "../src/modules/map-system.js";
import {
  clamp as moduleClamp,
  distance as moduleDistance,
  formatTime as moduleFormatTime,
  randomRange as moduleRandomRange,
} from "../src/modules/math.js";
import { createSaveLoadHandler as createModuleSaveLoadHandler } from "../src/modules/save-corruption.js";
import {
  CURRENT_SAVE_VERSION as moduleCurrentSaveVersion,
  createDefaultSave as createModuleDefaultSave,
} from "../src/modules/save-defaults.js";
const { isPlainObject: moduleIsPlainObject, migrateSave: moduleMigrateSave } = await import(
  "../src/modules/save-migrations.js"
);
globalThis["TapSurvivorSaveMigrations"] = {
  isPlainObject: moduleIsPlainObject,
  migrateSave: moduleMigrateSave,
};
const {
  arrayValue: moduleArrayValue,
  createSaveNormalizer: createModuleSaveNormalizer,
  objectValue: moduleObjectValue,
} = await import("../src/modules/save-normalize.js");
globalThis["TapSurvivorSaveNormalize"] = {
  arrayValue: moduleArrayValue,
  createSaveNormalizer: createModuleSaveNormalizer,
  objectValue: moduleObjectValue,
};
globalThis["TapSurvivorSaveCorruption"] = {
  createSaveLoadHandler: createModuleSaveLoadHandler,
};
const { createSaveSystem: createModuleSaveSystem } = await import("../src/modules/save.js");
import { createShopPricing as createModuleShopPricing } from "../src/modules/shop-pricing.js";
import { createWeaponScaling as createModuleWeaponScaling } from "../src/modules/weapon-cooldowns.js";
import {
  createWeaponProjectileSystem as createModuleWeaponProjectileSystem,
  rotateVector as moduleRotateVector,
} from "../src/modules/weapon-projectiles.js";
import { nearestEnemy as moduleNearestEnemy } from "../src/modules/weapon-targeting.js";

const contentSource = JSON.parse(
  readFileSync(new URL("../content/tap-survivor-content.json", import.meta.url), "utf8")
);
const contentSchemaFixture = {
  effectRegistries: {
    shopItem: {
      stats: [
        "speed",
        "pickupRadius",
        "maxHp",
        "flatDamage",
        "attackRadius",
        "fireRate",
        "percentDamage",
        "relicFocus",
      ],
    },
  },
};

const balanceBridge = loadBridge("../src/balance.js", "src/balance.js");
const contentRegistryBridge = loadBridge(
  "../src/content-registry.js",
  "src/content-registry.js"
);
const effectsBridge = loadBridge("../src/effects.js", "src/effects.js", {
  TapSurvivorContentSchema: contentSchemaFixture,
});
const choicesBridge = loadBridge("../src/level-up-choices.js", "src/level-up-choices.js");
const mapBridge = loadBridge("../src/map-system.js", "src/map-system.js");
const saveCorruptionBridge = loadBridge("../src/save-corruption.js", "src/save-corruption.js");
const saveDefaultsBridge = loadBridge("../src/save-defaults.js", "src/save-defaults.js");
const saveMigrationsBridge = loadBridge("../src/save-migrations.js", "src/save-migrations.js");
const saveNormalizeBridge = loadBridge("../src/save-normalize.js", "src/save-normalize.js", {
  TapSurvivorSaveMigrations: saveMigrationsBridge.context.TapSurvivorSaveMigrations,
});
const saveBridge = loadBridge("../src/save.js", "src/save.js", {
  TapSurvivorSaveMigrations: saveMigrationsBridge.context.TapSurvivorSaveMigrations,
  TapSurvivorSaveNormalize: saveNormalizeBridge.context.TapSurvivorSaveNormalize,
  TapSurvivorSaveCorruption: saveCorruptionBridge.context.TapSurvivorSaveCorruption,
});
const pricingBridge = loadBridge("../src/shop-pricing.js", "src/shop-pricing.js");
const relicsBridge = loadBridge("../src/relics.js", "src/relics.js", {
  Math: {
    floor: Math.floor,
    max: Math.max,
    min: Math.min,
    random: () => 0,
  },
});
const shellRelicUiBridge = loadBridge("../src/shell-relic-ui.js", "src/shell-relic-ui.js");
const shellUiClassicBridge = loadBridge("../src/shell-ui.js", "src/shell-ui.js", {
  clearTimeout(timer) {
    if (timer) timer.cleared = true;
  },
  setTimeout(callback, delay) {
    const timer = { callback, delay };
    callback();
    return timer;
  },
});
const mathBridge = loadBridge("../src/math.js", "src/math.js");
const targetingBridge = loadBridge("../src/weapon-targeting.js", "src/weapon-targeting.js");
const cooldownBridge = loadBridge("../src/weapon-cooldowns.js", "src/weapon-cooldowns.js");
const projectileBridge = loadBridge("../src/weapon-projectiles.js", "src/weapon-projectiles.js");
const gameBannersBridge = loadBridge("../src/game-banners.js", "src/game-banners.js");
const gameRuntimeBridge = loadBridge("../src/game-runtime.js", "src/game-runtime.js");
const gameDependenciesBridge = loadBridge("../src/game-dependencies.js", "src/game-dependencies.js");
const runLifecycleBridge = loadBridge("../src/run-lifecycle.js", "src/run-lifecycle.js");
const runStateBridge = loadBridge("../src/run-state.js", "src/run-state.js");
const runUiBridge = loadBridge("../src/run-ui.js", "src/run-ui.js");
const runUpdateBridge = loadBridge("../src/run-update.js", "src/run-update.js");
const pickupsBridge = loadBridge("../src/pickups.js", "src/pickups.js", {
  Math: {
    ceil: Math.ceil,
    floor: Math.floor,
    hypot: Math.hypot,
    max: Math.max,
    min: Math.min,
    random: Math.random,
  },
});
const combatDamageBridge = loadBridge("../src/combat-damage.js", "src/combat-damage.js", {
  Math: {
    ceil: Math.ceil,
    max: Math.max,
    min: Math.min,
    random: Math.random,
  },
});

const bridgeBalance = balanceBridge.context.TapSurvivorBalance;
const bridgeContentRegistry = contentRegistryBridge.context.TapSurvivorContentRegistry;
const bridgeEffects = effectsBridge.context.TapSurvivorEffects;
const bridgeChoices = choicesBridge.context.TapSurvivorLevelUpChoices;
const bridgeMapSystem = mapBridge.context.TapSurvivorMapSystem;
const bridgeSaveCorruption = saveCorruptionBridge.context.TapSurvivorSaveCorruption;
const bridgeSaveDefaults = saveDefaultsBridge.context.TapSurvivorSaveDefaults;
const bridgeSaveMigrations = saveMigrationsBridge.context.TapSurvivorSaveMigrations;
const bridgeSaveNormalize = saveNormalizeBridge.context.TapSurvivorSaveNormalize;
const bridgeSave = saveBridge.context.TapSurvivorSave;
const createBridgeShopPricing = pricingBridge.context.TapSurvivorShopPricing?.createShopPricing;
const createBridgeRelicSystem = relicsBridge.context.TapSurvivorRelics?.createRelicSystem;
const bridgeMath = mathBridge.context.TapSurvivorMath;
const bridgeTargeting = targetingBridge.context.TapSurvivorWeaponTargeting;
const bridgeProjectiles = projectileBridge.context.TapSurvivorWeaponProjectiles;
const bridgeGameRuntime = gameRuntimeBridge.context.TapSurvivorGameRuntime;
const bridgeGameDependencies = gameDependenciesBridge.context.TapSurvivorGameDependencies;
const bridgeRunLifecycle = runLifecycleBridge.context.TapSurvivorRunLifecycle;
const bridgeRunState = runStateBridge.context.TapSurvivorRunState;
const bridgeRunUi = runUiBridge.context.TapSurvivorRunUi;
const bridgeRunUpdate = runUpdateBridge.context.TapSurvivorRunUpdate;
const bridgePickups = pickupsBridge.context.TapSurvivorPickups;
const bridgeCombatDamage = combatDamageBridge.context.TapSurvivorCombatDamage;
const bridgeShellRelicUi = shellRelicUiBridge.context.TapSurvivorShellRelicUi;
const bridgeShellUi = shellUiClassicBridge.context.TapSurvivorShellUi;

check("module exports floorDifficulty", typeof moduleFloorDifficulty === "function");
check(
  "bridge does not publish retired TapSurvivorBalance",
  bridgeBalance === undefined && !balanceBridge.source.includes("globalThis.TapSurvivorBalance")
);
check("balance bridge source has generated banner", hasGeneratedBanner(balanceBridge.source));
check("balance bridge remains retired", bridgeBalance === undefined);

const balanceFixtures = [1, 2, 3, 4, 0, null, undefined];
const moduleBalanceResults = balanceFixtures.map((floor) => moduleFloorDifficulty(floor));
check(
  "floorDifficulty floor one value is unchanged",
  JSON.stringify(moduleFloorDifficulty(1)) ===
    JSON.stringify({ hp: 0.9, damage: 0.85, spawnRate: 0.9 })
);
check(
  "floorDifficulty floor two value is unchanged",
  JSON.stringify(moduleFloorDifficulty(2)) ===
    JSON.stringify({ hp: 1.1, damage: 1, spawnRate: 1 })
);
check(
  "floorDifficulty floor three value is unchanged",
  JSON.stringify(moduleFloorDifficulty(3)) ===
    JSON.stringify({ hp: 1.33, damage: 1.15, spawnRate: 1.08 })
);
check(
  "floorDifficulty floor four scaling is unchanged",
  JSON.stringify(moduleFloorDifficulty(4)) ===
    JSON.stringify({ hp: 1.53, damage: 1.2799999999999998, spawnRate: 1.1300000000000001 })
);
check(
  "floorDifficulty invalid floors use floor one fallback",
  JSON.stringify([
    moduleFloorDifficulty(0),
    moduleFloorDifficulty(null),
    moduleFloorDifficulty(undefined),
  ]) ===
    JSON.stringify([
      { hp: 0.9, damage: 0.85, spawnRate: 0.9 },
      { hp: 0.9, damage: 0.85, spawnRate: 0.9 },
      { hp: 0.9, damage: 0.85, spawnRate: 0.9 },
    ])
);
const mutableFloorOne = moduleFloorDifficulty(1);
mutableFloorOne.hp = 99;
check("floorDifficulty returns copies", moduleFloorDifficulty(1).hp === 0.9);

check(
  "module exports createContentRegistry",
  typeof createModuleContentRegistry === "function"
);
check(
  "bridge does not publish retired TapSurvivorContentRegistry",
  bridgeContentRegistry === undefined && !contentRegistryBridge.source.includes("globalThis.TapSurvivorContentRegistry")
);
check(
  "content registry bridge source has generated banner",
  hasGeneratedBanner(contentRegistryBridge.source)
);
check("content registry bridge remains retired", bridgeContentRegistry === undefined);

const upgradeContentFixture = {
  createUpgradeDefs: (weaponDefs) =>
    Object.entries(weaponDefs).map(([weaponId, weapon]) => ({
      id: weapon.upgradeId || `${weaponId}_damage`,
      weaponId,
    })),
  runUpgradeDefs: contentSource.runUpgrades || [],
};
const moduleContentRegistrySnapshot = contentRegistrySnapshot(
  createModuleContentRegistry({ content: contentSource, upgradeContent: upgradeContentFixture })
);
check(
  "content registry exposes spark bolt",
  moduleContentRegistrySnapshot.sparkBoltDamage === 12
);
check(
  "content registry exposes starter quest group",
  moduleContentRegistrySnapshot.starterQuestIds.includes("first_blood")
);
check(
  "content registry exposes run upgrade list",
  moduleContentRegistrySnapshot.runUpgradeCount === contentSource.runUpgrades.length
);

check("module exports createEffects", typeof createModuleEffects === "function");
check("bridge assigns globalThis.TapSurvivorEffects", Boolean(bridgeEffects));
check("effects bridge source has generated banner", hasGeneratedBanner(effectsBridge.source));
for (const exportName of [
  "applyRunUpgradeEffects",
  "applyShopItemEffectToRun",
  "emptyShopBonuses",
  "addShopItemBonus",
  "applyRelicSpecialEffects",
]) {
  check(`bridge exposes effects ${exportName}`, typeof bridgeEffects?.[exportName] === "function");
}

const moduleEffectsSnapshot = effectsSnapshot(createModuleEffects({ contentSchema: contentSchemaFixture }));
const bridgeEffectsSnapshot = effectsSnapshot(bridgeEffects);
check(
  "module and bridge effects output match",
  JSON.stringify(moduleEffectsSnapshot) === JSON.stringify(bridgeEffectsSnapshot)
);
check("effects apply run upgrade stat effects", moduleEffectsSnapshot.runUpgradeSpeed === 110);
check("effects cap run upgrade healing", moduleEffectsSnapshot.runUpgradeHp === 100);
check("effects create shop bonus defaults", moduleEffectsSnapshot.shopBonuses.pickupRadius === 0);
check("effects add shop item bonuses", moduleEffectsSnapshot.shopBonuses.speed === 20);
check("effects apply shop item run effect", moduleEffectsSnapshot.shopApplied === true);
check("effects apply relic special effects", moduleEffectsSnapshot.relicSpeed === 115);

const composeRuntimeSource = readFileSync(
  new URL("../src/app/compose-runtime.js", import.meta.url),
  "utf8"
);
check(
  "module bootstrap imports canonical content registry source",
  composeRuntimeSource.includes('from "../modules/content-registry.js"')
);
check(
  "module bootstrap imports canonical effects source",
  composeRuntimeSource.includes('from "../modules/effects.js"')
);
check(
  "module bootstrap imports canonical relic provider source",
  composeRuntimeSource.includes('from "../modules/relics.js"')
);
check(
  "module bootstrap does not import classic content registry wrapper",
  !composeRuntimeSource.includes('from "../content-registry.js"')
);
check(
  "module bootstrap does not import classic effects wrapper",
  !composeRuntimeSource.includes('from "../effects.js"')
);
check(
  "module bootstrap does not import classic relic wrapper",
  !composeRuntimeSource.includes('from "../relics.js"')
);

check("module exports choiceId", typeof moduleChoiceId === "function");
check("module exports shopFocusBonus", typeof moduleShopFocusBonus === "function");
check("module exports shuffleChoices", typeof moduleShuffleChoices === "function");
check("module exports weightedChoices", typeof moduleWeightedChoices === "function");
check(
  "bridge does not publish retired TapSurvivorLevelUpChoices",
  bridgeChoices === undefined && !choicesBridge.source.includes("globalThis.TapSurvivorLevelUpChoices")
);
check(
  "level-up choices bridge source has generated banner",
  hasGeneratedBanner(choicesBridge.source)
);
check("level-up choices bridge remains retired", bridgeChoices === undefined);

const weaponChoice = { weaponId: "laser", name: "Laser" };
const runChoice = { runUpgradeId: "run_damage", name: "Damage" };
const unknownChoice = { name: "Repair" };
check("choiceId weapon fixture is unchanged", moduleChoiceId(weaponChoice) === "weapon:laser");
check("choiceId run-upgrade fixture is unchanged", moduleChoiceId(runChoice) === "run:run_damage");
check("choiceId unknown fixture is unchanged", moduleChoiceId(unknownChoice) === "run:Repair");

check("shopFocusBonus empty fixture is unchanged", moduleShopFocusBonus({}) === 0);
check(
  "shopFocusBonus relic compass fixture is unchanged",
  moduleShopFocusBonus({ shopPurchases: { relic_compass: 3 } }) === 1.5
);

const choices = [
  { name: "Alpha", runUpgradeId: "alpha" },
  { name: "Beta", runUpgradeId: "beta" },
  { name: "Gamma", runUpgradeId: "gamma" },
];
const moduleWeighted = withRandomSequence([0.9, 0.2, 0.4], () =>
  moduleWeightedChoices(choices, (choice) => (choice.runUpgradeId === "beta" ? 3 : 1)).map(
    moduleChoiceId
  )
);
check("level-up choices fixtures are unchanged", moduleWeighted[0] === "run:beta");
const moduleWeightedFallback = withRandomSequence([0.3, 0.1, 0.2], () =>
  moduleWeightedChoices(choices, () => 0).map(moduleChoiceId)
);
check(
  "weightedChoices zero-weight fallback uses random order",
  JSON.stringify(moduleWeightedFallback) === JSON.stringify(["run:beta", "run:gamma", "run:alpha"])
);
const moduleShuffled = withRandomSequence([0.3, 0.1, 0.2], () => moduleShuffleChoices(choices));
check("shuffleChoices returns a separate array", moduleShuffled !== choices);
check(
  "shuffleChoices preserves all input choices",
  JSON.stringify(moduleShuffled.map(moduleChoiceId).sort()) ===
    JSON.stringify(choices.map(moduleChoiceId).sort())
);

check("module exports createMapSystem", typeof createModuleMapSystem === "function");
check(
  "map system bridge retires global publisher",
  bridgeMapSystem === undefined && !mapBridge.source.includes("globalThis.TapSurvivorMapSystem")
);
check("map system bridge source has generated banner", hasGeneratedBanner(mapBridge.source));

const moduleFallbackMap = mapSystemSnapshot(createModuleMapSystem(createFallbackMapFixture()));
check("fallback map fixture uses default tower", moduleFallbackMap.fallback.mapId === "default_tower");
check("fallback map fixture uses tower background", moduleFallbackMap.fallback.backgroundId === "tower_floor");

const mapFixture = createMapFixture();
const moduleMapSystem = createModuleMapSystem(mapFixture);
const moduleMapSnapshot = mapSystemSnapshot(moduleMapSystem);
const moduleMapBackgroundFallback = mapSystemSnapshot(
  createModuleMapSystem(createMapBackgroundFallbackFixture())
);
check("map selection fixture uses modulo floor selection", moduleMapSnapshot.floorTwo.mapId === "ice");
check("floor selection fixture uses elapsed startsAt", moduleMapSnapshot.floorTwo.floorId === "ice_late");
check("floorIds fixture limits floor pool", moduleMapSnapshot.floorTwo.floorPool.join(",") === "ice_late,ice_early");
check("floor background fixture resolves direct asset", moduleMapSnapshot.floorTwo.backgroundId === "ice_bg");
check(
  "map background fallback fixture resolves map asset",
  moduleMapBackgroundFallback.floorOne.backgroundId === "forest_bg"
);

check(
  "fallback background fixture uses tower floor",
  moduleMapSnapshot.noConfiguredBackground.backgroundId === "tower_floor"
);
check("modifier merge fixture lets floor override map", moduleMapSnapshot.floorTwo.modifiers.density === 4);
check("modifier merge fixture keeps map-only modifier", moduleMapSnapshot.floorTwo.modifiers.weather === "snow");
check("modifier merge fixture adds floor-only modifier", moduleMapSnapshot.floorTwo.modifiers.elite === true);
check("applyToGame fixture mutates activeMap", moduleMapSnapshot.applied.activeMapId === "ice");
check("applyToGame fixture mutates activeFloor", moduleMapSnapshot.applied.activeFloorId === "ice_late");
check("applyToGame fixture mutates mapModifiers", moduleMapSnapshot.applied.modifiers.density === 4);
check("applyToGame fixture mutates background", moduleMapSnapshot.applied.backgroundId === "ice_bg");
check(
  "applyToGame fixture mutates floorPool",
  moduleMapSnapshot.applied.floorPool.join(",") === "ice_late,ice_early"
);
check("applyToGame null fixture returns null", moduleMapSnapshot.nullApply === null);


check("module exports createSaveLoadHandler", typeof createModuleSaveLoadHandler === "function");
check(
  "bridge assigns globalThis.TapSurvivorSaveCorruption",
  Boolean(bridgeSaveCorruption)
);
check(
  "save corruption bridge source has generated banner",
  hasGeneratedBanner(saveCorruptionBridge.source)
);
check(
  "bridge exposes createSaveLoadHandler",
  typeof bridgeSaveCorruption?.createSaveLoadHandler === "function"
);

const moduleSaveLoadSnapshot = saveLoadSnapshot(createModuleSaveLoadHandler);
const bridgeSaveLoadSnapshot = saveLoadSnapshot(bridgeSaveCorruption.createSaveLoadHandler);
check("missing raw save normalizes empty object", moduleSaveLoadSnapshot.empty.normalized[0] === "{}");
check("missing raw save has no warning", moduleSaveLoadSnapshot.empty.warning === null);
check(
  "valid raw save normalizes parsed object",
  moduleSaveLoadSnapshot.valid.normalized[0] === "{\"coins\":7}"
);
check("valid raw save has no warning", moduleSaveLoadSnapshot.valid.warning === null);
check("corrupt raw save returns default save", moduleSaveLoadSnapshot.corrupt.result.defaulted === true);
check("corrupt raw save sets warning", moduleSaveLoadSnapshot.corrupt.warning === "corrupt-save");
check("corrupt raw save backs up raw value", moduleSaveLoadSnapshot.corrupt.backups[0] === "{bad");
check(
  "storageReadFailed returns default save",
  moduleSaveLoadSnapshot.storageFailed.result.defaulted === true
);
check(
  "storageReadFailed sets warning",
  moduleSaveLoadSnapshot.storageFailed.warning === "storage-read-failed"
);
check(
  "module and bridge save load output match",
  JSON.stringify(moduleSaveLoadSnapshot) === JSON.stringify(bridgeSaveLoadSnapshot)
);

check("module exports CURRENT_SAVE_VERSION", moduleCurrentSaveVersion === 3);
check("module exports createDefaultSave", typeof createModuleDefaultSave === "function");
check(
  "save defaults bridge retires global publisher",
  bridgeSaveDefaults === undefined && !saveDefaultsBridge.source.includes("globalThis.TapSurvivorSaveDefaults")
);
check("save defaults bridge source has generated banner", hasGeneratedBanner(saveDefaultsBridge.source));

check("module exports isPlainObject", typeof moduleIsPlainObject === "function");
check("module exports migrateSave", typeof moduleMigrateSave === "function");
check("bridge assigns globalThis.TapSurvivorSaveMigrations", Boolean(bridgeSaveMigrations));
check(
  "save migrations bridge source has generated banner",
  hasGeneratedBanner(saveMigrationsBridge.source)
);
check("bridge exposes isPlainObject", typeof bridgeSaveMigrations?.isPlainObject === "function");
check("bridge exposes migrateSave", typeof bridgeSaveMigrations?.migrateSave === "function");
check("isPlainObject object fixture is unchanged", moduleIsPlainObject({}) === true);
check("isPlainObject null fixture is unchanged", moduleIsPlainObject(null) === false);
check("isPlainObject array fixture is unchanged", moduleIsPlainObject([]) === false);
check(
  "module and bridge isPlainObject output match",
  JSON.stringify([{}, null, []].map(moduleIsPlainObject)) ===
    JSON.stringify([{}, null, []].map(bridgeSaveMigrations.isPlainObject))
);

const saveMigrationFixtures = [
  { saveVersion: 1 },
  { saveVersion: 2 },
  { saveVersion: 2, shopPurchases: { boots: 1 } },
  { saveVersion: 3 },
  { saveVersion: 3, seenBanners: ["boss_intro"] },
  null,
  { saveVersion: 1, shopPurchases: { boots: 2 }, seenBanners: ["floor_2"] },
];
const moduleMigrationResults = saveMigrationFixtures.map(moduleMigrateSave);
const bridgeMigrationResults = saveMigrationFixtures.map(bridgeSaveMigrations.migrateSave);
check("migrateSave version one fixture ends at current version", moduleMigrationResults[0].saveVersion === 3);
check(
  "migrateSave version one fixture applies version two shop purchases",
  JSON.stringify(moduleMigrationResults[0].shopPurchases) === JSON.stringify({})
);
check(
  "migrateSave version two fixture preserves shop purchases",
  JSON.stringify(moduleMigrationResults[2].shopPurchases) === JSON.stringify({ boots: 1 })
);
check(
  "migrateSave version two fixture applies version three seen banners",
  JSON.stringify(moduleMigrationResults[1].seenBanners) === JSON.stringify([])
);
check(
  "migrateSave version three fixture preserves seen banners",
  JSON.stringify(moduleMigrationResults[4].seenBanners) === JSON.stringify(["boss_intro"])
);
check(
  "migrateSave invalid fixture returns current version object",
  moduleMigrationResults[5].saveVersion === 3 && moduleIsPlainObject(moduleMigrationResults[5])
);
check(
  "migrateSave preserves existing migration fields",
  JSON.stringify(moduleMigrationResults[6].shopPurchases) === JSON.stringify({ boots: 2 }) &&
    JSON.stringify(moduleMigrationResults[6].seenBanners) === JSON.stringify(["floor_2"])
);
check(
  "module and bridge migration output match",
  JSON.stringify(moduleMigrationResults) === JSON.stringify(bridgeMigrationResults)
);

check("module exports arrayValue", typeof moduleArrayValue === "function");
check("module exports objectValue", typeof moduleObjectValue === "function");
check("module exports createSaveNormalizer", typeof createModuleSaveNormalizer === "function");
check("bridge assigns globalThis.TapSurvivorSaveNormalize", Boolean(bridgeSaveNormalize));
check(
  "save normalize bridge source has generated banner",
  hasGeneratedBanner(saveNormalizeBridge.source)
);
for (const exportName of ["arrayValue", "createSaveNormalizer", "objectValue"]) {
  check(`bridge exposes save normalize ${exportName}`, typeof bridgeSaveNormalize?.[exportName] === "function");
}
check("arrayValue returns arrays", moduleArrayValue(["alpha"])[0] === "alpha");
check("arrayValue falls back to empty array", JSON.stringify(moduleArrayValue("alpha")) === JSON.stringify([]));
check("objectValue returns plain objects", moduleObjectValue({ alpha: 1 }).alpha === 1);
check("objectValue falls back to empty object", JSON.stringify(moduleObjectValue([])) === JSON.stringify({}));
check(
  "module and bridge save normalize helper output match",
  JSON.stringify([
    moduleArrayValue(["alpha"]),
    moduleArrayValue("alpha"),
    moduleObjectValue({ alpha: 1 }),
    moduleObjectValue([]),
  ]) ===
    JSON.stringify([
      bridgeSaveNormalize.arrayValue(["alpha"]),
      bridgeSaveNormalize.arrayValue("alpha"),
      bridgeSaveNormalize.objectValue({ alpha: 1 }),
      bridgeSaveNormalize.objectValue([]),
    ])
);

const moduleNormalizeSnapshot = saveNormalizeSnapshot(createModuleSaveNormalizer);
const bridgeNormalizeSnapshot = saveNormalizeSnapshot(bridgeSaveNormalize.createSaveNormalizer);
check(
  "module and bridge normalizeSave output match",
  JSON.stringify(moduleNormalizeSnapshot) === JSON.stringify(bridgeNormalizeSnapshot)
);
check("invalid input normalizes to current save version", moduleNormalizeSnapshot.invalid.saveVersion === 3);
check("invalid input normalizes to default save coins", moduleNormalizeSnapshot.invalid.coins === 0);
check("coins are floored and clamped", moduleNormalizeSnapshot.complex.coins === 0);
check("towerFloor is floored and clamped", moduleNormalizeSnapshot.complex.towerFloor === 2);
check(
  "unlockedWeapons includes spark bolt and dedupes",
  JSON.stringify(moduleNormalizeSnapshot.complex.unlockedWeapons) === JSON.stringify(["spark_bolt", "laser"])
);
check(
  "seenBanners array normalizes and dedupes",
  JSON.stringify(moduleNormalizeSnapshot.complex.seenBanners) === JSON.stringify(["intro", "boss"])
);
check(
  "unlockedRelics dedupe",
  JSON.stringify(moduleNormalizeSnapshot.complex.unlockedRelics) ===
    JSON.stringify(["r1", "r2", "r3", "r4", "r5", "r6"])
);
check(
  "equippedRelics dedupe filter and cap",
  JSON.stringify(moduleNormalizeSnapshot.complex.equippedRelics) ===
    JSON.stringify(["r1", "r2", "r3", "r4", "r5"])
);
check(
  "shopPurchases clamp tiers and drop unknown items",
  JSON.stringify(moduleNormalizeSnapshot.complex.shopPurchases) === JSON.stringify({ boots: 2, orb: 1 })
);
check("default starter quests are ensured open", moduleNormalizeSnapshot.complex.activeQuests.includes("starter"));
check("completed quests open follow-up quests", moduleNormalizeSnapshot.complex.activeQuests.includes("follow"));
check(
  "unlocked weapon nodes open linked quests",
  moduleNormalizeSnapshot.complex.activeQuests.includes("weapon_quest")
);
check("unlocked upgrades backfill upgrade tiers", moduleNormalizeSnapshot.complex.upgradeTiers.damage === 1);
check(
  "positive upgrade tiers populate unlockedUpgrades",
  JSON.stringify(moduleNormalizeSnapshot.complex.unlockedUpgrades.sort()) === JSON.stringify(["damage", "speed"])
);
check(
  "positive upgrade tiers open linked quests",
  moduleNormalizeSnapshot.complex.activeQuests.includes("speed_quest") &&
    moduleNormalizeSnapshot.complex.activeQuests.includes("upgrade_quest")
);

check("module exports createSaveSystem", typeof createModuleSaveSystem === "function");
check("bridge assigns globalThis.TapSurvivorSave", Boolean(bridgeSave));
check("save bridge source has generated banner", hasGeneratedBanner(saveBridge.source));
check("bridge exposes createSaveSystem", typeof bridgeSave?.createSaveSystem === "function");
const moduleSaveSystemSnapshot = saveSystemSnapshot(createModuleSaveSystem, globalThis);
const bridgeSaveSystemSnapshot = saveSystemSnapshot(bridgeSave.createSaveSystem, saveBridge.context);
check(
  "module and bridge save system output match",
  JSON.stringify(moduleSaveSystemSnapshot) === JSON.stringify(bridgeSaveSystemSnapshot)
);
check(
  "defaultSave parity fixture keeps starter quest",
  JSON.stringify(moduleSaveSystemSnapshot.defaultSave.activeQuests) === JSON.stringify(["starter"])
);
check("normalizeSave parity fixture clamps coins", moduleSaveSystemSnapshot.normalized.coins === 9);
check("loadSave handles valid raw saves", moduleSaveSystemSnapshot.validLoad.coins === 7);
check("loadSave handles corrupt raw saves", moduleSaveSystemSnapshot.corruptLoad.coins === 0);
check("corrupt load warning delegates", moduleSaveSystemSnapshot.corruptWarning === "corrupt-save");
check("corrupt load backs up raw value", moduleSaveSystemSnapshot.corruptBackups[0] === "{bad");
check("storage read failure returns default", moduleSaveSystemSnapshot.failedLoad.coins === 0);
check("storage read failure warning delegates", moduleSaveSystemSnapshot.failedWarning === "storage-read-failed");
check("persist writes JSON through storage adapter", moduleSaveSystemSnapshot.persistWrites.length === 1);
check(
  "persist refreshes unlockedUpgrades",
  JSON.stringify(moduleSaveSystemSnapshot.persistSave.unlockedUpgrades) === JSON.stringify(["damage"])
);
check("removeSave delegates to storage adapter", moduleSaveSystemSnapshot.removed === true);
check("provided storage adapter bypasses fallback factory", moduleSaveSystemSnapshot.providedFallbackCalls === 0);
check("fallback storage factory is called", moduleSaveSystemSnapshot.fallbackCalls.length === 1);
check(
  "fallback storage receives save keys",
  JSON.stringify(moduleSaveSystemSnapshot.fallbackCalls[0]) ===
    JSON.stringify({ saveKey: "save-key", legacySaveKey: "legacy-key" })
);

check("module exports createShopPricing", typeof createModuleShopPricing === "function");
check(
  "shop pricing bridge remains retired",
  createBridgeShopPricing === undefined && !pricingBridge.source.includes("globalThis.TapSurvivorShopPricing")
);
check("shop pricing bridge source has generated banner", hasGeneratedBanner(pricingBridge.source));
check(
  "shop pricing bridge source omits retired publisher",
  !pricingBridge.source.includes("globalThis.TapSurvivorShopPricing")
);

const shopItemDefs = [
  { id: "boots", cost: [10, 20], maxTier: 2 },
  { id: "orb", cost: 30, maxTier: 1 },
];
const save = {
  coins: 100,
  towerFloor: 3,
  shopPurchases: {
    boots: 1,
  },
};
const options = {
  shopItemDefs,
  pricingConfig: {
    floorPriceRate: 0.1,
    inflationRate: 0.2,
  },
  getSave: () => save,
};

const modulePricing = createModuleShopPricing(options);
const moduleResults = pricingSnapshot(modulePricing);
check("shop pricing module boots tier is stable", moduleResults.bootsTier === 1);
check("shop pricing module orb tier is stable", moduleResults.orbTier === 0);

check("module exports createRelicSystem", typeof createModuleRelicSystem === "function");
check("bridge assigns globalThis.TapSurvivorRelics", Boolean(relicsBridge.context.TapSurvivorRelics));
check("bridge exposes createRelicSystem", typeof createBridgeRelicSystem === "function");
check("relic bridge source has generated banner", hasGeneratedBanner(relicsBridge.source));

const relicFixtureDefs = [
  {
    id: "move_speed_focus_relic",
    targetUpgradeId: "run_move_speed",
    maxTierBonus: 1,
    startingTierBonus: 1,
  },
  {
    id: "fire_rate_mastery_relic",
    targetUpgradeId: "run_fire_rate",
    maxTierBonus: 2,
    startingTierBonus: 2,
  },
  {
    id: "split_on_hit_mastery_relic",
    targetUpgradeId: "run_split_on_hit",
    specialAbility: {
      modifiers: {
        maxHpMultiplier: 0.6,
        speedMultiplier: 0.35,
        pickupRadiusMultiplier: 0.35,
      },
    },
  },
];
const relicFixtureSave = {
  towerFloor: 20,
  unlockedRelics: ["move_speed_focus_relic", "fire_rate_mastery_relic"],
  equippedRelics: ["move_speed_focus_relic", "fire_rate_mastery_relic"],
};
const specialRelicFixtureSave = {
  towerFloor: 10,
  unlockedRelics: ["split_on_hit_mastery_relic"],
  equippedRelics: ["split_on_hit_mastery_relic"],
};
const relicSystemOptions = {
  relicDefs: relicFixtureDefs,
  weaponDefs: {
    spark_bolt: { kind: "projectile" },
  },
  random: () => 0,
};
const moduleRelicSnapshot = relicSystemSnapshot(
  createModuleRelicSystem(relicSystemOptions),
  relicFixtureSave,
  specialRelicFixtureSave
);
const bridgeRelicSnapshot = relicSystemSnapshot(
  createBridgeRelicSystem(relicSystemOptions),
  relicFixtureSave,
  specialRelicFixtureSave
);
check(
  "module and bridge relic provider output match",
  JSON.stringify(moduleRelicSnapshot) === JSON.stringify(bridgeRelicSnapshot)
);
check("relic bridge max equipped slots fixture is unchanged", moduleRelicSnapshot.maxEquippedRelics === 2);
check(
  "relic bridge run-start tiers fixture is unchanged",
  moduleRelicSnapshot.startingRunUpgradeTiers.run_move_speed === 1 &&
    moduleRelicSnapshot.startingRunUpgradeTiers.run_fire_rate === 2
);
check("relic bridge max-tier bonus fixture is unchanged", moduleRelicSnapshot.moveSpeedMaxTierBonus === 1);
check(
  "relic bridge special modifiers fixture is unchanged",
  moduleRelicSnapshot.specialEffects.maxHpMultiplier === 0.6 &&
    moduleRelicSnapshot.specialEffects.speedMultiplier === 0.35 &&
    moduleRelicSnapshot.specialEffects.pickupRadiusMultiplier === 0.35
);

check("module exports createShellRelicUi", typeof createModuleShellRelicUi === "function");
check("bridge assigns globalThis.TapSurvivorShellRelicUi", Boolean(bridgeShellRelicUi));
check("bridge exposes createShellRelicUi", typeof bridgeShellRelicUi?.createShellRelicUi === "function");
check("shell relic UI bridge source has generated banner", hasGeneratedBanner(shellRelicUiBridge.source));

const shellRelicUiFixtureDefs = [
  {
    id: "move_speed_focus_relic",
    name: "Move Speed Focus",
    description: "Start faster.",
    targetUpgradeId: "run_move_speed",
    maxTierBonus: 1,
    startingTierBonus: 1,
    iconPath: "move-speed-focus.png",
    backgroundColor: "#334455",
  },
  {
    id: "pickup_radius_focus_relic",
    name: "Pickup Radius Focus",
    description: "Collect farther.",
    targetUpgradeId: "run_pickup_radius",
    maxTierBonus: 1,
    startingTierBonus: 1,
    iconPath: "pickup-radius-focus.png",
    backgroundColor: "#445566",
  },
  {
    id: "locked_focus_relic",
    name: "Locked Focus",
    description: "Locked fixture.",
    targetUpgradeId: "run_fire_rate",
    iconPath: "locked-focus.png",
  },
];
const shellRelicUiContentFixture = {
  assets: {
    sprites: {
      player: "player-fixture.png",
    },
  },
  runUpgrades: [
    { id: "run_move_speed", name: "Move Speed" },
    { id: "run_pickup_radius", name: "Pickup Radius" },
    { id: "run_fire_rate", name: "Fire Rate" },
  ],
};
const shellRelicUiAssetResolver = {
  relicIcon: (relic) => relic.iconPath,
  runUpgradeSprite: (upgradeId) => ({
    fps: 10,
    frames: [{ height: 16, width: 16, x: 0, y: 0 }],
    src: `${upgradeId}.png`,
    transparentColor: [0, 0, 0],
    transparentTolerance: 58,
  }),
  spriteSource: (sprite) => sprite.src,
};
const shellRelicUiBridgeSnapshot = shellRelicUiSnapshot(bridgeShellRelicUi.createShellRelicUi, {
  assetResolver: shellRelicUiAssetResolver,
  content: shellRelicUiContentFixture,
  relicDefs: shellRelicUiFixtureDefs,
  relicSystem: createBridgeRelicSystem({
    relicDefs: shellRelicUiFixtureDefs,
    random: () => 0,
    weaponDefs: {},
  }),
});
const shellRelicUiModuleSnapshot = shellRelicUiSnapshot(createModuleShellRelicUi, {
  assetResolver: shellRelicUiAssetResolver,
  content: shellRelicUiContentFixture,
  relicDefs: shellRelicUiFixtureDefs,
  relicSystem: createModuleRelicSystem({
    relicDefs: shellRelicUiFixtureDefs,
    random: () => 0,
    weaponDefs: {},
  }),
});
check(
  "module and bridge shell relic UI output match",
  JSON.stringify(shellRelicUiBridgeSnapshot) === JSON.stringify(shellRelicUiModuleSnapshot)
);
check(
  "shell relic UI bridge preserves classic inventory API",
  shellRelicUiBridgeSnapshot.initialSlotText ===
    "Relic slots: 2/5 unlocked. Next slot at tower level 30." &&
    shellRelicUiBridgeSnapshot.inventoryClasses.includes("relic-loadout") &&
    shellRelicUiBridgeSnapshot.inventoryClasses.includes("relic-icon-grid")
);
check(
  "shell relic UI bridge preserves classic detail and preview behavior",
  shellRelicUiBridgeSnapshot.detailSlotText === "Pickup Radius Focus" &&
    shellRelicUiBridgeSnapshot.detailClasses.some((className) => className.includes("relic-detail-screen")) &&
    shellRelicUiBridgeSnapshot.previewDraws === 1 &&
    shellRelicUiBridgeSnapshot.previewTimerDelay === 100
);
check(
  "shell relic UI bridge preserves classic equip unequip and persistence behavior",
  shellRelicUiBridgeSnapshot.equippedAfterEquip.includes("pickup_radius_focus_relic") &&
    !shellRelicUiBridgeSnapshot.equippedAfterUnequip.includes("move_speed_focus_relic") &&
    shellRelicUiBridgeSnapshot.persistCount === 2 &&
    shellRelicUiBridgeSnapshot.renderMetaCount === 2
);
check(
  "shell relic UI bridge preserves classic lock popup behavior",
  shellRelicUiBridgeSnapshot.lockPopupText === "Locked, play more to unlock this skill." &&
    shellRelicUiBridgeSnapshot.lockPopupHidden === true &&
    shellRelicUiBridgeSnapshot.lockTimerDelay === 1800
);

check("classic shell UI assigns globalThis.TapSurvivorShellUi", Boolean(bridgeShellUi));
check("shell UI bridge source has generated banner", hasGeneratedBanner(shellUiClassicBridge.source));
check(
  "shell UI bridge source is generated from module classic adapter",
  shellUiClassicBridge.source.includes("Source: src/modules/shell-ui-classic-adapter.js")
);
check(
  "classic shell UI exposes createShellUiController",
  typeof bridgeShellUi?.createShellUiController === "function"
);
const shellUiClassicSnapshot = classicShellUiSnapshot(bridgeShellUi.createShellUiController, {
  createShellRelicUi: bridgeShellRelicUi.createShellRelicUi,
  relicSystem: createBridgeRelicSystem({
    relicDefs: shellRelicUiFixtureDefs,
    random: () => 0,
    weaponDefs: {},
  }),
});
const shellUiModuleSnapshot = moduleShellUiSnapshot(createModuleShellUiController);
check(
  "classic shell UI preserves exact public controller API shape",
  JSON.stringify(shellUiClassicSnapshot.apiKeys) ===
    JSON.stringify([
      "bind",
      "closeRunMenu",
      "closeShopMenu",
      "closeStartFlow",
      "showTitleScreen",
      "startGameFromTitle",
    ])
);
check(
  "classic shell UI creation path expected by production works",
  shellUiClassicSnapshot.boundListeners.includes("titleStartGame:click") &&
    shellUiClassicSnapshot.boundListeners.includes("openMenu:click") &&
    shellUiClassicSnapshot.boundListeners.includes("menuInventoryTab:click") &&
    shellUiClassicSnapshot.boundListeners.includes("speed5:click")
);
check(
  "classic shell UI frame and panel render through relic bridge path",
  shellUiClassicSnapshot.relicSlotsText.includes("Relic slots: 2/5") &&
    shellUiClassicSnapshot.inventoryClasses.some((className) => className.includes("relic-loadout")) &&
    shellUiClassicSnapshot.progressHidden === true &&
    shellUiClassicSnapshot.inventoryHidden === false
);
check(
  "classic shell UI active panel state updates through API",
  shellUiClassicSnapshot.progressTabActive === false &&
    shellUiClassicSnapshot.inventoryTabActive === true &&
    shellUiClassicSnapshot.openMenuExpanded === "true"
);
check(
  "classic shell UI callbacks fire through production API",
  shellUiClassicSnapshot.calls.includes("start-run") &&
    shellUiClassicSnapshot.calls.includes("shop:open") &&
    shellUiClassicSnapshot.calls.includes("shop:close") &&
    shellUiClassicSnapshot.calls.includes("reset-save") &&
    shellUiClassicSnapshot.calls.includes("fullscreen:request") &&
    shellUiClassicSnapshot.calls.includes("mute") &&
    shellUiClassicSnapshot.calls.includes("speed:5")
);
check(
  "classic shell UI public methods preserve close and title behavior",
  shellUiClassicSnapshot.runMenuClosed === true &&
    shellUiClassicSnapshot.openMenuCollapsed === "false" &&
    shellUiClassicSnapshot.startFlowClosed === true &&
    shellUiClassicSnapshot.titleVisible === true &&
    shellUiClassicSnapshot.shopClosedByMethod === true
);
check(
  "classic shell UI relic select equip and unequip delegate through shell relic bridge",
  shellUiClassicSnapshot.calls.includes("persist") &&
    shellUiClassicSnapshot.calls.includes("render-meta") &&
    shellUiClassicSnapshot.equippedAfterEquip.includes("pickup_radius_focus_relic") &&
    !shellUiClassicSnapshot.equippedAfterUnequip.includes("move_speed_focus_relic")
);
check(
  "classic shell UI start flow and menu state match module controller fixture",
  shellUiClassicSnapshot.startedScreen === shellUiModuleSnapshot.startedScreen &&
    shellUiClassicSnapshot.activePanel === shellUiModuleSnapshot.activePanel
);
check(
  "module shell UI API remains broader than generated classic compatibility API",
  shellUiModuleSnapshot.apiKeys.includes("dispose") &&
    shellUiModuleSnapshot.apiKeys.includes("openPanel") &&
    !shellUiClassicSnapshot.apiKeys.includes("dispose")
);

check("module exports clamp", typeof moduleClamp === "function");
check("module exports distance", typeof moduleDistance === "function");
check("module exports formatTime", typeof moduleFormatTime === "function");
check("module exports randomRange", typeof moduleRandomRange === "function");
check(
  "bridge does not publish retired TapSurvivorMath",
  bridgeMath === undefined && !mathBridge.source.includes("globalThis.TapSurvivorMath")
);
check("math bridge source has generated banner", hasGeneratedBanner(mathBridge.source));
check("math bridge remains retired", bridgeMath === undefined);

const mathResults = {
  clamp: moduleClamp(12, 0, 10),
  distance: moduleDistance({ x: 0, y: 0 }, { x: 3, y: 4 }),
  formatTime: moduleFormatTime(65),
};
check("module clamp fixture is unchanged", mathResults.clamp === 10);
check("module distance fixture is unchanged", mathResults.distance === 5);
check("module formatTime fixture is unchanged", mathResults.formatTime === "1:05");
const moduleRandom = moduleRandomRange(2, 4);
check("module randomRange returns number in range", moduleRandom >= 2 && moduleRandom < 4);

check("module exports nearestEnemy", typeof moduleNearestEnemy === "function");
check(
  "weapon targeting bridge remains retired",
  bridgeTargeting === undefined && !targetingBridge.source.includes("globalThis.TapSurvivorWeaponTargeting")
);
check(
  "weapon targeting bridge source has generated banner",
  hasGeneratedBanner(targetingBridge.source)
);

const targetingGame = {
  player: { x: 0, y: 0 },
  enemies: [
    { id: "far", x: 8, y: 0 },
    { id: "near", x: 3, y: 4 },
    { id: "mid", x: 6, y: 0 },
  ],
};
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const moduleTarget = moduleNearestEnemy(targetingGame, distance);
check("module nearestEnemy fixture selects nearest enemy", moduleTarget?.id === "near");
check(
  "module nearestEnemy empty-enemy fallback remains null",
  moduleNearestEnemy({ player: { x: 0, y: 0 }, enemies: [] }, distance) === null
);

check("module exports createWeaponScaling", typeof createModuleWeaponScaling === "function");
check(
  "bridge does not assign globalThis.TapSurvivorWeaponCooldowns",
  !Reflect.has(cooldownBridge.context, "TapSurvivorWeaponCooldowns")
);
check(
  "weapon cooldown bridge source has generated banner",
  hasGeneratedBanner(cooldownBridge.source)
);
check(
  "weapon cooldown bridge omits global fallback",
  !cooldownBridge.source.includes("globalThis.TapSurvivorWeaponCooldowns")
);

const runUpgrades = [
  {
    id: "run_projectile_focus",
    projectileCooldownMultiplier: 0.9,
    projectileDamageMultiplier: 1.15,
  },
  {
    id: "run_projectile_scale",
    projectileDamageMultiplier: 1.05,
  },
];

const scalingFixture = createScalingFixture();
const moduleScaling = createModuleWeaponScaling(scalingFixture);
const moduleScalingResults = scalingSnapshot(moduleScaling, scalingFixture.weaponDefs.bolt);
check("weaponCooldown fixture is finite", Number.isFinite(moduleScalingResults.weaponCooldown));
check("weaponSfxOptions fixture has playbackRate", moduleScalingResults.weaponSfxOptions.playbackRate > 0);
check("weaponReach fixture is finite", Number.isFinite(moduleScalingResults.weaponReach));
check("weaponWidth fixture is finite", Number.isFinite(moduleScalingResults.weaponWidth));
check("projectileRadius fixture is finite", Number.isFinite(moduleScalingResults.projectileRadius));
check("weaponDamage fixture is finite", Number.isFinite(moduleScalingResults.weaponDamage));
check(
  "projectileSkillModifier fixture is finite",
  Number.isFinite(moduleScalingResults.projectileSkillModifier)
);

const fallbackFixture = createFallbackScalingFixture();
const fallbackSnapshot = scalingSnapshot(createModuleWeaponScaling(fallbackFixture), fallbackFixture.weaponDefs.bolt);
check("weapon cooldown fallback module handles optional callbacks", fallbackSnapshot.weaponCooldown > 0);

check("module exports rotateVector", typeof moduleRotateVector === "function");
check(
  "module exports createWeaponProjectileSystem",
  typeof createModuleWeaponProjectileSystem === "function"
);
check("bridge assigns globalThis.TapSurvivorWeaponProjectiles", Boolean(bridgeProjectiles));
check(
  "weapon projectiles bridge source has generated banner",
  hasGeneratedBanner(projectileBridge.source)
);
check("bridge exposes rotateVector", typeof bridgeProjectiles?.rotateVector === "function");
check(
  "bridge exposes createWeaponProjectileSystem",
  typeof bridgeProjectiles?.createWeaponProjectileSystem === "function"
);

const moduleRotated = moduleRotateVector(1, 0, Math.PI / 2);
const bridgeRotated = bridgeProjectiles.rotateVector(1, 0, Math.PI / 2);
check(
  "module rotateVector fixture is unchanged",
  approxEqual(moduleRotated[0], 0) && approxEqual(moduleRotated[1], 1)
);
check(
  "module and bridge rotateVector output match",
  approxVectorEqual(moduleRotated, bridgeRotated)
);

const moduleProjectileFire = runProjectileFireFixture(createModuleWeaponProjectileSystem);
const bridgeProjectileFire = runProjectileFireFixture(bridgeProjectiles.createWeaponProjectileSystem);
check(
  "module and bridge projectile fire output match",
  JSON.stringify(moduleProjectileFire) === JSON.stringify(bridgeProjectileFire)
);
check("projectile fire fixture spawns one bolt", moduleProjectileFire.boltCount === 1);
check("projectile fire fixture direction uses target vector", approxEqual(moduleProjectileFire.vx, 6));
check("projectile fire fixture speed uses target vector", approxEqual(moduleProjectileFire.vy, 8));
check("projectile fire fixture radius is injected", moduleProjectileFire.radius === 7);
check("projectile fire fixture damage is injected", moduleProjectileFire.damage === 21);
check("projectile fire fixture color is preserved", moduleProjectileFire.color === "#abc123");
check("projectile fire fixture life is unchanged", moduleProjectileFire.life === 1.8);

const moduleNoTarget = runNoTargetProjectileFixture(createModuleWeaponProjectileSystem);
const bridgeNoTarget = runNoTargetProjectileFixture(bridgeProjectiles.createWeaponProjectileSystem);
check("module no-target fixture spawns no bolts", moduleNoTarget.boltCount === 0);
check(
  "module and bridge no-target output match",
  JSON.stringify(moduleNoTarget) === JSON.stringify(bridgeNoTarget)
);

const moduleSplitDouble = runSplitDoubleProjectileFixture(createModuleWeaponProjectileSystem);
const bridgeSplitDouble = runSplitDoubleProjectileFixture(
  bridgeProjectiles.createWeaponProjectileSystem
);
check("split/double fixture spawns expected bolt count", moduleSplitDouble.boltCount === 4);
check(
  "module and bridge split/double output match",
  JSON.stringify(moduleSplitDouble) === JSON.stringify(bridgeSplitDouble)
);

const moduleBounce = runWallBounceFixture(createModuleWeaponProjectileSystem);
const bridgeBounce = runWallBounceFixture(bridgeProjectiles.createWeaponProjectileSystem);
check("wall bounce fixture flips velocity", moduleBounce.vx > 0);
check("wall bounce fixture decreases bounce count", moduleBounce.bounces === 0);
check(
  "module and bridge wall bounce output match",
  JSON.stringify(moduleBounce) === JSON.stringify(bridgeBounce)
);

const moduleCollision = runCollisionFixture(createModuleWeaponProjectileSystem);
const bridgeCollision = runCollisionFixture(bridgeProjectiles.createWeaponProjectileSystem);
check("collision fixture calls damageEnemy", moduleCollision.damageCalls.length === 1);
check("collision fixture passes expected damage", moduleCollision.damageCalls[0]?.damage === 21);
check("collision fixture passes expected weapon ID", moduleCollision.damageCalls[0]?.weaponId === "bolt");
check("collision fixture calls reapEnemies", moduleCollision.reapCount === 1);
check(
  "module and bridge collision output match",
  JSON.stringify(moduleCollision) === JSON.stringify(bridgeCollision)
);

check(
  "module exports createGameRuntimeController",
  typeof createModuleGameRuntimeController === "function"
);
check("bridge assigns globalThis.TapSurvivorGameRuntime", Boolean(bridgeGameRuntime));
check("game runtime bridge source has generated banner", hasGeneratedBanner(gameRuntimeBridge.source));
check(
  "game runtime module does not read TapSurvivorInput directly",
  !readFileSync(new URL("../src/modules/game-runtime.js", import.meta.url), "utf8").includes(
    "globalThis.TapSurvivorInput"
  )
);
check(
  "bridge exposes createGameRuntimeController",
  typeof bridgeGameRuntime?.createGameRuntimeController === "function"
);

const moduleGameRuntimeErrors = gameRuntimeDependencyErrors(createModuleGameRuntimeController);
check(
  "module game runtime reports missing bindMovementInput",
  moduleGameRuntimeErrors.missing.includes("bindMovementInput")
);
check(
  "module game runtime rejects non-function bindMovementInput",
  moduleGameRuntimeErrors.invalid.includes("bindMovementInput")
);

const bridgeGameRuntimeErrors = gameRuntimeDependencyErrors(bridgeGameRuntime.createGameRuntimeController);
check(
  "bridge game runtime reports missing bindMovementInput",
  bridgeGameRuntimeErrors.missing.includes("bindMovementInput")
);
check(
  "bridge game runtime rejects non-function bindMovementInput",
  bridgeGameRuntimeErrors.invalid.includes("bindMovementInput")
);

const moduleGameRuntimeSnapshot = gameRuntimeSnapshot(createModuleGameRuntimeController);
const bridgeGameRuntimeSnapshot = gameRuntimeSnapshot(bridgeGameRuntime.createGameRuntimeController);
check(
  "module and bridge game runtime output match",
  JSON.stringify(moduleGameRuntimeSnapshot) === JSON.stringify(bridgeGameRuntimeSnapshot)
);
check("game runtime initializes with loaded save", moduleGameRuntimeSnapshot.saveCoins === 7);
check("game runtime resets speed controls", moduleGameRuntimeSnapshot.initialSpeed === 1);
check("game runtime speed setter accepts x5", moduleGameRuntimeSnapshot.speedAfterSet === 5);
check("game runtime speed setter rejects unsupported values", moduleGameRuntimeSnapshot.speedAfterInvalid === 5);
check("game runtime reset clears game state", moduleGameRuntimeSnapshot.gameAfterReset === null);
check("game runtime reset persists once", moduleGameRuntimeSnapshot.persistCount === 2);
check("game runtime binds movement input", moduleGameRuntimeSnapshot.movementBinds === 1);
check("game runtime passes canvas to injected input", moduleGameRuntimeSnapshot.movementCanvasWidth === 960);
check("game runtime passes getGame to injected input", moduleGameRuntimeSnapshot.movementGetGameRunning === true);
check("game runtime schedules loop", moduleGameRuntimeSnapshot.rafCount === 1);

check("module exports createGameDependencyBag", typeof createModuleGameDependencyBag === "function");
check("module exports createGameBannerSystem", typeof createModuleGameBannerSystem === "function");
check(
  "bridge assigns globalThis.TapSurvivorGameDependencies",
  Boolean(bridgeGameDependencies)
);
check(
  "game dependencies bridge source has generated banner",
  hasGeneratedBanner(gameDependenciesBridge.source)
);
check(
  "bridge exposes createGameDependencyBag",
  typeof bridgeGameDependencies?.createGameDependencyBag === "function"
);
check(
  "game banners bridge source has generated banner",
  hasGeneratedBanner(gameBannersBridge.source)
);
check(
  "game banners bridge is global-free",
  !gameBannersBridge.source.includes("globalThis.TapSurvivorGameBanners") &&
    gameBannersBridge.context.TapSurvivorGameBanners === undefined
);
check(
  "game dependency bridge has no retired Shop global publisher or reader",
  !gameDependenciesBridge.source.includes("globalThis.TapSurvivorShop") &&
    !gameDependenciesBridge.source.includes('"TapSurvivorShop"')
);

const moduleGameDependenciesSnapshot = gameDependenciesSnapshot(createModuleGameDependencyBag);
const bridgeGameDependenciesSnapshot = gameDependenciesSnapshot(
  bridgeGameDependencies.createGameDependencyBag
);
check(
  "module and bridge game dependency bag output match",
  JSON.stringify(moduleGameDependenciesSnapshot) === JSON.stringify(bridgeGameDependenciesSnapshot)
);
for (const [name, readCount] of Object.entries(moduleGameDependenciesSnapshot.retiredGlobalReads)) {
  check(`dependency bag does not read retired ${name}`, readCount === 0);
}
check("dependency bag preserves balance content override", moduleGameDependenciesSnapshot.contentId === "override");
check("dependency bag exposes assets", moduleGameDependenciesSnapshot.hasAssets);
check("dependency bag exposes balance", moduleGameDependenciesSnapshot.hasBalance);
check("dependency bag exposes content registry", moduleGameDependenciesSnapshot.hasContentRegistry);
check("dependency bag exposes combat damage", moduleGameDependenciesSnapshot.hasCombatDamage);
check("dependency bag exposes enemies", moduleGameDependenciesSnapshot.hasEnemies);
check("dependency bag exposes enemy behaviors", moduleGameDependenciesSnapshot.hasEnemyBehaviors);
check("dependency bag exposes enemy spawning", moduleGameDependenciesSnapshot.hasEnemySpawning);
check("dependency bag exposes input binder", moduleGameDependenciesSnapshot.hasInputBinder);
check("dependency bag exposes map factory", moduleGameDependenciesSnapshot.hasMapSystem);
check(
  "dependency bag map behavior matches module fixture",
  JSON.stringify(moduleGameDependenciesSnapshot.mapSnapshot) === JSON.stringify(moduleMapSnapshot)
);
check(
  "module and bridge dependency-bag map behavior matches",
  JSON.stringify(moduleGameDependenciesSnapshot.mapSnapshot) ===
    JSON.stringify(bridgeGameDependenciesSnapshot.mapSnapshot)
);
check("dependency bag exposes level-up choices", moduleGameDependenciesSnapshot.hasLevelUpChoices);
check("dependency bag exposes render skill rail", moduleGameDependenciesSnapshot.hasRenderSkillRail);
check("dependency bag exposes weapon behaviors", moduleGameDependenciesSnapshot.hasWeaponBehaviors);
check("dependency bag exposes weapon cooldowns", moduleGameDependenciesSnapshot.hasWeaponCooldowns);
check("dependency bag exposes weapon fire", moduleGameDependenciesSnapshot.hasWeaponFire);
check("dependency bag exposes weapon projectiles", moduleGameDependenciesSnapshot.hasWeaponProjectiles);
check("dependency bag exposes weapon targeting", moduleGameDependenciesSnapshot.hasWeaponTargeting);
check("dependency bag exposes save corruption", moduleGameDependenciesSnapshot.hasSaveCorruption);
check("dependency bag exposes native save defaults", moduleGameDependenciesSnapshot.hasSaveDefaults);
check(
  "dependency bag supplies current save version",
  moduleGameDependenciesSnapshot.saveDefaultsVersion === moduleCurrentSaveVersion
);
check(
  "dependency bag default save preserves starter quests",
  JSON.stringify(moduleGameDependenciesSnapshot.defaultSave.activeQuests) ===
    JSON.stringify(["daily_one", "daily_two"])
);
check(
  "module and bridge dependency-bag save defaults match",
  JSON.stringify(moduleGameDependenciesSnapshot.defaultSave) ===
    JSON.stringify(bridgeGameDependenciesSnapshot.defaultSave)
);
check("dependency bag exposes save migrations", moduleGameDependenciesSnapshot.hasSaveMigrations);
check("dependency bag exposes save normalize", moduleGameDependenciesSnapshot.hasSaveNormalize);
check("dependency bag exposes shell relic UI", moduleGameDependenciesSnapshot.hasShellRelicUi);
check("dependency bag exposes native game banner factory", moduleGameDependenciesSnapshot.hasGameBannerFactory);
check("dependency bag ignores poisoned game banner global", moduleGameDependenciesSnapshot.bannerGlobalReads === 0);
check("dependency bag exposes native Shop factory", moduleGameDependenciesSnapshot.hasNativeShopFactory);
check("dependency bag creates native Shop with preserved documentRef", moduleGameDependenciesSnapshot.hasNativeShop);
check("dependency bag exposes shop pricing", moduleGameDependenciesSnapshot.hasShopPricing);
check("dependency bag exposes UI progression", moduleGameDependenciesSnapshot.hasUiProgression);
check("dependency bag preserves optional debug balance", moduleGameDependenciesSnapshot.debugProfile === "testing");
check("dependency bag preserves optional upgrades fallback", moduleGameDependenciesSnapshot.emptyUpgradeKeys === 0);
check("dependency bag reports missing required dependency", moduleGameDependenciesSnapshot.missingError.includes("TapSurvivorAudio"));
check(
  "dependency bag reports missing input binder",
  moduleGameDependenciesSnapshot.missingInputError.includes("TapSurvivorInput.bindMovementInput")
);

check("module exports createPickupSystem", typeof createModulePickupSystem === "function");
check("bridge assigns globalThis.TapSurvivorPickups", Boolean(bridgePickups));
check("pickups bridge source has generated banner", hasGeneratedBanner(pickupsBridge.source));
check("bridge exposes createPickupSystem", typeof bridgePickups?.createPickupSystem === "function");

const modulePickupSnapshot = pickupSnapshot(createModulePickupSystem, Math);
const bridgePickupSnapshot = pickupSnapshot(bridgePickups.createPickupSystem, pickupsBridge.context.Math);
check(
  "module and bridge pickup output match",
  JSON.stringify(modulePickupSnapshot) === JSON.stringify(bridgePickupSnapshot)
);
check("pickup system exposes spawnLootDrops", modulePickupSnapshot.exposesSpawnLootDrops);
check("pickup system exposes updateXpDrops", modulePickupSnapshot.exposesUpdateXpDrops);
check("pickup system exposes updateLootDrops", modulePickupSnapshot.exposesUpdateLootDrops);
check("pickup system exposes updatePickupTexts", modulePickupSnapshot.exposesUpdatePickupTexts);
check("pickup boss drops coin and heart", modulePickupSnapshot.bossDrop.types === "coin,heart");
check("pickup boss drops use boss radii", modulePickupSnapshot.bossDrop.radii === "10,11");
check("pickup boss coin value scales by floor", modulePickupSnapshot.bossDrop.coinValue === 27);
check("pickup normal enemy deterministic coin drops", modulePickupSnapshot.normalDrop.types === "coin");
check("pickup normal enemy uses normal radius", modulePickupSnapshot.normalDrop.radii === "7");
check("pickup normal coin value scales by floor", modulePickupSnapshot.normalDrop.coinValue === 9);
check("pickup XP drops collect XP", modulePickupSnapshot.xp.collectXpValue === 5);
check("pickup XP drops add text", modulePickupSnapshot.xp.text === "+5 XP");
check("pickup XP drops are removed after collection", modulePickupSnapshot.xp.remainingDrops === 0);
check("pickup coin loot applies relic multiplier", modulePickupSnapshot.loot.coins === 25);
check(
  "pickup coin loot persists and renders meta",
  modulePickupSnapshot.loot.persist === 1 && modulePickupSnapshot.loot.renderMeta === 1
);
check("pickup heart loot heals without exceeding max", modulePickupSnapshot.loot.playerHp === 100);
check("pickup loot drops add pickup text", modulePickupSnapshot.loot.texts === "+15,+20 HP");
check("pickup loot drops are removed after collection", modulePickupSnapshot.loot.remainingDrops === 0);
check("pickup texts rise and expire", modulePickupSnapshot.texts.remaining === 1);
check("pickup texts update y position", modulePickupSnapshot.texts.firstY === 86);

check("module exports createCombatDamageSystem", typeof createModuleCombatDamageSystem === "function");
check(
  "combat damage bridge remains retired",
  bridgeCombatDamage === undefined && !combatDamageBridge.source.includes("globalThis.TapSurvivorCombatDamage")
);
check(
  "combat damage bridge source has generated banner",
  hasGeneratedBanner(combatDamageBridge.source)
);

const moduleCombatDamageSnapshot = combatDamageSnapshot(createModuleCombatDamageSystem, Math);
check("combat damage exposes damageEnemy", moduleCombatDamageSnapshot.exposesDamageEnemy);
check("combat damage exposes damagePlayer", moduleCombatDamageSnapshot.exposesDamagePlayer);
check("combat damage exposes reapEnemies", moduleCombatDamageSnapshot.exposesReapEnemies);
check("combat damage applies boss damage bonus", moduleCombatDamageSnapshot.enemy.bossHp === 5);
check("combat damage returns capped damage dealt", moduleCombatDamageSnapshot.enemy.dealt === 15);
check("combat damage records weapon damage", moduleCombatDamageSnapshot.enemy.weaponDamage === 15);
check("combat damage records damage quests", moduleCombatDamageSnapshot.enemy.damageQuestValue === 15);
check("combat damage records weapon quest progress", moduleCombatDamageSnapshot.enemy.weaponQuestValue === 15);
check("combat damage ignores invincible player", moduleCombatDamageSnapshot.player.invincibleDamage === 0);
check("combat damage dodge sets blink timer", moduleCombatDamageSnapshot.player.dodgeBlink === 0.35);
check("combat damage applies reduction", moduleCombatDamageSnapshot.player.reducedDamage === 15);
check("combat damage applies thorn damage", moduleCombatDamageSnapshot.player.thornEnemyHp === 6);
check("combat damage teleports player", moduleCombatDamageSnapshot.player.teleportX === 80);
check("combat damage sets blink invulnerability", moduleCombatDamageSnapshot.player.invincibleTimer === 1);
check("combat damage reaps dead enemies", moduleCombatDamageSnapshot.reap.remainingEnemies === 1);
check("combat damage increments kills", moduleCombatDamageSnapshot.reap.kills === 2);
check("combat damage creates XP drops", moduleCombatDamageSnapshot.reap.xpDrops === "7:3,12:8");
check("combat damage spawns loot drops", moduleCombatDamageSnapshot.reap.lootDrops === "normal,boss");
check("combat damage applies lifesteal", moduleCombatDamageSnapshot.reap.playerHp === 100);
check("combat damage applies kill explosion", moduleCombatDamageSnapshot.reap.aliveEnemyHp === 2);
check("combat damage records kill quests", moduleCombatDamageSnapshot.reap.killQuestValue === 2);
check("combat damage records boss quests", moduleCombatDamageSnapshot.reap.bossQuestValue === 1);
check("combat damage advances tower after boss", moduleCombatDamageSnapshot.reap.advanceTowerFloor === 1);
check("combat damage marks boss defeated", moduleCombatDamageSnapshot.reap.bossDefeated);

check("module exports createRunLifecycle", typeof createModuleRunLifecycle === "function");
check("bridge assigns globalThis.TapSurvivorRunLifecycle", Boolean(bridgeRunLifecycle));
check("run lifecycle bridge source has generated banner", hasGeneratedBanner(runLifecycleBridge.source));
check(
  "bridge exposes createRunLifecycle",
  typeof bridgeRunLifecycle?.createRunLifecycle === "function"
);

const moduleRunLifecycleSnapshot = runLifecycleSnapshot(createModuleRunLifecycle, globalThis);
const bridgeRunLifecycleSnapshot = runLifecycleSnapshot(
  bridgeRunLifecycle.createRunLifecycle,
  runLifecycleBridge.context
);
check(
  "module and bridge run lifecycle output match",
  JSON.stringify(moduleRunLifecycleSnapshot) === JSON.stringify(bridgeRunLifecycleSnapshot)
);
check("run lifecycle start closes start flow", moduleRunLifecycleSnapshot.start.closeStartFlow === 1);
check("run lifecycle start closes shop", moduleRunLifecycleSnapshot.start.closeShop === 1);
check("run lifecycle start hides end screen", moduleRunLifecycleSnapshot.start.hideEndScreen === 1);
check("run lifecycle start hides level-up UI", moduleRunLifecycleSnapshot.start.levelUpHidden);
check("run lifecycle start closes run menu", moduleRunLifecycleSnapshot.start.closeRunMenuArg === false);
check("run lifecycle start resets game state", moduleRunLifecycleSnapshot.start.resetGameState === 1);
check("run lifecycle start waits for first movement", moduleRunLifecycleSnapshot.start.awaitingFirstMoveInput);
check("run lifecycle start shows movement gate banner", moduleRunLifecycleSnapshot.start.showMovementGateBanner === 1);
check("run lifecycle end with no game is no-op", moduleRunLifecycleSnapshot.noGame.noOp);
check("run lifecycle end stops game", moduleRunLifecycleSnapshot.end.running === false);
check("run lifecycle end stores reason", moduleRunLifecycleSnapshot.end.endReason === "defeat");
check("run lifecycle end shows end screen", moduleRunLifecycleSnapshot.end.showEndScreenReason === "defeat");
check("run lifecycle end persists once", moduleRunLifecycleSnapshot.end.persist === 1);
check("run lifecycle end renders meta", moduleRunLifecycleSnapshot.end.renderMeta === 1);
check("run lifecycle boss clear opens relic choice", moduleRunLifecycleSnapshot.relic.choiceVisible);
check("run lifecycle relic click advances tower floor", moduleRunLifecycleSnapshot.relic.saveTowerFloor === 6);
check("run lifecycle relic click records floor clear", moduleRunLifecycleSnapshot.relic.lastFloorClearFloor === 5);
check("run lifecycle relic click updates HUD", moduleRunLifecycleSnapshot.relic.updateRunHud === 1);

check("module exports createRunStateSystem", typeof createModuleRunStateSystem === "function");
check("bridge assigns globalThis.TapSurvivorRunState", Boolean(bridgeRunState));
check("run state bridge source has generated banner", hasGeneratedBanner(runStateBridge.source));
check(
  "bridge exposes createRunStateSystem",
  typeof bridgeRunState?.createRunStateSystem === "function"
);

const moduleRunStateSnapshot = runStateSnapshot(createModuleRunStateSystem);
const bridgeRunStateSnapshot = runStateSnapshot(bridgeRunState.createRunStateSystem);
check(
  "module and bridge run state output match",
  JSON.stringify(moduleRunStateSnapshot) === JSON.stringify(bridgeRunStateSnapshot)
);
check("run state reset returns running run", moduleRunStateSnapshot.reset.running === true);
check("run state reset returns unpaused run", moduleRunStateSnapshot.reset.paused === false);
check("run state reset clears elapsed", moduleRunStateSnapshot.reset.elapsed === 0);
check("run state reset uses 150 second duration", moduleRunStateSnapshot.reset.duration === 150);
check("run state reset uses save tower floor", moduleRunStateSnapshot.reset.towerFloor === 7);
check("run state reset centers player x", moduleRunStateSnapshot.reset.playerX === 480);
check("run state reset centers player y", moduleRunStateSnapshot.reset.playerY === 270);
check("run state reset centers target x", moduleRunStateSnapshot.reset.targetX === 480);
check("run state reset centers target y", moduleRunStateSnapshot.reset.targetY === 270);
check("run state reset equips spark bolt", moduleRunStateSnapshot.reset.equippedWeapons.includes("spark_bolt"));
check("run state reset applies shop and meta speed", moduleRunStateSnapshot.reset.playerSpeed === 241);
check("run state reset applies shop and meta pickup radius", moduleRunStateSnapshot.reset.pickupRadius === 97);
check("run state reset applies shop and meta max hp", moduleRunStateSnapshot.reset.maxHp === 170);
check("run state reset calls map apply", moduleRunStateSnapshot.reset.mapApplied === 1);
check("run state reset initializes combat collections", moduleRunStateSnapshot.reset.emptyCollections);
check("run state reset initializes state maps", moduleRunStateSnapshot.reset.emptyStateMaps);
check("run state meta upgrades leave null game unchanged", moduleRunStateSnapshot.meta.nullSafe);
check("run state meta upgrades raise speed", moduleRunStateSnapshot.meta.speed === 257);
check("run state meta upgrades raise pickup radius", moduleRunStateSnapshot.meta.pickupRadius === 108);
check("run state meta upgrades raise max hp", moduleRunStateSnapshot.meta.maxHp === 180);
check("run state meta upgrades heal hp delta", moduleRunStateSnapshot.meta.hp === 120);

check("module exports createRunUi", typeof createModuleRunUi === "function");
check("bridge assigns globalThis.TapSurvivorRunUi", Boolean(bridgeRunUi));
check("run ui bridge source has generated banner", hasGeneratedBanner(runUiBridge.source));
check("bridge exposes createRunUi", typeof bridgeRunUi?.createRunUi === "function");

const moduleRunUiSnapshot = runUiSnapshot(createModuleRunUi);
const bridgeRunUiSnapshot = runUiSnapshot(bridgeRunUi.createRunUi);
check(
  "module and bridge run ui output match",
  JSON.stringify(moduleRunUiSnapshot) === JSON.stringify(bridgeRunUiSnapshot)
);
check("run ui exposes updateRunHud", moduleRunUiSnapshot.exposesUpdateRunHud);
check("run ui exposes showEndScreen", moduleRunUiSnapshot.exposesShowEndScreen);
check("run ui exposes hideEndScreen", moduleRunUiSnapshot.exposesHideEndScreen);
check("run ui no-game HUD includes start text", moduleRunUiSnapshot.noGame.includesStartText);
check("run ui no-game HUD includes speed", moduleRunUiSnapshot.noGame.includesSpeed);
check("run ui no-game HUD renders debug", moduleRunUiSnapshot.noGame.debugCalls === 1);
check("run ui game HUD includes formatted elapsed", moduleRunUiSnapshot.gameHud.includesTime);
check("run ui game HUD includes tower floor", moduleRunUiSnapshot.gameHud.includesFloor);
check("run ui game HUD includes speed", moduleRunUiSnapshot.gameHud.includesSpeed);
check("run ui game HUD includes player HP", moduleRunUiSnapshot.gameHud.includesHp);
check("run ui game HUD includes save coins", moduleRunUiSnapshot.gameHud.includesCoins);
check("run ui game HUD includes player level", moduleRunUiSnapshot.gameHud.includesLevel);
check("run ui game HUD includes kills", moduleRunUiSnapshot.gameHud.includesKills);
check("run ui game HUD includes laser damage", moduleRunUiSnapshot.gameHud.includesLaserDamage);
check("run ui game HUD includes weapon count", moduleRunUiSnapshot.gameHud.includesWeapons);
check("run ui game HUD includes boss HP", moduleRunUiSnapshot.gameHud.includesBossHp);
check("run ui game HUD includes cleared floor", moduleRunUiSnapshot.gameHud.includesFloorClear);
check("run ui game HUD renders debug", moduleRunUiSnapshot.gameHud.debugCalls === 2);
check("run ui end screen includes result", moduleRunUiSnapshot.endScreen.includesResult);
check("run ui end screen includes tower floor", moduleRunUiSnapshot.endScreen.includesFloor);
check("run ui end screen includes survived time", moduleRunUiSnapshot.endScreen.includesTime);
check("run ui end screen includes kills", moduleRunUiSnapshot.endScreen.includesKills);
check("run ui end screen includes level", moduleRunUiSnapshot.endScreen.includesLevel);
check("run ui end screen includes XP collected", moduleRunUiSnapshot.endScreen.includesXp);
check("run ui end screen includes banked coins", moduleRunUiSnapshot.endScreen.includesCoins);
check("run ui end screen includes laser damage", moduleRunUiSnapshot.endScreen.includesLaserDamage);
check("run ui end screen includes quest points", moduleRunUiSnapshot.endScreen.includesQuestPoints);
check("run ui showEndScreen opens end screen", moduleRunUiSnapshot.endScreen.opened);
check("run ui hideEndScreen hides end screen", moduleRunUiSnapshot.endScreen.hidden);

check("module exports createRunUpdater", typeof createModuleRunUpdater === "function");
check("bridge assigns globalThis.TapSurvivorRunUpdate", Boolean(bridgeRunUpdate));
check("run update bridge source has generated banner", hasGeneratedBanner(runUpdateBridge.source));
check("bridge exposes createRunUpdater", typeof bridgeRunUpdate?.createRunUpdater === "function");

const moduleRunUpdateSnapshot = runUpdateSnapshot(createModuleRunUpdater);
const bridgeRunUpdateSnapshot = runUpdateSnapshot(bridgeRunUpdate.createRunUpdater);
check(
  "module and bridge run update output match",
  JSON.stringify(moduleRunUpdateSnapshot) === JSON.stringify(bridgeRunUpdateSnapshot)
);
check("run updater exposes update", moduleRunUpdateSnapshot.exposesUpdate);
check("run updater exposes collectXp", moduleRunUpdateSnapshot.exposesCollectXp);
check("run update with no game is no-op", moduleRunUpdateSnapshot.noOps.noGame);
check("run update with stopped game is no-op", moduleRunUpdateSnapshot.noOps.stopped);
check("run update with paused game is no-op", moduleRunUpdateSnapshot.noOps.paused);
check("run update while awaiting movement is no-op", moduleRunUpdateSnapshot.noOps.awaiting);
check("run update increments elapsed", moduleRunUpdateSnapshot.active.elapsed === 10.1);
check("run update applies map system", moduleRunUpdateSnapshot.active.mapApplied === 1);
check("run update records survival quest dt", moduleRunUpdateSnapshot.active.survivalQuestValue === 0.2);
check("run update spawns boss at duration", moduleRunUpdateSnapshot.active.bossCalls === 1);
check("run update moves player toward target", moduleRunUpdateSnapshot.active.playerX === 30);
check("run update clamps player to canvas bounds", moduleRunUpdateSnapshot.active.playerY === 18);
check("run update marks player moving", moduleRunUpdateSnapshot.active.moving === true);
check("run update sets player facing", moduleRunUpdateSnapshot.active.facingX === 1);
check("run update keeps relic timers non-negative", moduleRunUpdateSnapshot.active.timersNonNegative);
check("run update clears expired action sprite", moduleRunUpdateSnapshot.active.actionSprite === "");
check("run update calls combat and pickup systems in order", moduleRunUpdateSnapshot.active.callOrderMatches);
check("run update ends defeated player run", moduleRunUpdateSnapshot.active.endReason === "Player defeated");
check("run update collectXp without player is no-op", moduleRunUpdateSnapshot.collect.noPlayerNoOp);
check("run update collectXp applies relic multiplier", moduleRunUpdateSnapshot.collect.playerXp === 2);
check("run update collectXp increments collected XP", moduleRunUpdateSnapshot.collect.xpCollected === 3);
check("run update collectXp records original XP quest value", moduleRunUpdateSnapshot.collect.xpQuestValue === 2);
check("run update collectXp levels player", moduleRunUpdateSnapshot.collect.level === 2);
check("run update collectXp increments level ups", moduleRunUpdateSnapshot.collect.levelUps === 1);
check("run update collectXp records level quest", moduleRunUpdateSnapshot.collect.levelQuestValue === 1);
check("run update collectXp shows level-up UI", moduleRunUpdateSnapshot.collect.showLevelUp === 1);
if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("\nModule bridge smoke passed.");

/**
 * @param {{
 *   canBuy(item: { id: string, cost: number | number[], maxTier: number }): boolean,
 *   costFor(item: { id: string, cost: number | number[], maxTier: number }, tier: number): number,
 *   tierFor(item: { id: string, cost: number | number[], maxTier: number }): number
 * }} pricing
 */
function pricingSnapshot(pricing) {
  return {
    bootsTier: pricing.tierFor(shopItemDefs[0]),
    bootsCost: pricing.costFor(shopItemDefs[0], 1),
    bootsCanBuy: pricing.canBuy(shopItemDefs[0]),
    orbTier: pricing.tierFor(shopItemDefs[1]),
    orbCost: pricing.costFor(shopItemDefs[1], 0),
    orbCanBuy: pricing.canBuy(shopItemDefs[1]),
  };
}

function createScalingFixture() {
  const tiers = new Map([
    ["attack_radius", 2],
    ["bolt_upgrade", 3],
    ["fire_rate", 2],
    ["flat_damage", 1],
    ["percent_damage", 2],
  ]);
  const runTiers = new Map([
    ["run_attack_radius", 1],
    ["run_fire_rate", 1],
    ["run_flat_damage", 2],
    ["run_percent_damage", 1],
    ["run_projectile_focus", 2],
    ["run_projectile_scale", 1],
  ]);
  return {
    content: { runUpgrades },
    weaponDefs: {
      bolt: {
        id: "bolt",
        kind: "projectile",
        cooldown: 1.2,
        damage: 14,
        range: 90,
        radius: 8,
        upgradeId: "bolt_upgrade",
        width: 18,
      },
    },
    getUpgradeTier: (id) => tiers.get(id) || 0,
    getRunUpgradeTier: (id) => runTiers.get(id) || 0,
    getShopBonuses: () => ({
      attackRadius: 1,
      fireRate: 1,
      flatDamage: 2,
      percentDamage: 1,
    }),
    getRelicSpecialEffects: () => ({
      areaRadiusBonus: 0.1,
      beamWidthBonus: 0.05,
      cooldownReduction: 0.08,
      damageBonus: 0.2,
      projectileSizeBonus: 0.15,
    }),
    getWeaponDamageMultiplier: () => 1.25,
    clamp: moduleClamp,
  };
}

function createFallbackScalingFixture() {
  return {
    weaponDefs: {
      bolt: {
        id: "bolt",
        kind: "projectile",
        cooldown: 1.2,
        damage: 14,
        range: 90,
        radius: 8,
        upgradeId: "bolt_upgrade",
        width: 18,
      },
    },
    getUpgradeTier: () => 0,
    getRunUpgradeTier: () => 0,
    clamp: moduleClamp,
  };
}

function scalingSnapshot(scaling, weapon) {
  return {
    projectileRadius: scaling.projectileRadius(weapon),
    projectileSkillModifier: scaling.projectileSkillModifier(
      weapon,
      "projectileDamageMultiplier"
    ),
    weaponCooldown: scaling.weaponCooldown(weapon),
    weaponDamage: scaling.weaponDamage(weapon.id),
    weaponReach: scaling.weaponReach(weapon),
    weaponSfxOptions: scaling.weaponSfxOptions(weapon),
    weaponWidth: scaling.weaponWidth(weapon),
  };
}

function runProjectileFireFixture(createWeaponProjectileSystem) {
  const fixture = createProjectileFixture();
  const system = createWeaponProjectileSystem(fixture.options);
  system.fireProjectile("bolt");
  const bolt = fixture.game.bolts[0];
  return {
    boltCount: fixture.game.bolts.length,
    x: bolt?.x,
    y: bolt?.y,
    vx: rounded(bolt?.vx),
    vy: rounded(bolt?.vy),
    radius: bolt?.radius,
    damage: bolt?.damage,
    life: bolt?.life,
    pierce: bolt?.pierce,
    bounces: bolt?.bounces,
    color: bolt?.color,
  };
}

function runNoTargetProjectileFixture(createWeaponProjectileSystem) {
  const fixture = createProjectileFixture({ nearestEnemy: () => null });
  const system = createWeaponProjectileSystem(fixture.options);
  system.fireProjectile("bolt");
  return {
    boltCount: fixture.game.bolts.length,
  };
}

function runSplitDoubleProjectileFixture(createWeaponProjectileSystem) {
  const fixture = createProjectileFixture({
    getRunUpgradeTier: (id) => (id === "run_split_shot" ? 1 : 0),
    getRelicSpecialEffects: () => ({ doubleShotCount: 1 }),
  });
  const system = createWeaponProjectileSystem(fixture.options);
  system.fireProjectile("bolt");
  return {
    boltCount: fixture.game.bolts.length,
  };
}

function runWallBounceFixture(createWeaponProjectileSystem) {
  const fixture = createProjectileFixture({
    getRunUpgradeTier: (id) => (id === "run_wall_bounce" ? 1 : 0),
  });
  const system = createWeaponProjectileSystem(fixture.options);
  system.spawnProjectileBolt("bolt", 4, 20, -10, 0);
  system.updateBolts(0.1);
  const bolt = fixture.game.bolts[0];
  return {
    x: bolt?.x,
    vx: bolt?.vx,
    bounces: bolt?.bounces,
    reapCount: fixture.reapCount(),
  };
}

function runCollisionFixture(createWeaponProjectileSystem) {
  const enemy = { id: "enemy", x: 4, y: 0, radius: 5, hp: 10 };
  const fixture = createProjectileFixture({
    enemies: [enemy],
  });
  const system = createWeaponProjectileSystem(fixture.options);
  system.spawnProjectileBolt("bolt", 0, 0, 0, 0);
  system.updateBolts(0);
  return {
    damageCalls: fixture.damageCalls,
    reapCount: fixture.reapCount(),
    remainingBolts: fixture.game.bolts.length,
  };
}

function gameRuntimeDependencyErrors(createGameRuntimeController) {
  const { controllerOptions: baseOptions } = createGameRuntimeOptions();
  const { bindMovementInput, ...missingOptions } = baseOptions;
  let missing = "";
  let invalid = "";
  try {
    createGameRuntimeController(missingOptions);
  } catch (error) {
    missing = error.message;
  }
  try {
    createGameRuntimeController({
      ...baseOptions,
      bindMovementInput: "not-a-function",
    });
  } catch (error) {
    invalid = error.message;
  }
  return { missing, invalid };
}

function createGameRuntimeOptions(overrides = {}) {
  const calls = {
    debugBind: 0,
    movementBinds: 0,
    persist: 0,
    raf: 0,
    shellBind: 0,
    spriteLoads: 0,
  };
  const listeners = new Map();
  const documentListeners = new Map();
  const buttons = [1, 2, 5].map((speed) => ({
    dataset: { speed: String(speed) },
    classList: {
      active: false,
      toggle(name, force) {
        if (name === "active") this.active = Boolean(force);
      },
    },
    pressed: "",
    setAttribute(name, value) {
      if (name === "aria-pressed") this.pressed = value;
    },
  }));
  const canvas = {
    width: 960,
    height: 540,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 960, height: 540 };
    },
  };
  const documentRef = {
    body: { dataset: {} },
    visibilityState: "visible",
    addEventListener(type, handler) {
      documentListeners.set(type, handler);
    },
  };
  const globalRef = {
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    requestAnimationFrame(callback) {
      calls.raf += 1;
      calls.loop = callback;
    },
  };
  let game = {
    awaitingFirstMoveInput: true,
    paused: false,
    player: { targetX: 0, targetY: 0 },
    running: true,
  };
  let save = { coins: 0 };

  return {
    buttons,
    calls,
    controllerOptions: {
      canvas,
      ui: {
        levelUp: { classList: { add() {} } },
        speedButtons: buttons,
      },
      documentRef,
      globalRef,
      getGame: () => game,
      setGame: (nextGame) => {
        game = nextGame;
      },
      getSave: () => save,
      setSave: (nextSave) => {
        save = nextSave;
      },
      saveSystem: {
        defaultSave: () => ({ coins: 0 }),
        loadSave: () => ({ coins: 7 }),
        removeSave: () => true,
      },
      shellUi: {
        bind: () => {
          calls.shellBind += 1;
        },
        closeRunMenu() {},
        showTitleScreen() {},
      },
      shopSystem: {
        closeShop() {},
      },
      runUi: {
        hideEndScreen() {},
        updateRunHud() {},
      },
      debugSystem: {
        bind: () => {
          calls.debugBind += 1;
        },
      },
      spriteSystem: {
        loadSprites: () => {
          calls.spriteLoads += 1;
        },
      },
      bannerSystem: {
        hideMovementGateBanner() {},
      },
      bindMovementInput({ canvas: inputCanvas, getGame: inputGetGame }) {
        calls.movementBinds += 1;
        calls.movementCanvasWidth = inputCanvas.width;
        calls.movementGetGameRunning = inputGetGame()?.running === true;
      },
      persist: () => {
        calls.persist += 1;
      },
      renderMeta() {},
      loop() {},
      ...overrides,
    },
    documentRef,
    documentListeners,
    getGameState: () => game,
    getSaveState: () => save,
  };
}

function gameRuntimeSnapshot(createGameRuntimeController) {
  const { buttons, calls, controllerOptions, documentRef, documentListeners, getGameState, getSaveState } =
    createGameRuntimeOptions();

  const controller = createGameRuntimeController(controllerOptions);

  controller.initializeRuntime();
  const initialSpeed = controller.getGameSpeed();
  const loadedSaveCoins = getSaveState().coins;
  controller.setGameSpeed(5);
  const speedAfterSet = controller.getGameSpeed();
  controller.setGameSpeed(3);
  const speedAfterInvalid = controller.getGameSpeed();
  documentRef.visibilityState = "hidden";
  documentListeners.get("visibilitychange")?.();
  controller.resetSave();

  return {
    activeButtons: buttons.map((button) => button.classList.active),
    debugBind: calls.debugBind,
    gameAfterReset: getGameState(),
    initialSpeed,
    movementBinds: calls.movementBinds,
    movementCanvasWidth: calls.movementCanvasWidth,
    movementGetGameRunning: calls.movementGetGameRunning,
    persistCount: calls.persist,
    rafCount: calls.raf,
    saveCoins: loadedSaveCoins,
    shellBind: calls.shellBind,
    speedAfterInvalid,
    speedAfterSet,
    spriteLoads: calls.spriteLoads,
  };
}

function gameDependenciesSnapshot(createGameDependencyBag) {
  const requiredNames = [
    "TapSurvivorAudio",
    "TapSurvivorAssets",
    "TapSurvivorBalance",
    "TapSurvivorCombat",
    "TapSurvivorCombatDamage",
    "TapSurvivorEnemies",
    "TapSurvivorEnemyBehaviors",
    "TapSurvivorEnemySpawning",
    "TapSurvivorContentRegistry",
    "TapSurvivorDebug",
    "TapSurvivorEffects",
    "TapSurvivorGameRuntime",
    "TapSurvivorLevelUp",
    "TapSurvivorLevelUpChoices",
    "TapSurvivorMath",
    "TapSurvivorPickups",
    "TapSurvivorProgression",
    "TapSurvivorQuests",
    "TapSurvivorRelics",
    "TapSurvivorRenderEnemies",
    "TapSurvivorRenderHud",
    "TapSurvivorRenderSkillRail",
    "TapSurvivorRendering",
    "TapSurvivorRunLifecycle",
    "TapSurvivorRunState",
    "TapSurvivorRunUi",
    "TapSurvivorRunUpdate",
    "TapSurvivorSave",
    "TapSurvivorSaveCorruption",
    "TapSurvivorSaveMigrations",
    "TapSurvivorSaveNormalize",
    "TapSurvivorShellRelicUi",
    "TapSurvivorShellUi",
    "TapSurvivorShopPricing",
    "TapSurvivorSprites",
    "TapSurvivorStorage",
    "TapSurvivorUi",
    "TapSurvivorUiProgression",
    "TapSurvivorWeaponBehaviors",
    "TapSurvivorWeaponFire",
    "TapSurvivorWeaponProjectiles",
    "TapSurvivorWeaponTargeting",
  ];
  const baseGlobalRef = Object.fromEntries(requiredNames.map((name) => [name, { name }]));
  const retiredGlobalNames = [
    "TapSurvivorBalance",
    "TapSurvivorCombatDamage",
    "TapSurvivorContentRegistry",
    "TapSurvivorLevelUpChoices",
    "TapSurvivorMath",
    "TapSurvivorMapSystem",
    "TapSurvivorSaveDefaults",
    "TapSurvivorShopPricing",
    "TapSurvivorWeaponTargeting",
  ];
  const retiredGlobalReads = Object.fromEntries(retiredGlobalNames.map((name) => [name, 0]));
  const globalRef = baseGlobalRef;
  const documentRef = { createElement() {} };
  globalRef.document = documentRef;
  globalRef.TapSurvivorBalanceRuntime = {
    content: () => ({ id: "override" }),
  };
  globalRef.TapSurvivorContent = { id: "fallback" };
  globalRef.TapSurvivorDebugBalance = {
    getActiveProfile: () => "testing",
  };
  function bindMovementInput() {}
  globalRef.TapSurvivorInput = {
    bindMovementInput,
  };
  let bannerGlobalReads = 0;
  Object.defineProperty(globalRef, "TapSurvivorGameBanners", {
    configurable: true,
    get() {
      bannerGlobalReads += 1;
      throw new Error("Forbidden TapSurvivorGameBanners global read");
    },
  });
  const poisonedGlobalRef = { ...globalRef };
  for (const name of retiredGlobalNames) {
    Object.defineProperty(poisonedGlobalRef, name, {
      configurable: true,
      get() {
        retiredGlobalReads[name] += 1;
        throw new Error(`Forbidden ${name} global read`);
      },
    });
  }
  const bag = createGameDependencyBag({ globalRef: poisonedGlobalRef, documentRef });
  const shop = bag.shop.createShopSystem({
    effects: {
      addShopItemBonus() {},
      applyShopItemEffectToRun() {},
      emptyShopBonuses: () => ({}),
    },
    getGame: () => ({}),
    getSave: () => ({ coins: 0, shopPurchases: {} }),
    persist() {},
    renderMeta() {},
    shopItemDefs: [],
    shopPricing: { createShopPricing: () => ({}) },
    ui: {},
  });

  const fallbackGlobalRef = { ...baseGlobalRef };
  delete fallbackGlobalRef.TapSurvivorBalanceRuntime;
  delete fallbackGlobalRef.TapSurvivorUpgrades;
  const fallbackBag = createGameDependencyBag({ globalRef: fallbackGlobalRef });

  const missingGlobalRef = { ...baseGlobalRef };
  delete missingGlobalRef.TapSurvivorAudio;
  let missingError = "";
  try {
    createGameDependencyBag({ globalRef: missingGlobalRef });
  } catch (error) {
    missingError = error.message;
  }

  const missingInputGlobalRef = { ...baseGlobalRef };
  delete missingInputGlobalRef.TapSurvivorInput;
  let missingInputError = "";
  try {
    createGameDependencyBag({ globalRef: missingInputGlobalRef });
  } catch (error) {
    missingInputError = error.message;
  }

  return {
    contentId: bag.content.id,
    debugProfile: bag.debugBalance.getActiveProfile(),
    emptyUpgradeKeys: Object.keys(fallbackBag.upgrades).length,
    fallbackContentId: fallbackBag.content.id,
    hasAssets: bag.assets.name === "TapSurvivorAssets",
    hasContentRegistry: typeof bag.contentRegistry.createContentRegistry === "function",
    hasBalance: typeof bag.balance.floorDifficulty === "function",
    hasCombatDamage: typeof bag.combatDamage.createCombatDamageSystem === "function",
    hasEnemies: bag.enemies.name === "TapSurvivorEnemies",
    hasEnemyBehaviors: bag.enemyBehaviors.name === "TapSurvivorEnemyBehaviors",
    hasEnemySpawning: bag.enemySpawning.name === "TapSurvivorEnemySpawning",
    hasMapSystem: typeof bag.mapSystem?.createMapSystem === "function",
    mapSnapshot: mapSystemSnapshot(bag.mapSystem.createMapSystem(createMapFixture())),
    hasLevelUpChoices:
      typeof bag.levelUpChoices.choiceId === "function" &&
      typeof bag.levelUpChoices.shopFocusBonus === "function" &&
      typeof bag.levelUpChoices.shuffleChoices === "function" &&
      typeof bag.levelUpChoices.weightedChoices === "function",
    hasMath:
      typeof bag.math.clamp === "function" &&
      typeof bag.math.distance === "function" &&
      typeof bag.math.formatTime === "function" &&
      typeof bag.math.randomRange === "function",
    hasRenderSkillRail: bag.renderSkillRail.name === "TapSurvivorRenderSkillRail",
    hasWeaponCooldowns: typeof bag.weaponCooldowns.createWeaponScaling === "function",
    hasWeaponFire: bag.weaponFire.name === "TapSurvivorWeaponFire",
    hasWeaponProjectiles: bag.weaponProjectiles.name === "TapSurvivorWeaponProjectiles",
    hasWeaponTargeting: typeof bag.weaponTargeting.nearestEnemy === "function",
    hasSaveCorruption: bag.saveCorruption.name === "TapSurvivorSaveCorruption",
    hasSaveDefaults:
      bag.saveDefaults.CURRENT_SAVE_VERSION === moduleCurrentSaveVersion &&
      typeof bag.saveDefaults.createDefaultSave === "function",
    saveDefaultsVersion: bag.saveDefaults.CURRENT_SAVE_VERSION,
    defaultSave: bag.saveDefaults.createDefaultSave({ starterQuestIds: ["daily_one", "daily_two"] }),
    hasSaveMigrations: bag.saveMigrations.name === "TapSurvivorSaveMigrations",
    hasSaveNormalize: bag.saveNormalize.name === "TapSurvivorSaveNormalize",
    hasShellRelicUi: bag.shellRelicUi.name === "TapSurvivorShellRelicUi",
    bannerGlobalReads,
    hasGameBannerFactory: typeof bag.gameBanners?.createGameBannerSystem === "function",
    hasNativeShopFactory: typeof bag.shop.createShopSystem === "function",
    hasNativeShop: Boolean(shop),
    hasShopPricing: typeof bag.shopPricing.createShopPricing === "function",
    hasUiProgression: bag.uiProgression.name === "TapSurvivorUiProgression",
    hasWeaponBehaviors: bag.weaponBehaviors.name === "TapSurvivorWeaponBehaviors",
    hasInputBinder: bag.input.bindMovementInput === bindMovementInput,
    missingError,
    missingInputError,
    retiredGlobalReads,
  };
}

function pickupSnapshot(createPickupSystem, mathRef) {
  const save = { coins: 10 };
  let game = createPickupGame();
  let persistCount = 0;
  let renderMetaCount = 0;
  const collectedXp = [];
  const system = createPickupSystem({
    getGame: () => game,
    getSave: () => save,
    lootConfig: {
      bossCoinBaseValue: 18,
      coinFloorRewardRate: 0.125,
      normalCoinBaseValue: 6,
    },
    getRelicSpecialEffects: () => ({ coinMultiplier: 0.5 }),
    persist() {
      persistCount += 1;
    },
    renderMeta() {
      renderMetaCount += 1;
    },
    collectXp(value) {
      collectedXp.push(value);
    },
    distance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
    randomRange: () => 0,
  });

  game = createPickupGame();
  system.spawnLootDrops({ boss: true, x: 30, y: 40 });
  const bossDrop = dropSummary(game.lootDrops);

  game = createPickupGame();
  withPickupRandomSequence(mathRef, [0.1, 0.5], () => {
    system.spawnLootDrops({ boss: false, x: 30, y: 40 });
  });
  const normalDrop = dropSummary(game.lootDrops);

  game = createPickupGame();
  game.xpDrops = [{ radius: 3, value: 5, x: 0, y: 0 }];
  system.updateXpDrops(0.1);
  const xp = {
    collectXpValue: collectedXp[0],
    remainingDrops: game.xpDrops.length,
    text: game.pickupTexts[0]?.text,
  };

  game = createPickupGame();
  game.lootDrops = [
    { radius: 3, type: "coin", value: 10, x: 0, y: 0 },
    { healPercent: 0.2, radius: 3, type: "heart", x: 0, y: 0 },
  ];
  system.updateLootDrops(0.1);
  const loot = {
    coins: save.coins,
    persist: persistCount,
    playerHp: game.player.hp,
    remainingDrops: game.lootDrops.length,
    renderMeta: renderMetaCount,
    texts: game.pickupTexts.map((text) => text.text).join(","),
  };

  game = createPickupGame();
  game.pickupTexts = [
    { life: 0.6, maxLife: 0.85, text: "keep", x: 0, y: 100 },
    { life: 0.1, maxLife: 0.85, text: "expire", x: 0, y: 60 },
  ];
  system.updatePickupTexts(0.5);
  const texts = {
    firstY: game.pickupTexts[0]?.y,
    remaining: game.pickupTexts.length,
  };

  return {
    bossDrop,
    exposesSpawnLootDrops: typeof system.spawnLootDrops === "function",
    exposesUpdateLootDrops: typeof system.updateLootDrops === "function",
    exposesUpdatePickupTexts: typeof system.updatePickupTexts === "function",
    exposesUpdateXpDrops: typeof system.updateXpDrops === "function",
    loot,
    normalDrop,
    texts,
    xp,
  };
}

function createPickupGame() {
  return {
    lootDrops: [],
    pickupTexts: [],
    player: {
      hp: 90,
      maxHp: 100,
      pickupRadius: 100,
      radius: 10,
      x: 0,
      y: 0,
    },
    towerFloor: 5,
    xpDrops: [],
  };
}

function dropSummary(drops) {
  return {
    coinValue: drops.find((drop) => drop.type === "coin")?.value,
    radii: drops.map((drop) => drop.radius).join(","),
    types: drops.map((drop) => drop.type).join(","),
  };
}

function withPickupRandomSequence(mathRef, values, callback) {
  const previousRandom = mathRef.random;
  let index = 0;
  mathRef.random = () => values[index++] ?? values[values.length - 1];
  try {
    callback();
  } finally {
    mathRef.random = previousRandom;
  }
}

function combatDamageSnapshot(createCombatDamageSystem, mathRef) {
  let effects = {};
  let game = createCombatDamageGame();
  const questGroupCalls = [];
  const weaponQuestCalls = [];
  const lootDrops = [];
  let advanceTowerFloorCalls = 0;
  const system = createCombatDamageSystem({
    canvas: { height: 100, width: 100 },
    getGame: () => game,
    getRelicSpecialEffects: () => effects,
    addQuestProgressForWeapon(weaponId, value) {
      weaponQuestCalls.push({ value, weaponId });
    },
    addQuestProgressGroup(ids, value) {
      questGroupCalls.push({ ids, value });
    },
    killQuestIds: ["kill"],
    damageQuestIds: ["damage"],
    bossQuestIds: ["boss"],
    spawnLootDrops(enemy) {
      lootDrops.push(enemy.boss ? "boss" : "normal");
    },
    advanceTowerFloor() {
      advanceTowerFloorCalls += 1;
    },
    distance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  });

  effects = { bossDamageBonus: 0.5 };
  const boss = { boss: true, hp: 20 };
  const dealt = system.damageEnemy(boss, 10, "laser");
  const enemy = {
    bossHp: boss.hp,
    damageQuestValue: questGroupCalls.find((call) => call.ids[0] === "damage")?.value,
    dealt,
    weaponDamage: game.weaponDamage.laser,
    weaponQuestValue: weaponQuestCalls.find((call) => call.weaponId === "laser")?.value,
  };

  game = createCombatDamageGame();
  effects = {};
  game.player.invincibleTimer = 1;
  const invincibleDamage = system.damagePlayer(10);

  game = createCombatDamageGame();
  effects = { dodgeChance: 1 };
  withCombatRandomSequence(mathRef, [0], () => {
    system.damagePlayer(10);
  });
  const dodgeBlink = game.player.blinkTimer;

  game = createCombatDamageGame();
  const thornEnemy = { hp: 10 };
  effects = {
    blinkInvulnerabilitySeconds: 1,
    damageReduction: 0.25,
    teleportDistance: 30,
    teleportOnHitCooldown: 2,
    thornDamage: 4,
  };
  const reducedDamage = withCombatRandomSequence(mathRef, [0.6, 0.4], () =>
    system.damagePlayer(20, { enemy: thornEnemy })
  );
  const player = {
    dodgeBlink,
    invincibleDamage,
    invincibleTimer: game.player.invincibleTimer,
    reducedDamage,
    teleportX: game.player.x,
    thornEnemyHp: thornEnemy.hp,
  };

  game = createCombatDamageGame();
  const normalDead = { boss: false, hp: 0, radius: 5, x: 0, xp: 3, y: 0 };
  const aliveEnemy = { boss: false, hp: 10, radius: 5, x: 5, xp: 2, y: 0 };
  const bossDead = { boss: true, hp: 0, radius: 8, x: 20, xp: 8, y: 0 };
  game.enemies = [normalDead, aliveEnemy, bossDead];
  effects = {
    killExplosionDamage: 4,
    killExplosionRadius: 10,
    lifestealOnKill: 0.2,
  };
  questGroupCalls.length = 0;
  lootDrops.length = 0;
  advanceTowerFloorCalls = 0;
  system.reapEnemies();
  const reap = {
    advanceTowerFloor: advanceTowerFloorCalls,
    aliveEnemyHp: game.enemies[0]?.hp,
    bossDefeated: game.bossDefeated,
    bossQuestValue: questGroupCalls.filter((call) => call.ids[0] === "boss").length,
    killQuestValue: questGroupCalls
      .filter((call) => call.ids[0] === "kill")
      .reduce((total, call) => total + call.value, 0),
    kills: game.kills,
    lootDrops: lootDrops.join(","),
    playerHp: game.player.hp,
    remainingEnemies: game.enemies.length,
    xpDrops: game.xpDrops.map((drop) => `${drop.radius}:${drop.value}`).join(","),
  };

  return {
    enemy,
    exposesDamageEnemy: typeof system.damageEnemy === "function",
    exposesDamagePlayer: typeof system.damagePlayer === "function",
    exposesReapEnemies: typeof system.reapEnemies === "function",
    player,
    reap,
  };
}

function createCombatDamageGame() {
  return {
    bossDefeated: false,
    enemies: [],
    kills: 0,
    player: {
      blinkTimer: 0,
      hp: 100,
      invincibleTimer: 0,
      maxHp: 100,
      radius: 10,
      targetX: 50,
      targetY: 50,
      teleportCooldown: 0,
      x: 50,
      y: 50,
    },
    weaponDamage: {},
    xpDrops: [],
  };
}

function withCombatRandomSequence(mathRef, values, callback) {
  const previousRandom = mathRef.random;
  let index = 0;
  mathRef.random = () => values[index++] ?? values[values.length - 1];
  try {
    return callback();
  } finally {
    mathRef.random = previousRandom;
  }
}

function runLifecycleSnapshot(createRunLifecycle, runtimeGlobal) {
  const previousDocument = Reflect.get(runtimeGlobal, "document");
  const hadDocument = Reflect.has(runtimeGlobal, "document");
  const calls = {
    closeRunMenu: [],
    closeShop: 0,
    closeStartFlow: 0,
    hideEndScreen: 0,
    levelUpHidden: false,
    persist: 0,
    relicChoiceHidden: false,
    relicChoiceVisible: false,
    renderMeta: 0,
    resetGameState: 0,
    showEndScreen: [],
    showMovementGateBanner: 0,
    updateRunHud: 0,
  };
  const clickedButtons = [];
  const documentRef = {
    createElement(tagName) {
      const listeners = new Map();
      const button = {
        tagName,
        className: "",
        innerHTML: "",
        style: {
          values: {},
          setProperty(name, value) {
            this.values[name] = value;
          },
        },
        addEventListener(type, handler) {
          listeners.set(type, handler);
        },
        click() {
          listeners.get("click")?.();
        },
      };
      clickedButtons.push(button);
      return button;
    },
  };
  Reflect.set(runtimeGlobal, "document", documentRef);

  function createFixture(initialGame) {
    let game = initialGame;
    const save = { towerFloor: 5 };
    const resetGames = [];
    const ui = {
      levelUp: {
        classList: {
          add(name) {
            if (name === "hidden") calls.levelUpHidden = true;
          },
        },
      },
      relicChoice: {
        classList: {
          add(name) {
            if (name === "hidden") calls.relicChoiceHidden = true;
          },
          remove(name) {
            if (name === "hidden") calls.relicChoiceVisible = true;
          },
        },
      },
      relicChoiceText: { textContent: "" },
      relicChoiceTitle: { textContent: "" },
      relicChoices: {
        children: [],
        innerHTML: "stale",
        appendChild(button) {
          this.children.push(button);
        },
      },
    };
    const controller = createRunLifecycle({
      ui,
      getGame: () => game,
      getSave: () => save,
      resetGameState: () => {
        calls.resetGameState += 1;
        game = {
          awaitingFirstMoveInput: false,
          lastFloorClear: null,
          paused: false,
          player: { equippedWeapons: ["spark_bolt"] },
          running: true,
          towerFloor: 5,
        };
        resetGames.push(game);
        return game;
      },
      shopSystem: {
        closeShop() {
          calls.closeShop += 1;
        },
      },
      shellUi: {
        closeRunMenu(value) {
          calls.closeRunMenu.push(value);
        },
        closeStartFlow() {
          calls.closeStartFlow += 1;
        },
      },
      runUi: {
        hideEndScreen() {
          calls.hideEndScreen += 1;
        },
        showEndScreen(reason) {
          calls.showEndScreen.push(reason);
        },
      },
      relicSystem: {
        relicChoices() {
          return [
            {
              backgroundColor: "#193c2b",
              description: "Adds a test relic.",
              iconPath: "test-relic.png",
              name: "Test Relic",
              rarity: "green",
              specialAbility: {
                description: "Test special.",
                label: "Special",
              },
            },
          ];
        },
        grantRelic() {
          return { name: "Test Relic" };
        },
      },
      persist() {
        calls.persist += 1;
      },
      renderMeta() {
        calls.renderMeta += 1;
      },
      updateRunHud() {
        calls.updateRunHud += 1;
      },
      showMovementGateBanner() {
        calls.showMovementGateBanner += 1;
      },
    });
    return { controller, getGame: () => game, resetGames, save, ui };
  }

  const startFixture = createFixture({
    awaitingFirstMoveInput: false,
    paused: false,
    player: { equippedWeapons: ["spark_bolt"] },
    running: false,
    towerFloor: 5,
  });
  startFixture.controller.startRun();
  const startedGame = startFixture.getGame();
  const startSnapshot = {
    awaitingFirstMoveInput: startedGame.awaitingFirstMoveInput,
    closeRunMenuArg: calls.closeRunMenu.at(-1),
    closeShop: calls.closeShop,
    closeStartFlow: calls.closeStartFlow,
    hideEndScreen: calls.hideEndScreen,
    levelUpHidden: calls.levelUpHidden,
    resetGameState: calls.resetGameState,
    showMovementGateBanner: calls.showMovementGateBanner,
  };

  const noGameCallStart = {
    persist: calls.persist,
    renderMeta: calls.renderMeta,
    showEndScreen: calls.showEndScreen.length,
  };
  createFixture(null).controller.endRun("timeout");
  const noGameSnapshot = {
    noOp:
      calls.persist === noGameCallStart.persist &&
      calls.renderMeta === noGameCallStart.renderMeta &&
      calls.showEndScreen.length === noGameCallStart.showEndScreen,
  };

  const endFixture = createFixture({
    player: { equippedWeapons: ["spark_bolt"] },
    running: true,
    towerFloor: 5,
  });
  const persistBeforeEnd = calls.persist;
  const renderMetaBeforeEnd = calls.renderMeta;
  endFixture.controller.endRun("defeat");
  const endedGame = endFixture.getGame();
  const endSnapshot = {
    endReason: endedGame.endReason,
    persist: calls.persist - persistBeforeEnd,
    renderMeta: calls.renderMeta - renderMetaBeforeEnd,
    running: endedGame.running,
    showEndScreenReason: calls.showEndScreen.at(-1),
  };

  const relicFixture = createFixture({
    paused: false,
    player: { equippedWeapons: ["spark_bolt"] },
    running: true,
    towerFloor: 5,
  });
  const updateBeforeRelic = calls.updateRunHud;
  relicFixture.controller.advanceTowerFloor();
  const choiceVisible = calls.relicChoiceVisible && relicFixture.ui.relicChoices.children.length === 1;
  relicFixture.ui.relicChoices.children[0]?.click();
  relicFixture.ui.relicChoices.children[1]?.click();
  const relicGame = relicFixture.getGame();
  const relicSnapshot = {
    choiceVisible,
    lastFloorClearFloor: relicGame.lastFloorClear?.floor,
    saveTowerFloor: relicFixture.save.towerFloor,
    updateRunHud: calls.updateRunHud - updateBeforeRelic,
  };

  if (hadDocument) {
    Reflect.set(runtimeGlobal, "document", previousDocument);
  } else {
    Reflect.deleteProperty(runtimeGlobal, "document");
  }

  return {
    end: endSnapshot,
    noGame: noGameSnapshot,
    relic: relicSnapshot,
    start: startSnapshot,
  };
}

function runStateSnapshot(createRunStateSystem) {
  const calls = {
    mapApplied: 0,
  };
  const tiers = {
    max_hp: 2,
    move_speed: 1,
    pickup_radius: 2,
  };
  const system = createRunStateSystem({
    canvas: { width: 960, height: 540 },
    mapSystem: {
      applyToGame(run) {
        calls.mapApplied += 1;
        run.mapApplied = true;
      },
    },
    getSave: () => ({ towerFloor: 7 }),
    getShopBonuses: () => ({
      maxHp: 30,
      pickupRadius: 7,
      speed: 32,
    }),
    getUpgradeTier: (id) => tiers[id] || 0,
    maxEquippedWeapons: () => 4,
  });
  const run = system.resetGameState();
  const resetSnapshot = {
    duration: run.duration,
    elapsed: run.elapsed,
    emptyCollections: [
      run.enemies,
      run.xpDrops,
      run.lootDrops,
      run.pickupTexts,
      run.bolts,
      run.enemyBolts,
      run.beams,
      run.areas,
      run.weaponBursts,
      run.bossAttacks,
    ].every((collection) => Array.isArray(collection) && collection.length === 0),
    emptyStateMaps: [run.weaponTimers, run.runUpgradeTiers, run.weaponDamage].every(
      (value) => value && !Array.isArray(value) && Object.keys(value).length === 0
    ),
    equippedWeapons: run.player.equippedWeapons,
    mapApplied: calls.mapApplied,
    maxHp: run.player.maxHp,
    paused: run.paused,
    pickupRadius: run.player.pickupRadius,
    playerSpeed: run.player.speed,
    playerX: run.player.x,
    playerY: run.player.y,
    running: run.running,
    targetX: run.player.targetX,
    targetY: run.player.targetY,
    towerFloor: run.towerFloor,
  };

  system.applyRunMetaUpgrades(null);
  const metaGame = {
    player: {
      hp: 60,
      maxHp: 120,
      pickupRadius: 40,
      speed: 100,
    },
  };
  tiers.max_hp = 4;
  tiers.move_speed = 3;
  tiers.pickup_radius = 3;
  system.applyRunMetaUpgrades(metaGame);

  return {
    meta: {
      hp: metaGame.player.hp,
      maxHp: metaGame.player.maxHp,
      nullSafe: true,
      pickupRadius: metaGame.player.pickupRadius,
      speed: metaGame.player.speed,
    },
    reset: resetSnapshot,
  };
}

function runUiSnapshot(createRunUi) {
  let currentGame = null;
  const save = {
    coins: 42,
    questPoints: 9,
  };
  let debugCalls = 0;
  const ui = {
    endScreen: createClassElement(["hidden"]),
    runHud: { textContent: "" },
    runStats: { innerHTML: "" },
  };
  const controller = createRunUi({
    ui,
    formatTime: (value) => `fmt:${value}`,
    getGame: () => currentGame,
    getSave: () => save,
    getGameSpeed: () => 5,
    maxEquippedWeapons: () => 4,
    renderDebug() {
      debugCalls += 1;
    },
  });

  controller.updateRunHud();
  const noGameHud = ui.runHud.textContent;
  const noGameDebugCalls = debugCalls;

  currentGame = {
    bossSpawned: false,
    elapsed: 12.34,
    enemies: [{ boss: true, hp: 12.2, maxHp: 50 }],
    kills: 11,
    laserDamage: 29.9,
    lastFloorClear: {
      floor: 7,
      relicName: "Laser Lens",
    },
    player: {
      equippedWeapons: ["spark_bolt", "laser"],
      hp: 34.2,
      level: 3,
      maxHp: 80,
    },
    towerFloor: 8,
    xpCollected: 17,
  };
  controller.updateRunHud();
  const gameHud = ui.runHud.textContent;
  const gameHudDebugCalls = debugCalls;
  controller.showEndScreen("Player defeated");
  const endStats = ui.runStats.innerHTML;
  const opened = !ui.endScreen.classList.contains("hidden");
  controller.hideEndScreen();
  const hidden = ui.endScreen.classList.contains("hidden");

  return {
    endScreen: {
      hidden,
      includesCoins: endStats.includes("Coins banked: 42"),
      includesFloor: endStats.includes("Tower floor: 8"),
      includesKills: endStats.includes("Enemies defeated: 11"),
      includesLaserDamage: endStats.includes("Laser damage dealt: 29"),
      includesLevel: endStats.includes("Level reached: 3"),
      includesQuestPoints: endStats.includes("Quest Points: 9 available"),
      includesResult: endStats.includes("Result: Player defeated"),
      includesTime: endStats.includes("Time survived: fmt:12.34"),
      includesXp: endStats.includes("XP collected: 17"),
      opened,
    },
    exposesHideEndScreen: typeof controller.hideEndScreen === "function",
    exposesShowEndScreen: typeof controller.showEndScreen === "function",
    exposesUpdateRunHud: typeof controller.updateRunHud === "function",
    gameHud: {
      debugCalls: gameHudDebugCalls,
      includesBossHp: gameHud.includes("Boss HP 13/50"),
      includesCoins: gameHud.includes("Coins 42"),
      includesFloor: gameHud.includes("Floor 8"),
      includesFloorClear: gameHud.includes("Cleared Floor 7: Laser Lens"),
      includesHp: gameHud.includes("HP 35/80"),
      includesKills: gameHud.includes("Kills 11"),
      includesLaserDamage: gameHud.includes("Laser damage 29"),
      includesLevel: gameHud.includes("Level 3"),
      includesSpeed: gameHud.includes("Speed x5"),
      includesTime: gameHud.includes("Time fmt:12.34"),
      includesWeapons: gameHud.includes("Weapons 2/4"),
    },
    noGame: {
      debugCalls: noGameDebugCalls,
      includesSpeed: noGameHud.includes("Speed x5"),
      includesStartText: noGameHud.includes("Start a run to test movement"),
    },
  };
}

function createClassElement(initialClasses = []) {
  const classes = new Set(initialClasses);
  return {
    classList: {
      add(className) {
        classes.add(className);
      },
      contains(className) {
        return classes.has(className);
      },
      remove(className) {
        classes.delete(className);
      },
    },
  };
}

function runUpdateSnapshot(createRunUpdater) {
  const survivalQuestIds = ["survive"];
  const xpQuestIds = ["xp"];
  const levelQuestIds = ["level"];
  let currentGame = null;
  const calls = [];
  const questCalls = [];
  let showLevelUpCalls = 0;
  let endReason = "";

  const combat = Object.fromEntries(
    [
      "spawnBoss",
      "spawnEnemies",
      "updateEnemies",
      "updateEnemyBolts",
      "updateBossSpecials",
      "updateWeapons",
      "updateBolts",
      "updateAreas",
      "updateBeams",
      "updateWeaponBursts",
    ].map((name) => [
      name,
      () => {
        calls.push(name);
      },
    ])
  );
  const pickupSystem = Object.fromEntries(
    ["updateXpDrops", "updateLootDrops", "updatePickupTexts"].map((name) => [
      name,
      () => {
        calls.push(name);
      },
    ])
  );
  const updater = createRunUpdater({
    canvas: { width: 120, height: 80 },
    getGame: () => currentGame,
    combat,
    pickupSystem,
    addQuestProgressGroup(ids, value) {
      questCalls.push({ ids, value });
      calls.push(`quest:${ids[0]}:${value}`);
    },
    survivalQuestIds,
    xpQuestIds,
    levelQuestIds,
    showLevelUp() {
      showLevelUpCalls += 1;
    },
    endRun(reason) {
      endReason = reason;
      calls.push("endRun");
    },
    getRelicSpecialEffects: () => ({ xpMultiplier: 0.5 }),
    mapSystem: {
      applyToGame(game) {
        game.mapApplied = (game.mapApplied || 0) + 1;
        calls.push("map");
      },
    },
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  });

  function runNoOp(game) {
    currentGame = game;
    const beforeElapsed = game?.elapsed;
    calls.length = 0;
    updater.update(0.2);
    return calls.length === 0 && game?.elapsed === beforeElapsed;
  }

  const noOps = {
    awaiting: runNoOp({
      awaitingFirstMoveInput: true,
      elapsed: 1,
      paused: false,
      running: true,
    }),
    noGame: runNoOp(null),
    paused: runNoOp({
      elapsed: 1,
      paused: true,
      running: true,
    }),
    stopped: runNoOp({
      elapsed: 1,
      paused: false,
      running: false,
    }),
  };

  currentGame = {
    awaitingFirstMoveInput: false,
    duration: 10,
    elapsed: 9.9,
    levelUps: 0,
    mapApplied: 0,
    paused: false,
    player: {
      actionSprite: "slash",
      actionTimer: 0.1,
      blinkTimer: 0.05,
      facingX: 0,
      facingY: 0,
      hp: 0,
      invincibleTimer: 0.2,
      speed: 100,
      targetX: 110,
      targetY: 10,
      teleportCooldown: 0.3,
      x: 10,
      y: 10,
    },
    running: true,
    xpCollected: 0,
  };
  calls.length = 0;
  questCalls.length = 0;
  updater.update(0.2);
  const expectedOrder = [
    "map",
    "quest:survive:0.2",
    "spawnBoss",
    "spawnEnemies",
    "updateEnemies",
    "updateEnemyBolts",
    "updateBossSpecials",
    "updateWeapons",
    "updateBolts",
    "updateAreas",
    "updateBeams",
    "updateWeaponBursts",
    "updateXpDrops",
    "updateLootDrops",
    "updatePickupTexts",
    "endRun",
  ];
  const activeSnapshot = {
    actionSprite: currentGame.player.actionSprite,
    actionTimer: currentGame.player.actionTimer,
    blinkTimer: currentGame.player.blinkTimer,
    bossCalls: calls.filter((call) => call === "spawnBoss").length,
    callOrderMatches: JSON.stringify(calls) === JSON.stringify(expectedOrder),
    elapsed: currentGame.elapsed,
    endReason,
    facingX: currentGame.player.facingX,
    mapApplied: currentGame.mapApplied,
    moving: currentGame.player.moving,
    playerX: currentGame.player.x,
    playerY: currentGame.player.y,
    survivalQuestValue: questCalls.find((call) => call.ids === survivalQuestIds)?.value,
    timersNonNegative:
      currentGame.player.invincibleTimer === 0 &&
      currentGame.player.blinkTimer === 0 &&
      currentGame.player.teleportCooldown === 0.09999999999999998,
  };

  currentGame = { player: null };
  calls.length = 0;
  questCalls.length = 0;
  updater.collectXp(2);
  const noPlayerNoOp = calls.length === 0 && questCalls.length === 0;

  currentGame = {
    levelUps: 0,
    player: {
      level: 1,
      xp: 4,
      xpToLevel: 5,
    },
    xpCollected: 0,
  };
  questCalls.length = 0;
  showLevelUpCalls = 0;
  updater.collectXp(2);

  return {
    active: activeSnapshot,
    collect: {
      level: currentGame.player.level,
      levelQuestValue: questCalls.find((call) => call.ids === levelQuestIds)?.value,
      levelUps: currentGame.levelUps,
      noPlayerNoOp,
      playerXp: currentGame.player.xp,
      showLevelUp: showLevelUpCalls,
      xpCollected: currentGame.xpCollected,
      xpQuestValue: questCalls.find((call) => call.ids === xpQuestIds)?.value,
    },
    exposesCollectXp: typeof updater.collectXp === "function",
    exposesUpdate: typeof updater.update === "function",
    noOps,
  };
}

function createProjectileFixture(overrides = {}) {
  const target = { id: "target", x: 3, y: 4, radius: 4, hp: 10 };
  const game = {
    player: { x: 0, y: 0 },
    bolts: [],
    enemies: overrides.enemies || [target],
    areas: [],
  };
  const damageCalls = [];
  let reapCount = 0;
  const weaponDefs = {
    bolt: {
      id: "bolt",
      kind: "projectile",
      color: "#abc123",
      damage: 21,
      pierce: 0,
      radius: 7,
      speed: 10,
    },
  };
  const getRunUpgradeTier = overrides.getRunUpgradeTier || (() => 0);
  return {
    damageCalls,
    game,
    options: {
      canvas: { width: 100, height: 100 },
      weaponDefs,
      getGame: () => game,
      getRunUpgradeTier,
      getRelicSpecialEffects: overrides.getRelicSpecialEffects || (() => ({})),
      nearestEnemy: overrides.nearestEnemy || (() => target),
      projectileRadius: () => 7,
      weaponDamage: () => 21,
      projectileSkillModifier: () => 1,
      damageEnemy: (enemy, damage, weaponId) => {
        damageCalls.push({ enemyId: enemy.id, damage, weaponId });
      },
      reapEnemies: () => {
        reapCount += 1;
      },
      distance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
      clamp: moduleClamp,
    },
    reapCount: () => reapCount,
  };
}

function rounded(value) {
  return Number(value?.toFixed(6));
}

function approxVectorEqual(left, right) {
  return approxEqual(left[0], right[0]) && approxEqual(left[1], right[1]);
}

function approxEqual(left, right, epsilon = 1e-9) {
  return Math.abs(left - right) <= epsilon;
}

function withRandomSequence(sequence, callback) {
  const previousRandom = Math.random;
  let index = 0;
  Math.random = () => sequence[index++ % sequence.length];
  try {
    return callback();
  } finally {
    Math.random = previousRandom;
  }
}

function withBridgeRandomSequence(bridge, sequence, callback) {
  const hadMath = Reflect.has(bridge.context, "Math");
  const bridgeMath = hadMath ? bridge.context.Math : Object.create(Math);
  const previousRandom = bridgeMath.random;
  let index = 0;
  bridgeMath.random = () => sequence[index++ % sequence.length];
  bridge.context.Math = bridgeMath;
  try {
    return callback();
  } finally {
    bridgeMath.random = previousRandom;
    if (!hadMath) {
      Reflect.deleteProperty(bridge.context, "Math");
    }
  }
}

function createFallbackMapFixture() {
  return {
    mapDefs: [],
    levelDefs: [
      {
        id: "fallback_floor",
        startsAt: 0,
      },
    ],
    spriteDefs: {
      backgrounds: {
        tower_floor: "tower.png",
      },
    },
  };
}

function createMapFixture() {
  return {
    mapDefs: [
      {
        id: "forest",
        name: "Forest",
        floorIds: ["forest_floor"],
        backgroundAsset: "forest.png",
        modifiers: { density: 1, weather: "rain" },
      },
      {
        id: "ice",
        name: "Ice",
        floorIds: ["ice_early", "ice_late"],
        backgroundAsset: "missing-map-bg.png",
        modifiers: { density: 2, weather: "snow" },
      },
      {
        id: "void",
        name: "Void",
        modifiers: { density: 3 },
      },
    ],
    levelDefs: [
      {
        id: "forest_floor",
        startsAt: 0,
      },
      {
        id: "ice_late",
        startsAt: 30,
        backgroundAsset: "ice.png",
        modifiers: { density: 4, elite: true },
      },
      {
        id: "ice_early",
        startsAt: 0,
        modifiers: { density: 3 },
      },
      {
        id: "void_floor",
        startsAt: 0,
      },
    ],
    spriteDefs: {
      backgrounds: {
        forest_bg: "forest.png",
        ice_bg: { src: "ice.png" },
        tower_floor: "tower.png",
      },
    },
  };
}

function createMapBackgroundFallbackFixture() {
  return {
    mapDefs: [
      {
        id: "forest",
        floorIds: ["forest_floor"],
        backgroundAsset: "forest.png",
      },
    ],
    levelDefs: [
      {
        id: "forest_floor",
        startsAt: 0,
      },
    ],
    spriteDefs: {
      backgrounds: {
        forest_bg: "forest.png",
      },
    },
  };
}

function mapSystemSnapshot(system) {
  const fallback = system.resolve({ towerFloor: 1, elapsed: 0 });
  const floorOne = system.resolve({ towerFloor: 1, elapsed: 0 });
  const floorTwo = system.resolve({ towerFloor: 2, elapsed: 40 });
  const noConfiguredBackground = system.resolve({ towerFloor: 3, elapsed: 0 });
  const game = { towerFloor: 2, elapsed: 40 };
  const applied = system.applyToGame(game);
  return {
    applied: {
      activeFloorId: game.activeFloor?.id || "",
      activeMapId: game.activeMap?.id || "",
      backgroundId: game.background?.id || "",
      floorPool: game.floorPool?.map((floor) => floor.id) || [],
      modifiers: game.mapModifiers || {},
      returnedMapId: applied?.map?.id || "",
    },
    fallback: snapshotResolvedMap(fallback),
    floorOne: snapshotResolvedMap(floorOne),
    floorTwo: snapshotResolvedMap(floorTwo),
    noConfiguredBackground: snapshotResolvedMap(noConfiguredBackground),
    nullApply: system.applyToGame(null),
  };
}

function snapshotResolvedMap(resolved) {
  return {
    backgroundAsset: resolved.background.asset,
    backgroundId: resolved.background.id,
    backgroundSpriteId: resolved.background.spriteId,
    floorId: resolved.floor?.id || "",
    floorPool: resolved.floorPool.map((floor) => floor.id),
    mapId: resolved.map?.id || "",
    modifiers: resolved.modifiers,
  };
}

function saveLoadSnapshot(createSaveLoadHandler) {
  return {
    empty: runSaveLoadCase(createSaveLoadHandler, ""),
    valid: runSaveLoadCase(createSaveLoadHandler, "{\"coins\":7}"),
    corrupt: runSaveLoadCase(createSaveLoadHandler, "{bad"),
    storageFailed: runStorageReadFailedCase(createSaveLoadHandler),
  };
}

function runSaveLoadCase(createSaveLoadHandler, raw) {
  const backups = [];
  const normalized = [];
  const handler = createSaveLoadHandler({
    defaultSave: () => ({ defaulted: true }),
    normalizeAndMigrateSave: (save) => {
      normalized.push(JSON.stringify(save));
      return { normalized: true, save };
    },
    storage: {
      setCorruptBackupRaw: (backupRaw) => backups.push(backupRaw),
    },
  });
  const initialWarning = handler.getLastLoadWarning();
  const result = handler.fromRaw(raw);
  return {
    backups,
    initialWarning,
    normalized,
    result,
    warning: handler.getLastLoadWarning(),
  };
}

function runStorageReadFailedCase(createSaveLoadHandler) {
  const handler = createSaveLoadHandler({
    defaultSave: () => ({ defaulted: true }),
    normalizeAndMigrateSave: (save) => ({ normalized: true, save }),
    storage: {},
  });
  const initialWarning = handler.getLastLoadWarning();
  const result = handler.storageReadFailed();
  return {
    initialWarning,
    result,
    warning: handler.getLastLoadWarning(),
  };
}

function saveNormalizeSnapshot(createSaveNormalizer) {
  const questDefs = {
    starter: {},
    completed: { opens: ["follow"] },
    follow: {},
    weapon_quest: {},
    upgrade_quest: {},
    speed_quest: {},
  };
  const normalizer = createSaveNormalizer({
    defaultSave: () => ({
      saveVersion: 3,
      coins: 0,
      towerFloor: 1,
      unlockedWeapons: ["spark_bolt"],
      unlockedNodes: [],
      upgradeTiers: {},
      unlockedUpgrades: [],
      shopPurchases: {},
      seenBanners: [],
      unlockedRelics: [],
      equippedRelics: [],
      activeQuests: ["starter"],
      completedQuests: [],
      questProgress: {},
    }),
    questDefs,
    weaponUnlocks: [{ id: "node_laser", opensQuest: "weapon_quest" }],
    upgradeDefs: [
      { id: "damage", opensQuest: "upgrade_quest" },
      { id: "speed", opensQuest: "speed_quest" },
    ],
    shopItemById: new Map([
      ["boots", { id: "boots", maxTier: 2 }],
      ["orb", { id: "orb", maxTier: 1 }],
    ]),
    questOpenIds: (quest) => quest?.opens || [],
  });

  return {
    invalid: normalizer.normalizeSave(null),
    complex: normalizer.normalizeSave({
      coins: -3.4,
      towerFloor: 2.9,
      unlockedWeapons: ["laser", "spark_bolt", "laser"],
      unlockedNodes: ["node_laser"],
      upgradeTiers: { speed: 2 },
      unlockedUpgrades: ["damage"],
      shopPurchases: { boots: 4, orb: 1, unknown: 3 },
      seenBanners: ["intro", "intro", "boss"],
      unlockedRelics: ["r1", "r1", "r2", "r3", "r4", "r5", "r6"],
      equippedRelics: ["r1", "missing", "r2", "r2", "r3", "r4", "r5", "r6"],
      activeQuests: [],
      completedQuests: ["completed"],
      questProgress: [],
    }),
  };
}

function saveSystemSnapshot(createSaveSystem, globalScope) {
  const fallbackCalls = [];
  const fallbackStorage = createStorageFixture(JSON.stringify({ saveVersion: 3, coins: 5 }));
  const fallbackStorageDependency = {
    createStorageAdapter(options) {
      fallbackCalls.push(options);
      return fallbackStorage;
    },
  };
  const previousStorage = globalScope.TapSurvivorStorage;
  globalScope.TapSurvivorStorage = fallbackStorageDependency;
  const saveSystemFixture = createSaveSystemFixture(
    globalScope === globalThis ? { storage: fallbackStorageDependency } : {}
  );

  const providedStorage = createStorageFixture(JSON.stringify({ saveVersion: 3, coins: 7 }));
  const system = createSaveSystem({
    ...saveSystemFixture,
    storageAdapter: providedStorage,
  });
  const defaultSave = system.defaultSave();
  const normalized = system.normalizeSave({
    coins: 9.8,
    towerFloor: 2,
    unlockedWeapons: [],
    upgradeTiers: {},
  });
  const validLoad = system.loadSave();

  const corruptStorage = createStorageFixture("{bad");
  const corruptSystem = createSaveSystem({
    ...saveSystemFixture,
    storageAdapter: corruptStorage,
  });
  const corruptLoad = corruptSystem.loadSave();
  const corruptWarning = corruptSystem.getLastLoadWarning();

  const failedStorage = createStorageFixture(null, { failRead: true });
  const failedSystem = createSaveSystem({
    ...saveSystemFixture,
    storageAdapter: failedStorage,
  });
  const failedLoad = failedSystem.loadSave();
  const failedWarning = failedSystem.getLastLoadWarning();

  const persistSave = {
    ...defaultSave,
    upgradeTiers: { damage: 2, speed: 0 },
    unlockedUpgrades: [],
  };
  const persistResult = system.persist(persistSave);
  const removed = system.removeSave();
  const providedFallbackCalls = fallbackCalls.length;

  const fallbackSystem = createSaveSystem(saveSystemFixture);
  const fallbackDefault = fallbackSystem.defaultSave();

  if (previousStorage === undefined) {
    delete globalScope.TapSurvivorStorage;
  } else {
    globalScope.TapSurvivorStorage = previousStorage;
  }

  return {
    defaultSave,
    normalized,
    validLoad,
    corruptLoad,
    corruptWarning,
    corruptBackups: corruptStorage.backups,
    failedLoad,
    failedWarning,
    persistResult,
    persistSave,
    persistWrites: providedStorage.writes,
    removed,
    removeCount: providedStorage.removeCount,
    providedFallbackCalls,
    fallbackCalls,
    fallbackDefault,
  };
}

function createSaveSystemFixture(overrides = {}) {
  return {
    saveKey: "save-key",
    legacySaveKey: "legacy-key",
    saveNormalize: {
      createSaveNormalizer: createModuleSaveNormalizer,
    },
    saveCorruption: {
      createSaveLoadHandler: createModuleSaveLoadHandler,
    },
    saveDefaults: {
      CURRENT_SAVE_VERSION: moduleCurrentSaveVersion,
      createDefaultSave: createModuleDefaultSave,
    },
    saveMigrations: {
      isPlainObject: moduleIsPlainObject,
      migrateSave: moduleMigrateSave,
    },
    starterQuestIds: ["starter"],
    questDefs: {
      starter: {},
      completed: { opens: ["follow"] },
      follow: {},
      weapon_quest: {},
      damage_quest: {},
    },
    weaponUnlocks: [{ id: "node_laser", opensQuest: "weapon_quest" }],
    upgradeDefs: [{ id: "damage", opensQuest: "damage_quest" }],
    shopItemDefs: [{ id: "boots", maxTier: 2 }],
    questOpenIds: (quest) => quest?.opens || [],
    ...overrides,
  };
}

function createStorageFixture(raw, options = {}) {
  return {
    backups: [],
    removeCount: 0,
    writes: [],
    getSaveRaw() {
      if (options.failRead) throw new Error("storage read failed");
      return raw;
    },
    setCorruptBackupRaw(value) {
      this.backups.push(value);
      return true;
    },
    setSaveRaw(value) {
      this.writes.push(value);
      return true;
    },
    removeSaveRaw() {
      this.removeCount += 1;
      return true;
    },
  };
}

function contentRegistrySnapshot(registry) {
  return {
    bossAbilityCount: Object.keys(registry.bossAbilities).length,
    bossQuestIds: registry.bossQuestIds,
    enemyTypeCount: registry.enemyTypes.length,
    killQuestIds: registry.killQuestIds,
    mapCount: registry.mapDefs.length,
    relicCount: registry.relicDefs.length,
    runUpgradeCount: registry.runUpgradeDefs.length,
    shopItemCount: registry.shopItemDefs.length,
    sparkBoltDamage: registry.weaponDefs.spark_bolt?.damage,
    starterQuestIds: registry.starterQuestIds,
    upgradeCount: registry.upgradeDefs.length,
    weaponUnlockCount: registry.weaponUnlocks.length,
  };
}

function effectsSnapshot(effectsApi) {
  const game = {
    running: true,
    player: {
      speed: 100,
      pickupRadius: 50,
      hp: 80,
      maxHp: 100,
    },
  };
  effectsApi.applyRunUpgradeEffects(game, [
    { type: "playerStatAdd", stat: "speed", value: 10 },
    { type: "playerHeal", value: 50 },
  ]);
  const runUpgradeSpeed = game.player.speed;
  const runUpgradeHp = game.player.hp;
  const shopBonuses = effectsApi.emptyShopBonuses();
  effectsApi.addShopItemBonus(shopBonuses, { effect: { stat: "speed", value: 10 } }, 2);
  const shopApplied = effectsApi.applyShopItemEffectToRun(game, {
    effect: { stat: "pickupRadius", value: 5 },
  });
  effectsApi.applyRelicSpecialEffects(game, {
    maxHpBonus: 10,
    speedBonus: 5,
  });

  return {
    relicMaxHp: game.player.maxHp,
    relicSpeed: game.player.speed,
    runUpgradeHp,
    runUpgradeSpeed,
    shopApplied,
    shopBonuses,
    shopPickupRadius: game.player.pickupRadius,
  };
}

function relicSystemSnapshot(relicSystem, save, specialSave) {
  return {
    equippedRelicIds: relicSystem.equippedRelics(save).map((relic) => relic.id),
    maxEquippedRelics: relicSystem.maxEquippedRelics(save),
    maxEquippedWeapons: relicSystem.maxEquippedWeapons(save),
    moveSpeedMaxTierBonus: relicSystem.relicBonusFor(save, "run_move_speed", "maxTierBonus"),
    specialEffects: relicSystem.specialEffects(specialSave),
    startingRunUpgradeTiers: relicSystem.startingRunUpgradeTiers(save),
  };
}

function shellRelicUiSnapshot(createShellRelicUi, options) {
  const ui = {
    menuRelicInventory: createShellRelicFakeElement("div"),
    menuRelicSlots: createShellRelicFakeElement("div"),
  };
  const save = {
    towerFloor: 20,
    unlockedRelics: ["move_speed_focus_relic", "pickup_radius_focus_relic"],
    equippedRelics: ["move_speed_focus_relic"],
  };
  const timers = [];
  const images = [];
  let persistCount = 0;
  let renderMetaCount = 0;
  const controller = createShellRelicUi({
    ...options,
    documentRef: { createElement: createShellRelicFakeElement },
    getSave: () => save,
    imageFactory: () => createShellRelicFakeImage(images),
    persist: () => {
      persistCount += 1;
    },
    renderMeta: () => {
      renderMetaCount += 1;
    },
    scheduler: {
      animationSetTimeout(callback, delay) {
        const timer = { callback, delay, kind: "animation" };
        timers.push(timer);
        return timer;
      },
      clearTimeout(timer) {
        if (timer) timer.cleared = true;
      },
      setTimeout(callback, delay) {
        const timer = { callback, delay, kind: "lock" };
        timers.push(timer);
        return timer;
      },
    },
    ui,
  });
  controller.renderInventory();
  const initialSlotText = ui.menuRelicSlots.textContent;
  const inventoryClasses = collectShellRelicClasses(ui.menuRelicInventory);
  const availablePickupButton = findShellRelicElement(ui.menuRelicInventory, (element) =>
    String(element.innerHTML || "").includes("Pickup Radius Focus")
  );
  const lockedButton = findShellRelicElement(ui.menuRelicInventory, (element) =>
    String(element.innerHTML || "").includes("Locked Focus")
  );
  availablePickupButton?.eventListeners?.click?.[0]?.();
  const detailSlotText = ui.menuRelicSlots.textContent;
  const detailClasses = collectShellRelicClasses(ui.menuRelicInventory);
  const equipButton = findShellRelicElement(
    ui.menuRelicInventory,
    (element) => element.tagName === "button" && element.textContent === "Equip relic"
  );
  equipButton?.eventListeners?.click?.[0]?.();
  const equippedAfterEquip = [...save.equippedRelics];
  const moveSpeedSlot = findShellRelicElement(ui.menuRelicInventory, (element) =>
    String(element.innerHTML || "").includes("Move Speed Focus")
  );
  const unequipButton = findShellRelicElement(
    moveSpeedSlot,
    (element) => element.tagName === "button" && element.textContent === "Unequip"
  );
  unequipButton?.eventListeners?.click?.[0]?.();
  const equippedAfterUnequip = [...save.equippedRelics];
  controller.renderInventory();
  const lockedButtonAfterRender = findShellRelicElement(ui.menuRelicInventory, (element) =>
    String(element.innerHTML || "").includes("Locked Focus")
  );
  lockedButtonAfterRender?.eventListeners?.click?.[0]?.();
  const lockPopup = findShellRelicElement(ui.menuRelicInventory, (element) =>
    String(element.className || "").includes("relic-lock-popup")
  );
  const lockTimer = timers.find((timer) => timer.kind === "lock");
  lockTimer?.callback();
  const animationTimer = timers.find((timer) => timer.kind === "animation");

  return {
    detailClasses,
    detailSlotText,
    equippedAfterEquip,
    equippedAfterUnequip,
    initialSlotText,
    inventoryClasses,
    lockPopupHidden: lockPopup?.classList?.contains("hidden") || String(lockPopup?.className || "").includes("hidden"),
    lockPopupText: lockPopup?.textContent,
    lockTimerDelay: lockTimer?.delay,
    persistCount,
    previewDraws: images[0]?.draws || 0,
    previewTimerDelay: animationTimer?.delay,
    renderMetaCount,
  };
}

function classicShellUiSnapshot(createShellUiController, options) {
  const calls = [];
  const game = { running: true, paused: false, pauseReason: "" };
  const save = {
    towerFloor: 20,
    unlockedRelics: ["move_speed_focus_relic", "pickup_radius_focus_relic"],
    equippedRelics: ["move_speed_focus_relic"],
    unlockedWeapons: ["spark_bolt"],
    selectedStartingWeapon: "spark_bolt",
  };
  const documentRef = {
    fullscreenElement: null,
    documentElement: createShellRelicFakeElement("html"),
    addEventListener(type, handler) {
      calls.push(`document:${type}`);
      this.eventListeners = this.eventListeners || {};
      this.eventListeners[type] = handler;
    },
    createElement: createShellRelicFakeElement,
    exitFullscreen() {
      calls.push("fullscreen:exit");
    },
  };
  const ui = createClassicShellUiFixture(calls);
  const controller = createShellUiController({
    assets: {
      createAssetResolver: () => shellRelicUiAssetResolver,
    },
    closeEndScreen: () => calls.push("end:close"),
    closeLevelUpMenu: () => calls.push("level-up:close"),
    content: shellRelicUiContentFixture,
    documentRef,
    exitRun: () => calls.push("exit-run"),
    getGame: () => game,
    getSave: () => save,
    persist: () => calls.push("persist"),
    playStartLaugh: () => calls.push("laugh"),
    relicDefs: shellRelicUiFixtureDefs,
    relicSystem: options.relicSystem,
    renderMeta: () => calls.push("render-meta"),
    resetSave: () => calls.push("reset-save"),
    setGameSpeed: (speed) => calls.push(`speed:${speed}`),
    shellRelicUi: {
      createShellRelicUi: options.createShellRelicUi,
    },
    shopSystem: {
      closeShop: () => calls.push("shop:close"),
      openShop: () => calls.push("shop:open"),
      renderShop: () => calls.push("shop:render"),
    },
    startRun: () => calls.push("start-run"),
    toggleAudioMute: () => {
      calls.push("mute");
      return true;
    },
    isAudioMuted: () => false,
    ui,
    weaponDefs: {
      spark_bolt: { id: "spark_bolt", name: "Spark Bolt" },
    },
  });

  controller.bind();
  const boundListeners = Object.entries(ui)
    .filter(([, element]) => element?.eventListeners)
    .flatMap(([name, element]) => Object.keys(element.eventListeners).map((type) => `${name}:${type}`));
  boundListeners.push(
    ...ui.speedButtons.flatMap((button) =>
      Object.keys(button.eventListeners || {}).map((type) => `speed${button.dataset.speed}:${type}`)
    )
  );
  clickFirst(ui.openMenu);
  clickFirst(ui.menuInventoryTab);
  const availablePickupButton = findShellRelicElement(ui.menuRelicInventory, (element) =>
    String(element.innerHTML || "").includes("Pickup Radius Focus")
  );
  availablePickupButton?.eventListeners?.click?.[0]?.();
  const equipButton = findShellRelicElement(
    ui.menuRelicInventory,
    (element) => element.tagName === "button" && element.textContent === "Equip relic"
  );
  equipButton?.eventListeners?.click?.[0]?.();
  const equippedAfterEquip = [...save.equippedRelics];
  const moveSpeedSlot = findShellRelicElement(ui.menuRelicInventory, (element) =>
    String(element.innerHTML || "").includes("Move Speed Focus")
  );
  const unequipButton = findShellRelicElement(
    moveSpeedSlot,
    (element) => element.tagName === "button" && element.textContent === "Unequip"
  );
  unequipButton?.eventListeners?.click?.[0]?.();
  const equippedAfterUnequip = [...save.equippedRelics];
  clickFirst(ui.openShop);
  clickFirst(ui.closeShop);
  clickFirst(ui.resetSave);
  clickFirst(ui.fullscreenButton);
  clickFirst(ui.muteAudio);
  clickFirst(ui.speedButtons[2]);
  const openMenuExpanded = ui.openMenu.attributes["aria-expanded"];
  controller.closeRunMenu(true);
  const runMenuClosed = ui.runMenu.classList.contains("hidden");
  const openMenuCollapsed = ui.openMenu.attributes["aria-expanded"];
  const previousShopCloseCount = calls.filter((call) => call === "shop:close").length;
  controller.closeShopMenu();
  const shopClosedByMethod = calls.filter((call) => call === "shop:close").length === previousShopCloseCount + 1;
  controller.closeStartFlow();
  const startFlowClosed =
    ui.titleScreen.classList.contains("hidden") && ui.startTransition.classList.contains("hidden");
  controller.showTitleScreen();
  const titleVisible =
    !ui.titleScreen.classList.contains("hidden") && ui.startTransition.classList.contains("hidden");
  clickFirst(ui.titleStartGame);

  return {
    activePanel: ui.menuInventoryPanel.classList.contains("hidden") ? "progress" : "inventory",
    apiKeys: Object.keys(controller).sort(),
    boundListeners,
    calls,
    equippedAfterEquip,
    equippedAfterUnequip,
    inventoryClasses: collectShellRelicClasses(ui.menuRelicInventory),
    inventoryHidden: ui.menuInventoryPanel.classList.contains("hidden"),
    openMenuCollapsed,
    openMenuExpanded,
    progressHidden: ui.menuProgressPanel.classList.contains("hidden"),
    progressTabActive: ui.menuProgressTab.classList.contains("active"),
    inventoryTabActive: ui.menuInventoryTab.classList.contains("active"),
    relicInventoryText: collectShellRelicText(ui.menuRelicInventory),
    relicSlotsText: collectShellRelicText(ui.menuRelicSlots),
    runMenuClosed,
    shopClosedByMethod,
    startFlowClosed,
    startedScreen: calls.includes("start-run") ? "game" : "title",
    titleVisible,
  };
}

function moduleShellUiSnapshot(createShellUiController) {
  const controller = createShellUiController({
    shellRelicController: {
      dispose() {},
      render() {},
      selectRelic() {},
      update() {},
    },
    shellView: {
      dispose() {},
      render() {},
      setMenuOpen() {},
      setScreen() {},
      showPanel() {},
      update() {},
    },
    getSave: () => ({ towerFloor: 20 }),
  });
  controller.init();
  controller.openMenu("inventory");
  const startState = controller.startRun();
  return {
    activePanel: startState.panel,
    apiKeys: Object.keys(controller).sort(),
    startedScreen: startState.screen,
  };
}

function createClassicShellUiFixture(calls) {
  const ui = {
    canvas: createShellRelicFakeElement("canvas"),
    closeEnd: createShellRelicFakeElement("button"),
    closeEndX: createShellRelicFakeElement("button"),
    closeLevelUp: createShellRelicFakeElement("button"),
    closeMenu: createShellRelicFakeElement("button"),
    closeShop: createShellRelicFakeElement("button"),
    closeShopBottom: createShellRelicFakeElement("button"),
    exitRun: createShellRelicFakeElement("button"),
    fullscreenButton: createShellRelicFakeElement("button"),
    menuInventoryPanel: createShellRelicFakeElement("section"),
    menuInventoryTab: createShellRelicFakeElement("button"),
    menuProgressPanel: createShellRelicFakeElement("section"),
    menuProgressTab: createShellRelicFakeElement("button"),
    menuRelicInventory: createShellRelicFakeElement("div"),
    menuRelicSlots: createShellRelicFakeElement("div"),
    menuShopPanel: createShellRelicFakeElement("section"),
    menuShopTab: createShellRelicFakeElement("button"),
    muteAudio: createShellRelicFakeElement("button"),
    openMenu: createShellRelicFakeElement("button"),
    openShop: createShellRelicFakeElement("button"),
    resetSave: createShellRelicFakeElement("button"),
    runMenu: createShellRelicFakeElement("section"),
    startTransition: createShellRelicFakeElement("section"),
    titleScreen: createShellRelicFakeElement("section"),
    titleStartGame: createShellRelicFakeElement("button"),
  };
  ui.speedButtons = [1, 2, 5].map((speed) => {
    const button = createShellRelicFakeElement("button");
    button.dataset.speed = String(speed);
    return button;
  });
  ui.runMenu.classList.add("hidden");
  ui.startTransition.classList.add("hidden");
  ui.menuInventoryPanel.classList.add("hidden");
  ui.menuShopPanel.classList.add("hidden");
  ui.canvas.parentElement = {
    requestFullscreen() {
      calls.push("fullscreen:request");
    },
  };
  return ui;
}

function clickFirst(element) {
  element?.eventListeners?.click?.[0]?.();
}

function createShellRelicFakeElement(tagName) {
  const element = {
    tagName,
    attributes: {},
    children: [],
    className: "",
    dataset: {},
    eventListeners: {},
    innerHTML: "",
    isConnected: true,
    style: {
      setProperty(key, value) {
        this[key] = value;
      },
    },
    textContent: "",
    type: "",
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    classList: {
      add(className) {
        element.className = [...new Set([...String(element.className || "").split(/\s+/).filter(Boolean), className])].join(" ");
      },
      contains(className) {
        return String(element.className || "").split(/\s+/).includes(className);
      },
      remove(className) {
        element.className = String(element.className || "")
          .split(/\s+/)
          .filter((item) => item && item !== className)
          .join(" ");
      },
      toggle(className, force) {
        const shouldAdd = force ?? !this.contains(className);
        if (shouldAdd) this.add(className);
        else this.remove(className);
        return shouldAdd;
      },
    },
    addEventListener(type, handler) {
      this.eventListeners[type] = this.eventListeners[type] || [];
      this.eventListeners[type].push(handler);
    },
    getContext() {
      return {
        clearRect() {},
        drawImage() {
          this.image.draws = (this.image.draws || 0) + 1;
        },
        getImageData() {
          return { data: new Uint8ClampedArray(4) };
        },
        image: null,
        imageSmoothingEnabled: true,
        putImageData() {},
      };
    },
    removeEventListener(type, handler) {
      this.eventListeners[type] = (this.eventListeners[type] || []).filter((item) => item !== handler);
    },
    prepend(child) {
      this.children.unshift(child);
      return child;
    },
    querySelector(selector) {
      if (selector !== ".relic-lock-popup") return null;
      return findShellRelicElement(this, (item) => String(item.className || "").includes("relic-lock-popup"));
    },
    setAttribute(key, value) {
      this.attributes[key] = value;
    },
  };
  if (tagName === "canvas") {
    element.getContext = () => ({
      clearRect() {},
      drawImage(image) {
        image.draws = (image.draws || 0) + 1;
      },
      getImageData() {
        return { data: new Uint8ClampedArray(4) };
      },
      imageSmoothingEnabled: true,
      putImageData() {},
    });
  }
  return element;
}

function createShellRelicFakeImage(images) {
  const listeners = {};
  const image = {
    draws: 0,
    addEventListener(type, callback) {
      listeners[type] = callback;
    },
    get src() {
      return this.source || "";
    },
    set src(value) {
      this.source = value;
      listeners.load?.();
    },
  };
  images.push(image);
  return image;
}

function collectShellRelicClasses(element) {
  if (!element) return [];
  return [element.className || "", ...element.children.flatMap(collectShellRelicClasses)].filter(Boolean);
}

function collectShellRelicText(element) {
  if (!element) return "";
  return [element.textContent || "", element.innerHTML || "", ...(element.children || []).map(collectShellRelicText)]
    .filter(Boolean)
    .join(" ");
}

function findShellRelicElement(element, predicate) {
  if (!element) return null;
  if (predicate(element)) return element;
  for (const child of element.children || []) {
    const match = findShellRelicElement(child, predicate);
    if (match) return match;
  }
  return null;
}

/**
 * @param {string} path
 * @param {string} filename
 * @param {Record<string, unknown>} [globals]
 * @returns {{ source: string, context: Record<string, unknown> }}
 */
function loadBridge(path, filename, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const context = { console, ...globals };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename });
  return { source, context };
}

/**
 * @param {string} source
 * @returns {boolean}
 */
function hasGeneratedBanner(source) {
  return source.startsWith("// GENERATED FILE.");
}

/**
 * @param {string} label
 * @param {boolean} condition
 */
function check(label, condition) {
  if (condition) {
    console.log(`PASS ${label}`);
    return;
  }
  console.error(`FAIL ${label}`);
  process.exitCode = 1;
}
