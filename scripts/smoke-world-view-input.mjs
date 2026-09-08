import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createGameHarness } from "./smoke-game-harness.mjs";
import { createGameDependencyBag } from "../src/modules/game-dependencies.js";
import { balanceProfiles, content as generatedContent } from "../src/content.generated.mjs";
import { bootProductionModuleEntrypoint } from "../src/app/production-module-entrypoint.js";

import { createBrowserRenderingAdapters } from "../src/app/browser-rendering-adapters.js";
import { createGameRuntimeController } from "../src/modules/game-runtime.js";
import { bindMovementInput, setTargetFromEvent } from "../src/modules/input.js";
import { createModuleGameLifecycleOwner } from "../src/modules/module-game-lifecycle.js";
import { createRenderer } from "../src/modules/rendering.js";
import { createWorldViewRuntime } from "../src/modules/world-view-runtime.js";
import { createBrowserPlatformAdapters } from "../src/app/browser-platform-adapters.js";

const world = Object.freeze({ modeId: "climb", width: 2880, height: 1620, zoom: 1.25 });
const player = { x: 1440, y: 810, targetX: 1440, targetY: 810, radius: 16, pickupRadius: 54 };
const game = {
  areas: [],
  beams: [],
  bolts: [],
  bossAttacks: [],
  enemies: [],
  enemyBolts: [],
  lootDrops: [],
  pickupTexts: [],
  player,
  running: true,
  weaponBursts: [],
  world,
  xpDrops: [],
};
const spatialView = Object.freeze({
  camera: Object.freeze({ x: 1056, y: 594, zoom: 1.25, width: 768, height: 432 }),
  viewport: Object.freeze({ width: 960, height: 540 }),
  visibleBounds: Object.freeze({ left: 1056, top: 594, right: 1824, bottom: 1026 }),
  worldBounds: Object.freeze({ left: 0, top: 0, right: 2880, bottom: 1620 }),
});

const inputCanvas = makeCanvas();
const inputWorldView = createWorldViewRuntime({ canvas: inputCanvas });
assert.equal(
  setTargetFromEvent({
    event: { clientX: 250, clientY: 155 },
    canvas: inputCanvas,
    game,
    worldView: inputWorldView,
  }),
  true
);
assert.deepEqual(
  [player.targetX, player.targetY],
  [1440, 810],
  "CSS point converts once through view to world"
);
player.x = 2862;
player.y = 1602;
assert.equal(
  setTargetFromEvent({
    event: { clientX: 250, clientY: 155 },
    canvas: inputCanvas,
    game,
    worldView: inputWorldView,
  }),
  true
);
assert.deepEqual(
  [player.targetX, player.targetY],
  [2496, 1404],
  "input uses the event-time edge camera"
);
const beforeInvalid = [player.targetX, player.targetY];
assert.equal(
  setTargetFromEvent({
    event: { touches: [] },
    canvas: inputCanvas,
    game,
    worldView: inputWorldView,
  }),
  false
);
assert.deepEqual([player.targetX, player.targetY], beforeInvalid, "empty touch preserves target");
const bound = bindMovementInput({
  canvas: inputCanvas,
  getGame: () => game,
  worldView: inputWorldView,
});
inputCanvas.emit("touchstart", { preventDefault() {}, touches: [{ clientX: 10, clientY: 20 }] });
assert.deepEqual(
  [player.targetX, player.targetY],
  [2112, 1188],
  "touch uses CSS-to-view scaling once"
);
assert.equal(typeof bound.setTarget, "function");

let gatedGame = { ...game, awaitingFirstMoveInput: true, player: { ...player, x: 1440, y: 810 } };
let hiddenGates = 0;
const gateCanvas = makeCanvas();
createGameRuntimeController({
  bannerSystem: { hideMovementGateBanner: () => hiddenGates++ },
  bindMovementInput: createBrowserPlatformAdapters({ canvas: gateCanvas, globalRef: {}, ui: {} })
    .bindMovementInput,
  canvas: gateCanvas,
  debugSystem: { bind() {} },
  documentRef: { body: { dataset: {} } },
  getGame: () => gatedGame,
  getSave: () => ({}),
  globalRef: { requestAnimationFrame() {} },
  loop() {},
  persist() {},
  renderMeta() {},
  runUi: { updateRunHud() {}, hideEndScreen() {} },
  saveSystem: { loadSave: () => ({}), defaultSave: () => ({}), removeSave() {} },
  setGame(next) {
    gatedGame = next;
  },
  setSave() {},
  shellUi: { bind() {} },
  shopSystem: { closeShop() {} },
  spriteSystem: { loadSprites() {} },
  ui: { levelUp: { classList: { add() {} } }, speedButtons: [] },
}).initializeRuntime();
gateCanvas.emit("mousedown", { clientX: 250, clientY: 155 });
assert.equal(
  gatedGame.awaitingFirstMoveInput,
  false,
  "first input gate uses the converted movement callback"
);
assert.equal(hiddenGates, 1);

