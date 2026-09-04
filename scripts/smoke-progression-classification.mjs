import { content } from "../src/content.generated.mjs";
import { createLevelUpSystem } from "../src/modules/level-up.js";
import { createUpgradeContent } from "../src/modules/upgrades.js";

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

function makeClassList() {
  const values = new Set(["hidden"]);
  return {
    add: (...items) => items.forEach((item) => values.add(item)),
    contains: (item) => values.has(item),
    remove: (...items) => items.forEach((item) => values.delete(item)),
  };
}

function makeElement() {
  const listeners = new Map();
  return {
    children: [],
    classList: makeClassList(),
    disabled: false,
    innerHTML: "",
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    textContent: "",
  };
}

function levelUpChoiceNames(runUpgradeDefs, equippedWeapons) {
  const choices = makeElement();
  const levelUp = makeElement();
  const game = {
    lastLevelUpChoiceIds: [],
    player: { equippedWeapons, hp: 100, maxHp: 100 },
    runUpgradeTiers: {},
  };
  const system = createLevelUpSystem({
    activeQuestWeaponIds: () => [],
    content: {},
    documentRef: { createElement: makeElement },
    getGame: () => game,
    getRunUpgradeTier: (id) => game.runUpgradeTiers[id] || 0,
    getSave: () => ({ equippedRelics: [], shopPurchases: {}, unlockedWeapons: [] }),
    levelUpChoices: {
      choiceId: (choice) => choice.runUpgradeId || choice.weaponId || choice.name,
      shopFocusBonus: () => 0,
      weightedChoices: (items) => items,
    },
    maxEquippedWeapons: () => equippedWeapons.length,
    relicDefs: [],
    runUpgradeDefs,
    ui: { choices, levelUp },
    weaponDefs: content.weapons,
  });
  system.showLevelUp();
  return choices.children.map((button) => button.children[1]?.children[0]?.textContent || "");
}

const upgradeContent = createUpgradeContent({ content, effects: { applyRunUpgradeEffects() {} } });
const runUpgradeDefs = upgradeContent.runUpgradeDefs;
const sparkDamage = runUpgradeDefs.find((upgrade) => upgrade.id === "spark_damage");
const laserDamage = runUpgradeDefs.find((upgrade) => upgrade.id === "laser_damage");
const genericUpgrade = runUpgradeDefs.find((upgrade) => upgrade.id === "run_move_speed");

check("permanent QP upgrade definitions are not exposed", upgradeContent.createUpgradeDefs(content.weapons).length === 0);
check("legacy permanent metadata is retained only for save refunds", content.metaUpgrades.every((upgrade) => upgrade.retired));
check(
  "all weapon damage upgrades are run upgrades",
  Object.values(content.weapons).every((weapon) =>
    runUpgradeDefs.some((upgrade) => upgrade.id === weapon.upgradeId && upgrade.requiresWeapon),
  ),
);

const sparkChoices = levelUpChoiceNames([genericUpgrade, sparkDamage, laserDamage], ["spark_bolt"]);
check(
  "generic and equipped weapon upgrades appear at level-up",
  sparkChoices.includes("Move Speed +1") && sparkChoices.includes("Spark Bolt Damage +1"),
);
check("unequipped weapon damage is excluded from level-up", !sparkChoices.includes("Prism Beam Damage +1"));

const laserChoices = levelUpChoiceNames([genericUpgrade, sparkDamage, laserDamage], ["prism_beam"]);
check("equipping another weapon changes its eligible damage upgrade", laserChoices.includes("Prism Beam Damage +1"));
check("other unequipped weapon damage remains excluded", !laserChoices.includes("Spark Bolt Damage +1"));

if (process.exitCode) process.exit(process.exitCode);
console.log("Progression classification smoke passed.");
