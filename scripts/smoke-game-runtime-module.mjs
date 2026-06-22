import { createGameHarness } from "./smoke-game-harness.mjs";

const classicHarness = createGameHarness({ fakeCombat: true });
const moduleHarness = createGameHarness({ fakeCombat: true, gameRuntimeMode: "module" });

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

function startAndMove(harness) {
  harness.elements.get("titleStartGame").click();
  harness.frame(1000);
  harness.elements.get("game").listeners.get("mousedown")({
    clientX: 640,
    clientY: 270,
    buttons: 1,
  });
  harness.frame(1050);
}

check(
  "module harness uses module runtime controller",
  moduleHarness.context.TapSurvivorGameRuntime.createGameRuntimeController !==
    classicHarness.context.TapSurvivorGameRuntime.createGameRuntimeController
);

startAndMove(classicHarness);
startAndMove(moduleHarness);

const classicGame = classicHarness.context.__tapSurvivorHarness.getGame();
const moduleGame = moduleHarness.context.__tapSurvivorHarness.getGame();
check("module runtime starts run", moduleGame.running === true);
check("module runtime clears movement gate", moduleGame.awaitingFirstMoveInput === false);
check(
  "module runtime start shape matches classic",
  JSON.stringify({
    running: moduleGame.running,
    awaitingFirstMoveInput: moduleGame.awaitingFirstMoveInput,
    level: moduleGame.level,
    weapons: moduleGame.player.equippedWeapons.length,
  }) ===
    JSON.stringify({
      running: classicGame.running,
      awaitingFirstMoveInput: classicGame.awaitingFirstMoveInput,
      level: classicGame.level,
      weapons: classicGame.player.equippedWeapons.length,
    })
);

moduleHarness.speedButtons.find((button) => button.dataset.speed === "5").click();
moduleHarness.frame(1100);
check("module runtime speed controls update body", moduleHarness.context.document.body.dataset.gameSpeed === "5");
check("module runtime speed controls affect HUD", moduleHarness.elements.get("runHud").textContent.includes("x5"));

const save = moduleHarness.context.__tapSurvivorHarness.getSave();
save.coins = 77;
moduleHarness.dispatchPagehide();
const persisted = JSON.parse(moduleHarness.context.localStorage.store.get("tap-survivor-mvp-save-v2"));
check("module runtime pagehide flush persists save", persisted.coins === 77);

if (process.exitCode) {
  console.error("\nGame runtime module smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nGame runtime module smoke passed.");
