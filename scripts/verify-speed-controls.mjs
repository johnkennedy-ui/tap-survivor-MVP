import { readFileSync } from "node:fs";

import { createGameHarness } from "./smoke-game-harness.mjs";

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

const harnessSource = readFileSync(new URL("./smoke-game-harness.mjs", import.meta.url), "utf8");
const hasLegacyGameEvaluation =
  /["'][^"']*src\/game\.js["']/.test(harnessSource) || /\bvm\.(?:Script|SourceTextModule)\b/.test(harnessSource);
check("shared harness avoids the legacy ESM parse path", !hasLegacyGameEvaluation);

const harness = createGameHarness();
const { context, elements, speedButtons } = harness;

check("initial speed is x1", context.document.body.dataset.gameSpeed === "1");

speedButtons[2].click();
check("x5 click updates body speed", context.document.body.dataset.gameSpeed === "5");
check("x5 click marks button pressed", speedButtons[2]["aria-pressed"] === "true");

elements.get("titleStartGame").click();
elements.get("game").listeners.get("mousedown")({ clientX: 640, clientY: 270, buttons: 1 });
harness.runFrames(20, 1000, 50);
check("x5 advances run HUD speed", elements.get("runHud").textContent.includes("Speed x5"));
harness.frame(2000);
check("x5 advances elapsed game time after HUD throttle interval", elements.get("runHud").textContent.includes("Time 0:05"));

if (process.exitCode) {
  console.error("\nSpeed control verification failed.");
  process.exit(process.exitCode);
}

console.log("\nSpeed control click path verified.");
