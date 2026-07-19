// GENERATED FILE. Do not edit directly.
// Source: src/modules/game-dependencies.js
// Run: npm run build:bridges
(() => {
  "use strict";

  const MODULE_NATIVE_SHOP_SLOTS = Object.freeze(["shop"]);

  const MODULE_NATIVE_SHOP_PROOF_SLOTS = Object.freeze(["createShopSystem"]);

  /**
   * @param {any} [options]
   */
  function createShopSystem(options = {}) {
    const resolvedOptions = requireObject(options, "options");
    const documentRef = requireDocumentRef(resolvedOptions.documentRef);
    const ui = requireObject(resolvedOptions.ui, "ui");
    const effects = requireObject(resolvedOptions.effects, "effects");
    const shopPricing = requireObject(resolvedOptions.shopPricing, "shopPricing");
    const shopItemDefs = requireArray(resolvedOptions.shopItemDefs, "shopItemDefs");
    const getSave = requireFunction(resolvedOptions.getSave, "getSave");
    const getGame = requireFunction(resolvedOptions.getGame, "getGame");
    const persist = requireFunction(resolvedOptions.persist, "persist");
    const renderMeta = requireFunction(resolvedOptions.renderMeta, "renderMeta");
    const pricing = shopPricing.createShopPricing({
      shopItemDefs,
      pricingConfig: resolvedOptions.pricingConfig,
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
      resolvedOptions.playPurchaseSfx?.();
      applyItemEffectToRun(item);
      persist();
      renderShop();
      showPurchaseNotice();
      renderMeta();
    }

    function showPurchaseNotice() {
      const message = "eh? The prices went up! Inflation huh.";
      resolvedOptions.onPurchaseNotice?.(message);
    }

    function applyItemEffectToRun(item) {
      effects.applyShopItemEffectToRun(getGame(), item);
    }

    function renderShop() {
      const save = getSave();
      if (isShopVisible()) resolvedOptions.onShopVisit?.();
      renderShopList(ui.shopItems, ui.shopCoinHud, save);
      renderShopList(ui.menuShopItems, ui.menuShopCoinHud, save);
      const notice = "Browser shop ready.";
      if (ui.shopNotice && !ui.shopNotice.textContent) ui.shopNotice.textContent = notice;
      if (ui.menuShopNotice && !ui.menuShopNotice.textContent) ui.menuShopNotice.textContent = notice;
    }

    function isShopVisible() {
      return !ui.shopModal?.classList.contains("hidden") || !ui.menuShopPanel?.classList.contains("hidden");
    }

    function renderShopList(container, coinHud, save) {
      if (!container || !coinHud) return;
      coinHud.textContent = `Coins: ${save.coins} | Tower Floor ${Math.max(1, save.towerFloor || 1)}`;
      container.innerHTML = "";
      if (!shopItemDefs.length) {
        const empty = documentRef.createElement("div");
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
        const el = documentRef.createElement("div");
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
        const button = documentRef.createElement("button");
        button.textContent = maxed ? "Maxed" : `Buy Tier ${tier + 1}`;
        button.disabled = maxed || !affordable;
        button.addEventListener("click", () => buyItem(item));
        el.appendChild(button);
        container.appendChild(el);
      });
    }

    function openShop() {
      ui.shopModal.classList.remove("hidden");
      ui.menuShopPanel?.classList.remove("hidden");
      const game = getGame();
      if (game?.running && !game.paused) {
        game.paused = true;
        game.pauseReason = "shop";
      }
      renderShop();
    }

    function closeShop() {
      ui.shopModal.classList.add("hidden");
      ui.menuShopPanel?.classList.add("hidden");
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

  function requireArray(value, name) {
    if (!Array.isArray(value)) {
      throw new Error(`Missing Tap Survivor native shop dependency: ${name}`);
    }
    return value;
  }

  function requireDocumentRef(value) {
    if (!value || typeof value.createElement !== "function") {
      throw new Error("Missing Tap Survivor native shop dependency: documentRef");
    }
    return value;
  }

  function requireFunction(value, name) {
    if (typeof value !== "function") {
      throw new Error(`Missing Tap Survivor native shop dependency: ${name}`);
    }
    return value;
  }

  function requireObject(value, name) {
    if (!value || typeof value !== "object") {
      throw new Error(`Missing Tap Survivor native shop dependency: ${name}`);
    }
    return value;
  }

  function createGameDependencyBag({ globalRef, documentRef = globalRef?.document }) {
    return {
      audio: requireGlobal(globalRef, "TapSurvivorAudio"),
      assets: globalRef.TapSurvivorAssets || {},
      balance: requireGlobal(globalRef, "TapSurvivorBalance"),
      balanceRuntime: globalRef.TapSurvivorBalanceRuntime,
      combat: requireGlobal(globalRef, "TapSurvivorCombat"),
      combatDamage: requireGlobal(globalRef, "TapSurvivorCombatDamage"),
      content: globalRef.TapSurvivorBalanceRuntime?.content?.() || globalRef.TapSurvivorContent || {},
      contentRegistry: requireGlobal(globalRef, "TapSurvivorContentRegistry"),
      debug: requireGlobal(globalRef, "TapSurvivorDebug"),
      debugBalance: globalRef.TapSurvivorDebugBalance,
      effects: requireGlobal(globalRef, "TapSurvivorEffects"),
      enemies: requireGlobal(globalRef, "TapSurvivorEnemies"),
      enemyBehaviors: requireGlobal(globalRef, "TapSurvivorEnemyBehaviors"),
      enemySpawning: requireGlobal(globalRef, "TapSurvivorEnemySpawning"),
      gameBanners: requireGlobal(globalRef, "TapSurvivorGameBanners"),
      gameRuntime: requireGlobal(globalRef, "TapSurvivorGameRuntime"),
      input: {
        bindMovementInput: requireFunction(
          globalRef?.TapSurvivorInput?.bindMovementInput,
          "globalThis.TapSurvivorInput.bindMovementInput"
        ),
      },
      levelUp: requireGlobal(globalRef, "TapSurvivorLevelUp"),
      levelUpChoices: requireGlobal(globalRef, "TapSurvivorLevelUpChoices"),
      mapSystem: requireGlobal(globalRef, "TapSurvivorMapSystem"),
      math: requireGlobal(globalRef, "TapSurvivorMath"),
      pickups: requireGlobal(globalRef, "TapSurvivorPickups"),
      progression: requireGlobal(globalRef, "TapSurvivorProgression"),
      quests: requireGlobal(globalRef, "TapSurvivorQuests"),
      relics: requireGlobal(globalRef, "TapSurvivorRelics"),
      renderEnemies: requireGlobal(globalRef, "TapSurvivorRenderEnemies"),
      renderHud: requireGlobal(globalRef, "TapSurvivorRenderHud"),
      renderSkillRail: requireGlobal(globalRef, "TapSurvivorRenderSkillRail"),
      rendering: requireGlobal(globalRef, "TapSurvivorRendering"),
      runLifecycle: requireGlobal(globalRef, "TapSurvivorRunLifecycle"),
      runState: requireGlobal(globalRef, "TapSurvivorRunState"),
      runUi: requireGlobal(globalRef, "TapSurvivorRunUi"),
      runUpdate: requireGlobal(globalRef, "TapSurvivorRunUpdate"),
      save: requireGlobal(globalRef, "TapSurvivorSave"),
      saveCorruption: requireGlobal(globalRef, "TapSurvivorSaveCorruption"),
      saveDefaults: requireGlobal(globalRef, "TapSurvivorSaveDefaults"),
      saveMigrations: requireGlobal(globalRef, "TapSurvivorSaveMigrations"),
      saveNormalize: requireGlobal(globalRef, "TapSurvivorSaveNormalize"),
      shellRelicUi: requireGlobal(globalRef, "TapSurvivorShellRelicUi"),
      shellUi: requireGlobal(globalRef, "TapSurvivorShellUi"),
      shop: {
        createShopSystem: (options = {}) =>
          createShopSystem({
            ...options,
            documentRef: options.documentRef || documentRef,
          }),
      },
      shopPricing: requireGlobal(globalRef, "TapSurvivorShopPricing"),
      sprites: requireGlobal(globalRef, "TapSurvivorSprites"),
      storage: requireGlobal(globalRef, "TapSurvivorStorage"),
      ui: requireGlobal(globalRef, "TapSurvivorUi"),
      uiProgression: requireGlobal(globalRef, "TapSurvivorUiProgression"),
      upgrades: globalRef.TapSurvivorUpgrades || {},
      weaponBehaviors: requireGlobal(globalRef, "TapSurvivorWeaponBehaviors"),
      weaponCooldowns: requireGlobal(globalRef, "TapSurvivorWeaponCooldowns"),
      weaponFire: requireGlobal(globalRef, "TapSurvivorWeaponFire"),
      weaponProjectiles: requireGlobal(globalRef, "TapSurvivorWeaponProjectiles"),
      weaponTargeting: requireGlobal(globalRef, "TapSurvivorWeaponTargeting"),
    };
  }

  function requireGlobal(globalRef, name) {
    const value = globalRef?.[name];
    if (!value) {
      throw new Error(`Missing Tap Survivor runtime dependency: globalThis.${name}`);
    }
    return value;
  }

  function requireFunction(value, name) {
    if (typeof value !== "function") {
      throw new Error(`Missing Tap Survivor runtime dependency: ${name}`);
    }
    return value;
  }

  globalThis.TapSurvivorGameDependencies = {
    createGameDependencyBag,
  };
})();
