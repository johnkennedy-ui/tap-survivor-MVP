import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  bootProductionModuleEntrypoint,
  bootProductionModuleRuntime,
  createProductionModuleEntrypoint,
  PRODUCTION_MODULE_ENTRYPOINT_PROOF_SLOTS,
} from "../src/app/production-module-entrypoint.js";
import {
  BROWSER_DEPENDENCY_BAG_PROOF_SLOTS,
  BROWSER_GAMEPLAY_ADAPTER_PROOF_SLOTS,
  BROWSER_PLATFORM_ADAPTER_PROOF_SLOTS,
  BROWSER_PROGRESSION_ADAPTER_PROOF_SLOTS,
  BROWSER_RENDERING_ADAPTER_PROOF_SLOTS,
  BROWSER_SPRITE_ADAPTER_PROOF_SLOTS,
  BROWSER_UI_ADAPTER_PROOF_SLOTS,
  createBrowserDependencyBagOptions,
} from "../src/app/browser-dependency-bag.js";

const root = new URL("..", import.meta.url).pathname;
const content = JSON.parse(readFileSync(join(root, "content/tap-survivor-content.json"), "utf8"));
const indexHtmlBefore = readFileSync(join(root, "index.html"), "utf8");
const candidateSource = readFileSync(join(root, "src/app/production-module-entrypoint.js"), "utf8");
const autobootSource = readFileSync(join(root, "src/app/production-module-autoboot.js"), "utf8");
const browserDependencyBagSource = readFileSync(join(root, "src/app/browser-dependency-bag.js"), "utf8");
const classicContentSource = readFileSync(join(root, "src/content.generated.js"), "utf8");
const moduleContentSource = readFileSync(join(root, "src/content.generated.mjs"), "utf8");
const classicRelicsSource = readFileSync(join(root, "src/relics.js"), "utf8");
const calls = [];
const beforeTapGlobals = tapSurvivorGlobalNames();
const browserGameplayGlobals = {
  TapSurvivorCombat: { createCombatSystem: () => ({}) },
  TapSurvivorEnemies: { createEnemySystem: () => ({}) },
  TapSurvivorEnemyBehaviors: { createEnemyBehaviorSystem: () => ({}) },
  TapSurvivorEnemySpawning: { createEnemySpawnSystem: () => ({}) },
  TapSurvivorWeaponBehaviors: { createWeaponBehaviorSystem: () => ({}) },
  TapSurvivorWeaponFire: { createWeaponFireSystem: () => ({}) },
};
const browserProgressionGlobals = {
  TapSurvivorLevelUp: { createLevelUpSystem: () => ({}) },
  TapSurvivorProgression: { createProgressionSystem: () => ({}) },
  TapSurvivorQuests: {
    createQuestSystem: () => ({}),
    questOpenIds: (quest) => [quest?.opensQuest, ...(quest?.opensQuests || [])].filter(Boolean),
  },
  TapSurvivorShop: { createShopSystem: () => ({}) },
  TapSurvivorUpgrades: {
    createUpgradeContent: () => ({
      createUpgradeDefs: () => [],
      runUpgradeDefs: [],
    }),
  },
};

check("production module entrypoint candidate imports successfully", typeof createProductionModuleEntrypoint === "function");
check("production module runtime autoboot export imports successfully", typeof bootProductionModuleRuntime === "function");
check(
  "production module entrypoint candidate imports compose runtime helper",
  candidateSource.includes("./compose-runtime.js")
);
check(
  "production module entrypoint candidate imports browser dependency bag factory",
  candidateSource.includes("./browser-dependency-bag.js")
);
check(
  "production module entrypoint candidate imports module dependency bag",
  candidateSource.includes("../modules/module-game-dependencies.js")
);
check(
  "production module entrypoint candidate imports module lifecycle owner",
  candidateSource.includes("../modules/module-game-lifecycle.js")
);
check(
  "production module entrypoint imports generated ESM content and schema",
  candidateSource.includes('from "../content.generated.mjs"') &&
    candidateSource.includes("content, contentSchema") &&
    !candidateSource.includes("../content.generated.js")
);
check(
  "generated ESM content module exports content, schema, and balance profiles",
  ["content", "contentSchema", "balanceProfiles"].every((name) =>
    moduleContentSource.includes(`export const ${name} =`)
  )
);
check(
  "classic generated content publishes no schema global",
  classicContentSource.includes("globalThis.TapSurvivorContent =") &&
    classicContentSource.includes("globalThis.TapSurvivorBalanceProfiles =") &&
    !classicContentSource.includes("TapSurvivorContentSchema")
);
check(
  "classic fallback preserves TapSurvivorContent publisher pending separate dependency retirement",
  classicContentSource.includes("globalThis.TapSurvivorContent =")
);
check(
  "classic fallback preserves TapSurvivorRelics publisher pending separate publisher retirement",
  classicRelicsSource.includes("globalThis.TapSurvivorRelics =") &&
    classicRelicsSource.includes("createRelicSystem")
);
check(
  "production module entrypoint candidate exposes expected proof slots",
  ["boot", "createDependencyBag", "createLifecycleOwner", "init", "startRun", "tick", "render", "persist", "dispose"].every(
    (slot) => PRODUCTION_MODULE_ENTRYPOINT_PROOF_SLOTS.includes(slot)
  )
);
check(
  "production module entrypoint candidate has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(candidateSource)
);
check(
  "production module autoboot wrapper calls explicit runtime boot",
  autobootSource.includes('from "./production-module-entrypoint.js"') &&
    autobootSource.includes("bootProductionModuleRuntime();")
);
check(
  "production module autoboot wrapper has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(autobootSource)
);
check(
  "production ESM boot source has no direct or string-key TapSurvivorContent global read",
  !hasTapSurvivorContentGlobalRead(candidateSource) && !hasTapSurvivorContentGlobalRead(autobootSource)
);
check(
  "production ESM browser dependency bag has no direct, string-key, or dynamic TapSurvivorRelics access",
  !hasTapSurvivorRelicsGlobalRead(browserDependencyBagSource) &&
    !browserDependencyBagSource.includes("TapSurvivorRelics")
);
check(
  "production ESM browser dependency bag statically imports native UI progression without classic global access",
  browserDependencyBagSource.includes(
    'import { createUiProgressionRenderer } from "../modules/ui-progression.js";'
  ) &&
    !hasTapSurvivorUiProgressionGlobalRead(browserDependencyBagSource) &&
    !browserDependencyBagSource.includes("TapSurvivorUiProgression")
);

