import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { content } from "../src/content.generated.mjs";
import { createProgressionSystem } from "../src/modules/progression.js";
import { createQuestSystem } from "../src/modules/quests.js";

const root = new URL("..", import.meta.url).pathname;
const questsSource = readFileSync(join(root, "src/quests.js"), "utf8");
const progressionSource = readFileSync(join(root, "src/progression.js"), "utf8");

const context = { console };
vm.createContext(context);
vm.runInContext(questsSource, context);
vm.runInContext(progressionSource, context);

const save = {
  questPoints: 0,
  totalQuestPoints: 0,
  activeQuests: ["spark_bolt_mastery", "spark_bolt_expert", "gatherer"],
  completedQuests: [],
  questProgress: {},
};
let persistCount = 0;
let renderCount = 0;
let completedQuestBanner = "";

const questSystem = createQuestSystem({
  questDefs: content.quests,
  getSave: () => save,
  persist: () => {
    persistCount += 1;
  },
  renderMeta: () => {
    renderCount += 1;
  },
  onQuestComplete: (quest, reward) => {
    completedQuestBanner = `${quest.name} complete +${reward}`;
  },
});

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

check(
  "retired quest and progression publishers are absent",
  context.TapSurvivorQuests === undefined &&
    context.TapSurvivorProgression === undefined &&
    !questsSource.includes("globalThis.TapSurvivorQuests =") &&
    !progressionSource.includes("globalThis.TapSurvivorProgression =")
);

check("active quest weapons include Spark Bolt", questSystem.activeQuestWeaponIds().includes("spark_bolt"));
questSystem.addQuestProgressForWeapon("spark_bolt", 100);
check("weapon-id quest progress is tracked", save.questProgress.spark_bolt_expert === 100);
check("unmatched weapon quests are ignored", !save.questProgress.frost_orb_mastery);

questSystem.addQuestProgress("gatherer", 24);
check("partial quest progress is tracked", save.questProgress.gatherer === 24);
check("partial quest stays active", save.activeQuests.includes("gatherer") && !save.completedQuests.includes("gatherer"));

questSystem.addQuestProgress("gatherer", 1);
check("completed quest is removed from active list", !save.activeQuests.includes("gatherer"));
check("completed quest is recorded", save.completedQuests.includes("gatherer"));
check("quest reward points are awarded", save.questPoints === 1 && save.totalQuestPoints === 1);
check("quest completion banner callback fires", completedQuestBanner.includes("Field Gatherer complete +1"));
check("opensQuest follow-up opens", save.activeQuests.includes("rapid_growth"));
check("opensQuests follow-up opens", save.activeQuests.includes("gem_hoarder"));
check("completion persists and rerenders", persistCount >= 1 && renderCount === 1);

const persistAfterFirstCompletion = persistCount;
const renderAfterFirstCompletion = renderCount;
questSystem.completeQuest("gatherer");
check(
  "repeated quest completion does not award QP twice",
  save.questPoints === 1 &&
    save.totalQuestPoints === 1 &&
    persistCount === persistAfterFirstCompletion &&
    renderCount === renderAfterFirstCompletion,
);

questSystem.addQuestProgressGroup(["first_blood"], 15);
check("inactive group progress is ignored", !save.completedQuests.includes("first_blood"));

check("boss hunter is exposed by the starter quest group", content.questGroups.starter.includes("boss_hunter"));
const bossSave = {
  questPoints: 0,
  totalQuestPoints: 0,
  activeQuests: ["boss_hunter"],
  completedQuests: [],
  questProgress: {},
};
let bossPersistCount = 0;
const bossQuestSystem = createQuestSystem({
  questDefs: content.quests,
  getSave: () => bossSave,
  persist: () => {
    bossPersistCount += 1;
  },
  renderMeta() {},
});
bossQuestSystem.addQuestProgress("boss_hunter", 1);
check(
  "boss hunter completion opens the boss chain",
  bossSave.completedQuests.length === 1 &&
    bossSave.completedQuests[0] === "boss_hunter" &&
    bossSave.activeQuests.includes("boss_slayer") &&
    bossSave.questPoints === 4 &&
    bossSave.totalQuestPoints === 4,
);
const bossPersistAfterFirstCompletion = bossPersistCount;
bossQuestSystem.completeQuest("boss_hunter");
check(
  "repeated boss completion does not award QP twice",
  bossSave.questPoints === 4 &&
    bossSave.totalQuestPoints === 4 &&
    bossPersistCount === bossPersistAfterFirstCompletion,
);

const progressionSave = {
  questPoints: 2,
  unlockedNodes: [],
  unlockedWeapons: ["spark_bolt"],
  upgradeTiers: {},
  unlockedUpgrades: [],
  completedQuests: ["spark_bolt_mastery", "first_blood"],
  activeQuests: [],
  questProgress: {},
};
let progressionPersistCount = 0;
let progressionRenderCount = 0;
const progressionSystem = createProgressionSystem({
  weaponDefs: content.weapons,
  weaponUnlocks: content.weaponUnlocks,
  upgradeDefs: content.metaUpgrades,
  questDefs: content.quests,
  getSave: () => progressionSave,
  openQuest: (id) => {
    if (id && !progressionSave.activeQuests.includes(id)) progressionSave.activeQuests.push(id);
  },
  persist: () => {
    progressionPersistCount += 1;
  },
  renderMeta: () => {
    progressionRenderCount += 1;
  },
  applyRunMetaUpgrades() {},
});
progressionSystem.buyWeaponUnlock(content.weaponUnlocks[0]);
check("weapon unlock spends quest points", progressionSave.questPoints === 1);
check("weapon unlock persists", progressionPersistCount === 1);
check("weapon unlock opens follow-up quest", progressionSave.activeQuests.includes("use_laser_run"));
progressionSystem.buyUpgrade(content.metaUpgrades.find((upgrade) => upgrade.id === "move_speed"));
check("meta upgrade spend persists", progressionPersistCount === 2 && progressionRenderCount === 2);
check("meta upgrade tier is saved", progressionSave.upgradeTiers.move_speed === 1);

if (process.exitCode) {
  console.error("\nQuest flow smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nQuest flow smoke passed.");
