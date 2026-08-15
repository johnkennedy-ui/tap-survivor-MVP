import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { content } from "../src/content.generated.mjs";
import { createSaveNormalizer } from "../src/modules/save-normalize.js";
import { questOpenIds } from "../src/modules/quests.js";
import { createStorageProvider } from "../src/modules/storage-adapter.js";

const root = new URL("..", import.meta.url).pathname;
const questsSource = readFileSync(join(root, "src/quests.js"), "utf8");
const nativeStorageSource = readFileSync(join(root, "src/modules/storage-adapter.js"), "utf8");
const storageSource = readFileSync(join(root, "src/storage-adapter.js"), "utf8");
const saveDefaultsSource = readFileSync(join(root, "src/save-defaults.js"), "utf8");
const gameDependenciesSource = readFileSync(join(root, "src/game-dependencies.js"), "utf8");
const saveMigrationsSource = readFileSync(join(root, "src/save-migrations.js"), "utf8");
const saveNormalizeSource = readFileSync(join(root, "src/save-normalize.js"), "utf8");
const saveCorruptionSource = readFileSync(join(root, "src/save-corruption.js"), "utf8");
const saveSource = readFileSync(join(root, "src/save.js"), "utf8");

const storage = new Map();
const localStorage = createStorageBackend(storage);
let retiredSaveDefaultsReads = 0;
let retiredSaveMigrationsReads = 0;
let retiredSaveNormalizeReads = 0;
let retiredSaveCorruptionReads = 0;
let retiredSavePublisherReads = 0;
const context = {
  console,
  localStorage,
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
Object.defineProperty(context, "TapSurvivorSave", {
  configurable: true,
  get() {
    retiredSavePublisherReads += 1;
    throw new Error("Forbidden TapSurvivorSave global read");
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

const isolatedSaveNormalizer = createSaveNormalizer({
  currentSaveVersion: 3,
  defaultSave: () => saveDefaults.createDefaultSave({ starterQuestIds: [] }),
  questDefs: content.quests,
  weaponUnlocks: content.weaponUnlocks,
  upgradeDefs: [{ id: "laser_damage", opensQuest: "laser_damage_5000" }],
  shopItemById: new Map(content.shopItems.map((item) => [item.id, item])),
  questOpenIds,
});

const normalizedQuestState = isolatedSaveNormalizer.normalizeSave({
  activeQuests: ["gatherer", "gatherer", "boss_hunter", "missing_quest"],
  completedQuests: ["gatherer", "spark_bolt_mastery", "spark_bolt_mastery", "missing_quest"],
  questProgress: {
    gatherer: 12,
    boss_hunter: -4,
    spark_bolt_mastery: 999,
    missing_quest: 42,
  },
  questPoints: 7,
  totalQuestPoints: 2,
});
const activeQuestSet = new Set(normalizedQuestState.activeQuests);
const completedQuestSet = new Set(normalizedQuestState.completedQuests);
check(
  "save normalizer keeps known quest IDs unique and disjoint",
  activeQuestSet.size === normalizedQuestState.activeQuests.length &&
    completedQuestSet.size === normalizedQuestState.completedQuests.length &&
    normalizedQuestState.activeQuests.every((id) => !completedQuestSet.has(id)) &&
    normalizedQuestState.activeQuests.every((id) => content.quests[id]) &&
    normalizedQuestState.completedQuests.every((id) => content.quests[id]),
);
check(
  "save normalizer preserves legitimate quest progress",
  normalizedQuestState.questProgress.gatherer === 12 &&
    normalizedQuestState.questProgress.boss_hunter === 0 &&
    normalizedQuestState.questProgress.spark_bolt_mastery === content.quests.spark_bolt_mastery.target &&
    normalizedQuestState.questProgress.missing_quest === undefined,
);
check(
  "save normalizer keeps available QP nonnegative and within earned QP",
  normalizedQuestState.questPoints === 7 && normalizedQuestState.totalQuestPoints === 7,
);
const nonNegativeQuestState = isolatedSaveNormalizer.normalizeSave({
  questPoints: -4,
  totalQuestPoints: -9,
});
check(
  "save normalizer clamps negative QP values",
  nonNegativeQuestState.questPoints === 0 && nonNegativeQuestState.totalQuestPoints === 0,
);

const saveKey = "tap-survivor-mvp-save-v2";
const legacySaveKey = "tap-survivor-mvp-save-v1";
const corruptBackupKey = `${saveKey}-corrupt-backup`;
const storagePublisher = context.TapSurvivorStorage;
storagePublisher.configureDefaultProviders({
  platformCapabilities: {
    getLocalStorage: () => localStorage,
    getPreferences: () => null,
  },
});
const storageAdapter = storagePublisher.createStorageAdapter({
  saveKey,
  legacySaveKey,
  corruptBackupKey,
});
const saveSystem = dependencyBag.save.createSaveSystem({
  saveKey,
  legacySaveKey,
  saveNormalize: dependencyBag.saveNormalize,
  saveCorruption: dependencyBag.saveCorruption,
  saveDefaults,
  saveMigrations,
  starterQuestIds: content.questGroups.starter,
  questDefs: content.quests,
  weaponUnlocks: content.weaponUnlocks,
  upgradeDefs: [{ id: "laser_damage", opensQuest: "laser_damage_5000" }],
  shopItemDefs: content.shopItems,
  questOpenIds,
  storageAdapter,
});

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

check(
  "retired quest publisher is absent from save bridge context",
  context.TapSurvivorQuests === undefined && !questsSource.includes("globalThis.TapSurvivorQuests =")
);

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
let throwingRetiredSavePublisherReads = 0;
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
Object.defineProperty(throwingContext, "TapSurvivorSave", {
  configurable: true,
  get() {
    throwingRetiredSavePublisherReads += 1;
    throw new Error("Forbidden TapSurvivorSave global read");
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

const throwingStoragePublisher = throwingContext.TapSurvivorStorage;
throwingStoragePublisher.configureDefaultProviders({
  platformCapabilities: {
    getLocalStorage: () => throwingContext.localStorage,
    getPreferences: () => null,
  },
});
const throwingAdapter = throwingStoragePublisher.createStorageAdapter({
  saveKey,
  legacySaveKey,
});
const throwingSaveSystem = throwingDependencyBag.save.createSaveSystem({
  saveKey,
  legacySaveKey,
  saveNormalize: throwingDependencyBag.saveNormalize,
  saveCorruption: throwingDependencyBag.saveCorruption,
  saveDefaults: throwingDependencyBag.saveDefaults,
  saveMigrations: throwingDependencyBag.saveMigrations,
  starterQuestIds: content.questGroups.starter,
  questDefs: content.quests,
  weaponUnlocks: content.weaponUnlocks,
  upgradeDefs: [],
  shopItemDefs: content.shopItems,
  questOpenIds,
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
  "classic save bridge retires its publisher for explicit dependency injection",
  saveSource.includes("function createSaveSystem") &&
    !saveSource.includes("globalThis.TapSurvivorSave =") &&
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
    throwingRetiredSaveCorruptionReads === 0 &&
    retiredSavePublisherReads === 0 &&
    throwingRetiredSavePublisherReads === 0
);
check("storage unavailable load returns default save", unavailableSave.unlockedWeapons.includes("spark_bolt"));
check("storage unavailable persist reports false", unavailablePersisted === false);
check("storage unavailable backend is controlled", throwingAdapter.getStorageBackendName() === "unavailable");

const guardedStorage = createStorageBackend();
const guardedPreferences = createPreferencesBackend();
let retiredCapacitorReads = 0;
let retiredLocalStorageReads = 0;
storagePublisher.configureDefaultProviders({
  platformCapabilities: {
    getLocalStorage: () => guardedStorage,
    getPreferences: () => guardedPreferences,
  },
});
Object.defineProperty(context, "Capacitor", {
  configurable: true,
  get() {
    retiredCapacitorReads += 1;
    throw new Error("Forbidden direct Capacitor global read");
  },
});
Object.defineProperty(context, "localStorage", {
  configurable: true,
  get() {
    retiredLocalStorageReads += 1;
    throw new Error("Forbidden direct localStorage global read");
  },
});
const guardedAdapter = storagePublisher.createStorageAdapter({ saveKey, legacySaveKey, corruptBackupKey });
const guardedSet = await guardedAdapter.setSaveRaw("preferences-current");
const guardedCurrent = await guardedAdapter.getSaveRaw();
guardedPreferences.values.delete(saveKey);
guardedPreferences.values.set(legacySaveKey, "preferences-legacy");
const guardedLegacy = await guardedAdapter.getSaveRaw();
const guardedBackup = await guardedAdapter.setCorruptBackupRaw("preferences-backup");
guardedStorage.setItem(saveKey, "local-current");
guardedStorage.setItem(legacySaveKey, "local-legacy");
const guardedRemove = await guardedAdapter.removeSaveRaw();
check(
  "preferences-first storage uses injected capabilities only",
  typeof storagePublisher.configureDefaultProviders === "function" &&
    guardedSet === true &&
    guardedCurrent === "preferences-current" &&
    guardedLegacy === "preferences-legacy" &&
    guardedBackup === true &&
    guardedPreferences.values.get(corruptBackupKey) === "preferences-backup" &&
    guardedAdapter.getStorageBackendName() === "capacitor-preferences" &&
    retiredCapacitorReads === 0 &&
    retiredLocalStorageReads === 0
);
check(
  "preference removal cleans local storage too",
  guardedRemove === true &&
    !guardedPreferences.values.has(saveKey) &&
    !guardedPreferences.values.has(legacySaveKey) &&
    !guardedStorage.values.has(saveKey) &&
    !guardedStorage.values.has(legacySaveKey)
);

const fallbackStorage = createStorageBackend();
const failingPreferences = {
  get() { throw new Error("preferences unavailable"); },
  remove() { throw new Error("preferences unavailable"); },
  set() { throw new Error("preferences unavailable"); },
};
storagePublisher.configureDefaultProviders({
  platformCapabilities: {
    getLocalStorage: () => fallbackStorage,
    getPreferences: () => failingPreferences,
  },
});
const fallbackAdapter = storagePublisher.createStorageAdapter({ saveKey, legacySaveKey, corruptBackupKey });
const fallbackSet = await fallbackAdapter.setSaveRaw("fallback-current");
const fallbackCurrent = await fallbackAdapter.getSaveRaw();
const fallbackBackup = await fallbackAdapter.setCorruptBackupRaw("fallback-backup");
const fallbackRemove = await fallbackAdapter.removeSaveRaw();
check(
  "preference failures fall back to local storage",
  fallbackSet === true &&
    fallbackCurrent === "fallback-current" &&
    fallbackBackup === true &&
    fallbackStorage.values.get(corruptBackupKey) === "fallback-backup" &&
    fallbackRemove === true &&
    !fallbackStorage.values.has(saveKey) &&
    !fallbackStorage.values.has(legacySaveKey)
);

let recoveredStorage = null;
storagePublisher.configureDefaultProviders({
  platformCapabilities: {
    getLocalStorage: () => recoveredStorage,
    getPreferences: () => null,
  },
});
const recoveringAdapter = storagePublisher.createStorageAdapter({ saveKey, legacySaveKey });
const missingRaw = recoveringAdapter.getSaveRaw();
const missingPersisted = recoveringAdapter.setSaveRaw("missing-current");
recoveredStorage = createStorageBackend();
const recoveredPersisted = recoveringAdapter.setSaveRaw("recovered-current");
const recoveredRaw = recoveringAdapter.getSaveRaw();
const configuredStorage = createStorageBackend();
const explicitStorage = createStorageBackend();
storagePublisher.configureDefaultProviders({
  platformCapabilities: { getLocalStorage: () => configuredStorage, getPreferences: () => null },
});
const explicitAdapter = storagePublisher.createStorageAdapter({
  saveKey,
  legacySaveKey,
  platformCapabilities: { getLocalStorage: () => explicitStorage, getPreferences: () => null },
});
const explicitPersisted = explicitAdapter.setSaveRaw("explicit-current");
check(
  "missing capabilities fail closed and later resolver availability recovers",
  missingRaw === null &&
    missingPersisted === false &&
    recoveredPersisted === true &&
    recoveredRaw === "recovered-current" &&
    recoveringAdapter.getStorageBackendName() === "localStorage"
);
check(
  "explicit platform capabilities override configured defaults",
  explicitPersisted === true &&
    explicitStorage.values.get(saveKey) === "explicit-current" &&
    !configuredStorage.values.has(saveKey)
);
check(
  "storage adapter removes direct platform global reads",
  !storageSource.includes("globalThis.Capacitor") && !storageSource.includes("globalThis.localStorage")
);

const sourceStorageParity = await storageProviderParitySnapshot(createStorageProvider());
const classicStorageParity = await storageProviderParitySnapshot(storagePublisher);
check(
  "source-owned and retained classic storage providers preserve the same public behavior",
  JSON.stringify(sourceStorageParity) === JSON.stringify(classicStorageParity)
);
check(
  "storage source owns the provider without an ambient classic global read",
  nativeStorageSource.includes("export function createStorageProvider") &&
    !nativeStorageSource.includes("TapSurvivorStorage") &&
    !nativeStorageSource.includes("globalThis")
);

if (process.exitCode) {
  console.error("\nSave smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nSave smoke passed.");

async function storageProviderParitySnapshot(storageProvider) {
  const currentKey = "storage-provider-current";
  const legacyKey = "storage-provider-legacy";
  const backupKey = "storage-provider-backup";
  const localStorage = createStorageBackend();
  const preferences = createPreferencesBackend();
  const providerSelfReturn =
    storageProvider.configureDefaultProviders({
      platformCapabilities: {
        getLocalStorage: () => localStorage,
        getPreferences: () => preferences,
      },
    }) === storageProvider;
  const preferencesAdapter = storageProvider.createStorageAdapter({
    saveKey: currentKey,
    legacySaveKey: legacyKey,
    corruptBackupKey: backupKey,
  });
  const preferencesSet = await preferencesAdapter.setSaveRaw("preferences-current");
  const preferencesCurrent = await preferencesAdapter.getSaveRaw();
  preferences.values.delete(currentKey);
  preferences.values.set(legacyKey, "preferences-legacy");
  const preferencesLegacy = await preferencesAdapter.getSaveRaw();
  const preferencesBackup = await preferencesAdapter.setCorruptBackupRaw("preferences-backup");
  localStorage.setItem(currentKey, "local-current");
  localStorage.setItem(legacyKey, "local-legacy");
  const preferencesRemove = await preferencesAdapter.removeSaveRaw();

  const fallbackStorage = createStorageBackend();
  const failingPreferences = {
    get() {
      throw new Error("preferences unavailable");
    },
    remove() {
      throw new Error("preferences unavailable");
    },
    set() {
      throw new Error("preferences unavailable");
    },
  };
  storageProvider.configureDefaultProviders({
    platformCapabilities: {
      getLocalStorage: () => fallbackStorage,
      getPreferences: () => failingPreferences,
    },
  });
  const fallbackAdapter = storageProvider.createStorageAdapter({
    saveKey: currentKey,
    legacySaveKey: legacyKey,
    corruptBackupKey: backupKey,
  });
  const fallbackSet = await fallbackAdapter.setSaveRaw("fallback-current");
  const fallbackCurrent = await fallbackAdapter.getSaveRaw();
  const fallbackBackup = await fallbackAdapter.setCorruptBackupRaw("fallback-backup");
  const fallbackRemove = await fallbackAdapter.removeSaveRaw();

  let recoveredStorage = null;
  storageProvider.configureDefaultProviders({
    platformCapabilities: {
      getLocalStorage: () => recoveredStorage,
      getPreferences: () => null,
    },
  });
  const recoveryAdapter = storageProvider.createStorageAdapter({
    saveKey: currentKey,
    legacySaveKey: legacyKey,
  });
  const unavailableRead = recoveryAdapter.getSaveRaw();
  const unavailableWrite = recoveryAdapter.setSaveRaw("unavailable-current");
  recoveredStorage = createStorageBackend();
  const recoveredWrite = recoveryAdapter.setSaveRaw("recovered-current");
  const recoveredRead = recoveryAdapter.getSaveRaw();

  const configuredStorage = createStorageBackend();
  const explicitStorage = createStorageBackend();
  storageProvider.configureDefaultProviders({
    platformCapabilities: {
      getLocalStorage: () => configuredStorage,
      getPreferences: () => null,
    },
  });
  const explicitAdapter = storageProvider.createStorageAdapter({
    saveKey: currentKey,
    legacySaveKey: legacyKey,
    platformCapabilities: {
      getLocalStorage: () => explicitStorage,
      getPreferences: () => null,
    },
  });
  const explicitWrite = explicitAdapter.setSaveRaw("explicit-current");
  const undefinedOverrideAdapter = storageProvider.createStorageAdapter({
    saveKey: currentKey,
    legacySaveKey: legacyKey,
    platformCapabilities: undefined,
  });
  const undefinedOverrideWrite = undefinedOverrideAdapter.setSaveRaw("undefined-current");

  return {
    explicitCapabilityOverride:
      explicitWrite === true &&
      explicitStorage.values.get(currentKey) === "explicit-current" &&
      !configuredStorage.values.has(currentKey),
    fallback:
      fallbackSet === true &&
      fallbackCurrent === "fallback-current" &&
      fallbackBackup === true &&
      fallbackStorage.values.get(backupKey) === "fallback-backup" &&
      fallbackRemove === true &&
      !fallbackStorage.values.has(currentKey) &&
      !fallbackStorage.values.has(legacyKey) &&
      fallbackAdapter.getStorageBackendName() === "localStorage" &&
      fallbackAdapter.getLastStorageError()?.operation === "preferences-remove",
    preferencesFirst:
      preferencesSet === true &&
      preferencesCurrent === "preferences-current" &&
      preferencesLegacy === "preferences-legacy" &&
      preferencesBackup === true &&
      preferences.values.get(backupKey) === "preferences-backup" &&
      preferencesRemove === true &&
      !preferences.values.has(currentKey) &&
      !preferences.values.has(legacyKey) &&
      !localStorage.values.has(currentKey) &&
      !localStorage.values.has(legacyKey) &&
      preferencesAdapter.getStorageBackendName() === "capacitor-preferences" &&
      preferencesAdapter.getLastStorageError() === null,
    providerMembers:
      typeof storageProvider.configureDefaultProviders === "function" &&
      typeof storageProvider.createStorageAdapter === "function" &&
      providerSelfReturn,
    unavailableRecovery:
      unavailableRead === null &&
      unavailableWrite === false &&
      recoveredWrite === true &&
      recoveredRead === "recovered-current" &&
      recoveryAdapter.getStorageBackendName() === "localStorage",
    undefinedCapabilityOverride:
      undefinedOverrideWrite === false &&
      undefinedOverrideAdapter.getStorageBackendName() === "unavailable" &&
      !configuredStorage.values.has(currentKey),
  };
}

function createPreferencesBackend(values = new Map()) {
  return {
    values,
    async get({ key }) { return { value: values.get(key) || null }; },
    async remove({ key }) { values.delete(key); },
    async set({ key, value }) { values.set(key, value); },
  };
}

function createStorageBackend(values = new Map()) {
  return {
    values,
    getItem(key) { return values.get(key) || null; },
    removeItem(key) { values.delete(key); },
    setItem(key, value) { values.set(key, value); },
  };
}
