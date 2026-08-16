import { createRelicSystem } from "../modules/relics.js";
import { createShellRelicUi } from "../modules/shell-relic-ui.js";

export function createBrowserUi({ documentRef, canvas }) {
  const get = (id) => documentRef?.getElementById?.(id) || createElementFallback(id);
  return {
    canvas,
    choices: get("choices"),
    closeEnd: get("closeEnd"),
    closeEndX: get("closeEndX"),
    closeLevelUp: get("closeLevelUp"),
    closeMenu: get("closeMenu"),
    closeShop: get("closeShop"),
    closeShopBottom: get("closeShopBottom"),
    debugPanel: get("debugPanel"),
    debugStats: get("debugStats"),
    endScreen: get("endScreen"),
    exitRun: get("exitRun"),
    fullscreenButton: get("fullscreenButton"),
    levelUp: get("levelUp"),
    menuInventoryPanel: get("menuInventoryPanel"),
    menuInventoryTab: get("menuInventoryTab"),
    menuProgressPanel: get("menuProgressPanel"),
    menuProgressTab: get("menuProgressTab"),
    menuQpHud: get("menuQpHud"),
    menuQuests: get("menuQuests"),
    menuRelicInventory: get("menuRelicInventory"),
    menuRelicSlots: get("menuRelicSlots"),
    menuShopCoinHud: get("menuShopCoinHud"),
    menuShopItems: get("menuShopItems"),
    menuShopNotice: get("menuShopNotice"),
    menuShopPanel: get("menuShopPanel"),
    menuShopTab: get("menuShopTab"),
    menuTree: get("menuTree"),
    muteAudio: get("muteAudio"),
    openMenu: get("openMenu"),
    questBanner: get("questBanner"),
    relicChoice: get("relicChoice"),
    relicChoices: get("relicChoices"),
    relicChoiceText: get("relicChoiceText"),
    relicChoiceTitle: get("relicChoiceTitle"),
    runHud: get("runHud"),
    runMenu: get("runMenu"),
    runStats: get("runStats"),
    shopCoinHud: get("shopCoinHud"),
    shopItems: get("shopItems"),
    shopModal: get("shopModal"),
    shopNotice: get("shopNotice"),
    speedButtons: [...(documentRef?.querySelectorAll?.("[data-speed]") || [])],
    startTransition: get("startTransition"),
    titleScreen: get("titleScreen"),
    titleStartGame: get("titleStartGame"),
    toggleDebug: get("toggleDebug"),
  };
}

export function createBrowserUiAdapters({
  content,
  documentRef,
  globalRef,
  onStartAudio,
  onStartRun,
  saveConfig,
  shopPricingConfig,
  ui,
}) {
  const inventoryRenderer = createBrowserInventoryRenderer({
    content,
    documentRef,
    globalRef,
    saveConfig,
    ui,
  });
  const shopBinding = createBrowserShopSystemAdapter();
  const runtimeUiActions = createBrowserRuntimeUiActionBinding();
  const shopSystemAdapter = shopBinding.shopSystemAdapter;
  return {
    bindRuntimeUiActions: runtimeUiActions.bindRuntimeUiActions,
    bindShopSystem: shopBinding.bindShopSystem,
    runUi: {
      formatTime: formatBrowserTime,
      getGameSpeed: () => readBrowserGameSpeed({ documentRef, globalRef }),
      maxEquippedWeapons: () => 4,
      renderDebug: () => {},
    },
    runUiAdapter: createBrowserRunUiAdapter({ documentRef, globalRef, ui }),
    shellUiAdapter: createBrowserShellUiAdapter({
      closeEndScreen: runtimeUiActions.closeEndScreen,
      closeLevelUpMenu: runtimeUiActions.closeLevelUpMenu,
      closeShopMenu: runtimeUiActions.closeShopMenu,
      exitRun: runtimeUiActions.exitRun,
      isAudioMuted: runtimeUiActions.isAudioMuted,
      onStartAudio,
      onStartRun,
      renderInventory: inventoryRenderer.renderInventory,
      renderShop: shopSystemAdapter.renderShop,
      setRunMenuOpen: runtimeUiActions.setRunMenuOpen,
      toggleAudioMute: runtimeUiActions.toggleAudioMute,
      ui,
    }),
    shopDocumentRef: documentRef,
    shopSystemAdapter,
    ui,
  };
}

