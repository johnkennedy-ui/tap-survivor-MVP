import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = new URL("..", import.meta.url).pathname;
const content = JSON.parse(readFileSync(join(root, "content/tap-survivor-content.json"), "utf8"));
const questsSource = readFileSync(join(root, "src/quests.js"), "utf8");
const storageSource = readFileSync(join(root, "src/storage-adapter.js"), "utf8");
const saveDefaultsSource = readFileSync(join(root, "src/save-defaults.js"), "utf8");
const gameDependenciesSource = readFileSync(join(root, "src/game-dependencies.js"), "utf8");
const saveMigrationsSource = readFileSync(join(root, "src/save-migrations.js"), "utf8");
const saveNormalizeSource = readFileSync(join(root, "src/save-normalize.js"), "utf8");
const saveCorruptionSource = readFileSync(join(root, "src/save-corruption.js"), "utf8");
const saveSource = readFileSync(join(root, "src/save.js"), "utf8");

const storage = new Map();
let retiredSaveDefaultsReads = 0;
let retiredSaveMigrationsReads = 0;
let retiredSaveNormalizeReads = 0;
let retiredSaveCorruptionReads = 0;
const context = {
  console,
  localStorage: {
    getItem(key) {
      return storage.get(key) || null;
    },
    setItem(key, value) {
      storage.set(key, value);
    },
    removeItem(key) {
      storage.delete(key);
    },
  },
};
Object.defineProperty(context, "TapSurvivorSaveDefaults", {
  configurable: true,
  get() {
    retiredSaveDefaultsReads += 1;
    throw new Error("Forbidden TapSurvivorSaveDefaults global read");
  },
});
Object.defineProperty(context, "TapSurvivorSaveMigrations", {
  configurable: true,
  get() {
    retiredSaveMigrationsReads += 1;
    throw new Error("Forbidden TapSurvivorSaveMigrations global read");
  },
});
Object.defineProperty(context, "TapSurvivorSaveNormalize", {
  configurable: true,
  get() {
    retiredSaveNormalizeReads += 1;
    throw new Error("Forbidden TapSurvivorSaveNormalize global read");
  },
});
Object.defineProperty(context, "TapSurvivorSaveCorruption", {
  configurable: true,
  get() {
    retiredSaveCorruptionReads += 1;
    throw new Error("Forbidden TapSurvivorSaveCorruption global read");
  },
});
vm.createContext(context);
vm.runInContext(questsSource, context);
vm.runInContext(storageSource, context);
vm.runInContext(saveDefaultsSource, context);
vm.runInContext(gameDependenciesSource, context);
vm.runInContext(saveMigrationsSource, context);
vm.runInContext(saveNormalizeSource, context);
vm.runInContext(saveCorruptionSource, context);
vm.runInContext(saveSource, context);

const dependencyGlobalRef = new Proxy(
  {
    TapSurvivorInput: { bindMovementInput() {} },
  },
  {
    get(target, name) {
      return name in target ? target[name] : {};
    },
  }
);
const dependencyBag = context.TapSurvivorGameDependencies.createGameDependencyBag({
  globalRef: dependencyGlobalRef,
  documentRef: {},
});
const saveDefaults = dependencyBag.saveDefaults;
const saveMigrations = dependencyBag.saveMigrations;

const saveKey = "tap-survivor-mvp-save-v2";
const legacySaveKey = "tap-survivor-mvp-save-v1";
const corruptBackupKey = `${saveKey}-corrupt-backup`;
const storageAdapter = context.TapSurvivorStorage.createStorageAdapter({
  saveKey,
  legacySaveKey,
  corruptBackupKey,
});
const saveSystem = context.TapSurvivorSave.createSaveSystem({
  saveKey,
  legacySaveKey,
  saveDefaults,
  saveMigrations,
  starterQuestIds: content.questGroups.starter,
  questDefs: content.quests,
  weaponUnlocks: content.weaponUnlocks,
  upgradeDefs: [{ id: "laser_damage", opensQuest: "laser_damage_5000" }],
  shopItemDefs: content.shopItems,
  questOpenIds: context.TapSurvivorQuests.questOpenIds,
  storageAdapter,
});

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

const fresh = await saveSystem.loadSave();
check("fresh save starts with Spark Bolt", fresh.unlockedWeapons.includes("spark_bolt"));
check("fresh save opens starter quests", content.questGroups.starter.every((id) => fresh.activeQuests.includes(id)));
check("web save backend is localStorage", storageAdapter.getStorageBackendName() === "localStorage");

