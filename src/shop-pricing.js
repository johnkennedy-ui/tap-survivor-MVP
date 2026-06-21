(() => {
const SHOP_FLOOR_PRICE_RATE = 0.03;
const SHOP_INFLATION_RATE = 0.025;

function createShopPricing({ shopItemDefs, getSave }) {
  function tierFor(item) {
    return getSave().shopPurchases?.[item.id] || 0;
  }

  function costFor(item, tier) {
    const baseCost = Array.isArray(item.cost) ? item.cost[tier] : item.cost;
    const floor = Math.max(1, getSave().towerFloor || 1);
    const floorMultiplier = floor <= 1 ? 1 : 1 + (floor - 1) * SHOP_FLOOR_PRICE_RATE;
    const inflationMultiplier = taperedInflationMultiplier(purchasedTierCount(item.id));
    return Math.ceil(baseCost * floorMultiplier * inflationMultiplier);
  }

  function taperedInflationMultiplier(purchasedTierCount) {
    return 1 + Math.log1p(Math.max(0, purchasedTierCount)) * SHOP_INFLATION_RATE;
  }

  function purchasedTierCount(excludedItemId = "") {
    const purchases = getSave().shopPurchases || {};
    return shopItemDefs.reduce((total, item) => {
      if (item.id === excludedItemId) return total;
      return total + (purchases[item.id] || 0);
    }, 0);
  }

  function canBuy(item) {
    const save = getSave();
    const tier = tierFor(item);
    const cost = costFor(item, tier);
    return tier < item.maxTier && save.coins >= cost;
  }

  return {
    canBuy,
    costFor,
    tierFor,
  };
}

globalThis.TapSurvivorShopPricing = {
  createShopPricing,
};
})();
