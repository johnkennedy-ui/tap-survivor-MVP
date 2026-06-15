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
check("shop renders content items", harness.elements.get("shopItems").children.length >= 4);

const firstItem = harness.elements.get("shopItems").children[0];
const buyButton = firstItem.children[0];
buyButton.click();

const saved = JSON.parse(harness.context.localStorage.getItem("tap-survivor-mvp-save-v2"));
check("shop purchase spends coins", saved.coins === 5);
check("shop purchase persists tier", saved.shopPurchases.training_boots === 1);
const registryBonuses = harness.context.TapSurvivorEffects.emptyShopBonuses();
harness.context.TapSurvivorEffects.addShopItemBonus(registryBonuses, { effect: { stat: "speed", value: 10 } }, 2);
check("shop bonus registry applies stat tiers", registryBonuses.speed === 20);
check("shop rerenders balance", harness.elements.get("shopCoinHud").textContent.includes("Coins: 5"));
check("shop shows inflation notice", harness.elements.get("shopNotice").textContent.includes("Inflation huh."));
check("other shop item price inflates", harness.elements.get("shopItems").children[1].innerHTML.includes("Needs 20 coins"));

harness.elements.get("closeShop").click();
check("shop closes", harness.elements.get("shopModal").classList.contains("hidden"));

harness.elements.get("startRun").click();
harness.elements.get("openMenu").click();
harness.elements.get("menuShopTab").click();
check("run menu shop tab renders items", harness.elements.get("menuShopItems").children.length >= 4);
check("run menu shop tab shows scaled floor context", harness.elements.get("menuShopCoinHud").textContent.includes("Tower Floor"));
check("run menu shop tab keeps inflation notice", harness.elements.get("menuShopNotice").textContent.includes("Inflation huh."));

const floorHundred = createGameHarness({
  fakeCombat: true,
  initialSave: {
    coins: 999999,
    towerFloor: 100,
    shopPurchases: {},
    unlockedWeapons: ["spark_bolt"],
  },
});
floorHundred.elements.get("openShop").click();
const floorHundredFirstItem = floorHundred.elements.get("shopItems").children[0];
floorHundredFirstItem.children[0].click();
check("floor 100 shop prices stay buyout-scale", floorHundred.elements.get("shopItems").children[1].innerHTML.includes("Cost: 78 coins"));

if (process.exitCode) {
  console.error("\nShop smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nShop smoke passed.");