function createBrowserRuntimeUiActionBinding() {
  let runtimeUiActions = {};

  return {
    bindRuntimeUiActions(nextRuntimeUiActions = {}) {
      runtimeUiActions = nextRuntimeUiActions;
      return true;
    },
    closeEndScreen: () => runtimeUiActions.closeEndScreen?.(),
    closeLevelUpMenu: () => runtimeUiActions.closeLevelUpMenu?.(),
    closeShopMenu: () => runtimeUiActions.closeShopMenu?.(),
    exitRun: () => runtimeUiActions.exitRun?.(),
    isAudioMuted: () => Boolean(runtimeUiActions.isAudioMuted?.()),
    setRunMenuOpen: (open) => runtimeUiActions.setRunMenuOpen?.(Boolean(open)),
    toggleAudioMute: () => runtimeUiActions.toggleAudioMute?.(),
  };
}

function createBrowserInventoryRenderer({ content = {}, documentRef, globalRef, saveConfig = {}, ui }) {
  const relicDefs = Array.isArray(content.relics) ? content.relics : [];
  const weaponDefs = content.weapons || content.weaponDefs || {};
  const relicSystem = createRelicSystem({ relicDefs, weaponDefs });
  const relicUi = createShellRelicUi({
    ui,
    content,
    documentRef,
    assetResolver: {
      relicIcon: (relic) => relic?.iconPath || content?.assets?.sprites?.ui?.quest || "",
      runUpgradeSprite: () => null,
      spriteSource: () => "",
    },
    getSave: () => readBrowserSave({ globalRef, saveConfig }),
    relicDefs,
    relicSystem,
    persist: (save) => writeBrowserSave({ globalRef, saveConfig, save }),
    renderMeta: () => {},
    scheduler: {
      clearTimeout: (timer) => globalRef.clearTimeout?.(timer),
      setTimeout: (callback, delay) => globalRef.setTimeout?.(callback, delay),
      animationSetTimeout: (callback, delay) => globalRef.setTimeout?.(callback, delay),
    },
    imageFactory: () => (typeof globalRef?.Image === "function" ? new globalRef.Image() : null),
  });

  return {
    renderInventory() {
      relicUi.renderInventory();
      return true;
    },
  };
}

function createBrowserRunUiAdapter({ documentRef, globalRef, ui }) {
  const getGameSpeed = () => readBrowserGameSpeed({ documentRef, globalRef });
  return {
    hideEndScreen() {
      toggleHidden(ui.endScreen, true);
    },
    showEndScreen(reason = "Run ended") {
      if (ui.runStats) ui.runStats.textContent = `Result: ${reason}`;
      toggleHidden(ui.endScreen, false);
    },
    updateRunHud() {
      if (ui.runHud) {
        ui.runHud.textContent = `Speed x${getGameSpeed()} | Browser UI default ready.`;
      }
      return true;
    },
  };
}

