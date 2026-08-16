import { readFileSync } from "node:fs";

import { createRuntimeBalanceProvider } from "../src/modules/balance-runtime.js";
import { createGameHarness } from "./smoke-game-harness.mjs";

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

const balanceRuntimeSource = readFileSync(new URL("../src/balance-runtime.js", import.meta.url), "utf8");
const balanceRuntimeModuleSource = readFileSync(
  new URL("../src/modules/balance-runtime.js", import.meta.url),
  "utf8"
);

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

function balanceProviderLifecycleSnapshot() {
  const provider = createRuntimeBalanceProvider();
  const debugProvider = provider;
  const unconfiguredContent = balanceProviderErrorSnapshot(() => provider.content());
  const unconfiguredProfiles = balanceProviderErrorSnapshot(() => debugProvider.listProfiles());
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
    provider.configureDefaultProviders({ content: providerContent })
  );
  provider.configureDefaultProviders({
    content: providerContent,
    profiles: providerProfiles,
    profileSearch: () => "?balance=test%69ng",
    storage: explicitStorage,
  });
  const explicitStorageLoad = {
    activeProfile: provider.getActiveProfile(),
    damage: provider.content().weapons.spark_bolt.damage,
  };
  provider.configureDefaultProviders({
    content: providerContent,
    profiles: providerProfiles,
    profileSearch: () => "?balance=default",
  });
  debugProvider.applyOverrides({
    weapons: {
      spark_bolt: { damage: 99 },
    },
  });
  const repeatedConfiguration = {
    activeProfile: provider.getActiveProfile(),
    damage: provider.content().weapons.spark_bolt.damage,
  };
  debugProvider.setProfile("testing");
  const omittedStoragePreserved = explicitStorage.store.get("tapSurvivor.balanceProfile") === "testing";
  debugProvider.applyOverrides({
    weapons: {
      spark_bolt: { damage: 99 },
    },
  });
  provider.configureDefaultProviders({
    content: providerContent,
    profiles: providerProfiles,
    storage: createThrowingStorage(),
  });
  debugProvider.saveOverrides();
  const recoveredStorage = createMapStorage();
  provider.configureDefaultProviders({ content: providerContent, profiles: providerProfiles, storage: recoveredStorage });
  debugProvider.saveOverrides();
  const recoveredOverrideSaved = recoveredStorage.store.has("tapSurvivor.balanceOverrides");
  debugProvider.clearOverrides();
  const recoveredOverrideCleared = !recoveredStorage.store.has("tapSurvivor.balanceOverrides");

  return {
    activeProfileAfterClear: provider.getActiveProfile(),
    debugIdentity: provider === debugProvider,
    explicitStorageLoad,
    missingProfiles,
    omittedStoragePreserved,
    recoveredOverrideCleared,
    recoveredOverrideSaved,
    repeatedConfiguration,
    runtimeContentIsProvider: provider.content() === providerContent,
    runtimeIdentity: provider === debugProvider,
    unconfiguredContent,
    unconfiguredProfiles,
  };
}

function unavailableStorageSnapshot(storage) {
  const provider = createRuntimeBalanceProvider();
  const profiles = createProviderProfiles();
  const providers = { content: createProviderContent(), profiles };
  if (storage !== undefined) providers.storage = storage;
  provider.configureDefaultProviders(providers);
  const initialProfile = provider.getActiveProfile();
  provider.setProfile("testing");
  provider.applyOverrides({
    weapons: {
      spark_bolt: { damage: 99 },
    },
  });
  provider.saveOverrides();
  provider.clearOverrides();
  return {
    activeProfile: provider.getActiveProfile(),
    initialProfile,
  };
}

function profileSearchFallbackSnapshot(profileSearch, storageEntries = {}) {
  const provider = createRuntimeBalanceProvider();
  const providers = {
    content: createProviderContent(),
    profiles: createProviderProfiles(),
    storage: createMapStorage(storageEntries),
  };
  if (profileSearch !== undefined) providers.profileSearch = profileSearch;
  provider.configureDefaultProviders(providers);
  return {
    activeProfile: provider.getActiveProfile(),
  };
}

