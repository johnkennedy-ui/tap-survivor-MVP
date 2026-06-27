import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";

import {
  composeContentBalanceEffects,
  composeRelicProgression,
  composeRuntime,
  composeSaveSubsystem,
  composeShellRelicController,
  composeShellRelicPresentation,
  composeShellRelicUiAdapter,
  composeShellUiController,
  composeShellUiDomAdapter,
  composeShellUiPresentation,
  composeShopEconomy,
  createBrowserPlatform,
} from "../src/app/compose-runtime.js";

const root = new URL("..", import.meta.url).pathname;
const content = JSON.parse(readFileSync(join(root, "content/tap-survivor-content.json"), "utf8"));
const indexHtml = readFileSync(join(root, "index.html"), "utf8");
const productionScripts = extractLocalScriptSources(indexHtml);
const generatedBridgeFiles = productionScripts.filter((file) => isGeneratedBridge(file));
const generatedContentFiles = productionScripts.filter((file) => file === "src/content.generated.js");
const nonGeneratedClassicFiles = productionScripts.filter(
  (file) => !generatedBridgeFiles.includes(file) && !generatedContentFiles.includes(file)
);
const rootPrefix = root.endsWith("/") ? root : `${root}/`;
const moduleFiles = listFiles(join(root, "src/modules"))
  .map((file) => file.replace(rootPrefix, ""))
  .sort();
const compatibilityGlobals = collectCompatibilityGlobals(productionScripts);
const compatibilityBoundaryReads = collectCompatibilityBoundaryReads(productionScripts);
const classicEntrypointDependencies = collectClassicEntrypointDependencies();
const directConsumerGlobalReads = compatibilityBoundaryReads.filter(
  (read) => !isApprovedCompatibilityBoundary(read.file)
);

const calls = [];
const saveKey = "tap-survivor-mvp-save-v2";
const legacySaveKey = "tap-survivor-mvp-save-v1";
const save = {
  coins: 25,
  towerFloor: 20,
  unlockedRelics: ["move_speed_focus_relic"],
  equippedRelics: [],
  unlockedWeapons: ["spark_bolt"],
  selectedStartingWeapon: "spark_bolt",
};

const contentBalanceEffects = composeContentBalanceEffects({
  content,
  contentSchema: {
    effectRegistries: {
      shopItem: {
        stats: [
          "speed",
          "pickupRadius",
          "maxHp",
          "flatDamage",
          "attackRadius",
          "fireRate",
          "percentDamage",
          "relicFocus",
        ],
      },
    },
  },
  upgradeContent: {
    createUpgradeDefs: (weaponDefs) =>
      Object.entries(weaponDefs).map(([weaponId, weapon]) => ({
        id: weapon.upgradeId || `${weaponId}_damage`,
        weaponId,
      })),
    runUpgradeDefs: content.runUpgrades || [],
  },
});
check(
  "readiness composes content registry through module path",
  Boolean(contentBalanceEffects.contentRegistry.weaponDefs.spark_bolt)
);
check(
  "readiness composes effects through module path",
  typeof contentBalanceEffects.effects.applyShopItemEffectToRun === "function"
);

const saveStorage = createMemoryStorageAdapter();
const saveSystem = composeSaveSubsystem({
  saveKey,
  legacySaveKey,
  storageAdapter: saveStorage,
  starterQuestIds: ["starter_quest"],
  questDefs: {
    starter_quest: {},
    gatherer: { opens: ["rapid_growth"] },
    rapid_growth: {},
  },
  weaponUnlocks: [],
  upgradeDefs: [],
  shopItemDefs: [{ id: "training_boots", maxTier: 3 }],
  questOpenIds: (quest) => quest?.opens || [],
});
check("readiness composes save subsystem through module path", saveSystem.defaultSave().saveVersion >= 1);

