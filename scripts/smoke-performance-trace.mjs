import assert from "node:assert/strict";

import { createBrowserPerformanceTrace } from "../src/app/performance-trace.js";
import { createBrowserRenderingAdapters } from "../src/app/browser-rendering-adapters.js";
import { createModuleGameLifecycleOwner } from "../src/modules/module-game-lifecycle.js";

function createElement(tagName) {
  const listeners = new Map();
  const element = {
    attributes: {},
    children: [],
    classList: {
      add() {},
      remove() {},
    },
    dataset: {},
    parentElement: null,
    style: {
      values: {},
      setProperty(name, value) {
        this.values[name] = value;
      },
    },
    tagName,
    textContent: "",
    addEventListener(name, listener) {
      const entries = listeners.get(name) || [];
      entries.push(listener);
      listeners.set(name, entries);
    },
    appendChild(child) {
      this.children.push(child);
      child.parentElement = this;
      return child;
    },
    click() {
      (listeners.get("click") || []).forEach((listener) => listener({ target: element }));
    },
    removeChild(child) {
      this.children = this.children.filter((entry) => entry !== child);
      child.parentElement = null;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
  };
  return element;
}

function createDocument() {
  const listeners = new Map();
  const body = createElement("body");
  return {
    body,
    createdTags: [],
    visibilityState: "visible",
    addEventListener(name, listener) {
      const entries = listeners.get(name) || [];
      entries.push(listener);
      listeners.set(name, entries);
    },
    createElement(tagName) {
      this.createdTags.push(tagName);
      return createElement(tagName);
    },
    dispatch(name, event = {}) {
      (listeners.get(name) || []).forEach((listener) => listener(event));
    },
    removeEventListener(name, listener) {
      listeners.set(
        name,
        (listeners.get(name) || []).filter((entry) => entry !== listener)
      );
    },
  };
}

function createGlobalRef(documentRef, search) {
  let clock = 0;
  let observerCallback = null;
  const listeners = new Map();
  const calls = {
    beacon: 0,
    clipboard: 0,
    download: 0,
    fetch: 0,
    objectUrls: 0,
    persistence: 0,
    revokedUrls: 0,
  };
  const globalRef = {
    Blob: class {
      constructor(parts, options) {
        this.parts = parts;
        this.options = options;
      }
    },
    PerformanceObserver: class {
      constructor(callback) {
        observerCallback = callback;
      }
      disconnect() {}
      observe() {}
    },
    URL: {
      createObjectURL() {
        calls.objectUrls += 1;
        return `blob:trace-${calls.objectUrls}`;
      },
      revokeObjectURL() {
        calls.revokedUrls += 1;
      },
    },
    addEventListener(name, listener) {
      const entries = listeners.get(name) || [];
      entries.push(listener);
      listeners.set(name, entries);
    },
    devicePixelRatio: 2,
    document: documentRef,
    fetch() {
      calls.fetch += 1;
      throw new Error("Trace must not fetch");
    },
    location: { search },
    localStorage: {
      getItem() {
        calls.persistence += 1;
        return null;
      },
      removeItem() {
        calls.persistence += 1;
      },
      setItem() {
        calls.persistence += 1;
      },
    },
    navigator: {
      clipboard: {
        async writeText(value) {
          calls.clipboard += 1;
          calls.clipboardPayload = value;
        },
      },
      deviceMemory: 8,
      hardwareConcurrency: 8,
      platform: "fixture-platform",
      sendBeacon() {
        calls.beacon += 1;
        throw new Error("Trace must not beacon");
      },
      userAgent: "fixture-browser",
    },
    performance: {
      now: () => clock,
    },
    removeEventListener(name, listener) {
      listeners.set(
        name,
        (listeners.get(name) || []).filter((entry) => entry !== listener)
      );
    },
  };
  return {
    advanceClock: (amount) => {
      clock += amount;
      return clock;
    },
    calls,
    dispatch(name, event = {}) {
      (listeners.get(name) || []).forEach((listener) => listener(event));
    },
    getListenerCount: () => [...listeners.values()].reduce((sum, entries) => sum + entries.length, 0),
    globalRef,
    reportLongTasks(entries) {
      observerCallback?.({
        getEntries: () => entries,
      });
    },
  };
}

function createCanvas(documentRef) {
  const context = new Proxy(
    {},
    {
      get(target, property) {
        if (property in target) return target[property];
        if (typeof property === "symbol") return undefined;
        return () => undefined;
      },
    }
  );
  return {
    height: 180,
    ownerDocument: documentRef,
    width: 320,
    getContext() {
      return context;
    },
  };
}

function makeLifecycleDependencies({ advanceClock, canvas, renderers }) {
  let frameHandler = null;
  const order = [];
  const game = {
    areas: [],
    beams: [],
    bolts: [
      {
        color: "#ffffff",
        radius: 3,
        vx: 1,
        vy: 0,
        weaponId: "spark_bolt",
        x: 130,
        y: 70,
      },
    ],
    bossAttacks: [],
    elapsed: 0,
    enemies: [
      {
        color: "#63d6b0",
        hp: 10,
        maxHp: 10,
        radius: 10,
        type: "skitter",
        x: 170,
        y: 90,
      },
    ],
    enemyBolts: [
      {
        color: "#b794ff",
        life: 1,
        maxLife: 1,
        radius: 3,
        vx: 1,
        vy: 0,
        x: 200,
        y: 100,
      },
    ],
    lootDrops: [],
    paused: false,
    pickupTexts: [],
    player: {
      equippedWeapons: [],
      hp: 10,
      maxHp: 10,
      pickupRadius: 40,
      radius: 12,
      targetX: 80,
      targetY: 70,
      x: 70,
      y: 70,
    },
    running: true,
    weaponBursts: [],
    xpDrops: [{ radius: 4, x: 95, y: 80 }],
  };
  const spriteDraws = [];
  const spriteAdapters = {
    spriteSystem: {
      drawImage() {
        return false;
      },
      drawSprite(id) {
        spriteDraws.push(id);
        return false;
      },
    },
  };
  const time = (work, amount) => {
    const result = work();
    advanceClock(amount);
    return result;
  };
  const dependencies = {
    bannerSystem: { showMovementGateBanner() {} },
    bindRunLifecycle() {},
    getGame: () => game,
    getSave: () => ({ towerFloor: 1 }),
    loop: {
      attachFrameHandler(handler) {
        frameHandler = handler;
      },
    },
    persist() {},
    relicSystem: { relicChoices: () => [] },
    renderEnemies: {
      renderEnemies(enemies, frame) {
        order.push("renderEnemies");
        return time(
          () => renderers.renderEnemies({ ...frame, enemies, spriteAdapters }),
          1
        );
      },
    },
    renderHud: {
      renderHud(currentGame, frame) {
        order.push("renderHud");
        return time(() => renderers.renderHud({ game: currentGame, frame }), 1);
      },
    },
    renderMeta() {},
    renderPlayer: {
      renderPlayer(currentGame, frame) {
        order.push("renderPlayer");
        return time(
          () => renderers.renderPlayer({ game: currentGame, frame, spriteAdapters }),
          1
        );
      },
    },
    renderSkillRail: {
      renderSkillRail(currentGame, frame) {
        order.push("renderSkillRail");
        return time(
          () => renderers.renderSkillRail({ game: currentGame, frame, spriteAdapters }),
          1
        );
      },
    },
    rendering: {
      clearFrame(frame) {
        order.push("clearFrame");
        return time(() => renderers.clearFrame({ frame }), 1);
      },
      renderFrame(currentGame, frame) {
        order.push("renderFrame");
        return time(
          () => renderers.renderFrame({ ...frame, game: currentGame, spriteAdapters }),
          2
        );
      },
    },
    resetGameState: () => game,
    runUi: {
      hideEndScreen() {},
      showEndScreen() {},
      updateRunHud() {
        order.push("updateRunHud");
        advanceClock(1);
      },
    },
    runUpdater: {
      update(dt) {
        order.push("tick");
        game.elapsed += dt;
        advanceClock(2);
      },
    },
    setGame() {},
    shellUi: {
      closeRunMenu() {},
      closeStartFlow() {},
      showTitleScreen() {},
    },
    shopSystem: { closeShop() {} },
    ui: {
      levelUp: { classList: { add() {} } },
      relicChoice: { classList: { add() {}, remove() {} } },
      relicChoiceText: { textContent: "" },
      relicChoiceTitle: { textContent: "" },
      relicChoices: { appendChild() {}, innerHTML: "" },
    },
  };
  return {
    canvas,
    dependencies,
    game,
    invokeFrame(timestamp) {
      assert.equal(typeof frameHandler, "function", "frame handler should be attached");
      frameHandler(timestamp);
    },
    order,
    spriteDraws,
  };
}

function findAction(root, action) {
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (node?.dataset?.perfTraceAction === action) return node;
    stack.push(...(node?.children || []));
  }
  return null;
}

