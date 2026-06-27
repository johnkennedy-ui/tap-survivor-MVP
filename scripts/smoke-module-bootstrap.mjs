import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  composeContentBalanceEffects,
  composeRelicProgression,
  composeRuntime,
  composeSaveSubsystem,
  composeShellRelicPresentation,
  composeShellRelicUiAdapter,
  composeShopEconomy,
  createBrowserPlatform,
} from "../src/app/compose-runtime.js";

const root = new URL("..", import.meta.url).pathname;
const content = JSON.parse(readFileSync(join(root, "content/tap-survivor-content.json"), "utf8"));

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
const shopEconomySave = {
  coins: 100,
  towerFloor: 3,
  shopPurchases: {
    training_boots: 1,
  },
};
const shopEconomy = composeShopEconomy({
  shopItemDefs: contentBalanceEffects.contentRegistry.shopItemDefs,
  getSave: () => shopEconomySave,
  effects: contentBalanceEffects.effects,
});
const relicProgression = composeRelicProgression({
  relicDefs: contentBalanceEffects.contentRegistry.relicDefs,
  weaponDefs: contentBalanceEffects.contentRegistry.weaponDefs,
  effects: contentBalanceEffects.effects,
  random: () => 0,
});
const shellRelicPresentation = composeShellRelicPresentation({
  content,
  relicDefs: relicProgression.relicDefs,
  relicSystem: relicProgression.progression,
});
const trainingBoots = shopEconomy.shopItemDefs.find((item) => item.id === "training_boots");
const coinMagnet = shopEconomy.shopItemDefs.find((item) => item.id === "coin_magnet");
const moveSpeedFocusRelic = relicProgression.relicDefs.find((relic) => relic.id === "move_speed_focus_relic");
const fireRateMasteryRelic = relicProgression.relicDefs.find((relic) => relic.id === "fire_rate_mastery_relic");
const splitOnHitMasteryRelic = relicProgression.relicDefs.find((relic) => relic.id === "split_on_hit_mastery_relic");

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