const shopEconomy = composeShopEconomy({
  shopItemDefs: contentBalanceEffects.contentRegistry.shopItemDefs,
  pricingConfig: content.shopPricing || {},
  getSave: () => save,
  effects: contentBalanceEffects.effects,
});
const trainingBoots = shopEconomy.shopItemDefs.find((item) => item.id === "training_boots");
check(
  "readiness composes shop economy through module path",
  Boolean(trainingBoots) && shopEconomy.pricing.costFor(trainingBoots, shopEconomy.pricing.tierFor(trainingBoots)) > 0
);

const relicProgression = composeRelicProgression({
  relicDefs: contentBalanceEffects.contentRegistry.relicDefs,
  weaponDefs: contentBalanceEffects.contentRegistry.weaponDefs,
  effects: contentBalanceEffects.effects,
  random: () => 0,
});
check(
  "readiness composes relic provider through module path",
  relicProgression.progression.relicChoices(save, ["spark_bolt"]).length > 0
);

const documentRef = createFakeDocument();
const shellRelicRoot = documentRef.createElement("div");
const shellRelicPresenter = composeShellRelicPresentation({
  content,
  relicDefs: relicProgression.relicDefs,
  relicSystem: relicProgression.progression,
});
const shellRelicAdapter = composeShellRelicUiAdapter({
  presenter: shellRelicPresenter,
  documentRef,
  root: shellRelicRoot,
  getSave: () => save,
  relicSystem: relicProgression.progression,
  persist: () => calls.push("persist"),
  renderMeta: () => calls.push("renderMeta"),
  scheduler: {
    clearTimeout: () => {},
    setTimeout: (callback) => {
      callback();
      return 1;
    },
  },
  previewAdapter: {
    renderPreview: () => ({ dispose() {} }),
  },
});
const shellRelicAdapterModel = shellRelicAdapter.renderShellRelics(save);
const shellRelicController = composeShellRelicController({
  presenter: shellRelicPresenter,
  documentRef,
  root: shellRelicRoot,
  getSave: () => save,
  relicSystem: relicProgression.progression,
  persist: () => calls.push("persist"),
  renderMeta: () => calls.push("renderMeta"),
});
const shellRelicModel = shellRelicController.render(save);
check(
  "readiness composes shell relic presenter UI and controller through module path",
  shellRelicAdapterModel.availableRelics.length > 0 &&
    shellRelicRoot.children.length >= 3 &&
    shellRelicModel.availableRelics.length > 0
);

const shellRoot = documentRef.createElement("div");
const shellUiPresenter = composeShellUiPresentation();
const shellUiView = composeShellUiDomAdapter({
  presenter: shellUiPresenter,
  documentRef,
  root: shellRoot,
  shellRelicController,
  getSave: () => save,
  onStartRun: () => calls.push("start-run"),
  onSetGameSpeed: (speed) => calls.push(`speed:${speed}`),
});
const shellUiController = composeShellUiController({
  shellRelicController,
  getSave: () => save,
  shellView: shellUiView,
  presenter: shellUiPresenter,
  onStartRun: () => calls.push("controller:start-run"),
  onSetGameSpeed: (speed) => calls.push(`controller:speed:${speed}`),
});
shellUiController.init();
shellUiController.openPanel("inventory");
shellUiController.startRun();
check(
  "readiness composes shell UI presenter DOM adapter and controller through module path",
  shellRoot.children.length === 1 && calls.includes("controller:start-run")
);

