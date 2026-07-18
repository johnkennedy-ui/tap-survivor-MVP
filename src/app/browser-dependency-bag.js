import { createRelicSystem } from "../modules/relics.js";
import { createShopPricing } from "../modules/shop-pricing.js";
import { createShellRelicUi } from "../modules/shell-relic-ui.js";
import { createUiProgressionRenderer } from "../modules/ui-progression.js";

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

export const BROWSER_PLATFORM_ADAPTER_PROOF_SLOTS = Object.freeze([
  "bannerSystem",
  "bindMovementInput",
  "canvas",
  "debugSystem",
  "loop",
]);

export const BROWSER_RENDERING_ADAPTER_PROOF_SLOTS = Object.freeze([
  "clearFrame",
  "renderEnemies",
  "renderFrame",
  "renderHud",
  "renderPlayer",
  "renderSkillRail",
]);

export const BROWSER_SPRITE_ADAPTER_PROOF_SLOTS = Object.freeze([
  "drawImage",
  "drawSprite",
  "loadSprites",
]);

export const BROWSER_GAMEPLAY_ADAPTER_PROOF_SLOTS = Object.freeze([
  "combat",
  "enemies",
  "enemyBehaviors",
  "enemySpawning",
  "weaponBehaviors",
  "weaponFire",
]);

export const BROWSER_PROGRESSION_ADAPTER_PROOF_SLOTS = Object.freeze([
  "levelUp",
  "progression",
  "quests",
  "shop",
  "uiProgression",
  "upgrades",
]);

export const BROWSER_UI_ADAPTER_PROOF_SLOTS = Object.freeze([
  "runUiAdapter",
  "shellUiAdapter",
  "shopSystemAdapter",
  "ui",
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
        gameplaySystems: createBrowserGameplaySystems({
          globalRef,
        }),
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
        progressionSystems: createBrowserProgressionSystems({
          documentRef,
          globalRef,
          ui,
        }),
      },
      renderingAdapters:
        options.renderingAdapters ||
        createBrowserRenderingAdapters({
          canvas,
          globalRef,
        }),
      renderMetaSink: options.renderMetaSink || (() => {}),
      spriteAdapters:
        options.spriteAdapters ||
        {
          spriteSystem: createBrowserSpriteSystem({
            assetDefs: content.assets || {},
            canvas,
            globalRef,
          }),
        },
      storageAdapters:
        options.storageAdapters ||
        {
          storage,
        },
      uiAdapters:
        options.uiAdapters ||
        createBrowserUiAdapters({
          documentRef,
          content,
          globalRef,
          onStartAudio: options.onStartAudio,
          onStartRun: options.onStartRun,
          saveConfig: {
            legacySaveKey: "tap-survivor-mvp-save-v1",
            saveKey: "tap-survivor-mvp-save-v2",
            ...(options.saveConfig || {}),
          },
          shopPricingConfig: options.shopPricingConfig || content.tuning?.shop || {},
          ui,
        }),
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
  let frameHandler = null;

  function loop(now) {
    frameHandler?.(now);
    globalRef.requestAnimationFrame?.(loop);
  }

  loop.attachFrameHandler = (handler) => {
    frameHandler = handler;
    return loop;
  };

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
    loop,
  };
}

function createBrowserGameplaySystems({ globalRef }) {
  return {
    combat: createBrowserNamespaceBridge(globalRef, "TapSurvivorCombat", "createCombatSystem", {
      createCombatSystem: () => ({}),
    }),
    enemies: createBrowserNamespaceBridge(globalRef, "TapSurvivorEnemies", "createEnemySystem", {
      createEnemySystem: () => ({}),
    }),
    enemyBehaviors: createBrowserNamespaceBridge(
      globalRef,
      "TapSurvivorEnemyBehaviors",
      "createEnemyBehaviorSystem",
      {
        createEnemyBehaviorSystem: () => ({}),
      }
    ),
    enemySpawning: createBrowserNamespaceBridge(
      globalRef,
      "TapSurvivorEnemySpawning",
      "createEnemySpawnSystem",
      {
        createEnemySpawnSystem: () => ({}),
      }
    ),
    weaponBehaviors: createBrowserNamespaceBridge(
      globalRef,
      "TapSurvivorWeaponBehaviors",
      "createWeaponBehaviorSystem",
      {
        createWeaponBehaviorSystem: () => ({}),
      }
    ),
    weaponFire: createBrowserNamespaceBridge(globalRef, "TapSurvivorWeaponFire", "createWeaponFireSystem", {
      createWeaponFireSystem: () => ({}),
    }),
  };
}

