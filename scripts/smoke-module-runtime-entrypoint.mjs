import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createModuleRuntimeTestEntrypoint } from "../src/app/module-runtime-test-entrypoint.js";
import { createBrowserPlatform } from "../src/app/compose-runtime.js";

const root = new URL("..", import.meta.url).pathname;
const entrypointSource = readFileSync(join(root, "src/app/module-runtime-test-entrypoint.js"), "utf8");
const fixtureHtml = readFileSync(join(root, "tests/fixtures/module-runtime-test-entrypoint.html"), "utf8");
const calls = [];
const beforeTapGlobals = tapSurvivorGlobalNames();

check(
  "module runtime test fixture uses module script",
  fixtureHtml.includes('type="module"') && fixtureHtml.includes("../../src/app/module-runtime-test-entrypoint.js")
);
check(
  "module runtime test entrypoint imports compose runtime",
  entrypointSource.includes("./compose-runtime.js")
);
check(
  "module runtime test entrypoint has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(entrypointSource)
);
check(
  "module runtime test fixture has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(fixtureHtml)
);

let currentSave = { coins: 14 };
let currentGame = {
  running: true,
  paused: false,
  awaitingFirstMoveInput: true,
  player: {
    targetX: 0,
    targetY: 0,
  },
};
const canvas = {
  width: 960,
  height: 540,
  listeners: new Map(),
  addEventListener(type, handler) {
    this.listeners.set(type, handler);
    calls.push(`canvas:${type}`);
  },
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 960, height: 540 };
  },
};
const speedButtons = [1, 2, 5].map((speed) => ({
  dataset: { speed: String(speed) },
  classList: {
    toggle(name, value) {
      calls.push(`speed:${speed}:${name}:${value}`);
    },
  },
  setAttribute(name, value) {
    calls.push(`speed:${speed}:${name}:${value}`);
  },
}));
const documentRef = {
  body: { dataset: {} },
  visibilityState: "visible",
  addEventListener(type) {
    calls.push(`document:${type}`);
  },
};
const runtimeGlobal = {
  requestAnimationFrame(callback) {
    this.frameCallback = callback;
    calls.push("raf");
    return 1;
  },
  addEventListener(type) {
    calls.push(`global:${type}`);
  },
  Capacitor: {
    Plugins: {
      App: {
        addListener(type) {
          calls.push(`capacitor:${type}`);
          return { catch() {} };
        },
      },
    },
  },
};

const entrypoint = createModuleRuntimeTestEntrypoint({
  autoInitialize: true,
  platform: createBrowserPlatform({ globalRef: runtimeGlobal, documentRef }),
  dependencies: {
    canvas,
    ui: {
      speedButtons,
      levelUp: { classList: { add: () => calls.push("level-up:hidden") } },
    },
    getGame: () => currentGame,
    setGame: (game) => {
      currentGame = game;
      calls.push("set-game");
    },
    getSave: () => currentSave,
    setSave: (save) => {
      currentSave = save;
      calls.push("set-save");
    },
    saveSystem: {
      defaultSave: () => currentSave,
      loadSave: () => currentSave,
      removeSave: () => {},
    },
    shellUi: {
      bind: () => calls.push("shell:bind"),
      closeRunMenu: () => calls.push("shell:close-run-menu"),
      showTitleScreen: () => calls.push("shell:title"),
    },
    shopSystem: {
      closeShop: () => calls.push("shop:close"),
    },
    runUi: {
      hideEndScreen: () => calls.push("run-ui:hide-end"),
      updateRunHud: () => calls.push("run-ui:update-hud"),
    },
    debugSystem: {
      bind: () => calls.push("debug:bind"),
    },
    spriteSystem: {
      loadSprites: () => calls.push("sprites:load"),
    },
    bannerSystem: {
      hideMovementGateBanner: () => calls.push("banner:hide-movement-gate"),
    },
    bindMovementInput: () => calls.push("input:bind"),
    persist: () => calls.push("persist"),
    renderMeta: () => calls.push("render-meta"),
    loop: () => calls.push("loop"),
  },
});

entrypoint.runtime.setGameSpeed(5);
canvas.listeners.get("mousedown")({ clientX: 640, clientY: 270 });
const afterTapGlobals = tapSurvivorGlobalNames();

check("module runtime test entrypoint initializes runtime", calls.includes("shell:bind") && calls.includes("raf"));
check("module runtime test entrypoint wires input without classic globals", calls.includes("input:bind"));
check("module runtime test entrypoint updates speed through injected document", documentRef.body.dataset.gameSpeed === "5");
check(
  "module runtime test entrypoint clears movement gate through injected canvas",
  currentGame.awaitingFirstMoveInput === false && calls.includes("banner:hide-movement-gate")
);
check(
  "module runtime test entrypoint does not publish TapSurvivor globals",
  JSON.stringify(afterTapGlobals) === JSON.stringify(beforeTapGlobals)
);

if (process.exitCode) {
  console.error("\nModule runtime entrypoint smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nModule runtime entrypoint smoke passed.");

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

function tapSurvivorGlobalNames() {
  return Object.getOwnPropertyNames(globalThis)
    .filter((name) => name.startsWith("TapSurvivor"))
    .sort();
}