let currentGame = {
  running: true,
  paused: false,
  awaitingFirstMoveInput: true,
  player: { targetX: 0, targetY: 0 },
};
const canvas = {
  width: 960,
  height: 540,
  listeners: new Map(),
  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  },
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 960, height: 540 };
  },
};
const speedButtons = [1, 2, 5].map((speed) => ({
  dataset: { speed: String(speed) },
  classList: {
    toggle(name, value) {
      calls.push(`runtime-speed:${speed}:${name}:${value}`);
    },
  },
  setAttribute(name, value) {
    calls.push(`runtime-speed:${speed}:${name}:${value}`);
  },
}));
const runtimeDocument = {
  body: { dataset: {} },
  visibilityState: "visible",
  addEventListener(type) {
    calls.push(`runtime-document:${type}`);
  },
};
const runtimeGlobal = {
  requestAnimationFrame(callback) {
    calls.push("runtime:raf");
    this.frameCallback = callback;
    return 1;
  },
  addEventListener(type) {
    calls.push(`runtime-global:${type}`);
  },
  Capacitor: { Plugins: { App: { addListener: () => ({ catch() {} }) } } },
};
const runtime = composeRuntime({
  platform: createBrowserPlatform({ globalRef: runtimeGlobal, documentRef: runtimeDocument }),
  dependencies: {
    canvas,
    ui: {
      speedButtons,
      levelUp: { classList: { add: () => calls.push("runtime:level-up-hidden") } },
    },
    getGame: () => currentGame,
    setGame: (game) => {
      currentGame = game;
    },
    getSave: () => save,
    setSave: () => {},
    saveSystem: {
      defaultSave: () => save,
      loadSave: () => save,
      removeSave: () => {},
    },
    shellUi: {
      bind: () => calls.push("runtime:shell-bind"),
      closeRunMenu: () => calls.push("runtime:shell-close-run-menu"),
      showTitleScreen: () => calls.push("runtime:shell-title"),
    },
    shopSystem: {
      closeShop: () => calls.push("runtime:shop-close"),
    },
    runUi: {
      hideEndScreen: () => calls.push("runtime:hide-end"),
      updateRunHud: () => calls.push("runtime:update-hud"),
    },
    debugSystem: {
      bind: () => calls.push("runtime:debug-bind"),
    },
    spriteSystem: {
      loadSprites: () => calls.push("runtime:sprites"),
    },
    bannerSystem: {
      hideMovementGateBanner: () => calls.push("runtime:hide-movement-gate"),
    },
    bindMovementInput: () => calls.push("runtime:bind-input"),
    persist: () => calls.push("runtime:persist"),
    renderMeta: () => calls.push("runtime:render-meta"),
    loop: () => calls.push("runtime:loop"),
  },
});
runtime.initializeRuntime();
runtime.setGameSpeed(5);
canvas.listeners.get("mousedown")({ clientX: 480, clientY: 270 });
check(
  "readiness composes run-start-adjacent runtime through module path",
  runtimeDocument.body.dataset.gameSpeed === "5" &&
    currentGame.awaitingFirstMoveInput === false &&
    calls.includes("runtime:hide-movement-gate")
);

check(
  "readiness sees deterministic generated bridge inventory",
  generatedBridgeFiles.includes("src/shell-ui.js") && generatedBridgeFiles.includes("src/shell-relic-ui.js")
);
check("readiness adds no direct TapSurvivor global consumer reads", directConsumerGlobalReads.length === 0);

const inventory = {
  canonicalModuleFiles: moduleFiles,
  generatedClassicBridgeFiles: generatedBridgeFiles,
  generatedContentFiles,
  nonGeneratedClassicProductionFiles: nonGeneratedClassicFiles,
  compatibilityGlobalsPublished: compatibilityGlobals,
  approvedCompatibilityBoundaryReads: compatibilityBoundaryReads,
  classicRuntimeEntrypointDependencies: classicEntrypointDependencies,
  remainingRuntimeSwitchBlockers: [
    "index.html still loads classic script order",
    "src/game.js remains the production entrypoint and owns top-level run state",
    "src/modules/game-dependencies.js still adapts classic TapSurvivor globals into the dependency bag",
    "non-generated classic production files still need module ownership or explicit adapter boundaries",
    "a production ESM entrypoint has not been introduced or selected",
  ],
};

console.log("\n# Module Runtime Readiness Inventory");
console.log(JSON.stringify(inventory, null, 2));