const initialSave = {
  coins: 21,
  selectedStartingWeapon: "spark_bolt",
  shopPurchases: {},
  towerFloor: 1,
  unlockedWeapons: ["spark_bolt"],
};
const canvas = {
  height: 540,
  listeners: new Map(),
  width: 960,
  addEventListener(type, handler) {
    this.listeners.set(type, handler);
    calls.push(`canvas:${type}`);
  },
  getBoundingClientRect() {
    return { height: 540, left: 0, top: 0, width: 960 };
  },
  getContext() {
    return canvasContext;
  },
};
const canvasContext = {
  clearRect: (...args) => calls.push(`canvas:clear:${args.join(",")}`),
  drawImage: (...args) => calls.push(`canvas:draw:${args.length}`),
  restore: () => calls.push("canvas:restore"),
  rotate: (angle) => calls.push(`canvas:rotate:${angle}`),
  save: () => calls.push("canvas:save"),
  scale: (x, y) => calls.push(`canvas:scale:${x}:${y}`),
  translate: (x, y) => calls.push(`canvas:translate:${x}:${y}`),
};
const documentRef = {
  body: { dataset: { gameSpeed: "5" } },
  createdTags: [],
  createElement(tagName) {
    this.createdTags.push(tagName);
    return createFixtureElement(tagName);
  },
  visibilityState: "visible",
  addEventListener(type) {
    calls.push(`document:${type}`);
  },
};
const runtimeGlobal = {
  ...browserGameplayGlobals,
  ...browserProgressionGlobals,
  addEventListener(type) {
    calls.push(`global:${type}`);
  },
  requestAnimationFrame(callback) {
    this.frameCallback = callback;
    calls.push("raf");
    return 1;
  },
  Image: class {
    complete = true;
    naturalHeight = 16;
    naturalWidth = 16;
    addEventListener() {}
    set src(value) {
      this.source = value;
    }
  },
};
const runtimeContentGlobalGuard = installTapSurvivorContentGlobalReadGuard(
  runtimeGlobal,
  "injected browser globalRef"
);
const runtimeRelicsGlobalGuard = installTapSurvivorRelicsGlobalReadGuard(
  runtimeGlobal,
  "injected browser globalRef"
);
const runtimeUiProgressionGlobalGuard = installTapSurvivorUiProgressionGlobalReadGuard(
  runtimeGlobal,
  "injected browser globalRef"
);
function createVisibilityNode(label) {
  const listeners = new Map();
  const classNames = new Set(["hidden"]);
  const node = {
    attributes: {},
    classList: {
      add(name) {
        classNames.add(name);
        calls.push(`${label}:add:${name}`);
        if (name === "hidden") {
          node.hidden = true;
        }
      },
      contains(name) {
        return classNames.has(name);
      },
      remove(name) {
        classNames.delete(name);
        calls.push(`${label}:remove:${name}`);
        if (name === "hidden") {
          node.hidden = false;
        }
      },
      toggle(name, value) {
        calls.push(`${label}:toggle:${name}:${String(value)}`);
        const present = value === undefined ? !classNames.has(name) : Boolean(value);
        if (present) classNames.add(name);
        else classNames.delete(name);
        if (name === "hidden") {
          node.hidden = present;
        }
        return present;
      },
    },
    disabled: false,
    hidden: true,
    addEventListener(type, handler) {
      listeners.set(type, handler);
      calls.push(`${label}:listener:${type}`);
    },
    click() {
      listeners.get("click")?.({ type: "click" });
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      calls.push(`${label}:attr:${name}:${value}`);
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    textContent: "",
  };
  return node;
}

function createFixtureElement(tagName) {
  const listeners = new Map();
  return {
    children: [],
    className: "",
    disabled: false,
    innerHTML: "",
    tagName,
    textContent: "",
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    click() {
      listeners.get("click")?.({ type: "click" });
    },
  };
}
check(
  "production browser dependency bag factory exposes expected adapter slots",
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
  ].every((slot) => BROWSER_DEPENDENCY_BAG_PROOF_SLOTS.includes(slot))
);
check(
  "production browser platform adapter factory exposes expected default slots",
  ["bannerSystem", "bindMovementInput", "canvas", "debugSystem", "loop"].every((slot) =>
    BROWSER_PLATFORM_ADAPTER_PROOF_SLOTS.includes(slot)
  )
);
check(
  "production browser render and sprite defaults expose expected slots",
  ["clearFrame", "renderEnemies", "renderFrame", "renderHud", "renderPlayer", "renderSkillRail"].every((slot) =>
    BROWSER_RENDERING_ADAPTER_PROOF_SLOTS.includes(slot)
  ) &&
    ["drawImage", "drawSprite", "loadSprites"].every((slot) =>
      BROWSER_SPRITE_ADAPTER_PROOF_SLOTS.includes(slot)
    )
);
check(
  "production browser gameplay and progression defaults expose expected slots",
  ["combat", "enemies", "enemyBehaviors", "enemySpawning", "weaponBehaviors", "weaponFire"].every(
    (slot) => BROWSER_GAMEPLAY_ADAPTER_PROOF_SLOTS.includes(slot)
  ) &&
    ["levelUp", "progression", "quests", "shop", "uiProgression", "upgrades"].every((slot) =>
      BROWSER_PROGRESSION_ADAPTER_PROOF_SLOTS.includes(slot)
    )
);
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
const uiSurface = {
  endScreen: createVisibilityNode("browser-ui:end-screen"),
  questBanner: {
    classList: {
      add: (name) => calls.push(`quest-banner:add:${name}`),
      remove: (name) => calls.push(`quest-banner:remove:${name}`),
    },
    textContent: "",
  },
  levelUp: {
    classList: {
      add: () => calls.push("level-up:hidden"),
    },
  },
  menuInventoryPanel: createVisibilityNode("browser-ui:menu-inventory-panel"),
  menuInventoryTab: createVisibilityNode("browser-ui:menu-inventory-tab"),
  menuProgressPanel: createVisibilityNode("browser-ui:menu-progress-panel"),
  menuProgressTab: createVisibilityNode("browser-ui:menu-progress-tab"),
  menuShopNotice: createVisibilityNode("browser-ui:menu-shop-notice"),
  menuShopPanel: createVisibilityNode("browser-ui:menu-shop-panel"),
  menuShopTab: createVisibilityNode("browser-ui:menu-shop-tab"),
  openMenu: createVisibilityNode("browser-ui:open-menu"),
  exitRun: createVisibilityNode("browser-ui:exit-run"),
  runMenu: createVisibilityNode("browser-ui:run-menu"),
  runHud: { textContent: "" },
  runStats: { innerHTML: "" },
  speedButtons,
  shopModal: createVisibilityNode("browser-ui:shop-modal"),
  startTransition: createVisibilityNode("browser-ui:start-transition"),
  titleScreen: createVisibilityNode("browser-ui:title-screen"),
  titleStartGame: createVisibilityNode("browser-ui:title-start-game"),
};
const storage = createMemoryStorage();
storage.setItem("tap-survivor-mvp-save-v2", JSON.stringify(initialSave));