function createBrowserShellUiAdapter({
  closeEndScreen,
  closeLevelUpMenu,
  closeShopMenu,
  exitRun,
  isAudioMuted,
  onStartAudio,
  onStartRun,
  renderInventory,
  renderShop,
  setRunMenuOpen,
  toggleAudioMute,
  ui,
}) {
  let bound = false;
  const renderInventoryPanel = renderInventory || (() => {});
  const renderShopPanel = renderShop || (() => {});
  const setMenuOpen = (open) => {
    setRunMenuOpen?.(Boolean(open));
    toggleHidden(ui.runMenu, !open);
    ui.openMenu?.setAttribute?.("aria-expanded", String(Boolean(open)));
    if (ui.exitRun) ui.exitRun.disabled = !open;
  };
  const showMenuTab = (tab) => {
    const shop = tab === "shop";
    const inventory = tab === "inventory";
    ui.menuProgressTab?.classList?.toggle("active", tab === "progress");
    ui.menuShopTab?.classList?.toggle("active", shop);
    ui.menuInventoryTab?.classList?.toggle("active", inventory);
    toggleHidden(ui.menuProgressPanel, tab !== "progress");
    toggleHidden(ui.menuShopPanel, !shop);
    toggleHidden(ui.menuInventoryPanel, !inventory);
    if (shop) renderShopPanel();
    if (inventory) renderInventoryPanel();
  };
  const showTitle = () => {
    toggleHidden(ui.titleScreen, false);
    toggleHidden(ui.startTransition, true);
    setMenuOpen(false);
    return true;
  };
  const closeStartFlow = () => {
    toggleHidden(ui.titleScreen, true);
    toggleHidden(ui.startTransition, true);
    setMenuOpen(false);
    return true;
  };
  const startFromTitle = () => {
    if (typeof onStartAudio === "function") onStartAudio();
    if (typeof onStartRun === "function") onStartRun();
  };
  const toggleMenu = () => {
    const nextOpen = ui.runMenu?.classList?.contains?.("hidden") ?? true;
    setMenuOpen(nextOpen);
    if (nextOpen) showMenuTab("progress");
  };
  const toggleFullscreen = () => {
    const documentRef = ui.canvas?.ownerDocument;
    if (!documentRef) return;
    const target = ui.canvas?.parentElement || documentRef?.documentElement;
    const fullscreenElement = documentRef?.fullscreenElement || documentRef?.webkitFullscreenElement;
    if (fullscreenElement) {
      const exitFullscreen = documentRef.exitFullscreen || documentRef.webkitExitFullscreen;
      const result = exitFullscreen?.call(documentRef);
      result?.catch?.(() => {});
      return;
    }
    const requestFullscreen = target?.requestFullscreen || target?.webkitRequestFullscreen;
    const result = requestFullscreen?.call(target);
    result?.catch?.(() => {});
  };
  const updateMuteButton = (muted = false) => {
    if (!ui.muteAudio) return;
    ui.muteAudio?.setAttribute?.("aria-pressed", String(muted));
    ui.muteAudio?.classList?.toggle("active", muted);
    if (ui.muteAudio) ui.muteAudio.textContent = muted ? "Muted" : "Sound";
  };
  const toggleMute = () => {
    const muted = toggleAudioMute?.();
    if (typeof muted === "boolean") updateMuteButton(muted);
    return muted;
  };
  const exitCurrentRun = () => exitRun?.();
  return {
    bind() {
      if (bound) return true;
      bound = true;
      ui.titleStartGame?.addEventListener?.("click", startFromTitle);
      ui.openMenu?.addEventListener?.("click", toggleMenu);
      ui.closeMenu?.addEventListener?.("click", () => setMenuOpen(false));
      ui.closeLevelUp?.addEventListener?.("click", closeLevelUpMenu);
      ui.closeEnd?.addEventListener?.("click", closeEndScreen);
      ui.closeEndX?.addEventListener?.("click", closeEndScreen);
      ui.closeShop?.addEventListener?.("click", closeShopMenu);
      ui.closeShopBottom?.addEventListener?.("click", closeShopMenu);
      ui.exitRun?.addEventListener?.("click", exitCurrentRun);
      ui.menuProgressTab?.addEventListener?.("click", () => showMenuTab("progress"));
      ui.menuShopTab?.addEventListener?.("click", () => showMenuTab("shop"));
      ui.menuInventoryTab?.addEventListener?.("click", () => showMenuTab("inventory"));
      ui.fullscreenButton?.addEventListener?.("click", toggleFullscreen);
      ui.muteAudio?.addEventListener?.("click", toggleMute);
      updateMuteButton(isAudioMuted?.());
      showTitle();
      return true;
    },
    closeRunMenu() {
      setMenuOpen(false);
      return true;
    },
    closeStartFlow,
    showTitleScreen: showTitle,
  };
}