storage.set(legacySaveKey, JSON.stringify({
  coins: 12.8,
  unlockedWeapons: [],
  completedQuests: ["gatherer"],
  unlockedNodes: ["unlock_laser"],
  unlockedUpgrades: ["laser_damage"],
  shopPurchases: {
    training_boots: 99,
    missing_item: 2,
  },
}));

const migrated = await saveSystem.loadSave();
const trainingBoots = content.shopItems.find((item) => item.id === "training_boots");
check("legacy save is normalized", migrated.coins === 12 && migrated.unlockedWeapons.includes("spark_bolt"));
check("save version is current", migrated.saveVersion === 3);
check("seen banners normalize", Array.isArray(migrated.seenBanners));
check("shop purchases clamp to content tiers", migrated.shopPurchases.training_boots === trainingBoots.maxTier);
check("missing shop purchases are removed", migrated.shopPurchases.missing_item === undefined);
check("completed quest follow-ups reopen", migrated.activeQuests.includes("rapid_growth") && migrated.activeQuests.includes("gem_hoarder"));
check("unlock-opened quests reopen", migrated.activeQuests.includes("use_laser_run"));
check("legacy unlocked upgrades become tiers", migrated.upgradeTiers.laser_damage === 1);
check("upgrade-opened quests reopen", migrated.activeQuests.includes("laser_damage_5000"));

await saveSystem.persist(migrated);
const persisted = JSON.parse(storage.get(saveKey));
check("persist writes current save key", persisted.unlockedUpgrades.includes("laser_damage"));

await saveSystem.removeSave();
check("reset removes current save key", !storage.has(saveKey));
check("reset removes legacy save key", !storage.has(legacySaveKey));

storage.set(saveKey, "{broken json");
const corrupt = await saveSystem.loadSave();
check("corrupt save falls back to default", corrupt.unlockedWeapons.includes("spark_bolt"));
check("corrupt save warning is exposed", saveSystem.getLastLoadWarning() === "corrupt-save");
check("corrupt save raw is backed up", storage.get(corruptBackupKey) === "{broken json");

storage.set(saveKey, JSON.stringify({
  saveVersion: 3,
  coins: -10,
  towerFloor: 0,
  unlockedWeapons: "laser",
  unlockedNodes: {},
  upgradeTiers: [],
  unlockedUpgrades: "laser_damage",
  shopPurchases: "bad",
  seenBanners: {},
  unlockedRelics: {},
  equippedRelics: {},
  activeQuests: {},
  completedQuests: {},
  questProgress: [],
}));
const partial = await saveSystem.loadSave();
check("partial save normalizes coins", partial.coins === 0);
check("partial save normalizes tower floor", partial.towerFloor === 1);
check("partial save restores default weapon", partial.unlockedWeapons.includes("spark_bolt"));
check("partial save normalizes arrays", Array.isArray(partial.activeQuests) && Array.isArray(partial.completedQuests));
check("partial save normalizes objects", typeof partial.upgradeTiers === "object" && !Array.isArray(partial.upgradeTiers));

storage.set(saveKey, JSON.stringify({
  saveVersion: 1,
  coins: 4,
  completedQuests: ["gatherer"],
  unlockedUpgrades: ["laser_damage"],
}));
const oldVersion = await saveSystem.loadSave();
check("old save migrates to current version", oldVersion.saveVersion === 3);
check("old save migration adds shop purchases", oldVersion.shopPurchases && typeof oldVersion.shopPurchases === "object");
check("old save migration adds seen banners", Array.isArray(oldVersion.seenBanners));

storage.set(saveKey, JSON.stringify({
  saveVersion: 99,
  coins: 7,
  futureField: { keep: true },
}));
const future = await saveSystem.loadSave();
check("future save version is normalized current", future.saveVersion === 3);
check("future unknown fields are preserved", future.futureField?.keep === true);

