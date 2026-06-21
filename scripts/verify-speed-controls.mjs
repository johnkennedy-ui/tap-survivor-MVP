import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = new URL("..", import.meta.url).pathname;
const source = readFileSync(join(root, "src/game.js"), "utf8");
const contentSource = readFileSync(join(root, "src/content.generated.js"), "utf8");
const balanceRuntimeSource = readFileSync(join(root, "src/balance-runtime.js"), "utf8");
const mathSource = readFileSync(join(root, "src/math.js"), "utf8");
const spritesSource = readFileSync(join(root, "src/sprites.js"), "utf8");
const audioSource = readFileSync(join(root, "src/audio.js"), "utf8");
const questsSource = readFileSync(join(root, "src/quests.js"), "utf8");
const storageSource = readFileSync(join(root, "src/storage-adapter.js"), "utf8");
const saveDefaultsSource = readFileSync(join(root, "src/save-defaults.js"), "utf8");
const saveMigrationsSource = readFileSync(join(root, "src/save-migrations.js"), "utf8");
const saveNormalizeSource = readFileSync(join(root, "src/save-normalize.js"), "utf8");
const saveCorruptionSource = readFileSync(join(root, "src/save-corruption.js"), "utf8");
const saveSource = readFileSync(join(root, "src/save.js"), "utf8");
const effectsSource = readFileSync(join(root, "src/effects.js"), "utf8");
const upgradeSource = readFileSync(join(root, "src/upgrades.js"), "utf8");
const contentRegistrySource = readFileSync(join(root, "src/content-registry.js"), "utf8");
const mapSystemSource = readFileSync(join(root, "src/map-system.js"), "utf8");
const progressionSource = readFileSync(join(root, "src/progression.js"), "utf8");
const renderSkillRailSource = readFileSync(join(root, "src/render-skill-rail.js"), "utf8");
const renderHudSource = readFileSync(join(root, "src/render-hud.js"), "utf8");
const renderEnemiesSource = readFileSync(join(root, "src/render-enemies.js"), "utf8");
const renderingSource = readFileSync(join(root, "src/rendering.js"), "utf8");
const balanceSource = readFileSync(join(root, "src/balance.js"), "utf8");
const weaponProjectilesSource = readFileSync(join(root, "src/weapon-projectiles.js"), "utf8");
const weaponTargetingSource = readFileSync(join(root, "src/weapon-targeting.js"), "utf8");
const weaponCooldownsSource = readFileSync(join(root, "src/weapon-cooldowns.js"), "utf8");
const weaponBehaviorsSource = readFileSync(join(root, "src/weapon-behaviors.js"), "utf8");
const weaponFireSource = readFileSync(join(root, "src/weapon-fire.js"), "utf8");
const enemyBehaviorsSource = readFileSync(join(root, "src/enemy-behaviors.js"), "utf8");
const enemySpawningSource = readFileSync(join(root, "src/enemy-spawning.js"), "utf8");
const enemiesSource = readFileSync(join(root, "src/enemies.js"), "utf8");
const combatDamageSource = readFileSync(join(root, "src/combat-damage.js"), "utf8");
const combatSource = readFileSync(join(root, "src/combat.js"), "utf8");
const uiProgressionSource = readFileSync(join(root, "src/ui-progression.js"), "utf8");
const uiSource = readFileSync(join(root, "src/ui.js"), "utf8");
const runUiSource = readFileSync(join(root, "src/run-ui.js"), "utf8");
const levelUpChoicesSource = readFileSync(join(root, "src/level-up-choices.js"), "utf8");
const levelUpSource = readFileSync(join(root, "src/level-up.js"), "utf8");
const inputSource = readFileSync(join(root, "src/input.js"), "utf8");
const pickupsSource = readFileSync(join(root, "src/pickups.js"), "utf8");
const shopPricingSource = readFileSync(join(root, "src/shop-pricing.js"), "utf8");
const shopSource = readFileSync(join(root, "src/shop.js"), "utf8");
const relicsSource = readFileSync(join(root, "src/relics.js"), "utf8");
const runStateSource = readFileSync(join(root, "src/run-state.js"), "utf8");
const runUpdateSource = readFileSync(join(root, "src/run-update.js"), "utf8");
const debugSource = readFileSync(join(root, "src/debug.js"), "utf8");
const shellRelicUiSource = readFileSync(join(root, "src/shell-relic-ui.js"), "utf8");
const shellUiSource = readFileSync(join(root, "src/shell-ui.js"), "utf8");
const gameBannersSource = readFileSync(join(root, "src/game-banners.js"), "utf8");
const runLifecycleSource = readFileSync(join(root, "src/run-lifecycle.js"), "utf8");
const gameRuntimeSource = readFileSync(join(root, "src/game-runtime.js"), "utf8");
const listeners = new Map();

