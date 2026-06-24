import { createGameHarness } from "../scripts/smoke-game-harness.mjs";

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

function startRun(harness) {
  harness.elements.get("titleStartGame").click();
  harness.frame(1000);
}

const defaultHarness = createGameHarness({ fakeCombat: true });
startRun(defaultHarness);
const defaultGame = defaultHarness.context.__tapSurvivorHarness.getGame();
const defaultSave = defaultHarness.context.__tapSurvivorHarness.getSave();
check("default save selects Spark Bolt", defaultSave.selectedStartingWeapon === "spark_bolt");
check("default run starts with Spark Bolt", defaultGame.player.equippedWeapons[0] === "spark_bolt");

const loadoutHarness = createGameHarness({
  fakeCombat: true,
  initialSave: {
    saveVersion: 3,
    unlockedWeapons: ["spark_bolt", "lightning_staff"],
    selectedStartingWeapon: "spark_bolt",
  },
});

loadoutHarness.elements.get("menuInventoryTab").click();
const inventory = loadoutHarness.elements.get("menuRelicInventory");
const select = inventory.querySelector(".starting-weapon-select");
check("inventory exposes starting weapon selector", Boolean(select));
check(
  "Lightning Staff is selectable",
  select?.children?.some((option) => option.value === "lightning_staff")
);

select.value = "lightning_staff";
select.listeners.get("change")({ target: select });
const loadoutSave = loadoutHarness.context.__tapSurvivorHarness.getSave();
check("selector stores Lightning Staff", loadoutSave.selectedStartingWeapon === "lightning_staff");

startRun(loadoutHarness);
const lightningGame = loadoutHarness.context.__tapSurvivorHarness.getGame();
check(
  "Lightning Staff starts the next run",
  lightningGame.player.equippedWeapons[0] === "lightning_staff"
);

const lockedHarness = createGameHarness({
  fakeCombat: true,
  initialSave: {
    saveVersion: 3,
    unlockedWeapons: ["spark_bolt"],
    selectedStartingWeapon: "lightning_staff",
  },
});
startRun(lockedHarness);
const lockedSave = lockedHarness.context.__tapSurvivorHarness.getSave();
const lockedGame = lockedHarness.context.__tapSurvivorHarness.getGame();
check(
  "locked selected weapon normalizes to Spark Bolt",
  lockedSave.selectedStartingWeapon === "spark_bolt"
);
check(
  "locked selected weapon starts with Spark Bolt",
  lockedGame.player.equippedWeapons[0] === "spark_bolt"
);

if (process.exitCode) {
  console.error("\nStarting weapon loadout smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nStarting weapon loadout smoke passed.");