const browserContext = makeContext();
const browserCanvas = makeCanvas(browserContext);
const browser = createBrowserRenderingAdapters({ canvas: browserCanvas }).renderers;
const sprites = { spriteSystem: { drawImage: () => false, drawSprite: () => false } };
browser.renderFrame({ game, spatialView, spriteAdapters: sprites });
browser.renderEnemies({
  enemies: [{ x: 1440, y: 810, radius: 14 }],
  spatialView,
  spriteAdapters: sprites,
});
browser.renderPlayer({ game, spatialView, spriteAdapters: sprites });
assert.equal(
  browserContext.transforms.length,
  3,
  "all browser world passes receive the camera transform"
);
assert.deepEqual(browserContext.transforms[0], [1.25, 0, 0, 1.25, -1320, -742.5]);
assert.deepEqual(
  browserContext.matrix,
  browserContext.initialMatrix,
  "world rendering restores a nontrivial incoming matrix"
);
browser.renderHud({ game });
assert.deepEqual(
  browserContext.matrix,
  browserContext.initialMatrix,
  "HUD remains in screen space"
);
assert.ok(
  browserContext.text.some((entry) => entry[0].startsWith("Tower Floor") && entry[1] === 480)
);
assert.throws(() =>
  browser.renderFrame({
    game,
    spatialView,
    spriteAdapters: {
      spriteSystem: {
        drawImage() {
          throw new Error("draw failure");
        },
      },
    },
  })
);
assert.deepEqual(
  browserContext.matrix,
  browserContext.initialMatrix,
  "browser transform restores after draw errors"
);
browser.renderFrame({
  game,
  spatialView: { ...spatialView, camera: { ...spatialView.camera, x: 0, y: 0, zoom: 1 } },
  spriteAdapters: sprites,
});
assert.deepEqual(browserContext.transforms.at(-1), [1, 0, 0, 1, 0, 0], "Farm camera is identity");

const retainedContext = makeContext();
const retained = createRenderer({
  worldView: createWorldViewRuntime({ canvas: makeCanvas(retainedContext) }),
  canvas: makeCanvas(retainedContext),
  ctx: retainedContext,
  clamp: (n, low, high) => Math.max(low, Math.min(high, n)),
  createEnemyRenderer: () => ({ drawEnemy() {}, drawEnemyBolt() {} }),
  createHudRenderer: () => ({
    drawBossSpawnNotice() {},
    drawGameHud() {},
    drawTowerFloorBadge() {},
  }),
  createSkillRailRenderer: () => ({}),
  drawImage: () => false,
  drawSprite: () => false,
  weaponDefs: {},
});
retained.draw(game);
assert.deepEqual(
  retainedContext.transforms[0],
  [1.25, 0, 0, 1.25, -2640, -1485],
  "retained renderer clamps at the world corner"
);
assert.deepEqual(
  retainedContext.matrix,
  retainedContext.initialMatrix,
  "retained renderer restores its matrix"
);

player.x = 1440;
player.y = 810;
for (const traced of [false, true]) {
  player.x = 1440;
  player.y = 810;
  const frames = [];
  let handler;
  const dependencies = renderingDependencies(game, frames, (next) => {
    handler = next;
  });
  dependencies.rendering.clearFrame = (frame) => {
    frames.push(frame);
    player.x = 2862;
    player.y = 1602;
  };
  const trace = traced ? makeTrace() : null;
  const owner = createModuleGameLifecycleOwner({
    dependencies,
    performanceTrace: trace,
    platform: { documentRef: {}, runtimeGlobal: { performance: { now: () => 0 } } },
    runtime: { getGameSpeed: () => 1, initializeRuntime() {} },
  });
  if (traced) handler(1);
  else owner.render({ source: "normal" });
  assert.equal(frames.length, 6, `${traced ? "traced" : "normal"} render invokes every pass`);
  assert.ok(
    frames.every((frame) => frame === frames[0] && frame.spatialView === frames[0].spatialView)
  );
  assert.deepEqual(frames[0].spatialView.camera, spatialView.camera);
}

