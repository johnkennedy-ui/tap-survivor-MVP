import { composeRuntime, createBrowserPlatform } from "../src/app/compose-runtime.js";

const calls = [];
const listeners = new Map();
const documentListeners = new Map();
let frameCallback = null;
let currentGame = {
  running: true,
  paused: false,
  awaitingFirstMoveInput: true,
  player: {
    targetX: 0,
    targetY: 0,
  },
};
let currentSave = { coins: 12 };

const canvas = {
  width: 960,
  height: 540,
  addEventListener(type, handler) {
    listeners.set(type, handler);
    calls.push(`canvas:${type}`);
  },
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 960, height: 540 };
  },
};
const speedButtons = [1, 2, 5].map((speed) => ({
  dataset: { speed: String(speed) },
  classList: {
    toggle(name, active) {
      calls.push(`speed:${speed}:${name}:${active}`);
    },
  },
  setAttribute(name, value) {
    calls.push(`speed:${speed}:${name}:${value}`);
  },
}));
const documentRef = {
  body: { dataset: {} },
  visibilityState: "visible",
  addEventListener(type, handler) {
    documentListeners.set(type, handler);
    calls.push(`document:${type}`);
  },
};
const globalRef = {
  requestAnimationFrame(callback) {
    frameCallback = callback;
    calls.push("raf");
    return 1;
  },
  addEventListener(type, handler) {
    listeners.set(type, handler);
    calls.push(`global:${type}`);
  },
  Capacitor: {
    Plugins: {
      App: {
        addListener(type, handler) {
          listeners.set(`capacitor:${type}`, handler);
          calls.push(`capacitor:${type}`);
          return { catch() {} };
        },
      },
    },
  },
};

const platform = createBrowserPlatform({ globalRef, documentRef });
const dependencies = {
  canvas,
  ui: {
    speedButtons,
    levelUp: {
      classList: {
        add(name) {
          calls.push(`level-up:add:${name}`);
        },
      },
    },
  },
  getGame: () => currentGame,
  setGame: (game) => {
    currentGame = game;
    calls.push("setGame");
  },
  getSave: () => currentSave,
  setSave: (save) => {
    currentSave = save;
    calls.push("setSave");
  },
  saveSystem: {
    defaultSave: () => ({ coins: 0 }),
    loadSave: () => ({ coins: 99 }),
    removeSave: () => true,
  },
  shellUi: {
    bind: () => calls.push("shell:bind"),
    closeRunMenu: () => calls.push("shell:closeRunMenu"),
    showTitleScreen: () => calls.push("shell:showTitleScreen"),
  },
  shopSystem: {
    closeShop: () => calls.push("shop:close"),
  },
  runUi: {
    updateRunHud: () => calls.push("runHud:update"),
    hideEndScreen: () => calls.push("runHud:hideEnd"),
  },
  debugSystem: {
    bind: () => calls.push("debug:bind"),
  },
  spriteSystem: {
    loadSprites: () => calls.push("sprites:load"),
  },
  bannerSystem: {
    hideMovementGateBanner: () => calls.push("banner:hideMovementGate"),
  },
  bindMovementInput: ({ canvas: inputCanvas, getGame }) => {
    if (inputCanvas !== canvas || getGame() !== currentGame) {
      throw new Error("Module bootstrap passed incorrect movement input dependencies");
    }
    calls.push("input:bind");
  },
  persist: () => {
    calls.push("persist");
    return true;
  },
  renderMeta: () => calls.push("renderMeta"),
  loop: (now) => calls.push(`loop:${now}`),
};

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

const runtime = composeRuntime({ platform, dependencies });
runtime.initializeRuntime();

check("module bootstrap loads save through injected dependency", currentSave.coins === 99);
check(
  "module bootstrap binds shell/debug/input",
  calls.includes("shell:bind") && calls.includes("debug:bind") && calls.includes("input:bind")
);
check(
  "module bootstrap schedules animation frame through platform",
  calls.includes("raf") && typeof frameCallback === "function"
);
check(
  "module bootstrap sets initial speed through injected document",
  documentRef.body.dataset.gameSpeed === "1"
);

runtime.setGameSpeed(5);
check(
  "module bootstrap speed control stays inside injected platform",
  documentRef.body.dataset.gameSpeed === "5"
);

listeners.get("mousedown")({ clientX: 480, clientY: 270 });
check("module bootstrap movement gate uses injected canvas", currentGame.awaitingFirstMoveInput === false);
check(
  "module bootstrap movement gate updates player target",
  currentGame.player.targetX === 480 && currentGame.player.targetY === 270
);

documentRef.visibilityState = "hidden";
documentListeners.get("visibilitychange")?.();
listeners.get("pagehide")?.();
listeners.get("beforeunload")?.();
listeners.get("capacitor:appStateChange")?.({ isActive: false });
check(
  "module bootstrap lifecycle flushes through injected platform",
  calls.filter((call) => call === "persist").length === 4
);

runtime.resetSave();
check(
  "module bootstrap reset uses injected UI/save dependencies",
  currentSave.coins === 0 && currentGame === null
);

frameCallback(1234);
check("module bootstrap loop is called by injected animation frame", calls.includes("loop:1234"));

if (process.exitCode) {
  console.error("\nModule bootstrap smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nModule bootstrap smoke passed.");
