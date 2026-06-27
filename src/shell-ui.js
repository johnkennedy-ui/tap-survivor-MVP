// GENERATED FILE. Do not edit directly.
// Source: src/modules/shell-ui-classic-adapter.js
// Run: npm run build:bridges
(() => {
  "use strict";

  const DEFAULT_PANELS = [
    { id: "progress", label: "Progress", type: "progress" },
    { id: "shop", label: "Shop", type: "shop" },
    { id: "inventory", label: "Inventory", type: "relics" },
  ];

  /**
   * Builds deterministic shell UI view models without touching DOM state.
   *
   * @param {any} [options]
   */
  function createShellUiPresenter(options = {}) {
    const { panelDefs = DEFAULT_PANELS } = options;
    const normalizedPanels = normalizePanelDefs(panelDefs);

    function createShellViewModel(state = {}) {
      const panelIds = new Set(normalizedPanels.map((panel) => panel.id));
      const activePanel = panelIds.has(state.panel) ? state.panel : normalizedPanels[0]?.id || "progress";
      const screen = state.screen || "title";
      const menuOpen = Boolean(state.menuOpen);
      const initialized = Boolean(state.initialized);
      const disposed = Boolean(state.disposed);
      const startingTransition = screen === "startingTransition";
      const panels = normalizedPanels.map((panel) => ({
        ...panel,
        active: panel.id === activePanel,
        ariaSelected: panel.id === activePanel ? "true" : "false",
        className: panel.id === activePanel ? "active" : "",
        hidden: panel.id !== activePanel,
      }));

      return {
        activePanel,
        actions: {
          canExitRun: Boolean(state.canExitRun ?? screen === "game"),
          canOpenMenu: !disposed,
          canStartRun: Boolean(state.canStartRun ?? screen === "title"),
          fullscreenLabel: state.fullscreen ? "Exit Full Screen" : "Full Screen",
          muteLabel: state.muted ? "Muted" : "Sound",
          muted: Boolean(state.muted),
          openMenuExpanded: String(menuOpen),
        },
        disposed,
        initialized,
        menuOpen,
        panels,
        screen,
        sections: Object.fromEntries(
          panels.map((panel) => [
            panel.id,
            {
              active: panel.active,
              className: ["module-shell-panel", panel.active ? "active" : "hidden"].filter(Boolean).join(" "),
              hidden: panel.hidden,
              label: panel.label,
              text: sectionCopy(panel),
              type: panel.type,
            },
          ])
        ),
        startTransitionVisible: startingTransition,
        titleVisible: screen === "title",
        visible: {
          runMenu: menuOpen,
          startTransition: startingTransition,
          title: screen === "title",
        },
      };
    }

    return {
      createShellViewModel,
    };
  }

  function sectionCopy(panel) {
    if (panel.type === "relics") return "Relic inventory";
    if (panel.type === "shop") return "Shop panel";
    return "Progress panel";
  }

  function normalizePanelDefs(panelDefs) {
    const seen = new Set();
    return panelDefs
      .filter((panel) => panel?.id && !seen.has(panel.id))
      .map((panel) => {
        seen.add(panel.id);
        return {
          id: String(panel.id),
          label: String(panel.label || panel.id),
          type: String(panel.type || panel.id),
        };
      });
  }

  /**
   * Applies shell UI presenter models to injected DOM dependencies.
   *
   * @param {any} [options]
   */
  function createShellUiDomAdapter(options = {}) {
    const {
      presenter = createShellUiPresenter(),
      documentRef,
      root,
      shellRelicController,
      getSave = () => ({}),
      onCloseMenu,
      onExitRun,
      onMuteToggle,
      onOpenPanel,
      onOpenShop,
      onResetSave,
      onSetGameSpeed,
      onToggleFullscreen,
      onStartRun,
      speedOptions = [1, 2, 5],
    } = options;

    if (!presenter || typeof presenter.createShellViewModel !== "function") {
      throw new Error("Missing Tap Survivor module shell UI adapter dependency: presenter");
    }
    if (!documentRef || typeof documentRef.createElement !== "function") {
      throw new Error("Missing Tap Survivor module shell UI adapter dependency: documentRef");
    }
    if (!root || typeof root.appendChild !== "function") {
      throw new Error("Missing Tap Survivor module shell UI adapter dependency: root");
    }

    let currentModel = null;
    const eventCleanups = [];

    function render(state = {}) {
      cleanupEvents();
      currentModel = presenter.createShellViewModel(state);
      clearRoot(root);
      root.appendChild(createShellFrame(currentModel));
      if (currentModel.activePanel === "inventory") shellRelicController?.render?.(getSave());
      return currentModel;
    }

    function update(state = {}) {
      return render(state);
    }

    function openPanel(panelId, state = {}) {
      onOpenPanel?.(panelId, currentModel);
      return render({ ...state, panel: panelId, menuOpen: true });
    }

    function dispose() {
      cleanupEvents();
      clearRoot(root);
    }

    function setMenuOpen(open, state = {}) {
      return render({ ...state, menuOpen: Boolean(open) });
    }

    function setScreen(screen, state = {}) {
      return render({ ...state, screen });
    }

    function showPanel(panelId, state = {}) {
      return openPanel(panelId, state);
    }

    function createShellFrame(model) {
      const frame = documentRef.createElement("section");
      frame.className = "module-shell-frame";
      frame.dataset.screen = model.screen;
      frame.dataset.activePanel = model.activePanel;

      appendText(frame, "strong", model.titleVisible ? "Tap Survivor" : "Run Menu", {
        className: "module-shell-title",
      });

      const actions = documentRef.createElement("div");
      actions.className = "module-shell-actions";
      const startButton = documentRef.createElement("button");
      startButton.type = "button";
      startButton.textContent = "Start Run";
      startButton.dataset.action = "start-run";
      startButton.disabled = !model.actions.canStartRun;
      addListener(startButton, "click", () => {
        if (!startButton.disabled) onStartRun?.(model);
      });
      actions.appendChild(startButton);

      const openMenuButton = createActionButton("open-menu", "Menu", () => onOpenPanel?.(model.activePanel, model));
      openMenuButton.setAttribute("aria-expanded", model.actions.openMenuExpanded);
      actions.appendChild(openMenuButton);
      actions.appendChild(createActionButton("close-menu", "Close", () => onCloseMenu?.(model)));
      actions.appendChild(createActionButton("open-shop", "Shop", () => onOpenShop?.(model)));
      actions.appendChild(createActionButton("exit-run", "Exit Run", () => onExitRun?.(model), !model.actions.canExitRun));
      actions.appendChild(createActionButton("reset-save", "Reset Save", () => onResetSave?.(model)));
      actions.appendChild(createActionButton("fullscreen", model.actions.fullscreenLabel, () => onToggleFullscreen?.(model)));
      const muteButton = createActionButton("mute", model.actions.muteLabel, () => onMuteToggle?.(model));
      muteButton.setAttribute("aria-pressed", String(model.actions.muted));
      actions.appendChild(muteButton);
      speedOptions.forEach((speed) => {
        const speedButton = createActionButton(`speed-${speed}`, `x${speed}`, () => onSetGameSpeed?.(speed, model));
        speedButton.dataset.speed = String(speed);
        actions.appendChild(speedButton);
      });
      frame.appendChild(actions);

      const tabs = documentRef.createElement("nav");
      tabs.className = "module-shell-tabs";
      model.panels.forEach((panel) => {
        const tab = documentRef.createElement("button");
        tab.type = "button";
        tab.textContent = panel.label;
        tab.className = panel.active ? "active" : "";
        tab.dataset.panelId = panel.id;
        tab.setAttribute("aria-selected", panel.ariaSelected);
        addListener(tab, "click", () => openPanel(panel.id, model));
        tabs.appendChild(tab);
      });
      frame.appendChild(tabs);

      const panels = documentRef.createElement("div");
      panels.className = "module-shell-panels";
      model.panels.forEach((panel) => {
        const section = documentRef.createElement("section");
        const sectionModel = model.sections[panel.id];
        section.className = sectionModel.className;
        section.dataset.panelId = panel.id;
        section.dataset.sectionType = panel.type;
        section.hidden = sectionModel.hidden;
        appendText(section, "h2", panel.label);
        appendText(section, "span", sectionModel.text);
        if (panel.type === "relics") {
          const mount = documentRef.createElement("div");
          mount.className = "module-shell-relic-mount";
          mount.dataset.delegate = "shell-relic-controller";
          section.appendChild(mount);
        }
        panels.appendChild(section);
      });
      frame.appendChild(panels);
      return frame;
    }

    function appendText(parent, tagName, text, options = {}) {
      const element = documentRef.createElement(tagName);
      element.textContent = text;
      if (options.className) element.className = options.className;
      parent.appendChild(element);
      return element;
    }

    function createActionButton(action, label, callback, disabled = false) {
      const button = documentRef.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.dataset.action = action;
      button.disabled = Boolean(disabled);
      addListener(button, "click", () => {
        if (!button.disabled) callback?.();
      });
      return button;
    }

    function addListener(element, type, handler) {
      element.addEventListener(type, handler);
      eventCleanups.push(() => element.removeEventListener?.(type, handler));
    }

    function cleanupEvents() {
      while (eventCleanups.length) eventCleanups.pop()?.();
    }

    return {
      dispose,
      openPanel,
      render,
      setMenuOpen,
      setScreen,
      showPanel,
      update,
    };
  }

  function clearRoot(root) {
    if (typeof root.replaceChildren === "function") root.replaceChildren();
    else root.children = [];
    if ("textContent" in root) root.textContent = "";
  }

  /**
   * Owns only the module-native shell UI lifecycle contract.
   *
   * Production shell-ui DOM wiring stays classic for now; this controller is the
   * module-native seam for future ownership handoff.
   *
   * @param {any} [options]
   */
  function createModuleShellUiController(options = {}) {
    const {
      shellRelicController,
      getSave = () => ({}),
      shellView,
      presenter = createShellUiPresenter(),
      createShellView = createShellUiDomAdapter,
      documentRef,
      root,
      initialScreen = "title",
      initialPanel = "progress",
      onStartRun,
      onExitRun,
      onResetSave,
      onOpenShop,
      onCloseShop,
      onSetGameSpeed,
    } = options;

    if (!shellRelicController || typeof shellRelicController.render !== "function") {
      throw new Error("Missing Tap Survivor module shell UI dependency: shellRelicController");
    }
    if (!presenter || typeof presenter.createShellViewModel !== "function") {
      throw new Error("Missing Tap Survivor module shell UI dependency: presenter");
    }

    const viewOwnsRelicPanel = Boolean(!shellView && documentRef && root);
    const view =
      shellView ||
      (documentRef && root
        ? createShellView({
            documentRef,
            getSave,
            onCloseMenu: () => closeMenu(),
            onExitRun: () => exitRun(),
            onMuteToggle: () => toggleMute(),
            onOpenPanel: (panel) => {
              state = {
                ...state,
                menuOpen: true,
                panel,
              };
              options.onOpenPanel?.(panel, snapshot());
            },
            onOpenShop: () => openShop(),
            onResetSave: () => resetSave(),
            onSetGameSpeed: (speed) => setGameSpeed(speed),
            onStartRun: () => startRun(),
            onToggleFullscreen: () => toggleFullscreen(),
            presenter,
            root,
            shellRelicController,
          })
        : {});

    let state = {
      disposed: false,
      initialized: false,
      menuOpen: false,
      panel: initialPanel,
      screen: initialScreen,
    };

    function init(nextState = {}) {
      state = {
        ...state,
        ...nextState,
        initialized: true,
      };
      return render();
    }

    function render(nextState = {}) {
      state = {
        ...state,
        ...nextState,
      };
      view.render?.(snapshot());
      if (state.panel === "inventory" && !viewOwnsRelicPanel) shellRelicController.render(getSave());
      return snapshot();
    }

    function update(nextState = {}) {
      state = {
        ...state,
        ...nextState,
      };
      view.update?.(snapshot());
      if (state.panel === "inventory" && !viewOwnsRelicPanel) shellRelicController.update?.(getSave());
      return snapshot();
    }

    function openMenu(panel = state.panel) {
      state = {
        ...state,
        menuOpen: true,
      };
      view.setMenuOpen?.(true, snapshot());
      return openPanel(panel);
    }

    function closeMenu() {
      state = {
        ...state,
        menuOpen: false,
      };
      view.setMenuOpen?.(false, snapshot());
      return snapshot();
    }

    function openPanel(panel) {
      state = {
        ...state,
        panel,
      };
      if (typeof view.openPanel === "function") view.openPanel(panel, snapshot());
      else view.showPanel?.(panel, snapshot());
      if (panel === "inventory" && !viewOwnsRelicPanel) shellRelicController.render(getSave());
      return snapshot();
    }

    function selectRelic(relicId) {
      return shellRelicController.selectRelic?.(relicId);
    }

    function startRun() {
      onStartRun?.(snapshot());
      state = {
        ...state,
        screen: "game",
      };
      view.setScreen?.("game", snapshot());
      return snapshot();
    }

    function exitRun() {
      onExitRun?.(snapshot());
      return snapshot();
    }

    function resetSave() {
      onResetSave?.(snapshot());
      return snapshot();
    }

    function openShop() {
      onOpenShop?.(snapshot());
      return openPanel("shop");
    }

    function closeShop() {
      onCloseShop?.(snapshot());
      return openPanel("progress");
    }

    function setGameSpeed(speed) {
      onSetGameSpeed?.(speed, snapshot());
      return snapshot();
    }

    function toggleFullscreen() {
      options.onToggleFullscreen?.(snapshot());
      return snapshot();
    }

    function toggleMute() {
      options.onMuteToggle?.(snapshot());
      return snapshot();
    }

    function dispose() {
      state = {
        ...state,
        disposed: true,
      };
      shellRelicController.dispose?.();
      view.dispose?.(snapshot());
      return snapshot();
    }

    function snapshot() {
      return { ...state };
    }

    return {
      closeMenu,
      closeShop,
      dispose,
      exitRun,
      init,
      openMenu,
      openPanel,
      openShop,
      render,
      resetSave,
      selectRelic,
      setGameSpeed,
      startRun,
      toggleFullscreen,
      toggleMute,
      update,
    };
  }

  /**
   * Classic production shell UI adapter.
   *
   * Keeps the legacy dependency-bag and returned API shape while routing shell
   * state through the module-native controller.
   *
   * @param {any} options
   */
  function createShellUiController({
    ui,
    assets,
    content = {},
    shellRelicUi,
    documentRef = document,
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
    const assetResolver = assets?.createAssetResolver?.() || {
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
      if (startTransitionTimer) clearTimeout(startTransitionTimer);
      startTransitionTimer = setTimeout(() => {
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

  globalThis.TapSurvivorShellUi = {
    createShellUiController,
  };
})();
