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
    onOpenPanel,
    onStartRun,
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

  function render(state = {}) {
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
    clearRoot(root);
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
    startButton.addEventListener("click", () => {
      if (!startButton.disabled) onStartRun?.(model);
    });
    actions.appendChild(startButton);
    frame.appendChild(actions);

    const tabs = documentRef.createElement("nav");
    tabs.className = "module-shell-tabs";
    model.panels.forEach((panel) => {
      const tab = documentRef.createElement("button");
      tab.type = "button";
      tab.textContent = panel.label;
      tab.className = panel.active ? "active" : "";
      tab.dataset.panelId = panel.id;
      tab.setAttribute("aria-selected", String(panel.active));
      tab.addEventListener("click", () => openPanel(panel.id, model));
      tabs.appendChild(tab);
    });
    frame.appendChild(tabs);

    const panels = documentRef.createElement("div");
    panels.className = "module-shell-panels";
    model.panels.forEach((panel) => {
      const section = documentRef.createElement("section");
      section.className = ["module-shell-panel", panel.active ? "active" : "hidden"].filter(Boolean).join(" ");
      section.dataset.panelId = panel.id;
      section.dataset.sectionType = panel.type;
      appendText(section, "h2", panel.label);
      appendText(section, "span", sectionCopy(panel));
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

  return {
    dispose,
    openPanel,
    render,
    update,
  };
}

function sectionCopy(panel) {
  if (panel.type === "relics") return "Relic inventory";
  if (panel.type === "shop") return "Shop panel";
  return "Progress panel";
}

function clearRoot(root) {
  if (typeof root.replaceChildren === "function") root.replaceChildren();
  else root.children = [];
  if ("textContent" in root) root.textContent = "";
}
