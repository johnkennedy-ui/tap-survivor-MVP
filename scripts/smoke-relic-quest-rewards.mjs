import { createRelicSystem } from "../src/modules/relics.js";
import { createSaveNormalizer } from "../src/modules/save-normalize.js";
import { createShellRelicPresenter } from "../src/modules/shell-relic-presenter.js";

const relicDefs = Array.from({ length: 8 }, (_, index) => ({
  id: `relic_${index + 1}`,
  name: `Relic ${index + 1}`,
  targetUpgradeId: `upgrade_${index + 1}`,
}));
const relicIds = relicDefs.map((relic) => relic.id);
const relicSystem = createRelicSystem({ relicDefs, random: () => 0 });

function createSave(overrides = {}) {
  return {
    coins: 0,
    equippedRelics: [],
    questPoints: 0,
    towerFloor: 1,
    unlockedRelics: [],
    ...overrides,
  };
}

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

const expectedSlotCaps = [
  [1, 0],
  [4, 0],
  [5, 1],
  [9, 1],
  [10, 2],
  [19, 2],
  [20, 3],
  [29, 3],
  [30, 4],
  [39, 4],
  [40, 5],
  [49, 5],
  [50, 6],
  [99, 6],
];
check(
  "relic slots use the requested six-level schedule",
  JSON.stringify(relicSystem.relicSlotLevels) === JSON.stringify([5, 10, 20, 30, 40, 50]) &&
    expectedSlotCaps.every(([towerFloor, expected]) =>
      relicSystem.maxEquippedRelics(createSave({ towerFloor })) === expected
    )
);

const beforeFirstSlot = createSave({ questPoints: 1, towerFloor: 4 });
const beforeFirstSlotKeys = Object.keys(beforeFirstSlot).sort();
const beforeFirstSlotClaim = relicSystem.claimQuestReward(beforeFirstSlot);
check(
  "Quest Cache unlocks a relic before level 5 without equipping it or adding hidden save state",
  beforeFirstSlotClaim?.type === "relic" &&
    beforeFirstSlot.questPoints === 0 &&
    beforeFirstSlot.unlockedRelics.length === 1 &&
    beforeFirstSlot.equippedRelics.length === 0 &&
    JSON.stringify(Object.keys(beforeFirstSlot).sort()) === JSON.stringify(beforeFirstSlotKeys)
);

const availableSlot = createSave({ questPoints: 1, towerFloor: 5 });
const availableSlotClaim = relicSystem.claimQuestReward(availableSlot);
check(
  "Quest Cache debits exactly 1 QP, unlocks one deterministic relic, and auto-equips into a free slot",
  availableSlotClaim?.type === "relic" &&
    availableSlotClaim.questPointsSpent === 1 &&
    availableSlot.unlockedRelics.length === 1 &&
    availableSlot.unlockedRelics[0] === "relic_1" &&
    availableSlot.equippedRelics.length === 1 &&
    availableSlot.equippedRelics[0] === "relic_1" &&
    availableSlot.questPoints === 0 &&
    availableSlot.coins === 0
);

const fullLevelFiveSlot = createSave({
  equippedRelics: ["relic_1"],
  questPoints: 1,
  towerFloor: 5,
  unlockedRelics: ["relic_1"],
});
const fullLevelFiveClaim = relicSystem.claimQuestReward(fullLevelFiveSlot);
check(
  "Quest Cache respects occupied relic capacity while still unlocking one relic",
  fullLevelFiveClaim?.type === "relic" &&
    fullLevelFiveSlot.questPoints === 0 &&
    JSON.stringify(fullLevelFiveSlot.unlockedRelics) === JSON.stringify(["relic_1", "relic_2"]) &&
    JSON.stringify(fullLevelFiveSlot.equippedRelics) === JSON.stringify(["relic_1"])
);

const zeroQpSave = createSave({ questPoints: 0, towerFloor: 5 });
const zeroQpBefore = JSON.stringify(zeroQpSave);
check(
  "zero-QP Quest Cache claim is a no-op",
  relicSystem.claimQuestReward(zeroQpSave) === null && JSON.stringify(zeroQpSave) === zeroQpBefore
);

const invalidRandomSystem = createRelicSystem({ relicDefs, random: () => 1 });
const invalidClaimSave = createSave({ questPoints: 1, towerFloor: 5 });
const invalidClaimBefore = JSON.stringify(invalidClaimSave);
check(
  "invalid Quest Cache claim is atomic and leaves all progression state unchanged",
  invalidRandomSystem.claimQuestReward(invalidClaimSave) === null &&
    JSON.stringify(invalidClaimSave) === invalidClaimBefore
);

const fullyOwnedSave = createSave({
  coins: 7,
  equippedRelics: relicIds.slice(0, 6),
  questPoints: 2,
  towerFloor: 50,
  unlockedRelics: relicIds,
});
const ownedRelicsBeforeFallback = JSON.stringify(fullyOwnedSave.unlockedRelics);
const equippedRelicsBeforeFallback = JSON.stringify(fullyOwnedSave.equippedRelics);
const firstFallback = relicSystem.claimQuestReward(fullyOwnedSave);
const secondFallback = relicSystem.claimQuestReward(fullyOwnedSave);
check(
  "fully owned Quest Cache remains repeatable and grants exactly 25 coins for exactly 1 QP",
  firstFallback?.type === "coins" &&
    secondFallback?.type === "coins" &&
    firstFallback.coins === 25 &&
    secondFallback.coins === 25 &&
    fullyOwnedSave.coins === 57 &&
    fullyOwnedSave.questPoints === 0 &&
    JSON.stringify(fullyOwnedSave.unlockedRelics) === ownedRelicsBeforeFallback &&
    JSON.stringify(fullyOwnedSave.equippedRelics) === equippedRelicsBeforeFallback
);

const saveNormalizer = createSaveNormalizer({
  currentSaveVersion: 3,
  defaultSave: () => ({
    activeQuests: [],
    coins: 0,
    equippedRelics: [],
    questPoints: 0,
    seenBanners: [],
    shopPurchases: {},
    towerFloor: 1,
    unlockedRelics: [],
    unlockedWeapons: ["spark_bolt"],
    upgradeTiers: {},
  }),
  questDefs: {},
  questOpenIds: () => [],
  shopItemById: new Map(),
  upgradeDefs: [],
  weaponUnlocks: [],
});
const normalizedSixRelics = saveNormalizer.normalizeSave({
  equippedRelics: relicIds.slice(0, 6),
  towerFloor: 50,
  unlockedRelics: relicIds.slice(0, 6),
});
check(
  "save normalization preserves a sixth valid equipped relic",
  JSON.stringify(normalizedSixRelics.equippedRelics) === JSON.stringify(relicIds.slice(0, 6))
);

const relicPresenter = createShellRelicPresenter({ relicDefs, relicSystem });
const sixSlotView = relicPresenter.createInventoryViewModel(fullyOwnedSave);
check(
  "relic presentation exposes all six slots at level 50",
  sixSlotView.maxEquippedSlots === 6 &&
    sixSlotView.slots.length === 6 &&
    JSON.stringify(sixSlotView.slots.map((slot) => slot.unlockLevel)) ===
      JSON.stringify(relicSystem.relicSlotLevels) &&
    sixSlotView.summaryRows[0].value === "6/6"
);

if (process.exitCode) {
  console.error("\nRelic Quest Reward smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nRelic Quest Reward smoke passed.");
