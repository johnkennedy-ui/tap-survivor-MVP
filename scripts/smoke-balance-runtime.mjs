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

function balanceProviderLifecycleSnapshot() {
  let contentReads = 0;
  let profileReads = 0;
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
  });
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(balanceRuntimeSource, context, { filename: "src/balance-runtime.js" });

  const publisher = context.TapSurvivorBalanceRuntime;
  const debugPublisher = context.TapSurvivorDebugBalance;
  const unconfiguredContent = balanceProviderErrorSnapshot(() => publisher.content());
  const unconfiguredProfiles = balanceProviderErrorSnapshot(() => debugPublisher.listProfiles());
  const providerContent = {
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
  const providerProfiles = [
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
  const missingProfiles = balanceProviderErrorSnapshot(() =>
    publisher.configureDefaultProviders({ content: providerContent })
  );
  publisher.configureDefaultProviders({ content: providerContent, profiles: providerProfiles });
  debugPublisher.setProfile("testing");
  debugPublisher.applyOverrides({
    weapons: {
      spark_bolt: { damage: 99 },
    },
  });
  publisher.configureDefaultProviders({ content: providerContent, profiles: providerProfiles });
  const repeatedConfiguration = {
    activeProfile: publisher.getActiveProfile(),
    damage: publisher.content().weapons.spark_bolt.damage,
  };
  debugPublisher.clearOverrides();

  return {
    activeProfileAfterClear: publisher.getActiveProfile(),
    contentReads,
    debugIdentity: context.TapSurvivorDebugBalance === debugPublisher,
    missingProfiles,
    profileReads,
    publishedContentIsProvider: publishedContent === providerContent,
    repeatedConfiguration,
    runtimeContentIsProvider: publisher.content() === providerContent,
    runtimeIdentity: context.TapSurvivorBalanceRuntime === publisher,
    unconfiguredContent,
    unconfiguredProfiles,
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
  "balance runtime leaves poisoned content and profiles globals unread",
  providerLifecycle.contentReads === 0 && providerLifecycle.profileReads === 0
);
check(
  "balance runtime recovers the same runtime and debug publishers after configuration",
  providerLifecycle.runtimeIdentity &&
    providerLifecycle.debugIdentity &&
    providerLifecycle.runtimeContentIsProvider &&
    providerLifecycle.publishedContentIsProvider
);
check(
  "balance runtime same-reference configuration preserves profile and overrides",
  providerLifecycle.repeatedConfiguration.activeProfile === "testing" &&
    providerLifecycle.repeatedConfiguration.damage === 99 &&
    providerLifecycle.activeProfileAfterClear === "testing"
);

const defaultHarness = createGameHarness({ fakeCombat: true });
check("default runtime uses default balance profile", defaultHarness.context.TapSurvivorDebugBalance.getActiveProfile() === "default");
const producerProfiles = Object.getOwnPropertyDescriptor(
  defaultHarness.context.TapSurvivorContent,
  "balanceProfiles"
);
check(
  "classic content producer carries the exact profiles value on a non-enumerable property",
  producerProfiles?.enumerable === false &&
    producerProfiles.value === defaultHarness.context.TapSurvivorBalanceProfiles
);
check(
  "classic harness receives configured runtime content through the producer seam",
  defaultHarness.context.TapSurvivorBalanceRuntime.content() === defaultHarness.context.TapSurvivorContent
);

const queryHarness = createGameHarness({ fakeCombat: true, search: "?balance=dev-fast" });
queryHarness.elements.get("titleStartGame").click();
const queryGame = queryHarness.context.__tapSurvivorHarness.getGame();
check("query balance profile is selected before next run", queryHarness.context.TapSurvivorDebugBalance.getActiveProfile() === "dev-fast");
check("query profile is visible on next run state", queryGame.activeBalanceProfile === undefined || queryHarness.context.TapSurvivorContent.activeBalanceProfile === "dev-fast");

const storageHarness = createGameHarness({
  fakeCombat: true,
  storageEntries: {
    "tapSurvivor.balanceProfile": "testing",
  },
});
check("localStorage balance profile is selected", storageHarness.context.TapSurvivorDebugBalance.getActiveProfile() === "testing");

const fallbackHarness = createGameHarness({
  fakeCombat: true,
  storageEntries: {
    "tapSurvivor.balanceProfile": "missing-profile",
  },
});
check("unknown profile falls back safely", fallbackHarness.context.TapSurvivorDebugBalance.getActiveProfile() === "default");

const overrideHarness = createGameHarness({ fakeCombat: true });
const debugBalance = overrideHarness.context.TapSurvivorDebugBalance;
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
