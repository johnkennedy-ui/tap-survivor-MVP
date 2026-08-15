import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

import { content, contentSchema } from "../src/content.generated.mjs";
import { createBrowserDependencyBagOptions } from "../src/app/browser-dependency-bag.js";
import { composeRuntime } from "../src/app/compose-runtime.js";
import { createDebugSystem } from "../src/modules/debug.js";
import { createGameDependencyBag } from "../src/modules/game-dependencies.js";
import { createModuleGameDependencyBag } from "../src/modules/module-game-dependencies.js";
import { createModuleGameLifecycleOwner } from "../src/modules/module-game-lifecycle.js";
import { createShellRelicUi as createClassicShellRelicUi } from "../src/modules/shell-relic-ui.js";

const root = new URL("..", import.meta.url).pathname;

function makeClassList() {
  const classes = new Set();
  return {
    add: (...names) => names.forEach((name) => classes.add(name)),
    remove: (...names) => names.forEach((name) => classes.delete(name)),
    contains: (name) => classes.has(name),
    toggle: (name, force) => {
      const shouldAdd = force ?? !classes.has(name);
      if (shouldAdd) classes.add(name);
      else classes.delete(name);
      return shouldAdd;
    },
  };
}

function makeElement(id = "") {
  let html = "";
  const element = {
    id,
    dataset: {},
    classList: makeClassList(),
    children: [],
    disabled: false,
    get innerHTML() {
      return html;
    },
    set innerHTML(value) {
      html = value;
      this.children = [];
    },
    textContent: "",
    style: {},
    appendChild(child) {
      this.children.push(child);
      child.parentElement = this;
      child.isConnected = true;
    },
    prepend(child) {
      this.children.unshift(child);
      child.parentElement = this;
      child.isConnected = true;
    },
    querySelector(selector) {
      if (!selector?.startsWith(".")) return null;
      const name = selector.slice(1);
      const stack = [...this.children];
      while (stack.length) {
        const child = stack.shift();
        if (String(child.className || "").split(/\s+/).includes(name)) return child;
        stack.push(...(child.children || []));
      }
      return null;
    },
    addEventListener(type, handler) {
      this.listeners ||= new Map();
      this.listeners.set(type, handler);
    },
    setAttribute(name, value) {
      this[name] = value;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 960, height: 540 };
    },
    click() {
      this.listeners?.get("click")?.({ target: this });
    },
  };
  return element;
}

function makeContext2d() {
  return {
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    arc() {},
    fill() {},
    stroke() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fillText() {},
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    drawImage() {},
  };
}

function readSource(path) {
  return readFileSync(join(root, path), "utf8");
}

