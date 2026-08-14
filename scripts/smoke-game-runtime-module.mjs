import { readFileSync } from "node:fs";
import vm from "node:vm";

import { createGameRuntimeController as createModuleGameRuntimeController } from "../src/modules/game-runtime.js";

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

const classicBridgeSource = readFileSync(new URL("../src/game-runtime.js", import.meta.url), "utf8");
const sharedHarnessSource = readFileSync(new URL("./smoke-game-harness.mjs", import.meta.url), "utf8");
check(
  "generated runtime artifact is a global-free IIFE",
  classicBridgeSource.startsWith("// GENERATED FILE. Do not edit directly.") &&
    classicBridgeSource.includes("(() => {") &&
    classicBridgeSource.includes(
      "// Retired global: TapSurvivorGameRuntime. Exports are supplied through the game dependency bag."
    ) &&
    !classicBridgeSource.includes("globalThis.TapSurvivorGameRuntime")
);
check(
  "classic runtime bridge has no static ESM import",
  !/^\s*import\s/m.test(classicBridgeSource)
);

const classicContext = vm.createContext({});
let retiredPublisherReads = 0;
const retiredPublisherGetter = () => {
  retiredPublisherReads += 1;
  throw new Error("Forbidden TapSurvivorGameRuntime global read");
};
Object.defineProperty(classicContext, "TapSurvivorGameRuntime", {
  configurable: true,
  get: retiredPublisherGetter,
});
vm.runInContext(classicBridgeSource, classicContext, { filename: "src/game-runtime.js" });
check(
  "generated runtime artifact executes without reading or publishing its retired global",
  retiredPublisherReads === 0 &&
    Object.getOwnPropertyDescriptor(classicContext, "TapSurvivorGameRuntime")?.get ===
      retiredPublisherGetter
);
check(
  "native runtime controller is imported normally",
  typeof createModuleGameRuntimeController === "function"
);
check(
  "shared harness never VM-bootstraps the classic game entrypoint",
  !sharedHarnessSource.includes("src/game.js")
);
check(
  "shared harness has no obsolete runtime mode or host-global workaround",
  !sharedHarnessSource.includes("gameRuntimeMode") && !sharedHarnessSource.includes("globalThis")
);

if (typeof createModuleGameRuntimeController !== "function") {
  console.error("\nGame runtime controller fixture setup failed.");
  process.exit(1);
}

const moduleFixture = makeRuntimeFixture(createModuleGameRuntimeController);

moduleFixture.controller.initializeRuntime();

const initializedModule = moduleFixture.snapshot();
check(
  "native controller initializes speed input lifecycle and render ownership",
  initializedModule.gameSpeed === 1 &&
    initializedModule.documentSpeed === "1" &&
    initializedModule.hud === "Speed x1" &&
    initializedModule.inputBound === true &&
    initializedModule.inputUsesFixtureCanvas === true &&
    initializedModule.inputUsesFixtureGameGetter === true &&
    initializedModule.canvasListeners.mousedown === 1 &&
    initializedModule.canvasListeners.touchstart === 1 &&
    initializedModule.documentListeners.visibilitychange === 1 &&
    initializedModule.globalListeners.beforeunload === 1 &&
    initializedModule.globalListeners.pagehide === 1 &&
    initializedModule.shellBinds === 1 &&
    initializedModule.debugBinds === 1 &&
    initializedModule.spriteLoads === 1 &&
    initializedModule.renderMetaCalls === 1 &&
    initializedModule.rafSchedules === 1
);

const moveEvent = { buttons: 1, clientX: 130, clientY: 95 };
moduleFixture.dispatchCanvas("mousedown", moveEvent);
const movedModule = moduleFixture.snapshot();
check(
  "native controller clears the movement gate from canvas input",
  movedModule.awaitingFirstMoveInput === false &&
    movedModule.targetX === 240 &&
    movedModule.targetY === 150 &&
    movedModule.hiddenMovementBanners === 1
);

moduleFixture.clickSpeed(5);
const spedModule = moduleFixture.snapshot();
check(
  "native controller updates speed button body state and HUD",
  spedModule.gameSpeed === 5 &&
    spedModule.documentSpeed === "5" &&
    spedModule.hud === "Speed x5" &&
    spedModule.speedButtonStates["5"].active === true &&
    spedModule.speedButtonStates["5"].pressed === "true"
);

moduleFixture.getSave().coins = 77;
moduleFixture.dispatchPagehide();
const flushedModule = moduleFixture.snapshot();
check(
  "native controller persists the injected save on pagehide",
  flushedModule.persistCalls === 1 && flushedModule.persistedCoins.join(",") === "77"
);