if (process.exitCode) {
  console.error("\nModule runtime readiness smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nModule runtime readiness smoke passed.");

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

function createMemoryStorageAdapter() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) || null,
    removeItem: (key) => store.delete(key),
    setItem: (key, value) => store.set(key, String(value)),
    store,
  };
}

function createFakeDocument() {
  return {
    createElement: (tagName) => createFakeElement(tagName),
  };
}

function createFakeElement(tagName = "div") {
  return {
    attributes: {},
    children: [],
    className: "",
    dataset: {},
    hidden: false,
    isConnected: true,
    listeners: new Map(),
    style: {},
    tagName: tagName.toUpperCase(),
    textContent: "",
    appendChild(child) {
      this.children.push(child);
      child.parentElement = this;
      return child;
    },
    prepend(child) {
      this.children.unshift(child);
      child.parentElement = this;
      return child;
    },
    replaceChildren(...children) {
      this.children = [];
      children.forEach((child) => this.appendChild(child));
    },
    addEventListener(type, handler) {
      const handlers = this.listeners.get(type) || [];
      handlers.push(handler);
      this.listeners.set(type, handlers);
    },
    removeEventListener(type, handler) {
      const handlers = this.listeners.get(type) || [];
      this.listeners.set(
        type,
        handlers.filter((item) => item !== handler)
      );
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {},
    },
  };
}

function listFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const file = join(directory, name);
    if (!existsSync(file)) return [];
    if (readdirSync(directory, { withFileTypes: true }).find((entry) => entry.name === name)?.isDirectory()) {
      return listFiles(file);
    }
    return extname(file) === ".js" ? [file] : [];
  });
}

function extractLocalScriptSources(html) {
  return [...html.matchAll(/<script\b[^>]*>/gi)]
    .map((match) => match[0].match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2])
    .filter(Boolean)
    .map((src) => src.split("?")[0])
    .filter((src) => src.startsWith("src/") || src.startsWith("scripts/"));
}

function isGeneratedBridge(file) {
  const source = readFileSync(join(root, file), "utf8");
  return source.startsWith("// GENERATED FILE.") && source.includes("// Source: src/modules/");
}

function collectCompatibilityGlobals(files) {
  const globals = new Set();
  files.forEach((file) => {
    const source = readFileSync(join(root, file), "utf8");
    for (const match of source.matchAll(/\bglobalThis\.(TapSurvivor[A-Za-z0-9_]+)\s*=/g)) {
      globals.add(match[1]);
    }
  });
  return [...globals].sort();
}

function collectCompatibilityBoundaryReads(files) {
  return files.flatMap((file) => {
    const source = readFileSync(join(root, file), "utf8");
    const provided = new Set(
      [...source.matchAll(/\bglobalThis\.(TapSurvivor[A-Za-z0-9_]+)\s*=/g)].map((match) => match[1])
    );
    return [...new Set([...source.matchAll(/\bglobalThis\.(TapSurvivor[A-Za-z0-9_]+)/g)].map((match) => match[1]))]
      .filter((name) => !provided.has(name))
      .sort()
      .map((name) => ({ file, name }));
  });
}

function collectClassicEntrypointDependencies() {
  const source = readFileSync(join(root, "src/modules/game-dependencies.js"), "utf8");
  const names = new Set();
  for (const match of source.matchAll(/requireGlobal\(globalRef,\s*"([^"]+)"/g)) names.add(match[1]);
  for (const match of source.matchAll(/globalRef\.(TapSurvivor[A-Za-z0-9_]+)/g)) names.add(match[1]);
  return [...names].sort();
}

function isApprovedCompatibilityBoundary(file) {
  return (
    generatedBridgeFiles.includes(file) ||
    [
      "src/assets.js",
      "src/balance-runtime.js",
      "src/game.js",
      "src/upgrades.js",
    ].includes(file)
  );
}
