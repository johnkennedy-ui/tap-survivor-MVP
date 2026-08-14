import { readFileSync } from "node:fs";
import vm from "node:vm";

import { createGameHarness } from "./smoke-game-harness.mjs";

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

const balanceRuntimeSource = readFileSync(new URL("../src/balance-runtime.js", import.meta.url), "utf8");

function balanceProviderErrorSnapshot(callback) {
  try {
    callback();
  } catch (error) {
    return {
      code: error?.code || "",
      missing: Array.isArray(error?.missing) ? error.missing : [],
      name: error?.name || "",
    };
  }
  return { code: "", missing: [], name: "" };
}

function createMapStorage(entries = {}) {
  const store = new Map(Object.entries(entries));
  return {
    getItem(key) {
      return store.get(key) || null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, value);
    },
    store,
  };
}

function createProviderContent() {
  return {
    bossAbilities: {},
    bossConfig: {},
    enemyTypes: [],
    levels: [],
    maps: [],
    relics: [],
    shopItems: [],
    tuning: { loot: {}, shop: {} },
    weapons: { spark_bolt: { damage: 12 } },
  };
}

function createProviderProfiles() {
  return [
    { overrides: {}, profileId: "default" },
    {
      overrides: {
        weapons: {
          spark_bolt: { damage: 18 },
        },
      },
      profileId: "testing",
    },
  ];
}

function createThrowingStorage() {
  const fail = () => {
    throw new Error("Storage unavailable");
  };
  return {
    getItem: fail,
    removeItem: fail,
    setItem: fail,
  };
}

function createBalanceVmContext() {
  let contentReads = 0;
  let locationReads = 0;
  let profileReads = 0;
  let storageReads = 0;
  let publishedContent;
  const context = { console };
  Object.defineProperties(context, {
    TapSurvivorBalanceProfiles: {
      configurable: true,
      get() {
        profileReads += 1;
        throw new Error("Forbidden TapSurvivorBalanceProfiles global read");
      },
    },
    TapSurvivorContent: {
      configurable: true,
      get() {
        contentReads += 1;
        throw new Error("Forbidden TapSurvivorContent global read");
      },
      set(value) {
        publishedContent = value;
      },
    },
    localStorage: {
      configurable: true,
      get() {
        storageReads += 1;
        throw new Error("Forbidden direct localStorage global read");
      },
    },
    location: {
      configurable: true,
      get() {
        locationReads += 1;
        throw new Error("Forbidden direct location global read");
      },
    },
  });
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(balanceRuntimeSource, context, { filename: "src/balance-runtime.js" });

  return {
    context,
    counts: () => ({ contentReads, locationReads, profileReads, storageReads }),
    publishedContent: () => publishedContent,
  };
}

