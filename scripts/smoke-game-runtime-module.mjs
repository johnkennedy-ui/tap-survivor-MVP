import { readFileSync } from "node:fs";
import vm from "node:vm";

import { createGameRuntimeController as createModuleGameRuntimeController } from "../src/modules/game-runtime.js";

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

const classicBridgeSource = readFileSync(new URL("../src/game-runtime.js", import.meta.url), "utf8");
check(
  "classic runtime bridge is a generated IIFE publisher",
  classicBridgeSource.startsWith("// GENERATED FILE. Do not edit directly.") &&
    classicBridgeSource.includes("(() => {") &&
    classicBridgeSource.includes("globalThis.TapSurvivorGameRuntime")
);
check(
  "classic runtime bridge has no static ESM import",
  !/^\s*import\s/m.test(classicBridgeSource)
);

const classicContext = vm.createContext({});
vm.runInContext(classicBridgeSource, classicContext, { filename: "src/game-runtime.js" });
const createClassicGameRuntimeController =
  classicContext.TapSurvivorGameRuntime?.createGameRuntimeController;
check(
  "classic runtime bridge publishes createGameRuntimeController",
  typeof createClassicGameRuntimeController === "function"
);
check(
  "native runtime controller is imported normally",
  typeof createModuleGameRuntimeController === "function"
);

if (
  typeof createClassicGameRuntimeController !== "function" ||
  typeof createModuleGameRuntimeController !== "function"
) {
  console.error("\nGame runtime controller fixture setup failed.");
  process.exit(1);
}

const classicFixture = makeRuntimeFixture(createClassicGameRuntimeController);
const moduleFixture = makeRuntimeFixture(createModuleGameRuntimeController);

classicFixture.controller.initializeRuntime();
moduleFixture.controller.initializeRuntime();

const initializedClassic = classicFixture.snapshot();
const initializedModule = moduleFixture.snapshot();
check(
  "classic and native controllers initialize with equivalent snapshots",
  snapshotsMatch(initializedClassic, initializedModule)
);
check(
  "controllers initialize speed input lifecycle and render ownership",
  [initializedClassic, initializedModule].every(
    (snapshot) =>
      snapshot.gameSpeed === 1 &&
      snapshot.documentSpeed === "1" &&
      snapshot.hud === "Speed x1" &&
      snapshot.inputBound === true &&
      snapshot.inputUsesFixtureCanvas === true &&
      snapshot.inputUsesFixtureGameGetter === true &&
      snapshot.canvasListeners.mousedown === 1 &&
      snapshot.canvasListeners.touchstart === 1 &&
      snapshot.documentListeners.visibilitychange === 1 &&
      snapshot.globalListeners.beforeunload === 1 &&
      snapshot.globalListeners.pagehide === 1 &&
      snapshot.shellBinds === 1 &&
      snapshot.debugBinds === 1 &&
      snapshot.spriteLoads === 1 &&
      snapshot.renderMetaCalls === 1 &&
      snapshot.rafSchedules === 1
  )
);

const moveEvent = { buttons: 1, clientX: 130, clientY: 95 };
classicFixture.dispatchCanvas("mousedown", moveEvent);
moduleFixture.dispatchCanvas("mousedown", moveEvent);
const movedClassic = classicFixture.snapshot();
const movedModule = moduleFixture.snapshot();
check(
  "classic and native controllers clear the movement gate identically",
  snapshotsMatch(movedClassic, movedModule)
);
check(
  "controllers map the same canvas mouse fixture to the same target",
  [movedClassic, movedModule].every(
    (snapshot) =>
      snapshot.awaitingFirstMoveInput === false &&
      snapshot.targetX === 240 &&
      snapshot.targetY === 150 &&
      snapshot.hiddenMovementBanners === 1
  )
);

classicFixture.clickSpeed(5);
moduleFixture.clickSpeed(5);
const spedClassic = classicFixture.snapshot();
const spedModule = moduleFixture.snapshot();
check(
  "classic and native controllers keep x5 speed snapshots equivalent",
  snapshotsMatch(spedClassic, spedModule)
);
check(
  "controllers update speed button body state and HUD",
  [spedClassic, spedModule].every(
    (snapshot) =>
      snapshot.gameSpeed === 5 &&
      snapshot.documentSpeed === "5" &&
      snapshot.hud === "Speed x5" &&
      snapshot.speedButtonStates["5"].active === true &&
      snapshot.speedButtonStates["5"].pressed === "true"
  )
);

classicFixture.getSave().coins = 77;
moduleFixture.getSave().coins = 77;
classicFixture.dispatchPagehide();
moduleFixture.dispatchPagehide();
const flushedClassic = classicFixture.snapshot();
const flushedModule = moduleFixture.snapshot();
check(
  "classic and native lifecycle flush snapshots remain equivalent",
  snapshotsMatch(flushedClassic, flushedModule)
);
check(
  "controllers persist the injected save on pagehide",
  [flushedClassic, flushedModule].every(
    (snapshot) => snapshot.persistCalls === 1 && snapshot.persistedCoins.join(",") === "77"
  )
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

function snapshotsMatch(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
