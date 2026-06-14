(() => {
function createShopSystem({
  ui,
  shopItemDefs,
  getSave,
  getGame,
  persist,
  renderMeta,
}) {
  function tierFor(item) {
    return getSave().shopPurchases?.[item.id] || 0;
  }

  function costFor(item, tier) {
    return Array.isArray(item.cost) ? item.cost[tier] : item.cost;
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
    renderMeta();
  }

  function applyItemEffectToRun(item) {
    const game = getGame();
    const player = game?.player;
    if (!game?.running || !player || !item.effect) return;
    if (item.effect.stat === "speed") player.speed += item.effect.value;
    if (item.effect.stat === "pickupRadius") player.pickupRadius += item.effect.value;
    if (item.effect.stat === "maxHp") {
      player.maxHp += item.effect.value;
      player.hp += item.effect.value;
    }
  }

  function renderShop() {
    const save = getSave();
    ui.shopCoinHud.textContent = `Coins: ${save.coins}`;
    ui.shopItems.innerHTML = "";
    if (!shopItemDefs.length) {
      const empty = document.createElement("div");
      empty.className = "shop-item";
      empty.textContent = "No shop items yet.";
      ui.shopItems.appendChild(empty);
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
        ${item.spritePath ? `<img class="shop-item-sprite" src="${item.spritePath}" alt="" />` : ""}
        <div>
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
      ui.shopItems.appendChild(el);
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
    const bonuses = {
      speed: 0,
      pickupRadius: 0,
      maxHp: 0,
      flatDamage: 0,
      attackRadius: 0,
      fireRate: 0,
      percentDamage: 0,
      relicFocus: 0,
    };
    shopItemDefs.forEach((item) => {
      const tier = save.shopPurchases?.[item.id] || 0;
      if (!item.effect || !Object.prototype.hasOwnProperty.call(bonuses, item.effect.stat)) return;
      bonuses[item.effect.stat] += item.effect.value * tier;
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
