import { readFileSync } from "node:fs";
import { join } from "node:path";

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
import { createModuleRuntimeStorageAdapter } from "../src/modules/module-runtime-storage-adapter.js";
import { createShellRelicUi as createClassicShellRelicUi } from "../src/modules/shell-relic-ui.js";

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

const receiverStorage = {
  store: new Map([[saveKey, "receiver-seed"]]),
  getItem(key) {
    if (this !== receiverStorage) throw new Error("storage receiver was not preserved");
    return this.store.get(key) ?? null;
  },
  setItem(key, value) {
    if (this !== receiverStorage) throw new Error("storage receiver was not preserved");
    this.store.set(key, String(value));
  },
  removeItem(key) {
    if (this !== receiverStorage) throw new Error("storage receiver was not preserved");
    this.store.delete(key);
  },
};
const receiverStorageAdapter = createModuleRuntimeStorageAdapter({
  storage: receiverStorage,
  saveKey,
  legacySaveKey,
  corruptBackupKey,
});
check(
  "module storage adapter reads receiver-sensitive storage",
  receiverStorageAdapter.storageAdapter.getSaveRaw() === "receiver-seed"
);
receiverStorageAdapter.storageAdapter.setSaveRaw("receiver-written");
check(
  "module storage adapter writes through receiver-sensitive storage",
  receiverStorage.store.get(saveKey) === "receiver-written"
);
receiverStorageAdapter.storageAdapter.removeSaveRaw();
check(
  "module storage adapter removes through receiver-sensitive storage",
  !receiverStorage.store.has(saveKey)
);

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
  relicProgression.progression.maxEquippedRelics(relicSave) === 3 &&
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
  shellRelicViewModel.maxEquippedSlots === 4 &&
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
  JSON.parse(JSON.stringify(shellRelicViewModel)).summaryRows[0].value === "4/6"
);
const sixSlotRelicIds = relicProgression.relicDefs.slice(0, 6).map((relic) => relic.id);
const sixSlotRelicViewModel = shellRelicPresentation.createInventoryViewModel({
  towerFloor: 50,
  unlockedRelics: sixSlotRelicIds,
  equippedRelics: sixSlotRelicIds,
});
check(
  "module bootstrap presents six relic slots at level 50",
  sixSlotRelicViewModel.maxEquippedSlots === 6 &&
    sixSlotRelicViewModel.slots.length === 6 &&
    sixSlotRelicViewModel.slots[5].unlockLevel === 50 &&
    sixSlotRelicViewModel.summaryRows[0].value === "6/6"
);
const fakeShellRelicRoot = createFakeElement("div");
const shellRelicUiSelections = [];
const shellRelicUiEquips = [];
const shellRelicUiLockedSelections = [];
const shellRelicUiPersists = [];
const shellRelicUiMetaRenders = [];
const shellRelicPreviewCanvases = [];
const shellRelicPreviewDraws = [];
const shellRelicPreviewTransparency = [];
const shellRelicPreviewImages = [];
const shellRelicUiSave = {
  towerFloor: 40,
  unlockedRelics: [
    "move_speed_focus_relic",
    "fire_rate_mastery_relic",
    "pickup_radius_focus_relic",
    "split_on_hit_mastery_relic",
  ],
  equippedRelics: ["move_speed_focus_relic", "fire_rate_mastery_relic", "split_on_hit_mastery_relic"],
};
const fakeLockScheduler = createFakeScheduler();
const shellRelicUiAdapter = composeShellRelicUiAdapter({
  presenter: shellRelicPresentation,
  documentRef: createFakeDocument(),
  root: fakeShellRelicRoot,
  getSave: () => shellRelicUiSave,
  relicSystem: relicProgression.progression,
  persist: (save) => shellRelicUiPersists.push([...save.equippedRelics]),
  renderMeta: (save) => shellRelicUiMetaRenders.push([...save.equippedRelics]),
  scheduler: fakeLockScheduler,
  lockPopupDelayMs: 1800,
  previewAdapter: {
    runUpgradeSprite: (upgradeId) => content.assets.sprites.runUpgrades[upgradeId],
    spriteSource: (sprite) => sprite?.src || "",
    createCanvas({ className, height, width }) {
      const canvas = createFakeElement("canvas");
      canvas.className = className;
      canvas.width = width;
      canvas.height = height;
      shellRelicPreviewCanvases.push(canvas);
      return canvas;
    },
    getContext(canvas) {
      return canvas.context;
    },
    createImage({ source }) {
      const image = createFakeImage();
      shellRelicPreviewImages.push(image);
      image.expectedSource = source;
      return image;
    },
    clearFrame({ canvas, context }) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    },
    drawFrame({ canvas, context, frame, image }) {
      shellRelicPreviewDraws.push({ frame, height: canvas.height, imageSource: image.src, width: canvas.width });
      context.drawImage(image, frame.x, frame.y, frame.width, frame.height, 0, 0, canvas.width, canvas.height);
    },
    applyTransparency({ sprite }) {
      shellRelicPreviewTransparency.push(sprite.transparentTolerance);
    },
  },
  onEquip: (relic) => shellRelicUiEquips.push(relic.id),
  onSelect: (relic) => shellRelicUiSelections.push(relic.id),
  onUnequip: (relic) => shellRelicUiSelections.push(`unequip:${relic.id}`),
  onLockedSelect: (relic) => shellRelicUiLockedSelections.push(relic.id),
});
const shellRelicUiModel = shellRelicUiAdapter.renderShellRelics(shellRelicUiSave, {
  selectedRelicId: "pickup_radius_focus_relic",
});
const shellRelicUiText = collectText(fakeShellRelicRoot);
const animatedPreviewCanvas = findFirst(fakeShellRelicRoot, (element) =>
  element.className.includes("relic-detail-canvas")
);
const availablePickupButton = findByDataset(fakeShellRelicRoot, "relicId", "pickup_radius_focus_relic");
const equippedMoveSpeedSlot = findByDataset(fakeShellRelicRoot, "relicId", "move_speed_focus_relic");
const lockedRelicButton = findFirst(fakeShellRelicRoot, (element) => element.dataset?.unlocked === "false");
const equipPickupButton = findByDataset(fakeShellRelicRoot, "action", "equip");
const unequipMoveSpeedButton = findByDataset(equippedMoveSpeedSlot, "action", "unequip");
availablePickupButton?.eventListeners?.click?.[0]?.();
lockedRelicButton?.eventListeners?.click?.[0]?.();
const lockPopup = findFirst(fakeShellRelicRoot, (element) => element.className.includes("relic-lock-popup"));
lockedRelicButton?.eventListeners?.click?.[0]?.();
fakeLockScheduler.runLatest();
const lockPopupHiddenAfterTimer = lockPopup?.className.includes("hidden");
lockedRelicButton?.eventListeners?.click?.[0]?.();
equipPickupButton?.eventListeners?.click?.[0]?.();
unequipMoveSpeedButton?.eventListeners?.click?.[0]?.();
shellRelicUiAdapter.dispose();
check(
  "module bootstrap renders shell relic UI adapter summary",
  shellRelicUiModel.maxEquippedSlots === 5 &&
    shellRelicUiText.includes("Relic slots: 5/6") &&
    shellRelicUiText.includes("Next slot: Tower level 50") &&
    shellRelicUiText.includes("Can equip more: Yes")
);
check(
  "module bootstrap renders shell relic UI adapter equipped and available rows",
  equippedMoveSpeedSlot?.className.includes("equipped") &&
  shellRelicUiText.includes("Pickup Radius Focus") &&
    availablePickupButton?.className.includes("available") &&
    shellRelicUiSelections.includes("pickup_radius_focus_relic")
);
check(
  "module bootstrap renders shell relic UI adapter locked and selected states",
  lockedRelicButton?.className.includes("locked") &&
    collectText(lockedRelicButton).includes("Locked") &&
    availablePickupButton?.className.includes("selected") &&
    shellRelicUiLockedSelections.length === 3
);
check(
  "module bootstrap renders shell relic animated preview through injected adapter",
  animatedPreviewCanvas?.tagName === "canvas" &&
    animatedPreviewCanvas.width === 112 &&
    animatedPreviewCanvas.height === 112 &&
    shellRelicPreviewImages[0]?.src === content.assets.sprites.runUpgrades.run_pickup_radius.src &&
    shellRelicPreviewDraws[0]?.frame.x === 0 &&
    shellRelicPreviewDraws[0]?.width === 112 &&
    shellRelicPreviewTransparency[0] === 58 &&
    fakeLockScheduler.timers[0]?.delay === 100
);
check(
  "module bootstrap renders shell relic UI lock popup with fake scheduler",
  lockPopup?.textContent === "Locked, play more to unlock this skill." &&
    lockPopupHiddenAfterTimer === true &&
    fakeLockScheduler.timers.length === 4 &&
    fakeLockScheduler.timers[0].cleared === true &&
    fakeLockScheduler.timers[1].cleared === true &&
    fakeLockScheduler.timers[2].delay === 1800 &&
    fakeLockScheduler.timers[3].cleared === true &&
    fakeLockScheduler.clearedAfterDispose === true
);
check(
  "module bootstrap renders shell relic UI adapter bonuses and special modifiers",
  shellRelicUiText.includes("Run-start bonuses: run_fire_rate +2") &&
    shellRelicUiText.includes("Max-tier bonuses: run_move_speed +1") &&
    shellRelicUiText.includes("Special modifier: maxHpMultiplier +0.6")
);
check(
  "module bootstrap renders shell relic UI adapter detail actions",
  shellRelicUiText.includes("Selected relic") &&
    shellRelicUiText.includes("Linked skill: Pickup Radius") &&
    equipPickupButton?.disabled === false &&
    shellRelicUiEquips.includes("pickup_radius_focus_relic") &&
    shellRelicUiSelections.includes("unequip:move_speed_focus_relic")
);
check(
  "module bootstrap applies shell relic UI side effects through injected dependencies",
  shellRelicUiSave.equippedRelics.includes("pickup_radius_focus_relic") &&
    !shellRelicUiSave.equippedRelics.includes("move_speed_focus_relic") &&
    shellRelicUiPersists.length === 2 &&
    shellRelicUiMetaRenders.length === 2
);
const nativeQuestCacheRoot = createFakeElement("div");
const nativeQuestCacheSave = {
  coins: 3,
  equippedRelics: [],
  questPoints: 1,
  towerFloor: 5,
  unlockedRelics: [],
};
const nativeQuestCachePersists = [];
const nativeQuestCacheMetaRenders = [];
const nativeQuestCacheAdapter = composeShellRelicUiAdapter({
  presenter: shellRelicPresentation,
  documentRef: createFakeDocument(),
  root: nativeQuestCacheRoot,
  getSave: () => nativeQuestCacheSave,
  relicSystem: relicProgression.progression,
  persist: (save) => nativeQuestCachePersists.push(save.questPoints),
  renderMeta: (save) => nativeQuestCacheMetaRenders.push(save.coins),
});
nativeQuestCacheAdapter.renderShellRelics(nativeQuestCacheSave);
const nativeQuestCacheButton = findByDataset(nativeQuestCacheRoot, "action", "claim-quest-cache");
nativeQuestCacheButton?.eventListeners?.click?.[0]?.();
const nativeQuestCacheDisabledButton = findByDataset(nativeQuestCacheRoot, "action", "claim-quest-cache");
nativeQuestCacheAdapter.dispose();
check(
  "module bootstrap renders and invokes the native Quest Cache action",
  collectText(nativeQuestCacheRoot).includes("Quest Cache") &&
    nativeQuestCacheButton?.dataset.cost === "1" &&
    nativeQuestCacheButton?.disabled === false &&
    nativeQuestCacheSave.questPoints === 0 &&
    nativeQuestCacheSave.unlockedRelics.length === 1 &&
    nativeQuestCacheSave.equippedRelics.length === 1 &&
    nativeQuestCachePersists.length === 1 &&
    nativeQuestCacheMetaRenders.length === 1 &&
    nativeQuestCacheDisabledButton?.disabled === true
);
const classicQuestCacheUi = {
  menuRelicInventory: createFakeElement("div"),
  menuRelicSlots: createFakeElement("div"),
};
const classicQuestCacheSave = {
  coins: 3,
  equippedRelics: [],
  questPoints: 1,
  towerFloor: 5,
  unlockedRelics: [],
};
const classicQuestCachePersists = [];
let classicQuestCacheMetaRenders = 0;
const classicQuestCacheController = createClassicShellRelicUi({
  assetResolver: {
    relicIcon: (relic) => relic.iconPath || relic.id,
    runUpgradeSprite: () => null,
    spriteSource: () => "",
  },
  content,
  documentRef: createFakeDocument(),
  getSave: () => classicQuestCacheSave,
  imageFactory: () => null,
  persist: (save) => {
    classicQuestCachePersists.push(save);
  },
  relicDefs: relicProgression.relicDefs,
  relicSystem: relicProgression.progression,
  renderMeta: () => {
    classicQuestCacheMetaRenders += 1;
  },
  ui: classicQuestCacheUi,
});
classicQuestCacheController.renderInventory();
const classicQuestCacheButton = findByDataset(
  classicQuestCacheUi.menuRelicInventory,
  "action",
  "claim-quest-cache"
);
classicQuestCacheButton?.eventListeners?.click?.[0]?.();
const classicQuestCachePersisted = classicQuestCachePersists.at(-1);
const classicQuestCacheDisabledButton = findByDataset(
  classicQuestCacheUi.menuRelicInventory.children.at(-2),
  "action",
  "claim-quest-cache"
);
check(
  "module bootstrap renders and invokes the classic Quest Cache action",
  collectText(classicQuestCacheUi.menuRelicInventory).includes("Quest Cache") &&
    classicQuestCacheButton?.dataset.cost === "1" &&
    classicQuestCacheButton?.disabled === false &&
    classicQuestCacheSave.questPoints === 0 &&
    classicQuestCacheSave.unlockedRelics.length === 1 &&
    classicQuestCacheSave.equippedRelics.length === 1 &&
    classicQuestCachePersists.length === 1 &&
    classicQuestCachePersisted === classicQuestCacheSave &&
    classicQuestCachePersisted?.questPoints === 0 &&
    classicQuestCachePersisted?.unlockedRelics.length === 1 &&
    classicQuestCachePersisted?.equippedRelics.length === 1 &&
    classicQuestCacheMetaRenders === 1 &&
    classicQuestCacheDisabledButton?.disabled === true
);
const fakeShellRelicOwnerRoot = createFakeElement("div");
const shellRelicOwnerScheduler = createFakeScheduler();
const shellRelicOwnerSelections = [];
const shellRelicOwnerEquips = [];
const shellRelicOwnerUnequips = [];
const shellRelicOwnerPersists = [];
const shellRelicOwnerMetaRenders = [];
const shellRelicOwnerPreviewCanvases = [];
const shellRelicOwnerPreviewDraws = [];
const shellRelicOwnerImages = [];
const shellRelicOwnerSave = {
  towerFloor: 40,
  unlockedRelics: [
    "move_speed_focus_relic",
    "fire_rate_mastery_relic",
    "pickup_radius_focus_relic",
    "split_on_hit_mastery_relic",
  ],
  equippedRelics: ["move_speed_focus_relic", "fire_rate_mastery_relic", "split_on_hit_mastery_relic"],
};
const shellRelicOwner = composeShellRelicController({
  presenter: shellRelicPresentation,
  documentRef: createFakeDocument(),
  root: fakeShellRelicOwnerRoot,
  getSave: () => shellRelicOwnerSave,
  relicSystem: relicProgression.progression,
  persist: (save) => shellRelicOwnerPersists.push([...save.equippedRelics]),
  renderMeta: (save) => shellRelicOwnerMetaRenders.push([...save.equippedRelics]),
  scheduler: shellRelicOwnerScheduler,
  lockPopupDelayMs: 1800,
  previewAdapter: {
    runUpgradeSprite: (upgradeId) => content.assets.sprites.runUpgrades[upgradeId],
    spriteSource: (sprite) => sprite?.src || "",
    createCanvas({ className, height, width }) {
      const canvas = createFakeElement("canvas");
      canvas.className = className;
      canvas.width = width;
      canvas.height = height;
      shellRelicOwnerPreviewCanvases.push(canvas);
      return canvas;
    },
    getContext(canvas) {
      return canvas.context;
    },
    createImage({ source }) {
      const image = createFakeImage();
      shellRelicOwnerImages.push(image);
      image.expectedSource = source;
      return image;
    },
    drawFrame({ canvas, frame, image }) {
      shellRelicOwnerPreviewDraws.push({ frame, imageSource: image.src, width: canvas.width });
    },
  },
  onEquip: (relic) => shellRelicOwnerEquips.push(relic.id),
  onSelect: (relic) => shellRelicOwnerSelections.push(relic?.id || "none"),
  onUnequip: (relic) => shellRelicOwnerUnequips.push(relic.id),
});
const shellRelicOwnerInitialModel = shellRelicOwner.render();
const shellRelicOwnerInitialText = collectText(fakeShellRelicOwnerRoot);
const ownerAvailablePickupButton = findByDataset(
  fakeShellRelicOwnerRoot,
  "relicId",
  "pickup_radius_focus_relic"
);
ownerAvailablePickupButton?.eventListeners?.click?.[0]?.();
const shellRelicOwnerSelectedText = collectText(fakeShellRelicOwnerRoot);
const ownerEquipPickupButton = findByDataset(fakeShellRelicOwnerRoot, "action", "equip");
const firstOwnerPreviewTimer = shellRelicOwnerScheduler.timers[0];
ownerEquipPickupButton?.eventListeners?.click?.[0]?.();
const ownerEquippedPickupSlot = findByDataset(fakeShellRelicOwnerRoot, "relicId", "pickup_radius_focus_relic");
const ownerUnequipPickupButton = findByDataset(ownerEquippedPickupSlot, "action", "unequip");
ownerUnequipPickupButton?.eventListeners?.click?.[0]?.();
const shellRelicOwnerUpdatedModel = shellRelicOwner.update({ ...shellRelicOwnerSave, towerFloor: 50 });
shellRelicOwner.selectRelic("pickup_radius_focus_relic");
shellRelicOwner.dispose();
check(
  "module bootstrap composes shell relic owner through module path",
  shellRelicOwnerInitialModel.maxEquippedSlots === 5 &&
    shellRelicOwnerInitialText.includes("Relic slots: 5/6") &&
    typeof shellRelicOwner.render === "function" &&
    typeof shellRelicOwner.update === "function" &&
    typeof shellRelicOwner.selectRelic === "function" &&
    typeof shellRelicOwner.dispose === "function"
);
check(
  "module bootstrap shell relic owner renders and updates deterministically",
  shellRelicOwnerSelectedText.includes("Selected relic") &&
    shellRelicOwnerSelectedText.includes("Pickup Radius Focus") &&
    shellRelicOwnerUpdatedModel.maxEquippedSlots === 6
);
check(
  "module bootstrap shell relic owner forwards adapter actions",
  shellRelicOwnerSelections.includes("pickup_radius_focus_relic") &&
    shellRelicOwnerEquips.includes("pickup_radius_focus_relic") &&
    shellRelicOwnerUnequips.includes("pickup_radius_focus_relic") &&
    shellRelicOwnerPersists.length === 2 &&
    shellRelicOwnerMetaRenders.length === 2
);
check(
  "module bootstrap shell relic owner owns preview and scheduler cleanup",
  shellRelicOwnerPreviewCanvases[0]?.width === 112 &&
    shellRelicOwnerImages[0]?.src === content.assets.sprites.runUpgrades.run_pickup_radius.src &&
    shellRelicOwnerPreviewDraws[0]?.frame.x === 0 &&
    firstOwnerPreviewTimer?.delay === 100 &&
    firstOwnerPreviewTimer?.cleared === true &&
    shellRelicOwnerScheduler.timers.at(-1)?.cleared === true
);
const shellUiOwnerCalls = [];
const shellUiRelicOwnerCalls = [];
const shellUiOwnerSave = { ...shellRelicOwnerSave, towerFloor: 50 };
const shellUiOwner = composeShellUiController({
  shellRelicController: {
    dispose: () => shellUiRelicOwnerCalls.push("relic:dispose"),
    render: (save) => shellUiRelicOwnerCalls.push(`relic:render:${save.towerFloor}`),
    selectRelic: (relicId) => shellUiRelicOwnerCalls.push(`relic:select:${relicId}`),
    update: (save) => shellUiRelicOwnerCalls.push(`relic:update:${save.towerFloor}`),
  },
  getSave: () => shellUiOwnerSave,
  shellView: {
    dispose: (state) => shellUiOwnerCalls.push(`view:dispose:${state.disposed}`),
    render: (state) => shellUiOwnerCalls.push(`view:render:${state.screen}:${state.panel}`),
    setMenuOpen: (open) => shellUiOwnerCalls.push(`view:menu:${open}`),
    setScreen: (screen) => shellUiOwnerCalls.push(`view:screen:${screen}`),
    showPanel: (panel) => shellUiOwnerCalls.push(`view:panel:${panel}`),
    update: (state) => shellUiOwnerCalls.push(`view:update:${state.panel}`),
  },
  onCloseShop: () => shellUiOwnerCalls.push("callback:close-shop"),
  onOpenShop: () => shellUiOwnerCalls.push("callback:open-shop"),
  onSetGameSpeed: (speed) => shellUiOwnerCalls.push(`callback:speed:${speed}`),
  onStartRun: () => shellUiOwnerCalls.push("callback:start-run"),
});
const shellUiInitialState = shellUiOwner.init();
shellUiOwner.openMenu("inventory");
shellUiOwner.update({ screen: "menu" });
shellUiOwner.selectRelic("pickup_radius_focus_relic");
shellUiOwner.openShop();
shellUiOwner.closeShop();
shellUiOwner.setGameSpeed(5);
const shellUiRunState = shellUiOwner.startRun();
const shellUiDisposedState = shellUiOwner.dispose();
check(
  "module bootstrap composes shell UI owner through module path",
  shellUiInitialState.initialized === true &&
    shellUiInitialState.screen === "title" &&
    typeof shellUiOwner.render === "function" &&
    typeof shellUiOwner.update === "function" &&
    typeof shellUiOwner.openPanel === "function" &&
    typeof shellUiOwner.dispose === "function"
);
check(
  "module bootstrap shell UI owner delegates relic panel ownership",
  shellUiRelicOwnerCalls.includes("relic:render:50") &&
    shellUiRelicOwnerCalls.includes("relic:update:50") &&
    shellUiRelicOwnerCalls.includes("relic:select:pickup_radius_focus_relic") &&
    shellUiRelicOwnerCalls.includes("relic:dispose")
);
check(
  "module bootstrap shell UI owner drives lifecycle callbacks",
  shellUiOwnerCalls.includes("view:menu:true") &&
    shellUiOwnerCalls.includes("view:panel:inventory") &&
    shellUiOwnerCalls.includes("callback:open-shop") &&
    shellUiOwnerCalls.includes("callback:close-shop") &&
    shellUiOwnerCalls.includes("callback:speed:5") &&
    shellUiOwnerCalls.includes("callback:start-run") &&
    shellUiRunState.screen === "game" &&
    shellUiDisposedState.disposed === true
);
const shellUiPresentation = composeShellUiPresentation();
const shellUiPresentationModel = shellUiPresentation.createShellViewModel({
  initialized: true,
  menuOpen: true,
  panel: "inventory",
  screen: "title",
});
check(
  "module bootstrap builds shell UI presentation model",
  shellUiPresentationModel.activePanel === "inventory" &&
    shellUiPresentationModel.panels.some((panel) => panel.id === "inventory" && panel.active) &&
    shellUiPresentationModel.sections.inventory.type === "relics" &&
    shellUiPresentationModel.sections.progress.hidden === true &&
    shellUiPresentationModel.actions.canStartRun === true &&
    shellUiPresentationModel.actions.canExitRun === false &&
    shellUiPresentationModel.actions.openMenuExpanded === "true"
);
check(
  "module bootstrap shell UI model is serializable and stable",
  JSON.parse(JSON.stringify(shellUiPresentationModel)).panels.map((panel) => panel.id).join(",") ===
    "progress,shop,inventory"
);
const shellUiAdapterRoot = createFakeElement("div");
const shellUiAdapterCallbacks = [];
const shellUiAdapterRelicCalls = [];
const shellUiAdapter = composeShellUiDomAdapter({
  presenter: shellUiPresentation,
  documentRef: createFakeDocument(),
  root: shellUiAdapterRoot,
  shellRelicController: {
    render: (save) => shellUiAdapterRelicCalls.push(`render:${save.towerFloor}`),
  },
  getSave: () => shellUiOwnerSave,
  onCloseMenu: () => shellUiAdapterCallbacks.push("close-menu"),
  onExitRun: () => shellUiAdapterCallbacks.push("exit-run"),
  onMuteToggle: () => shellUiAdapterCallbacks.push("mute"),
  onOpenPanel: (panelId) => shellUiAdapterCallbacks.push(`open:${panelId}`),
  onOpenShop: () => shellUiAdapterCallbacks.push("open-shop"),
  onResetSave: () => shellUiAdapterCallbacks.push("reset"),
  onSetGameSpeed: (speed) => shellUiAdapterCallbacks.push(`speed:${speed}`),
  onStartRun: (model) => shellUiAdapterCallbacks.push(`start:${model.activePanel}`),
  onToggleFullscreen: () => shellUiAdapterCallbacks.push("fullscreen"),
});
const shellUiAdapterInitialModel = shellUiAdapter.render({
  initialized: true,
  panel: "progress",
  screen: "title",
});
const shellUiAdapterStartButton = findByDataset(shellUiAdapterRoot, "action", "start-run");
shellUiAdapterStartButton?.eventListeners?.click?.[0]?.();
const shellUiAdapterExitRunButton = findByDataset(shellUiAdapterRoot, "action", "exit-run");
const shellUiAdapterInventoryTab = findByDataset(shellUiAdapterRoot, "panelId", "inventory");
shellUiAdapterInventoryTab?.eventListeners?.click?.[0]?.();
const shellUiAdapterInventorySection = findFirst(
  shellUiAdapterRoot,
  (element) => element.dataset?.panelId === "inventory" && element.dataset?.sectionType === "relics"
);
const shellUiAdapterProgressSection = findFirst(
  shellUiAdapterRoot,
  (element) => element.dataset?.panelId === "progress" && element.dataset?.sectionType === "progress"
);
findByDataset(shellUiAdapterRoot, "action", "open-shop")?.eventListeners?.click?.[0]?.();
findByDataset(shellUiAdapterRoot, "action", "reset-save")?.eventListeners?.click?.[0]?.();
findByDataset(shellUiAdapterRoot, "action", "fullscreen")?.eventListeners?.click?.[0]?.();
findByDataset(shellUiAdapterRoot, "action", "mute")?.eventListeners?.click?.[0]?.();
findByDataset(shellUiAdapterRoot, "action", "speed-5")?.eventListeners?.click?.[0]?.();
const shellUiAdapterCurrentStartButton = findByDataset(shellUiAdapterRoot, "action", "start-run");
const shellUiAdapterText = collectText(shellUiAdapterRoot);
shellUiAdapter.dispose();
check(
  "module bootstrap renders shell UI DOM adapter frame",
  shellUiAdapterInitialModel.activePanel === "progress" &&
    shellUiAdapterText.includes("Tap Survivor") &&
    shellUiAdapterText.includes("Inventory") &&
    shellUiAdapterText.includes("Relic inventory")
);
check(
  "module bootstrap shell UI DOM adapter drives callbacks and relic delegation",
  shellUiAdapterCallbacks.includes("start:progress") &&
    shellUiAdapterCallbacks.includes("open:inventory") &&
    shellUiAdapterCallbacks.includes("open-shop") &&
    shellUiAdapterCallbacks.includes("reset") &&
    shellUiAdapterCallbacks.includes("fullscreen") &&
    shellUiAdapterCallbacks.includes("mute") &&
    shellUiAdapterCallbacks.includes("speed:5") &&
    shellUiAdapterRelicCalls.includes("render:50")
);
check(
  "module bootstrap shell UI DOM adapter updates active and hidden panel state",
  shellUiAdapterInventorySection?.className.includes("active") &&
    shellUiAdapterInventorySection?.hidden === false &&
    shellUiAdapterProgressSection?.className.includes("hidden") &&
    shellUiAdapterProgressSection?.hidden === true &&
    shellUiAdapterExitRunButton?.disabled === true
);
check(
  "module bootstrap shell UI DOM adapter cleans event listeners on rerender and dispose",
  shellUiAdapterInventoryTab?.eventListeners?.click?.length === 0 &&
    shellUiAdapterCurrentStartButton?.eventListeners?.click?.length === 0 &&
    collectText(shellUiAdapterRoot) === ""
);
const shellUiComposedRoot = createFakeElement("div");
const shellUiComposedCalls = [];
const shellUiComposedRelicCalls = [];
const shellUiComposedController = composeShellUiController({
  documentRef: createFakeDocument(),
  getSave: () => shellUiOwnerSave,
  presenter: shellUiPresentation,
  root: shellUiComposedRoot,
  shellRelicController: {
    dispose: () => shellUiComposedRelicCalls.push("dispose"),
    render: (save) => shellUiComposedRelicCalls.push(`render:${save.towerFloor}`),
    selectRelic: (relicId) => shellUiComposedRelicCalls.push(`select:${relicId}`),
  },
  onStartRun: () => shellUiComposedCalls.push("start"),
  onSetGameSpeed: (speed) => shellUiComposedCalls.push(`speed:${speed}`),
  onToggleFullscreen: () => shellUiComposedCalls.push("fullscreen"),
  onMuteToggle: () => shellUiComposedCalls.push("mute"),
});
shellUiComposedController.init();
shellUiComposedController.openPanel("inventory");
shellUiComposedController.selectRelic("pickup_radius_focus_relic");
shellUiComposedController.startRun();
shellUiComposedController.setGameSpeed(5);
shellUiComposedController.toggleFullscreen();
shellUiComposedController.toggleMute();
const shellUiComposedText = collectText(shellUiComposedRoot);
const shellUiComposedDisposed = shellUiComposedController.dispose();
check(
  "module bootstrap shell UI controller composes presenter and DOM adapter",
  shellUiComposedText.includes("Relic inventory") &&
    shellUiComposedRelicCalls.includes("render:50") &&
    shellUiComposedRelicCalls.includes("select:pickup_radius_focus_relic") &&
    shellUiComposedCalls.includes("start") &&
    shellUiComposedCalls.includes("speed:5") &&
    shellUiComposedCalls.includes("fullscreen") &&
    shellUiComposedCalls.includes("mute") &&
    shellUiComposedDisposed.disposed === true
);
check(
  "module bootstrap shell UI composed controller disposes delegated state",
  shellUiComposedRelicCalls.includes("dispose") && collectText(shellUiComposedRoot) === ""
);
const shellUiDelegatedRelicRoot = createFakeElement("div");
const shellUiDelegatedScheduler = createFakeScheduler();
const shellUiDelegatedCallbacks = [];
const shellUiDelegatedPersists = [];
const shellUiDelegatedMetaRenders = [];
const shellUiDelegatedPreviewCanvases = [];
const shellUiDelegatedSave = {
  towerFloor: 40,
  unlockedRelics: [
    "move_speed_focus_relic",
    "fire_rate_mastery_relic",
    "pickup_radius_focus_relic",
    "split_on_hit_mastery_relic",
  ],
  equippedRelics: ["move_speed_focus_relic", "fire_rate_mastery_relic", "split_on_hit_mastery_relic"],
};
const shellUiDelegatedRelicOwner = composeShellRelicController({
  presenter: shellRelicPresentation,
  documentRef: createFakeDocument(),
  root: shellUiDelegatedRelicRoot,
  getSave: () => shellUiDelegatedSave,
  relicSystem: relicProgression.progression,
  persist: (save) => shellUiDelegatedPersists.push([...save.equippedRelics]),
  renderMeta: (save) => shellUiDelegatedMetaRenders.push([...save.equippedRelics]),
  scheduler: shellUiDelegatedScheduler,
  previewAdapter: {
    runUpgradeSprite: (upgradeId) => content.assets.sprites.runUpgrades[upgradeId],
    spriteSource: (sprite) => sprite?.src || "",
    createCanvas({ className, height, width }) {
      const canvas = createFakeElement("canvas");
      canvas.className = className;
      canvas.width = width;
      canvas.height = height;
      shellUiDelegatedPreviewCanvases.push(canvas);
      return canvas;
    },
    getContext(canvas) {
      return canvas.context;
    },
    createImage() {
      return createFakeImage();
    },
  },
  onEquip: (relic) => shellUiDelegatedCallbacks.push(`equip:${relic.id}`),
  onSelect: (relic) => shellUiDelegatedCallbacks.push(`select:${relic?.id || "none"}`),
  onUnequip: (relic) => shellUiDelegatedCallbacks.push(`unequip:${relic.id}`),
});
const shellUiDelegatedOwner = composeShellUiController({
  shellRelicController: shellUiDelegatedRelicOwner,
  getSave: () => shellUiDelegatedSave,
  onStartRun: () => shellUiDelegatedCallbacks.push("start"),
});
shellUiDelegatedOwner.init();
shellUiDelegatedOwner.openPanel("inventory");
shellUiDelegatedOwner.selectRelic("pickup_radius_focus_relic");
const shellUiDelegatedEquipButton = findByDataset(shellUiDelegatedRelicRoot, "action", "equip");
shellUiDelegatedEquipButton?.eventListeners?.click?.[0]?.();
const shellUiDelegatedEquippedSlot = findByDataset(shellUiDelegatedRelicRoot, "relicId", "pickup_radius_focus_relic");
const shellUiDelegatedUnequipButton = findByDataset(shellUiDelegatedEquippedSlot, "action", "unequip");
shellUiDelegatedUnequipButton?.eventListeners?.click?.[0]?.();
shellUiDelegatedOwner.startRun();
shellUiDelegatedOwner.dispose();
check(
  "module bootstrap shell UI owner drives real relic controller path",
  collectText(shellUiDelegatedRelicRoot).includes("Relic slots: 5/6") &&
    shellUiDelegatedPreviewCanvases[0]?.width === 112 &&
    shellUiDelegatedCallbacks.includes("select:pickup_radius_focus_relic") &&
    shellUiDelegatedCallbacks.includes("equip:pickup_radius_focus_relic") &&
    shellUiDelegatedCallbacks.includes("unequip:pickup_radius_focus_relic") &&
    shellUiDelegatedCallbacks.includes("start") &&
    shellUiDelegatedPersists.length === 2 &&
    shellUiDelegatedMetaRenders.length === 2 &&
    shellUiDelegatedScheduler.timers.at(-1)?.cleared === true
);
const fakeShellRelicFallbackRoot = createFakeElement("div");
const shellRelicFallbackAdapter = composeShellRelicUiAdapter({
  presenter: shellRelicPresentation,
  documentRef: createFakeDocument(),
  root: fakeShellRelicFallbackRoot,
  previewAdapter: {
    runUpgradeSprite: () => null,
  },
});
shellRelicFallbackAdapter.renderShellRelics(shellRelicUiSave, {
  selectedRelicId: "pickup_radius_focus_relic",
});
const fallbackPreview = findFirst(fakeShellRelicFallbackRoot, (element) =>
  element.className.includes("relic-detail-preview")
);
check(
  "module bootstrap falls back to static relic preview without animated assets",
  fallbackPreview?.tagName === "img" && fallbackPreview.src.includes("pickup_radius_focus_relic")
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
check(
  "module bootstrap composes shell relic owner without classic globals",
  composeRuntimeSource.includes('from "../modules/shell-relic-controller.js"') &&
    !composeRuntimeSource.includes("globalThis.TapSurvivorShellUi")
);
check(
  "module bootstrap composes shell UI owner without classic globals",
  composeRuntimeSource.includes('from "../modules/shell-ui-controller.js"') &&
    !composeRuntimeSource.includes("globalThis.TapSurvivorShellUi")
);
check(
  "module bootstrap composes shell UI presenter and DOM adapter without classic globals",
  composeRuntimeSource.includes('from "../modules/shell-ui-presenter.js"') &&
    composeRuntimeSource.includes('from "../modules/shell-ui-dom-adapter.js"') &&
    !composeRuntimeSource.includes("globalThis.TapSurvivorShellUi")
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
    attributes: {},
    children: [],
    className: "",
    dataset: {},
    disabled: false,
    eventListeners: {},
    hidden: false,
    context: {
      calls: [],
      clearRect(...args) {
        this.calls.push(["clearRect", ...args]);
      },
      drawImage(...args) {
        this.calls.push(["drawImage", ...args]);
      },
      imageSmoothingEnabled: true,
    },
    innerHTML: "",
    style: {
      setProperty(key, value) {
        this[key] = value;
      },
    },
    textContent: "",
    type: "",
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    setAttribute(key, value) {
      this.attributes[key] = value;
    },
    addEventListener(type, handler) {
      this.eventListeners[type] = this.eventListeners[type] || [];
      this.eventListeners[type].push(handler);
    },
    removeEventListener(type, handler) {
      this.eventListeners[type] = (this.eventListeners[type] || []).filter((listener) => listener !== handler);
    },
    replaceChildren(...children) {
      this.children = children;
    },
  };
}

