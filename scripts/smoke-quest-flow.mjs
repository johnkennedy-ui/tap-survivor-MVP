import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = new URL("..", import.meta.url).pathname;
const content = JSON.parse(readFileSync(join(root, "content/tap-survivor-content.json"), "utf8"));
const questsSource = readFileSync(join(root, "src/quests.js"), "utf8");

const context = { console };
vm.createContext(context);
vm.runInContext(questsSource, context);

const save = {
  questPoints: 0,
  totalQuestPoints: 0,
  activeQuests: ["spark_bolt_mastery", "spark_bolt_expert", "gatherer"],
  completedQuests: [],
  questProgress: {},
};
let persistCount = 0;
let renderCount = 0;

const questSystem = context.TapSurvivorQuests.createQuestSystem({
  questDefs: content.quests,
  getSave: () => save,
  persist: () => {
    persistCount += 1;
  },
  renderMeta: () => {
    renderCount += 1;
  },
});

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

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
check("opensQuest follow-up opens", save.activeQuests.includes("rapid_growth"));
check("opensQuests follow-up opens", save.activeQuests.includes("gem_hoarder"));
check("completion persists and rerenders", persistCount >= 1 && renderCount === 1);

questSystem.addQuestProgressGroup(["first_blood"], 15);
check("inactive group progress is ignored", !save.completedQuests.includes("first_blood"));

if (process.exitCode) {
  console.error("\nQuest flow smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nQuest flow smoke passed.");
