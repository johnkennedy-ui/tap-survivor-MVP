import {
  composeRuntime,
  composeSaveSubsystem,
  createBrowserPlatform,
} from "../src/app/compose-runtime.js";

const calls = [];
const listeners = new Map();
const documentListeners = new Map();
let frameCallback = null;
let currentGame = {
  running: true,
  paused: false,
  awaitingFirstMoveInput: true,
  player: {
    targetX: 0,
    targetY: 0,
  },
};
let currentSave = { coins: 12 };
const saveKey = "tap-survivor-mvp-save-v2";
const legacySaveKey = "tap-survivor-mvp-save-v1";
const corruptBackupKey = `${saveKey}-corrupt-backup`;

const canvas = {
  width: 960,
  height: 540,
  addEventListener(type, handler) {
    listeners.set(type, handler);
    calls.push(`canvas:${type}`);
  },
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 960, height: 540 };
  },
};
const speedButtons = [1, 2, 5].map((speed) => ({
  dataset: { speed: String(speed) },
  classList: {
    toggle(name, active) {
      calls.push(`speed:${speed}:${name}:${active}`);
    },
  },
  setAttribute(name, value) {
    calls.push(`speed:${speed}:${name}:${value}`);
  },
}));
const documentRef = {
  body: { dataset: {} },
  visibilityState: "visible",
  addEventListener(type, handler) {
    documentListeners.set(type, handler);
    calls.push(`document:${type}`);
  },
};
const globalRef = {
  requestAnimationFrame(callback) {
    frameCallback = callback;
    calls.push("raf");
    return 1;
  },
  addEventListener(type, handler) {
    listeners.set(type, handler);
    calls.push(`global:${type}`);
  },
  Capacitor: {
    Plugins: {
      App: {
        addListener(type, handler) {
          listeners.set(`capacitor:${type}`, handler);
          calls.push(`capacitor:${type}`);
          return { catch() {} };
        },
      },
    },
  },
};

const platform = createBrowserPlatform({ globalRef, documentRef });
const saveStorage = createMemoryStorageAdapter({
  saveKey,
  legacySaveKey,
  corruptBackupKey,
});
const saveSystem = composeSaveSubsystem({
  saveKey,
  legacySaveKey,
  storageAdapter: saveStorage,
  starterQuestIds: ["starter_quest"],
  questDefs: {
    starter_quest: {},
    gatherer: { opens: ["rapid_growth"] },
    rapid_growth: {},
    use_laser_run: {},
    laser_damage_5000: {},
  },
  weaponUnlocks: [{ id: "unlock_laser", weaponId: "laser", opensQuest: "use_laser_run" }],
  upgradeDefs: [{ id: "laser_damage", opensQuest: "laser_damage_5000" }],
  shopItemDefs: [{ id: "training_boots", maxTier: 3 }],
  questOpenIds: (quest) => quest?.opens || [],
});

saveStorage.store.set(
  legacySaveKey,
  JSON.stringify({
    saveVersion: 1,
    coins: 12.8,
    unlockedWeapons: [],
    completedQuests: ["gatherer"],
    unlockedNodes: ["unlock_laser"],
    unlockedUpgrades: ["laser_damage"],
    shopPurchases: {
      training_boots: 99,
      missing_item: 2,
    },
  })
);

const dependencies = {
  canvas,
  ui: {
    speedButtons,
    levelUp: {
      classList: {
        add(name) {
          calls.push(`level-up:add:${name}`);
        },
      },
    },
  },
  getGame: () => currentGame,
  setGame: (game) => {
    currentGame = game;
    calls.push("setGame");
  },
  getSave: () => currentSave,
  setSave: (save) => {
    currentSave = save;
    calls.push("setSave");
  },
  saveSystem,
  shellUi: {
    bind: () => calls.push("shell:bind"),
    closeRunMenu: () => calls.push("shell:closeRunMenu"),
    showTitleScreen: () => calls.push("shell:showTitleScreen"),
  },
  shopSystem: {
    closeShop: () => calls.push("shop:close"),
  },
  runUi: {
    updateRunHud: () => calls.push("runHud:update"),
    hideEndScreen: () => calls.push("runHud:hideEnd"),
  },
  debugSystem: {
    bind: () => calls.push("debug:bind"),
  },
  spriteSystem: {
    loadSprites: () => calls.push("sprites:load"),
  },
  bannerSystem: {
    hideMovementGateBanner: () => calls.push("banner:hideMovementGate"),
  },
  bindMovementInput: ({ canvas: inputCanvas, getGame }) => {
    if (inputCanvas !== canvas || getGame() !== currentGame) {
      throw new Error("Module bootstrap passed incorrect movement input dependencies");
    }
    calls.push("input:bind");
  },
  persist: () => {
    calls.push("persist");
    return saveSystem.persist(currentSave);
  },
  renderMeta: () => calls.push("renderMeta"),
  loop: (now) => calls.push(`loop:${now}`),
};

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