function makeClassList() {
  const classes = new Set();
  return {
    add: (...names) => names.forEach((name) => classes.add(name)),
    remove: (...names) => names.forEach((name) => classes.delete(name)),
    contains: (name) => classes.has(name),
    toggle: (name, force) => {
      const shouldAdd = force ?? !classes.has(name);
      if (shouldAdd) classes.add(name);
      else classes.delete(name);
      return shouldAdd;
    },
  };
}

function makeElement(id = "") {
  let html = "";
  return {
    id,
    dataset: {},
    classList: makeClassList(),
    children: [],
    disabled: false,
    get innerHTML() {
      return html;
    },
    set innerHTML(value) {
      html = value;
      this.children = [];
    },
    textContent: "",
    style: {},
    appendChild(child) {
      this.children.push(child);
    },
    addEventListener(type, handler) {
      listeners.set(`${id}:${type}`, handler);
    },
    setAttribute(name, value) {
      this[name] = value;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 960, height: 540 };
    },
    click() {
      listeners.get(`${id}:click`)?.({ target: this });
    },
  };
}

const elements = new Map();
const ids = [
  "game",
  "titleScreen",
  "titleStartGame",
  "startTransition",
  "openShop",
  "resetSave",
  "toggleDebug",
  "fullscreenButton",
  "muteAudio",
  "openMenu",
  "questBanner",
  "exitRun",
  "closeMenu",
  "closeShop",
  "closeShopBottom",
  "closeLevelUp",
  "menuProgressTab",
  "menuInventoryTab",
  "menuShopTab",
  "menuProgressPanel",
  "menuInventoryPanel",
  "menuShopPanel",
  "runMenu",
  "shopModal",
  "shopCoinHud",
  "shopNotice",
  "shopItems",
  "menuShopCoinHud",
  "menuShopNotice",
  "menuShopItems",
  "menuRelicSlots",
  "menuRelicInventory",
  "runHud",
  "debugPanel",
  "debugStats",
  "menuQpHud",
  "menuTree",
  "menuQuests",
  "levelUp",
  "choices",
  "relicChoice",
  "relicChoiceTitle",
  "relicChoiceText",
  "relicChoices",
  "endScreen",
  "runStats",
  "closeEnd",
  "closeEndX",
];

ids.forEach((id) => elements.set(id, makeElement(id)));

const context2d = {
  clearRect() {},
  fillRect() {},
  strokeRect() {},
  beginPath() {},
  arc() {},
  fill() {},
  stroke() {},
  moveTo() {},
  lineTo() {},
  closePath() {},
  fillText() {},
  save() {},
  restore() {},
};

const canvas = elements.get("game");
canvas.width = 960;
canvas.height = 540;
canvas.getContext = () => context2d;
canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 960, height: 540 });

const speedButtons = [1, 2, 5].map((speed) => {
  const button = makeElement(`speed-${speed}`);
  button.dataset.speed = String(speed);
  return button;
});