function createFakeImage() {
  const listeners = {};
  return {
    addEventListener(type, callback) {
      listeners[type] = callback;
    },
    get src() {
      return this.source || "";
    },
    set src(value) {
      this.source = value;
      listeners.load?.();
    },
  };
}

function createFakeScheduler() {
  const timers = [];
  return {
    timers,
    clearedAfterDispose: false,
    setTimeout(callback, delay) {
      const timer = { callback, cleared: false, delay, id: timers.length + 1 };
      timers.push(timer);
      return timer;
    },
    clearTimeout(timer) {
      if (timer) timer.cleared = true;
      if (timer && timers.indexOf(timer) === timers.length - 1) this.clearedAfterDispose = true;
    },
    runLatest() {
      timers[timers.length - 1]?.callback();
    },
  };
}

function collectText(element) {
  return [element.textContent || "", ...element.children.map(collectText)].filter(Boolean).join(" ");
}

function findByDataset(element, key, value) {
  if (!element) return null;
  if (element.dataset?.[key] === value) return element;
  for (const child of element.children) {
    const match = findByDataset(child, key, value);
    if (match) return match;
  }
  return null;
}

function findFirst(element, predicate) {
  if (!element) return null;
  if (predicate(element)) return element;
  for (const child of element.children) {
    const match = findFirst(child, predicate);
    if (match) return match;
  }
  return null;
}
