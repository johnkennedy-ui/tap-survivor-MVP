import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = new URL("..", import.meta.url).pathname;
const source = readFileSync(join(root, "src/game.js"), "utf8");
const start = source.indexOf("const weaponDefs = ");
const end = source.indexOf("const runUpgradeDefs = ");

if (start === -1 || end === -1 || end <= start) {
  console.error("Could not locate quest graph definitions in src/game.js");
  process.exit(1);
}

const context = {};
vm.createContext(context);
vm.runInContext(
  `${source.slice(start, end)}
globalThis.__questAudit = { weaponDefs, weaponUnlocks, upgradeDefs, questDefs, starterQuestIds };`,
  context,
);

const { weaponDefs, weaponUnlocks, upgradeDefs, questDefs, starterQuestIds } = context.__questAudit;
const errors = [];

function requireQuest(id, owner) {
  if (id && !questDefs[id]) errors.push(`${owner} references missing quest ${id}`);
}

function requireNode(id, owner) {
  if (id && !weaponUnlocks.some((unlock) => unlock.id === id)) errors.push(`${owner} references missing node ${id}`);
}

function requireWeapon(id, owner) {
  if (id && !weaponDefs[id]) errors.push(`${owner} references missing weapon ${id}`);
}

starterQuestIds.forEach((questId) => requireQuest(questId, "starterQuestIds"));

weaponUnlocks.forEach((unlock) => {
  requireWeapon(unlock.weaponId, unlock.id);
  requireNode(unlock.requiresNode, unlock.id);
  requireQuest(unlock.requiresQuest, unlock.id);
  requireQuest(unlock.opensQuest, unlock.id);
});

upgradeDefs.forEach((upgrade) => {
  requireWeapon(upgrade.requiresWeapon, upgrade.id);
  requireNode(upgrade.requiresNode, upgrade.id);
  requireQuest(upgrade.requiresQuest, upgrade.id);
  requireQuest(upgrade.opensQuest, upgrade.id);
});

Object.entries(questDefs).forEach(([questId, quest]) => {
  requireWeapon(quest.weaponId, questId);
  requireQuest(quest.opensQuest, questId);
  if (!Number.isFinite(quest.target) || quest.target <= 0) errors.push(`${questId} has invalid target`);
  if (!Number.isFinite(quest.rewardQp) || quest.rewardQp < 0) errors.push(`${questId} has invalid rewardQp`);
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
    errors.push(`${questId} is a weapon quest but no unlock opens it`);
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
console.log(`PASS ${upgradeDefs.length} meta upgrades`);