export function createGameHarness({
  fakeCombat = false,
  initialSave = null,
  search = "",
  storageEntries = {},
} = {}) {
  const elements = new Map();
  const ids = [
    "game",
    "titleScreen",
    "titleStartGame",
    "startTransition",
    "openShop",
    "resetSave",
    "toggleDebug",
    "fullscreenButton",
    "muteAudio",
    "openMenu",
    "questBanner",
    "exitRun",
    "closeMenu",
    "closeShop",
    "closeShopBottom",
    "closeLevelUp",
    "menuProgressTab",
    "menuInventoryTab",
    "menuShopTab",
    "menuProgressPanel",
    "menuInventoryPanel",
    "menuShopPanel",
    "runMenu",
    "shopModal",
    "shopCoinHud",
    "shopNotice",
    "shopItems",
    "menuShopCoinHud",
    "menuShopNotice",
    "menuShopItems",
    "menuRelicSlots",
    "menuRelicInventory",
    "runHud",
    "debugPanel",
    "debugStats",
    "menuQpHud",
    "menuTree",
    "menuQuests",
    "levelUp",
    "choices",
    "relicChoice",
    "relicChoiceTitle",
    "relicChoiceText",
    "relicChoices",
    "endScreen",
    "runStats",
    "closeEnd",
    "closeEndX",
  ];
  ids.forEach((id) => elements.set(id, makeElement(id)));

  const canvas = elements.get("game");
  canvas.width = 960;
  canvas.height = 540;
  canvas.getContext = () => makeContext2d();
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 960, height: 540 });

  const speedButtons = [1, 2, 5].map((speed) => {
    const button = makeElement(`speed-${speed}`);
    button.dataset.speed = String(speed);
    return button;
  });

  let rafCallback = null;
  const globalListeners = new Map();
  const documentListeners = new Map();
  const addListener = (listeners, type, handler) => {
    const handlers = listeners.get(type) || [];
    handlers.push(handler);
    listeners.set(type, handlers);
  };
  const dispatchListeners = (listeners, type, event = {}) => {
    (listeners.get(type) || []).forEach((handler) => handler(event));
  };
  const context = {
    console,
    Math,
    Number,
    performance: { now: () => 0 },
    requestAnimationFrame: (callback) => {
      rafCallback = callback;
      return 1;
    },
    setTimeout: (callback) => {
      context.__timeouts += 1;
      callback();
      return 1;
    },
    clearTimeout() {},
    addEventListener(type, handler) {
      addListener(globalListeners, type, handler);
    },
    Audio: function FakeAudio(src = "") {
      this.src = src;
      this.volume = 1;
      this.currentTime = 0;
      this.playbackRate = 1;
      this.preload = "";
      this.cloneNode = () => new context.Audio(this.src);
      this.play = () => {
        context.__audioPlays.push({ src: this.src, volume: this.volume, playbackRate: this.playbackRate });
        return Promise.resolve();
      };
    },
    __audioPlays: [],
    __audioOscillators: 0,
    __shellRelicTimerCalls: [],
    __timeouts: 0,
    __startLaughOscillators: 0,
    AudioContext: function FakeAudioContext() {
      this.currentTime = 0;
      this.destination = {};
      this.resume = () => Promise.resolve();
      this.createGain = () => ({
        connect() {},
        gain: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
      });
      this.createBiquadFilter = () => ({
        connect() {},
        frequency: { setValueAtTime() {} },
        Q: { setValueAtTime() {} },
      });
      this.createOscillator = () => ({
        connect() {},
        frequency: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        start() {
          context.__audioOscillators += 1;
          context.__startLaughOscillators += 1;
        },
        stop() {},
      });
    },
    localStorage: {
      store: new Map(),
      getItem(key) {
        return this.store.get(key) || null;
      },
      setItem(key, value) {
        this.store.set(key, value);
      },
      removeItem(key) {
        this.store.delete(key);
      },
    },
    location: {
      search,
    },
    document: {
      body: { dataset: {} },
      visibilityState: "visible",
      addEventListener(type, handler) {
        addListener(documentListeners, type, handler);
      },
      getElementById(id) {
        return elements.get(id);
      },
      querySelectorAll(selector) {
        return selector === "[data-speed]" ? speedButtons : [];
      },
      createElement(tag) {
        return makeElement(tag);
      },
    },
  };

  if (initialSave) {
    context.localStorage.store.set("tap-survivor-mvp-save-v2", JSON.stringify(initialSave));
  }
  Object.entries(storageEntries).forEach(([key, value]) => {
    context.localStorage.store.set(key, value);
  });

  const retiredGlobalNames = [
    "TapSurvivorAudio",
    "TapSurvivorBalance",
    "TapSurvivorCombatDamage",
    "TapSurvivorContentRegistry",
    "TapSurvivorInput",
    "TapSurvivorLevelUpChoices",
    "TapSurvivorMapSystem",
    "TapSurvivorSaveDefaults",
    "TapSurvivorSaveMigrations",
    "TapSurvivorSaveCorruption",
    "TapSurvivorSaveNormalize",
    "TapSurvivorStorage",
    "TapSurvivorRunLifecycle",
    "TapSurvivorRunState",
    "TapSurvivorRunUi",
    "TapSurvivorMath",
    "TapSurvivorShopPricing",
    "TapSurvivorWeaponTargeting",
  ];
  const retiredGlobalReads = Object.fromEntries(retiredGlobalNames.map((name) => [name, 0]));
  retiredGlobalNames.forEach((name) => {
    Object.defineProperty(context, name, {
      configurable: true,
      get() {
        retiredGlobalReads[name] += 1;
        throw new Error(`Forbidden ${name} global read`);
      },
    });
  });
  const storagePublisherPoisonDescriptor = Object.getOwnPropertyDescriptor(
    context,
    "TapSurvivorStorage"
  );
  context.__tapSurvivorRetiredGlobalReads = retiredGlobalReads;

  vm.createContext(context);
  const classicSourcesBeforeSpriteShim = [
    "src/content.generated.js",
    "src/balance-runtime.js",
    "src/assets.js",
    "src/math.js",
    "src/sprites.js",
    "src/audio.js",
    "src/quests.js",
    "src/storage-adapter.js",
    "src/save-defaults.js",
    "src/save-migrations.js",
    "src/save-normalize.js",
    "src/save-corruption.js",
    "src/save.js",
    "src/effects.js",
    "src/upgrades.js",
    "src/content-registry.js",
    "src/map-system.js",
    "src/progression.js",
  ];
  classicSourcesBeforeSpriteShim.forEach((path) => vm.runInContext(readSource(path), context));

  const spritePublisherAbsentBeforeShim = !Object.prototype.hasOwnProperty.call(
    context,
    "TapSurvivorSprites"
  );
  vm.runInContext(readSource("src/sprite-sheet-renderer.js"), context);
  const spritePublisherAbsentAfterShim = !Object.prototype.hasOwnProperty.call(
    context,
    "TapSurvivorSprites"
  );

  [
    "src/render-skill-rail.js",
    "src/render-hud.js",
    "src/render-enemies.js",
    "src/rendering.js",
    "src/balance.js",
  ].forEach((path) => vm.runInContext(readSource(path), context));

  const gameplaySystems = fakeCombat
    ? {
        enemies: {
          createEnemySystem() {},
        },
        enemyBehaviors: {
          createEnemyBehaviorSystem() {},
        },
        enemySpawning: {
          createEnemySpawnSystem() {},
        },
        weaponBehaviors: {
          createWeaponBehaviorSystem() {},
        },
        weaponFire: {
          createWeaponFireSystem() {},
        },
        combat: {
          createCombatSystem({ getGame }) {
            return {
              spawnEnemies() {},
              spawnBoss() {
                const game = getGame();
                if (game.bossSpawned) return;
                game.bossSpawned = true;
                game.enemies.push({
                  boss: true,
                  x: 480,
                  y: 270,
                  radius: 34,
                  hp: 100,
                  maxHp: 100,
                  damage: 0,
                  speed: 0,
                });
              },
              updateBossSpecials() {},
              updateEnemies() {},
              updateEnemyBolts() {},
              updateWeapons() {},
              getRunUpgradeTier() {
                return 0;
              },
              updateBolts() {},
              updateAreas() {},
              updateBeams() {},
              updateWeaponBursts() {},
            };
          },
        },
      }
    : null;

  if (!fakeCombat) {
    vm.runInContext(readSource("src/weapon-projectiles.js"), context);
    vm.runInContext(readSource("src/weapon-targeting.js"), context);
    vm.runInContext(readSource("src/weapon-cooldowns.js"), context);
    vm.runInContext(readSource("src/weapon-behaviors.js"), context);
    vm.runInContext(readSource("src/weapon-fire.js"), context);
    vm.runInContext(readSource("src/enemy-behaviors.js"), context);
    vm.runInContext(readSource("src/enemy-spawning.js"), context);
    vm.runInContext(readSource("src/enemies.js"), context);
    vm.runInContext(readSource("src/combat-damage.js"), context);
    vm.runInContext(readSource("src/combat.js"), context);
  }

  vm.runInContext(readSource("src/ui-progression.js"), context);
  vm.runInContext(readSource("src/ui.js"), context);
  vm.runInContext(readSource("src/run-ui.js"), context);
  vm.runInContext(readSource("src/level-up-choices.js"), context);
  vm.runInContext(readSource("src/level-up.js"), context);
  vm.runInContext(readSource("src/input.js"), context);
  vm.runInContext(readSource("src/pickups.js"), context);
  vm.runInContext(readSource("src/shop-pricing.js"), context);
  vm.runInContext(readSource("src/shop.js"), context);
  vm.runInContext(readSource("src/relics.js"), context);
  vm.runInContext(readSource("src/run-state.js"), context);
  vm.runInContext(readSource("src/run-update.js"), context);
  vm.runInContext(readSource("src/shell-relic-ui.js"), context);
  vm.runInContext(readSource("src/shell-ui.js"), context);
  vm.runInContext(readSource("src/game-banners.js"), context);
  vm.runInContext(readSource("src/run-lifecycle.js"), context);
  const classicContent = context.TapSurvivorContent;
  const sourceGameDependencies = createGameDependencyBag({
    globalRef: context,
    documentRef: context.document,
  });
  const sourceDependencyBagHasBothSpriteFactories =
    typeof sourceGameDependencies.sprites?.createSpriteSystem === "function" &&
    typeof sourceGameDependencies.sprites?.createSpriteSheetRenderer === "function";
  const sourceDependencyBagHasStorageProvider =
    typeof sourceGameDependencies.storage?.configureDefaultProviders === "function" &&
    typeof sourceGameDependencies.storage?.createStorageAdapter === "function";
  context.TapSurvivorBalanceRuntime.configureDefaultProviders({
    content: classicContent,
    profileSearch: () => context.location?.search || "",
    profiles: classicContent.balanceProfiles,
    storage: {
      getItem: (key) => context.localStorage?.getItem?.(key),
      removeItem: (key) => context.localStorage?.removeItem?.(key),
      setItem: (key, value) => context.localStorage?.setItem?.(key, value),
    },
  });
  const platform = {
    documentRef: context.document,
    runtimeGlobal: context,
  };
  const storage = {
    getItem: (key) => context.localStorage.getItem(key),
    removeItem: (key) => context.localStorage.removeItem(key),
    setItem: (key, value) => context.localStorage.setItem(key, value),
  };
  let dependencies;
  let lifecycle;
  let runtime;
  let shellUi;
  const createAudioContext = () => {
    const AudioContextCtor = context.AudioContext || context.webkitAudioContext;
    return typeof AudioContextCtor === "function" ? new AudioContextCtor() : null;
  };
  const classicAudioSystem = sourceGameDependencies.audio.createAudioSystem({
    sfxDefs: content.assets?.sfx || {},
  });
  let playStartAudio = () => {};
  const startRun = () => lifecycle?.startRun?.();
  const dependencyBagOptions = createBrowserDependencyBagOptions({
    audioAdapters: {
      audioContextFactory: createAudioContext,
      audioFactory: (src) => (typeof context.Audio === "function" ? new context.Audio(src) : null),
      clock: () => context.performance?.now?.() || 0,
    },
    content,
    contentSchema,
    documentRef: context.document,
    ...(gameplaySystems
      ? {
          gameplayAdapters: { gameplaySystems },
        }
      : {}),
    globalRef: context,
    onStartAudio: () => playStartAudio(),
    onStartRun: startRun,
    storage,
  });
  dependencyBagOptions.adapters.uiAdapters.ui.openShop = elements.get("openShop");
  const browserPlatformAdapters = dependencyBagOptions.adapters.platformAdapters;
  const browserBannerSystem = browserPlatformAdapters.bannerSystem;
  const debugSystem = createDebugSystem({
    floorDifficulty: (floor) => dependencies?.moduleSystems?.balance?.floorDifficulty?.(floor),
    getActiveProfile: () => context.TapSurvivorBalanceRuntime?.getActiveProfile?.() || "default",
    getGame: () => dependencies?.getGame?.(),
    getRelicSpecialEffects: () => dependencies?.moduleSystems?.relics?.specialEffects?.(dependencies?.getSave?.()),
    getRunUpgradeTier: (id) => dependencies?.getGame?.()?.runUpgradeTiers?.[id] || 0,
    getSave: () => dependencies?.getSave?.(),
    getWeaponDamageMultiplier: () =>
      dependencies?.moduleSystems?.relics?.getWeaponDamageMultiplier?.(dependencies?.getSave?.()) || 1,
    maxEquippedWeapons: () => dependencies?.moduleSystems?.relics?.maxEquippedWeapons?.(dependencies?.getSave?.()) || 4,
    relicDefs: content.relics || [],
    runUpgradeDefs: content.runUpgrades || [],
    ui: dependencyBagOptions.adapters.uiAdapters.ui,
  });
  dependencyBagOptions.adapters.uiAdapters.runUi.renderDebug = () => debugSystem.render();
  dependencyBagOptions.adapters.platformAdapters = {
    ...browserPlatformAdapters,
    bannerSystem: {
      ...browserBannerSystem,
      showOnceBanner(id, message, duration) {
        const save = dependencies?.getSave?.();
        if (!save || save.seenBanners?.includes(id)) return false;
        save.seenBanners = [...new Set([...(save.seenBanners || []), id])];
        dependencies.persist();
        browserBannerSystem.showBanner(message, duration);
        return true;
      },
    },
    debugSystem,
  };
  dependencies = createModuleGameDependencyBag(dependencyBagOptions);
  const { contentRegistry, relics } = dependencies.moduleSystems;
  playStartAudio = () => classicAudioSystem.playStartLaugh?.();
  shellUi = sourceGameDependencies.shellUi.createShellUiController({
    assets: dependencies.assets,
    closeEndScreen: () => {
      dependencies.runUi.hideEndScreen();
      shellUi.showTitleScreen();
    },
    closeLevelUpMenu: () => dependencies.ui.levelUp.classList.add("hidden"),
    content,
    documentRef: context.document,
    exitRun: () => {
      const game = dependencies.getGame();
      if (!game?.running) return;
      shellUi.closeRunMenu(false);
      game.paused = false;
      game.pauseReason = "";
      game.running = false;
      game.endReason = "Run exited";
      dependencies.runUi.showEndScreen("Run exited");
      dependencies.persist();
      dependencies.renderMeta();
    },
    getGame: dependencies.getGame,
    getSave: dependencies.getSave,
    isAudioMuted: () => classicAudioSystem.isMuted?.(),
    persist: dependencies.persist,
    playStartLaugh: playStartAudio,
    relicDefs: contentRegistry.relicDefs,
    relicSystem: relics,
    renderMeta: dependencies.renderMeta,
    resetSave: () => runtime?.resetSave?.(),
    scheduler: {
      clearTimeout: context.clearTimeout,
      setTimeout: context.setTimeout,
    },
    setGameSpeed: (speed) => runtime?.setGameSpeed?.(speed),
    shellRelicUi: {
      createShellRelicUi(options = {}) {
        return createClassicShellRelicUi({
          ...options,
          imageFactory: options.imageFactory || (() => (typeof context.Image === "function" ? new context.Image() : null)),
          scheduler:
            options.scheduler ||
            {
              clearTimeout: (timer) => context.clearTimeout?.(timer),
              setTimeout: (callback, delay) => context.setTimeout?.(callback, delay),
              animationSetTimeout: (callback, delay) => context.setTimeout?.(callback, delay),
            },
        });
      },
    },
    shopSystem: dependencies.shopSystem,
    startRun,
    toggleAudioMute: () => {
      const muted = classicAudioSystem.toggleMuted?.();
      dependencies.audioSystem?.setMuted?.(muted);
      return muted;
    },
    ui: dependencies.ui,
    weaponDefs: contentRegistry.weaponDefs,
  });
  dependencies.shellUi = shellUi;
  runtime = composeRuntime({
    dependencies,
    platform,
  });
  lifecycle = createModuleGameLifecycleOwner({
    dependencies,
    platform,
    runtime,
  });
  lifecycle.init();
  const storagePublisherPoisonRetained =
    Object.getOwnPropertyDescriptor(context, "TapSurvivorStorage")?.get ===
    storagePublisherPoisonDescriptor?.get;
  const storagePublisherAbsentAfterBoot =
    Reflect.deleteProperty(context, "TapSurvivorStorage") &&
    !Object.prototype.hasOwnProperty.call(context, "TapSurvivorStorage");
  context.__tapSurvivorHarness = {
    getGame: dependencies.getGame,
    getSave: dependencies.getSave,
  };

  return {
    context,
    dependencies,
    elements,
    speedButtons,
    frame(now) {
      rafCallback?.(now);
    },
    runFrames(count, start = 1000, step = 50) {
      for (let index = 0; index < count; index += 1) {
        rafCallback?.(start + index * step);
      }
    },
    dispatchPagehide() {
      dispatchListeners(globalListeners, "pagehide", {});
    },
    dispatchBeforeunload() {
      dispatchListeners(globalListeners, "beforeunload", {});
    },
    dispatchVisibilityHidden() {
      context.document.visibilityState = "hidden";
      dispatchListeners(documentListeners, "visibilitychange", {});
    },
    spriteShimProof: {
      sourceDependencyBagHasBothSpriteFactories,
      spritePublisherAbsentAfterShim,
      spritePublisherAbsentBeforeShim,
    },
    storagePublisherProof: {
      sourceDependencyBagHasStorageProvider,
      storagePublisherAbsentAfterBoot,
      storagePublisherPoisonRetained,
      storagePublisherReads: retiredGlobalReads.TapSurvivorStorage,
    },
  };
}
