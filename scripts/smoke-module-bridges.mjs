import { readFileSync } from "node:fs";
import vm from "node:vm";

import { floorDifficulty as moduleFloorDifficulty } from "../src/modules/balance.js";
import { createGameDependencyBag as createModuleGameDependencyBag } from "../src/modules/game-dependencies.js";
import { createGameRuntimeController as createModuleGameRuntimeController } from "../src/modules/game-runtime.js";
import { createRunLifecycle as createModuleRunLifecycle } from "../src/modules/run-lifecycle.js";
import { createRunStateSystem as createModuleRunStateSystem } from "../src/modules/run-state.js";
import { createRunUpdater as createModuleRunUpdater } from "../src/modules/run-update.js";
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
globalThis["TapSurvivorSaveDefaults"] = {
  CURRENT_SAVE_VERSION: moduleCurrentSaveVersion,
  createDefaultSave: createModuleDefaultSave,
};
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

const balanceBridge = loadBridge("../src/balance.js", "src/balance.js");
const choicesBridge = loadBridge("../src/level-up-choices.js", "src/level-up-choices.js");
const mapBridge = loadBridge("../src/map-system.js", "src/map-system.js");
const saveCorruptionBridge = loadBridge("../src/save-corruption.js", "src/save-corruption.js");
const saveDefaultsBridge = loadBridge("../src/save-defaults.js", "src/save-defaults.js");
const saveMigrationsBridge = loadBridge("../src/save-migrations.js", "src/save-migrations.js", {
  TapSurvivorSaveDefaults: saveDefaultsBridge.context.TapSurvivorSaveDefaults,
});
const saveNormalizeBridge = loadBridge("../src/save-normalize.js", "src/save-normalize.js", {
  TapSurvivorSaveDefaults: saveDefaultsBridge.context.TapSurvivorSaveDefaults,
  TapSurvivorSaveMigrations: saveMigrationsBridge.context.TapSurvivorSaveMigrations,
});
const saveBridge = loadBridge("../src/save.js", "src/save.js", {
  TapSurvivorSaveDefaults: saveDefaultsBridge.context.TapSurvivorSaveDefaults,
  TapSurvivorSaveMigrations: saveMigrationsBridge.context.TapSurvivorSaveMigrations,
  TapSurvivorSaveNormalize: saveNormalizeBridge.context.TapSurvivorSaveNormalize,
  TapSurvivorSaveCorruption: saveCorruptionBridge.context.TapSurvivorSaveCorruption,
});
const pricingBridge = loadBridge("../src/shop-pricing.js", "src/shop-pricing.js");
const mathBridge = loadBridge("../src/math.js", "src/math.js");
const targetingBridge = loadBridge("../src/weapon-targeting.js", "src/weapon-targeting.js");
const cooldownBridge = loadBridge("../src/weapon-cooldowns.js", "src/weapon-cooldowns.js");
const projectileBridge = loadBridge("../src/weapon-projectiles.js", "src/weapon-projectiles.js");
const gameRuntimeBridge = loadBridge("../src/game-runtime.js", "src/game-runtime.js");
const gameDependenciesBridge = loadBridge("../src/game-dependencies.js", "src/game-dependencies.js");
const runLifecycleBridge = loadBridge("../src/run-lifecycle.js", "src/run-lifecycle.js");
const runStateBridge = loadBridge("../src/run-state.js", "src/run-state.js");
const runUpdateBridge = loadBridge("../src/run-update.js", "src/run-update.js");