function createBrowserProgressionSystems({ documentRef, globalRef, ui }) {
  return {
    levelUp: createBrowserNamespaceBridge(globalRef, "TapSurvivorLevelUp", "createLevelUpSystem", {
      createLevelUpSystem: () => ({}),
    }),
    progression: createBrowserNamespaceBridge(
      globalRef,
      "TapSurvivorProgression",
      "createProgressionSystem",
      {
        createProgressionSystem: () => ({}),
      }
    ),
    quests: createBrowserNamespaceBridge(globalRef, "TapSurvivorQuests", "createQuestSystem", {
      createQuestSystem: () => ({}),
      questOpenIds: (quest) => [quest?.opensQuest, ...(quest?.opensQuests || [])].filter(Boolean),
    }),
    shop: createBrowserNamespaceBridge(globalRef, "TapSurvivorShop", "createShopSystem", {
      createShopSystem: () => createBrowserShopSystemAdapter({ ui }),
    }),
    uiProgression: {
      createUiProgressionRenderer: (options = {}) =>
        createUiProgressionRenderer({
          ...options,
          documentRef,
        }),
    },
    upgrades: createBrowserNamespaceBridge(globalRef, "TapSurvivorUpgrades", "createUpgradeContent", {
      createUpgradeContent: ({ content = {} } = {}) => ({
        createUpgradeDefs: () => [],
        runUpgradeDefs: content.runUpgrades || [],
      }),
    }),
  };
}

function createBrowserNamespaceBridge(globalRef, globalName, factoryName, fallbackAdapter) {
  const resolveNamespace = () => globalRef?.[globalName] || null;
  const resolveValue = (source, prop) => {
    const value = source?.[prop];
    if (typeof value === "function") {
      return value.bind(source);
    }
    return value;
  };
  return new Proxy(fallbackAdapter, {
    get(target, prop) {
      const namespace = resolveNamespace();
      const liveValue = resolveValue(namespace, prop);
      if (liveValue !== undefined) {
        return liveValue;
      }
      return resolveValue(target, prop);
    },
    has(target, prop) {
      const namespace = resolveNamespace();
      return Boolean((namespace && prop in namespace) || prop in target);
    },
    ownKeys(target) {
      const namespace = resolveNamespace();
      return Array.from(new Set([...Reflect.ownKeys(target), ...(namespace ? Reflect.ownKeys(namespace) : [])]));
    },
    getOwnPropertyDescriptor(target, prop) {
      const namespace = resolveNamespace();
      return (
        Object.getOwnPropertyDescriptor(namespace || target, prop) || {
          configurable: true,
          enumerable: true,
          value: undefined,
          writable: true,
        }
      );
    },
  });
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
  const diagnostics = canvas?.ownerDocument?.defaultView?.__TapSurvivorBrowserDiagnostics;
  return {
    renderers: {
      clearFrame() {
        context?.clearRect?.(0, 0, canvas.width || 0, canvas.height || 0);
        return true;
      },
      renderEnemies({ enemies = [], spriteAdapters }) {
        enemies.forEach((enemy) => {
          const id = enemy.type || enemy.kind || enemy.id || "default";
          const size = enemy.size || enemy.radius || 32;
          spriteAdapters?.spriteSystem?.drawSprite?.(
            `enemy:${id}`,
            enemy.x || 0,
            enemy.y || 0,
            size
          );
        });
        return true;
      },
      renderFrame({ game, spriteAdapters }) {
        const width = canvas.width || 0;
        const height = canvas.height || 0;
        const backgroundId = game?.background?.spriteId || "background:tower_floor";
        const backgroundDrawn = spriteAdapters?.spriteSystem?.drawImage?.(
          backgroundId,
          0,
          0,
          width,
          height
        );
        if (!backgroundDrawn && typeof context?.fillRect === "function") {
          context.fillStyle = "#17202c";
          context.fillRect(0, 0, width, height);
          context.fillStyle = "rgba(10, 14, 20, 0.16)";
          context.fillRect(0, 0, width, height);
          context.strokeStyle = "#243244";
          context.lineWidth = 1;
          if (
            typeof context.beginPath === "function" &&
            typeof context.moveTo === "function" &&
            typeof context.lineTo === "function" &&
            typeof context.stroke === "function"
          ) {
            for (let x = 0; x < width; x += 48) {
              context.beginPath();
              context.moveTo(x, 0);
              context.lineTo(x, height);
              context.stroke();
            }
            for (let y = 0; y < height; y += 48) {
              context.beginPath();
              context.moveTo(0, y);
              context.lineTo(width, y);
              context.stroke();
            }
          }
        }
        return true;
      },
      renderHud() {
        return true;
      },
      renderPlayer({ game, spriteAdapters }) {
        const player = game?.player;
        if (!player) return true;
        const spriteId = playerSpriteId(player);
        const size = Math.max(70, (player.radius || 16) * 3.8);
        const drawn =
          spriteAdapters?.spriteSystem?.drawSprite?.(spriteId, player.x || 0, player.y || 0, size, 0, {
            flipX: playerFacesLeft(player),
          }) ||
          (spriteId !== "player" &&
            spriteAdapters?.spriteSystem?.drawSprite?.("player", player.x || 0, player.y || 0, size, 0, {
              flipX: playerFacesLeft(player),
            }));
        diagnostics?.spriteDraws?.push?.({
          id: spriteId,
          kind: "renderPlayer",
          success: Boolean(drawn),
        });
        return Boolean(drawn);
      },
      renderSkillRail({ game, spriteAdapters }) {
        const weapons = game?.player?.equippedWeapons || [];
        weapons.forEach((weaponId, index) => {
          spriteAdapters?.spriteSystem?.drawSprite?.(
            `weaponIcon:${weaponId}`,
            28 + index * 34,
            (canvas.height || 0) - 28,
            28
          );
        });
        return true;
      },
    },
  };
}

