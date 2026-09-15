import assert from "node:assert/strict";
import { createGameHarness } from "./smoke-game-harness.mjs";
import { createWorldSpatialRuntime } from "../src/modules/world-spatial-runtime.js";

const harness = createGameHarness({ search: "?debugRuntime=1" });
const api = harness.context.TapSurvivorDebugRuntime;
const setup = api.invoke("physics.scenario", { id: "climb-maze-pursuit" });
assert.equal(setup.ok, true, "query-gated maze scenario is registered");
const before = setup.result;
assert.equal(before.world.modeId, "climb");
assert.equal(before.walls.length, 14);
assert.ok(
  before.scenario.parameters.blockedWallIds.length >= 2,
  "straight pursuit is obstructed by multiple actual walls"
);
const enemyId = before.scenario.parameters.initialEnemy.id;
let prior = before.enemies.find((enemy) => enemy.id === enemyId);
const direct = distance(prior, before.player);
let traveled = 0,
  turns = 0,
  heading = null,
  final = before,
  frames = 0;
checkClear(before);
for (; frames < 1000; frames += 1) {
  const step = api.invoke("frame.step", { frames: 1, dt: 0.05 });
  assert.equal(step.ok, true);
  final = step.result;
  checkClear(final);
  const actor = final.enemies.find((enemy) => enemy.id === enemyId);
  assert.ok(actor, "same enemy survives and remains observable");
  const dx = actor.x - prior.x,
    dy = actor.y - prior.y;
  const length = Math.hypot(dx, dy);
  traveled += length;
  if (length > 1) {
    const nextHeading = Math.atan2(dy, dx);
    if (
      heading !== null &&
      Math.abs(Math.atan2(Math.sin(nextHeading - heading), Math.cos(nextHeading - heading))) > 0.25
    )
      turns += 1;
    heading = nextHeading;
  }
  prior = actor;
  if (distance(actor, final.player) <= actor.radius + final.player.radius + 10) break;
}
assert.ok(frames < 1000, "actual enemy reaches the player through the connected maze");
assert.ok(traveled > direct + 20, "enemy follows a detour rather than passing through walls");
assert.ok(turns >= 2, "actual pursuit negotiates multiple turns");

const spatial = createWorldSpatialRuntime({ canvas: { width: 960, height: 540 } });
let spawnProbes = 0;
for (const world of [
  { modeId: "climb", width: 960, height: 540 },
  { modeId: "climb", width: 2880, height: 1620 },
]) {
  const game = { world: spatial.createRunWorld({ modeId: "climb", world }) };
  const walls = spatial.solidWalls(game);
  for (const radius of [16, 20, 38])
    for (const wall of walls)
      for (const point of [
        { x: wall.x, y: wall.y },
        { x: wall.x + wall.width, y: wall.y + wall.height },
        { x: wall.x + wall.width / 2, y: wall.y + wall.height / 2 },
      ]) {
        const actor = { ...spatial.openPosition(game, point, radius), radius };
        assert.ok(
          walls.every((obstacle) => clear(actor, obstacle)),
          "spawn recovery clears the whole joined-wall union"
        );
        spawnProbes += 1;
      }
}
console.log(
  JSON.stringify({
    decision: "PASS",
    frames,
    traveled,
    direct,
    turns,
    blockedWallIds: before.scenario.parameters.blockedWallIds,
    spawnProbes,
  })
);

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function clear(actor, wall) {
  return (
    Math.hypot(
      actor.x - Math.max(wall.x, Math.min(wall.x + wall.width, actor.x)),
      actor.y - Math.max(wall.y, Math.min(wall.y + wall.height, actor.y))
    ) >=
    actor.radius - 0.01
  );
}
function checkClear(snapshot) {
  for (const actor of [snapshot.player, ...snapshot.enemies]) {
    assert.ok(actor.valid);
    assert.ok(
      snapshot.walls.every((wall) => clear(actor, wall)),
      `actor ${actor.id} is terrain-clear at ${actor.x},${actor.y}`
    );
  }
}
