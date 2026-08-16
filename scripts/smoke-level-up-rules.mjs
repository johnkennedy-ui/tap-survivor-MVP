import { content } from "../src/content.generated.mjs";
import { createLevelUpSystem } from "../src/modules/level-up.js";
import { applyRelicStartingRunUpgrades } from "../src/modules/module-game-dependencies.js";
import { createWeaponScaling } from "../src/modules/weapon-cooldowns.js";

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

function makeClassList() {
  const names = new Set();
  return {
    add: (...values) => values.forEach((value) => names.add(value)),
    contains: (value) => names.has(value),
    remove: (...values) => values.forEach((value) => names.delete(value)),
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
      listeners.get("click")?.({ target: this });
    },
    textContent: "",
  };
}

function createLevelUpFixture({ random = () => 0, runUpgradeDefs, runUpgradeTiers = {} }) {
  const ui = {
    choices: makeElement(),
    levelUp: makeElement(),
  };
  ui.levelUp.classList.add("hidden");
  const game = {
    lastLevelUpChoiceIds: [],
    paused: false,
    pauseReason: "",
    player: {
      equippedWeapons: [],
      hp: 100,
      maxHp: 100,
    },
    runUpgradeTiers,
  };
  const system = createLevelUpSystem({
    activeQuestWeaponIds: () => [],
    content: {},
    documentRef: { createElement: makeElement },
    getGame: () => game,
    getRunUpgradeTier: (id) => game.runUpgradeTiers[id] || 0,
    getSave: () => ({ equippedRelics: [], shopPurchases: {}, unlockedWeapons: [] }),
    levelUpChoices: {
      choiceId: (choice) => choice.runUpgradeId || choice.weaponId || choice.name,
      shopFocusBonus: () => 0,
      weightedChoices: (choices) => choices,
    },
    maxEquippedWeapons: () => 4,
    random,
    relicDefs: [],
    runUpgradeDefs,
    ui,
    weaponDefs: {},
  });
  return { game, system, ui };
}

function choiceName(button) {
  return button?.children?.[1]?.children?.[0]?.textContent || "";
}

function choiceNames(fixture) {
  return fixture.ui.choices.children.map(choiceName);
}

function choose(fixture, name) {
  const button = fixture.ui.choices.children.find((candidate) => choiceName(candidate) === name);
  if (!button) return false;
  button.disabled = false;
  button.click();
  return true;
}

const haste = content.runUpgrades.find((upgrade) => upgrade.id === "run_haste_projectiles");
const heavy = content.runUpgrades.find((upgrade) => upgrade.id === "run_heavy_projectiles");
const fireRate = content.runUpgrades.find((upgrade) => upgrade.id === "run_fire_rate");
const percentDamage = content.runUpgrades.find((upgrade) => upgrade.id === "run_percent_damage");

check(
  "content marks Haste and Heavy as one projectile profile",
  haste?.exclusiveGroup === "projectile_profile" && heavy?.exclusiveGroup === "projectile_profile"
);
check(
  "content gives Fire Rate and Percent Damage weighted tier gains",
  JSON.stringify(fireRate?.levelUpTierGains) ===
    JSON.stringify([
      { amount: 1, weight: 70 },
      { amount: 2, weight: 25 },
      { amount: 3, weight: 5 },
    ]) &&
    JSON.stringify(percentDamage?.levelUpTierGains) ===
      JSON.stringify([
        { amount: 1, weight: 70 },
        { amount: 2, weight: 25 },
        { amount: 3, weight: 5 },
      ])
);

const profileFixture = createLevelUpFixture({
  runUpgradeDefs: [
    haste,
    heavy,
    { description: "A neutral choice.", id: "run_filler", maxTier: 1, name: "Filler" },
  ],
});
profileFixture.system.showLevelUp();
const firstProfileChoices = choiceNames(profileFixture);
check(
  "a panel never offers both Haste and Heavy",
  firstProfileChoices.includes("Haste Projectiles +1") &&
    !firstProfileChoices.includes("Heavy Projectiles +1")
);
check("the Haste card can be selected", choose(profileFixture, "Haste Projectiles +1"));
profileFixture.system.showLevelUp();
check(
  "an active Haste profile filters Heavy from later panels",
  !choiceNames(profileFixture).includes("Heavy Projectiles +1")
);

function verifyTierAward({ currentTier, expectedAward, expectedFinalTier, upgrade }) {
  let effectCalls = 0;
  const fixture = createLevelUpFixture({
    random: () => 0.999,
    runUpgradeDefs: [
      {
        ...upgrade,
        apply: () => {
          effectCalls += 1;
        },
      },
    ],
    runUpgradeTiers: { [upgrade.id]: currentTier },
  });
  fixture.system.showLevelUp();
  const choice = `${upgrade.name} +${expectedAward}`;
  const displayedAward = choiceNames(fixture).includes(choice);
  const selected = choose(fixture, choice);
  return {
    displayedAward,
    effectCalls,
    finalTier: fixture.game.runUpgradeTiers[upgrade.id],
    selected,
    success:
      selected && displayedAward && fixture.game.runUpgradeTiers[upgrade.id] === expectedFinalTier,
  };
}