let throwingRetiredSaveDefaultsReads = 0;
let throwingRetiredSaveMigrationsReads = 0;
let throwingRetiredSaveNormalizeReads = 0;
let throwingRetiredSaveCorruptionReads = 0;
const throwingContext = {
  console,
  localStorage: {
    getItem() {
      throw new Error("storage disabled");
    },
    setItem() {
      throw new Error("storage disabled");
    },
    removeItem() {
      throw new Error("storage disabled");
    },
  },
};
Object.defineProperty(throwingContext, "TapSurvivorSaveDefaults", {
  configurable: true,
  get() {
    throwingRetiredSaveDefaultsReads += 1;
    throw new Error("Forbidden TapSurvivorSaveDefaults global read");
  },
});
Object.defineProperty(throwingContext, "TapSurvivorSaveMigrations", {
  configurable: true,
  get() {
    throwingRetiredSaveMigrationsReads += 1;
    throw new Error("Forbidden TapSurvivorSaveMigrations global read");
  },
});
Object.defineProperty(throwingContext, "TapSurvivorSaveNormalize", {
  configurable: true,
  get() {
    throwingRetiredSaveNormalizeReads += 1;
    throw new Error("Forbidden TapSurvivorSaveNormalize global read");
  },
});
Object.defineProperty(throwingContext, "TapSurvivorSaveCorruption", {
  configurable: true,
  get() {
    throwingRetiredSaveCorruptionReads += 1;
    throw new Error("Forbidden TapSurvivorSaveCorruption global read");
  },
});
vm.createContext(throwingContext);
vm.runInContext(questsSource, throwingContext);
vm.runInContext(storageSource, throwingContext);
vm.runInContext(saveDefaultsSource, throwingContext);
vm.runInContext(gameDependenciesSource, throwingContext);
vm.runInContext(saveMigrationsSource, throwingContext);
vm.runInContext(saveNormalizeSource, throwingContext);
vm.runInContext(saveCorruptionSource, throwingContext);
vm.runInContext(saveSource, throwingContext);
const throwingDependencyGlobalRef = new Proxy(
  {
    TapSurvivorInput: { bindMovementInput() {} },
  },
  {
    get(target, name) {
      return name in target ? target[name] : {};
    },
  }
);
const throwingDependencyBag = throwingContext.TapSurvivorGameDependencies.createGameDependencyBag({
  globalRef: throwingDependencyGlobalRef,
  documentRef: {},
});

const throwingAdapter = throwingContext.TapSurvivorStorage.createStorageAdapter({
  saveKey,
  legacySaveKey,
});
const throwingSaveSystem = throwingContext.TapSurvivorSave.createSaveSystem({
  saveKey,
  legacySaveKey,
  saveDefaults: throwingDependencyBag.saveDefaults,
  saveMigrations: throwingDependencyBag.saveMigrations,
  starterQuestIds: content.questGroups.starter,
  questDefs: content.quests,
  weaponUnlocks: content.weaponUnlocks,
  upgradeDefs: [],
  shopItemDefs: content.shopItems,
  questOpenIds: throwingContext.TapSurvivorQuests.questOpenIds,
  storageAdapter: throwingAdapter,
});

const unavailableSave = await throwingSaveSystem.loadSave();
const unavailablePersisted = await throwingSaveSystem.persist(unavailableSave);
check("save defaults bridge publishes no retired global", !saveDefaultsSource.includes("globalThis.TapSurvivorSaveDefaults"));
check("save defaults are supplied by dependency bag", saveDefaults.CURRENT_SAVE_VERSION === 3);
check("save migrations bridge publishes no retired global", !saveMigrationsSource.includes("globalThis.TapSurvivorSaveMigrations"));
check(
  "save normalize bridge publishes no retired global",
  !saveNormalizeSource.includes("globalThis.TapSurvivorSaveNormalize")
);
check(
  "save corruption bridge publishes no retired global",
  !saveCorruptionSource.includes("globalThis.TapSurvivorSaveCorruption")
);
check(
  "classic save wrapper bundles retired helpers",
  saveSource.includes("function createSaveNormalizer") &&
    saveSource.includes("function createSaveLoadHandler") &&
    !saveSource.includes("globalThis.TapSurvivorSaveNormalize") &&
    !saveSource.includes("globalThis.TapSurvivorSaveCorruption")
);
check(
  "save migrations are supplied by dependency bag",
  typeof saveMigrations.isPlainObject === "function" && typeof saveMigrations.migrateSave === "function"
);
check(
  "retired save globals are never read",
  retiredSaveDefaultsReads === 0 &&
    throwingRetiredSaveDefaultsReads === 0 &&
    retiredSaveMigrationsReads === 0 &&
    throwingRetiredSaveMigrationsReads === 0 &&
    retiredSaveNormalizeReads === 0 &&
    throwingRetiredSaveNormalizeReads === 0 &&
    retiredSaveCorruptionReads === 0 &&
    throwingRetiredSaveCorruptionReads === 0
);
check("storage unavailable load returns default save", unavailableSave.unlockedWeapons.includes("spark_bolt"));
check("storage unavailable persist reports false", unavailablePersisted === false);
check("storage unavailable backend is controlled", throwingAdapter.getStorageBackendName() === "unavailable");

if (process.exitCode) {
  console.error("\nSave smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nSave smoke passed.");
