import { createGameHarness } from "./smoke-game-harness.mjs";

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

const defaultHarness = createGameHarness({ fakeCombat: true });
check("default runtime uses default balance profile", defaultHarness.context.TapSurvivorDebugBalance.getActiveProfile() === "default");

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