if (process.exitCode) {
  console.error("\nGame runtime module smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nGame runtime module smoke passed.");

function makeRuntimeFixture(createGameRuntimeController) {
  const calls = [];
  const canvasListeners = new Map();
  const documentListeners = new Map();
  const globalListeners = new Map();
  let currentGame = {
    awaitingFirstMoveInput: true,
    paused: false,
    player: { targetX: 0, targetY: 0 },
    running: true,
  };
  let currentSave = { coins: 14 };
  let controller;
  let inputBinding = null;
  let shellBinds = 0;
  let debugBinds = 0;
  let spriteLoads = 0;
  let renderMetaCalls = 0;
  let hiddenMovementBanners = 0;
  const persistedCoins = [];
  const rafCallbacks = [];

  const canvas = {
    height: 540,
    width: 960,
    addEventListener(type, handler) {
      addListener(canvasListeners, type, handler);
    },
    getBoundingClientRect() {
      return { height: 270, left: 10, top: 20, width: 480 };
    },
  };
  const speedButtons = [1, 2, 5].map((speed) => makeSpeedButton(speed, calls));
  const ui = {
    levelUp: { classList: { add: (name) => calls.push(`level-up:${name}`) } },
    runHud: { textContent: "" },
    speedButtons,
  };
  const documentRef = {
    addEventListener(type, handler) {
      addListener(documentListeners, type, handler);
    },
    body: { dataset: {} },
    visibilityState: "visible",
  };
  const globalRef = {
    addEventListener(type, handler) {
      addListener(globalListeners, type, handler);
    },
    requestAnimationFrame(callback) {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    },
  };
  const saveSystem = {
    defaultSave() {
      return { coins: 0 };
    },
    loadSave() {
      return { coins: 14 };
    },
    removeSave() {
      return undefined;
    },
  };
  const shellUi = {
    bind() {
      shellBinds += 1;
    },
    closeRunMenu() {
      calls.push("shell:close-run-menu");
    },
    showTitleScreen() {
      calls.push("shell:show-title");
    },
  };
  const shopSystem = {
    closeShop() {
      calls.push("shop:close");
    },
  };
  const runUi = {
    hideEndScreen() {
      calls.push("run-ui:hide-end");
    },
    updateRunHud() {
      ui.runHud.textContent = `Speed x${controller.getGameSpeed()}`;
    },
  };
  const debugSystem = {
    bind() {
      debugBinds += 1;
    },
  };
  const spriteSystem = {
    loadSprites() {
      spriteLoads += 1;
    },
  };
  const bannerSystem = {
    hideMovementGateBanner() {
      hiddenMovementBanners += 1;
    },
  };
  const loop = () => calls.push("loop");

  controller = createGameRuntimeController({
    bannerSystem,
    bindMovementInput({ canvas: boundCanvas, getGame }) {
      inputBinding = { canvas: boundCanvas, getGame };
    },
    canvas,
    debugSystem,
    documentRef,
    getGame: () => currentGame,
    getSave: () => currentSave,
    globalRef,
    loop,
    persist() {
      persistedCoins.push(currentSave.coins);
    },
    renderMeta() {
      renderMetaCalls += 1;
    },
    runUi,
    saveSystem,
    setGame(nextGame) {
      currentGame = nextGame;
    },
    setSave(nextSave) {
      currentSave = nextSave;
    },
    shellUi,
    shopSystem,
    spriteSystem,
    ui,
  });

  return {
    clickSpeed(speed) {
      speedButtons.find((button) => button.dataset.speed === String(speed)).click();
    },
    controller,
    dispatchCanvas(type, event) {
      dispatchListeners(canvasListeners, type, event);
    },
    dispatchPagehide() {
      dispatchListeners(globalListeners, "pagehide", {});
    },
    getSave: () => currentSave,
    snapshot() {
      return {
        awaitingFirstMoveInput: currentGame?.awaitingFirstMoveInput,
        calls,
        canvasListeners: listenerCounts(canvasListeners),
        debugBinds,
        documentListeners: listenerCounts(documentListeners),
        documentSpeed: documentRef.body.dataset.gameSpeed,
        gameSpeed: controller.getGameSpeed(),
        globalListeners: listenerCounts(globalListeners),
        hiddenMovementBanners,
        hud: ui.runHud.textContent,
        inputBound: Boolean(inputBinding),
        inputUsesFixtureCanvas: inputBinding?.canvas === canvas,
        inputUsesFixtureGameGetter: inputBinding?.getGame?.() === currentGame,
        persistedCoins,
        persistCalls: persistedCoins.length,
        rafSchedules: rafCallbacks.length,
        renderMetaCalls,
        shellBinds,
        speedButtonStates: Object.fromEntries(
          speedButtons.map((button) => [
            button.dataset.speed,
            { active: button.classList.active, pressed: button.attributes["aria-pressed"] },
          ])
        ),
        spriteLoads,
        targetX: currentGame?.player?.targetX,
        targetY: currentGame?.player?.targetY,
      };
    },
  };
}

function makeSpeedButton(speed, calls) {
  const listeners = new Map();
  return {
    addEventListener(type, handler) {
      addListener(listeners, type, handler);
    },
    attributes: {},
    classList: {
      active: false,
      toggle(name, active) {
        if (name === "active") this.active = Boolean(active);
      },
    },
    click() {
      dispatchListeners(listeners, "click", {});
    },
    dataset: { speed: String(speed) },
    setAttribute(name, value) {
      this.attributes[name] = value;
      calls.push(`speed:${speed}:${name}:${value}`);
    },
  };
}

function addListener(listeners, type, handler) {
  const handlers = listeners.get(type) || [];
  handlers.push(handler);
  listeners.set(type, handlers);
}

function dispatchListeners(listeners, type, event) {
  for (const handler of listeners.get(type) || []) {
    handler(event);
  }
}

function listenerCounts(listeners) {
  return Object.fromEntries(
    [...listeners.entries()].map(([type, handlers]) => [type, handlers.length]).sort()
  );
}
