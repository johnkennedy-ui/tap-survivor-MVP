import { createGameHarness } from "./smoke-game-harness.mjs";

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

const floorOne = createGameHarness({ fakeCombat: true });
floorOne.elements.get("toggleDebug").click();
floorOne.elements.get("startRun").click();
floorOne.frame(1000);

const floorOneStats = floorOne.elements.get("debugStats").textContent;
check("debug toggle shows panel", !floorOne.elements.get("debugPanel").classList.contains("hidden"));
check("floor one tuning is intro-soft", floorOneStats.includes("Floor: 1") && floorOneStats.includes("Enemy HP x0.90") && floorOneStats.includes("Enemy DMG x0.85"));
check("debug overlay shows build stats", floorOneStats.includes("Weapon slots: 1/4") && floorOneStats.includes("Run upgrades: none") && floorOneStats.includes("Relics: none"));

const floorThree = createGameHarness({
  fakeCombat: true,
  initialSave: { towerFloor: 3 },
});
floorThree.elements.get("toggleDebug").click();
floorThree.elements.get("startRun").click();
floorThree.frame(1000);

const floorThreeStats = floorThree.elements.get("debugStats").textContent;
check("floor three tuning is noticeably harder", floorThreeStats.includes("Floor: 3") && floorThreeStats.includes("Enemy HP x1.33") && floorThreeStats.includes("Enemy DMG x1.15") && floorThreeStats.includes("Spawn pressure x1.08"));

if (process.exitCode) {
  console.error("\nDebug smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nDebug smoke passed.");