const bridgeBalance = balanceBridge.context.TapSurvivorBalance;
const bridgeChoices = choicesBridge.context.TapSurvivorLevelUpChoices;
const bridgeMapSystem = mapBridge.context.TapSurvivorMapSystem;
const bridgeSaveCorruption = saveCorruptionBridge.context.TapSurvivorSaveCorruption;
const bridgeSaveDefaults = saveDefaultsBridge.context.TapSurvivorSaveDefaults;
const bridgeSaveMigrations = saveMigrationsBridge.context.TapSurvivorSaveMigrations;
const bridgeSaveNormalize = saveNormalizeBridge.context.TapSurvivorSaveNormalize;
const bridgeSave = saveBridge.context.TapSurvivorSave;
const createBridgeShopPricing = pricingBridge.context.TapSurvivorShopPricing?.createShopPricing;
const bridgeMath = mathBridge.context.TapSurvivorMath;
const bridgeTargeting = targetingBridge.context.TapSurvivorWeaponTargeting;
const createBridgeWeaponScaling = cooldownBridge.context.TapSurvivorWeaponCooldowns?.createWeaponScaling;
const bridgeProjectiles = projectileBridge.context.TapSurvivorWeaponProjectiles;
const bridgeGameRuntime = gameRuntimeBridge.context.TapSurvivorGameRuntime;
const bridgeGameDependencies = gameDependenciesBridge.context.TapSurvivorGameDependencies;
const bridgeRunLifecycle = runLifecycleBridge.context.TapSurvivorRunLifecycle;
const bridgeRunState = runStateBridge.context.TapSurvivorRunState;
const bridgeRunUpdate = runUpdateBridge.context.TapSurvivorRunUpdate;

check("module exports floorDifficulty", typeof moduleFloorDifficulty === "function");
check("bridge assigns globalThis.TapSurvivorBalance", Boolean(bridgeBalance));
check("balance bridge source has generated banner", hasGeneratedBanner(balanceBridge.source));
check("bridge exposes floorDifficulty", typeof bridgeBalance?.floorDifficulty === "function");

const balanceFixtures = [1, 2, 3, 4, 0, null, undefined];
const moduleBalanceResults = balanceFixtures.map((floor) => moduleFloorDifficulty(floor));
const bridgeBalanceResults = balanceFixtures.map((floor) => bridgeBalance.floorDifficulty(floor));
check(
  "module and bridge balance output match",
  JSON.stringify(moduleBalanceResults) === JSON.stringify(bridgeBalanceResults)
);
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

check("module exports choiceId", typeof moduleChoiceId === "function");
check("module exports shopFocusBonus", typeof moduleShopFocusBonus === "function");
check("module exports shuffleChoices", typeof moduleShuffleChoices === "function");
check("module exports weightedChoices", typeof moduleWeightedChoices === "function");
check("bridge assigns globalThis.TapSurvivorLevelUpChoices", Boolean(bridgeChoices));
check(
  "level-up choices bridge source has generated banner",
  hasGeneratedBanner(choicesBridge.source)
);
for (const exportName of ["choiceId", "shopFocusBonus", "shuffleChoices", "weightedChoices"]) {
  check(`bridge exposes ${exportName}`, typeof bridgeChoices?.[exportName] === "function");
}

const weaponChoice = { weaponId: "laser", name: "Laser" };
const runChoice = { runUpgradeId: "run_damage", name: "Damage" };
const unknownChoice = { name: "Repair" };
check("choiceId weapon fixture is unchanged", moduleChoiceId(weaponChoice) === "weapon:laser");
check("choiceId run-upgrade fixture is unchanged", moduleChoiceId(runChoice) === "run:run_damage");
check("choiceId unknown fixture is unchanged", moduleChoiceId(unknownChoice) === "run:Repair");
check(
  "module and bridge choiceId output match",
  JSON.stringify([weaponChoice, runChoice, unknownChoice].map(moduleChoiceId)) ===
    JSON.stringify([weaponChoice, runChoice, unknownChoice].map(bridgeChoices.choiceId))
);