const entrypoint = bootProductionModuleEntrypoint({
  globalRef: runtimeGlobal,
  lifecycleHooks: {
    dispose: () => calls.push("lifecycle:dispose"),
    resetGameState: () => {
      calls.push("lifecycle:reset");
      return createFakeRun();
    },
    update: ({ dependencies, dt }) => {
      calls.push(`lifecycle:update:${dt}`);
      const game = dependencies.getGame();
      game.awaitingFirstMoveInput = false;
      const updater = dependencies.moduleSystems.runUpdate.createRunUpdater({
        addQuestProgressGroup: (ids, amount) =>
          calls.push(`lifecycle:quests:${ids.join(",")}:${amount}`),
        canvas: dependencies.canvas,
        clamp: dependencies.moduleSystems.math.clamp,
        combat: {
          spawnBoss: () => calls.push("lifecycle:combat:spawn-boss"),
          spawnEnemies: () => calls.push("lifecycle:combat:spawn-enemies"),
          updateAreas: () => calls.push("lifecycle:combat:update-areas"),
          updateBeams: () => calls.push("lifecycle:combat:update-beams"),
          updateBolts: () => calls.push("lifecycle:combat:update-bolts"),
          updateBossSpecials: () => calls.push("lifecycle:combat:update-boss-specials"),
          updateEnemies: () => calls.push("lifecycle:combat:update-enemies"),
          updateEnemyBolts: () => calls.push("lifecycle:combat:update-enemy-bolts"),
          updateWeaponBursts: () => calls.push("lifecycle:combat:update-weapon-bursts"),
          updateWeapons: () => calls.push("lifecycle:combat:update-weapons"),
        },
        endRun: (reason) => calls.push(`lifecycle:end:${reason}`),
        getGame: dependencies.getGame,
        getRelicSpecialEffects: () => ({}),
        levelQuestIds: [],
        mapSystem: {
          applyToGame: () => calls.push("lifecycle:map"),
        },
        pickupSystem: {
          updateLootDrops: () => calls.push("lifecycle:pickup:loot"),
          updatePickupTexts: () => calls.push("lifecycle:pickup:texts"),
          updateXpDrops: () => calls.push("lifecycle:pickup:xp"),
        },
        showLevelUp: () => calls.push("lifecycle:level-up"),
        survivalQuestIds: ["survive"],
        xpQuestIds: [],
      });
      updater.update(dt);
      return true;
    },
  },
  platform: {
    documentRef,
    runtimeGlobal,
  },
  dependencyBagOptions: {
    adapters: createFakeAdapters({ canvas, calls, initialSave, storage, uiSurface }),
    content,
    contentSchema: {
      effectRegistries: {
        shopItem: {
          stats: [
            "attackRadius",
            "fireRate",
            "flatDamage",
            "maxHp",
            "percentDamage",
            "pickupRadius",
            "relicFocus",
            "speed",
          ],
        },
      },
    },
    saveConfig: {
      legacySaveKey: "tap-survivor-mvp-save-v1",
      questOpenIds: (quest) => quest?.opens || [],
      saveKey: "tap-survivor-mvp-save-v2",
    },
    upgradeContent: {
      createUpgradeDefs: (weaponDefs) =>
        Object.entries(weaponDefs).map(([weaponId, weapon]) => ({
          id: weapon.upgradeId || `${weaponId}_damage`,
          weaponId,
        })),
      runUpgradeDefs: content.runUpgrades || [],
    },
  },
});

