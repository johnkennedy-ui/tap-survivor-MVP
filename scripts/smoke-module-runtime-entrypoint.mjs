import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createModuleRuntimeTestEntrypoint } from "../src/app/module-runtime-test-entrypoint.js";
import { createBrowserPlatform } from "../src/app/compose-runtime.js";
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

const root = new URL("..", import.meta.url).pathname;
const content = JSON.parse(readFileSync(join(root, "content/tap-survivor-content.json"), "utf8"));
const entrypointSource = readFileSync(join(root, "src/app/module-runtime-test-entrypoint.js"), "utf8");
const fixtureHtml = readFileSync(join(root, "tests/fixtures/module-runtime-test-entrypoint.html"), "utf8");
const moduleDependencySource = readFileSync(join(root, "src/modules/module-game-dependencies.js"), "utf8");
const platformAdapterSource = readFileSync(
  join(root, "src/modules/module-runtime-platform-adapter.js"),
  "utf8"
);
const stateStoreSource = readFileSync(join(root, "src/modules/game-state-store.js"), "utf8");
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
  "module runtime test entrypoint imports module-native dependency bag",
  entrypointSource.includes("../modules/module-game-dependencies.js")
);
check(
  "module runtime test entrypoint has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(entrypointSource)
);
check(
  "module-native dependency bag has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(moduleDependencySource)
);
check(
  "module-native state store has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(stateStoreSource)
);
check(
  "module runtime platform adapter has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(platformAdapterSource)
);
check(
  "module runtime test fixture has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(fixtureHtml)
);

const initialSave = {
  coins: 14.8,
  towerFloor: 0,
  unlockedWeapons: [],
  shopPurchases: {
    missing_item: 4,
  },
};
const initialGame = {
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
const storageAdapter = createMemoryStorageAdapter();
storageAdapter.store.set("tap-survivor-mvp-save-v2", JSON.stringify(initialSave));

const entrypoint = createModuleRuntimeTestEntrypoint({
  autoInitialize: true,
  platform: createBrowserPlatform({ globalRef: runtimeGlobal, documentRef }),
  dependencyBagOptions: {
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
    saveConfig: {
      saveKey: "tap-survivor-mvp-save-v2",
      legacySaveKey: "tap-survivor-mvp-save-v1",
      storageAdapter,
      questOpenIds: (quest) => quest?.opens || [],
    },
    adapters: {
      initialGame,
      initialSave,
      platformAdapters: {
        canvas,
        ui: {
          speedButtons,
          levelUp: { classList: { add: () => calls.push("level-up:hidden") } },
        },
        shellUiAdapter: {
          bind: () => calls.push("shell:bind"),
          closeRunMenu: () => calls.push("shell:close-run-menu"),
          showTitleScreen: () => calls.push("shell:title"),
        },
        shopSystemAdapter: {
          closeShop: () => calls.push("shop:close"),
        },
        runUiAdapter: {
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
        loop: () => calls.push("loop"),
      },
      renderMetaSink: ({ game, save }) => {
        calls.push(`render-meta:${Boolean(game)}:${save.coins}`);
      },
    },
  },
});

const dependencySlots = entrypoint.dependencies.moduleSystems;
const stateStore = dependencySlots.gameStateStore;
check(
  "module runtime test entrypoint uses module-native dependency bag path",
  Boolean(dependencySlots?.contentRegistry?.weaponDefs?.spark_bolt) &&
    typeof dependencySlots?.effects?.applyShopItemEffectToRun === "function"
);
check(
  "module-native dependency bag exposes expected module-native slot inventory",
  MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("contentRegistry") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("gameStateStore") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("gameRuntime") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("runUpdate")
);
check(
  "module-native state store owns state persistence slot inventory",
  MODULE_NATIVE_STATE_PERSISTENCE_SLOTS.includes("getGame") &&
    MODULE_NATIVE_STATE_PERSISTENCE_SLOTS.includes("persist") &&
    MODULE_NATIVE_STATE_PERSISTENCE_SLOTS.includes("renderMeta")
);
check(
  "module-native state store keeps storage backend injected",
  INJECTED_STATE_PERSISTENCE_SLOTS.includes("storageAdapter")
);
check(
  "module runtime platform adapter owns movement input proof slot",
  MODULE_RUNTIME_PLATFORM_ADAPTER_PROOF_SLOTS.includes("bindMovementInput") &&
    MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS.includes("bindMovementInput")
);
check(
  "module runtime platform adapter owns all current runtime adapter slots",
  MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS.includes("canvas") &&
    MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS.includes("shellUiAdapter") &&
    MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS.includes("bannerSystem")
);
check(
  "module-native dependency bag reclassifies state adapters into module state store",
  !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("getGame") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("persist") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("bindMovementInput") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("shellUiAdapter") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("platformAdapters") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("renderMetaSink") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("storageAdapter")
);
check(
  "module-native dependency bag keeps classic-only slots explicit",
  CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("audio") &&
    CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("rendering")
);
check(
  "module-native state store normalizes initial save through canonical save modules",
  stateStore.getSave().coins === 14 &&
    stateStore.getSave().towerFloor === 1 &&
    stateStore.getSave().unlockedWeapons.includes("spark_bolt") &&
    Object.keys(stateStore.getSave().shopPurchases).length === 0
);

entrypoint.runtime.setGameSpeed(5);
canvas.listeners.get("mousedown")({ clientX: 640, clientY: 270 });
const afterTapGlobals = tapSurvivorGlobalNames();

const replacedGame = {
  running: true,
  paused: false,
  awaitingFirstMoveInput: false,
  player: { targetX: 5, targetY: 6 },
};
entrypoint.dependencies.setGame(replacedGame);
entrypoint.dependencies.setSave({ coins: 3.9, towerFloor: 0, unlockedWeapons: [] });
entrypoint.dependencies.persist();
entrypoint.dependencies.renderMeta();

check("module runtime test entrypoint initializes runtime", calls.includes("shell:bind") && calls.includes("raf"));
check("module runtime test entrypoint wires input without classic globals", calls.includes("input:bind"));
check("module runtime test entrypoint updates speed through injected document", documentRef.body.dataset.gameSpeed === "5");
check(
  "module runtime test entrypoint clears movement gate through injected canvas",
  initialGame.awaitingFirstMoveInput === false && calls.includes("banner:hide-movement-gate")
);
check(
  "module runtime test entrypoint getGame setGame route through state store",
  entrypoint.dependencies.getGame() === replacedGame && stateStore.getGame() === replacedGame
);
check(
  "module runtime test entrypoint getSave setSave route through state store",
  entrypoint.dependencies.getSave().coins === 3 &&
    entrypoint.dependencies.getSave().towerFloor === 1 &&
    stateStore.getSave() === entrypoint.dependencies.getSave()
);
check(
  "module runtime test entrypoint persist writes through injected storage backend",
  JSON.parse(storageAdapter.store.get("tap-survivor-mvp-save-v2")).coins === 3
);
check(
  "module runtime test entrypoint renderMeta reads state through injected sink",
  calls.includes("render-meta:true:3")
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

function createMemoryStorageAdapter() {
  const store = new Map();
  return {
    store,
    getSaveRaw: () => store.get("tap-survivor-mvp-save-v2") || null,
    removeSaveRaw: () => store.delete("tap-survivor-mvp-save-v2"),
    setSaveRaw: (value) => {
      store.set("tap-survivor-mvp-save-v2", String(value));
      return true;
    },
  };
}