function createMemoryStorageAdapter({ saveKey, legacySaveKey, corruptBackupKey }) {
  const store = new Map();
  return {
    store,
    getSaveRaw() {
      return store.get(saveKey) || store.get(legacySaveKey) || null;
    },
    setSaveRaw(value) {
      store.set(saveKey, value);
      return true;
    },
    removeSaveRaw() {
      store.delete(saveKey);
      store.delete(legacySaveKey);
      return true;
    },
    setCorruptBackupRaw(value) {
      store.set(corruptBackupKey, value);
      return true;
    },
  };
}

const runtime = composeRuntime({ platform, dependencies });
runtime.initializeRuntime();

check("module bootstrap loads save through real save subsystem", currentSave.coins === 12);
check("module bootstrap migrates save to current version", currentSave.saveVersion === 3);
check("module bootstrap clamps save shop purchases", currentSave.shopPurchases.training_boots === 3);
check("module bootstrap removes unknown shop purchases", currentSave.shopPurchases.missing_item === undefined);
check("module bootstrap opens starter quest", currentSave.activeQuests.includes("starter_quest"));
check("module bootstrap reopens completed quest follow-up", currentSave.activeQuests.includes("rapid_growth"));
check("module bootstrap reopens unlock quest", currentSave.activeQuests.includes("use_laser_run"));
check("module bootstrap converts unlocked upgrades to tiers", currentSave.upgradeTiers.laser_damage === 1);
check("module bootstrap reopens upgrade quest", currentSave.activeQuests.includes("laser_damage_5000"));
check(
  "module bootstrap binds shell/debug/input",
  calls.includes("shell:bind") && calls.includes("debug:bind") && calls.includes("input:bind")
);
check(
  "module bootstrap schedules animation frame through platform",
  calls.includes("raf") && typeof frameCallback === "function"
);
check(
  "module bootstrap sets initial speed through injected document",
  documentRef.body.dataset.gameSpeed === "1"
);

runtime.setGameSpeed(5);
check(
  "module bootstrap speed control stays inside injected platform",
  documentRef.body.dataset.gameSpeed === "5"
);

listeners.get("mousedown")({ clientX: 480, clientY: 270 });
check("module bootstrap movement gate uses injected canvas", currentGame.awaitingFirstMoveInput === false);
check(
  "module bootstrap movement gate updates player target",
  currentGame.player.targetX === 480 && currentGame.player.targetY === 270
);

documentRef.visibilityState = "hidden";
documentListeners.get("visibilitychange")?.();
listeners.get("pagehide")?.();
listeners.get("beforeunload")?.();
listeners.get("capacitor:appStateChange")?.({ isActive: false });
check(
  "module bootstrap lifecycle flushes through injected platform",
  calls.filter((call) => call === "persist").length === 4
);
const persisted = JSON.parse(saveStorage.store.get(saveKey));
check("module bootstrap persists through in-memory storage", persisted.coins === 12);
check("module bootstrap persistence keeps upgrade list", persisted.unlockedUpgrades.includes("laser_damage"));

saveStorage.store.set(saveKey, "{broken json");
const corruptSave = saveSystem.loadSave();
check("module bootstrap corrupt save defaults safely", corruptSave.unlockedWeapons.includes("spark_bolt"));
check("module bootstrap corrupt save warning is exposed", saveSystem.getLastLoadWarning() === "corrupt-save");
check("module bootstrap corrupt raw is backed up", saveStorage.store.get(corruptBackupKey) === "{broken json");

runtime.resetSave();
check(
  "module bootstrap reset uses injected UI/save dependencies",
  currentSave.coins === 0 && currentGame === null
);
const resetPersisted = JSON.parse(saveStorage.store.get(saveKey));
check("module bootstrap reset persists default save", resetPersisted.coins === 0);
check("module bootstrap reset removes legacy save key", !saveStorage.store.has(legacySaveKey));

frameCallback(1234);
check("module bootstrap loop is called by injected animation frame", calls.includes("loop:1234"));

if (process.exitCode) {
  console.error("\nModule bootstrap smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nModule bootstrap smoke passed.");
