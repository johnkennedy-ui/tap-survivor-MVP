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

const start = harness.elements.get("titleStartGame");
start.click();
const game = harness.dependencies.getGame();
assert.equal(game.running, true, "owner commands require a real active run");

const weaponId = first(catalog, "weapons");
assert.equal(api.invoke("weapon.fire", { id: weaponId }).ok, true);
const enemyId = first(catalog, "enemies");
assert.equal(api.invoke("enemy.spawn", { id: enemyId }).ok, true);
const bossId = first(catalog, "bosses");
assert.equal(api.invoke("boss.spawn", { id: bossId }).ok, true);
const upgradeId = first(catalog, "runUpgrades");
assert.equal(api.invoke("runUpgrade.apply", { id: upgradeId }).ok, true);
const effectId = first(catalog, "effects");
assert.equal(api.invoke("effect.apply", { id: effectId }).ok, true);
assert.equal(api.invoke("pickup.collect", { id: "xp" }).ok, true);
assert.equal(api.invoke("pickup.collect", { id: "coin" }).ok, true);
assert.equal(api.invoke("pickup.collect", { id: "heart" }).ok, true);

const beforeInvalid = JSON.stringify(game);
assert.equal(api.invoke("weapon.fire", { id: "not-registered" }).error.code, "UNKNOWN_ID");
assert.equal(api.invoke("weapon.fire", { id: weaponId, extra: true }).error.code, "MALFORMED_ARGS");
assert.equal(api.invoke("weapon.fire").error.code, "MALFORMED_ARGS");
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
