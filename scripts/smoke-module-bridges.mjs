import { readFileSync } from "node:fs";
import vm from "node:vm";

import { createShopPricing as createModuleShopPricing } from "../src/modules/shop-pricing.js";

const bridgeSource = readFileSync(new URL("../src/shop-pricing.js", import.meta.url), "utf8");
const bridgeContext = { console };
bridgeContext.globalThis = bridgeContext;
vm.createContext(bridgeContext);
vm.runInContext(bridgeSource, bridgeContext, { filename: "src/shop-pricing.js" });

const createBridgeShopPricing = bridgeContext.TapSurvivorShopPricing?.createShopPricing;

check("module exports createShopPricing", typeof createModuleShopPricing === "function");
check(
  "bridge assigns globalThis.TapSurvivorShopPricing",
  Boolean(bridgeContext.TapSurvivorShopPricing)
);
check("bridge exposes createShopPricing", typeof createBridgeShopPricing === "function");
check("bridge source has generated banner", bridgeSource.startsWith("// GENERATED FILE."));
check(
  "bridge source assigns only the pricing global",
  bridgeSource.includes("globalThis.TapSurvivorShopPricing")
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
