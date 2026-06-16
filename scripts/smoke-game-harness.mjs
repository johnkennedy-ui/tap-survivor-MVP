import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

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

export function createGameHarness({ fakeCombat = false, initialSave = null } = {}) {
  const elements = new Map();
  const ids = [
    "game",
    "startRun",
    "startMenu",
    "startMenuStartRun",
    "startMenuOpenShop",
    "startMenuFullscreen",
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

  vm.createContext(context);
  [
    "src/content.generated.js",
    "src/assets.js",
    "src/math.js",
    "src/sprites.js",
    "src/audio.js",
    "src/quests.js",
    "src/storage-adapter.js",
    "src/save.js",
    "src/effects.js",
    "src/upgrades.js",
    "src/content-registry.js",
    "src/progression.js",
    "src/render-hud.js",
    "src/rendering.js",
    "src/balance.js",
  ].forEach((path) => vm.runInContext(readSource(path), context));

  if (fakeCombat) {
    context.TapSurvivorCombat = {
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
    };
  } else {
    vm.runInContext(readSource("src/weapon-fire.js"), context);
    vm.runInContext(readSource("src/enemies.js"), context);
    vm.runInContext(readSource("src/combat.js"), context);
  }

  vm.runInContext(readSource("src/ui.js"), context);
  vm.runInContext(readSource("src/run-ui.js"), context);
  vm.runInContext(readSource("src/level-up.js"), context);
  vm.runInContext(readSource("src/input.js"), context);
  vm.runInContext(readSource("src/pickups.js"), context);
  vm.runInContext(readSource("src/shop.js"), context);
  vm.runInContext(readSource("src/relics.js"), context);
  vm.runInContext(readSource("src/run-state.js"), context);
  vm.runInContext(readSource("src/run-update.js"), context);
  vm.runInContext(readSource("src/debug.js"), context);
  vm.runInContext(readSource("src/shell-ui.js"), context);
  vm.runInContext(`${readSource("src/game.js")}\nglobalThis.__tapSurvivorHarness = { getGame: () => game, getSave: () => save };`, context);

  return {
    context,
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
  };
}
