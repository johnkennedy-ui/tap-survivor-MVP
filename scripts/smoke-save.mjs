import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = new URL("..", import.meta.url).pathname;
const content = JSON.parse(readFileSync(join(root, "content/tap-survivor-content.json"), "utf8"));
const questsSource = readFileSync(join(root, "src/quests.js"), "utf8");
const saveSource = readFileSync(join(root, "src/save.js"), "utf8");

const storage = new Map();
const context = {
  console,
  localStorage: {
    getItem(key) {
      return storage.get(key) || null;
    },
    setItem(key, value) {
      storage.set(key, value);
    },
  },
};
vm.createContext(context);
vm.runInContext(questsSource, context);
vm.runInContext(saveSource, context);

const saveKey = "tap-survivor-mvp-save-v2";
const legacySaveKey = "tap-survivor-mvp-save-v1";
const saveSystem = context.TapSurvivorSave.createSaveSystem({
  saveKey,
  legacySaveKey,
  starterQuestIds: content.questGroups.starter,
  questDefs: content.quests,
  weaponUnlocks: content.weaponUnlocks,
  upgradeDefs: [{ id: "laser_damage", opensQuest: "laser_damage_5000" }],
  shopItemDefs: content.shopItems,
  questOpenIds: context.TapSurvivorQuests.questOpenIds,
});

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

const fresh = saveSystem.loadSave();
check("fresh save starts with Spark Bolt", fresh.unlockedWeapons.includes("spark_bolt"));
check("fresh save opens starter quests", content.questGroups.starter.every((id) => fresh.activeQuests.includes(id)));

storage.set(legacySaveKey, JSON.stringify({
  coins: 12.8,
  unlockedWeapons: [],
  completedQuests: ["gatherer"],
  unlockedNodes: ["unlock_laser"],
  unlockedUpgrades: ["laser_damage"],
  shopPurchases: {
    training_boots: 99,
    missing_item: 2,
  },
}));

const migrated = saveSystem.loadSave();
const trainingBoots = content.shopItems.find((item) => item.id === "training_boots");
check("legacy save is normalized", migrated.coins === 12 && migrated.unlockedWeapons.includes("spark_bolt"));
check("save version is current", migrated.saveVersion === 3);
check("seen banners normalize", Array.isArray(migrated.seenBanners));
check("shop purchases clamp to content tiers", migrated.shopPurchases.training_boots === trainingBoots.maxTier);
check("missing shop purchases are removed", migrated.shopPurchases.missing_item === undefined);
check("completed quest follow-ups reopen", migrated.activeQuests.includes("rapid_growth") && migrated.activeQuests.includes("gem_hoarder"));
check("unlock-opened quests reopen", migrated.activeQuests.includes("use_laser_run"));
check("legacy unlocked upgrades become tiers", migrated.upgradeTiers.laser_damage === 1);
check("upgrade-opened quests reopen", migrated.activeQuests.includes("laser_damage_5000"));

saveSystem.persist(migrated);
const persisted = JSON.parse(storage.get(saveKey));
check("persist writes current save key", persisted.unlockedUpgrades.includes("laser_damage"));

if (process.exitCode) {
  console.error("\nSave smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nSave smoke passed.");
