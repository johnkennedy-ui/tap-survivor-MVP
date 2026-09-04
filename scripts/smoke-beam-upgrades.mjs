import assert from "node:assert/strict";

import { content } from "../src/content.generated.mjs";
import { createRelicSystem } from "../src/modules/relics.js";
import { createLevelUpSystem } from "../src/modules/level-up.js";
import { createWeaponBehaviorSystem } from "../src/modules/weapon-behaviors.js";

const weaponDefs = {
  laser_staff: content.weapons.laser_staff,
  prism_beam: { kind: "beam", color: "#b794ff", range: 180, width: 10 },
};

function createFixture({ enemies = [], levelUpUpgrades = {}, upgrades = {} } = {}) {
  const game = {
    player: {
      x: 50,
      y: 60,
      targetX: 160,
      targetY: 60,
      facingX: 1,
      facingY: 0,
      equippedWeapons: ["laser_staff"],
      hp: 100,
      maxHp: 100,
    },
    enemies,
    beams: [],
    laserDamage: 0,
    levelUpRunUpgradeTiers: levelUpUpgrades,
    runUpgradeTiers: upgrades,
  };
  const damageCalls = [];
  const system = createWeaponBehaviorSystem({
    canvas: { width: 200, height: 120 },
    weaponDefs,
    getGame: () => game,
    getRunUpgradeTier: (id) => upgrades[id] || 0,
    nearestEnemy: () => game.enemies[0] || null,
    weaponDamage: () => 30,
    weaponReach: (weapon) => weapon.range,
    weaponWidth: (weapon) => weapon.width,
    damageEnemy: (enemy, damage, weaponId) => {
      damageCalls.push({ enemy, damage, weaponId });
      return damage;
    },
    reapEnemies: () => {},
    addQuestProgress: () => {},
    distance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  });
  return { game, damageCalls, system };
}

function makeClassList() {
  const values = new Set(["hidden"]);
  return {
    add: (...items) => items.forEach((item) => values.add(item)),
    contains: (item) => values.has(item),
    remove: (...items) => items.forEach((item) => values.delete(item)),
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

function selectRicochetAtLevelUp(game) {
  const ui = { choices: makeElement(), levelUp: makeElement() };
  const system = createLevelUpSystem({
    activeQuestWeaponIds: () => [],
    content: {},
    documentRef: { createElement: makeElement },
    getGame: () => game,
    getRunUpgradeTier: (id) => game.runUpgradeTiers[id] || 0,
    getSave: () => ({ equippedRelics: [], unlockedWeapons: [] }),
    levelUpChoices: {
      choiceId: (choice) => choice.runUpgradeId || choice.weaponId || choice.name,
      shopFocusBonus: () => 0,
      weightedChoices: (choices) => choices,
    },
    maxEquippedWeapons: () => 4,
    relicDefs: [],
    runUpgradeDefs: [
      {
        description: "Projectiles and beams bounce off arena walls.",
        id: "run_wall_bounce",
        maxTier: 2,
        name: "Ricochet Shots",
      },
    ],
    ui,
    weaponDefs,
  });
  system.showLevelUp();
  const ricochetChoice = ui.choices.children[0];
  ricochetChoice.disabled = false;
  ricochetChoice.click();
}

assert.equal(content.weapons.laser_staff.range, 820, "Laser Staff source range is exactly 820");

{
  const enemies = [
    { x: 90, y: 60, radius: 5 },
    { x: 140, y: 60, radius: 5 },
  ];
  const { game, damageCalls, system } = createFixture({ enemies });
  system.fireBeam("laser_staff");
  assert.equal(game.beams.length, 1, "base laser emits one solid beam");
  assert.equal(damageCalls.length, 2, "base laser pierces every enemy along its path");
  assert.deepEqual(
    damageCalls.map(({ enemy }) => enemy),
    enemies,
    "base laser damages enemies in beam order"
  );
}

{
  const { game, system } = createFixture({ upgrades: { run_wall_bounce: 2 } });
  system.fireBeam("laser_staff");
  assert.equal(
    game.beams.length,
    1,
    "relic-only Ricochet tier does not reflect Laser Staff beams"
  );
}

{
  const outbound = { x: 190, y: 60, radius: 5 };
  const returned = { x: 130, y: 60, radius: 5 };
  const { game, damageCalls, system } = createFixture({
    enemies: [outbound, returned],
    upgrades: { run_wall_bounce: 1 },
  });
  selectRicochetAtLevelUp(game);
  system.fireBeam("laser_staff");
  assert.equal(game.levelUpRunUpgradeTiers.run_wall_bounce, 1, "level-up selection records Ricochet provenance");
  assert.equal(game.runUpgradeTiers.run_wall_bounce, 2, "level-up selection retains the active Ricochet tier");
  assert.equal(game.beams.length, 3, "active tier 2 emits two reflected Laser Staff segments");
  assert.equal(game.beams[0].endX, 200, "outbound segment terminates at the arena wall");
  assert.ok(game.beams[1].endX < game.beams[1].x, "reflected segment travels back into the arena");
  assert.equal(damageCalls.filter(({ enemy }) => enemy === outbound).length, 1, "outbound enemy is hit once across the ricochet path");
  assert.equal(damageCalls.filter(({ enemy }) => enemy === returned).length, 1, "returned-path enemy is hit once");
}

{
  const { game, system } = createFixture({ upgrades: { run_wall_bounce: 1 } });
  system.fireBeam("prism_beam");
  assert.equal(game.beams.length, 2, "Prism Beam retains Ricochet behavior from the active tier");
}

{
  const { game, system } = createFixture({
    enemies: [{ x: 160, y: 60, radius: 5 }],
    upgrades: { run_split_shot: 1 },
  });
  system.fireBeam("laser_staff");
  assert.equal(game.beams.length, 3, "Split Fire tier 1 emits three laser branches");
  assert.ok(new Set(game.beams.map((beam) => beam.endY)).size === 3, "split branches use distinct directions");
}

{
  const { game, system } = createFixture({
    enemies: [{ x: 160, y: 60, radius: 5 }],
    upgrades: { run_split_shot: 2 },
  });
  system.fireBeam("laser_staff");
  assert.equal(game.beams.length, 5, "Split Fire tier 2 follows the projectile five-way pattern");
  assert.equal(new Set(game.beams.map((beam) => beam.endY)).size, 5, "tier 2 branches use five distinct directions");
}

{
  const { game, damageCalls, system } = createFixture();
  system.fireBeam("laser_staff");
  assert.equal(game.beams.length, 1, "laser remains stable with no target");
  assert.equal(damageCalls.length, 0, "no-target laser does not damage absent enemies");
}

{
  const relicSystem = createRelicSystem({
    relicDefs: [
      { id: "bounce", targetUpgradeId: "run_wall_bounce" },
      { id: "split", targetUpgradeId: "run_split_shot" },
      { id: "pierce", targetUpgradeId: "run_projectile_pierce" },
    ],
    weaponDefs,
    random: () => 0,
  });
  const offered = relicSystem.relicChoices({ unlockedRelics: [] }, ["laser_staff"], 2).map((relic) => relic.id);
  assert.ok(offered.includes("bounce"), "beam-only runs can receive Ricochet Shots");
  assert.ok(offered.includes("split"), "beam-only runs can receive Split Fire");
  assert.ok(!offered.includes("pierce"), "projectile-only upgrades remain excluded from beam-only runs");
}

console.log("PASS beam upgrades smoke");
