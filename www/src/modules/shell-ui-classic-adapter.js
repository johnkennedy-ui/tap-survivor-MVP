import { createShellUiController as createModuleShellUiController } from "./shell-ui-controller.js";

/**
 * Classic production shell UI adapter.
 *
 * Keeps the legacy dependency-bag and returned API shape while routing shell
 * state through the module-native controller.
 *
 * @param {any} options
 */
export function createShellUiController({
  ui,
  assets,
  content = {},
  shellRelicUi,
  documentRef = document,
  scheduler = {
    clearTimeout: (timer) => clearTimeout(timer),
    setTimeout: (callback, delay) => setTimeout(callback, delay),
  },
  getGame,
  getSave,
  weaponDefs = {},
  relicDefs = [],
  relicSystem,
  shopSystem,
  startRun,
  exitRun,
  resetSave,
  closeLevelUpMenu,
  closeEndScreen,
  setGameSpeed,
  playStartLaugh,
  toggleAudioMute,
  isAudioMuted,
  persist,
  renderMeta,
}) {
  const assetResolver = assets?.createAssetResolver?.(content) || {
    relicIcon: (relic) =>
      relic?.iconPath || content?.assets?.sprites?.ui?.quest || "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610",
    runUpgradeSprite: (upgradeId) => content?.assets?.sprites?.runUpgrades?.[upgradeId],
    spriteSource: (definition) =>
      typeof definition === "string" ? definition : definition?.src || definition?.path || definition?.iconSrc || "",
  };
  const relicUi = shellRelicUi.createShellRelicUi({
    ui,
    content,
    documentRef,
    assetResolver,
    getSave,
    relicDefs,
    relicSystem,
    persist,
    renderMeta,
  });
  const moduleController = createModuleShellUiController({
    getSave,
    shellRelicController: {
      dispose() {},
      render: () => renderInventory(),
      selectRelic() {},
      update: () => renderInventory(),
    },
    shellView: {
      dispose() {},
      render() {},
      setMenuOpen() {},
      setScreen() {},
      showPanel() {},
      update() {},
    },
  });
  moduleController.init();

  let currentScreen = "title";
  /** @type {ReturnType<typeof setTimeout> | null} */
  let startTransitionTimer = null;

  function openRunMenu() {
    if (currentScreen === "startingTransition") return;
    moduleController.openMenu("progress");
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
    moduleController.closeMenu();
    ui.runMenu.classList.add("hidden");
    ui.openMenu.setAttribute("aria-expanded", "false");
    const game = getGame();
    if (resume && game?.pauseReason === "menu") {
      game.paused = false;
      game.pauseReason = "";
    }
  }

  function showTitleScreen() {
    moduleController.render({ screen: "title" });
    ui.titleScreen?.classList.remove("hidden");
    ui.startTransition?.classList.add("hidden");
    currentScreen = "title";
  }

  function closeStartFlow() {
    moduleController.render({ screen: "game" });
    ui.titleScreen?.classList.add("hidden");
    ui.startTransition?.classList.add("hidden");
    currentScreen = "game";
  }

  function startGameFromTitle() {
    if (currentScreen !== "title") return;
    playStartLaugh?.();
    moduleController.render({ screen: "startingTransition" });
    currentScreen = "startingTransition";
    ui.titleScreen?.classList.add("hidden");
    ui.startTransition?.classList.remove("hidden");
    if (startTransitionTimer) scheduler.clearTimeout(startTransitionTimer);
    startTransitionTimer = scheduler.setTimeout(() => {
      startTransitionTimer = null;
      moduleController.startRun();
      startRun();
    }, 450);
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
    ui.fullscreenButton.setAttribute("aria-pressed", String(fullscreen));
  }

  function toggleFullscreen() {
    moduleController.toggleFullscreen();
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
    moduleController.openShop();
    closeStartFlow();
    shopSystem.openShop();
  }

  function closeShopMenu() {
    moduleController.closeShop();
    shopSystem.closeShop();
    if (!getGame()?.running) showTitleScreen();
  }

  function showRunMenuTab(tab) {
    moduleController.openPanel(tab);
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
    relicUi.renderInventory();
    renderStartingWeaponSelector();
  }

  function renderStartingWeaponSelector() {
    if (!ui.menuRelicInventory || !ui.menuRelicSlots) return;
    const save = getSave();
    const availableWeapons = (save.unlockedWeapons || [])
      .filter((weaponId) => weaponDefs[weaponId])
      .map((weaponId) => ({ id: weaponId, ...weaponDefs[weaponId] }));
    if (!availableWeapons.length) return;
    if (!availableWeapons.some((weapon) => weapon.id === save.selectedStartingWeapon)) {
      save.selectedStartingWeapon = "spark_bolt";
    }

    const panel = documentRef.createElement("div");
    panel.className = "relic-item available starting-weapon-panel";
    const copy = documentRef.createElement("span");
    copy.innerHTML = `
      <strong>MVP starting weapon</strong>
      <span>Choose the first weapon for your next run.</span>
    `;

    const select = documentRef.createElement("select");
    select.className = "starting-weapon-select";
    select.setAttribute("aria-label", "Starting weapon for next run");
    availableWeapons.forEach((weapon) => {
      const option = documentRef.createElement("option");
      option.value = weapon.id;
      option.textContent = weapon.name || weapon.id;
      select.appendChild(option);
    });
    select.value = save.selectedStartingWeapon || "spark_bolt";
    select.addEventListener("change", () => {
      const nextWeaponId = select.value;
      if (!weaponDefs[nextWeaponId] || !(save.unlockedWeapons || []).includes(nextWeaponId)) return;
      save.selectedStartingWeapon = nextWeaponId;
      persist?.();
      renderMeta();
    });

    panel.appendChild(copy);
    panel.appendChild(select);
    ui.menuRelicInventory.prepend?.(panel) || ui.menuRelicInventory.appendChild(panel);
  }

  function bind() {
    ui.titleStartGame?.addEventListener("click", startGameFromTitle);
    ui.openShop?.addEventListener("click", openShopMenu);
    ui.closeShop.addEventListener("click", closeShopMenu);
    ui.closeShopBottom.addEventListener("click", closeShopMenu);
    ui.openMenu.addEventListener("click", toggleRunMenu);
    ui.closeMenu.addEventListener("click", () => closeRunMenu(true));
    ui.menuProgressTab.addEventListener("click", () => showRunMenuTab("progress"));
    ui.menuShopTab.addEventListener("click", () => showRunMenuTab("shop"));
    ui.menuInventoryTab.addEventListener("click", () => showRunMenuTab("inventory"));
    ui.closeLevelUp.addEventListener("click", closeLevelUpMenu);
    ui.fullscreenButton.addEventListener("click", toggleFullscreen);
    ui.exitRun.addEventListener("click", () => {
      moduleController.exitRun();
      exitRun();
    });
    ui.resetSave?.addEventListener("click", () => {
      moduleController.resetSave();
      resetSave();
    });
    ui.closeEnd.addEventListener("click", closeEndScreen);
    ui.closeEndX.addEventListener("click", closeEndScreen);
    documentRef.addEventListener?.("fullscreenchange", updateFullscreenButton);
    documentRef.addEventListener?.("webkitfullscreenchange", updateFullscreenButton);
    ui.speedButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const speed = Number(button.dataset.speed);
        moduleController.setGameSpeed(speed);
        setGameSpeed(speed);
      });
    });
    ui.muteAudio?.addEventListener("click", () => {
      moduleController.toggleMute();
      updateMuteButton(toggleAudioMute?.());
    });
    updateMuteButton(isAudioMuted?.());
    updateFullscreenButton();
  }

  function updateMuteButton(muted = false) {
    if (!ui.muteAudio) return;
    ui.muteAudio.classList.toggle("active", Boolean(muted));
    ui.muteAudio.textContent = muted ? "Muted" : "Sound";
    ui.muteAudio.setAttribute("aria-pressed", String(Boolean(muted)));
  }

  return {
    bind,
    closeStartFlow,
    closeRunMenu,
    closeShopMenu,
    startGameFromTitle,
    showTitleScreen,
  };
}
