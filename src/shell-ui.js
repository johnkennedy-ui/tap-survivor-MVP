(() => {
function createShellUiController({
  ui,
  documentRef = document,
  getGame,
  shopSystem,
  startRun,
  exitRun,
  resetSave,
  closeLevelUpMenu,
  closeEndScreen,
  setGameSpeed,
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
    ui.menuProgressTab.classList.toggle("active", !shop);
    ui.menuShopTab.classList.toggle("active", shop);
    ui.menuProgressPanel.classList.toggle("hidden", shop);
    ui.menuShopPanel.classList.toggle("hidden", !shop);
    if (shop) shopSystem.renderShop();
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