function createBrowserShopSystemAdapter() {
  let nativeShopSystem = null;

  function requireNativeShopSystem() {
    if (!nativeShopSystem) {
      throw new Error("Missing Tap Survivor browser native shop binding");
    }
    return nativeShopSystem;
  }

  const shopSystemAdapter = {
    closeShop(...args) {
      return requireNativeShopSystem().closeShop(...args);
    },
    getShopBonuses(...args) {
      return requireNativeShopSystem().getShopBonuses(...args);
    },
    openShop(...args) {
      return requireNativeShopSystem().openShop(...args);
    },
    renderShop(...args) {
      return requireNativeShopSystem().renderShop(...args);
    },
  };

  return {
    bindShopSystem(shopSystem) {
      if (
        !shopSystem ||
        ["closeShop", "getShopBonuses", "openShop", "renderShop"].some(
          (name) => typeof shopSystem[name] !== "function"
        )
      ) {
        throw new Error("Missing Tap Survivor browser native shop binding");
      }
      nativeShopSystem = shopSystem;
      return shopSystemAdapter;
    },
    shopSystemAdapter,
  };
}

function readBrowserSave({ globalRef, saveConfig = {} }) {
  const storage = globalRef?.localStorage;
  if (!storage) return {};
  const saveKey = saveConfig.saveKey || "tap-survivor-mvp-save-v2";
  const legacySaveKey = saveConfig.legacySaveKey || "tap-survivor-mvp-save-v1";
  const raw = storage.getItem(saveKey) || storage.getItem(legacySaveKey);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeBrowserSave({ globalRef, saveConfig = {}, save }) {
  const storage = globalRef?.localStorage;
  if (!storage) return false;
  const saveKey = saveConfig.saveKey || "tap-survivor-mvp-save-v2";
  try {
    storage.setItem(saveKey, JSON.stringify(save || {}));
    return true;
  } catch {
    return false;
  }
}

function formatBrowserTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function readBrowserGameSpeed({ documentRef, globalRef }) {
  const speedFromBody = Number(documentRef?.body?.dataset?.gameSpeed);
  if (Number.isFinite(speedFromBody) && speedFromBody > 0) return speedFromBody;
  const speedFromGlobalBody = Number(globalRef?.document?.body?.dataset?.gameSpeed);
  if (Number.isFinite(speedFromGlobalBody) && speedFromGlobalBody > 0) return speedFromGlobalBody;
  const speedButtons = [...(documentRef?.querySelectorAll?.("[data-speed]") || [])];
  const activeButton = speedButtons.find((button) => button.classList?.contains?.("active"));
  const speedFromButton = Number(activeButton?.dataset?.speed);
  return Number.isFinite(speedFromButton) && speedFromButton > 0 ? speedFromButton : 1;
}

function toggleHidden(element, hidden) {
  if (!element) return;
  if (element.classList?.add && element.classList?.remove) {
    if (hidden) element.classList.add("hidden");
    else element.classList.remove("hidden");
  }
  element.hidden = Boolean(hidden);
}


function createElementFallback(id = "") {
  const attributes = {};
  const children = [];
  let textValue = "";
  let htmlValue = "";
  return {
    id,
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
    dataset: {},
    children,
    appendChild(child) {
      children.push(child);
      return child;
    },
    prepend(child) {
      children.unshift(child);
      return child;
    },
    replaceChildren(...nextChildren) {
      children.splice(0, children.length, ...nextChildren);
    },
    addEventListener() {},
    removeEventListener() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    getAttribute(name) {
      return attributes[name];
    },
    removeAttribute(name) {
      delete attributes[name];
    },
    hidden: false,
    setAttribute(name, value) {
      attributes[name] = String(value);
    },
    get innerHTML() {
      return htmlValue;
    },
    set innerHTML(value) {
      htmlValue = String(value);
      textValue = String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      children.splice(0, children.length);
    },
    get textContent() {
      return textValue;
    },
    set textContent(value) {
      textValue = String(value);
      htmlValue = String(value);
      children.splice(0, children.length);
    },
  };
}