check("production module entrypoint creates lifecycle owner", Boolean(entrypoint.lifecycle));
check(
  "production module entrypoint uses module game dependency bag",
  Boolean(entrypoint.dependencies.moduleSystems?.contentRegistry?.weaponDefs?.spark_bolt) &&
    typeof entrypoint.dependencies.moduleSystems?.runUpdate?.createRunUpdater === "function"
);
check(
  "production module entrypoint reaches module runtime adapters",
  Boolean(entrypoint.dependencies.moduleSystems?.moduleRuntimeAssetsAdapter?.assets) &&
    Boolean(entrypoint.dependencies.moduleSystems?.moduleRuntimeAudioAdapter?.audio) &&
    Boolean(entrypoint.dependencies.moduleSystems?.moduleRuntimeGameplayAdapter?.combat) &&
    Boolean(entrypoint.dependencies.moduleSystems?.moduleRuntimeProgressionAdapter?.shop) &&
    Boolean(entrypoint.dependencies.moduleSystems?.moduleRuntimeRenderingAdapter?.rendering) &&
    Boolean(entrypoint.dependencies.moduleSystems?.moduleRuntimeSpriteAdapter?.spriteSystem) &&
    Boolean(entrypoint.dependencies.moduleSystems?.moduleRuntimeStorageAdapter?.storageAdapter) &&
    Boolean(entrypoint.dependencies.moduleSystems?.moduleRuntimeUiAdapters?.ui)
);
check(
  "production-style init binds input through platform adapter",
  calls.includes("input:bind") && calls.includes("canvas:mousedown") && calls.includes("raf")
);

entrypoint.startRun();
entrypoint.tick(0.016);
entrypoint.render({ frameId: "production-candidate" });
entrypoint.persist();
entrypoint.dispose();

check(
  "production-style startRun reaches module lifecycle path",
  calls.includes("lifecycle:reset") && calls.includes("shop:close") && calls.includes("level-up:hidden")
);
check(
  "production-style tick reaches module run update path",
  calls.includes("lifecycle:update:0.016") &&
    calls.includes("lifecycle:map") &&
    calls.includes("lifecycle:quests:survive:0.016") &&
    calls.includes("lifecycle:combat:update-weapons")
);
check(
  "production-style render reaches rendering adapter",
  calls.includes("render:clear:960") &&
    calls.some((call) => call.startsWith("render:frame:true:")) &&
    calls.includes("render:hud:1") &&
    calls.includes("render:skill-rail:1")
);
check(
  "production-style persist reaches storage adapter",
  calls.some((call) => call.startsWith("storage:set:tap-survivor-mvp-save-v2:"))
);
check("production-style dispose reaches lifecycle owner", calls.includes("lifecycle:dispose"));
check(
  "production module entrypoint publishes no TapSurvivor globals",
  sameNames(beforeTapGlobals, tapSurvivorGlobalNames())
);

const browserCalls = [];
const browserStorage = createMemoryStorage();
const browserEntrypoint = bootProductionModuleEntrypoint({
  browserDependencyBagOptions: {
    canvas,
    content,
    contentSchema: {
      effectRegistries: {
        shopItem: {
          stats: ["speed"],
        },
      },
    },
    initialSave,
    storage: browserStorage,
    ui: uiSurface,
  },
  lifecycleHooks: {
    dispose: () => browserCalls.push("browser:dispose"),
    update: ({ dt }) => {
      browserCalls.push(`browser:update:${dt}`);
      return true;
    },
  },
  platform: {
    documentRef,
    runtimeGlobal,
  },
});
const browserUiAdapters = browserEntrypoint.dependencies.moduleSystems.moduleRuntimeUiAdapters;
browserUiAdapters.shellUiAdapter.bind();
uiSurface.titleStartGame.click();
browserEntrypoint.tick(0.032);
browserEntrypoint.render({ frameId: "browser-default" });
browserEntrypoint.persist();
browserEntrypoint.runtime.setGameSpeed(5);
browserUiAdapters.runUiAdapter.updateRunHud();
browserUiAdapters.runUiAdapter.showEndScreen("browser-entrypoint");
browserUiAdapters.runUiAdapter.hideEndScreen();
browserUiAdapters.shellUiAdapter.bind();
browserUiAdapters.shellUiAdapter.showTitleScreen();
browserUiAdapters.shellUiAdapter.closeRunMenu(false);
browserUiAdapters.shopSystemAdapter.openShop?.();
browserUiAdapters.shopSystemAdapter.renderShop?.();
browserUiAdapters.shopSystemAdapter.closeShop();
browserEntrypoint.dispose();