check("shopFocusBonus empty fixture is unchanged", moduleShopFocusBonus({}) === 0);
check(
  "shopFocusBonus relic compass fixture is unchanged",
  moduleShopFocusBonus({ shopPurchases: { relic_compass: 3 } }) === 1.5
);
check(
  "module and bridge shopFocusBonus output match",
  JSON.stringify([{}, { shopPurchases: { relic_compass: 3 } }].map(moduleShopFocusBonus)) ===
    JSON.stringify([{}, { shopPurchases: { relic_compass: 3 } }].map(bridgeChoices.shopFocusBonus))
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
const bridgeWeighted = withBridgeRandomSequence(choicesBridge, [0.9, 0.2, 0.4], () =>
  bridgeChoices.weightedChoices(choices, (choice) => (choice.runUpgradeId === "beta" ? 3 : 1)).map(
    bridgeChoices.choiceId
  )
);
check("weightedChoices deterministic fixture is unchanged", moduleWeighted[0] === "run:beta");
check(
  "module and bridge weightedChoices output match",
  JSON.stringify(moduleWeighted) === JSON.stringify(bridgeWeighted)
);

const moduleWeightedFallback = withRandomSequence([0.3, 0.1, 0.2], () =>
  moduleWeightedChoices(choices, () => 0).map(moduleChoiceId)
);
const bridgeWeightedFallback = withBridgeRandomSequence(choicesBridge, [0.3, 0.1, 0.2], () =>
  bridgeChoices.weightedChoices(choices, () => 0).map(bridgeChoices.choiceId)
);
check(
  "weightedChoices zero-weight fallback uses random order",
  JSON.stringify(moduleWeightedFallback) === JSON.stringify(["run:beta", "run:gamma", "run:alpha"])
);
check(
  "module and bridge weightedChoices fallback output match",
  JSON.stringify(moduleWeightedFallback) === JSON.stringify(bridgeWeightedFallback)
);

const moduleShuffled = withRandomSequence([0.3, 0.1, 0.2], () => moduleShuffleChoices(choices));
const bridgeShuffled = withBridgeRandomSequence(choicesBridge, [0.3, 0.1, 0.2], () =>
  bridgeChoices.shuffleChoices(choices)
);
check("shuffleChoices returns a separate array", moduleShuffled !== choices);
check(
  "shuffleChoices preserves all input choices",
  JSON.stringify(moduleShuffled.map(moduleChoiceId).sort()) ===
    JSON.stringify(choices.map(moduleChoiceId).sort())
);
check(
  "module and bridge shuffleChoices output match",
  JSON.stringify(moduleShuffled.map(moduleChoiceId)) ===
    JSON.stringify(bridgeShuffled.map(bridgeChoices.choiceId))
);

check("module exports createMapSystem", typeof createModuleMapSystem === "function");
check("bridge assigns globalThis.TapSurvivorMapSystem", Boolean(bridgeMapSystem));
check("map system bridge source has generated banner", hasGeneratedBanner(mapBridge.source));
check("bridge exposes createMapSystem", typeof bridgeMapSystem?.createMapSystem === "function");

const moduleFallbackMap = mapSystemSnapshot(createModuleMapSystem(createFallbackMapFixture()));
const bridgeFallbackMap = mapSystemSnapshot(bridgeMapSystem.createMapSystem(createFallbackMapFixture()));
check("fallback map fixture uses default tower", moduleFallbackMap.fallback.mapId === "default_tower");
check("fallback map fixture uses tower background", moduleFallbackMap.fallback.backgroundId === "tower_floor");
check(
  "module and bridge fallback map output match",
  JSON.stringify(moduleFallbackMap) === JSON.stringify(bridgeFallbackMap)
);

const mapFixture = createMapFixture();
const moduleMapSystem = createModuleMapSystem(mapFixture);
const bridgeMapSystemInstance = bridgeMapSystem.createMapSystem(mapFixture);
const moduleMapSnapshot = mapSystemSnapshot(moduleMapSystem);
const bridgeMapSnapshot = mapSystemSnapshot(bridgeMapSystemInstance);
const moduleMapBackgroundFallback = mapSystemSnapshot(
  createModuleMapSystem(createMapBackgroundFallbackFixture())
);
const bridgeMapBackgroundFallback = mapSystemSnapshot(
  bridgeMapSystem.createMapSystem(createMapBackgroundFallbackFixture())
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
  "module and bridge map background fallback output match",
  JSON.stringify(moduleMapBackgroundFallback) === JSON.stringify(bridgeMapBackgroundFallback)
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
check(
  "module and bridge map system output match",
  JSON.stringify(moduleMapSnapshot) === JSON.stringify(bridgeMapSnapshot)
);

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
check("bridge assigns globalThis.TapSurvivorSaveDefaults", Boolean(bridgeSaveDefaults));
check(
  "save defaults bridge source has generated banner",
  hasGeneratedBanner(saveDefaultsBridge.source)
);
check(
  "bridge exposes CURRENT_SAVE_VERSION",
  bridgeSaveDefaults?.CURRENT_SAVE_VERSION === moduleCurrentSaveVersion
);
check(
  "bridge exposes createDefaultSave",
  typeof bridgeSaveDefaults?.createDefaultSave === "function"
);
const saveDefaultFixture = { starterQuestIds: ["daily_one", "daily_two"] };
const moduleDefaultSave = createModuleDefaultSave(saveDefaultFixture);
const bridgeDefaultSave = bridgeSaveDefaults.createDefaultSave(saveDefaultFixture);
check("default save fixture keeps schema version", moduleDefaultSave.saveVersion === 3);
check(
  "default save fixture copies starter quests",
  JSON.stringify(moduleDefaultSave.activeQuests) === JSON.stringify(["daily_one", "daily_two"])
);
check("default save fixture starts with spark bolt", moduleDefaultSave.unlockedWeapons[0] === "spark_bolt");
check(
  "module and bridge default save output match",
  JSON.stringify(moduleDefaultSave) === JSON.stringify(bridgeDefaultSave)
);

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
  "bridge assigns globalThis.TapSurvivorShopPricing",
  Boolean(pricingBridge.context.TapSurvivorShopPricing)
);
check("bridge exposes createShopPricing", typeof createBridgeShopPricing === "function");
check("shop pricing bridge source has generated banner", hasGeneratedBanner(pricingBridge.source));
check(
  "bridge source assigns only the pricing global",
  pricingBridge.source.includes("globalThis.TapSurvivorShopPricing")
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
const bridgePricing = createBridgeShopPricing(options);

const moduleResults = pricingSnapshot(modulePricing);
const bridgeResults = pricingSnapshot(bridgePricing);
check(
  "module and bridge pricing output match",
  JSON.stringify(moduleResults) === JSON.stringify(bridgeResults)
);

check("module exports clamp", typeof moduleClamp === "function");
check("module exports distance", typeof moduleDistance === "function");
check("module exports formatTime", typeof moduleFormatTime === "function");
check("module exports randomRange", typeof moduleRandomRange === "function");
check("bridge assigns globalThis.TapSurvivorMath", Boolean(bridgeMath));
check("math bridge source has generated banner", hasGeneratedBanner(mathBridge.source));
for (const exportName of ["clamp", "distance", "formatTime", "randomRange"]) {
  check(`bridge exposes math ${exportName}`, typeof bridgeMath?.[exportName] === "function");
}

const mathResults = {
  clamp: moduleClamp(12, 0, 10),
  distance: moduleDistance({ x: 0, y: 0 }, { x: 3, y: 4 }),
  formatTime: moduleFormatTime(65),
};
const bridgeMathResults = {
  clamp: bridgeMath.clamp(12, 0, 10),
  distance: bridgeMath.distance({ x: 0, y: 0 }, { x: 3, y: 4 }),
  formatTime: bridgeMath.formatTime(65),
};
check("module clamp fixture is unchanged", mathResults.clamp === 10);
check("module distance fixture is unchanged", mathResults.distance === 5);
check("module formatTime fixture is unchanged", mathResults.formatTime === "1:05");
check(
  "module and bridge deterministic math output match",
  JSON.stringify(mathResults) === JSON.stringify(bridgeMathResults)
);
const moduleRandom = moduleRandomRange(2, 4);
const bridgeRandom = bridgeMath.randomRange(2, 4);
check("module randomRange returns number in range", moduleRandom >= 2 && moduleRandom < 4);
check("bridge randomRange returns number in range", bridgeRandom >= 2 && bridgeRandom < 4);

check("module exports nearestEnemy", typeof moduleNearestEnemy === "function");
check("bridge assigns globalThis.TapSurvivorWeaponTargeting", Boolean(bridgeTargeting));
check(
  "weapon targeting bridge source has generated banner",
  hasGeneratedBanner(targetingBridge.source)
);
check("bridge exposes nearestEnemy", typeof bridgeTargeting?.nearestEnemy === "function");

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
const bridgeTarget = bridgeTargeting.nearestEnemy(targetingGame, distance);
check("module nearestEnemy fixture selects nearest enemy", moduleTarget?.id === "near");
check("module and bridge targeting output match", moduleTarget === bridgeTarget);
check(
  "module and bridge targeting empty-enemy fallback match",
  moduleNearestEnemy({ player: { x: 0, y: 0 }, enemies: [] }, distance) === null &&
    bridgeTargeting.nearestEnemy({ player: { x: 0, y: 0 }, enemies: [] }, distance) === null
);

check("module exports createWeaponScaling", typeof createModuleWeaponScaling === "function");
check(
  "bridge assigns globalThis.TapSurvivorWeaponCooldowns",
  Boolean(cooldownBridge.context.TapSurvivorWeaponCooldowns)
);
check(
  "weapon cooldown bridge source has generated banner",
  hasGeneratedBanner(cooldownBridge.source)
);
check("bridge exposes createWeaponScaling", typeof createBridgeWeaponScaling === "function");

const previousContent = Reflect.get(globalThis, "TapSurvivorContent");
const hadPreviousContent = Reflect.has(globalThis, "TapSurvivorContent");
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
Reflect.set(globalThis, "TapSurvivorContent", { runUpgrades });
cooldownBridge.context.TapSurvivorContent = { runUpgrades };

const scalingFixture = createScalingFixture();
const moduleScaling = createModuleWeaponScaling(scalingFixture);
const bridgeScaling = createBridgeWeaponScaling(scalingFixture);
const moduleScalingResults = scalingSnapshot(moduleScaling, scalingFixture.weaponDefs.bolt);
const bridgeScalingResults = scalingSnapshot(bridgeScaling, scalingFixture.weaponDefs.bolt);
check(
  "module and bridge cooldown scaling output match",
  JSON.stringify(moduleScalingResults) === JSON.stringify(bridgeScalingResults)
);
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
const fallbackScaling = createModuleWeaponScaling(fallbackFixture);
const fallbackBridgeScaling = createBridgeWeaponScaling(fallbackFixture);
const fallbackSnapshot = scalingSnapshot(fallbackScaling, fallbackFixture.weaponDefs.bolt);
const fallbackBridgeSnapshot = scalingSnapshot(fallbackBridgeScaling, fallbackFixture.weaponDefs.bolt);
check(
  "module and bridge optional callback fallback output match",
  JSON.stringify(fallbackSnapshot) === JSON.stringify(fallbackBridgeSnapshot)
);

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

const moduleGameDependenciesSnapshot = gameDependenciesSnapshot(createModuleGameDependencyBag);
const bridgeGameDependenciesSnapshot = gameDependenciesSnapshot(
  bridgeGameDependencies.createGameDependencyBag
);
check(
  "module and bridge game dependency bag output match",
  JSON.stringify(moduleGameDependenciesSnapshot) === JSON.stringify(bridgeGameDependenciesSnapshot)
);
check("dependency bag preserves balance content override", moduleGameDependenciesSnapshot.contentId === "override");
check("dependency bag exposes input binder", moduleGameDependenciesSnapshot.hasInputBinder);
check("dependency bag preserves optional debug balance", moduleGameDependenciesSnapshot.debugProfile === "testing");
check("dependency bag preserves optional upgrades fallback", moduleGameDependenciesSnapshot.emptyUpgradeKeys === 0);
check("dependency bag reports missing required dependency", moduleGameDependenciesSnapshot.missingError.includes("TapSurvivorAudio"));
check(
  "dependency bag reports missing input binder",
  moduleGameDependenciesSnapshot.missingInputError.includes("TapSurvivorInput.bindMovementInput")
);

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
if (hadPreviousContent) {
  Reflect.set(globalThis, "TapSurvivorContent", previousContent);
} else {
  Reflect.deleteProperty(globalThis, "TapSurvivorContent");
}

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
    "TapSurvivorCombat",
    "TapSurvivorContentRegistry",
    "TapSurvivorDebug",
    "TapSurvivorEffects",
    "TapSurvivorGameBanners",
    "TapSurvivorGameRuntime",
    "TapSurvivorLevelUp",
    "TapSurvivorMapSystem",
    "TapSurvivorMath",
    "TapSurvivorPickups",
    "TapSurvivorProgression",
    "TapSurvivorQuests",
    "TapSurvivorRelics",
    "TapSurvivorRenderEnemies",
    "TapSurvivorRenderHud",
    "TapSurvivorRendering",
    "TapSurvivorRunLifecycle",
    "TapSurvivorRunState",
    "TapSurvivorRunUi",
    "TapSurvivorRunUpdate",
    "TapSurvivorSave",
    "TapSurvivorShellUi",
    "TapSurvivorShop",
    "TapSurvivorSprites",
    "TapSurvivorStorage",
    "TapSurvivorUi",
  ];
  const globalRef = Object.fromEntries(requiredNames.map((name) => [name, { name }]));
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
  const bag = createGameDependencyBag({ globalRef });

  const fallbackGlobalRef = { ...globalRef };
  delete fallbackGlobalRef.TapSurvivorBalanceRuntime;
  delete fallbackGlobalRef.TapSurvivorUpgrades;
  const fallbackBag = createGameDependencyBag({ globalRef: fallbackGlobalRef });

  const missingGlobalRef = { ...globalRef };
  delete missingGlobalRef.TapSurvivorAudio;
  let missingError = "";
  try {
    createGameDependencyBag({ globalRef: missingGlobalRef });
  } catch (error) {
    missingError = error.message;
  }

  const missingInputGlobalRef = { ...globalRef };
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
    hasMath: bag.math.name === "TapSurvivorMath",
    hasInputBinder: bag.input.bindMovementInput === bindMovementInput,
    missingError,
    missingInputError,
  };
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
  const previousStorage = globalScope.TapSurvivorStorage;
  globalScope.TapSurvivorStorage = {
    createStorageAdapter(options) {
      fallbackCalls.push(options);
      return fallbackStorage;
    },
  };

  const providedStorage = createStorageFixture(JSON.stringify({ saveVersion: 3, coins: 7 }));
  const system = createSaveSystem({
    ...createSaveSystemFixture(),
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
    ...createSaveSystemFixture(),
    storageAdapter: corruptStorage,
  });
  const corruptLoad = corruptSystem.loadSave();
  const corruptWarning = corruptSystem.getLastLoadWarning();

  const failedStorage = createStorageFixture(null, { failRead: true });
  const failedSystem = createSaveSystem({
    ...createSaveSystemFixture(),
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

  const fallbackSystem = createSaveSystem(createSaveSystemFixture());
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

function createSaveSystemFixture() {
  return {
    saveKey: "save-key",
    legacySaveKey: "legacy-key",
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
