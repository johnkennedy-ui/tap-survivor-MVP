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

const starterWeaponId = "spark_bolt";
const weaponIds = Object.keys(weaponDefs);
if (!weaponDefs[starterWeaponId]) fail(`${starterWeaponId} starter weapon is missing`);
if (weaponUnlocks.some((unlock) => unlock.weaponId === starterWeaponId)) {
  fail(`${starterWeaponId} must be the only free starter weapon`);
}
for (const weaponId of weaponIds.filter((id) => id !== starterWeaponId)) {
  const unlocks = weaponUnlocks.filter((unlock) => unlock.weaponId === weaponId);
  if (unlocks.length !== 1) {
    fail(`${weaponId} must have exactly one QP weapon unlock`);
    continue;
  }
  const [unlock] = unlocks;
  if (!Number.isFinite(unlock.cost) || unlock.cost <= 0) {
    fail(`${unlock.id} must cost positive QP`);
  }
  if (!unlock.requiresQuest) {
    fail(`${unlock.id} must be quest-gated`);
  }
}

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
function expandReachableQuests(pendingQuestIds) {
  while (pendingQuestIds.length) {
    const questId = pendingQuestIds.shift();
    const quest = questDefs[questId];
    const nextQuestIds = [quest?.opensQuest, ...(quest?.opensQuests || [])].filter(Boolean);
    nextQuestIds.forEach((nextQuestId) => {
      if (!starterReachableQuestIds.has(nextQuestId) && questDefs[nextQuestId]) {
        starterReachableQuestIds.add(nextQuestId);
        pendingQuestIds.push(nextQuestId);
      }
    });
  }
}
const pendingStarterQuestIds = [...starterReachableQuestIds];
expandReachableQuests(pendingStarterQuestIds);

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

const reachableNodeIds = new Set();
let unlockedAnyNode = true;
while (unlockedAnyNode) {
  unlockedAnyNode = false;
  weaponUnlocks.forEach((unlock) => {
    if (
      reachableNodeIds.has(unlock.id) ||
      (unlock.requiresNode && !reachableNodeIds.has(unlock.requiresNode)) ||
      (unlock.requiresQuest && !starterReachableQuestIds.has(unlock.requiresQuest))
    ) {
      return;
    }
    reachableNodeIds.add(unlock.id);
    unlockedAnyNode = true;
    if (unlock.opensQuest && !starterReachableQuestIds.has(unlock.opensQuest)) {
      starterReachableQuestIds.add(unlock.opensQuest);
      expandReachableQuests([unlock.opensQuest]);
    }
  });
}
weaponUnlocks.forEach((unlock) => {
  if (!reachableNodeIds.has(unlock.id)) fail(`${unlock.id} is not reachable from starter quest progression`);
});

if (metaUpgrades.some((upgrade) => upgrade.retired !== true)) {
  fail("permanent upgrade metadata must be retired from the QP progression tree");
}

if (errors.length) {
  console.error("# Quest Graph Audit");
  errors.forEach((error) => console.error(`FAIL ${error}`));
  process.exit(1);
}

console.log("# Quest Graph Audit");
console.log(`PASS ${Object.keys(questDefs).length} quests`);
console.log(`PASS ${weaponUnlocks.length} weapon unlocks`);
console.log(`PASS ${weaponIds.length - 1} quest-gated QP weapon unlocks`);
console.log(`PASS ${metaUpgrades.length} legacy permanent-upgrade refund schedules`);
console.log(`PASS ${runUpgrades.length} run upgrades`);