check(
  "production module entrypoint boots without explicit dependencyBagOptions",
  Boolean(browserEntrypoint.dependencies.moduleSystems?.moduleRuntimeStorageAdapter?.storageAdapter) &&
    Boolean(browserEntrypoint.dependencies.moduleSystems?.moduleRuntimeRenderingAdapter?.rendering)
);
check(
  "production module entrypoint default browser dependency bag reaches lifecycle",
  browserCalls.includes("browser:update:0.032") && browserCalls.includes("browser:dispose")
);
check(
  "production module entrypoint default browser title start path reaches lifecycle",
  calls.includes("browser-ui:title-start-game:listener:click") &&
    calls.includes("browser-ui:title-screen:add:hidden") &&
    calls.includes("browser-ui:start-transition:add:hidden")
);
check(
  "production module entrypoint default browser dependency bag persists",
  Boolean(browserStorage.getItem("tap-survivor-mvp-save-v2"))
);
check(
  "production module entrypoint default browser boot publishes no TapSurvivor globals",
  sameNames(beforeTapGlobals, tapSurvivorGlobalNames())
);
check(
  "production module entrypoint preserves explicit custom content schema injection",
  JSON.stringify(
    Object.keys(browserEntrypoint.dependencies.moduleSystems.effects.emptyShopBonuses())
  ) === JSON.stringify(["speed"])
);
check(
  "production module entrypoint default browser dependency bag exposes browser UI defaults",
  BROWSER_UI_ADAPTER_PROOF_SLOTS.every((slot) => slot in browserUiAdapters) &&
    typeof browserUiAdapters.runUiAdapter?.updateRunHud === "function" &&
    typeof browserUiAdapters.shellUiAdapter?.showTitleScreen === "function" &&
    typeof browserUiAdapters.shopSystemAdapter?.closeShop === "function" &&
    uiSurface.runHud.textContent.includes("Speed x5") &&
    uiSurface.runStats.innerHTML.includes("browser-entrypoint") &&
    uiSurface.endScreen.hidden === true &&
    uiSurface.titleScreen.hidden === false &&
    uiSurface.startTransition.hidden === true &&
    uiSurface.runMenu.hidden === true &&
    uiSurface.shopModal.hidden === true &&
    uiSurface.menuShopPanel.hidden === true &&
    uiSurface.menuShopNotice.textContent === "Browser shop ready." &&
    uiSurface.openMenu.getAttribute("aria-expanded") === "false" &&
    uiSurface.exitRun.disabled === true &&
    calls.includes("browser-ui:title-screen:remove:hidden") &&
    calls.includes("browser-ui:run-menu:add:hidden") &&
    calls.includes("browser-ui:shop-modal:add:hidden")
);
const defaultBrowserOptions = createBrowserDependencyBagOptions({
  canvas,
  content,
  documentRef,
  globalRef: runtimeGlobal,
  storage: createMemoryStorage(),
  ui: uiSurface,
});
const defaultGameplaySystems = defaultBrowserOptions.adapters.gameplayAdapters.gameplaySystems;
const defaultProgressionSystems =
  defaultBrowserOptions.adapters.progressionAdapters.progressionSystems;
