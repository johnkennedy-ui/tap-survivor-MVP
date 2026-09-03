import assert from "node:assert/strict";

import { createGameHarness } from "./smoke-game-harness.mjs";

function first(catalog, key) {
  assert.ok(catalog[key]?.length, `${key} catalog is not empty`);
  return catalog[key][0].id;
}

const queryFree = createGameHarness({ search: "" });
assert.equal(
  Object.prototype.hasOwnProperty.call(queryFree.context, "TapSurvivorDebugRuntime"),
  false,
  "debug API stays absent without exact query opt-in"
);

const harness = createGameHarness({ search: "?debugRuntime=1" });
const context = harness.context;
const api = context.TapSurvivorDebugRuntime;
assert.ok(api, "exact query installs the debug API through injected globalRef");
assert.equal(api.version, 1);
assert.equal(api.protocol, "tap-survivor-debug-runtime");

const catalogResult = api.catalog();
assert.equal(catalogResult.ok, true);
const catalog = catalogResult.result;
assert.ok(catalog.commands.includes("weapon.fire"));
assert.ok(catalog.weapons.length >= 15);
assert.ok(catalog.enemies.length >= 8);
assert.ok(catalog.bosses.length >= 3);
assert.ok(catalog.runUpgrades.length >= 14);

const expectedFamilies = [
  ["weapons", "weapon.fire"],
  ["enemies", "enemy.spawn"],
  ["bosses", "boss.spawn"],
  ["runUpgrades", "runUpgrade.apply"],
  ["effects", "effect.apply"],
  ["pickups", "pickup.collect"],
];
assert.deepEqual(
  catalog.families.map(({ key, command }) => [key, command]),
  expectedFamilies,
  "every descriptor family declares its exact invocation command"
);
for (const [key, command] of expectedFamilies) {
  assert.ok(Array.isArray(catalog[key]), `${key} remains a descriptor array`);
  assert.ok(catalog.commands.includes(command), `${command} remains registered`);
}

const start = harness.elements.get("titleStartGame");
start.click();
assert.equal(harness.dependencies.getGame().running, true, "owner commands require a real active run");

function resetRun(towerFloor = 1) {
  const response = api.invoke("run.reset", { towerFloor });
  assert.equal(response.ok, true, `reset floor ${towerFloor}`);
  const game = harness.dependencies.getGame();
  assert.equal(game.running, true, "debug reset creates a real active run");
  assert.equal(game.towerFloor, towerFloor, "debug reset uses the requested floor");
  return game;
}

for (const { id } of catalog.weapons) {
  resetRun();
  assert.equal(api.invoke("weapon.fire", { id }).ok, true, `weapon ${id}`);
}
for (const { id, minTowerFloor } of catalog.enemies) {
  resetRun(minTowerFloor);
  assert.equal(api.invoke("enemy.spawn", { id }).ok, true, `enemy ${id}`);
}
for (const { id } of catalog.bosses) {
  resetRun();
  assert.equal(api.invoke("boss.spawn", { id }).ok, true, `boss ${id}`);
}
for (const { id } of catalog.runUpgrades) {
  resetRun();
  assert.equal(api.invoke("runUpgrade.apply", { id }).ok, true, `upgrade ${id}`);
}
for (const { id } of catalog.effects) {
  resetRun();
  assert.equal(api.invoke("effect.apply", { id }).ok, true, `effect ${id}`);
}
for (const { id } of catalog.pickups) {
  resetRun();
  assert.equal(api.invoke("pickup.collect", { id }).ok, true, `pickup ${id}`);
}

const game = resetRun();
const weaponId = first(catalog, "weapons");
const beforeInvalid = JSON.stringify(game);
assert.equal(api.invoke("weapon.fire", { id: "not-registered" }).error.code, "UNKNOWN_ID");
assert.equal(api.invoke("weapon.fire", { id: weaponId, extra: true }).error.code, "MALFORMED_ARGS");
assert.equal(api.invoke("weapon.fire").error.code, "MALFORMED_ARGS");
assert.equal(api.invoke("run.reset", { towerFloor: 0 }).error.code, "MALFORMED_ARGS");
assert.equal(JSON.stringify(game), beforeInvalid, "invalid commands do not mutate an active run");

game.running = false;
const beforeIdle = JSON.stringify(game);
assert.equal(api.invoke("pickup.collect", { id: "xp" }).error.code, "INACTIVE_RUN");
assert.equal(JSON.stringify(game), beforeIdle, "inactive-run commands do not mutate state");

assert.equal(
  harness.context.location.search,
  "?debugRuntime=1",
  "the fixture remains explicitly opted in"
);
console.log("PASS debug runtime harness smoke");
