import assert from "node:assert/strict";
import { createWorldSpatialRuntime } from "../src/modules/world-spatial-runtime.js";

const spatial = createWorldSpatialRuntime({ canvas: { width: 1200, height: 700 } });
const world = Object.freeze({
  modeId: "climb",
  width: 1200,
  height: 700,
  solidWalls: Object.freeze([
    { x: 240, y: 80, width: 32, height: 430 },
    { x: 480, y: 190, width: 32, height: 430 },
    { x: 720, y: 80, width: 32, height: 430 },
    { x: 272, y: 478, width: 208, height: 32 },
  ]),
});
const game = { world };
const radius = 16;
let actor = { x: 120, y: 160, radius };
const target = { x: 1080, y: 160 };
for (
  let step = 0;
  step < 60 && Math.hypot(actor.x - target.x, actor.y - target.y) > 12;
  step += 1
) {
  const waypoint = spatial.routePosition(game, actor, target);
  const previous = { ...actor };
  const dx = waypoint.x - actor.x;
  const dy = waypoint.y - actor.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  actor.x += (dx / length) * Math.min(36, length);
  actor.y += (dy / length) * Math.min(36, length);
  spatial.resolveSolidTerrain(game, actor, previous);
  for (const wall of world.solidWalls) {
    const x = Math.max(wall.x, Math.min(wall.x + wall.width, actor.x));
    const y = Math.max(wall.y, Math.min(wall.y + wall.height, actor.y));
    assert.ok(
      Math.hypot(actor.x - x, actor.y - y) >= radius - 0.001,
      "route never overlaps maze walls"
    );
  }
}
assert.ok(
  Math.hypot(actor.x - target.x, actor.y - target.y) < 80,
  "multi-turn route exits the dead-end and reaches target"
);
const movedTarget = { x: 120, y: 600 };
for (
  let step = 0;
  step < 80 && Math.hypot(actor.x - movedTarget.x, actor.y - movedTarget.y) > 12;
  step += 1
) {
  const waypoint = spatial.routePosition(game, actor, movedTarget);
  const dx = waypoint.x - actor.x;
  const dy = waypoint.y - actor.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  actor.x += (dx / length) * Math.min(29 + (step % 3) * 17, length);
  actor.y += (dy / length) * Math.min(29 + (step % 3) * 17, length);
}
assert.ok(
  Math.hypot(actor.x - movedTarget.x, actor.y - movedTarget.y) < 80,
  "moving target route arrives under variable steps"
);
const small = spatial.routePosition(game, { x: 120, y: 160, radius: 12 }, target);
const large = spatial.routePosition(game, { x: 120, y: 160, radius: 34 }, target);
assert.notDeepEqual(small, large, "mixed enemy radii receive their own cached clearance graph");

const joined = Object.freeze({
  modeId: "climb",
  width: 1200,
  height: 700,
  solidWalls: Object.freeze([
    { x: 400, y: 250, width: 120, height: 30 },
    { x: 520, y: 250, width: 30, height: 160 },
  ]),
});
const mover = { x: 620, y: 330, radius };
spatial.resolveSolidTerrain({ world: joined }, mover, { x: 340, y: 330 });
assert.ok(
  mover.x <= 504.001,
  "joined walls use earliest sweep collision independent of wall order"
);
const overlapWorld = Object.freeze({
  modeId: "climb",
  width: 1200,
  height: 700,
  solidWalls: Object.freeze([
    { x: 300, y: 220, width: 180, height: 40 },
    { x: 440, y: 220, width: 40, height: 180 },
  ]),
});
const overlapRoute = spatial.routePosition(
  { world: overlapWorld },
  { x: 180, y: 330, radius },
  { x: 660, y: 330 }
);
assert.ok(
  overlapRoute.x < 424 || overlapRoute.y < 204 || overlapRoute.y > 416,
  "connected L walls never select an interior joined-wall vertex"
);
const roundedCorner = {
  x: world.solidWalls[0].x - radius * 0.8,
  y: world.solidWalls[0].y - radius * 0.8,
  radius,
};
const cornerTarget = { x: 1080, y: 560 };
for (
  let step = 0;
  step < 100 && Math.hypot(roundedCorner.x - cornerTarget.x, roundedCorner.y - cornerTarget.y) > 12;
  step += 1
) {
  const waypoint = spatial.routePosition(game, roundedCorner, cornerTarget);
  const previous = { ...roundedCorner };
  const dx = waypoint.x - roundedCorner.x;
  const dy = waypoint.y - roundedCorner.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const amount = Math.min(length, 17 + (step % 4) * 19);
  roundedCorner.x += (dx / length) * amount;
  roundedCorner.y += (dy / length) * amount;
  spatial.resolveSolidTerrain(game, roundedCorner, previous);
  for (const wall of world.solidWalls) {
    const x = Math.max(wall.x, Math.min(wall.x + wall.width, roundedCorner.x));
    const y = Math.max(wall.y, Math.min(wall.y + wall.height, roundedCorner.y));
    assert.ok(
      Math.hypot(roundedCorner.x - x, roundedCorner.y - y) >= radius - 0.001,
      "circle-clear corner route stays clear each step"
    );
  }
}
assert.ok(
  Math.hypot(roundedCorner.x - cornerTarget.x, roundedCorner.y - cornerTarget.y) < 80,
  "circle-clear rounded corner reaches its target"
);
// Negative control for an endpoint-only corner fix: both endpoints are clear,
// but a single high-speed step between them crosses the wall interior.
const cornerWall = world.solidWalls[0];
const cornerWorld = { world: Object.freeze({ ...world, solidWalls: Object.freeze([cornerWall]) }) };
const cornerStart = { x: cornerWall.x - radius * 0.8, y: cornerWall.y - radius * 0.8, radius };
const farSide = { x: 500, y: 350 };
assert.notDeepEqual(
  spatial.routePosition(cornerWorld, cornerStart, farSide),
  farSide,
  "rounded-corner route rejects the wall-crossing direct line"
);
const fastCorner = { ...farSide, radius };
spatial.resolveSolidTerrain(cornerWorld, fastCorner, cornerStart);
assert.ok(
  fastCorner.x <= cornerStart.x + 0.001 && fastCorner.y <= cornerStart.y + 0.001,
  "high-speed motion cannot tunnel from a circle-clear expanded-AABB corner"
);
const cornerEscape = { x: cornerStart.x - 30, y: cornerStart.y - 30, radius };
assert.equal(
  spatial.resolveSolidTerrain(cornerWorld, cornerEscape, cornerStart),
  false,
  "corner recovery preserves outward escape"
);
console.log("terrain navigation smoke passed");
