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
import {
  CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS,
  INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS,
  MODULE_NATIVE_GAME_DEPENDENCY_SLOTS,
} from "../src/modules/module-game-dependencies.js";
import {
  INJECTED_STATE_PERSISTENCE_SLOTS,
  MODULE_NATIVE_STATE_PERSISTENCE_SLOTS,
} from "../src/modules/game-state-store.js";
import {
  MODULE_RUNTIME_PLATFORM_ADAPTER_PROOF_SLOTS,
  MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS,
} from "../src/modules/module-runtime-platform-adapter.js";
import {
  createModuleRuntimeSpriteAdapter,
  MODULE_RUNTIME_SPRITE_ADAPTER_LOW_LEVEL_SLOTS,
  MODULE_RUNTIME_SPRITE_ADAPTER_PROOF_SLOTS,
  MODULE_RUNTIME_SPRITE_ADAPTER_SLOTS,
} from "../src/modules/module-runtime-sprite-adapter.js";
import {
  createModuleRuntimeStorageAdapter,
  MODULE_RUNTIME_STORAGE_ADAPTER_LOW_LEVEL_SLOTS,
  MODULE_RUNTIME_STORAGE_ADAPTER_PROOF_SLOTS,
  MODULE_RUNTIME_STORAGE_ADAPTER_SLOTS,
} from "../src/modules/module-runtime-storage-adapter.js";
import {
  createModuleRuntimeUiAdapters,
  MODULE_RUNTIME_UI_ADAPTER_LOW_LEVEL_SLOTS,
  MODULE_RUNTIME_UI_ADAPTER_PROOF_SLOTS,
  MODULE_RUNTIME_UI_ADAPTER_SLOTS,
} from "../src/modules/module-runtime-ui-adapters.js";

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
const classicGameDependencyGlobalReads = collectTapSurvivorGlobalReads("src/modules/game-dependencies.js");
const moduleNativeGameDependencyGlobalReads = collectTapSurvivorGlobalReads(
  "src/modules/module-game-dependencies.js"
);
const moduleNativeStateStoreGlobalReads = collectTapSurvivorGlobalReads(
  "src/modules/game-state-store.js"
);
const moduleRuntimePlatformAdapterGlobalReads = collectTapSurvivorGlobalReads(
  "src/modules/module-runtime-platform-adapter.js"
);
const moduleRuntimeSpriteAdapterGlobalReads = collectTapSurvivorGlobalReads(
  "src/modules/module-runtime-sprite-adapter.js"
);
const moduleRuntimeStorageAdapterGlobalReads = collectTapSurvivorGlobalReads(
  "src/modules/module-runtime-storage-adapter.js"
);
const moduleRuntimeUiAdapterGlobalReads = collectTapSurvivorGlobalReads(
  "src/modules/module-runtime-ui-adapters.js"
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
const runtimeUiAdapters = createModuleRuntimeUiAdapters({
  ui: {
    speedButtons,
    levelUp: { classList: { add: () => calls.push("runtime:level-up-hidden") } },
  },
  runUiAdapter: {
    hideEndScreen: () => calls.push("runtime:hide-end"),
    updateRunHud: () => calls.push("runtime:update-hud"),
  },
  shellUiAdapter: {
    bind: () => calls.push("runtime:shell-bind"),
    closeRunMenu: () => calls.push("runtime:shell-close-run-menu"),
    showTitleScreen: () => calls.push("runtime:shell-title"),
  },
  shopSystemAdapter: {
    closeShop: () => calls.push("runtime:shop-close"),
  },
});
const runtimeSpriteAdapter = createModuleRuntimeSpriteAdapter({
  spriteSystem: {
    drawImage: (id) => calls.push(`runtime:sprite-draw-image:${id}`),
    drawSprite: (id) => calls.push(`runtime:sprite-draw-sprite:${id}`),
    loadSprites: () => calls.push("runtime:sprites"),
  },
});
const runtimeStorageAdapter = createModuleRuntimeStorageAdapter({
  legacySaveKey,
  saveKey,
  storage: {
    getItem: (key) => {
      calls.push(`runtime:storage-get-item:${key}`);
      return key === saveKey ? JSON.stringify(save) : null;
    },
    removeItem: (key) => {
      calls.push(`runtime:storage-remove-item:${key}`);
      return true;
    },
    setItem: (key) => {
      calls.push(`runtime:storage-set-item:${key}`);
      return true;
    },
  },
});
runtimeStorageAdapter.storageAdapter.getSaveRaw();
runtimeStorageAdapter.storageAdapter.setSaveRaw(JSON.stringify(save));
runtimeStorageAdapter.storageAdapter.removeSaveRaw();
const runtime = composeRuntime({
  platform: createBrowserPlatform({ globalRef: runtimeGlobal, documentRef: runtimeDocument }),
  dependencies: {
    canvas,
    ui: runtimeUiAdapters.ui,
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
    shellUi: runtimeUiAdapters.shellUiAdapter,
    shopSystem: runtimeUiAdapters.shopSystemAdapter,
    runUi: runtimeUiAdapters.runUiAdapter,
    debugSystem: {
      bind: () => calls.push("runtime:debug-bind"),
    },
    spriteSystem: runtimeSpriteAdapter.spriteSystem,
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
  "readiness composes storage adapter through fake injected storage backend",
  calls.includes(`runtime:storage-get-item:${saveKey}`) &&
    calls.includes(`runtime:storage-set-item:${saveKey}`) &&
    calls.includes(`runtime:storage-remove-item:${saveKey}`)
);

check(
  "readiness sees deterministic generated bridge inventory",
  generatedBridgeFiles.includes("src/shell-ui.js") && generatedBridgeFiles.includes("src/shell-relic-ui.js")
);
check("readiness adds no direct TapSurvivor global consumer reads", directConsumerGlobalReads.length === 0);
check(
  "readiness sees module-native dependency bag slot inventory",
  MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("contentRegistry") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("gameStateStore") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("gameRuntime") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("moduleRuntimeSpriteAdapter") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("moduleRuntimeStorageAdapter") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("moduleRuntimeUiAdapters") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("runUpdate")
);
check(
  "readiness sees explicit injected dependency adapter slots",
  INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("platformAdapters") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("uiAdapters") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("bindMovementInput") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("canvas") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("loop") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("bannerSystem") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("debugSystem") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("runUiAdapter") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("shellUiAdapter") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("shopSystemAdapter") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("spriteSystem") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("ui") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("spriteAdapters") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("storageAdapters") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("storageAdapter") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("getGame") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("persist")
);
check(
  "readiness sees completed module runtime platform adapter proof slots",
  ["bindMovementInput", "canvas", "loop", "bannerSystem", "debugSystem"].every(
    (slot) =>
      MODULE_RUNTIME_PLATFORM_ADAPTER_PROOF_SLOTS.includes(slot) &&
      MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS.includes(slot)
  )
);
check(
  "readiness sees module runtime platform adapter excludes non-platform adapters",
  MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS.includes("canvas") &&
    !MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS.includes("shellUiAdapter") &&
    !MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS.includes("spriteSystem") &&
    !MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS.includes("ui")
);
check(
  "readiness sees module runtime UI adapter bundle covers targeted UI slots",
  ["runUiAdapter", "shellUiAdapter", "shopSystemAdapter", "ui"].every(
    (slot) =>
      MODULE_RUNTIME_UI_ADAPTER_PROOF_SLOTS.includes(slot) &&
      MODULE_RUNTIME_UI_ADAPTER_SLOTS.includes(slot)
  )
);
check(
  "readiness sees module runtime UI adapter bundle keeps sprite system separate",
  !MODULE_RUNTIME_UI_ADAPTER_SLOTS.includes("spriteSystem") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("spriteAdapters")
);
check(
  "readiness sees module runtime sprite adapter bundle covers sprite/render services",
  MODULE_RUNTIME_SPRITE_ADAPTER_SLOTS.includes("spriteSystem") &&
    ["loadSprites", "drawImage", "drawSprite"].every((slot) =>
      MODULE_RUNTIME_SPRITE_ADAPTER_PROOF_SLOTS.includes(slot)
    )
);
check(
  "readiness sees module runtime sprite adapter low-level dependency explicit",
  MODULE_RUNTIME_SPRITE_ADAPTER_LOW_LEVEL_SLOTS.includes("spriteSystem")
);
check(
  "readiness sees module runtime storage adapter bundle covers storage services",
  MODULE_RUNTIME_STORAGE_ADAPTER_SLOTS.includes("storageAdapter") &&
    ["getSaveRaw", "setSaveRaw", "removeSaveRaw", "setCorruptBackupRaw"].every((slot) =>
      MODULE_RUNTIME_STORAGE_ADAPTER_PROOF_SLOTS.includes(slot)
    )
);
check(
  "readiness sees module runtime storage adapter low-level dependency explicit",
  MODULE_RUNTIME_STORAGE_ADAPTER_LOW_LEVEL_SLOTS.includes("storage")
);
check(
  "readiness sees module runtime UI adapter bundle low-level dependencies explicit",
  MODULE_RUNTIME_UI_ADAPTER_LOW_LEVEL_SLOTS.includes("ui") &&
    MODULE_RUNTIME_UI_ADAPTER_LOW_LEVEL_SLOTS.includes("shopSystemAdapter")
);
check(
  "readiness sees module-native state persistence slots",
  MODULE_NATIVE_STATE_PERSISTENCE_SLOTS.includes("getGame") &&
    MODULE_NATIVE_STATE_PERSISTENCE_SLOTS.includes("setSave") &&
    MODULE_NATIVE_STATE_PERSISTENCE_SLOTS.includes("renderMeta")
);
check(
  "readiness sees storage backend reclassified behind storage adapter bundle",
  INJECTED_STATE_PERSISTENCE_SLOTS.includes("storageAdapters") &&
    !INJECTED_STATE_PERSISTENCE_SLOTS.includes("storageAdapter")
);
check(
  "readiness keeps remaining classic-only systems explicit",
  CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("audio") &&
    CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("rendering")
);
check(
  "readiness sees module-native dependency bag without TapSurvivor global reads",
  moduleNativeGameDependencyGlobalReads.length === 0
);
check(
  "readiness sees module-native state store without TapSurvivor global reads",
  moduleNativeStateStoreGlobalReads.length === 0
);
check(
  "readiness sees module runtime platform adapter without TapSurvivor global reads",
  moduleRuntimePlatformAdapterGlobalReads.length === 0
);
check(
  "readiness sees module runtime sprite adapter without TapSurvivor global reads",
  moduleRuntimeSpriteAdapterGlobalReads.length === 0
);
check(
  "readiness sees module runtime storage adapter without TapSurvivor global reads",
  moduleRuntimeStorageAdapterGlobalReads.length === 0
);
check(
  "readiness sees module runtime UI adapter bundle without TapSurvivor global reads",
  moduleRuntimeUiAdapterGlobalReads.length === 0
);

const inventory = {
  canonicalModuleFiles: moduleFiles,
  generatedClassicBridgeFiles: generatedBridgeFiles,
  generatedContentFiles,
  nonGeneratedClassicProductionFiles: nonGeneratedClassicFiles,
  compatibilityGlobalsPublished: compatibilityGlobals,
  approvedCompatibilityBoundaryReads: compatibilityBoundaryReads,
  classicRuntimeEntrypointDependencies: classicEntrypointDependencies,
  moduleNativeGameDependencyBag: {
    moduleNativeDependencySlots: MODULE_NATIVE_GAME_DEPENDENCY_SLOTS,
    injectedAdapterSlots: INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS,
    remainingClassicOnlySlots: CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS,
    moduleNativeSourceGlobalReads: moduleNativeGameDependencyGlobalReads,
    classicBridgeSourceGlobalReads: classicGameDependencyGlobalReads,
  },
  moduleRuntimePlatformAdapter: {
    proofSlots: MODULE_RUNTIME_PLATFORM_ADAPTER_PROOF_SLOTS,
    adapterSlots: MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS,
    moduleNativeSourceGlobalReads: moduleRuntimePlatformAdapterGlobalReads,
  },
  moduleRuntimeSpriteAdapter: {
    proofSlots: MODULE_RUNTIME_SPRITE_ADAPTER_PROOF_SLOTS,
    adapterSlots: MODULE_RUNTIME_SPRITE_ADAPTER_SLOTS,
    lowLevelInjectedSlots: MODULE_RUNTIME_SPRITE_ADAPTER_LOW_LEVEL_SLOTS,
    moduleNativeSourceGlobalReads: moduleRuntimeSpriteAdapterGlobalReads,
  },
  moduleRuntimeStorageAdapter: {
    proofSlots: MODULE_RUNTIME_STORAGE_ADAPTER_PROOF_SLOTS,
    adapterSlots: MODULE_RUNTIME_STORAGE_ADAPTER_SLOTS,
    lowLevelInjectedSlots: MODULE_RUNTIME_STORAGE_ADAPTER_LOW_LEVEL_SLOTS,
    moduleNativeSourceGlobalReads: moduleRuntimeStorageAdapterGlobalReads,
  },
  moduleRuntimeUiAdapterBundle: {
    proofSlots: MODULE_RUNTIME_UI_ADAPTER_PROOF_SLOTS,
    adapterSlots: MODULE_RUNTIME_UI_ADAPTER_SLOTS,
    lowLevelInjectedSlots: MODULE_RUNTIME_UI_ADAPTER_LOW_LEVEL_SLOTS,
    moduleNativeSourceGlobalReads: moduleRuntimeUiAdapterGlobalReads,
  },
  moduleNativeStatePersistence: {
    moduleOwnedSlots: MODULE_NATIVE_STATE_PERSISTENCE_SLOTS,
    injectedSlots: INJECTED_STATE_PERSISTENCE_SLOTS,
    moduleNativeSourceGlobalReads: moduleNativeStateStoreGlobalReads,
    remainingStateRelatedBlockers: [
      "production src/game.js still owns top-level save/game variables",
      "production runtime still wires persistence through classic script order",
      "browser storage backend remains explicitly injected behind module runtime storage adapter",
    ],
  },
  remainingRuntimeSwitchBlockers: [
    "index.html still loads classic script order",
    "src/game.js remains the production entrypoint and owns top-level run state",
    "production still uses generated src/game-dependencies.js classic global adapter",
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

function collectTapSurvivorGlobalReads(file) {
  const source = readFileSync(join(root, file), "utf8");
  const names = new Set();
  for (const match of source.matchAll(/requireGlobal\(globalRef,\s*"([^"]+)"/g)) names.add(match[1]);
  for (const match of source.matchAll(/\b(?:globalThis|window|globalRef)\.(TapSurvivor[A-Za-z0-9_]+)/g)) {
    names.add(match[1]);
  }
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