check(
  "module bootstrap composes content registry from injected content",
  contentBalanceEffects.contentRegistry.weaponDefs.spark_bolt.damage === 12
);
check(
  "module bootstrap exposes starter content group",
  contentBalanceEffects.contentRegistry.starterQuestIds.includes("first_blood")
);
check(
  "module bootstrap composes run upgrade content",
  contentBalanceEffects.contentRegistry.runUpgradeDefs.length === content.runUpgrades.length
);
check(
  "module bootstrap resolves balance floor one deterministically",
  JSON.stringify(contentBalanceEffects.balance.floorDifficulty(1)) ===
    JSON.stringify({ hp: 0.9, damage: 0.85, spawnRate: 0.9 })
);
check(
  "module bootstrap resolves balance floor four scaling",
  JSON.stringify(contentBalanceEffects.balance.floorDifficulty(4)) ===
    JSON.stringify({ hp: 1.53, damage: 1.2799999999999998, spawnRate: 1.1300000000000001 })
);
const effectGame = {
  running: true,
  player: {
    speed: 100,
    pickupRadius: 50,
    hp: 80,
    maxHp: 100,
  },
};
contentBalanceEffects.effects.applyRunUpgradeEffects(effectGame, [
  { type: "playerStatAdd", stat: "speed", value: 10 },
  { type: "playerHeal", value: 50 },
]);
check("module bootstrap applies run upgrade stat effects", effectGame.player.speed === 110);
check("module bootstrap caps run upgrade healing", effectGame.player.hp === 100);
check(
  "module bootstrap composes shop economy from content registry items",
  trainingBoots?.cost?.[0] === 27 && coinMagnet?.cost?.[0] === 21
);
check(
  "module bootstrap calculates shop pricing through module path",
  shopEconomy.pricing.tierFor(trainingBoots) === 1 &&
    shopEconomy.pricing.costFor(trainingBoots, 1) === 51 &&
    shopEconomy.pricing.canBuy(trainingBoots)
);
check(
  "module bootstrap keeps floor-scaled shop pricing deterministic",
  shopEconomy.pricing.costFor(coinMagnet, 0) === 23
);
shopEconomySave.coins = 22;
shopEconomySave.towerFloor = 1;
check(
  "module bootstrap keeps inflated shop pricing deterministic",
  shopEconomy.pricing.costFor(coinMagnet, 0) === 22 && shopEconomy.pricing.canBuy(coinMagnet)
);
const shopBonuses = shopEconomy.effects.emptyShopBonuses();
shopEconomy.effects.addShopItemBonus(shopBonuses, trainingBoots, 2);
check("module bootstrap creates shop bonus defaults", shopBonuses.pickupRadius === 0);
check("module bootstrap adds shop item bonuses", shopBonuses.speed === 20);
check(
  "module bootstrap applies representative shop item effect to run",
  shopEconomy.effects.applyShopItemEffectToRun(effectGame, coinMagnet) &&
    effectGame.player.pickupRadius === 60
);
contentBalanceEffects.effects.applyRelicSpecialEffects(effectGame, {
  maxHpBonus: 10,
  speedBonus: 5,
});
check("module bootstrap applies relic special effects", effectGame.player.maxHp === 110 && effectGame.player.speed === 115);
check(
  "module bootstrap reads relic content through module registry",
  moveSpeedFocusRelic?.targetUpgradeId === "run_move_speed" &&
    fireRateMasteryRelic?.targetUpgradeId === "run_fire_rate" &&
    splitOnHitMasteryRelic?.specialAbility?.modifiers?.maxHpMultiplier === 0.6
);
const relicSave = {
  towerFloor: 20,
  unlockedRelics: ["move_speed_focus_relic", "fire_rate_mastery_relic"],
  equippedRelics: ["move_speed_focus_relic", "fire_rate_mastery_relic"],
};
const relicRunStartTiers = relicProgression.progression.startingRunUpgradeTiers(relicSave);
check(
  "module bootstrap matches relic run-start smoke tier expectations",
  relicRunStartTiers.run_move_speed === 1 && relicRunStartTiers.run_fire_rate === 2
);
check(
  "module bootstrap computes relic progression through module path",
  relicProgression.progression.maxEquippedRelics(relicSave) === 2 &&
    relicProgression.progression.relicBonusFor(relicSave, "run_move_speed", "maxTierBonus") === 1
);
const specialRelicSave = {
  towerFloor: 10,
  unlockedRelics: ["split_on_hit_mastery_relic"],
  equippedRelics: ["split_on_hit_mastery_relic"],
};
const specialRelicEffects = relicProgression.progression.specialEffects(specialRelicSave);
const specialRelicGame = {
  running: true,
  player: {
    speed: 200,
    pickupRadius: 50,
    hp: 100,
    maxHp: 100,
  },
};
relicProgression.effects.applyRelicSpecialEffects(specialRelicGame, specialRelicEffects);
check(
  "module bootstrap applies module relic special effects",
  specialRelicGame.player.maxHp === 160 &&
    specialRelicGame.player.hp === 160 &&
    specialRelicGame.player.speed === 270 &&
    specialRelicGame.player.pickupRadius === 67.5
);
const shellRelicViewModel = shellRelicPresentation.createInventoryViewModel({
  towerFloor: 30,
  unlockedRelics: ["move_speed_focus_relic", "fire_rate_mastery_relic", "split_on_hit_mastery_relic"],
  equippedRelics: ["move_speed_focus_relic", "fire_rate_mastery_relic", "split_on_hit_mastery_relic"],
});
check(
  "module bootstrap builds shell relic presentation model",
  shellRelicViewModel.maxEquippedSlots === 3 &&
    shellRelicViewModel.equippedRelics.some((relic) => relic.id === "move_speed_focus_relic") &&
    shellRelicViewModel.availableRelics.some((relic) => relic.id === "pickup_radius_focus_relic")
);
check(
  "module bootstrap surfaces relic progression in shell model",
  shellRelicViewModel.bonuses.startingRunUpgradeTiers.run_move_speed === 1 &&
    shellRelicViewModel.bonuses.startingRunUpgradeTiers.run_fire_rate === 2 &&
    shellRelicViewModel.bonuses.maxTierBonuses.run_move_speed === 1
);
check(
  "module bootstrap surfaces relic special modifiers in shell model",
  shellRelicViewModel.specialModifiers.some(
    (modifier) => modifier.key === "maxHpMultiplier" && modifier.value === 0.6
  )
);
check(
  "module bootstrap shell relic model is serializable and stable",
  JSON.parse(JSON.stringify(shellRelicViewModel)).summaryRows[0].value === "3/5"
);
const fakeShellRelicRoot = createFakeElement("div");
const shellRelicUiSelections = [];
const shellRelicUiAdapter = composeShellRelicUiAdapter({
  presenter: shellRelicPresentation,
  documentRef: createFakeDocument(),
  root: fakeShellRelicRoot,
  onSelect: (relic) => shellRelicUiSelections.push(relic.id),
  onUnequip: (relic) => shellRelicUiSelections.push(`unequip:${relic.id}`),
});
const shellRelicUiModel = shellRelicUiAdapter.renderShellRelics({
  towerFloor: 30,
  unlockedRelics: ["move_speed_focus_relic", "fire_rate_mastery_relic", "pickup_radius_focus_relic"],
  equippedRelics: ["move_speed_focus_relic", "fire_rate_mastery_relic"],
});
const shellRelicUiText = collectText(fakeShellRelicRoot);
const availablePickupButton = findByDataset(fakeShellRelicRoot, "relicId", "pickup_radius_focus_relic");
availablePickupButton?.eventListeners?.click?.[0]?.();
check(
  "module bootstrap renders shell relic UI adapter summary",
  shellRelicUiModel.maxEquippedSlots === 3 &&
    shellRelicUiText.includes("Relic slots: 3/5") &&
    shellRelicUiText.includes("Move Speed Focus")
);
check(
  "module bootstrap renders shell relic UI adapter available row",
  shellRelicUiText.includes("Pickup Radius Focus") &&
    availablePickupButton?.disabled === false &&
    shellRelicUiSelections.includes("pickup_radius_focus_relic")
);

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