player.x = 1440;
player.y = 810;
// The production input composition must convert exactly once, then notify the gate.
let rectReads = 0;
let rect = { left: 10, top: 20, width: 480, height: 270 };
gateCanvas.getBoundingClientRect = () => {
  rectReads++;
  return rect;
};
for (const modeId of ["climb", "farm"]) {
  gatedGame = {
    ...game,
    awaitingFirstMoveInput: true,
    paused: false,
    world: modeId === "climb" ? world : { modeId, width: 960, height: 540, zoom: 1 },
    player: {
      ...player,
      x: modeId === "climb" ? 1440 : 480,
      y: modeId === "climb" ? 810 : 270,
      targetX: 17,
      targetY: 19,
    },
  };
  const hiddenBefore = hiddenGates;
  const invalidEvents = [
    { touches: [] },
    { clientX: NaN, clientY: 20 },
    { touches: [{ clientX: 20, clientY: Infinity }] },
  ];
  for (const event of invalidEvents)
    gateCanvas.emit(event.touches ? "touchstart" : "mousedown", event);
  rect.width = 0;
  gateCanvas.emit("mousedown", { clientX: 250, clientY: 155 });
  rect.width = 480;
  gatedGame.paused = true;
  gateCanvas.emit("touchstart", { touches: [{ clientX: 250, clientY: 155 }] });
  gatedGame.paused = false;
  assert.equal(gatedGame.awaitingFirstMoveInput, true);
  assert.equal(hiddenGates, hiddenBefore);
  assert.deepEqual([gatedGame.player.targetX, gatedGame.player.targetY], [17, 19]);
  const readsBefore = rectReads;
  gateCanvas.emit("touchstart", { touches: [{ clientX: 250, clientY: 155 }] });
  assert.equal(rectReads - readsBefore, 1, "first touch reads geometry once, not again in gate");
  assert.equal(hiddenGates, hiddenBefore + 1);
  assert.equal(gatedGame.awaitingFirstMoveInput, false);
  assert.deepEqual(
    [gatedGame.player.targetX, gatedGame.player.targetY],
    modeId === "climb" ? [1440, 810] : [480, 270]
  );
  rect = { left: 50, top: 70, width: 240, height: 540 };
  gateCanvas.emit("mousemove", { buttons: 0, clientX: 50, clientY: 70 });
  assert.deepEqual(
    [gatedGame.player.targetX, gatedGame.player.targetY],
    modeId === "climb" ? [1440, 810] : [480, 270]
  );
  if (modeId === "climb") {
    gatedGame.player.x = 2862;
    gatedGame.player.y = 1602;
  }
  gateCanvas.emit("mousemove", { buttons: 1, clientX: 170, clientY: 340 });
  assert.deepEqual(
    [gatedGame.player.targetX, gatedGame.player.targetY],
    modeId === "climb" ? [2496, 1404] : [480, 270],
    "drag after CSS resize/follow derives live camera"
  );
  gateCanvas.emit("touchmove", { touches: [{ clientX: 50, clientY: 70 }] });
  assert.deepEqual(
    [gatedGame.player.targetX, gatedGame.player.targetY],
    modeId === "climb" ? [2112, 1188] : [0, 0]
  );
  rect = { left: 10, top: 20, width: 480, height: 270 };
}
// Standalone factories deliberately retain legacy/Farm input, but refuse uninjected Climb.
assert.equal(
  setTargetFromEvent({ canvas: inputCanvas, game, event: { clientX: 250, clientY: 155 } }),
  false
);
const legacy = { ...game, world: undefined, player: { ...player } };
assert.equal(
  setTargetFromEvent({ canvas: inputCanvas, game: legacy, event: { clientX: 250, clientY: 155 } }),
  true
);
assert.deepEqual([legacy.player.targetX, legacy.player.targetY], [480, 270]);

