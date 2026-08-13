import { createBrowserDependencyBagOptions } from "../src/app/browser-dependency-bag.js";

const drawCalls = [];
const canvasContext = {
  globalAlpha: 1,
  drawImage(...args) {
    drawCalls.push(args);
  },
  restore() {},
  rotate() {},
  save() {},
  scale() {},
  translate() {},
};
const canvas = {
  height: 540,
  width: 960,
  getContext() {
    return canvasContext;
  },
};
const documentRef = { body: { dataset: {} } };
const globalRef = {
  Image: class {
    complete = true;
    naturalHeight = 16;
    naturalWidth = 16;

    addEventListener() {}

    get src() {
      return this.source || "";
    }

    set src(value) {
      this.source = value;
      if (value === "enemy-sheet") {
        this.naturalHeight = 800;
        this.naturalWidth = 600;
      } else if (value === "boss-sheet") {
        this.naturalHeight = 300;
        this.naturalWidth = 900;
      } else if (value === "sheet-unavailable") {
        this.complete = false;
      }
    }
  },
  performance: { now: () => 0 },
};
const content = {
  assets: {
    sprites: {
      player: "static-player",
      enemies: {
        boss: "static-boss",
        drifter: "static-drifter",
        fallback: "static-fallback",
      },
      spriteSheets: {
        bosses: {
          columns: 9,
          path: "boss-sheet",
          rows: 3,
          animations: {
            charger: {
              row: 1,
              idle: { fps: 6, frames: [0, 1, 2], loop: true },
              release: { fps: 10, frames: [6, 7, 8], loop: false },
              windup: { fps: 9, frames: [3, 4, 5], loop: false },
            },
          },
        },
        enemies: {
          columns: 6,
          path: "enemy-sheet",
          rows: 8,
          animations: {
            drifter: { fps: 10, frames: [0, 1, 2, 3, 4, 5], loop: true, row: 2 },
          },
        },
        unavailable: {
          columns: 1,
          path: "sheet-unavailable",
          rows: 1,
          animations: {
            fallback: { fps: 1, frames: [0], loop: true, row: 0 },
          },
        },
      },
    },
  },
};

const spriteOptions = createBrowserDependencyBagOptions({
  canvas,
  content,
  documentRef,
  globalRef,
  ui: createUi(),
});
const spriteSystem = spriteOptions.adapters.spriteAdapters.spriteSystem;
spriteSystem.loadSprites();

assert(
  "enemy animation selects its configured sheet row and timed frame",
  spriteSystem.drawSprite("enemy:drifter", 100, 100, 48, 0, {
    animationId: "drifter",
    animationState: "idle",
    sheetId: "enemies",
    time: 0.35,
  }) === true &&
    drawCallMatches(drawCalls.at(-1), "enemy-sheet", [300, 200, 100, 100, -24, -24, 48, 48])
);
drawCalls.length = 0;
assert(
  "production enemy renderer returns a sheet draw using its supplied animation mapping",
  spriteOptions.adapters.renderingAdapters.renderers.renderEnemies({
    enemies: [{ animTime: 0.35, radius: 14, type: "drifter", x: 100, y: 100 }],
    spriteAdapters: spriteOptions.adapters.spriteAdapters,
  }) === true &&
    drawCallMatches(drawCalls.at(-1), "enemy-sheet", [300, 200, 100, 100, -28, -28, 56, 56])
);
assert(
  "boss release inherits its configured animation row and selects the authored release frame",
  spriteSystem.drawSprite("enemy:boss", 200, 100, 60, 0, {
    animationId: "charger",
    animationState: "release",
    sheetId: "bosses",
    time: 0.15,
  }) === true &&
    drawCallMatches(drawCalls.at(-1), "boss-sheet", [700, 100, 100, 100, -30, -30, 60, 60])
);
assert(
  "static sprite remains the explicit fallback when its configured sheet cannot draw",
  spriteSystem.drawSprite("enemy:fallback", 20, 20, 32, 0, {
    animationId: "fallback",
    animationState: "idle",
    sheetId: "unavailable",
  }) === true && drawCalls.at(-1)?.[0]?.src === "static-fallback"
);
assert(
  "unframed static player sprites draw their full source image instead of a single pixel",
  spriteSystem.drawSprite("player", 20, 20, 32) === true &&
    drawCallMatches(drawCalls.at(-1), "static-player", [0, 0, 16, 16, -16, -16, 32, 32])
);

const menuUi = createUi();
const menuEvents = [];
const game = { pauseReason: "", paused: false, running: true };
const menuOptions = createBrowserDependencyBagOptions({
  canvas,
  content: {},
  documentRef,
  globalRef,
  ui: menuUi,
});
const browserUiAdapters = menuOptions.adapters.uiAdapters;
browserUiAdapters.bindRuntimeUiActions({
  setRunMenuOpen(open) {
    menuEvents.push(open);
    if (open && game.running && !game.paused) {
      game.paused = true;
      game.pauseReason = "menu";
    }
    if (!open && game.pauseReason === "menu") {
      game.paused = false;
      game.pauseReason = "";
    }
  },
});
browserUiAdapters.shellUiAdapter.bind();
menuEvents.length = 0;
menuUi.openMenu.emit("click");
const openedMenuGame = { ...game };
menuUi.closeMenu.emit("click");
const closedMenuGame = { ...game };
game.paused = true;
game.pauseReason = "level";
menuUi.openMenu.emit("click");
menuUi.closeMenu.emit("click");

assert(
  "menu adapter invokes the runtime action for open and close while toggling its DOM surface",
  JSON.stringify(menuEvents) === JSON.stringify([true, false, true, false]) &&
    openedMenuGame.paused === true &&
    openedMenuGame.pauseReason === "menu" &&
    closedMenuGame.paused === false &&
    closedMenuGame.pauseReason === "" &&
    menuUi.runMenu.hidden === true
);
assert(
  "menu close leaves an unrelated pause reason intact",
  game.paused === true && game.pauseReason === "level"
);

function createUi() {
  const ui = {
    closeMenu: createElement(),
    exitRun: createElement(),
    menuInventoryPanel: createElement(),
    menuInventoryTab: createElement(),
    menuProgressPanel: createElement(),
    menuProgressTab: createElement(),
    menuShopPanel: createElement(),
    menuShopTab: createElement(),
    openMenu: createElement(),
    runMenu: createElement({ hidden: true }),
    startTransition: createElement({ hidden: true }),
    titleScreen: createElement({ hidden: true }),
    titleStartGame: createElement(),
  };
  return ui;
}

function createElement({ hidden = false } = {}) {
  const listeners = new Map();
  const classes = new Set(hidden ? ["hidden"] : []);
  return {
    attributes: {},
    classList: {
      add(name) {
        classes.add(name);
      },
      contains(name) {
        return classes.has(name);
      },
      remove(name) {
        classes.delete(name);
      },
      toggle(name, value) {
        if (value) classes.add(name);
        else classes.delete(name);
      },
    },
    disabled: false,
    hidden,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    emit(type) {
      listeners.get(type)?.();
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
  };
}

function drawCallMatches(call, source, expectedArguments) {
  return call?.[0]?.src === source && JSON.stringify(call.slice(1)) === JSON.stringify(expectedArguments);
}

function assert(label, condition) {
  if (!condition) throw new Error(`FAILED: ${label}`);
  console.log(`PASS: ${label}`);
}
