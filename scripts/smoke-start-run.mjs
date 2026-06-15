import { createGameHarness } from "./smoke-game-harness.mjs";

const harness = createGameHarness({ fakeCombat: true });

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

check("initial HUD is idle", harness.elements.get("runHud").textContent.includes("Start a run"));

harness.elements.get("startRun").click();
harness.frame(1000);

const hud = harness.elements.get("runHud").textContent;
check("first run movement banner is recorded", harness.context.__tapSurvivorHarness.getSave().seenBanners.includes("first_run_movement"));
check("start button begins a timed run", hud.includes("Time 0:00"));
check("run HUD includes HP", hud.includes("HP 100/100"));
check("run HUD includes level and weapon count", hud.includes("Level 1") && hud.includes("Weapons 1"));
check("end screen stays closed at run start", harness.elements.get("endScreen").classList.contains("hidden"));

harness.elements.get("openMenu").click();
const game = harness.context.__tapSurvivorHarness.getGame();
check("menu button pauses the run", game.paused === true && game.pauseReason === "menu");
harness.elements.get("openMenu").click();
check("menu button resumes the run", game.paused === false && game.pauseReason === "");

if (process.exitCode) {
  console.error("\nStart-run smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nStart-run smoke passed.");
