import { readFileSync } from "node:fs";
import vm from "node:vm";

import { floorDifficulty as moduleFloorDifficulty } from "../src/modules/balance.js";
import {
  choiceId as moduleChoiceId,
  shopFocusBonus as moduleShopFocusBonus,
  shuffleChoices as moduleShuffleChoices,
  weightedChoices as moduleWeightedChoices,
} from "../src/modules/level-up-choices.js";
import {
  clamp as moduleClamp,
  distance as moduleDistance,
  formatTime as moduleFormatTime,
  randomRange as moduleRandomRange,
} from "../src/modules/math.js";
import { createShopPricing as createModuleShopPricing } from "../src/modules/shop-pricing.js";
import { createWeaponScaling as createModuleWeaponScaling } from "../src/modules/weapon-cooldowns.js";
import {
  createWeaponProjectileSystem as createModuleWeaponProjectileSystem,
  rotateVector as moduleRotateVector,
} from "../src/modules/weapon-projectiles.js";
import { nearestEnemy as moduleNearestEnemy } from "../src/modules/weapon-targeting.js";

const balanceBridge = loadBridge("../src/balance.js", "src/balance.js");
const choicesBridge = loadBridge("../src/level-up-choices.js", "src/level-up-choices.js");
const pricingBridge = loadBridge("../src/shop-pricing.js", "src/shop-pricing.js");
const mathBridge = loadBridge("../src/math.js", "src/math.js");
const targetingBridge = loadBridge("../src/weapon-targeting.js", "src/weapon-targeting.js");
const cooldownBridge = loadBridge("../src/weapon-cooldowns.js", "src/weapon-cooldowns.js");
const projectileBridge = loadBridge("../src/weapon-projectiles.js", "src/weapon-projectiles.js");

const bridgeBalance = balanceBridge.context.TapSurvivorBalance;
const bridgeChoices = choicesBridge.context.TapSurvivorLevelUpChoices;
const createBridgeShopPricing = pricingBridge.context.TapSurvivorShopPricing?.createShopPricing;
const bridgeMath = mathBridge.context.TapSurvivorMath;
const bridgeTargeting = targetingBridge.context.TapSurvivorWeaponTargeting;
const createBridgeWeaponScaling = cooldownBridge.context.TapSurvivorWeaponCooldowns?.createWeaponScaling;
const bridgeProjectiles = projectileBridge.context.TapSurvivorWeaponProjectiles;

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

/**
 * @param {string} path
 * @param {string} filename
 * @returns {{ source: string, context: Record<string, unknown> }}
 */
function loadBridge(path, filename) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const context = { console };
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
