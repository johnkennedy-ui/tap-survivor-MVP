import { readFileSync } from "node:fs";
import vm from "node:vm";

import { createBrowserDependencyBagOptions } from "../src/app/browser-dependency-bag.js";
import { createModuleGameDependencyBag } from "../src/modules/module-game-dependencies.js";
import { createShopSystem } from "../src/modules/shop.js";
import { createShopPricing } from "../src/modules/shop-pricing.js";

const root = new URL("..", import.meta.url).pathname;
const generatedClassicShopSource = readFileSync(`${root}/src/shop.js`, "utf8");
const shopItems = [
  {
    cost: [10, 20],
    description: "Move faster.",
    effect: { stat: "speed", value: 5 },
    id: "boots",
    maxTier: 2,
    name: "Boots",
  },
  {
    cost: 20,
    description: "Collect farther away.",
    effect: { stat: "pickupRadius", value: 3 },
    id: "orb",
    maxTier: 1,
    name: "Orb",
  },
];
const pricingConfig = { floorPriceRate: 0.1, inflationRate: 0.025 };

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

const native = runParityScenario("native");
const classic = runParityScenario("classic");
const selectedBrowser = runParityScenario("selected-browser");
const snapshotsMatch =
  JSON.stringify(native.snapshot) === JSON.stringify(classic.snapshot) &&
  JSON.stringify(native.snapshot) === JSON.stringify(selectedBrowser.snapshot);

if (!snapshotsMatch) {
  console.error("Provider snapshots:", JSON.stringify({ native, classic, selectedBrowser }, null, 2));
}

check(
  "native, generated classic, and selected-browser Shop providers have equal deterministic snapshots",
  snapshotsMatch
);
check(
  "native Shop requires an explicit documentRef without falling back to globalThis.document",
  missingDocumentRefFailsClosed()
);
check(
  "generated classic Shop bridge supplies globalThis.document only at the classic boundary",
  generatedClassicBoundaryUsesDocument()
);
check(
  "selected-browser Shop adapter fails closed before native binding and recovers after binding",
  selectedBrowser.unboundAdapterFailedClosed && selectedBrowser.boundAdapterIdentityPreserved
);
check(
  "selected production browser route does not read a poisoned TapSurvivorShop global",
  selectedBrowser.poisonedGlobalReads === 0
);
check(
  "selected-browser native Shop handles malformed unused storage without invalid purchase tiers",
  malformedStorageRecoveryPasses()
);