for (const modeId of [undefined, "farm"]) {
  const fractionalCanvas = makeCanvas();
  const fractionalRect = { left: 13.7, top: -9.3, width: 371.2, height: 259.7 };
  fractionalCanvas.getBoundingClientRect = () => fractionalRect;
  const fractionalGame = {
    ...legacy,
    world: modeId ? { modeId, width: 960, height: 540, zoom: 1 } : undefined,
    player: { ...player },
  };
  const event = { clientX: 139.13, clientY: 73.97 };
  const expected = [
    ((event.clientX - fractionalRect.left) / fractionalRect.width) * 960,
    ((event.clientY - fractionalRect.top) / fractionalRect.height) * 540,
  ];
  for (const worldView of [undefined, createWorldViewRuntime({ canvas: fractionalCanvas })]) {
    assert.equal(
      setTargetFromEvent({ canvas: fractionalCanvas, game: fractionalGame, event, worldView }),
      true
    );
    assert.deepEqual(
      [fractionalGame.player.targetX, fractionalGame.player.targetY],
      expected,
      "Farm and legacy preserve exact original fractional CSS arithmetic"
    );
  }
}

const cameraCases = [
  [1440, 810, 1056, 594],
  [18, 810, 0, 594],
  [2862, 810, 2112, 594],
  [1440, 18, 1056, 0],
  [1440, 1602, 1056, 1188],
  [18, 18, 0, 0],
  [2862, 18, 2112, 0],
  [18, 1602, 0, 1188],
  [2862, 1602, 2112, 1188],
];
for (const [x, y, cameraX, cameraY] of cameraCases) {
  const current = { ...game, player: { ...player, x, y } };
  const snapshot = inputWorldView.snapshot(current);
  assert.deepEqual([snapshot.camera.x, snapshot.camera.y], [cameraX, cameraY]);
  assert.ok(
    Object.isFrozen(snapshot) &&
      Object.isFrozen(snapshot.camera) &&
      Object.isFrozen(snapshot.viewport)
  );
  assert.equal(
    setTargetFromEvent({
      canvas: inputCanvas,
      game: current,
      event: { clientX: 250, clientY: 155 },
      worldView: inputWorldView,
    }),
    true
  );
  assert.deepEqual(
    [current.player.targetX, current.player.targetY],
    [cameraX + 384, cameraY + 216]
  );
}
inputCanvas.width = 1200;
inputCanvas.height = 750;
assert.deepEqual(inputWorldView.snapshot(game).camera, {
  x: 960,
  y: 510,
  width: 960,
  height: 600,
  zoom: 1.25,
});
assert.deepEqual(world, { modeId: "climb", width: 2880, height: 1620, zoom: 1.25 });
inputCanvas.width = 960;
inputCanvas.height = 540;

