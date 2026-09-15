import assert from "node:assert/strict";
import { createGameHarness } from "./smoke-game-harness.mjs";

for (const search of ["", "?debugRuntime=10"]) {
  const harness = createGameHarness({ search });
  assert.equal(Object.hasOwn(harness.context, "TapSurvivorDebugRuntime"), false);
}
const harness = createGameHarness({ search: "?debugRuntime=1" });
const api = harness.context.TapSurvivorDebugRuntime;
const witnesses = [];
for (const ricochet of [true, false]) {
  const id = `climb-projectile-wall-${ricochet ? "ricochet" : "no-upgrade"}`;
  assert.ok(api.catalog().result.physics.scenarios.includes(id));
  const setup = api.invoke("physics.scenario", { id });
  assert.equal(setup.ok, true, `${id}: owner fixture setup`);
  const before = setup.result;
  const parameters = before.scenario.parameters;
  const wall = parameters.wall;
  assert.equal(before.world.modeId, "climb");
  assert.equal(before.paused, true);
  assert.equal(before.projectiles.length, 1);
  assert.equal(before.projectiles[0].bounces, ricochet ? 1 : 0);
  assert.ok(before.projectiles[0].vx > 0);
  assert.ok(before.projectiles[0].x + before.projectiles[0].radius < wall.x);
  assert.ok(Object.isFrozen(parameters.initial));
  assert.equal(api.invoke("physics.scenario", { id, ignored: true }).error.code, "MALFORMED_ARGS");
  assert.deepEqual(api.invoke("snapshot", {}).result, before);
  const samples = [before];
  let outcome = "none";
  for (let frame = 1; frame <= 100; frame += 1) {
    const step = api.invoke("frame.step", { frames: 1, dt: 1 / 60 });
    assert.equal(step.ok, true);
    const snapshot = step.result;
    assert.equal(snapshot.paused, true);
    samples.push(snapshot);
    const target = snapshot.enemies.find((enemy) => enemy.id === parameters.targetId);
    assert.ok(target, "the behind-wall enemy remains observable");
    assert.equal(target.hp, parameters.targetHp, "no damage through the wall");
    const bolt = snapshot.projectiles[0];
    if (!bolt) {
      outcome = "absorbed";
      break;
    }
    assert.ok(bolt.valid);
    assert.ok(bolt.x + bolt.radius <= wall.x + 0.001, "no wall penetration");
    assert.ok(Math.abs(Math.hypot(bolt.vx, bolt.vy) - parameters.initial.vx) < 0.001);
    if (bolt.vx < 0) {
      outcome = "reflected";
      assert.equal(bolt.bounces, 0, "one wall bounce consumes one tier");
      const after = api.invoke("frame.step", { frames: 1, dt: 1 / 60 }).result;
      assert.ok(after.projectiles[0].x < bolt.x, "reflected bolt leaves the wall");
      samples.push(after);
      break;
    }
  }
  assert.equal(outcome, ricochet ? "reflected" : "absorbed");
  witnesses.push({ id, outcome, frames: samples.length - 1, before, after: samples.at(-1) });
}
console.log(JSON.stringify({ decision: "PASS", witnesses }, null, 2));