const disabledDocument = createDocument();
const disabledPlatform = createGlobalRef(disabledDocument, "");
const disabledCanvas = createCanvas(disabledDocument);
const disabledTrace = createBrowserPerformanceTrace({
  canvas: disabledCanvas,
  documentRef: disabledDocument,
  globalRef: disabledPlatform.globalRef,
});
assert.equal(disabledTrace, null, "query-free runtime must not enable tracing");
assert.equal(disabledDocument.createdTags.length, 0, "disabled trace must not create overlay DOM");
assert.equal(disabledPlatform.getListenerCount(), 0, "disabled trace must not register page listeners");
assert.deepEqual(
  disabledPlatform.calls,
  {
    beacon: 0,
    clipboard: 0,
    download: 0,
    fetch: 0,
    objectUrls: 0,
    persistence: 0,
    revokedUrls: 0,
  },
  "disabled trace must not use network, clipboard, download, or persistence"
);
const disabledSpriteDraws = [];
const disabledRendering = createBrowserRenderingAdapters({
  canvas: disabledCanvas,
  content: {},
});
const disabledSpriteAdapters = {
  spriteSystem: {
    drawImage() {
      return false;
    },
    drawSprite(id) {
      disabledSpriteDraws.push(id);
      return false;
    },
  },
};
disabledRendering.renderers.renderFrame({
  game: {
    areas: [],
    beams: [],
    bolts: [],
    bossAttacks: [],
    enemyBolts: [],
    lootDrops: [],
    pickupTexts: [],
    weaponBursts: [],
    xpDrops: [],
  },
  spriteAdapters: disabledSpriteAdapters,
  stressProjectiles: [{ weaponId: "spark_bolt", x: 10, y: 10 }],
});
disabledRendering.renderers.renderEnemies({
  enemies: [],
  spriteAdapters: disabledSpriteAdapters,
  stressEnemies: [{ type: "skitter", x: 10, y: 10 }],
});
assert.deepEqual(
  disabledSpriteDraws,
  [],
  "query-free rendering must ignore synthetic stress arrays"
);