const defaultPlatformAdapters = defaultBrowserOptions.adapters.platformAdapters;
const movementGame = {
  paused: false,
  player: { targetX: 0, targetY: 0 },
  running: true,
};
defaultPlatformAdapters.bindMovementInput({ getGame: () => movementGame });
canvas.listeners.get("mousedown")({ clientX: 240, clientY: 270 });
defaultPlatformAdapters.bannerSystem.showMovementGateBanner();
defaultPlatformAdapters.bannerSystem.showQuestBanner({ name: "Proof Quest" }, 3);
defaultPlatformAdapters.bannerSystem.hideMovementGateBanner();
defaultPlatformAdapters.debugSystem.bind();
defaultPlatformAdapters.debugSystem.render();
defaultPlatformAdapters.loop();
const defaultSpriteSystem = defaultBrowserOptions.adapters.spriteAdapters.spriteSystem;
const defaultRenderers = defaultBrowserOptions.adapters.renderingAdapters.renderers;
defaultSpriteSystem.loadSprites();
defaultSpriteSystem.drawImage("background:tower_floor", 0, 0, 960, 540);
defaultSpriteSystem.drawSprite("weaponIcon:spark_bolt", 20, 20, 16);
defaultRenderers.clearFrame();
defaultRenderers.renderFrame({
  spriteAdapters: defaultBrowserOptions.adapters.spriteAdapters,
});
defaultRenderers.renderEnemies({
  enemies: [{ id: "slime", x: 12, y: 14, size: 18 }],
  spriteAdapters: defaultBrowserOptions.adapters.spriteAdapters,
});
defaultRenderers.renderPlayer({
  game: { player: { x: 480, y: 270, radius: 16, targetX: 480, targetY: 270 } },
  spriteAdapters: defaultBrowserOptions.adapters.spriteAdapters,
});
defaultRenderers.renderSkillRail({
  game: { player: { equippedWeapons: ["spark_bolt"] } },
  spriteAdapters: defaultBrowserOptions.adapters.spriteAdapters,
});
check(
  "production browser gameplay defaults bridge classic namespace factories",
  typeof defaultGameplaySystems.combat?.createCombatSystem === "function" &&
    typeof defaultGameplaySystems.enemies?.createEnemySystem === "function" &&
    typeof defaultGameplaySystems.enemyBehaviors?.createEnemyBehaviorSystem === "function" &&
    typeof defaultGameplaySystems.enemySpawning?.createEnemySpawnSystem === "function" &&
    typeof defaultGameplaySystems.weaponBehaviors?.createWeaponBehaviorSystem === "function" &&
    typeof defaultGameplaySystems.weaponFire?.createWeaponFireSystem === "function"
);
check(
  "production browser progression defaults bridge classic namespace factories and native UI progression",
  typeof defaultProgressionSystems.levelUp?.createLevelUpSystem === "function" &&
    typeof defaultProgressionSystems.progression?.createProgressionSystem === "function" &&
    typeof defaultProgressionSystems.quests?.createQuestSystem === "function" &&
    typeof defaultProgressionSystems.quests?.questOpenIds === "function" &&
    typeof defaultProgressionSystems.shop?.createShopSystem === "function" &&
    typeof defaultProgressionSystems.uiProgression?.createUiProgressionRenderer === "function" &&
    typeof defaultProgressionSystems.upgrades?.createUpgradeContent === "function"
);
const uiProgressionParityDocument = createUiProgressionParityDocument();
const uiProgressionParityUi = {
  menuQpHud: { textContent: "" },
  menuQuests: createUiProgressionParityContainer(),
  menuTree: createUiProgressionParityContainer(),
};
const uiProgressionParitySystems = createBrowserDependencyBagOptions({
  canvas,
  content,
  documentRef: uiProgressionParityDocument,
  globalRef: runtimeGlobal,
  storage: createMemoryStorage(),
  ui: uiProgressionParityUi,
}).adapters.progressionAdapters.progressionSystems;
const uiProgressionParityRenderer = uiProgressionParitySystems.uiProgression.createUiProgressionRenderer({
  buyUpgrade: () => {},
  buyWeaponUnlock: () => {},
  getSave: () => ({
    activeQuests: [],
    coins: 21,
    questPoints: 3,
    questProgress: {},
    totalQuestPoints: 8,
    unlockedWeapons: [],
  }),
  getUpgradeTier: () => 0,
  hasNode: () => false,
  isNodeVisible: () => false,
  isQuestComplete: () => false,
  nodeGateStatus: () => null,
  questDefs: {},
  ui: uiProgressionParityUi,
  upgradeDefs: [],
  weaponDefs: {},
  weaponUnlocks: [],
});
uiProgressionParityRenderer.renderTree(uiProgressionParityUi.menuTree);
uiProgressionParityRenderer.renderQuests(uiProgressionParityUi.menuQuests);
check(
  "production browser native UI progression adapter injects documentRef with render tree and quest parity",
  uiProgressionParityDocument.createdTags.join(",") === "div,div" &&
    uiProgressionParityUi.menuTree.children[0]?.className === "node" &&
    uiProgressionParityUi.menuTree.children[0]?.textContent ===
      "No available skill nodes. Complete active quests to reveal the next branch." &&
    uiProgressionParityUi.menuQuests.children[0]?.className === "quest" &&
    uiProgressionParityUi.menuQuests.children[0]?.textContent ===
      "No active quests. Unlock the next available skill node to reveal one."
);
check(
  "production browser platform defaults bind canvas movement input",
  movementGame.player.targetX === 240 && movementGame.player.targetY === 270
);
check(
  "production browser platform defaults route banner UI",
  uiSurface.questBanner.textContent === "Proof Quest complete +3 QP" &&
    calls.includes("quest-banner:remove:hidden") &&
    calls.includes("quest-banner:add:hidden")
);
check(
  "production browser platform defaults expose debug and loop callables",
  typeof defaultPlatformAdapters.debugSystem.bind === "function" &&
    typeof defaultPlatformAdapters.debugSystem.render === "function" &&
    typeof defaultPlatformAdapters.loop === "function"
);
check(
  "production browser sprite defaults draw through canvas context",
  calls.includes("canvas:draw:5") && calls.includes("canvas:save") && calls.includes("canvas:restore")
);
check(
  "production browser render defaults route frame enemy and skill sprites",
  calls.includes("canvas:clear:0,0,960,540") &&
    calls.filter((call) => call === "canvas:draw:5").length >= 4
);
runtimeGlobal.TapSurvivorContentSchema = "malformed schema global";
const malformedSchemaEntrypoint = createProductionModuleEntrypoint({
  browserDependencyBagOptions: {
    canvas,
    initialSave,
    storage: createMemoryStorage(),
    ui: uiSurface,
  },
  platform: {
    documentRef,
    runtimeGlobal,
  },
});
check(
  "production module entrypoint ignores a malformed schema global",
  Boolean(malformedSchemaEntrypoint.dependencies.moduleSystems.contentRegistry.weaponDefs.spark_bolt) &&
    Object.prototype.hasOwnProperty.call(
      malformedSchemaEntrypoint.dependencies.moduleSystems.effects.emptyShopBonuses(),
      "speed"
    )
);
malformedSchemaEntrypoint.dispose();
delete runtimeGlobal.TapSurvivorContentSchema;
const autobootGlobalRestore = installAutobootGlobals({ canvas, documentRef, storage: createMemoryStorage() });
const autobootContentGlobalGuard = installTapSurvivorContentGlobalReadGuard(globalThis, "autoboot globalThis");
const autobootRelicsGlobalGuard = installTapSurvivorRelicsGlobalReadGuard(globalThis, "autoboot globalThis");
const autobootUiProgressionGlobalGuard = installTapSurvivorUiProgressionGlobalReadGuard(
  globalThis,
  "autoboot globalThis"
);
await import(`../src/app/production-module-autoboot.js?smoke=${Date.now()}`);
const autobootRafCalls = autobootGlobalRestore.rafCalls();
autobootGlobalRestore.restore();
autobootContentGlobalGuard.restore();
autobootRelicsGlobalGuard.restore();
autobootUiProgressionGlobalGuard.restore();
check("production module autoboot wrapper initializes browser runtime", autobootRafCalls === 1);
check(
  "production module boot completes without reading guarded TapSurvivorContent globals",
  runtimeContentGlobalGuard.readAttempts() === 0 && autobootContentGlobalGuard.readAttempts() === 0
);
check(
  "production module boot completes without reading guarded TapSurvivorRelics globals",
  runtimeRelicsGlobalGuard.readAttempts() === 0 && autobootRelicsGlobalGuard.readAttempts() === 0
);
check(
  "production module boot completes without reading guarded TapSurvivorUiProgression globals",
  runtimeUiProgressionGlobalGuard.readAttempts() === 0 && autobootUiProgressionGlobalGuard.readAttempts() === 0
);
runtimeContentGlobalGuard.restore();
runtimeRelicsGlobalGuard.restore();
runtimeUiProgressionGlobalGuard.restore();
check(
  "production module autoboot wrapper publishes no TapSurvivor globals",
  sameNames(beforeTapGlobals, tapSurvivorGlobalNames())
);
check(
  "production index.html remains untouched by candidate smoke",
  readFileSync(join(root, "index.html"), "utf8") === indexHtmlBefore
);