// Every geometry family carries the SAME affine matrix, including b/c cross terms.
for (const modeId of ["climb", "farm"]) {
  const p =
    modeId === "climb"
      ? { ...player, x: 1440, y: 810, targetX: 1500, targetY: 850 }
      : { ...player, x: 480, y: 270, targetX: 540, targetY: 310 };
  const point = (delta) => ({ x: p.x + delta, y: p.y + delta, radius: 9, life: 1, maxLife: 1 });
  const scene = {
    ...game,
    player: p,
    world: modeId === "climb" ? world : { modeId, width: 960, height: 540, zoom: 1 },
    areas: [{ ...point(1), color: "red" }],
    weaponBursts: [{ ...point(2), color: "red" }],
    bossAttacks: [{ ...point(3), age: 1, windup: 2 }],
    xpDrops: [point(4)],
    lootDrops: [{ ...point(5), type: "coin" }],
    bolts: [point(6)],
    enemyBolts: [point(7)],
    enemies: [point(8)],
    beams: [{ ...point(9), endX: p.x + 19, endY: p.y + 19, width: 3 }],
    pickupTexts: [{ ...point(10), text: "pickup" }],
    bossSpawnNotice: { text: "notice", life: 1, maxLife: 1 },
  };
  const expectedMatrix =
    modeId === "climb" ? [1.5, 0.125, 0.25, 1.125, -1725.5, -789.25] : [1.2, 0.1, 0.2, 0.9, 7, 11];
  for (const retainedPath of [false, true]) {
    const ctx = makeContext();
    const canvas = makeCanvas(ctx);
    const view = createWorldViewRuntime({ canvas });
    if (retainedPath) {
      let snapshots = 0;
      const renderer = createRenderer({
        canvas,
        ctx,
        worldView: {
          snapshot(g) {
            snapshots++;
            return view.snapshot(g);
          },
        },
        clamp: (n, a, b) => Math.max(a, Math.min(b, n)),
        createEnemyRenderer: () => ({
          drawEnemy: (e) => ctx.arc(e.x, e.y, e.radius),
          drawEnemyBolt: (e) => ctx.arc(e.x, e.y, e.radius),
        }),
        createHudRenderer: () => ({
          drawBossSpawnNotice: () => ctx.fillText("notice", 480, 104),
          drawGameHud: () => ctx.fillText("hud", 18, 108),
          drawTowerFloorBadge: () => ctx.fillText("Tower Floor", 480, 34),
        }),
        createSkillRailRenderer: () => ({}),
        drawImage: () => false,
        drawSprite: () => false,
        weaponDefs: {},
      });
      renderer.draw(scene);
      assert.equal(snapshots, 1, "retained frame derives exactly one snapshot");
    } else {
      const renderers = createBrowserRenderingAdapters({ canvas }).renderers;
      const frame = { game: scene, spatialView: view.snapshot(scene), spriteAdapters: sprites };
      renderers.clearFrame(frame);
      renderers.renderFrame(frame);
      renderers.renderEnemies({ ...frame, enemies: scene.enemies });
      renderers.renderPlayer(frame);
      renderers.renderHud(frame);
      renderers.renderSkillRail(frame);
    }
    for (let delta = 1; delta <= 10; delta++) {
      const op = ctx.operations.find(
        ({ name, args }) =>
          ["arc", "moveTo", "fillText"].includes(name) &&
          (name === "fillText"
            ? args[1] === p.x + delta && args[2] === p.y + delta
            : args[0] === p.x + delta && args[1] === p.y + delta)
      );
      assert.ok(op, `geometry family ${delta} drawn on ${retainedPath ? "retained" : "native"}`);
      assert.deepEqual(op.matrix, expectedMatrix, `geometry family ${delta} alignment`);
    }
    const targetLine = ctx.operations.find(
      ({ name, args }) => name === "lineTo" && args[0] === p.targetX && args[1] === p.targetY
    );
    assert.deepEqual(targetLine.matrix, expectedMatrix, "target line is world-space");
    const transformedPlayer = [
      expectedMatrix[0] * p.x + expectedMatrix[2] * p.y + expectedMatrix[4],
      expectedMatrix[1] * p.x + expectedMatrix[3] * p.y + expectedMatrix[5],
    ];
    assert.deepEqual(
      transformedPlayer,
      [637, 302],
      "independent affine center oracle includes skew and translation"
    );
    for (const op of ctx.operations.filter(
      ({ name, args }) =>
        name === "clearRect" ||
        (name === "fillText" && ["Tower Floor", "Tower Floor 1", "notice", "hud"].includes(args[0]))
    ))
      assert.deepEqual(op.matrix, ctx.initialMatrix, "clear/HUD screen-space");
    assert.deepEqual(ctx.matrix, ctx.initialMatrix);
    assert.equal(ctx.stack.length, 0);
  }
}
const errorContext = makeContext();
const errorCanvas = makeCanvas(errorContext);
const errorRenderer = createRenderer({
  canvas: errorCanvas,
  ctx: errorContext,
  worldView: createWorldViewRuntime({ canvas: errorCanvas }),
  createEnemyRenderer: () => ({}),
  createHudRenderer: () => ({}),
  drawImage() {
    throw new Error("retained draw failure");
  },
});
assert.throws(() => errorRenderer.draw(game), /retained draw failure/);
assert.deepEqual(errorContext.matrix, errorContext.initialMatrix);
assert.equal(errorContext.stack.length, 0);

