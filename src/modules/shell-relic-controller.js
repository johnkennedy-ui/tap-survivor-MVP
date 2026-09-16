import { createShellRelicUiAdapter } from "./shell-relic-ui.js";

/**
 * Owns only the module-native shell relic UI lifecycle.
 *
 * @param {any} [options]
 */
export function createShellRelicController(options = {}) {
  const {
    presenter,
    createUiAdapter = createShellRelicUiAdapter,
    uiAdapter,
    documentRef,
    root,
    getSave,
    relicSystem,
    persist,
    renderMeta,
    scheduler,
    lockPopupDelayMs,
    previewAdapter,
    onEquip,
    onUnequip,
    onSelect,
    onLockedSelect,
  } = options;

  if (!presenter || typeof presenter.createInventoryViewModel !== "function") {
    throw new Error("Missing Tap Survivor module shell relic controller dependency: presenter");
  }
  if (typeof getSave !== "function") {
    throw new Error("Missing Tap Survivor module shell relic controller dependency: getSave");
  }

  let selectedRelicId = "";
  let currentModel = null;

  const adapter =
    uiAdapter ||
    createUiAdapter({
      presenter,
      documentRef,
      root,
      getSave,
      relicSystem,
      persist,
      renderMeta,
      scheduler,
      lockPopupDelayMs,
      previewAdapter,
      onEquip: (relic, model, meta) => {
        onEquip?.(relic, model, meta);
      },
      onUnequip: (relic, model, meta) => {
        if (selectedRelicId === relic?.id) selectedRelicId = "";
        onUnequip?.(relic, model, meta);
      },
      onSelect: (relic, model, meta) => {
        selectedRelicId = relic?.id || "";
        onSelect?.(relic, model, meta);
        render();
      },
      onLockedSelect: (relic, model, meta) => {
        onLockedSelect?.(relic, model, meta);
      },
    });

  function render(state = getSave(), options = {}) {
    selectedRelicId = options.selectedRelicId ?? selectedRelicId;
    adapter.dispose?.();
    currentModel = adapter.renderShellRelics(state, { selectedRelicId });
    return currentModel;
  }

  function update(state = getSave(), options = {}) {
    return render(state, options);
  }

  function selectRelic(relicId = "") {
    selectedRelicId = relicId;
    const model = render();
    onSelect?.(findRelic(model, relicId), model, { source: "controller" });
    return model;
  }

  function dispose() {
    adapter.dispose?.();
  }

  return {
    dispose,
    render,
    selectRelic,
    update,
  };
}

function findRelic(model, relicId) {
  if (!relicId) return null;
  return [...(model?.equippedRelics || []), ...(model?.availableRelics || [])].find((relic) => relic.id === relicId) || null;
}