const fullHealthStressCanvas = createCanvas(disabledDocument);
const wrappedAdapterCalls = [];
const successfulSpriteRequests = [];
const fullHealthStressRendering = createBrowserRenderingAdapters({
  canvas: fullHealthStressCanvas,
  canvasCommandSink: (name) => wrappedAdapterCalls.push(name),
  content: {},
});
const stressEnemyTypes = ["skitter", "drifter", "bulwark", "hexer"];
const fullHealthStressEnemies = Array.from({ length: 500 }, (_, index) => {
  const columns = Math.ceil(Math.sqrt((500 * fullHealthStressCanvas.width) / fullHealthStressCanvas.height));
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    hp: 1,
    maxHp: 1,
    radius: 9 + (index % 4),
    towerFloor: 1 + (index % 25),
    type: stressEnemyTypes[index % stressEnemyTypes.length],
    vx: index % 2 === 0 ? 1 : -1,
    x: ((column + 0.5) / columns) * fullHealthStressCanvas.width,
    y: ((row + 0.5) / Math.ceil(500 / columns)) * fullHealthStressCanvas.height,
  };
});
fullHealthStressRendering.renderers.renderEnemies({
  enemies: [],
  spriteAdapters: {
    spriteSystem: {
      drawSprite(id) {
        successfulSpriteRequests.push(id);
        return true;
      },
    },
  },
  stressEnemies: fullHealthStressEnemies,
});
assert.equal(
  wrappedAdapterCalls.length,
  15_625,
  "500 successful full-health stress enemies must submit 15,625 wrapped adapter Canvas calls"
);
assert.equal(
  successfulSpriteRequests.length,
  500,
  "500 full-health stress enemies must request exactly 500 sprites"
);

const documentRef = createDocument();
const platform = createGlobalRef(documentRef, "?perfTrace=1");
const canvas = createCanvas(documentRef);
const trace = createBrowserPerformanceTrace({
  canvas,
  documentRef,
  globalRef: platform.globalRef,
  limits: {
    eventLimit: 2,
    frameLimit: 3,
    longTaskLimit: 2,
    worstFrameLimit: 2,
  },
});
assert.ok(trace, "exact perfTrace=1 query must enable tracing");
assert.equal(documentRef.body.children.length, 1, "enabled trace must add a dynamic overlay");
assert.ok(platform.getListenerCount() >= 2, "enabled trace must observe page errors and visibility");

