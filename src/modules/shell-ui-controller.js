import { createShellUiDomAdapter } from "./shell-ui-dom-adapter.js";
import { createShellUiPresenter } from "./shell-ui-presenter.js";

/**
 * Owns only the module-native shell UI lifecycle contract.
 *
 * Production shell-ui DOM wiring stays classic for now; this controller is the
 * module-native seam for future ownership handoff.
 *
 * @param {any} [options]
 */
export function createShellUiController(options = {}) {
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
          onStartRun: () => startRun(),
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
    update,
  };
}