function sourceOwnedProviderSnapshot() {
  const content = createProviderContent();
  const publishedContent = [];
  const loggerCalls = { log: 0, table: 0 };
  const provider = createRuntimeBalanceProvider({
    logger: {
      log() {
        loggerCalls.log += 1;
      },
      table() {
        loggerCalls.table += 1;
      },
    },
    publishContent: (nextContent) => publishedContent.push(nextContent),
  });
  provider.configureDefaultProviders({
    content,
    profileSearch: () => "?balance=testing",
    profiles: createProviderProfiles(),
    storage: createMapStorage(),
  });
  provider.applyOverrides({
    weapons: {
      spark_bolt: { damage: 99 },
    },
  });
  const report = provider.printSummary();
  return {
    contentIsProvider: provider.content() === content,
    damage: content.weapons.spark_bolt.damage,
    loggerCalls,
    profile: provider.getActiveProfile(),
    publishedContent,
    report,
  };
}

const providerLifecycle = balanceProviderLifecycleSnapshot();
const sourceOwnedProvider = sourceOwnedProviderSnapshot();
check(
  "source-owned balance provider has no ambient global or classic publisher access",
  !/\b(?:globalThis|window)\b/u.test(balanceRuntimeModuleSource) &&
    !balanceRuntimeModuleSource.includes("TapSurvivorContent") &&
    !balanceRuntimeModuleSource.includes("TapSurvivorBalanceRuntime")
);
check(
  "source-owned balance provider publishes and logs only through explicit dependencies",
  sourceOwnedProvider.profile === "testing" &&
    sourceOwnedProvider.contentIsProvider &&
    sourceOwnedProvider.damage === 99 &&
    sourceOwnedProvider.publishedContent.length === 2 &&
    sourceOwnedProvider.publishedContent.every((content) => content === sourceOwnedProvider.publishedContent[0]) &&
    sourceOwnedProvider.loggerCalls.table === 1 &&
    sourceOwnedProvider.loggerCalls.log === 1 &&
    sourceOwnedProvider.report.activeProfile === "testing"
);
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
  "retired generated BalanceRuntime bridge has provenance without either former publisher",
  balanceRuntimeSource.includes("// GENERATED FILE.") &&
    balanceRuntimeSource.includes("// Source: src/modules/balance-runtime.js") &&
    balanceRuntimeSource.includes(
      "// Retired global: TapSurvivorBalanceRuntime. Exports are supplied through the game dependency bag."
    ) &&
    !balanceRuntimeSource.includes("globalThis.TapSurvivorBalanceRuntime") &&
    !balanceRuntimeSource.includes("globalThis.TapSurvivorContent")
);
check(
  "explicit decoded profile search wins over stored profile and preserves overrides",
  providerLifecycle.explicitStorageLoad.activeProfile === "testing" &&
    providerLifecycle.explicitStorageLoad.damage === 99
);
check(
  "balance runtime preserves direct provider identity after configuration",
  providerLifecycle.runtimeIdentity &&
    providerLifecycle.debugIdentity &&
    providerLifecycle.runtimeContentIsProvider
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
  "omitted, null, and throwing storage retain direct in-memory behavior",
  unavailableStorageSnapshots.every(
    (snapshot) =>
      snapshot.initialProfile === "default" &&
      snapshot.activeProfile === "testing"
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
    profileSearchFallbackSnapshots[3].activeProfile === "default"
);

const defaultHarness = createGameHarness({ fakeCombat: true });
const defaultBalance = defaultHarness.sourceGameDependencies.balanceRuntime;
check("default runtime uses the source-owned default balance profile", defaultBalance.getActiveProfile() === "default");
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
  "classic harness receives configured runtime content through explicit fallback injection",
  defaultBalance.content() === defaultHarness.fallbackContent &&
    defaultBalance.content() !== defaultHarness.context.TapSurvivorContent
);
defaultHarness.elements.get("toggleDebug").click();
check(
  "classic harness debug uses the direct provider while the retired namespace is poisoned then absent",
  defaultHarness.balanceRuntimePublisherProof.sourceDependencyBagHasBalanceRuntime &&
    defaultHarness.balanceRuntimePublisherProof.balanceRuntimePublisherPoisonRetained &&
    defaultHarness.balanceRuntimePublisherProof.balanceRuntimePublisherAbsentAfterBoot &&
    defaultHarness.balanceRuntimePublisherProof.balanceRuntimePublisherReads === 0 &&
    !Object.hasOwn(defaultHarness.context, "TapSurvivorBalanceRuntime") &&
    defaultHarness.context.__tapSurvivorHarness.getActiveBalanceProfile() === "default" &&
    defaultHarness.elements.get("debugStats").textContent.includes("Balance profile: default")
);

