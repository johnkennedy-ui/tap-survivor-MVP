import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";

import {
  BROWSER_DEPENDENCY_BAG_PROOF_SLOTS,
  createBrowserDependencyBagOptions,
} from "../src/app/browser-dependency-bag.js";
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
  MODULE_GAME_LIFECYCLE_OWNER_LOW_LEVEL_SLOTS,
  MODULE_GAME_LIFECYCLE_OWNER_PROOF_SLOTS,
  MODULE_GAME_LIFECYCLE_OWNER_SLOTS,
} from "../src/modules/module-game-lifecycle.js";
import { PRODUCTION_MODULE_ENTRYPOINT_PROOF_SLOTS } from "../src/app/production-module-entrypoint.js";
import {
  INJECTED_STATE_PERSISTENCE_SLOTS,
  MODULE_NATIVE_STATE_PERSISTENCE_SLOTS,
} from "../src/modules/game-state-store.js";
import {
  createModuleRuntimeAssetsAdapter,
  MODULE_RUNTIME_ASSETS_ADAPTER_LOW_LEVEL_SLOTS,
  MODULE_RUNTIME_ASSETS_ADAPTER_PROOF_SLOTS,
  MODULE_RUNTIME_ASSETS_ADAPTER_SLOTS,
} from "../src/modules/module-runtime-assets-adapter.js";
import {
  createModuleRuntimeAudioAdapter,
  MODULE_RUNTIME_AUDIO_ADAPTER_LOW_LEVEL_SLOTS,
  MODULE_RUNTIME_AUDIO_ADAPTER_PROOF_SLOTS,
  MODULE_RUNTIME_AUDIO_ADAPTER_SLOTS,
} from "../src/modules/module-runtime-audio-adapter.js";
import {
  MODULE_RUNTIME_GAMEPLAY_ADAPTER_LOW_LEVEL_SLOTS,
  MODULE_RUNTIME_GAMEPLAY_ADAPTER_PROOF_SLOTS,
  MODULE_RUNTIME_GAMEPLAY_ADAPTER_SLOTS,
} from "../src/modules/module-runtime-gameplay-adapter.js";
import {
  MODULE_RUNTIME_PLATFORM_ADAPTER_PROOF_SLOTS,
  MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS,
} from "../src/modules/module-runtime-platform-adapter.js";
import {
  MODULE_RUNTIME_PROGRESSION_ADAPTER_LOW_LEVEL_SLOTS,
  MODULE_RUNTIME_PROGRESSION_ADAPTER_PROOF_SLOTS,
  MODULE_RUNTIME_PROGRESSION_ADAPTER_SLOTS,
} from "../src/modules/module-runtime-progression-adapter.js";
import {
  createModuleRuntimeRenderingAdapter,
  MODULE_RUNTIME_RENDERING_ADAPTER_LOW_LEVEL_SLOTS,
  MODULE_RUNTIME_RENDERING_ADAPTER_PROOF_SLOTS,
  MODULE_RUNTIME_RENDERING_ADAPTER_SLOTS,
} from "../src/modules/module-runtime-rendering-adapter.js";
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
const productionModuleEntrypointSource = readFileSync(
  join(root, "src/app/production-module-entrypoint.js"),
  "utf8"
);
const browserDependencyBagSource = readFileSync(
  join(root, "src/app/browser-dependency-bag.js"),
  "utf8"
);
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
const moduleGameLifecycleOwnerGlobalReads = collectTapSurvivorGlobalReads(
  "src/modules/module-game-lifecycle.js"
);
const productionModuleEntrypointGlobalReads = collectTapSurvivorGlobalReads(
  "src/app/production-module-entrypoint.js"
);
const browserDependencyBagGlobalReads = collectTapSurvivorGlobalReads(
  "src/app/browser-dependency-bag.js"
);
const moduleNativeStateStoreGlobalReads = collectTapSurvivorGlobalReads(
  "src/modules/game-state-store.js"
);
const moduleRuntimeAssetsAdapterGlobalReads = collectTapSurvivorGlobalReads(
  "src/modules/module-runtime-assets-adapter.js"
);
const moduleRuntimeAudioAdapterGlobalReads = collectTapSurvivorGlobalReads(
  "src/modules/module-runtime-audio-adapter.js"
);
const moduleRuntimeGameplayAdapterGlobalReads = collectTapSurvivorGlobalReads(
  "src/modules/module-runtime-gameplay-adapter.js"
);
const moduleRuntimePlatformAdapterGlobalReads = collectTapSurvivorGlobalReads(
  "src/modules/module-runtime-platform-adapter.js"
);
const moduleRuntimeProgressionAdapterGlobalReads = collectTapSurvivorGlobalReads(
  "src/modules/module-runtime-progression-adapter.js"
);
const moduleRuntimeRenderingAdapterGlobalReads = collectTapSurvivorGlobalReads(
  "src/modules/module-runtime-rendering-adapter.js"
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
const browserDependencyBagOptions = createBrowserDependencyBagOptions({
  content,
  documentRef: {
    getElementById: (id) => ({
      id,
      classList: { add() {}, remove() {}, toggle() {} },
      dataset: {},
      setAttribute() {},
    }),
    querySelectorAll: () => speedButtons,
  },
  globalRef: {
    localStorage: createMemoryStorageAdapter(),
    performance: { now: () => 0 },
  },
});
const runtimeAssetsAdapter = createModuleRuntimeAssetsAdapter({
  assetDefs: content.assets || {},
  fallbackSkillIcon: "fallback.png",
});
const runtimeAssetResolver = runtimeAssetsAdapter.assets.createAssetResolver();
const runtimeAudioAdapter = createModuleRuntimeAudioAdapter({
  audioContextFactory: (cueId) => ({
    resume: () => calls.push(`runtime:audio-context:${cueId}`),
  }),
  audioFactory: (src) => ({
    cloneNode: () => ({
      play: () => calls.push(`runtime:audio-play:${src}`),
    }),
  }),
  clock: () => 1000,
  sfxDefs: content.assets?.sfx || {},
});
const runtimeAudioSystem = runtimeAudioAdapter.audio.createAudioSystem();
runtimeAudioSystem.playWeapon("spark_bolt", { minGapMs: 0 });
runtimeAudioSystem.playStartLaugh();
const runtimeRenderingAdapter = createModuleRuntimeRenderingAdapter({
  assetAdapters: runtimeAssetsAdapter,
  onMissingRenderer: ({ name }) => calls.push(`runtime:render-missing:${name}`),
  platformAdapters: { canvas },
  renderers: {
    clearFrame: ({ platformAdapters }) => {
      calls.push(`runtime:render-clear:${platformAdapters.canvas.width}`);
      return true;
    },
    renderEnemies: ({ enemies, spriteAdapters }) => {
      calls.push(`runtime:render-enemies:${enemies.length}`);
      spriteAdapters.spriteSystem.drawSprite("enemy:readiness");
      return true;
    },
    renderFrame: ({ assetAdapters, game, spriteAdapters }) => {
      const resolver = assetAdapters.assets.createAssetResolver();
      calls.push(`runtime:render-frame:${Boolean(game)}:${resolver.weaponIcon("spark_bolt")}`);
      spriteAdapters.spriteSystem.drawImage("background:tower_floor");
      return true;
    },
    renderHud: ({ game }) => {
      calls.push(`runtime:render-hud:${game?.towerFloor || 0}`);
      return true;
    },
    renderSkillRail: ({ game, spriteAdapters }) => {
      calls.push(`runtime:render-skill-rail:${game?.player?.equippedWeapons?.length || 0}`);
      spriteAdapters.spriteSystem.drawSprite("weaponIcon:spark_bolt");
      return true;
    },
  },
  spriteAdapters: runtimeSpriteAdapter,
  uiAdapters: runtimeUiAdapters,
});
runtimeRenderingAdapter.rendering.clearFrame();
runtimeRenderingAdapter.rendering.renderFrame({
  running: true,
  towerFloor: 7,
  player: { equippedWeapons: ["spark_bolt"] },
});
runtimeRenderingAdapter.renderHud.renderHud({ towerFloor: 7 });
runtimeRenderingAdapter.renderEnemies.renderEnemies([{ id: "enemy" }]);
runtimeRenderingAdapter.renderSkillRail.renderSkillRail({
  player: { equippedWeapons: ["spark_bolt"] },
});
runtimeRenderingAdapter.rendering.missingRendererFallback("manual-missing");
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
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("moduleRuntimeAssetsAdapter") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("moduleRuntimeAudioAdapter") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("moduleRuntimeGameplayAdapter") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("moduleRuntimeProgressionAdapter") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("moduleRuntimeRenderingAdapter") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("moduleRuntimeSpriteAdapter") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("moduleRuntimeStorageAdapter") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("moduleRuntimeUiAdapters") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("levelUpChoices") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("runUpdate")
);
check(
  "readiness sees module game lifecycle owner module",
  moduleFiles.includes("src/modules/module-game-lifecycle.js") &&
    ["init", "bind", "showTitle", "startRun", "tick", "render", "persist", "stop", "dispose"].every(
      (slot) =>
        MODULE_GAME_LIFECYCLE_OWNER_SLOTS.includes(slot) &&
        MODULE_GAME_LIFECYCLE_OWNER_PROOF_SLOTS.includes(slot)
    )
);
check(
  "readiness sees src/game.js top-level ownership has module-native equivalent",
  MODULE_GAME_LIFECYCLE_OWNER_LOW_LEVEL_SLOTS.includes("dependencyBagOptions") &&
    MODULE_GAME_LIFECYCLE_OWNER_LOW_LEVEL_SLOTS.includes("dependencies") &&
    MODULE_GAME_LIFECYCLE_OWNER_LOW_LEVEL_SLOTS.includes("platform") &&
    MODULE_GAME_LIFECYCLE_OWNER_LOW_LEVEL_SLOTS.includes("lifecycleHooks")
);
check(
  "readiness sees production ESM entrypoint candidate exists",
  existsSync(join(root, "src/app/production-module-entrypoint.js")) &&
    existsSync(join(root, "src/app/browser-dependency-bag.js")) &&
    productionModuleEntrypointSource.includes("./browser-dependency-bag.js") &&
    productionModuleEntrypointSource.includes("../modules/module-game-lifecycle.js") &&
    productionModuleEntrypointSource.includes("../modules/module-game-dependencies.js") &&
    productionModuleEntrypointSource.includes("./compose-runtime.js") &&
    PRODUCTION_MODULE_ENTRYPOINT_PROOF_SLOTS.includes("boot") &&
    PRODUCTION_MODULE_ENTRYPOINT_PROOF_SLOTS.includes("createDependencyBag") &&
    PRODUCTION_MODULE_ENTRYPOINT_PROOF_SLOTS.includes("createLifecycleOwner")
);
check(
  "readiness sees production ESM entrypoint candidate is not selected yet",
  !productionScripts.includes("src/app/production-module-entrypoint.js") &&
    !indexHtml.includes("production-module-entrypoint.js")
);
check(
  "readiness sees production ESM entrypoint candidate can create browser dependency bag options",
  [
    "assetAdapters",
    "audioAdapters",
    "gameplayAdapters",
    "platformAdapters",
    "progressionAdapters",
    "renderingAdapters",
    "spriteAdapters",
    "storageAdapters",
    "uiAdapters",
  ].every((slot) => BROWSER_DEPENDENCY_BAG_PROOF_SLOTS.includes(slot)) &&
    Boolean(browserDependencyBagOptions.adapters?.platformAdapters?.canvas) &&
    typeof browserDependencyBagOptions.adapters?.platformAdapters?.bindMovementInput === "function" &&
    typeof browserDependencyBagOptions.adapters?.storageAdapters?.storage?.getItem === "function"
);
check(
  "readiness sees explicit injected dependency adapter slots",
  INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("assetAdapters") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("audioAdapters") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("gameplayAdapters") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("platformAdapters") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("progressionAdapters") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("renderingAdapters") &&
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
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("assets") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("audio") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("rendering") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("renderHud") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("renderEnemies") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("renderSkillRail") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("storageAdapter") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("getGame") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("persist")
);
check(
  "readiness sees module runtime assets adapter covers asset lookup services",
  MODULE_RUNTIME_ASSETS_ADAPTER_SLOTS.includes("assets") &&
    ["createAssetResolver", "weaponIcon", "runUpgradeIcon", "relicIcon", "choiceIconPath"].every(
      (slot) => MODULE_RUNTIME_ASSETS_ADAPTER_PROOF_SLOTS.includes(slot)
    )
);
check(
  "readiness sees module runtime assets adapter low-level dependencies explicit",
  MODULE_RUNTIME_ASSETS_ADAPTER_LOW_LEVEL_SLOTS.includes("assetDefs") &&
    MODULE_RUNTIME_ASSETS_ADAPTER_LOW_LEVEL_SLOTS.includes("fallbackSkillIcon")
);
check(
  "readiness composes assets adapter through fake injected asset manifest",
  runtimeAssetResolver.weaponIcon("spark_bolt") === content.assets.sprites.weapons.spark_bolt.iconSrc &&
    runtimeAssetResolver.choiceIconPath({ runUpgradeId: "run_move_speed" }) ===
      content.assets.sprites.runUpgrades.run_move_speed.iconSrc &&
    runtimeAssetResolver.weaponIcon("missing_weapon") === "fallback.png"
);
check(
  "readiness sees module runtime audio adapter covers audio playback services",
  MODULE_RUNTIME_AUDIO_ADAPTER_SLOTS.includes("audio") &&
    ["createAudioSystem", "play", "playWeapon", "playRunUpgrade", "playStartLaugh"].every((slot) =>
      MODULE_RUNTIME_AUDIO_ADAPTER_PROOF_SLOTS.includes(slot)
    )
);
check(
  "readiness sees module runtime audio adapter low-level dependencies explicit",
  MODULE_RUNTIME_AUDIO_ADAPTER_LOW_LEVEL_SLOTS.includes("sfxDefs") &&
    MODULE_RUNTIME_AUDIO_ADAPTER_LOW_LEVEL_SLOTS.includes("audioFactory") &&
    MODULE_RUNTIME_AUDIO_ADAPTER_LOW_LEVEL_SLOTS.includes("audioContextFactory")
);
check(
  "readiness composes audio adapter through fake injected audio dependencies",
  calls.includes(`runtime:audio-play:${content.assets.sfx.weapons.spark_bolt}`) &&
    calls.includes("runtime:audio-context:start-laugh")
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
  "readiness sees debug gameBanners and input adapter-bound through platform adapter",
  ["debugSystem", "bannerSystem", "bindMovementInput"].every(
    (slot) =>
      MODULE_RUNTIME_PLATFORM_ADAPTER_PROOF_SLOTS.includes(slot) &&
      MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS.includes(slot)
  ) &&
    !["debug", "gameBanners", "input"].some((slot) =>
      CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes(slot)
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
  "readiness sees module runtime rendering adapter covers render facades",
  ["rendering", "renderHud", "renderEnemies", "renderSkillRail"].every((slot) =>
    MODULE_RUNTIME_RENDERING_ADAPTER_SLOTS.includes(slot)
  ) &&
    ["clearFrame", "renderFrame", "renderHud", "renderEnemies", "renderSkillRail"].every((slot) =>
      MODULE_RUNTIME_RENDERING_ADAPTER_PROOF_SLOTS.includes(slot)
    )
);
check(
  "readiness sees module runtime rendering adapter low-level dependencies explicit",
  MODULE_RUNTIME_RENDERING_ADAPTER_LOW_LEVEL_SLOTS.includes("renderers") &&
    MODULE_RUNTIME_RENDERING_ADAPTER_LOW_LEVEL_SLOTS.includes("platformAdapters") &&
    MODULE_RUNTIME_RENDERING_ADAPTER_LOW_LEVEL_SLOTS.includes("spriteAdapters") &&
    MODULE_RUNTIME_RENDERING_ADAPTER_LOW_LEVEL_SLOTS.includes("assetAdapters") &&
    MODULE_RUNTIME_RENDERING_ADAPTER_LOW_LEVEL_SLOTS.includes("uiAdapters")
);
check(
  "readiness composes rendering adapter through fake injected render dependencies",
  calls.includes("runtime:render-clear:960") &&
    calls.some((call) => call.startsWith("runtime:render-frame:true:")) &&
    calls.includes("runtime:render-hud:7") &&
    calls.includes("runtime:render-enemies:1") &&
    calls.includes("runtime:render-skill-rail:1") &&
    calls.includes("runtime:render-missing:manual-missing")
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
  "readiness sees module runtime gameplay adapter covers gameplay facade services",
  ["combat", "enemies", "enemyBehaviors", "enemySpawning", "weaponBehaviors", "weaponFire"].every(
    (slot) => MODULE_RUNTIME_GAMEPLAY_ADAPTER_SLOTS.includes(slot)
  ) &&
    ["createCombatSystem", "createEnemySystem", "createWeaponFireSystem"].every((slot) =>
      MODULE_RUNTIME_GAMEPLAY_ADAPTER_PROOF_SLOTS.includes(slot)
    )
);
check(
  "readiness sees module runtime gameplay adapter low-level dependencies explicit",
  MODULE_RUNTIME_GAMEPLAY_ADAPTER_LOW_LEVEL_SLOTS.includes("gameplaySystems") &&
    MODULE_RUNTIME_GAMEPLAY_ADAPTER_LOW_LEVEL_SLOTS.includes("combatDamage") &&
    MODULE_RUNTIME_GAMEPLAY_ADAPTER_LOW_LEVEL_SLOTS.includes("weaponCooldowns") &&
    MODULE_RUNTIME_GAMEPLAY_ADAPTER_LOW_LEVEL_SLOTS.includes("weaponProjectiles") &&
    MODULE_RUNTIME_GAMEPLAY_ADAPTER_LOW_LEVEL_SLOTS.includes("weaponTargeting")
);
check(
  "readiness sees module runtime progression adapter covers progression shop facades",
  ["progression", "quests", "upgrades", "levelUp", "shop", "uiProgression"].every((slot) =>
    MODULE_RUNTIME_PROGRESSION_ADAPTER_SLOTS.includes(slot)
  ) &&
    ["createProgressionSystem", "createQuestSystem", "createUpgradeContent", "createLevelUpSystem", "createShopSystem", "createUiProgressionRenderer"].every(
      (slot) => MODULE_RUNTIME_PROGRESSION_ADAPTER_PROOF_SLOTS.includes(slot)
    )
);
check(
  "readiness sees module runtime progression adapter low-level dependencies explicit",
  MODULE_RUNTIME_PROGRESSION_ADAPTER_LOW_LEVEL_SLOTS.includes("progressionSystems") &&
    MODULE_RUNTIME_PROGRESSION_ADAPTER_LOW_LEVEL_SLOTS.includes("contentRegistry") &&
    MODULE_RUNTIME_PROGRESSION_ADAPTER_LOW_LEVEL_SLOTS.includes("levelUpChoices") &&
    MODULE_RUNTIME_PROGRESSION_ADAPTER_LOW_LEVEL_SLOTS.includes("shopPricing") &&
    MODULE_RUNTIME_PROGRESSION_ADAPTER_LOW_LEVEL_SLOTS.includes("save")
);
check(
  "readiness sees module runtime sprite adapter bundle covers sprite/render services",
  MODULE_RUNTIME_SPRITE_ADAPTER_SLOTS.includes("spriteSystem") &&
    ["loadSprites", "drawImage", "drawSprite"].every((slot) =>
      MODULE_RUNTIME_SPRITE_ADAPTER_PROOF_SLOTS.includes(slot)
    )
);
check(
  "readiness sees sprites adapter-bound through sprite and asset adapters",
  MODULE_RUNTIME_SPRITE_ADAPTER_SLOTS.includes("spriteSystem") &&
    MODULE_RUNTIME_ASSETS_ADAPTER_SLOTS.includes("assets") &&
    MODULE_RUNTIME_ASSETS_ADAPTER_PROOF_SLOTS.includes("createAssetResolver") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("sprites")
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
  "readiness sees no unresolved non-game classic subsystem blockers",
  !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("assets") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("audio") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("rendering") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("renderHud") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("renderEnemies") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("renderSkillRail") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("combat") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("enemyBehaviors") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("enemySpawning") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("enemies") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("levelUp") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("progression") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("quests") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("shop") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("uiProgression") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("upgrades") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("weaponBehaviors") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("weaponFire") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("debug") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("gameBanners") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("input") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("sprites") &&
    CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.length === 0
);
check(
  "readiness sees module-native dependency bag without TapSurvivor global reads",
  moduleNativeGameDependencyGlobalReads.length === 0
);
check(
  "readiness sees module game lifecycle owner without TapSurvivor global reads",
  moduleGameLifecycleOwnerGlobalReads.length === 0
);
check(
  "readiness sees production ESM entrypoint candidate without TapSurvivor global reads",
  productionModuleEntrypointGlobalReads.length === 0
);
check(
  "readiness sees browser dependency bag factory without TapSurvivor global reads",
  browserDependencyBagGlobalReads.length === 0
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
  "readiness sees module runtime progression adapter without TapSurvivor global reads",
  moduleRuntimeProgressionAdapterGlobalReads.length === 0
);
check(
  "readiness sees module runtime assets adapter without TapSurvivor global reads",
  moduleRuntimeAssetsAdapterGlobalReads.length === 0
);
check(
  "readiness sees module runtime audio adapter without TapSurvivor global reads",
  moduleRuntimeAudioAdapterGlobalReads.length === 0
);
check(
  "readiness sees module runtime gameplay adapter without TapSurvivor global reads",
  moduleRuntimeGameplayAdapterGlobalReads.length === 0
);
check(
  "readiness sees module runtime rendering adapter without TapSurvivor global reads",
  moduleRuntimeRenderingAdapterGlobalReads.length === 0
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
  moduleGameLifecycleOwner: {
    proofSlots: MODULE_GAME_LIFECYCLE_OWNER_PROOF_SLOTS,
    ownerSlots: MODULE_GAME_LIFECYCLE_OWNER_SLOTS,
    lowLevelInjectedSlots: MODULE_GAME_LIFECYCLE_OWNER_LOW_LEVEL_SLOTS,
    moduleNativeSourceGlobalReads: moduleGameLifecycleOwnerGlobalReads,
    moduleNativeEquivalentFor: [
      "initial boot/init",
      "dependency bag creation",
      "title/shell startup",
      "start-run flow",
      "run state ownership",
      "loop/tick ownership",
      "render call ownership",
      "input bind ownership",
      "persistence calls",
      "stop/dispose ownership",
    ],
  },
  productionModuleEntrypointCandidate: {
    exists: true,
    selectedByProduction: false,
    proofSlots: PRODUCTION_MODULE_ENTRYPOINT_PROOF_SLOTS,
    importsModuleLifecycleOwner: productionModuleEntrypointSource.includes(
      "../modules/module-game-lifecycle.js"
    ),
    importsModuleDependencyBag: productionModuleEntrypointSource.includes(
      "../modules/module-game-dependencies.js"
    ),
    importsBrowserDependencyBag: productionModuleEntrypointSource.includes(
      "./browser-dependency-bag.js"
    ),
    importsComposeRuntime: productionModuleEntrypointSource.includes("./compose-runtime.js"),
    moduleNativeSourceGlobalReads: productionModuleEntrypointGlobalReads,
  },
  browserDependencyBagFactory: {
    exists: true,
    proofSlots: BROWSER_DEPENDENCY_BAG_PROOF_SLOTS,
    moduleNativeSourceGlobalReads: browserDependencyBagGlobalReads,
  },
  moduleRuntimePlatformAdapter: {
    proofSlots: MODULE_RUNTIME_PLATFORM_ADAPTER_PROOF_SLOTS,
    adapterSlots: MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS,
    moduleNativeSourceGlobalReads: moduleRuntimePlatformAdapterGlobalReads,
    adapterBoundClassicSystems: ["debug", "gameBanners", "input"],
  },
  moduleRuntimeAssetsAdapter: {
    proofSlots: MODULE_RUNTIME_ASSETS_ADAPTER_PROOF_SLOTS,
    adapterSlots: MODULE_RUNTIME_ASSETS_ADAPTER_SLOTS,
    lowLevelInjectedSlots: MODULE_RUNTIME_ASSETS_ADAPTER_LOW_LEVEL_SLOTS,
    moduleNativeSourceGlobalReads: moduleRuntimeAssetsAdapterGlobalReads,
    adapterBoundClassicSystems: ["sprites"],
  },
  moduleRuntimeAudioAdapter: {
    proofSlots: MODULE_RUNTIME_AUDIO_ADAPTER_PROOF_SLOTS,
    adapterSlots: MODULE_RUNTIME_AUDIO_ADAPTER_SLOTS,
    lowLevelInjectedSlots: MODULE_RUNTIME_AUDIO_ADAPTER_LOW_LEVEL_SLOTS,
    moduleNativeSourceGlobalReads: moduleRuntimeAudioAdapterGlobalReads,
  },
  moduleRuntimeGameplayAdapter: {
    proofSlots: MODULE_RUNTIME_GAMEPLAY_ADAPTER_PROOF_SLOTS,
    adapterSlots: MODULE_RUNTIME_GAMEPLAY_ADAPTER_SLOTS,
    lowLevelInjectedSlots: MODULE_RUNTIME_GAMEPLAY_ADAPTER_LOW_LEVEL_SLOTS,
    moduleNativeSourceGlobalReads: moduleRuntimeGameplayAdapterGlobalReads,
  },
  moduleRuntimeProgressionAdapter: {
    proofSlots: MODULE_RUNTIME_PROGRESSION_ADAPTER_PROOF_SLOTS,
    adapterSlots: MODULE_RUNTIME_PROGRESSION_ADAPTER_SLOTS,
    lowLevelInjectedSlots: MODULE_RUNTIME_PROGRESSION_ADAPTER_LOW_LEVEL_SLOTS,
    moduleNativeSourceGlobalReads: moduleRuntimeProgressionAdapterGlobalReads,
    adapterBoundClassicSystems: [
      "levelUp",
      "progression",
      "quests",
      "shop",
      "uiProgression",
      "upgrades",
    ],
  },
  moduleRuntimeRenderingAdapter: {
    proofSlots: MODULE_RUNTIME_RENDERING_ADAPTER_PROOF_SLOTS,
    adapterSlots: MODULE_RUNTIME_RENDERING_ADAPTER_SLOTS,
    lowLevelInjectedSlots: MODULE_RUNTIME_RENDERING_ADAPTER_LOW_LEVEL_SLOTS,
    moduleNativeSourceGlobalReads: moduleRuntimeRenderingAdapterGlobalReads,
  },
  moduleRuntimeSpriteAdapter: {
    proofSlots: MODULE_RUNTIME_SPRITE_ADAPTER_PROOF_SLOTS,
    adapterSlots: MODULE_RUNTIME_SPRITE_ADAPTER_SLOTS,
    lowLevelInjectedSlots: MODULE_RUNTIME_SPRITE_ADAPTER_LOW_LEVEL_SLOTS,
    moduleNativeSourceGlobalReads: moduleRuntimeSpriteAdapterGlobalReads,
    adapterBoundClassicSystems: ["sprites"],
  },
  residualRuntimeAdapterClassification: {
    newResidualAdapterModuleNeeded: false,
    adapterBoundClassicSystems: {
      debug: "moduleRuntimePlatformAdapter.debugSystem",
      gameBanners: "moduleRuntimePlatformAdapter.bannerSystem",
      input: "moduleRuntimePlatformAdapter.bindMovementInput",
      sprites: "moduleRuntimeSpriteAdapter.spriteSystem and moduleRuntimeAssetsAdapter.assets",
    },
    unresolvedNonGameClassicSubsystemBlockers: [],
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
    "src/game.js remains the production entrypoint until the production ESM candidate is selected",
    "production still uses generated src/game-dependencies.js classic global adapter",
    "production ESM entrypoint candidate exists but is not selected by index.html",
  ],
  remainingGlobalRetirementBlockers: [
    "classic production script order still publishes TapSurvivor compatibility globals",
    "generated src/game-dependencies.js classic global adapter remains active for production",
    "compatibility-boundary reads remain until production switches away from classic globals",
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