let rafCallback = null;
const context = {
  console,
  Math,
  Number,
  performance: { now: () => 0 },
  requestAnimationFrame: (callback) => {
    rafCallback = callback;
    return 1;
  },
  setTimeout: (callback) => {
    callback();
    return 1;
  },
  clearTimeout() {},
  localStorage: {
    store: new Map(),
    getItem(key) {
      return this.store.get(key) || null;
    },
    setItem(key, value) {
      this.store.set(key, value);
    },
    removeItem(key) {
      this.store.delete(key);
    },
  },
  location: {
    search: "",
  },
  document: {
    body: { dataset: {} },
    getElementById(id) {
      return elements.get(id);
    },
    querySelectorAll(selector) {
      return selector === "[data-speed]" ? speedButtons : [];
    },
    createElement(tag) {
      return makeElement(tag);
    },
  },
};

vm.createContext(context);
vm.runInContext(contentSource, context);
vm.runInContext(balanceRuntimeSource, context);
vm.runInContext(mathSource, context);
vm.runInContext(spritesSource, context);
vm.runInContext(audioSource, context);
vm.runInContext(questsSource, context);
vm.runInContext(storageSource, context);
vm.runInContext(saveDefaultsSource, context);
vm.runInContext(saveMigrationsSource, context);
vm.runInContext(saveNormalizeSource, context);
vm.runInContext(saveCorruptionSource, context);
vm.runInContext(saveSource, context);
vm.runInContext(effectsSource, context);
vm.runInContext(upgradeSource, context);
vm.runInContext(contentRegistrySource, context);
vm.runInContext(mapSystemSource, context);
vm.runInContext(progressionSource, context);
vm.runInContext(renderSkillRailSource, context);
vm.runInContext(renderHudSource, context);
vm.runInContext(renderEnemiesSource, context);
vm.runInContext(renderingSource, context);
vm.runInContext(balanceSource, context);
vm.runInContext(weaponProjectilesSource, context);
vm.runInContext(weaponTargetingSource, context);
vm.runInContext(weaponCooldownsSource, context);
vm.runInContext(weaponBehaviorsSource, context);
vm.runInContext(weaponFireSource, context);
vm.runInContext(enemyBehaviorsSource, context);
vm.runInContext(enemySpawningSource, context);
vm.runInContext(enemiesSource, context);
vm.runInContext(combatDamageSource, context);
vm.runInContext(combatSource, context);
vm.runInContext(uiProgressionSource, context);
vm.runInContext(uiSource, context);
vm.runInContext(runUiSource, context);
vm.runInContext(levelUpChoicesSource, context);
vm.runInContext(levelUpSource, context);
vm.runInContext(inputSource, context);
vm.runInContext(pickupsSource, context);
vm.runInContext(shopPricingSource, context);
vm.runInContext(shopSource, context);
vm.runInContext(relicsSource, context);
vm.runInContext(runStateSource, context);
vm.runInContext(runUpdateSource, context);
vm.runInContext(debugSource, context);
vm.runInContext(shellRelicUiSource, context);
vm.runInContext(shellUiSource, context);
vm.runInContext(gameBannersSource, context);
vm.runInContext(runLifecycleSource, context);
vm.runInContext(gameRuntimeSource, context);
vm.runInContext(source, context);

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

check("initial speed is x1", context.document.body.dataset.gameSpeed === "1");

speedButtons[2].click();
check("x5 click updates body speed", context.document.body.dataset.gameSpeed === "5");
check("x5 click marks button pressed", speedButtons[2]["aria-pressed"] === "true");

elements.get("titleStartGame").click();
listeners.get("game:mousedown")?.({ clientX: 640, clientY: 270, buttons: 1 });
for (let frame = 0; frame < 20; frame += 1) {
  rafCallback(1000 + frame * 50);
}
check("x5 advances run HUD speed", elements.get("runHud").textContent.includes("Speed x5"));
check("x5 advances elapsed game time", elements.get("runHud").textContent.includes("Time 0:05"));

if (process.exitCode) {
  console.error("\nSpeed control verification failed.");
  process.exit(process.exitCode);
}

console.log("\nSpeed control click path verified.");
