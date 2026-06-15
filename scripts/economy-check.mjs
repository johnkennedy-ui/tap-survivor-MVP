import { readContent, readContentSchema, validateContent } from "./content-tools.mjs";

const SHOP_FLOOR_PRICE_RATE = 0.03;
const SHOP_INFLATION_RATE = 0.08;
const COIN_FLOOR_REWARD_RATE = 0.06;
const NORMAL_COIN_BASE_VALUE = 1;
const BOSS_COIN_BASE_VALUE = 12;

const content = readContent();
const schema = readContentSchema();
const shopItems = content.shopItems || [];
const supportedStats = schema.effectRegistries?.shopItem?.stats || [];
const errors = validateContent(content).map((error) => `content validation: ${error}`);
const warnings = [];

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function coinValue(baseValue, towerFloor) {
  const floor = Math.max(1, Math.floor(towerFloor || 1));
  return Math.ceil(baseValue * (1 + (floor - 1) * COIN_FLOOR_REWARD_RATE));
}

function floorPriceMultiplier(towerFloor) {
  const floor = Math.max(1, Math.floor(towerFloor || 1));
  return floor <= 1 ? 1 : 1 + (floor - 1) * SHOP_FLOOR_PRICE_RATE;
}

function inflationMultiplier(purchasedTierCount) {
  return 1 + purchasedTierCount * SHOP_INFLATION_RATE;
}

function itemCosts(item) {
  if (Array.isArray(item.cost)) return item.cost;
  return Array.from({ length: item.maxTier || 1 }, () => item.cost);
}

function itemTierCostAtFloor(item, tier, floor, purchasedTierCount = 0) {
  const costs = itemCosts(item);
  const baseCost = costs[tier];
  return Math.ceil(baseCost * floorPriceMultiplier(floor) * inflationMultiplier(purchasedTierCount));
}

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

const seenIds = new Set();
const statLanes = new Map();
let baseBuyout = 0;

shopItems.forEach((item) => {
  if (seenIds.has(item.id)) addError(`duplicate shop item id ${item.id}`);
  seenIds.add(item.id);

  const maxTier = item.maxTier || 1;
  const costs = itemCosts(item);
  if (costs.length !== maxTier) addError(`${item.id} cost tier count must match maxTier`);
  costs.forEach((cost, index) => {
    if (!Number.isFinite(cost) || cost < 0) addError(`${item.id} cost[${index}] must be a number >= 0`);
    if (index > 0 && cost <= costs[index - 1]) addError(`${item.id} cost[${index}] must be greater than cost[${index - 1}]`);
  });
  baseBuyout += costs.reduce((total, cost) => total + cost, 0);

  if (!item.effect?.stat) return;
  if (!supportedStats.includes(item.effect.stat)) addError(`${item.id} uses unsupported shop stat ${item.effect.stat}`);
  const lane = statLanes.get(item.effect.stat) || [];
  lane.push(item.id);
  statLanes.set(item.effect.stat, lane);
});

statLanes.forEach((ids, stat) => {
  if (ids.length > 1) addWarning(`${stat} has ${ids.length} shop items: ${ids.join(", ")}`);
});

const floorSamples = [1, 50, 100];
const purchaseSamples = [0, 10, 20];
const firstItem = shopItems[0];
const firstItemSamples = firstItem
  ? floorSamples.map((floor) => `${floor}: ${itemTierCostAtFloor(firstItem, 0, floor)} coins`).join(", ")
  : "none";

console.log("# Tap Survivor Economy Check");

console.log("\n## Shop Summary");
console.log(`- shop items: ${shopItems.length}`);
console.log(`- supported stat lanes: ${supportedStats.join(", ") || "none"}`);
console.log(`- used stat lanes: ${[...statLanes.keys()].sort().join(", ") || "none"}`);
console.log(`- base buyout without floor scaling/inflation: ${baseBuyout} coins`);

console.log("\n## Shop Items");
shopItems.forEach((item) => {
  const costs = itemCosts(item);
  const effect = item.effect ? `${item.effect.stat}+${item.effect.value}` : "none";
  console.log(`- ${item.id} | tier ${item.maxTier || 1} | costs ${costs.join(", ")} | ${effect}`);
});

console.log("\n## Scaling Samples");
console.log(`- shop floor price rate: ${formatNumber(SHOP_FLOOR_PRICE_RATE * 100)}% per floor after floor 1`);
console.log(`- shop inflation rate: ${formatNumber(SHOP_INFLATION_RATE * 100)}% per other purchased tier`);
console.log(`- coin reward floor rate: ${formatNumber(COIN_FLOOR_REWARD_RATE * 100)}% per floor after floor 1`);
console.log(`- normal coin value by floor: ${floorSamples.map((floor) => `${floor}: ${coinValue(NORMAL_COIN_BASE_VALUE, floor)}`).join(", ")}`);
console.log(`- boss coin value by floor: ${floorSamples.map((floor) => `${floor}: ${coinValue(BOSS_COIN_BASE_VALUE, floor)}`).join(", ")}`);
console.log(`- ${firstItem?.id || "first item"} tier 1 price by floor: ${firstItemSamples}`);
console.log(`- inflation multipliers: ${purchaseSamples.map((count) => `${count} purchases: x${formatNumber(inflationMultiplier(count))}`).join(", ")}`);

console.log("\n## Warnings");
if (warnings.length) warnings.forEach((warning) => console.log(`- ${warning}`));
else console.log("- none");

console.log("\n## Errors");
if (errors.length) {
  errors.forEach((error) => console.log(`- ${error}`));
  console.log("\nFAIL economy check");
  process.exit(1);
}

console.log("- none");
console.log("\nPASS economy check");