if (process.exitCode) {
  console.error("\nShop provider parity smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nShop provider parity smoke passed.");

function runParityScenario(kind, initialSave = baseSave()) {
  const fixture = createFixture(initialSave);
  const providerSetup = createProvider(kind, fixture);
  const provider = providerSetup.provider;
  const api = Object.keys(provider).sort();
  provider.renderShop();
  const afterRender = shopDomSnapshot(fixture);

  provider.openShop();
  const afterOpen = {
    paused: fixture.getGame().paused,
    pauseReason: fixture.getGame().pauseReason,
    shopVisible: !fixture.ui.shopModal.classList.contains("hidden"),
  };

  fixture.ui.shopItems.children[0].children.at(-1).click();
  const afterPurchase = {
    bootsButton: fixture.ui.shopItems.children[0].children.at(-1).textContent,
    effects: fixture.effectCount(),
    hud: fixture.ui.shopCoinHud.textContent,
    notices: [...fixture.calls.notices],
    orbCost: extractShopCost(fixture.ui.shopItems.children[1].innerHTML),
    persisted: persistedShopState(fixture.persistedSave()),
    purchases: { ...fixture.getSave().shopPurchases },
    renderMeta: fixture.calls.renderMeta,
    sfx: fixture.calls.sfx,
    speed: fixture.getGame().player.speed,
    visits: fixture.calls.visits,
    coins: fixture.getSave().coins,
  };

  provider.closeShop();
  const afterClose = {
    paused: fixture.getGame().paused,
    pauseReason: fixture.getGame().pauseReason,
    shopVisible: !fixture.ui.shopModal.classList.contains("hidden"),
  };
  const deniedAndMaxedUnchanged = verifyDeniedAndMaxedPurchases(kind, fixture);
  const recovery = runRecoveryScenario(kind, fixture.persistedSave());

  return {
    boundAdapterIdentityPreserved: providerSetup.boundAdapterIdentityPreserved,
    poisonedGlobalReads: providerSetup.poisonedGlobalReads,
    snapshot: {
      afterClose,
      afterOpen,
      afterPurchase,
      afterRender,
      api,
      deniedAndMaxedUnchanged,
      recovery,
    },
    unboundAdapterFailedClosed: providerSetup.unboundAdapterFailedClosed,
  };
}

function createProvider(kind, fixture) {
  if (kind === "native") {
    return {
      boundAdapterIdentityPreserved: true,
      poisonedGlobalReads: 0,
      provider: createShopSystem(fixture.nativeOptions),
      unboundAdapterFailedClosed: true,
    };
  }
  if (kind === "classic") {
    return {
      boundAdapterIdentityPreserved: true,
      poisonedGlobalReads: 0,
      provider: createClassicProvider(fixture),
      unboundAdapterFailedClosed: true,
    };
  }
  return createSelectedBrowserProvider(fixture);
}

function createClassicProvider(fixture) {
  const context = vm.createContext({ document: fixture.documentRef });
  context.globalThis = context;
  vm.runInContext(generatedClassicShopSource, context, { filename: "src/shop.js" });
  return context.TapSurvivorShop.createShopSystem(withoutDocumentRef(fixture.nativeOptions));
}

function createSelectedBrowserProvider(fixture) {
  const globalReadGuard = installPoisonedShopGlobal(fixture.globalRef);
  const browserOptions = createBrowserDependencyBagOptions({
    audioAdapters: {
      audioContextFactory: (cueId) => ({
        resume() {
          if (cueId === "shop-purchase") fixture.calls.sfx += 1;
        },
      }),
      audioFactory: () => null,
      clock: () => 0,
    },
    canvas: fixture.canvas,
    content: fixture.content,
    contentSchema: fixture.contentSchema,
    documentRef: fixture.documentRef,
    globalRef: fixture.globalRef,
    initialGame: fixture.game,
    initialSave: fixture.save,
    platformAdapters: fixture.platformAdapters,
    renderMetaSink: () => {
      fixture.calls.renderMeta += 1;
    },
    shopPricingConfig: pricingConfig,
    storage: fixture.storage,
    ui: fixture.ui,
  });
  const adapterBeforeBinding = browserOptions.adapters.uiAdapters.shopSystemAdapter;
  const unboundAdapterFailedClosed = throwsStableBindingError(() => adapterBeforeBinding.renderShop());
  const dependencies = createModuleGameDependencyBag(browserOptions);
  fixture.getGame = dependencies.getGame;
  fixture.getSave = dependencies.getSave;
  fixture.persistedSave = () => fixture.storage.getItem("tap-survivor-mvp-save-v2") || "";
  fixture.effectCount = () => (fixture.getGame().player.speed === 105 ? 1 : 0);
  return {
    boundAdapterIdentityPreserved: dependencies.shopSystem === adapterBeforeBinding,
    poisonedGlobalReads: globalReadGuard.readAttempts(),
    provider: dependencies.shopSystem,
    unboundAdapterFailedClosed,
  };
}

function runRecoveryScenario(kind, persistedSave) {
  const recovered = runProviderFixture(kind, JSON.parse(persistedSave));
  const bonuses = recovered.provider.getShopBonuses();
  recovered.provider.renderShop();
  return {
    bonuses: normalizeObject(bonuses),
    bootsTier: recovered.getSave().shopPurchases.boots,
    nextBootsButton: recovered.ui.shopItems.children[0].children.at(-1).textContent,
    nextBootsCost: extractShopCost(recovered.ui.shopItems.children[0].innerHTML),
  };
}

function runProviderFixture(kind, save) {
  const fixture = createFixture(save);
  const providerSetup = createProvider(kind, fixture);
  return { ...fixture, provider: providerSetup.provider };
}

function verifyDeniedAndMaxedPurchases(kind, originalFixture) {
  const denied = runProviderFixture(kind, {
    coins: 0,
    shopPurchases: { boots: 1 },
    towerFloor: 3,
  });
  denied.provider.renderShop();
  const deniedBefore = JSON.stringify({ calls: denied.calls, save: denied.getSave() });
  denied.ui.shopItems.children[1].children.at(-1).click();
  const deniedUnchanged = denied.ui.shopItems.children[1].children.at(-1).disabled &&
    deniedBefore === JSON.stringify({ calls: denied.calls, save: denied.getSave() });

  const maxed = runProviderFixture(kind, {
    coins: 50,
    shopPurchases: { boots: 2 },
    towerFloor: 3,
  });
  maxed.provider.renderShop();
  const maxedBefore = JSON.stringify({ calls: maxed.calls, save: maxed.getSave() });
  maxed.ui.shopItems.children[0].children.at(-1).click();
  const maxedUnchanged = maxed.ui.shopItems.children[0].children.at(-1).disabled &&
    maxedBefore === JSON.stringify({ calls: maxed.calls, save: maxed.getSave() });

  return deniedUnchanged && maxedUnchanged && Boolean(originalFixture);
}

function createFixture(initialSave) {
  const calls = { notices: [], renderMeta: 0, sfx: 0, visits: 0 };
  const save = structuredClone(initialSave);
  const game = {
    paused: false,
    pauseReason: "",
    player: { pickupRadius: 10, speed: 100 },
    running: true,
  };
  const documentRef = createFakeDocument();
  const ui = createShopUi();
  const storage = createMemoryStorage();
  const fixture = {
    calls,
    canvas: createCanvas(),
    content: {
      assets: { sfx: {} },
      bossAbilities: {},
      bossConfig: {},
      enemyTypes: [],
      levels: [],
      maps: [],
      questGroups: {},
      quests: {},
      relics: [],
      shopItems,
      tuning: { loot: {} },
      weaponUnlocks: [],
      weapons: {},
    },
    contentSchema: {
      effectRegistries: {
        shopItem: { stats: ["speed", "pickupRadius"] },
      },
    },
    documentRef,
    effectCount: () => calls.effects || 0,
    game,
    getGame: () => game,
    getSave: () => save,
    globalRef: createSelectedBrowserGlobal(),
    nativeOptions: null,
    persistedSave: () => JSON.stringify(save),
    platformAdapters: null,
    save,
    storage,
    ui,
  };
  const effects = {
    addShopItemBonus(bonuses, item, tier) {
      if (Object.prototype.hasOwnProperty.call(bonuses, item?.effect?.stat)) {
        bonuses[item.effect.stat] += item.effect.value * tier;
      }
    },
    applyShopItemEffectToRun(currentGame, item) {
      calls.effects = (calls.effects || 0) + 1;
      if (currentGame?.running && item?.effect?.stat === "speed") {
        currentGame.player.speed += item.effect.value;
      }
      if (currentGame?.running && item?.effect?.stat === "pickupRadius") {
        currentGame.player.pickupRadius += item.effect.value;
      }
      return true;
    },
    emptyShopBonuses() {
      return { pickupRadius: 0, speed: 0 };
    },
  };
  fixture.nativeOptions = {
    documentRef,
    effects,
    getGame: fixture.getGame,
    getSave: fixture.getSave,
    onPurchaseNotice: (message) => calls.notices.push(message),
    onShopVisit: once(() => {
      calls.visits += 1;
    }),
    persist: () => {
      fixture.persisted = JSON.stringify(fixture.getSave());
      return true;
    },
    playPurchaseSfx: () => {
      calls.sfx += 1;
    },
    pricingConfig,
    renderMeta: () => {
      calls.renderMeta += 1;
    },
    shopItemDefs: shopItems,
    shopPricing: { createShopPricing },
    ui,
  };
  fixture.persistedSave = () => fixture.persisted || JSON.stringify(fixture.getSave());
  fixture.platformAdapters = {
    bannerSystem: {
      showBanner(message) {
        calls.notices.push(message);
      },
      showOnceBanner: once(() => {
        calls.visits += 1;
      }),
    },
    bindMovementInput: () => ({}),
    canvas: fixture.canvas,
    debugSystem: { bind() {}, render() {} },
    loop() {},
  };
  return fixture;
}

function baseSave() {
  return { coins: 50, shopPurchases: {}, towerFloor: 3 };
}

function createFakeDocument() {
  return {
    body: { dataset: {} },
    createElement(tagName) {
      return createFakeElement(tagName);
    },
    getElementById() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

function createShopUi() {
  return {
    menuShopCoinHud: createFakeElement("menu-shop-coin-hud"),
    menuShopItems: createFakeElement("menu-shop-items"),
    menuShopPanel: createFakeElement("menu-shop-panel", true),
    shopCoinHud: createFakeElement("shop-coin-hud"),
    shopItems: createFakeElement("shop-items"),
    shopModal: createFakeElement("shop-modal", true),
  };
}

function createFakeElement(tagName, hidden = false) {
  const listeners = new Map();
  const classes = new Set(hidden ? ["hidden"] : []);
  const element = {
    children: [],
    classList: {
      add(name) {
        classes.add(name);
      },
      contains(name) {
        return classes.has(name);
      },
      remove(name) {
        classes.delete(name);
      },
      toggle(name, force) {
        const next = force === undefined ? !classes.has(name) : Boolean(force);
        if (next) classes.add(name);
        else classes.delete(name);
        return next;
      },
    },
    disabled: false,
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
      if (!this.disabled) listeners.get("click")?.({ currentTarget: this, type: "click" });
    },
  };
  let innerHTML = "";
  Object.defineProperty(element, "innerHTML", {
    enumerable: true,
    get: () => innerHTML,
    set: (value) => {
      innerHTML = String(value);
      element.children = [];
    },
  });
  return element;
}

function createCanvas() {
  return {
    height: 540,
    width: 960,
    addEventListener() {},
    getBoundingClientRect() {
      return { height: 540, left: 0, top: 0, width: 960 };
    },
    getContext() {
      return null;
    },
  };
}

function createSelectedBrowserGlobal() {
  return {
    TapSurvivorCombat: { createCombatSystem: () => ({}) },
    TapSurvivorEnemies: { createEnemySystem: () => ({}) },
    TapSurvivorEnemyBehaviors: { createEnemyBehaviorSystem: () => ({}) },
    TapSurvivorEnemySpawning: { createEnemySpawnSystem: () => ({}) },
    TapSurvivorLevelUp: { createLevelUpSystem: () => ({}) },
    TapSurvivorProgression: { createProgressionSystem: () => ({}) },
    TapSurvivorQuests: {
      createQuestSystem: () => ({}),
      questOpenIds: () => [],
    },
    TapSurvivorUpgrades: {
      createUpgradeContent: () => ({ createUpgradeDefs: () => [], runUpgradeDefs: [] }),
    },
    TapSurvivorWeaponBehaviors: { createWeaponBehaviorSystem: () => ({}) },
    TapSurvivorWeaponFire: { createWeaponFireSystem: () => ({}) },
    clearTimeout() {},
    requestAnimationFrame() {
      return 0;
    },
    setTimeout() {
      return 0;
    },
  };
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) || null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

function extractShopCost(markup) {
  return Number(/(?:Cost|Needs): (\d+) coins/.exec(markup)?.[1] || 0);
}

function normalizeObject(value) {
  return Object.fromEntries(
    Object.entries(value || {}).sort(([left], [right]) => left.localeCompare(right))
  );
}

function persistedShopState(serializedSave) {
  const save = JSON.parse(serializedSave);
  return {
    coins: save.coins,
    shopPurchases: normalizeObject(save.shopPurchases),
    towerFloor: save.towerFloor,
  };
}

function shopDomSnapshot(fixture) {
  return {
    huds: [fixture.ui.shopCoinHud.textContent, fixture.ui.menuShopCoinHud.textContent],
    itemNodes: [fixture.ui.shopItems.children.length, fixture.ui.menuShopItems.children.length],
    firstButton: fixture.ui.shopItems.children[0]?.children.at(-1)?.textContent || "",
  };
}

function once(callback) {
  let called = false;
  return (...args) => {
    if (called) return false;
    called = true;
    callback(...args);
    return true;
  };
}

function withoutDocumentRef(options) {
  const { documentRef: _documentRef, ...classicOptions } = options;
  return classicOptions;
}

function missingDocumentRefFailsClosed() {
  const previousDocument = globalThis.document;
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    get() {
      throw new Error("native Shop must not read globalThis.document");
    },
  });
  try {
    return throwsStableDocumentError(() => createShopSystem(withoutDocumentRef(createFixture(baseSave()).nativeOptions)));
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else Object.defineProperty(globalThis, "document", { configurable: true, value: previousDocument });
  }
}

