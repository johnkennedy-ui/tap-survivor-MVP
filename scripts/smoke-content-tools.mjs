import { linkQuestAfter } from "./content-tools.mjs";

function check(name, pass) {
  if (!pass) {
    console.error(`FAIL ${name}`);
    process.exit(1);
  }
  console.log(`PASS ${name}`);
}

const quests = {
  first: { name: "First" },
  second: { name: "Second" },
  branch: { name: "Branch" },
};

linkQuestAfter(quests, "first", "second");
check("first follow-up uses opensQuest", quests.first.opensQuest === "second");

linkQuestAfter(quests, "first", "branch");
check("branch follow-up uses opensQuests", quests.first.opensQuest === "second" && quests.first.opensQuests.includes("branch"));

linkQuestAfter(quests, "first", "branch");
check("branch follow-up is not duplicated", quests.first.opensQuests.length === 1);

let missingFailed = false;
try {
  linkQuestAfter(quests, "missing", "second");
} catch {
  missingFailed = true;
}
check("missing previous quest fails", missingFailed);