const queryHarness = createGameHarness({
  search: "?balance=dev-fast",
  storageEntries: {
    "tapSurvivor.balanceProfile": "testing",
  },
});
queryHarness.elements.get("titleStartGame").click();
const queryGame = queryHarness.context.__tapSurvivorHarness.getGame();
check(
  "query balance profile is selected before next run",
  queryHarness.sourceGameDependencies.balanceRuntime.getActiveProfile() === "dev-fast"
);
check(
  "query profile is visible on next run state",
  queryGame.activeBalanceProfile === undefined || queryHarness.fallbackContent.activeBalanceProfile === "dev-fast"
);

const storageHarness = createGameHarness({
  storageEntries: {
    "tapSurvivor.balanceProfile": "testing",
  },
});
check(
  "localStorage balance profile is selected",
  storageHarness.sourceGameDependencies.balanceRuntime.getActiveProfile() === "testing"
);

const fallbackHarness = createGameHarness({
  storageEntries: {
    "tapSurvivor.balanceProfile": "missing-profile",
  },
});
check(
  "unknown profile falls back safely",
  fallbackHarness.sourceGameDependencies.balanceRuntime.getActiveProfile() === "default"
);

const recoveryHarness = createGameHarness({
  storageEntries: {
    "tapSurvivor.balanceProfile": "testing",
  },
});
const recoveryContext = recoveryHarness.context;
const recoveryBalance = recoveryHarness.sourceGameDependencies.balanceRuntime;
const recoveredGlobalStorage = recoveryContext.localStorage;
recoveryContext.localStorage = createThrowingStorage();
recoveryBalance.setProfile("testing");
recoveryContext.localStorage = recoveredGlobalStorage;
recoveryBalance.applyOverrides({
  weapons: {
    spark_bolt: { damage: 99 },
  },
});
recoveryBalance.saveOverrides();
const recoveredGlobalOverrideSaved = recoveredGlobalStorage.store.has("tapSurvivor.balanceOverrides");
recoveryBalance.clearOverrides();
check(
  "classic dependency bag re-resolves recovered injected globalRef storage",
  recoveryBalance.getActiveProfile() === "testing" &&
    recoveredGlobalOverrideSaved &&
    !recoveredGlobalStorage.store.has("tapSurvivor.balanceOverrides")
);

const overrideHarness = createGameHarness({ fakeCombat: true });
const debugBalance = overrideHarness.sourceGameDependencies.balanceRuntime;
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

const resolved = overrideHarness.fallbackContent;
check("local override changes weapon value", resolved.weapons.spark_bolt.damage === 99);
check("local override changes enemy value", resolved.enemyTypes.find((enemy) => enemy.id === "drifter")?.hp === 77);
check("local override changes shop value", resolved.shopItems.find((item) => item.id === "training_boots")?.cost === 11);
check("local override changes loot tuning", resolved.tuning.loot.normalCoinBaseValue === 5);
check("local override exports without persistence", !overrideHarness.context.localStorage.store.has("tapSurvivor.balanceOverrides"));
check(
  "classic content publisher stays unchanged while injected content receives overrides",
  overrideHarness.context.TapSurvivorContent.weapons.spark_bolt.damage === 12
);

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
check("clear overrides restores default weapon value", overrideHarness.fallbackContent.weapons.spark_bolt.damage === 12);

if (process.exitCode) {
  console.error("\nBalance runtime smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nBalance runtime smoke passed.");
