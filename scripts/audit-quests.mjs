import { readContent, validateContent } from "./content-tools.mjs";

const content = readContent();
const errors = validateContent(content);

const weaponDefs = content.weapons || {};
const weaponUnlocks = content.weaponUnlocks || [];
const metaUpgrades = content.metaUpgrades || [];
const runUpgrades = content.runUpgrades || [];
const questDefs = content.quests || {};
const starterQuestIds = content.questGroups?.starter || [];

function fail(message) {
  errors.push(message);
}

function requireQuest(id, owner) {
  if (id && !questDefs[id]) fail(`${owner} references missing quest ${id}`);
}

function requireNode(id, owner) {
  if (id && !weaponUnlocks.some((unlock) => unlock.id === id)) fail(`${owner} references missing node ${id}`);
}

function requireWeapon(id, owner) {
  if (id && !weaponDefs[id]) fail(`${owner} references missing weapon ${id}`);
}

const uniqueStarterQuestIds = new Set(starterQuestIds);
if (uniqueStarterQuestIds.size !== starterQuestIds.length) {
  fail("starter quest group contains duplicate quest IDs");
}
starterQuestIds.forEach((questId) => requireQuest(questId, "starter quest group"));

Object.entries(content.questGroups || {}).forEach(([groupId, questIds]) => {
  if (new Set(questIds).size !== questIds.length) {
    fail(`${groupId} quest group contains duplicate quest IDs`);
  }
});

weaponUnlocks.forEach((unlock) => {
  requireWeapon(unlock.weaponId, unlock.id);
  requireNode(unlock.requiresNode, unlock.id);
  requireQuest(unlock.requiresQuest, unlock.id);
  requireQuest(unlock.opensQuest, unlock.id);
});

Object.entries(questDefs).forEach(([questId, quest]) => {
  requireWeapon(quest.weaponId, questId);
  requireQuest(quest.opensQuest, questId);
  (quest.opensQuests || []).forEach((nextQuestId) => requireQuest(nextQuestId, questId));
});

const openedQuestIds = new Set(weaponUnlocks.map((unlock) => unlock.opensQuest).filter(Boolean));
Object.values(questDefs).forEach((quest) => {
  if (quest.opensQuest) openedQuestIds.add(quest.opensQuest);
  (quest.opensQuests || []).forEach((questId) => openedQuestIds.add(questId));
});
const weaponQuestIds = new Set(
  Object.entries(questDefs)
    .filter(([, quest]) => quest.weaponId)
    .map(([questId]) => questId),
);

const starterReachableQuestIds = new Set(starterQuestIds.filter((questId) => questDefs[questId]));
const pendingStarterQuestIds = [...starterReachableQuestIds];
while (pendingStarterQuestIds.length) {
  const questId = pendingStarterQuestIds.shift();
  const quest = questDefs[questId];
  const nextQuestIds = [quest?.opensQuest, ...(quest?.opensQuests || [])].filter(Boolean);
  nextQuestIds.forEach((nextQuestId) => {
    if (!starterReachableQuestIds.has(nextQuestId) && questDefs[nextQuestId]) {
      starterReachableQuestIds.add(nextQuestId);
      pendingStarterQuestIds.push(nextQuestId);
    }
  });
}

if (!starterReachableQuestIds.has("boss_hunter")) {
  fail("boss_hunter is not reachable from the starter/open quest graph");
}

Object.entries(questDefs).forEach(([questId, quest]) => {
  if (!quest.weaponId && !starterReachableQuestIds.has(questId)) {
    fail(`${questId} is not reachable from the starter/open quest graph`);
  }
});

for (const questId of weaponQuestIds) {
  if (questId === "spark_bolt_mastery" || questId === "laser_damage_5000") continue;
  if (!openedQuestIds.has(questId)) {
    fail(`${questId} is a weapon quest but no unlock or quest opens it`);
  }
}

if (errors.length) {
  console.error("# Quest Graph Audit");
  errors.forEach((error) => console.error(`FAIL ${error}`));
  process.exit(1);
}

console.log("# Quest Graph Audit");
console.log(`PASS ${Object.keys(questDefs).length} quests`);
console.log(`PASS ${weaponUnlocks.length} weapon unlocks`);
console.log(`PASS ${Object.keys(weaponDefs).length + metaUpgrades.length} meta upgrades`);
console.log(`PASS ${runUpgrades.length} run upgrades`);
