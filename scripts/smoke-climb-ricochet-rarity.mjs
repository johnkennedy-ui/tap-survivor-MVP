import { createLevelUpSystem } from "../src/modules/level-up.js";

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

function makeClassList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    contains: (name) => values.has(name),
    remove: (...names) => names.forEach((name) => values.delete(name)),
  };
}

function makeElement() {
  const listeners = new Map();
  let html = "";
  return {
    children: [],
    classList: makeClassList(),
    disabled: false,
    get innerHTML() {
      return html;
    },
    set innerHTML(value) {
      html = value;
      this.children = [];
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    click() {
      listeners.get("click")?.();
    },
    textContent: "",
  };
}

function createFixture({ modeId, randomValues, tiers = {}, relics = [] }) {
  const ui = { choices: makeElement(), levelUp: makeElement() };
  ui.levelUp.classList.add("hidden");
  const game = {
    lastLevelUpChoiceIds: [],
    paused: false,
    pauseReason: "",
    player: { equippedWeapons: [], hp: 50, maxHp: 100 },
    runUpgradeTiers: { ...tiers },
    world: { modeId },
  };
  let randomCalls = 0;
  const weightedChoiceBatches = [];
  const system = createLevelUpSystem({
    activeQuestWeaponIds: () => [],
    content: {},
    documentRef: { createElement: makeElement },
    getGame: () => game,
    getRunUpgradeTier: (id) => game.runUpgradeTiers[id] || 0,
    getSave: () => ({ equippedRelics: relics, shopPurchases: {}, unlockedWeapons: [] }),
    levelUpChoices: {
      choiceId: (choice) => choice.runUpgradeId || choice.name,
      shopFocusBonus: () => 0,
      weightedChoices: (choices) => {
        weightedChoiceBatches.push(choices);
        return choices;
      },
    },
    maxEquippedWeapons: () => 4,
    random: () => randomValues[randomCalls++],
    relicDefs: [
      { id: "ricochet_focus", selectionWeightBonus: 5, targetUpgradeId: "run_wall_bounce" },
    ],
    runUpgradeDefs: [
      { description: "Bounce.", id: "run_wall_bounce", maxTier: 2, name: "Ricochet" },
      { description: "Other.", id: "run_other", maxTier: 2, name: "Other" },
    ],
    ui,
    weaponDefs: {},
  });
  return { game, randomCalls: () => randomCalls, system, ui, weightedChoiceBatches };
}

function names(fixture) {
  return fixture.ui.choices.children.map((button) => button.children[1].children[0].textContent);
}
function show(fixture) {
  fixture.system.showLevelUp();
  return names(fixture);
}

const belowBoundary = createFixture({ modeId: "climb", randomValues: [1 / 3 - Number.EPSILON] });
check(
  "Climb accepts Ricochet just below the one-in-three boundary",
  show(belowBoundary).includes("Ricochet +1")
);
check("accepted Climb Ricochet consumes one eligibility roll", belowBoundary.randomCalls() === 1);

const exactBoundary = createFixture({ modeId: "climb", randomValues: [1 / 3] });
check(
  "Climb rejects Ricochet at the exact one-in-three boundary",
  !show(exactBoundary).includes("Ricochet +1")
);
check(
  "gated Climb menu retains normal remaining choices",
  names(exactBoundary).join(",") === "Other +1"
);

const farm = createFixture({ modeId: "farm", randomValues: [1] });
check(
  "Farm retains Ricochet regardless of the Climb gate roll",
  show(farm).includes("Ricochet +1")
);
check("Farm performs no added Ricochet eligibility RNG draw", farm.randomCalls() === 0);

const capped = createFixture({ modeId: "climb", randomValues: [0], tiers: { run_wall_bounce: 2 } });
check(
  "max-tier Ricochet is ineligible before the Climb gate",
  !show(capped).includes("Ricochet +1") && capped.randomCalls() === 0
);

const relic = createFixture({ modeId: "climb", randomValues: [0], relics: ["ricochet_focus"] });
show(relic);
check(
  "eligible Climb Ricochet retains its relic weighting provenance",
  relic.weightedChoiceBatches.flat().find((choice) => choice.runUpgradeId === "run_wall_bounce")
    ?.relicSpawnRateMultiplier === 5
);
check(
  "relic-weighted Ricochet still uses one independent eligibility roll",
  relic.randomCalls() === 1
);

const repeat = createFixture({ modeId: "climb", randomValues: [0] });
repeat.game.lastLevelUpChoiceIds = ["run_wall_bounce"];
check(
  "eligible repeat Ricochet remains a normal repeat choice",
  show(repeat).includes("Ricochet +1")
);

const applied = createFixture({ modeId: "climb", randomValues: [0] });
show(applied);
const ricochetButton = applied.ui.choices.children.find(
  (button) => button.children[1].children[0].textContent === "Ricochet +1"
);
ricochetButton.disabled = false;
ricochetButton.click();
check(
  "eligible Ricochet application preserves level-up tier provenance",
  applied.game.runUpgradeTiers.run_wall_bounce === 1 &&
    applied.game.levelUpRunUpgradeTiers.run_wall_bounce === 1
);

const pairedRolls = [0, 1 / 3, 2 / 3];
const baselineAppearances = pairedRolls.filter((roll) =>
  show(createFixture({ modeId: "farm", randomValues: [roll] })).includes("Ricochet +1")
).length;
const climbAppearances = pairedRolls.filter((roll) =>
  show(createFixture({ modeId: "climb", randomValues: [roll] })).includes("Ricochet +1")
).length;
check(
  "paired identical trials prove the Climb gate retains one of each three baseline Ricochet offers",
  baselineAppearances === 3 && climbAppearances === 1
);