function balanceProviderLifecycleSnapshot() {
  const vmContext = createBalanceVmContext();
  const { context } = vmContext;
  const publisher = context.TapSurvivorBalanceRuntime;
  const debugPublisher = publisher;
  const unconfiguredContent = balanceProviderErrorSnapshot(() => publisher.content());
  const unconfiguredProfiles = balanceProviderErrorSnapshot(() => debugPublisher.listProfiles());
  const providerContent = createProviderContent();
  const providerProfiles = createProviderProfiles();
  const explicitStorage = createMapStorage({
    "tapSurvivor.balanceOverrides": JSON.stringify({
      weapons: {
        spark_bolt: { damage: 99 },
      },
    }),
    "tapSurvivor.balanceProfile": "default",
  });
  const missingProfiles = balanceProviderErrorSnapshot(() =>
    publisher.configureDefaultProviders({ content: providerContent })
  );
  publisher.configureDefaultProviders({
    content: providerContent,
    profiles: providerProfiles,
    profileSearch: () => "?balance=test%69ng",
    storage: explicitStorage,
  });
  const explicitStorageLoad = {
    activeProfile: publisher.getActiveProfile(),
    damage: publisher.content().weapons.spark_bolt.damage,
  };
  publisher.configureDefaultProviders({
    content: providerContent,
    profiles: providerProfiles,
    profileSearch: () => "?balance=default",
  });
  debugPublisher.applyOverrides({
    weapons: {
      spark_bolt: { damage: 99 },
    },
  });
  const repeatedConfiguration = {
    activeProfile: publisher.getActiveProfile(),
    damage: publisher.content().weapons.spark_bolt.damage,
  };
  debugPublisher.setProfile("testing");
  const omittedStoragePreserved = explicitStorage.store.get("tapSurvivor.balanceProfile") === "testing";
  debugPublisher.applyOverrides({
    weapons: {
      spark_bolt: { damage: 99 },
    },
  });
  publisher.configureDefaultProviders({
    content: providerContent,
    profiles: providerProfiles,
    storage: createThrowingStorage(),
  });
  debugPublisher.saveOverrides();
  const recoveredStorage = createMapStorage();
  publisher.configureDefaultProviders({ content: providerContent, profiles: providerProfiles, storage: recoveredStorage });
  debugPublisher.saveOverrides();
  const recoveredOverrideSaved = recoveredStorage.store.has("tapSurvivor.balanceOverrides");
  debugPublisher.clearOverrides();
  const recoveredOverrideCleared = !recoveredStorage.store.has("tapSurvivor.balanceOverrides");
  const counts = vmContext.counts();

  return {
    activeProfileAfterClear: publisher.getActiveProfile(),
    contentReads: counts.contentReads,
    debugIdentity: context.TapSurvivorBalanceRuntime === debugPublisher,
    explicitStorageLoad,
    locationReads: counts.locationReads,
    missingProfiles,
    omittedStoragePreserved,
    profileReads: counts.profileReads,
    publishedContentIsProvider: vmContext.publishedContent() === providerContent,
    recoveredOverrideCleared,
    recoveredOverrideSaved,
    repeatedConfiguration,
    runtimeContentIsProvider: publisher.content() === providerContent,
    runtimeIdentity: context.TapSurvivorBalanceRuntime === publisher,
    storageReads: counts.storageReads,
    unconfiguredContent,
    unconfiguredProfiles,
  };
}

function unavailableStorageSnapshot(storage) {
  const vmContext = createBalanceVmContext();
  const { context } = vmContext;
  const publisher = context.TapSurvivorBalanceRuntime;
  const profiles = createProviderProfiles();
  const providers = { content: createProviderContent(), profiles };
  if (storage !== undefined) providers.storage = storage;
  publisher.configureDefaultProviders(providers);
  const debugPublisher = publisher;
  const initialProfile = debugPublisher.getActiveProfile();
  debugPublisher.setProfile("testing");
  debugPublisher.applyOverrides({
    weapons: {
      spark_bolt: { damage: 99 },
    },
  });
  debugPublisher.saveOverrides();
  debugPublisher.clearOverrides();
  return {
    activeProfile: debugPublisher.getActiveProfile(),
    initialProfile,
    locationReads: vmContext.counts().locationReads,
    storageReads: vmContext.counts().storageReads,
  };
}

function profileSearchFallbackSnapshot(profileSearch, storageEntries = {}) {
  const vmContext = createBalanceVmContext();
  const { context } = vmContext;
  const publisher = context.TapSurvivorBalanceRuntime;
  const providers = {
    content: createProviderContent(),
    profiles: createProviderProfiles(),
    storage: createMapStorage(storageEntries),
  };
  if (profileSearch !== undefined) providers.profileSearch = profileSearch;
  publisher.configureDefaultProviders(providers);
  const counts = vmContext.counts();
  return {
    activeProfile: publisher.getActiveProfile(),
    locationReads: counts.locationReads,
  };
}

