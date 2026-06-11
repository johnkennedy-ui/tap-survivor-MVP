import { readContent, validateContent } from "./content-tools.mjs";

const content = readContent();
const weapons = content.weapons || {};
const weaponUnlocks = content.weaponUnlocks || [];
const metaUpgrades = content.metaUpgrades || [];
const runUpgrades = content.runUpgrades || [];
const quests = content.quests || {};
const questGroups = content.questGroups || {};
const enemyTypes = content.enemyTypes || [];
const characters = content.characters || [];
const shopItems = content.shopItems || [];
const relics = content.relics || [];
const levels = content.levels || [];
const validationErrors = validateContent(content);

function idsFromMap(value) {
  return Object.keys(value || {}).sort();
}

function idsFromList(value) {
  return (value || []).map((item) => item.id).filter(Boolean).sort();
}

function printList(title, items) {
  console.log(`\n## ${title}`);
  if (!items.length) {
    console.log("- none");
    return;
  }
  items.forEach((item) => console.log(`- ${item}`));
}

function questFollowUps(quest) {
  return [quest.opensQuest, ...(quest.opensQuests || [])].filter(Boolean);
}

const questIds = idsFromMap(quests);
const groupedQuestIds = new Set(Object.values(questGroups).flat());
const referencedQuestIds = new Set();
const missingReferences = [];

weaponUnlocks.forEach((unlock) => {
  if (unlock.requiresQuest) referencedQuestIds.add(unlock.requiresQuest);
  if (unlock.opensQuest) referencedQuestIds.add(unlock.opensQuest);
});

metaUpgrades.forEach((upgrade) => {
  if (upgrade.requiresQuest) referencedQuestIds.add(upgrade.requiresQuest);
  if (upgrade.opensQuest) referencedQuestIds.add(upgrade.opensQuest);
});

Object.entries(quests).forEach(([id, quest]) => {
  questFollowUps(quest).forEach((nextId) => {
    referencedQuestIds.add(nextId);
    if (!quests[nextId]) missingReferences.push(`${id} opens missing quest ${nextId}`);
  });
  if (quest.weaponId && !weapons[quest.weaponId]) {
    missingReferences.push(`${id} references missing weapon ${quest.weaponId}`);
  }
});

Object.entries(questGroups).forEach(([group, ids]) => {
  ids.forEach((questId) => {
    referencedQuestIds.add(questId);
    if (!quests[questId]) missingReferences.push(`questGroups.${group} references missing quest ${questId}`);
  });
});

const ungroupedQuestIds = questIds.filter((id) => !groupedQuestIds.has(id));
const terminalQuestIds = questIds.filter((id) => !questFollowUps(quests[id]).length);

console.log("# Tap Survivor Content Summary");

console.log("\n## Counts");
console.log(`- weapons: ${idsFromMap(weapons).length}`);
console.log(`- weapon unlocks: ${weaponUnlocks.length}`);
console.log(`- meta upgrades: ${metaUpgrades.length}`);
console.log(`- run upgrades: ${runUpgrades.length}`);
console.log(`- quests: ${questIds.length}`);
console.log(`- quest groups: ${Object.keys(questGroups).length}`);
console.log(`- enemy types: ${enemyTypes.length}`);
console.log(`- characters: ${characters.length}`);
console.log(`- shop items: ${shopItems.length}`);
console.log(`- relics: ${relics.length}`);
console.log(`- levels: ${levels.length}`);

printList(
  "Weapons",
  idsFromMap(weapons).map((id) => {
    const weapon = weapons[id];
    return `${id} | ${weapon.kind} | damage ${weapon.damage} | cooldown ${weapon.cooldown}`;
  }),
);

printList(
  "Unlock Nodes",
  weaponUnlocks.map((unlock) => {
    const gates = [
      unlock.requiresNode ? `requires node ${unlock.requiresNode}` : "",
      unlock.requiresQuest ? `requires quest ${unlock.requiresQuest}` : "",
      unlock.opensQuest ? `opens ${unlock.opensQuest}` : "",
    ].filter(Boolean).join("; ");
    return `${unlock.id} -> ${unlock.weaponId} | cost ${unlock.cost} | ${unlock.branch}${gates ? ` | ${gates}` : ""}`;
  }),
);

printList(
  "Meta Upgrades",
  metaUpgrades.map((upgrade) => {
    const gates = [
      upgrade.requiresNode ? `requires node ${upgrade.requiresNode}` : "",
      upgrade.requiresQuest ? `requires quest ${upgrade.requiresQuest}` : "",
      upgrade.opensQuest ? `opens ${upgrade.opensQuest}` : "",
    ].filter(Boolean).join("; ");
    return `${upgrade.id} | max tier ${upgrade.maxTier} | costs ${upgrade.cost.join(", ")}${gates ? ` | ${gates}` : ""}`;
  }),
);

printList(
  "Run Upgrades",
  runUpgrades.map((upgrade) => {
    const effects = (upgrade.effects || [])
      .map((effect) => `${effect.type}${effect.stat ? `:${effect.stat}` : ""}+${effect.value}`)
      .join(", ");
    return `${upgrade.id} | max tier ${upgrade.maxTier}${effects ? ` | ${effects}` : ""}`;
  }),
);

printList(
  "Relics",
  relics.map((relic) => {
    const slot = relic.weaponSlotBonus ? ` | weapon slots ${relic.weaponSlotBonus > 0 ? "+" : ""}${relic.weaponSlotBonus}` : "";
    const damage = relic.weaponDamageMultiplier ? ` | damage x${relic.weaponDamageMultiplier}` : "";
    return `${relic.id} -> ${relic.targetUpgradeId} | weight +${relic.selectionWeightBonus} | max tier +${relic.maxTierBonus}${slot}${damage}`;
  }),
);

console.log("\n## Quest Groups");
Object.entries(questGroups).forEach(([group, ids]) => {
  console.log(`- ${group}: ${ids.length} (${ids.join(", ")})`);
});

printList(
  "Quest Follow-Ups",
  Object.entries(quests)
    .filter(([, quest]) => questFollowUps(quest).length)
    .map(([id, quest]) => `${id} -> ${questFollowUps(quest).join(", ")}`),
);

printList("Ungrouped Quests", ungroupedQuestIds);
printList("Terminal Quests", terminalQuestIds);
printList("Enemy Types", idsFromList(enemyTypes));
printList("Characters", idsFromList(characters));
printList(
  "Shop Items",
  shopItems.map((item) => {
    const costs = Array.isArray(item.cost) ? item.cost.join(", ") : item.cost;
    const effect = item.effect ? ` | ${item.effect.stat}+${item.effect.value}` : "";
    return `${item.id} | ${item.kind} | costs ${costs}${effect}`;
  }),
);
printList("Levels", idsFromList(levels));

printList("Missing Or Dangling References", [...validationErrors, ...missingReferences]);

console.log("\n## Safe Next Additions");
console.log(`- shop items: ${shopItems.length ? "extend existing shop item list" : "empty; first shop item can be added safely"}`);
console.log(`- levels: ${levels.length ? "extend existing level list" : "empty; first level entry can be added safely"}`);
console.log("- weapons: use `npm run add:content -- weapon ...` so weapon and unlock IDs stay paired");
console.log("- quests: add to the relevant `questGroups` entry or this summary will list it as ungrouped");