if (process.exitCode) {
  console.error("\nModule production entrypoint smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nModule production entrypoint smoke passed.");

function createFakeAdapters({ canvas, calls, initialSave, storage, uiSurface }) {
  return {
    assetAdapters: {
      fallbackSkillIcon: "fallback.png",
    },
    audioAdapters: {
      audioContextFactory: (cueId) => ({
        cueId,
        resume: () => calls.push(`audio-context:${cueId}`),
      }),
      audioFactory: (src) => ({
        cloneNode: () => ({
          play: () => calls.push(`audio:play:${src}`),
        }),
      }),
      clock: () => 1000,
    },
    gameplayAdapters: {
      gameplaySystems: {},
      onMissingAdapter: ({ name }) => calls.push(`gameplay:missing:${name}`),
    },
    initialGame: null,
    initialSave,
    platformAdapters: {
      bannerSystem: {
        hideMovementGateBanner: () => calls.push("banner:hide-movement-gate"),
        showMovementGateBanner: () => calls.push("banner:show-movement-gate"),
      },
      bindMovementInput: () => calls.push("input:bind"),
      canvas,
      debugSystem: {
        bind: () => calls.push("debug:bind"),
      },
      loop: () => calls.push("loop"),
    },
    progressionAdapters: {
      onMissingAdapter: ({ name }) => calls.push(`progression:missing:${name}`),
      progressionSystems: {},
    },
    renderingAdapters: {
      renderers: {
        clearFrame: ({ platformAdapters }) => {
          calls.push(`render:clear:${platformAdapters.canvas.width}`);
          return true;
        },
        renderEnemies: ({ enemies }) => {
          calls.push(`render:enemies:${enemies.length}`);
          return true;
        },
        renderFrame: ({ assetAdapters, game }) => {
          const resolver = assetAdapters.assets.createAssetResolver();
          calls.push(`render:frame:${Boolean(game)}:${resolver.weaponIcon("spark_bolt")}`);
          return true;
        },
        renderHud: ({ game }) => {
          calls.push(`render:hud:${game?.towerFloor}`);
          return true;
        },
        renderPlayer: ({ game }) => {
          calls.push(`render:player:${game?.player ? 1 : 0}`);
          return true;
        },
        renderSkillRail: ({ game }) => {
          calls.push(`render:skill-rail:${game?.player?.equippedWeapons?.length || 0}`);
          return true;
        },
      },
    },
    renderMetaSink: ({ game, save }) => calls.push(`render-meta:${Boolean(game)}:${save.coins}`),
    spriteAdapters: {
      spriteSystem: {
        drawImage: (id) => calls.push(`sprites:draw-image:${id}`),
        drawSprite: (id) => calls.push(`sprites:draw-sprite:${id}`),
        loadSprites: () => calls.push("sprites:load"),
      },
    },
    storageAdapters: {
      storage,
    },
    uiAdapters: {
      runUi: {
        formatTime: (seconds) => `t:${Math.round(seconds)}`,
        getGameSpeed: () => 1,
        maxEquippedWeapons: () => 6,
        renderDebug: () => calls.push("run-ui:render-debug"),
      },
      shellUi: {
        shellRelicController: {
          render: () => calls.push("shell:relic-render"),
        },
        shellView: {
          render: (state) => calls.push(`shell:render:${state.screen}`),
          setMenuOpen: (open) => calls.push(`shell:menu:${open}`),
          setScreen: (screen) => calls.push(`shell:screen:${screen}`),
        },
      },
      shopSystemAdapter: {
        closeShop: () => calls.push("shop:close"),
      },
      ui: uiSurface,
    },
  };
}

function createFakeRun() {
  return {
    awaitingFirstMoveInput: false,
    bossSpawned: false,
    duration: 150,
    elapsed: 0,
    enemies: [],
    kills: 0,
    laserDamage: 0,
    lastFloorClear: null,
    paused: false,
    player: {
      equippedWeapons: ["spark_bolt"],
      hp: 100,
      level: 1,
      maxHp: 100,
      speed: 200,
      targetX: 480,
      targetY: 270,
      x: 480,
      y: 270,
    },
    running: true,
    towerFloor: 1,
  };
}

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(key) {
      calls.push(`storage:get:${key}`);
      return store.get(key) || null;
    },
    removeItem(key) {
      calls.push(`storage:remove:${key}`);
      store.delete(key);
    },
    setItem(key, value) {
      calls.push(`storage:set:${key}:${String(value).length}`);
      store.set(key, String(value));
    },
  };
}

