import { createShellUiPresenter } from "./shell-ui-presenter.js";

/**
 * Applies shell UI presenter models to injected DOM dependencies.
 *
 * @param {any} [options]
 */
export function createShellUiDomAdapter(options = {}) {
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