function createBrowserSpriteSystem({ assetDefs = {}, canvas, globalRef }) {
  const context = canvas.getContext?.("2d");
  const ImageCtor = globalRef.Image;
  const diagnostics = globalRef.__TapSurvivorBrowserDiagnostics;
  const sprites = new Map();

  function registerSprite(id, definition) {
    const src = spriteSource(definition);
    if (!id || !src || typeof ImageCtor !== "function") return false;
    const image = new ImageCtor();
    image.addEventListener?.("load", () => {
      diagnostics?.spriteLoads?.push?.({
        id,
        naturalHeight: image.naturalHeight || image.height || 0,
        naturalWidth: image.naturalWidth || image.width || 0,
        src,
        success: true,
      });
    });
    image.addEventListener?.("error", () => {
      diagnostics?.spriteLoads?.push?.({
        id,
        naturalHeight: image.naturalHeight || image.height || 0,
        naturalWidth: image.naturalWidth || image.width || 0,
        src,
        success: false,
      });
    });
    image.src = src;
    sprites.set(id, image);
    diagnostics?.spriteRegistrations?.push?.({
      id,
      src,
    });
    return true;
  }

  function registerGroup(prefix, definitions = {}) {
    Object.entries(definitions || {}).forEach(([id, definition]) => {
      registerSprite(`${prefix}:${id}`, definition);
      if (definition && typeof definition === "object" && definition.iconSrc) {
        registerSprite(`${prefix}Icon:${id}`, definition.iconSrc);
      }
    });
  }

  function loadSprites(spriteDefs = assetDefs.sprites || assetDefs || {}) {
    diagnostics?.spriteLoadRequests?.push?.({
      backgrounds: Object.keys(spriteDefs.backgrounds || {}),
      enemies: Object.keys(spriteDefs.enemies || {}),
      player: Boolean(spriteDefs.player),
      playerAnimations: Object.keys(spriteDefs.playerAnimations || {}),
      runUpgradeIcons: Object.keys(spriteDefs.runUpgradeIcons || {}),
      runUpgrades: Object.keys(spriteDefs.runUpgrades || {}),
      ui: Object.keys(spriteDefs.ui || {}),
      weapons: Object.keys(spriteDefs.weapons || {}),
    });
    registerSprite("player", spriteDefs.player);
    registerGroup("player", spriteDefs.playerAnimations);
    registerGroup("background", spriteDefs.backgrounds);
    registerGroup("enemy", spriteDefs.enemies);
    registerGroup("weapon", spriteDefs.weapons);
    registerGroup("runUpgrade", spriteDefs.runUpgrades);
    registerGroup("runUpgradeIcon", spriteDefs.runUpgradeIcons);
    registerGroup("ui", spriteDefs.ui);
    return true;
  }

  function drawImage(id, x = 0, y = 0, width, height) {
    const image = sprites.get(id);
    if (!context || !isDrawableImage(image)) {
      diagnostics?.spriteDraws?.push?.({
        id,
        kind: "drawImage",
        success: false,
      });
      return false;
    }
    context.drawImage(
      image,
      x,
      y,
      width || image.naturalWidth || image.width,
      height || image.naturalHeight || image.height
    );
    diagnostics?.spriteDraws?.push?.({
      id,
      kind: "drawImage",
      naturalHeight: image.naturalHeight || image.height || 0,
      naturalWidth: image.naturalWidth || image.width || 0,
      src: image.src || "",
      success: true,
    });
    return true;
  }

  function drawSprite(id, x = 0, y = 0, size = 32, rotation = 0, options = {}) {
    const image = sprites.get(id);
    if (!context || !isDrawableImage(image)) {
      diagnostics?.spriteDraws?.push?.({
        id,
        kind: "drawSprite",
        success: false,
      });
      return false;
    }
    const width = options.width || size;
    const height = options.height || size;
    context.save?.();
    context.translate?.(x, y);
    context.rotate?.(rotation);
    context.scale?.(options.flipX ? -1 : 1, options.flipY ? -1 : 1);
    context.drawImage(image, -width / 2, -height / 2, width, height);
    context.restore?.();
    diagnostics?.spriteDraws?.push?.({
      id,
      kind: "drawSprite",
      naturalHeight: image.naturalHeight || image.height || 0,
      naturalWidth: image.naturalWidth || image.width || 0,
      src: image.src || "",
      success: true,
    });
    return true;
  }

  return {
    drawImage,
    drawSprite,
    loadSprites,
  };
}