function generatedClassicBoundaryUsesDocument() {
  const fixture = createFixture(baseSave());
  const provider = createClassicProvider(fixture);
  provider.renderShop();
  return fixture.ui.shopItems.children.length === 2;
}

function malformedStorageRecoveryPasses() {
  const fixture = createFixture({ coins: 0, shopPurchases: {}, towerFloor: 1 });
  fixture.storage.setItem("tap-survivor-mvp-save-v2", "{not-json");
  const providerSetup = createSelectedBrowserProvider(fixture);
  providerSetup.provider.renderShop();
  return (
    providerSetup.unboundAdapterFailedClosed &&
    typeof fixture.getSave().shopPurchases === "object" &&
    fixture.getSave().shopPurchases.boots === undefined
  );
}

function installPoisonedShopGlobal(target) {
  let reads = 0;
  Object.defineProperty(target, "TapSurvivorShop", {
    configurable: true,
    get() {
      reads += 1;
      throw new Error("Forbidden TapSurvivorShop global read");
    },
  });
  return {
    readAttempts: () => reads,
  };
}

function throwsStableBindingError(callback) {
  try {
    callback();
    return false;
  } catch (error) {
    return error?.message === "Missing Tap Survivor browser native shop binding";
  }
}

function throwsStableDocumentError(callback) {
  try {
    callback();
    return false;
  } catch (error) {
    return error?.message === "Missing Tap Survivor native shop dependency: documentRef";
  }
}