const rendering = createBrowserRenderingAdapters({
  canvas,
  canvasCommandSink: trace.recordCanvasCommand,
  content: {},
});
const fixture = makeLifecycleDependencies({
  advanceClock: platform.advanceClock,
  canvas,
  renderers: rendering.renderers,
});
createModuleGameLifecycleOwner({
  dependencies: fixture.dependencies,
  performanceTrace: trace,
  platform: {
    documentRef,
    runtimeGlobal: platform.globalRef,
  },
  runtime: {
    getGameSpeed: () => 1,
    initializeRuntime() {},
  },
});
fixture.invokeFrame(10);
fixture.invokeFrame(60);
assert.deepEqual(
  fixture.order.slice(0, 8),
  [
    "tick",
    "clearFrame",
    "renderFrame",
    "renderEnemies",
    "renderPlayer",
    "renderHud",
    "renderSkillRail",
    "updateRunHud",
  ],
  "traced frame handler must preserve tick, render, then HUD order"
);
platform.dispatch("error", {
  colno: 3,
  filename: "fixture.js",
  lineno: 2,
  message: "fixture error one",
});
platform.dispatch("error", { message: "fixture error two" });
platform.dispatch("error", { message: "fixture error three" });
documentRef.visibilityState = "hidden";
documentRef.dispatch("visibilitychange");
platform.reportLongTasks([
  { duration: 61, name: "longtask", startTime: 61 },
  { duration: 75, name: "longtask", startTime: 75 },
  { duration: 91, name: "longtask", startTime: 91 },
]);

const activeExport = trace.exportData();
assert.equal(activeExport.localOnly, true, "trace export must declare local-only operation");
assert.equal(activeExport.exportedOnlyByManualAction, true, "trace export must declare manual export only");
assert.match(activeExport.canvas.label, /not GPU time/u, "canvas label must avoid GPU-time claims");
assert.deepEqual(
  activeExport.stress,
  {
    label: "Off",
    profile: "off",
    synthetic: { enemies: 0, projectiles: 0 },
  },
  "trace export must start with synthetic render stress disabled"
);
assert.equal(activeExport.framePacing.recentFrames.length, 2, "two lifecycle frames should be captured");
assert.equal(activeExport.framePacing.frameGapMs.count, 1, "RAF gap distribution should capture later frames");
assert.equal(activeExport.framePacing.frameGapMs.p95Ms, 50, "RAF gap distribution should be deterministic");
assert.ok(
  activeExport.framePacing.recentFrames.every(
    (frame) =>
      frame.stagesMs.update > 0 &&
      frame.stagesMs.render > 0 &&
      frame.stagesMs.hud > 0 &&
      frame.canvasSubmissionCommands.total > 0 &&
      frame.pressure.enemies === 1 &&
      frame.pressure.effects === 0 &&
      frame.pressure.pickups === 1 &&
      frame.pressure.projectiles === 2 &&
      ["clearFrame", "renderFrame", "renderEnemies", "renderPlayer", "renderHud", "renderSkillRail"].every(
        (name) => Number.isFinite(frame.renderPassesMs[name])
      )
  ),
  "lifecycle trace should capture stage, render-pass, pressure, and Canvas submission signals"
);
assert.equal(activeExport.pageErrors.length, 2, "page errors must stay bounded");
assert.equal(activeExport.longTasks.length, 2, "long-task samples must stay bounded");
assert.equal(activeExport.visibilityChanges.length, 1, "visibility changes must be captured");
assert.equal(platform.calls.clipboard, 0, "trace must not copy automatically");
assert.equal(platform.calls.objectUrls, 0, "trace must not download automatically");
assert.equal(platform.calls.fetch, 0, "trace must not fetch automatically");
assert.equal(platform.calls.beacon, 0, "trace must not beacon automatically");
assert.equal(platform.calls.persistence, 0, "trace must not persist automatically");

