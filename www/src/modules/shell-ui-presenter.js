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
export function createShellUiPresenter(options = {}) {
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
