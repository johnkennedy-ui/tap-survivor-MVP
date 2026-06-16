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
assert("green relic abilities apply on run start", game?.player?.invincibleTimer === undefined && game?.player?.speed > 200);

function textTree(element, output = []) {
  output.push(element.className || "", element.textContent || "", element.innerHTML || "");
  (element.children || []).forEach((child) => textTree(child, output));
  return output;
}

function findTree(element, predicate) {
  if (predicate(element)) return element;
  for (const child of element.children || []) {
    const found = findTree(child, predicate);
    if (found) return found;
  }
  return null;
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
assert("locked relic uses unique static relic icon", lockedText.includes("assets/generated/tower/sprites/relics/"));
const unlockedRelicButton = iconGrid.children.find((child) => child.className?.includes("available"));
unlockedRelicButton?.click();
const detailText = textTree(inventory).join(" ");
assert("relic icon opens correct relic detail screen", detailText.includes("relic-detail-screen") && detailText.includes("Selected relic") && detailText.includes("Double Shot Relic"));
assert("relic detail offers equip and cancel", detailText.includes("Equip relic") && detailText.includes("Cancel"));
assert("green relic detail shows special ability copy", detailText.includes("Blink Invincibility") || detailText.includes("Instant Teleport") || detailText.includes("Double Shot"));

const detailScreen = inventory.children.find((child) => child.className?.includes("relic-detail-screen"));
const actions = detailScreen?.children?.find((child) => child.className === "relic-detail-actions");
actions?.children?.[0]?.click();
const equippedSave = JSON.parse(inventoryHarness.context.localStorage.store.get("tap-survivor-mvp-save-v2"));
assert("relic equip persists", equippedSave.equippedRelics.includes(masteryRelic));

const unequipButton = findTree(inventory, (child) => child.textContent === "Unequip");
unequipButton?.click();
const unequippedSave = JSON.parse(inventoryHarness.context.localStorage.store.get("tap-survivor-mvp-save-v2"));
assert("relic unequip persists", !unequippedSave.equippedRelics.includes(focusRelic));
