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
    const panels = normalizedPanels.map((panel) => ({
      ...panel,
      active: panel.id === activePanel,
    }));

    return {
      activePanel,
      actions: {
        canExitRun: Boolean(state.canExitRun ?? screen === "game"),
        canOpenMenu: !disposed,
        canStartRun: Boolean(state.canStartRun ?? screen === "title"),
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
            label: panel.label,
            type: panel.type,
          },
        ])
      ),
      titleVisible: screen === "title",
    };
  }

  return {
    createShellViewModel,
  };
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
