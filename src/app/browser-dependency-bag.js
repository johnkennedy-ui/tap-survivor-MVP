export const BROWSER_DEPENDENCY_BAG_PROOF_SLOTS = Object.freeze([
  "assetAdapters",
  "audioAdapters",
  "gameplayAdapters",
  "platformAdapters",
  "progressionAdapters",
  "renderingAdapters",
  "spriteAdapters",
  "storageAdapters",
  "uiAdapters",
]);

export function createBrowserDependencyBagOptions(options = {}) {
  const globalRef = options.globalRef || globalThis;
  const documentRef = options.documentRef || globalRef.document;
  const content = options.content || {};
  const canvas = options.canvas || documentRef?.getElementById?.("game") || createCanvasFallback();
  const ui = options.ui || createBrowserUi({ documentRef, canvas });
  const storage = options.storage || globalRef.localStorage || createMemoryStorage();

  return {
    content,
    contentSchema: options.contentSchema || {},
    random: options.random,
    saveConfig: {
      legacySaveKey: "tap-survivor-mvp-save-v1",
      questOpenIds: (quest) => [quest?.opensQuest, ...(quest?.opensQuests || [])].filter(Boolean),
      saveKey: "tap-survivor-mvp-save-v2",
      ...(options.saveConfig || {}),
    },
    shopPricingConfig: options.shopPricingConfig || content.tuning?.shop || {},
    upgradeContent: options.upgradeContent || {
      createUpgradeDefs: (weaponDefs = {}) =>
        Object.entries(weaponDefs).map(([weaponId, weapon]) => ({
          id: weapon.upgradeId || `${weaponId}_damage`,
          requiresWeapon: weaponId,
        })),
      runUpgradeDefs: content.runUpgrades || [],
    },
    adapters: {
      assetAdapters: options.assetAdapters || {},
      audioAdapters:
        options.audioAdapters ||
        createBrowserAudioAdapters({
          globalRef,
        }),
      gameplayAdapters: options.gameplayAdapters || {
        gameplaySystems: createNoopGameplayAdapters(),
      },
      initialGame: options.initialGame || null,
      initialSave: options.initialSave,
      platformAdapters:
        options.platformAdapters ||
        createBrowserPlatformAdapters({
          canvas,
          globalRef,
          ui,
        }),
      progressionAdapters: options.progressionAdapters || {
        progressionSystems: createNoopProgressionAdapters(),
      },
      renderingAdapters:
        options.renderingAdapters ||
        createBrowserRenderingAdapters({
          canvas,
        }),
      renderMetaSink: options.renderMetaSink || (() => {}),
      spriteAdapters:
        options.spriteAdapters ||
        {
          spriteSystem: createNoopSpriteSystem(),
        },
      storageAdapters:
        options.storageAdapters ||
        {
          storage,
        },
      uiAdapters:
        options.uiAdapters ||
        {
          runUiAdapter: createNoopRunUi(),
          shellUiAdapter: createNoopShellUi(),
          shopSystemAdapter: createNoopShopSystem(),
          ui,
        },
    },
  };
}