// Actual native AND retained composition: natural canvas events, frame draws and saves.
for (const retainedPath of [false, true]) {
  const harness = createGameHarness();
  const canvas = harness.elements.get("game");
  const ctx = makeContext();
  canvas.getContext = () => ctx;
  let reads = 0;
  canvas.getBoundingClientRect = () => {
    reads++;
    return { left: 10, top: 20, width: 480, height: 270 };
  };
  let runtime;
  if (retainedPath) {
    const source = readFileSync(new URL("../src/game.js", import.meta.url), "utf8").replace(
      /^import .*;\n/gm,
      ""
    );
    runtime = vm.runInNewContext(`${source}\n({ startRun, getGame: () => game, draw, persist });`, {
      ...harness.context,
      createGameDependencyBag,
      createGameRuntimeController,
      balanceProfiles,
      generatedContent,
    });
  } else {
    const entry = bootProductionModuleEntrypoint({ globalRef: harness.context });
    runtime = {
      startRun: entry.startRun,
      getGame: entry.dependencies.getGame,
      draw: entry.render,
      persist: entry.persist,
      dispose: entry.dispose,
    };
  }
  for (const modeId of ["climb", "farm"]) {
    runtime.startRun(modeId);
    const run = runtime.getGame();
    assert.equal(run.awaitingFirstMoveInput, true);
    canvas.listeners.get("touchstart")({ touches: [] });
    assert.equal(run.awaitingFirstMoveInput, true);
    const beforeReads = reads;
    canvas.listeners.get("mousedown")({ clientX: 130, clientY: 155 });
    assert.equal(reads - beforeReads, 1, "real composition first input converts once");
    assert.equal(run.awaitingFirstMoveInput, false);
    assert.deepEqual(
      [run.player.targetX, run.player.targetY],
      modeId === "climb" ? [1248, 810] : [240, 270]
    );
    ctx.transforms.length = 0;
    runtime.draw();
    assert.deepEqual(
      ctx.transforms[0],
      modeId === "climb" ? [1.25, 0, 0, 1.25, -1320, -742.5] : [1, 0, 0, 1, 0, 0]
    );
    assert.equal(ctx.stack.length, 0);
    assert.deepEqual(ctx.matrix, ctx.initialMatrix);
    runtime.persist();
    const save = JSON.parse(harness.context.localStorage.store.get("tap-survivor-mvp-save-v2"));
    for (const key of ["world", "camera", "spatial", "spatialView", "worldView", "player"])
      assert.equal(Object.hasOwn(save, key), false);
  }
  runtime.dispose?.();
}

console.log(
  "PASS world camera render transforms, restoration, HUD, lifecycle snapshots, and event-time input; actual native/retained composition and save exclusion"
);

function makeCanvas(context = makeContext()) {
  const listeners = new Map();
  return {
    width: 960,
    height: 540,
    addEventListener(type, listener) {
      const handlers = listeners.get(type) || [];
      handlers.push(listener);
      listeners.set(type, handlers);
    },
    emit(type, event) {
      listeners.get(type)?.forEach((listener) => listener(event));
    },
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 480, height: 270 }),
    getContext: () => context,
  };
}

function makeContext() {
  const initialMatrix = [1.2, 0.1, 0.2, 0.9, 7, 11];
  const context = {
    initialMatrix,
    matrix: [...initialMatrix],
    transforms: [],
    text: [],
    stack: [],
    operations: [],
  };
  for (const name of [
    "beginPath",
    "arc",
    "clearRect",
    "closePath",
    "fill",
    "fillRect",
    "lineTo",
    "moveTo",
    "stroke",
    "strokeRect",
    "quadraticCurveTo",
  ])
    context[name] = (...args) =>
      context.operations.push({ name, args, matrix: [...context.matrix] });
  context.fillText = (...args) => {
    context.text.push(args);
    context.operations.push({ name: "fillText", args, matrix: [...context.matrix] });
  };
  context.save = () => context.stack.push([...context.matrix]);
  context.restore = () => {
    context.matrix = context.stack.pop();
  };
  context.transform = (a, b, c, d, e, f) => {
    const [ma, mb, mc, md, me, mf] = context.matrix;
    context.transforms.push([a, b, c, d, e, f]);
    context.matrix = [
      ma * a + mc * b,
      mb * a + md * b,
      ma * c + mc * d,
      mb * c + md * d,
      ma * e + mc * f + me,
      mb * e + md * f + mf,
    ];
  };
  return context;
}

function renderingDependencies(currentGame, frames, attach) {
  const push = (_value, frame) => frames.push(frame);
  return {
    bannerSystem: {},
    bindRunLifecycle() {},
    canvas: { width: 960, height: 540 },
    getGame: () => currentGame,
    getSave: () => ({}),
    loop: attach ? { attachFrameHandler: attach } : {},
    persist() {},
    relicSystem: { relicChoices: () => [] },
    renderEnemies: { renderEnemies: push },
    renderHud: { renderHud: push },
    renderMeta() {},
    renderPlayer: { renderPlayer: push },
    renderSkillRail: { renderSkillRail: push },
    rendering: { clearFrame: (frame) => frames.push(frame), renderFrame: push },
    resetGameState: () => currentGame,
    runUi: { updateRunHud() {} },
    setGame() {},
    shellUi: {},
    shopSystem: {},
    ui: {},
  };
}

function makeTrace() {
  return {
    beginFrame: () => ({}),
    endFrame() {},
    getRenderStress: () => ({}),
    measureRenderPass: (_frame, _name, work) => work(),
    measureStage: (_frame, _name, work) => work(),
  };
}