const overlay = documentRef.body.children[0];
const stressButton = findAction(overlay, "stress");
assert.ok(stressButton, "enabled overlay must expose an accessible manual render-stress control");
assert.match(stressButton.textContent, /Render stress: Off/u, "stress control must visibly start disabled");
const realBoltCount = fixture.game.bolts.length;
const realEnemyCount = fixture.game.enemies.length;
const stressStates = [
  { enemies: 0, label: "Projectiles x750", profile: "projectiles", projectiles: 750 },
  { enemies: 500, label: "Sprites x500", profile: "sprites", projectiles: 0 },
  { enemies: 500, label: "Both x1250", profile: "both", projectiles: 750 },
  { enemies: 0, label: "Off", profile: "off", projectiles: 0 },
];
for (const [index, expected] of stressStates.entries()) {
  stressButton.click();
  const renderStress = trace.getRenderStress();
  assert.equal(renderStress.profile, expected.profile, "manual stress control must cycle profiles");
  assert.equal(renderStress.syntheticEnemies, expected.enemies, "stress fixture must use the declared sprite count");
  assert.equal(
    renderStress.syntheticProjectiles,
    expected.projectiles,
    "stress fixture must use the declared projectile count"
  );
  assert.equal(trace.getRenderStress(), renderStress, "active synthetic fixtures must stay cached");
  assert.match(
    stressButton.textContent,
    new RegExp(`Render stress: ${expected.label}`),
    "manual stress control must visibly report the selected profile"
  );
  const beforeSpriteDraws = fixture.spriteDraws.length;
  fixture.invokeFrame(100 + index * 40);
  const stressExport = trace.exportData();
  const latestFrame = stressExport.framePacing.recentFrames.at(-1);
  assert.deepEqual(
    stressExport.stress,
    {
      label: expected.label,
      profile: expected.profile,
      synthetic: { enemies: expected.enemies, projectiles: expected.projectiles },
    },
    "trace export must identify the selected synthetic profile and counts"
  );
  assert.equal(
    latestFrame.pressure.syntheticEnemies,
    expected.enemies,
    "per-frame pressure must preserve synthetic sprite counts separately"
  );
  assert.equal(
    latestFrame.pressure.syntheticProjectiles,
    expected.projectiles,
    "per-frame pressure must preserve synthetic projectile counts separately"
  );
  assert.equal(latestFrame.pressure.enemies, realEnemyCount, "real enemy pressure must remain separate");
  assert.equal(
    latestFrame.pressure.projectiles,
    realBoltCount + fixture.game.enemyBolts.length,
    "real projectile pressure must remain separate"
  );
  assert.equal(latestFrame.pressure.totalEnemies, realEnemyCount + expected.enemies);
  assert.equal(
    latestFrame.pressure.totalProjectiles,
    realBoltCount + fixture.game.enemyBolts.length + expected.projectiles
  );
  const stressSpriteIds = fixture.spriteDraws.slice(beforeSpriteDraws);
  assert.equal(
    stressSpriteIds.filter((id) => String(id).startsWith("weapon:")).length,
    realBoltCount + expected.projectiles,
    "synthetic projectiles must reuse the existing bolt sprite path"
  );
  assert.equal(
    stressSpriteIds.filter((id) => String(id).startsWith("enemy:")).length,
    realEnemyCount + expected.enemies,
    "synthetic sprites must reuse the existing enemy sprite path"
  );
  assert.equal(fixture.game.bolts.length, realBoltCount, "synthetic fixtures must stay outside game bolts");
  assert.equal(fixture.game.enemies.length, realEnemyCount, "synthetic fixtures must stay outside game enemies");
}
assert.equal(platform.calls.fetch, 0, "stress cycling must remain network-free");
assert.equal(platform.calls.beacon, 0, "stress cycling must remain beacon-free");
assert.equal(platform.calls.persistence, 0, "stress cycling must remain persistence-free");

for (let index = 0; index < 4; index += 1) {
  const frame = trace.beginFrame(100 + index * 10);
  trace.recordCanvasCommand("fixtureCommand");
  trace.endFrame(frame, { pressure: { enemies: index } });
}
const boundedExport = trace.exportData();
assert.equal(boundedExport.framePacing.recentFrames.length, 3, "recent frame export must be bounded");
assert.equal(boundedExport.framePacing.worstFrames.length, 2, "worst frame export must be bounded");

const copyButton = findAction(overlay, "copy");
const downloadButton = findAction(overlay, "download");
assert.ok(copyButton && downloadButton, "enabled overlay must expose manual Copy and Download controls");
copyButton.click();
await Promise.resolve();
assert.equal(platform.calls.clipboard, 1, "Copy must export only after manual activation");
const copiedExport = JSON.parse(platform.calls.clipboardPayload);
assert.equal(copiedExport.localOnly, true, "manual copy must contain the local trace payload");
downloadButton.click();
assert.equal(platform.calls.objectUrls, 1, "Download must export only after manual activation");
assert.equal(platform.calls.revokedUrls, 1, "manual download must release its temporary object URL");
assert.equal(platform.calls.fetch, 0, "manual export must remain network-free");
assert.equal(platform.calls.beacon, 0, "manual export must remain beacon-free");
assert.equal(platform.calls.persistence, 0, "manual export must remain persistence-free");

console.log("PASS performance trace disabled and enabled diagnostic smoke");
