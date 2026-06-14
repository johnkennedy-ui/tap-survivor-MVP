(() => {
function createShellUiController({
  ui,
  documentRef = document,
  getGame,
  getSave,
  relicDefs = [],
  relicSystem,
  shopSystem,
  startRun,
  exitRun,
  resetSave,
  closeLevelUpMenu,
  closeEndScreen,
  setGameSpeed,
  persist,
  renderMeta,
}) {
  function openRunMenu() {
    ui.runMenu.classList.remove("hidden");
    ui.openMenu.setAttribute("aria-expanded", "true");
    ui.exitRun.disabled = !getGame()?.running;
    const game = getGame();
    if (game?.running && !game.paused) {
      game.paused = true;
      game.pauseReason = "menu";
    }
    showRunMenuTab("progress");
    shopSystem.renderShop();
    renderInventory();
    renderMeta();
  }

  function closeRunMenu(resume = true) {
    ui.runMenu.classList.add("hidden");
    ui.openMenu.setAttribute("aria-expanded", "false");
    const game = getGame();
    if (resume && game?.pauseReason === "menu") {
      game.paused = false;
      game.pauseReason = "";
    }
  }

  function showStartMenu() {
    ui.startMenu.classList.remove("hidden");
  }

  function closeStartMenu() {
    ui.startMenu.classList.add("hidden");
  }

  function toggleRunMenu() {
    if (ui.runMenu.classList.contains("hidden")) {
      openRunMenu();
      return;
    }
    closeRunMenu(true);
  }

  function isFullscreen() {
    return documentRef.fullscreenElement || documentRef.webkitFullscreenElement;
  }

  function updateFullscreenButton() {
    const fullscreen = Boolean(isFullscreen());
    const label = fullscreen ? "Exit Full Screen" : "Full Screen";
    ui.fullscreenButton.textContent = label;
    ui.startMenuFullscreen.textContent = label;
    ui.fullscreenButton.setAttribute("aria-pressed", String(fullscreen));
    ui.startMenuFullscreen.setAttribute("aria-pressed", String(fullscreen));
  }

  function toggleFullscreen() {
    const target = ui.canvas.parentElement || documentRef.documentElement;
    if (isFullscreen()) {
      const exitFullscreen = documentRef.exitFullscreen || documentRef.webkitExitFullscreen;
      const result = exitFullscreen?.call(documentRef);
      result?.catch?.(() => {});
      return;
    }

    const requestFullscreen = target.requestFullscreen || target.webkitRequestFullscreen;
    const result = requestFullscreen?.call(target);
    result?.catch?.(() => {});
  }

  function openShopMenu() {
    closeStartMenu();
    shopSystem.openShop();
  }

  function closeShopMenu() {
    shopSystem.closeShop();
    if (!getGame()?.running) showStartMenu();
  }

  function showRunMenuTab(tab) {
    const shop = tab === "shop";
    const inventory = tab === "inventory";
    ui.menuProgressTab.classList.toggle("active", tab === "progress");
    ui.menuShopTab.classList.toggle("active", shop);
    ui.menuInventoryTab.classList.toggle("active", inventory);
    ui.menuProgressPanel.classList.toggle("hidden", tab !== "progress");
    ui.menuShopPanel.classList.toggle("hidden", !shop);
    ui.menuInventoryPanel.classList.toggle("hidden", !inventory);
    if (shop) shopSystem.renderShop();
    if (inventory) renderInventory();
  }

  function renderInventory() {
    if (!ui.menuRelicSlots || !ui.menuRelicInventory || !relicSystem) return;
    const save = getSave();
    const slots = relicSystem.maxEquippedRelics(save);
    const equipped = new Set(relicSystem.equippedRelics(save).map((relic) => relic.id));
    const unlocked = new Set(save.unlockedRelics || []);
    const nextLevel = slots >= 5 ? null : (slots + 1) * 10;
    ui.menuRelicSlots.textContent = `Relic slots: ${Math.min(equipped.size, slots)}/${slots} unlocked. ${nextLevel ? `Next slot at tower floor ${nextLevel}.` : "Maximum slots unlocked."}`;
    ui.menuRelicInventory.innerHTML = "";
    const availableRelics = relicDefs.filter((relic) => unlocked.has(relic.id));
    if (!availableRelics.length) {
      const empty = documentRef.createElement("div");
      empty.className = "relic-item locked";
      empty.textContent = "No relics unlocked yet. Defeat bosses to add relics here.";
      ui.menuRelicInventory.appendChild(empty);
      return;
    }
    availableRelics.forEach((relic) => {
      const isEquipped = equipped.has(relic.id);
      const canEquip = isEquipped || equipped.size < slots;
      const el = documentRef.createElement("div");
      el.className = `relic-item ${isEquipped ? "equipped" : canEquip ? "available" : "locked"}`;
      el.innerHTML = `
        <img class="relic-icon" src="${relic.iconPath || "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610"}" alt="" />
        <span>
          <strong>${relic.name}</strong>
          <span>${relic.description}</span>
        </span>
      `;
      const button = documentRef.createElement("button");
      button.textContent = isEquipped ? "Unequip" : canEquip ? "Equip" : "Full";
      button.disabled = !isEquipped && !canEquip;
      button.addEventListener("click", () => {
        if (relicSystem.setRelicEquipped(save, relic.id, !isEquipped)) {
          persist?.();
          renderInventory();
          renderMeta();
        }
      });
      el.appendChild(button);
      ui.menuRelicInventory.appendChild(el);
    });
  }

  function bind() {
    ui.startRun.addEventListener("click", startRun);
    ui.startMenuStartRun.addEventListener("click", startRun);
    ui.openShop.addEventListener("click", openShopMenu);
    ui.startMenuOpenShop.addEventListener("click", openShopMenu);
    ui.closeShop.addEventListener("click", closeShopMenu);
    ui.closeShopBottom.addEventListener("click", closeShopMenu);
    ui.openMenu.addEventListener("click", toggleRunMenu);
    ui.closeMenu.addEventListener("click", () => closeRunMenu(true));
    ui.menuProgressTab.addEventListener("click", () => showRunMenuTab("progress"));
    ui.menuShopTab.addEventListener("click", () => showRunMenuTab("shop"));
    ui.menuInventoryTab.addEventListener("click", () => showRunMenuTab("inventory"));
    ui.closeLevelUp.addEventListener("click", closeLevelUpMenu);
    ui.fullscreenButton.addEventListener("click", toggleFullscreen);
    ui.startMenuFullscreen.addEventListener("click", toggleFullscreen);
    ui.exitRun.addEventListener("click", exitRun);
    ui.resetSave.addEventListener("click", resetSave);
    ui.closeEnd.addEventListener("click", closeEndScreen);
    ui.closeEndX.addEventListener("click", closeEndScreen);
    documentRef.addEventListener?.("fullscreenchange", updateFullscreenButton);
    documentRef.addEventListener?.("webkitfullscreenchange", updateFullscreenButton);
    ui.speedButtons.forEach((button) => {
      button.addEventListener("click", () => setGameSpeed(Number(button.dataset.speed)));
    });
    updateFullscreenButton();
  }

  return {
    bind,
    closeRunMenu,
    closeShopMenu,
    closeStartMenu,
    showStartMenu,
  };
}

globalThis.TapSurvivorShellUi = {
  createShellUiController,
};
})();