function createUiProgressionParityDocument() {
  return {
    createdTags: [],
    createElement(tagName) {
      this.createdTags.push(tagName);
      return {
        addEventListener() {},
        className: "",
        disabled: false,
        innerHTML: "",
        textContent: "",
      };
    },
  };
}

function createUiProgressionParityContainer() {
  return {
    children: [],
    innerHTML: "",
    appendChild(child) {
      this.children.push(child);
    },
  };
}

function tapSurvivorGlobalNames() {
  return Object.getOwnPropertyNames(globalThis)
    .filter((name) => name.startsWith("TapSurvivor"))
    .sort();
}

function sameNames(left, right) {
  return left.length === right.length && left.every((name, index) => name === right[index]);
}

function hasTapSurvivorContentGlobalRead(source) {
  return (
    /\b(?:globalThis|window|globalRef)\s*(?:\?\.|\.)\s*TapSurvivorContent\b/u.test(source) ||
    /\b(?:globalThis|window|globalRef)\s*(?:\?\.)?\s*\[\s*["']TapSurvivorContent["']\s*\]/u.test(source)
  );
}

function hasTapSurvivorRelicsGlobalRead(source) {
  return (
    /\b(?:globalThis|window|globalRef)\s*(?:\?\.|\.)\s*TapSurvivorRelics\b/u.test(source) ||
    /\b(?:globalThis|window|globalRef)\s*(?:\?\.)?\s*\[\s*["']TapSurvivorRelics["']\s*\]/u.test(source)
  );
}

function hasTapSurvivorUiProgressionGlobalRead(source) {
  return (
    /\b(?:globalThis|window|globalRef)\s*(?:\?\.|\.)\s*TapSurvivorUiProgression\b/u.test(source) ||
    /\b(?:globalThis|window|globalRef)\s*(?:\?\.)?\s*\[\s*["']TapSurvivorUiProgression["']\s*\]/u.test(source)
  );
}

function installTapSurvivorContentGlobalReadGuard(target, label) {
  const key = "TapSurvivorContent";
  const previous = Object.getOwnPropertyDescriptor(target, key);
  let reads = 0;
  Object.defineProperty(target, key, {
    configurable: true,
    get() {
      reads += 1;
      throw new Error(`Forbidden classic content global read from ${label}`);
    },
  });
  return {
    readAttempts: () => reads,
    restore() {
      if (previous) Object.defineProperty(target, key, previous);
      else delete target[key];
    },
  };
}

function installTapSurvivorRelicsGlobalReadGuard(target, label) {
  const key = "TapSurvivorRelics";
  const previous = Object.getOwnPropertyDescriptor(target, key);
  let reads = 0;
  Object.defineProperty(target, key, {
    configurable: true,
    get() {
      reads += 1;
      throw new Error(`Forbidden classic relic global read from ${label}`);
    },
  });
  return {
    readAttempts: () => reads,
    restore() {
      if (previous) Object.defineProperty(target, key, previous);
      else delete target[key];
    },
  };
}

function installTapSurvivorUiProgressionGlobalReadGuard(target, label) {
  const key = "TapSurvivorUiProgression";
  const previous = Object.getOwnPropertyDescriptor(target, key);
  let reads = 0;
  Object.defineProperty(target, key, {
    configurable: true,
    get() {
      reads += 1;
      throw new Error(`Forbidden classic UI progression global read from ${label}`);
    },
  });
  return {
    readAttempts: () => reads,
    restore() {
      if (previous) Object.defineProperty(target, key, previous);
      else delete target[key];
    },
  };
}

function installAutobootGlobals({ canvas, documentRef, storage }) {
  let rafCount = 0;
  const keys = ["document", "localStorage", "requestAnimationFrame", "addEventListener", "clearTimeout", "setTimeout"];
  const previous = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.defineProperties(globalThis, {
    document: {
      configurable: true,
      value: {
        ...documentRef,
        getElementById(id) {
          return id === "game" ? canvas : null;
        },
        querySelectorAll(selector) {
          return selector === "[data-speed]" ? speedButtons : [];
        },
      },
    },
    localStorage: {
      configurable: true,
      value: storage,
    },
    requestAnimationFrame: {
      configurable: true,
      value(callback) {
        rafCount += 1;
        return runtimeGlobal.requestAnimationFrame(callback);
      },
    },
    addEventListener: {
      configurable: true,
      value: runtimeGlobal.addEventListener.bind(runtimeGlobal),
    },
    clearTimeout: {
      configurable: true,
      value: () => {},
    },
    setTimeout: {
      configurable: true,
      value: () => 1,
    },
  });
  return {
    rafCalls: () => rafCount,
    restore() {
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    },
  };
}

function check(name, pass) {
  if (pass) {
    console.log(`PASS ${name}`);
    return;
  }
  console.error(`FAIL ${name}`);
  process.exitCode = 1;
}
