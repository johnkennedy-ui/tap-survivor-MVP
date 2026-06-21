import { readFileSync } from "node:fs";
import vm from "node:vm";

import {
  clamp as moduleClamp,
  distance as moduleDistance,
  formatTime as moduleFormatTime,
  randomRange as moduleRandomRange,
} from "../src/modules/math.js";
import { createShopPricing as createModuleShopPricing } from "../src/modules/shop-pricing.js";
import { nearestEnemy as moduleNearestEnemy } from "../src/modules/weapon-targeting.js";

const pricingBridge = loadBridge("../src/shop-pricing.js", "src/shop-pricing.js");
const mathBridge = loadBridge("../src/math.js", "src/math.js");
const targetingBridge = loadBridge("../src/weapon-targeting.js", "src/weapon-targeting.js");

const createBridgeShopPricing = pricingBridge.context.TapSurvivorShopPricing?.createShopPricing;
const bridgeMath = mathBridge.context.TapSurvivorMath;
const bridgeTargeting = targetingBridge.context.TapSurvivorWeaponTargeting;

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
