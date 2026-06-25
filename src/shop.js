(() => {
function createShopSystem({
  ui,
  effects,
  shopPricing,
  shopItemDefs,
  pricingConfig,
  getSave,
  getGame,
  onShopVisit,
  onPurchaseNotice,
  playPurchaseSfx,
  persist,
  renderMeta,
}) {
  const pricing = shopPricing.createShopPricing({
    shopItemDefs,
    pricingConfig,
    getSave,
  });

  function canBuy(item) {
    return pricing.canBuy(item);
  }

  function buyItem(item) {
    if (!canBuy(item)) return;
    const save = getSave();
    const tier = pricing.tierFor(item);
    const cost = pricing.costFor(item, tier);
    save.coins -= cost;
    save.shopPurchases[item.id] = tier + 1;
    playPurchaseSfx?.();
    applyItemEffectToRun(item);
    persist();
    renderShop();
    showPurchaseNotice();
    renderMeta();
  }

  function showPurchaseNotice() {
    const message = "eh? The prices went up! Inflation huh.";
    onPurchaseNotice?.(message);
  }

  function applyItemEffectToRun(item) {
    effects.applyShopItemEffectToRun(getGame(), item);
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
      const tier = pricing.tierFor(item);
      const maxed = tier >= item.maxTier;
      const cost = pricing.costFor(item, tier);
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
    const bonuses = effects.emptyShopBonuses();
    shopItemDefs.forEach((item) => {
      const tier = save.shopPurchases?.[item.id] || 0;
      effects.addShopItemBonus(bonuses, item, tier);
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
