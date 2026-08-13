import { createGameHarness } from "./smoke-game-harness.mjs";

const harness = createGameHarness();
const { dependencies, elements } = harness;
const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

Object.defineProperty(globalThis, "document", {
  configurable: true,
  value: harness.context.document,
  writable: true,
});

try {
  elements.get("titleStartGame").click();

  const bossRun = dependencies.getGame();
  bossRun.awaitingFirstMoveInput = false;
  bossRun.elapsed = bossRun.duration;
  bossRun.spawnTimer = Number.MAX_SAFE_INTEGER;
  elements.get("relicChoice").classList.add("hidden");

  dependencies.runUpdater.update(0);

  const boss = bossRun.enemies.find((enemy) => enemy.boss);
  boss.hp = 0;
  bossRun.weaponTimers.spark_bolt = Number.MAX_SAFE_INTEGER;
  dependencies.runUpdater.update(0);

  const relicChoices = elements.get("relicChoices");
  const relicChoiceVisible = !elements.get("relicChoice").classList.contains("hidden");
  const relicChoice = relicChoices.children[0];

  check(
    "boss clear routes through the bound run lifecycle and opens a real relic choice",
    bossRun.paused === true &&
      bossRun.pauseReason === "relic" &&
      relicChoiceVisible &&
      relicChoices.children.length > 0
  );

  relicChoice?.click();

  const savedAfterChoice = JSON.parse(harness.context.localStorage.store.get("tap-survivor-mvp-save-v2"));
  const completedRun = dependencies.getGame();
  check(
    "choosing a relic persists floor 2 and resets the cleared run",
    dependencies.getSave().towerFloor === 2 &&
      savedAfterChoice.towerFloor === 2 &&
      dependencies.getSave().unlockedRelics.length === 1 &&
      completedRun.towerFloor === 2 &&
      completedRun.lastFloorClear?.floor === 1
  );

  dependencies.shellUi.showTitleScreen();
  elements.get("titleStartGame").click();

  const freshRun = dependencies.getGame();
  check(
    "a fresh run is available on the newly unlocked floor",
    freshRun.running === true && freshRun.awaitingFirstMoveInput === true && freshRun.towerFloor === 2
  );
} finally {
  if (documentDescriptor) {
    Object.defineProperty(globalThis, "document", documentDescriptor);
  } else {
    delete globalThis.document;
  }
}

if (process.exitCode) {
  console.error("\nModule runtime relic lifecycle smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nModule runtime relic lifecycle smoke passed.");
