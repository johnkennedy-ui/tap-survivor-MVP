import { createGameHarness } from "./smoke-game-harness.mjs";
import { content } from "../src/content.generated.mjs";

const harness = createGameHarness({
  fakeCombat: true,
  initialSave: {
    coins: 40,
    shopPurchases: {},
    unlockedWeapons: ["spark_bolt"],
  },
});

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

function descendantsWithClass(root, className) {
  const found = [];
  const pending = [...(root.children || [])];
  while (pending.length) {
    const child = pending.shift();
    if (String(child.className || "").split(/\s+/).includes(className)) found.push(child);
    pending.push(...(child.children || []));
  }
  return found;
}

function shopSections(container) {
  return (container.children || []).filter((child) =>
    String(child.className || "").split(/\s+/).includes("shop-section"),
  );
}

function sectionStats(container) {
  return shopSections(container).map((section) => section.dataset?.shopStat);
}

function sectionCount(section) {
  return section.children?.[0]?.children?.[1]?.textContent || "";
}

function shopItemById(container, itemId) {
  return descendantsWithClass(container, "shop-item").find(
    (item) => item.dataset?.shopItemId === itemId,
  );
}

const expectedStats = [...new Set(content.shopItems.map((item) => item.effect?.stat || "other"))];
const expectedItemsByStat = Object.fromEntries(
  expectedStats.map((stat) => [stat, content.shopItems.filter((item) => (item.effect?.stat || "other") === stat).length]),
);

harness.elements.get("openShop").click();

check("shop opens from main menu", !harness.elements.get("shopModal").classList.contains("hidden"));
check("first shop visit banner is recorded", harness.context.__tapSurvivorHarness.getSave().seenBanners.includes("first_shop_visit"));
check("shop renders coin balance", harness.elements.get("shopCoinHud").textContent.includes("Coins: 40"));
const renderedShopItems = descendantsWithClass(harness.elements.get("shopItems"), "shop-item");
const renderedMenuShopItems = descendantsWithClass(harness.elements.get("menuShopItems"), "shop-item");
check("shop renders all expanded content items", renderedShopItems.length === content.shopItems.length);
check("main shop groups items by effect stat", sectionStats(harness.elements.get("shopItems")).join("|") === expectedStats.join("|"));
check("main shop section counts match effect stats", shopSections(harness.elements.get("shopItems")).every((section) => sectionCount(section) === `${expectedItemsByStat[section.dataset.shopStat]} items`));
check("menu shop groups items by effect stat", sectionStats(harness.elements.get("menuShopItems")).join("|") === expectedStats.join("|"));
check("menu shop preserves all grouped items", renderedMenuShopItems.length === content.shopItems.length);

const firstItem = shopItemById(harness.elements.get("shopItems"), "training_boots");
const buyButton = firstItem.children[0];
buyButton.click();

const saved = JSON.parse(harness.context.localStorage.getItem("tap-survivor-mvp-save-v2"));
check("shop purchase spends coins", saved.coins === 13);
check("shop purchase plays coin jingle", harness.context.__audioOscillators >= 4);
check("shop purchase persists tier", saved.shopPurchases.training_boots === 1);
const injectedEffects = harness.dependencies.moduleSystems.effects;
const registryBonuses = injectedEffects.emptyShopBonuses();
injectedEffects.addShopItemBonus(registryBonuses, { effect: { stat: "speed", value: 10 } }, 2);
check(
  "shop bonus registry applies stat tiers through injected native effects",
  registryBonuses.speed === 20 && harness.context.TapSurvivorEffects === undefined
);
check("shop rerenders balance", harness.elements.get("shopCoinHud").textContent.includes("Coins: 13"));
check("shop shows inflation notice as banner", harness.elements.get("questBanner").textContent.includes("Inflation huh."));
check("shop inline inflation notice stays empty", !harness.elements.get("shopNotice").textContent.includes("Inflation huh."));
check(
  "other shop item price inflates",
  shopItemById(harness.elements.get("shopItems"), "coin_magnet").innerHTML.includes("Needs 22 coins"),
);

harness.elements.get("closeShop").click();
check("shop closes", harness.elements.get("shopModal").classList.contains("hidden"));

harness.elements.get("titleStartGame").click();
harness.elements.get("openMenu").click();
harness.elements.get("menuShopTab").click();
check("run menu shop tab renders grouped items", descendantsWithClass(harness.elements.get("menuShopItems"), "shop-item").length === content.shopItems.length);
check("run menu shop tab shows scaled floor context", harness.elements.get("menuShopCoinHud").textContent.includes("Tower Floor"));
check("run menu shop tab leaves inline inflation notice empty", !harness.elements.get("menuShopNotice").textContent.includes("Inflation huh."));

const rewards = createGameHarness({
  fakeCombat: true,
  initialSave: {
    activeQuests: ["first_blood"],
    completedQuests: ["spark_bolt_mastery"],
    questPoints: 1,
    questProgress: { first_blood: 0 },
    totalQuestPoints: 1,
    unlockedWeapons: ["spark_bolt"],
  },
});
rewards.elements.get("titleStartGame").click();
rewards.elements.get("openMenu").click();
const rewardNode = rewards.elements.get("menuTree").children[0];
const rewardIcon = rewardNode?.children[0];
const rewardButton = rewardNode?.children[1];
check("Rewards tab renders a nonempty QP balance", rewards.elements.get("menuQpHud").textContent.includes("Quest Points: 1"));
check("Rewards tab renders progression nodes and active quests", rewards.elements.get("menuTree").children.length > 0 && rewards.elements.get("menuQuests").children.length > 0);
check("Rewards weapon node uses a source-owned skill icon", Boolean(rewardIcon?.src) && rewardIcon?.alt === "Prism Beam skill icon");
check("Rewards funded unlock is enabled", rewardButton?.textContent === "Unlock" && rewardButton?.disabled === false);
rewardButton.click();
const rewardsSaved = JSON.parse(rewards.context.localStorage.getItem("tap-survivor-mvp-save-v2"));
check(
  "Rewards unlock updates save and DOM",
  rewardsSaved.questPoints === 0 &&
    rewardsSaved.unlockedNodes.includes("unlock_laser") &&
    rewardsSaved.activeQuests.includes("use_laser_run") &&
    rewards.elements.get("menuQpHud").textContent.includes("Quest Points: 0"),
);

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
const floorHundredFirstItem = shopItemById(floorHundred.elements.get("shopItems"), "training_boots");
floorHundredFirstItem.children[0].click();
check(
  "floor 100 shop prices stay buyout-scale",
  shopItemById(floorHundred.elements.get("shopItems"), "coin_magnet").innerHTML.includes(
    "Cost: 85 coins",
  ),
);

if (process.exitCode) {
  console.error("\nShop smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nShop smoke passed.");
