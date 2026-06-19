(() => {
const SHOP_FLOOR_PRICE_RATE = 0.03;
const SHOP_INFLATION_RATE = 0.025;

function createShopSystem({
  ui,
  shopItemDefs,
  getSave,
  getGame,
  onShopVisit,
  persist,
  renderMeta,
}) {
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

  function buyItem(item) {
    if (!canBuy(item)) return;
    const save = getSave();
    const tier = tierFor(item);
    const cost = costFor(item, tier);
    save.coins -= cost;
    save.shopPurchases[item.id] = tier + 1;
    applyItemEffectToRun(item);
    persist();
    renderShop();
    showInflationNotice();
    renderMeta();
  }

  function showInflationNotice() {
    const message = "eh? The prices went up! Inflation huh.";
    [ui.shopNotice, ui.menuShopNotice].forEach((notice) => {
      if (notice) notice.textContent = message;
    });
  }

  function applyItemEffectToRun(item) {
    globalThis.TapSurvivorEffects.applyShopItemEffectToRun(getGame(), item);
  }

  function renderShop() {
    const save = getSave();
    if (isShopVisible()) onShopVisit?.();
    renderShopList(ui.shopItems, ui.shopCoinHud, save);
    renderShopList(ui.menuShopItems, ui.menuShopCoinHud, save);
  }

  function isShopVisible() {
    return !ui.shopModal?.classList.contains("hidden") || !ui.menuShopPanel?.classList.contains("hidden");
  }

  function renderShopList(container, coinHud, save) {
    if (!container || !coinHud) return;
    coinHud.textContent = `Coins: ${save.coins} | Tower Floor ${Math.max(1, save.towerFloor || 1)}`;
    container.innerHTML = "";
    if (!shopItemDefs.length) {
      const empty = document.createElement("div");
      empty.className = "shop-item";
      empty.textContent = "No shop items yet.";
      container.appendChild(empty);
      return;
    }

    shopItemDefs.forEach((item) => {
      const tier = tierFor(item);
      const maxed = tier >= item.maxTier;
      const cost = costFor(item, tier);
      const affordable = !maxed && save.coins >= cost;
      const el = document.createElement("div");
      el.className = `shop-item ${affordable ? "available" : "locked"}`;
      el.innerHTML = `
        <div class="shop-item-icon">
          ${item.spritePath ? `<img class="shop-item-sprite" src="${item.spritePath}" alt="" />` : ""}
        </div>
        <div class="shop-item-copy">
          <strong>${item.name}</strong>
          <span>${item.description}</span><br />
          <span>Tier: ${tier}/${item.maxTier}</span><br />
          <span>${maxed ? "Maxed" : affordable ? `Cost: ${cost} coins` : `Needs ${cost} coins`}</span>
        </div>
      `;
      const button = document.createElement("button");
      button.textContent = maxed ? "Maxed" : `Buy Tier ${tier + 1}`;
      button.disabled = maxed || !affordable;
      button.addEventListener("click", () => buyItem(item));
      el.appendChild(button);
      container.appendChild(el);
    });
  }

  function openShop() {
    ui.shopModal.classList.remove("hidden");
    const game = getGame();
    if (game?.running && !game.paused) {
      game.paused = true;
      game.pauseReason = "shop";
    }
    renderShop();
  }

  function closeShop() {
    ui.shopModal.classList.add("hidden");
    const game = getGame();
    if (game?.pauseReason === "shop") {
      game.paused = false;
      game.pauseReason = "";
    }
  }

  function getShopBonuses() {
    const save = getSave();
    const bonuses = globalThis.TapSurvivorEffects.emptyShopBonuses();
    shopItemDefs.forEach((item) => {
      const tier = save.shopPurchases?.[item.id] || 0;
      globalThis.TapSurvivorEffects.addShopItemBonus(bonuses, item, tier);
    });
    return bonuses;
  }

  return {
    closeShop,
    getShopBonuses,
    openShop,
    renderShop,
  };
}

globalThis.TapSurvivorShop = {
  createShopSystem,
};
})();