const providerLifecycle = balanceProviderLifecycleSnapshot();
check(
  "balance runtime rejects unconfigured content and profile APIs with the named provider error",
  [providerLifecycle.unconfiguredContent, providerLifecycle.unconfiguredProfiles].every(
    (error) =>
      error.name === "TapSurvivorBalanceProviderError" &&
      error.code === "TAP_SURVIVOR_BALANCE_PROVIDER_MISSING" &&
      error.missing.join(",") === "content,profiles"
  )
);
check(
  "balance runtime rejects a missing profiles provider with the named provider error",
  providerLifecycle.missingProfiles.name === "TapSurvivorBalanceProviderError" &&
    providerLifecycle.missingProfiles.code === "TAP_SURVIVOR_BALANCE_PROVIDER_MISSING" &&
    providerLifecycle.missingProfiles.missing.join(",") === "profiles"
);
check(
  "balance runtime leaves poisoned content, profile, and location globals unread",
  providerLifecycle.contentReads === 0 &&
    providerLifecycle.locationReads === 0 &&
    providerLifecycle.profileReads === 0
);
check(
  "explicit decoded profile search wins over stored profile and preserves overrides",
  providerLifecycle.explicitStorageLoad.activeProfile === "testing" &&
    providerLifecycle.explicitStorageLoad.damage === 99 &&
    providerLifecycle.storageReads === 0
);
check(
  "balance runtime recovers the same runtime and debug publishers after configuration",
  providerLifecycle.runtimeIdentity &&
    providerLifecycle.debugIdentity &&
    providerLifecycle.runtimeContentIsProvider &&
    providerLifecycle.publishedContentIsProvider
);
check(
  "balance runtime same-reference configuration preserves profile and overrides when profile search changes",
  providerLifecycle.repeatedConfiguration.activeProfile === "testing" &&
    providerLifecycle.repeatedConfiguration.damage === 99 &&
    providerLifecycle.activeProfileAfterClear === "testing"
);
check(
  "omitted storage preserves the explicit capability and recovered replacement persists then clears overrides",
  providerLifecycle.omittedStoragePreserved &&
    providerLifecycle.recoveredOverrideSaved &&
    providerLifecycle.recoveredOverrideCleared
);

const unavailableStorageSnapshots = [
  unavailableStorageSnapshot(undefined),
  unavailableStorageSnapshot(null),
  unavailableStorageSnapshot(createThrowingStorage()),
];
check(
  "omitted, null, and throwing storage retain in-memory behavior without global reads",
  unavailableStorageSnapshots.every(
    (snapshot) =>
      snapshot.initialProfile === "default" &&
      snapshot.activeProfile === "testing" &&
      snapshot.locationReads === 0 &&
      snapshot.storageReads === 0
  )
);

const profileSearchFallbackSnapshots = [
  profileSearchFallbackSnapshot(undefined, { "tapSurvivor.balanceProfile": "testing" }),
  profileSearchFallbackSnapshot(() => "", { "tapSurvivor.balanceProfile": "testing" }),
  profileSearchFallbackSnapshot(() => "?balance=", { "tapSurvivor.balanceProfile": "testing" }),
  profileSearchFallbackSnapshot(() => ""),
];
check(
  "absent and empty injected profile search retain stored-profile then default fallback",
  profileSearchFallbackSnapshots[0].activeProfile === "testing" &&
    profileSearchFallbackSnapshots[1].activeProfile === "testing" &&
    profileSearchFallbackSnapshots[2].activeProfile === "testing" &&
    profileSearchFallbackSnapshots[3].activeProfile === "default" &&
    profileSearchFallbackSnapshots.every((snapshot) => snapshot.locationReads === 0)
);

const defaultHarness = createGameHarness({ fakeCombat: true });
check("default runtime uses default balance profile", defaultHarness.context.TapSurvivorBalanceRuntime.getActiveProfile() === "default");
const producerProfiles = Object.getOwnPropertyDescriptor(
  defaultHarness.context.TapSurvivorContent,
  "balanceProfiles"
);
check(
  "classic content producer carries the exact profiles value on a non-enumerable property",
  producerProfiles?.enumerable === false &&
    producerProfiles.value === defaultHarness.context.TapSurvivorContent.balanceProfiles
);
check(
  "classic harness receives configured runtime content through the producer seam",
  defaultHarness.context.TapSurvivorBalanceRuntime.content() === defaultHarness.context.TapSurvivorContent
);

