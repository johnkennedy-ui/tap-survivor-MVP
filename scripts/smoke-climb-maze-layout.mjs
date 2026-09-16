import assert from "node:assert/strict";
import { attachClimbLayoutSeed, createClimbMazeWalls } from "../src/modules/climb-maze-layout.js";

const dimensions = [
  { width: 960, height: 540 },
  { width: 2880, height: 1620 },
];
// Production boss bodies use radius 38; normal enemy/player bodies are smaller.
const radii = [16, 20, 38];
const reports = [];
for (const world of dimensions) {
  const unseeded = createClimbMazeWalls(world);
  assert.deepEqual(unseeded, createClimbMazeWalls(world), "unseeded geometry is deterministic");
  assert.notDeepEqual(
    createClimbMazeWalls(seededWorld(world, 1)),
    createClimbMazeWalls(seededWorld(world, 2)),
    "different layout seeds produce different maze geometry"
  );
  for (const seed of [0, 1, 2, 123456789, 0xffffffff]) {
    const seeded = seededWorld(world, seed);
    assert.deepEqual(Object.keys(seeded), ["width", "height"], "layout seed is not enumerable");
    assert.equal(JSON.stringify(seeded).includes("seed"), false, "layout seed is not serialized");
    const walls = createClimbMazeWalls(seeded);
    assert.ok(Object.isFrozen(walls), "wall list is immutable");
    assert.equal(walls.length, 12, "maze has twelve procedurally placed stone runs");
    assert.deepEqual(
      walls,
      createClimbMazeWalls(seededWorld(world, seed)),
      "seeded geometry is deterministic"
    );
    for (const [index, wall] of walls.entries()) {
      assert.ok(Object.isFrozen(wall));
      assert.equal(wall.id, `climb-wall-${index + 1}`);
      assert.ok([wall.x, wall.y, wall.width, wall.height].every(Number.isFinite));
      assert.ok(wall.width > 0 && wall.height > 0);
      assert.ok(wall.x > 0 && wall.y > 0);
      assert.ok(wall.x + wall.width < world.width && wall.y + wall.height < world.height);
    }
    for (const radius of radii) {
      const center = { x: world.width / 2, y: world.height / 2 };
      assert.ok(isOpen(center, radius, walls, world), "centre spawn is clear");
      const topology = freeSpace(world, walls, radius);
      assert.ok(topology.count > 100, "fixture contains meaningful traversable space");
      assert.equal(
        topology.components.length,
        1,
        `all free cells connect for radius ${radius} in ${world.width}x${world.height} seed ${seed}: ${JSON.stringify(topology.components)}`
      );
      reports.push({
        ...world,
        seed,
        radius,
        freeCells: topology.count,
        components: topology.components.length,
      });
    }
  }
}
// Negative control retains the worker's original too-narrow upper-left portal.
const small = dimensions[0];
const baselineTrapWalls = createClimbMazeWalls(seededWorld(small, 0));
const trapped = [
  ...baselineTrapWalls,
  { x: 140, y: 90, width: 300, height: 16 },
  { x: 140, y: 320, width: 300, height: 16 },
  { x: 140, y: 90, width: 16, height: 246 },
  { x: 424, y: 90, width: 16, height: 246 },
];
assert.ok(
  freeSpace(small, trapped, 38).components.length > 1,
  "connectivity check rejects the formerly trapped pocket"
);
assert.deepEqual(createClimbMazeWalls({ width: 959, height: 540 }), []);
assert.deepEqual(createClimbMazeWalls({ width: 960, height: 539 }), []);
assert.deepEqual(createClimbMazeWalls(), []);
console.log(
  JSON.stringify({
    decision: "PASS",
    walls: 12,
    seeds: 5,
    topology: reports,
    trappedPocketNegativeControl: "rejected",
  })
);

function seededWorld(world, seed) {
  return attachClimbLayoutSeed({ ...world }, seed);
}

function isOpen(point, radius, walls, world) {
  if (
    point.x < radius ||
    point.y < radius ||
    point.x > world.width - radius ||
    point.y > world.height - radius
  )
    return false;
  return walls.every(
    (wall) =>
      Math.hypot(
        point.x - Math.max(wall.x, Math.min(wall.x + wall.width, point.x)),
        point.y - Math.max(wall.y, Math.min(wall.y + wall.height, point.y))
      ) >=
      radius + 0.1
  );
}
function freeSpace(world, walls, radius) {
  const step = world.height / 135;
  const columns = Math.floor((world.width - 2 * radius) / step) + 1;
  const rows = Math.floor((world.height - 2 * radius) / step) + 1;
  const open = new Map();
  const key = (x, y) => y * columns + x;
  for (let x = 0; x < columns; x += 1)
    for (let y = 0; y < rows; y += 1) {
      if (isOpen({ x: radius + x * step, y: radius + y * step }, radius, walls, world))
        open.set(key(x, y), { x, y });
    }
  const count = open.size;
  const components = [];
  while (open.size) {
    const initial = open.values().next().value;
    const queue = [initial];
    open.delete(key(initial.x, initial.y));
    for (let index = 0; index < queue.length; index += 1) {
      const cell = queue[index];
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const x = cell.x + dx,
          y = cell.y + dy;
        if (x < 0 || y < 0 || x >= columns || y >= rows) continue;
        const next = key(x, y);
        if (!open.has(next)) continue;
        queue.push(open.get(next));
        open.delete(next);
      }
    }
    components.push({
      cells: queue.length,
      witness: { x: radius + initial.x * step, y: radius + initial.y * step },
    });
  }
  return { count, components };
}
