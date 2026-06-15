import { createGameHarness } from "./smoke-game-harness.mjs";

function assert(name, condition) {
  if (!condition) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${name}`);
}

const focusRelic = "move_speed_focus_relic";
const masteryRelic = "fire_rate_mastery_relic";
const harness = createGameHarness({
  initialSave: {
    towerFloor: 20,
    coins: 0,
    shopPurchases: {},
    unlockedWeapons: ["spark_bolt"],
    unlockedRelics: [focusRelic, masteryRelic],
    equippedRelics: [focusRelic, masteryRelic],
  },
});

harness.elements.get("startMenuStartRun").click();
const game = harness.context.__tapSurvivorHarness.getGame();

assert("focus relic starts linked run skill at +1", game?.runUpgradeTiers?.run_move_speed === 1);
assert("mastery relic starts linked run skill at +2", game?.runUpgradeTiers?.run_fire_rate === 2);
assert("focus relic applies player stat tier on run start", game?.player?.speed > 185);

function textTree(element, output = []) {
  output.push(element.className || "", element.textContent || "", element.innerHTML || "");
  (element.children || []).forEach((child) => textTree(child, output));
  return output;
}

const inventoryHarness = createGameHarness({
  initialSave: {
    towerFloor: 20,
    coins: 0,
    shopPurchases: {},
    unlockedWeapons: ["spark_bolt"],
    unlockedRelics: [focusRelic, masteryRelic],
    equippedRelics: [focusRelic],
  },
});

inventoryHarness.elements.get("openMenu").click();
inventoryHarness.elements.get("menuInventoryTab").click();
const inventory = inventoryHarness.elements.get("menuRelicInventory");
const iconGrid = inventory.children.find((child) => child.className === "relic-icon-grid");
assert("inventory shows unlocked and locked relic icon grid", iconGrid?.children?.length > 1);
const lockedRelicButton = iconGrid.children.find((child) => child.className?.includes("locked"));
lockedRelicButton?.click();
const lockedText = textTree(inventory).join(" ");
assert("locked relic click shows popup", lockedText.includes("Locked, play more to unlock this skill."));
assert("locked relic keeps skill sprite icon", lockedText.includes("assets/generated/tower/sprites/"));
const unlockedRelicButton = iconGrid.children.find((child) => child.className?.includes("available"));
unlockedRelicButton?.click();
const detailText = textTree(inventory).join(" ");
assert("relic icon opens detail screen", detailText.includes("relic-detail-screen") && detailText.includes("Selected skill"));
assert("relic detail offers equip and cancel", detailText.includes("Equip relic") && detailText.includes("Cancel"));