function createBrowserUiAdapters({
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
  const shopSystemAdapter = createBrowserShopSystemAdapter({
    content,
    documentRef,
    globalRef,
    saveConfig,
    shopPricingConfig,
    ui,
  });
  return {
    runUi: {
      formatTime: formatBrowserTime,
      getGameSpeed: () => readBrowserGameSpeed({ documentRef, globalRef }),
      maxEquippedWeapons: () => 4,
      renderDebug: () => {},
    },
    runUiAdapter: createBrowserRunUiAdapter({ documentRef, globalRef, ui }),
    shellUiAdapter: createBrowserShellUiAdapter({
      onStartAudio,
      onStartRun,
      renderInventory: inventoryRenderer.renderInventory,
      renderShop: shopSystemAdapter.renderShop,
      ui,
    }),
    shopSystemAdapter,
    ui,
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

function createBrowserShellUiAdapter({ onStartAudio, onStartRun, renderInventory, renderShop, ui }) {
  let bound = false;
  const renderInventoryPanel = renderInventory || (() => {});
  const renderShopPanel = renderShop || (() => {});
  const setMenuOpen = (open) => {
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
  const toggleMute = () => {
    const muted = ui.muteAudio?.getAttribute?.("aria-pressed") !== "true";
    ui.muteAudio?.setAttribute?.("aria-pressed", String(muted));
    ui.muteAudio?.classList?.toggle("active", muted);
    if (ui.muteAudio) ui.muteAudio.textContent = muted ? "Muted" : "Sound";
  };
  return {
    bind() {
      if (bound) return true;
      bound = true;
      ui.titleStartGame?.addEventListener?.("click", startFromTitle);
      ui.openMenu?.addEventListener?.("click", toggleMenu);
      ui.closeMenu?.addEventListener?.("click", () => setMenuOpen(false));
      ui.menuProgressTab?.addEventListener?.("click", () => showMenuTab("progress"));
      ui.menuShopTab?.addEventListener?.("click", () => showMenuTab("shop"));
      ui.menuInventoryTab?.addEventListener?.("click", () => showMenuTab("inventory"));
      ui.fullscreenButton?.addEventListener?.("click", toggleFullscreen);
      ui.muteAudio?.addEventListener?.("click", toggleMute);
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

function createBrowserShopSystemAdapter({ content = {}, documentRef, globalRef, saveConfig = {}, shopPricingConfig = {}, ui }) {
  const shopItemDefs = Array.isArray(content.shopItems) ? content.shopItems : [];
  const shopPricing = createShopPricing({
    shopItemDefs,
    pricingConfig: shopPricingConfig,
    getSave: () => readBrowserSave({ globalRef, saveConfig }),
  });
  const createNode = (tagName) =>
    typeof documentRef?.createElement === "function" ? documentRef.createElement(tagName) : createElementFallback(tagName);

  function buyItem(item) {
    const save = readBrowserSave({ globalRef, saveConfig });
    const tier = shopPricing.tierFor(item);
    const maxed = tier >= item.maxTier;
    if (maxed) return false;
    const cost = shopPricing.costFor(item, tier);
    if ((save.coins || 0) < cost) return false;
    save.coins = Math.max(0, (save.coins || 0) - cost);
    save.shopPurchases = {
      ...(save.shopPurchases || {}),
      [item.id]: tier + 1,
    };
    writeBrowserSave({ globalRef, saveConfig, save });
    renderShop();
    return true;
  }

  function renderShop() {
    const save = readBrowserSave({ globalRef, saveConfig });
    renderShopList(ui.shopItems, ui.shopCoinHud, save);
    renderShopList(ui.menuShopItems, ui.menuShopCoinHud, save);
    const notice = "Browser shop ready.";
    if (ui.shopNotice && !ui.shopNotice.textContent) ui.shopNotice.textContent = notice;
    if (ui.menuShopNotice && !ui.menuShopNotice.textContent) ui.menuShopNotice.textContent = notice;
    return true;
  }

  function renderShopList(container, coinHud, save) {
    if (!container || !coinHud) return;
    coinHud.textContent = `Coins: ${save.coins || 0} | Tower Floor ${Math.max(1, save.towerFloor || 1)}`;
    if (typeof container.appendChild !== "function") {
      container.textContent = shopItemDefs.length
        ? `${shopItemDefs.length} shop items available.`
        : "No shop items yet.";
      return;
    }
    container.innerHTML = "";
    if (!shopItemDefs.length) {
      const empty = createNode("div");
      empty.className = "shop-item";
      empty.textContent = "No shop items yet.";
      container.appendChild(empty);
      return;
    }

    shopItemDefs.forEach((item) => {
      const tier = shopPricing.tierFor(item);
      const maxed = tier >= item.maxTier;
      const cost = shopPricing.costFor(item, tier);
      const affordable = !maxed && (save.coins || 0) >= cost;
      const el = createNode("div");
      el.className = `shop-item ${affordable ? "available" : "locked"}`;
      el.innerHTML = `
        <div class="shop-item-icon">
          ${item.spritePath ? `<img class="shop-item-sprite" src="${item.spritePath}" alt="" />` : ""}
        </div>
        <div class="shop-item-copy">
          <strong>${item.name}</strong>
          <span>${item.description}</span><br />
          <span>Tier: ${tier}/${item.maxTier}</span><br />
          <span>${maxed ? "Maxed" : affordable ? `Cost: ${cost} coins` : `Needs ${cost} coins`}</span>
        </div>
      `;
      const button = createNode("button");
      button.textContent = maxed ? "Maxed" : `Buy Tier ${tier + 1}`;
      button.disabled = maxed || !affordable;
      button.addEventListener("click", () => buyItem(item));
      el.appendChild(button);
      container.appendChild(el);
    });
  }

  return {
    closeShop() {
      toggleHidden(ui.shopModal, true);
      toggleHidden(ui.menuShopPanel, true);
      return true;
    },
    openShop() {
      toggleHidden(ui.shopModal, false);
      toggleHidden(ui.menuShopPanel, false);
      renderShop();
      return true;
    },
    renderShop,
    getShopBonuses() {
      const save = readBrowserSave({ globalRef, saveConfig });
      const bonuses = createEmptyShopBonuses();
      shopItemDefs.forEach((item) => {
        const tier = save.shopPurchases?.[item.id] || 0;
        addBrowserShopItemBonus(bonuses, item, tier);
      });
      return bonuses;
    },
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

function createEmptyShopBonuses() {
  return {
    speed: 0,
    pickupRadius: 0,
    maxHp: 0,
    flatDamage: 0,
    attackRadius: 0,
    fireRate: 0,
    percentDamage: 0,
    relicFocus: 0,
  };
}

function addBrowserShopItemBonus(bonuses, item, tier) {
  if (!item?.effect || !Object.prototype.hasOwnProperty.call(bonuses, item.effect.stat)) return;
  bonuses[item.effect.stat] += item.effect.value * tier;
}

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) || null,
    removeItem: (key) => store.delete(key),
    setItem: (key, value) => store.set(key, String(value)),
  };
}

function isDrawableImage(image) {
  return Boolean(image?.complete && (image.naturalWidth || image.width));
}

function playerFacesLeft(player) {
  return Number.isFinite(player?.targetX) && Number.isFinite(player?.x) && player.targetX < player.x - 2;
}

function playerSpriteId(player) {
  if (player?.actionTimer > 0 && player?.actionSprite) return `player:${player.actionSprite}`;
  if (player?.moving) return "player:walk";
  return "player";
}

function spriteSource(definition) {
  if (typeof definition === "string") return definition;
  if (definition && typeof definition === "object") {
    return definition.src || definition.path || definition.iconSrc || "";
  }
  return "";
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