const queryHarness = createGameHarness({
  search: "?balance=dev-fast",
  storageEntries: {
    "tapSurvivor.balanceProfile": "testing",
  },
});
queryHarness.elements.get("titleStartGame").click();
const queryGame = queryHarness.context.__tapSurvivorHarness.getGame();
check("query balance profile is selected before next run", queryHarness.context.TapSurvivorBalanceRuntime.getActiveProfile() === "dev-fast");
check("query profile is visible on next run state", queryGame.activeBalanceProfile === undefined || queryHarness.context.TapSurvivorContent.activeBalanceProfile === "dev-fast");

const storageHarness = createGameHarness({
  storageEntries: {
    "tapSurvivor.balanceProfile": "testing",
  },
});
check("localStorage balance profile is selected", storageHarness.context.TapSurvivorBalanceRuntime.getActiveProfile() === "testing");

const fallbackHarness = createGameHarness({
  storageEntries: {
    "tapSurvivor.balanceProfile": "missing-profile",
  },
});
check("unknown profile falls back safely", fallbackHarness.context.TapSurvivorBalanceRuntime.getActiveProfile() === "default");

const recoveryHarness = createGameHarness({
  storageEntries: {
    "tapSurvivor.balanceProfile": "testing",
  },
});
const recoveryContext = recoveryHarness.context;
const recoveredGlobalStorage = recoveryContext.localStorage;
recoveryContext.localStorage = createThrowingStorage();
recoveryContext.TapSurvivorBalanceRuntime.setProfile("testing");
recoveryContext.localStorage = recoveredGlobalStorage;
recoveryContext.TapSurvivorBalanceRuntime.applyOverrides({
  weapons: {
    spark_bolt: { damage: 99 },
  },
});
recoveryContext.TapSurvivorBalanceRuntime.saveOverrides();
const recoveredGlobalOverrideSaved = recoveredGlobalStorage.store.has("tapSurvivor.balanceOverrides");
recoveryContext.TapSurvivorBalanceRuntime.clearOverrides();
check(
  "classic dependency bag re-resolves recovered injected globalRef storage",
  recoveryContext.TapSurvivorBalanceRuntime.getActiveProfile() === "testing" &&
    recoveredGlobalOverrideSaved &&
    !recoveredGlobalStorage.store.has("tapSurvivor.balanceOverrides")
);

const overrideHarness = createGameHarness({ fakeCombat: true });
const debugBalance = overrideHarness.context.TapSurvivorBalanceRuntime;
debugBalance.applyOverrides({
  weapons: {
    spark_bolt: {
      damage: 99,
    },
  },
  enemies: {
    drifter: {
      hp: 77,
    },
  },
  shopItems: {
    training_boots: {
      cost: 11,
    },
  },
  tuning: {
    loot: {
      normalCoinBaseValue: 5,
    },
  },
});

const resolved = overrideHarness.context.TapSurvivorContent;
check("local override changes weapon value", resolved.weapons.spark_bolt.damage === 99);
check("local override changes enemy value", resolved.enemyTypes.find((enemy) => enemy.id === "drifter")?.hp === 77);
check("local override changes shop value", resolved.shopItems.find((item) => item.id === "training_boots")?.cost === 11);
check("local override changes loot tuning", resolved.tuning.loot.normalCoinBaseValue === 5);
check("local override exports without persistence", !overrideHarness.context.localStorage.store.has("tapSurvivor.balanceOverrides"));

let unknownTargetFailed = false;
try {
  debugBalance.applyOverrides({
    weapons: {
      missing_weapon: {
        damage: 1,
      },
    },
  });
} catch {
  unknownTargetFailed = true;
}
check("unknown override target fails safely", unknownTargetFailed);

debugBalance.clearOverrides();
check("clear overrides restores default weapon value", overrideHarness.context.TapSurvivorContent.weapons.spark_bolt.damage === 12);

if (process.exitCode) {
  console.error("\nBalance runtime smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nBalance runtime smoke passed.");