const composeRuntimeSource = readFileSync(join(root, "src/app/compose-runtime.js"), "utf8");
check(
  "module bootstrap shop and relic composition avoids project globals",
  !composeRuntimeSource.includes("globalThis.TapSurvivor")
);
check(
  "module bootstrap composes canonical relic provider",
  composeRuntimeSource.includes('from "../modules/relics.js"') &&
    !composeRuntimeSource.includes('from "../modules/relic-progression.js"')
);
check(
  "module bootstrap composes shell relic presenter without classic globals",
  composeRuntimeSource.includes('from "../modules/shell-relic-presenter.js"') &&
    !composeRuntimeSource.includes("globalThis.TapSurvivorRelics")
);
check(
  "module bootstrap composes shell relic UI adapter without classic globals",
  composeRuntimeSource.includes('from "../modules/shell-relic-ui.js"') &&
    !composeRuntimeSource.includes("globalThis.TapSurvivorShellRelicUi")
);

frameCallback(1234);
check("module bootstrap loop is called by injected animation frame", calls.includes("loop:1234"));

if (process.exitCode) {
  console.error("\nModule bootstrap smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nModule bootstrap smoke passed.");

function createFakeDocument() {
  return {
    createElement: createFakeElement,
  };
}

function createFakeElement(tagName) {
  return {
    tagName,
    children: [],
    className: "",
    dataset: {},
    disabled: false,
    eventListeners: {},
    innerHTML: "",
    textContent: "",
    type: "",
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener(type, handler) {
      this.eventListeners[type] = this.eventListeners[type] || [];
      this.eventListeners[type].push(handler);
    },
    replaceChildren(...children) {
      this.children = children;
    },
  };
}

function collectText(element) {
  return [element.textContent || "", ...element.children.map(collectText)].filter(Boolean).join(" ");
}

function findByDataset(element, key, value) {
  if (element.dataset?.[key] === value) return element;
  for (const child of element.children) {
    const match = findByDataset(child, key, value);
    if (match) return match;
  }
  return null;
}
