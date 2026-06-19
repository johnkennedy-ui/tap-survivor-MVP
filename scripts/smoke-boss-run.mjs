import { createGameHarness } from "./smoke-game-harness.mjs";

const harness = createGameHarness({ fakeCombat: true });

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

harness.speedButtons[2].click();
harness.elements.get("titleStartGame").click();
harness.elements.get("game").listeners.get("mousedown")({ clientX: 640, clientY: 270, buttons: 1 });
harness.runFrames(610);

const hud = harness.elements.get("runHud").textContent;
check("accelerated run reaches boss window", hud.includes("Time 2:"));
check("boss spawns after 2.5 minutes", hud.includes("Boss HP 100/100"));

if (process.exitCode) {
  console.error("\nBoss-run smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nBoss-run smoke passed.");