const fireRateAward = verifyTierAward({
  currentTier: 0,
  expectedAward: 3,
  expectedFinalTier: 3,
  upgrade: fireRate,
});
check(
  "a forced +3 Fire Rate card visibly awards and applies three tiers",
  fireRateAward.success && fireRateAward.effectCalls === 3
);
const percentDamageAward = verifyTierAward({
  currentTier: 7,
  expectedAward: 1,
  expectedFinalTier: 8,
  upgrade: percentDamage,
});
check(
  "a forced +3 Percent Damage card clamps visibly at its final tier",
  percentDamageAward.success && percentDamageAward.effectCalls === 1
);

const fallbackFixture = createLevelUpFixture({
  random: () => 0.999,
  runUpgradeDefs: [
    { description: "No tier metadata.", id: "run_default_gain", maxTier: 3, name: "Default Gain" },
    {
      description: "Invalid tier metadata.",
      id: "run_malformed_gain",
      levelUpTierGains: [{ amount: 3, weight: 0 }],
      maxTier: 3,
      name: "Malformed Gain",
    },
  ],
});
fallbackFixture.system.showLevelUp();
check(
  "absent or malformed tier-gain metadata safely defaults to +1",
  choiceNames(fallbackFixture).includes("Default Gain +1") &&
    choiceNames(fallbackFixture).includes("Malformed Gain +1")
);

function applyRelicStart(startingTiers) {
  const applied = [];
  const run = { runUpgradeTiers: {} };
  applyRelicStartingRunUpgrades({
    effects: { applyRunUpgradeEffects() {} },
    relics: {
      relicBonusFor: () => 0,
      startingRunUpgradeTiers: () => startingTiers,
    },
    run,
    runUpgradeDefs: [
      {
        apply: () => applied.push("haste"),
        exclusiveGroup: "projectile_profile",
        id: "run_haste_projectiles",
        maxTier: 3,
      },
      {
        apply: () => applied.push("heavy"),
        exclusiveGroup: "projectile_profile",
        id: "run_heavy_projectiles",
        maxTier: 3,
      },
    ],
    save: {},
  });
  return { applied, run };
}

const relicTie = applyRelicStart({ run_heavy_projectiles: 1, run_haste_projectiles: 1 });
check(
  "relic start ties choose the first projectile profile in registry order",
  relicTie.applied.join(",") === "haste" &&
    relicTie.run.runUpgradeTiers.run_haste_projectiles === 1 &&
    !Object.hasOwn(relicTie.run.runUpgradeTiers, "run_heavy_projectiles")
);
const relicHigherTier = applyRelicStart({ run_haste_projectiles: 1, run_heavy_projectiles: 2 });
check(
  "relic start chooses the higher applied projectile profile tier",
  relicHigherTier.applied.join(",") === "heavy,heavy" &&
    relicHigherTier.run.runUpgradeTiers.run_heavy_projectiles === 2 &&
    !Object.hasOwn(relicHigherTier.run.runUpgradeTiers, "run_haste_projectiles")
);

function projectileScaling(tiers) {
  return createWeaponScaling({
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    content: { runUpgrades: [haste, heavy] },
    getRunUpgradeTier: (id) => tiers[id] || 0,
    getUpgradeTier: () => 0,
    weaponDefs: {},
  });
}

const projectileWeapon = { kind: "projectile" };
const hasteScaling = projectileScaling({ run_haste_projectiles: 1 });
check(
  "Haste-only projectile multipliers remain exact",
  hasteScaling.projectileSkillModifier(projectileWeapon, "projectileSpeedMultiplier") === 1.65 &&
    hasteScaling.projectileSkillModifier(projectileWeapon, "projectileCooldownMultiplier") ===
      0.65 &&
    hasteScaling.projectileSkillModifier(projectileWeapon, "projectileDamageMultiplier") === 0.7
);
const heavyScaling = projectileScaling({ run_heavy_projectiles: 1 });
check(
  "Heavy-only projectile multipliers remain exact",
  heavyScaling.projectileSkillModifier(projectileWeapon, "projectileSpeedMultiplier") === 0.55 &&
    heavyScaling.projectileSkillModifier(projectileWeapon, "projectileCooldownMultiplier") ===
      1.45 &&
    heavyScaling.projectileSkillModifier(projectileWeapon, "projectileDamageMultiplier") === 3
);
const corruptTieScaling = projectileScaling({ run_haste_projectiles: 1, run_heavy_projectiles: 1 });
check(
  "a corrupt tied projectile profile state uses only registry-first Haste",
  corruptTieScaling.projectileSkillModifier(projectileWeapon, "projectileSpeedMultiplier") ===
    1.65 &&
    corruptTieScaling.projectileSkillModifier(projectileWeapon, "projectileCooldownMultiplier") ===
      0.65 &&
    corruptTieScaling.projectileSkillModifier(projectileWeapon, "projectileDamageMultiplier") ===
      0.7
);
const corruptHigherTierScaling = projectileScaling({
  run_haste_projectiles: 1,
  run_heavy_projectiles: 2,
});
check(
  "a corrupt higher Heavy tier does not stack with Haste",
  corruptHigherTierScaling.projectileSkillModifier(
    projectileWeapon,
    "projectileSpeedMultiplier"
  ) ===
    0.55 ** 2 &&
    corruptHigherTierScaling.projectileSkillModifier(
      projectileWeapon,
      "projectileCooldownMultiplier"
    ) ===
      1.45 ** 2 &&
    corruptHigherTierScaling.projectileSkillModifier(
      projectileWeapon,
      "projectileDamageMultiplier"
    ) ===
      3 ** 2
);

if (process.exitCode) {
  console.error("\nLevel-up rules smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nLevel-up rules smoke passed.");
