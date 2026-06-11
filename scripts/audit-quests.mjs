import { readContent, validateContent } from "./content-tools.mjs";

const content = readContent();
const errors = validateContent(content);

const weaponDefs = content.weapons || {};
const weaponUnlocks = content.weaponUnlocks || [];
const metaUpgrades = content.metaUpgrades || [];
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

starterQuestIds.forEach((questId) => requireQuest(questId, "starter quest group"));

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

const unlockQuestIds = new Set(weaponUnlocks.map((unlock) => unlock.opensQuest).filter(Boolean));
const weaponQuestIds = new Set(
  Object.entries(questDefs)
    .filter(([, quest]) => quest.weaponId)
    .map(([questId]) => questId),
);

for (const questId of weaponQuestIds) {
  if (questId === "spark_bolt_mastery" || questId === "laser_damage_5000") continue;
  if (!unlockQuestIds.has(questId)) {
    fail(`${questId} is a weapon quest but no unlock opens it`);
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
