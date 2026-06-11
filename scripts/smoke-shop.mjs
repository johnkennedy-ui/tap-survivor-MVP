import { createGameHarness } from "./smoke-game-harness.mjs";

const harness = createGameHarness({
  fakeCombat: true,
  initialSave: {
    coins: 25,
    shopPurchases: {},
    unlockedWeapons: ["spark_bolt"],
  },
});

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

harness.elements.get("openShop").click();

check("shop opens from main menu", !harness.elements.get("shopModal").classList.contains("hidden"));
check("shop renders coin balance", harness.elements.get("shopCoinHud").textContent.includes("Coins: 25"));
check("shop renders content items", harness.elements.get("shopItems").children.length >= 3);

const firstItem = harness.elements.get("shopItems").children[0];
const buyButton = firstItem.children[0];
buyButton.click();

const saved = JSON.parse(harness.context.localStorage.getItem("tap-survivor-mvp-save-v2"));
check("shop purchase spends coins", saved.coins === 5);
check("shop purchase persists tier", saved.shopPurchases.training_boots === 1);
check("shop rerenders balance", harness.elements.get("shopCoinHud").textContent.includes("Coins: 5"));

harness.elements.get("closeShop").click();
check("shop closes", harness.elements.get("shopModal").classList.contains("hidden"));

if (process.exitCode) {
  console.error("\nShop smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nShop smoke passed.");
