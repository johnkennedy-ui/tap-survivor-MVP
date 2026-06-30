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
  "renderSkillRail",
]);

export const BROWSER_SPRITE_ADAPTER_PROOF_SLOTS = Object.freeze([
  "drawImage",
  "drawSprite",
  "loadSprites",
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
      renderFrame({ spriteAdapters }) {
        spriteAdapters?.spriteSystem?.drawImage?.(
          "background:tower_floor",
          0,
          0,
          canvas.width || 0,
          canvas.height || 0
        );
        return true;
      },
      renderHud() {
        return true;
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
  const sprites = new Map();

  function registerSprite(id, definition) {
    const src = spriteSource(definition);
    if (!id || !src || typeof ImageCtor !== "function") return false;
    const image = new ImageCtor();
    image.src = src;
    sprites.set(id, image);
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
    registerSprite("player", spriteDefs.player);
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
    if (!context || !isDrawableImage(image)) return false;
    context.drawImage(
      image,
      x,
      y,
      width || image.naturalWidth || image.width,
      height || image.naturalHeight || image.height
    );
    return true;
  }

  function drawSprite(id, x = 0, y = 0, size = 32, rotation = 0, options = {}) {
    const image = sprites.get(id);
    if (!context || !isDrawableImage(image)) return false;
    const width = options.width || size;
    const height = options.height || size;
    context.save?.();
    context.translate?.(x, y);
    context.rotate?.(rotation);
    context.scale?.(options.flipX ? -1 : 1, options.flipY ? -1 : 1);
    context.drawImage(image, -width / 2, -height / 2, width, height);
    context.restore?.();
    return true;
  }

  return {
    drawImage,
    drawSprite,
    loadSprites,
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

function spriteSource(definition) {
  if (typeof definition === "string") return definition;
  if (definition && typeof definition === "object") {
    return definition.src || definition.path || definition.iconSrc || "";
  }
  return "";
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