function createBrowserUi({ documentRef, canvas }) {
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

function createBrowserPlatformAdapters({ canvas, globalRef, ui }) {
  return {
    bannerSystem: createBrowserBannerSystem({ globalRef, ui }),
    bindMovementInput({ canvas: targetCanvas = canvas, getGame }) {
      const setTarget = (event) => {
        const game = getGame?.();
        if (!game || !game.running || game.paused) return;
        const rect = targetCanvas.getBoundingClientRect();
        const point = event.touches ? event.touches[0] : event;
        game.player.targetX = ((point.clientX - rect.left) / rect.width) * targetCanvas.width;
        game.player.targetY = ((point.clientY - rect.top) / rect.height) * targetCanvas.height;
      };
      targetCanvas.addEventListener?.("mousedown", setTarget);
      targetCanvas.addEventListener?.("mousemove", (event) => {
        if (event.buttons === 1) setTarget(event);
      });
      targetCanvas.addEventListener?.("touchstart", (event) => {
        event.preventDefault?.();
        setTarget(event);
      });
      targetCanvas.addEventListener?.("touchmove", (event) => {
        event.preventDefault?.();
        setTarget(event);
      });
      return { setTarget };
    },
    canvas,
    debugSystem: {
      bind() {},
      render() {},
    },
    loop: () => {},
  };
}

function createBrowserBannerSystem({ globalRef, ui }) {
  let bannerTimer = 0;
  const clearTimer = () => globalRef.clearTimeout?.(bannerTimer);
  function showBanner(message, duration = 5200) {
    if (!ui.questBanner || !message) return;
    ui.questBanner.textContent = message;
    ui.questBanner.classList?.remove?.("hidden");
    clearTimer();
    if (duration > 0) {
      bannerTimer = globalRef.setTimeout?.(() => ui.questBanner.classList?.add?.("hidden"), duration) || 0;
    }
  }
  return {
    hideMovementGateBanner() {
      clearTimer();
      ui.questBanner?.classList?.add?.("hidden");
    },
    showBanner,
    showMovementGateBanner() {
      showBanner("Click/tap to move", 0);
    },
    showOnceBanner(_id, message, duration) {
      showBanner(message, duration);
      return true;
    },
    showQuestBanner(quest, reward) {
      showBanner(`${quest?.name || "Quest"} complete +${reward || 0} QP`);
    },
  };
}

function createBrowserAudioAdapters({ globalRef }) {
  return {
    audioContextFactory: () => {
      const AudioContextCtor = globalRef.AudioContext || globalRef.webkitAudioContext;
      return typeof AudioContextCtor === "function" ? new AudioContextCtor() : null;
    },
    audioFactory: (src) => (typeof globalRef.Audio === "function" ? new globalRef.Audio(src) : null),
    clock: () => globalRef.performance?.now?.() || 0,
  };
}

function createBrowserRenderingAdapters({ canvas }) {
  const context = canvas.getContext?.("2d");
  return {
    renderers: {
      clearFrame() {
        context?.clearRect?.(0, 0, canvas.width || 0, canvas.height || 0);
        return true;
      },
      renderEnemies() {
        return true;
      },
      renderFrame() {
        return true;
      },
      renderHud() {
        return true;
      },
      renderSkillRail() {
        return true;
      },
    },
  };
}

function createNoopGameplayAdapters() {
  return {
    combat: { createCombatSystem: () => ({}) },
    enemies: { createEnemySystem: () => ({}) },
    enemyBehaviors: { createEnemyBehaviorSystem: () => ({}) },
    enemySpawning: { createEnemySpawnSystem: () => ({}) },
    weaponBehaviors: { createWeaponBehaviorSystem: () => ({}) },
    weaponFire: { createWeaponFireSystem: () => ({}) },
  };
}

function createNoopProgressionAdapters() {
  return {
    levelUp: { createLevelUpSystem: () => ({}) },
    progression: { createProgressionSystem: () => ({}) },
    quests: {
      createQuestSystem: () => ({}),
      questOpenIds: (quest) => [quest?.opensQuest, ...(quest?.opensQuests || [])].filter(Boolean),
    },
    shop: { createShopSystem: () => createNoopShopSystem() },
    uiProgression: { createUiProgressionRenderer: () => ({}) },
    upgrades: {
      createUpgradeContent: ({ content = {} } = {}) => ({
        createUpgradeDefs: () => [],
        runUpgradeDefs: content.runUpgrades || [],
      }),
    },
  };
}

function createNoopRunUi() {
  return {
    hideEndScreen() {},
    showEndScreen() {},
    updateRunHud() {},
  };
}

function createNoopShellUi() {
  return {
    bind() {},
    closeRunMenu() {},
    closeStartFlow() {},
    showTitleScreen() {},
  };
}

function createNoopShopSystem() {
  return {
    closeShop() {},
  };
}

function createNoopSpriteSystem() {
  return {
    drawImage: () => false,
    drawSprite: () => false,
    loadSprites: () => true,
  };
}

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) || null,
    removeItem: (key) => store.delete(key),
    setItem: (key, value) => store.set(key, String(value)),
  };
}

function createCanvasFallback() {
  return {
    height: 540,
    width: 960,
    addEventListener() {},
    getBoundingClientRect: () => ({ height: 540, left: 0, top: 0, width: 960 }),
    getContext: () => null,
  };
}

function createElementFallback(id = "") {
  return {
    id,
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
    dataset: {},
    setAttribute() {},
    textContent: "",
  };
}
