import assert from "node:assert/strict";
import { createBrowserRenderingAdapters } from "../src/app/browser-rendering-adapters.js";

import { createEnemyBehaviorSystem } from "../src/modules/enemy-behaviors.js";
import { createWorldSpatialRuntime } from "../src/modules/world-spatial-runtime.js";

const spatial = createWorldSpatialRuntime({ canvas: { width: 960, height: 540 } });
const climb = { world: spatial.createRunWorld({ modeId: "climb" }) };
const farm = { world: spatial.createRunWorld({ modeId: "farm" }) };
const walls = spatial.solidWalls(climb);
assert.strictEqual(spatial.solidWalls(climb), walls, "immutable world reuses cached wall geometry");

assert.equal(walls.length, 14, "Climb has a connected fourteen-run maze layout");
assert.deepEqual(spatial.solidWalls(farm), [], "Farm has no Climb terrain");
for (const wall of walls) {
  assert.ok(wall.width > 0 && wall.height > 0, "wall geometry is visible");
  assert.ok(wall.x > 0 && wall.y > 0, "walls stay inside the arena");
  assert.ok(
    wall.x + wall.width < climb.world.width && wall.y + wall.height < climb.world.height,
    "walls leave perimeter routes"
  );
}

const wall = walls[0];
// Face/corner unit controls describe one collider. The maze now deliberately
// joins a second collider to its lower-left corner; composite behavior follows.
const isolatedWall = {
  world: Object.freeze({ ...climb.world, solidWalls: Object.freeze([wall]) }),
};
const radius = 12;
const runner = {
  hp: 10,
  radius,
  x: wall.x - radius - 40,
  y: wall.y + wall.height / 2,
};
const start = { ...runner };
runner.x = wall.x + wall.width + radius + 80;
assert.ok(
  spatial.resolveSolidTerrain(climb, runner, start),
  "fast movement intersects solid terrain"
);
assert.ok(runner.x <= wall.x - radius + 0.001, "fast movement cannot tunnel through a wall");

const faceCases = [
  {
    name: "left",
    x: wall.x - radius,
    y: wall.y + wall.height / 2,
    inward: [320, 0],
    outward: [-80, 0],
    tangent: [0, 8],
  },
  {
    name: "right",
    x: wall.x + wall.width + radius,
    y: wall.y + wall.height / 2,
    inward: [-320, 0],
    outward: [80, 0],
    tangent: [0, 8],
  },
  {
    name: "top",
    x: wall.x + wall.width / 2,
    y: wall.y - radius,
    inward: [0, 120],
    outward: [0, -80],
    tangent: [24, 0],
  },
  {
    name: "bottom",
    x: wall.x + wall.width / 2,
    y: wall.y + wall.height + radius,
    inward: [0, -120],
    outward: [0, 80],
    tangent: [24, 0],
  },
];
for (const face of faceCases) {
  const verify = (kind, [dx, dy], expectedBlocked) => {
    const actor = { hp: 10, radius, x: face.x + dx, y: face.y + dy };
    const changed = spatial.resolveSolidTerrain(isolatedWall, actor, { x: face.x, y: face.y });
    assert.equal(
      changed,
      expectedBlocked,
      `${face.name} exact-face ${kind} has expected sweep result`
    );
    if (expectedBlocked) {
      assert.ok(
        Math.abs(actor.x - face.x) < 0.001 && Math.abs(actor.y - face.y) < 0.001,
        `${face.name} exact-face inward motion stays at the face`
      );
    } else {
      assert.ok(
        Math.abs(actor.x - (face.x + dx)) < 0.001 && Math.abs(actor.y - (face.y + dy)) < 0.001,
        `${face.name} exact-face ${kind} motion remains legal`
      );
    }
  };
  verify("inward", face.inward, true);
  verify("outward", face.outward, false);
  verify("tangent", face.tangent, false);
}

const cornerCases = [
  {
    name: "top-left",
    x: wall.x - radius,
    y: wall.y - radius,
    inward: [100, 100],
    tangent: [100, 0],
    escape: [100, -1],
  },
  {
    name: "top-right",
    x: wall.x + wall.width + radius,
    y: wall.y - radius,
    inward: [-100, 100],
    tangent: [-100, 0],
    escape: [-100, -1],
  },
  {
    name: "bottom-left",
    x: wall.x - radius,
    y: wall.y + wall.height + radius,
    inward: [100, -100],
    tangent: [100, 0],
    escape: [100, 1],
  },
  {
    name: "bottom-right",
    x: wall.x + wall.width + radius,
    y: wall.y + wall.height + radius,
    inward: [-100, -100],
    tangent: [-100, 0],
    escape: [-100, 1],
  },
];
for (const cornerCase of cornerCases) {
  const verifyCorner = (kind, [dx, dy], blocked) => {
    const start = { x: cornerCase.x, y: cornerCase.y };
    const actor = { hp: 10, radius, x: start.x + dx, y: start.y + dy };
    const changed = spatial.resolveSolidTerrain(isolatedWall, actor, start);
    assert.equal(changed, blocked, `${cornerCase.name} ${kind} has expected sweep result`);
    assert.ok(
      Number.isFinite(actor.x) && Number.isFinite(actor.y),
      `${cornerCase.name} ${kind} remains finite`
    );
    if (blocked) {
      assert.ok(
        Math.abs(actor.x - start.x) < 0.001 && Math.abs(actor.y - start.y) < 0.001,
        `${cornerCase.name} interior crossing remains at the corner`
      );
    } else {
      assert.equal(actor.x, start.x + dx, `${cornerCase.name} ${kind} keeps legal x movement`);
      assert.equal(actor.y, start.y + dy, `${cornerCase.name} ${kind} keeps legal y movement`);
    }
  };
  verifyCorner("interior crossing", cornerCase.inward, true);
  verifyCorner("tangent", cornerCase.tangent, false);
  verifyCorner("escape", cornerCase.escape, false);
}

const joinedStart = { x: wall.x - radius, y: wall.y + wall.height + radius };
const joinedTangent = { radius, x: joinedStart.x + 100, y: joinedStart.y };
assert.ok(
  spatial.resolveSolidTerrain(climb, joinedTangent, joinedStart),
  "a tangent to one wall cannot cross its joined neighbour"
);
assert.ok(
  joinedTangent.x <= joinedStart.x + 0.001,
  "joined-wall control preserves the approached side"
);

const slider = { hp: 10, radius, x: wall.x - radius + 1, y: wall.y - radius - 30 };
const sliderStart = { ...slider };
slider.y = wall.y + wall.height + radius + 30;
spatial.resolveSolidTerrain(climb, slider, sliderStart);
assert.ok(slider.y < wall.y, "wall face blocks a corner approach");

const slideStart = { canSweep: true, x: wall.x - radius - 1, y: wall.y + 4 };
const slide = { hp: 10, radius, x: wall.x + 40, y: slideStart.y + 120 };
spatial.resolveSolidTerrain(climb, slide, slideStart);
assert.ok(slide.x <= wall.x - radius + 0.001, "face sweep remains blocked");
assert.ok(
  Math.abs(slide.y - (slideStart.y + 120)) < 0.001,
  "face sweep preserves tangential slide"
);

const relocation = { hp: 10, radius, x: wall.x + wall.width + radius + 20, y: wall.y + 4 };
spatial.resolveSolidTerrain(climb, relocation, {
  canSweep: false,
  x: wall.x - radius - 20,
  y: wall.y + 4,
});
assert.ok(relocation.x > wall.x + wall.width, "non-swept relocation may cross a wall");

const overlap = { hp: 10, radius, x: wall.x + wall.width / 2, y: wall.y + wall.height / 2 };
assert.ok(spatial.resolveSolidTerrain(climb, overlap), "overlapping actor is resolved");
assert.ok(
  overlap.x <= wall.x - radius + 0.001 ||
    overlap.x >= wall.x + wall.width + radius - 0.001 ||
    overlap.y <= wall.y - radius + 0.001 ||
    overlap.y >= wall.y + wall.height + radius - 0.001,
  "resolved actor ends outside the collider"
);

const landing = spatial.openPosition(
  climb,
  { x: wall.x + wall.width / 2, y: wall.y + wall.height / 2 },
  38
);
assert.ok(
  landing.x <= wall.x - 38 + 0.001 ||
    landing.x >= wall.x + wall.width + 38 - 0.001 ||
    landing.y <= wall.y - 38 + 0.001 ||
    landing.y >= wall.y + wall.height + 38 - 0.001,
  "boss landing is depenetrated from wall geometry"
);

const routed = spatial.routePosition(
  climb,
  { x: wall.x - 60, y: wall.y + wall.height / 2, radius },
  { x: wall.x + wall.width + 60, y: wall.y + wall.height / 2 }
);
assert.ok(
  routed.y < wall.y - radius || routed.y > wall.y + wall.height + radius,
  "head-on enemy routing selects an open wall end"
);

const boss = {
  x: wall.x - 38 - 40,
  y: wall.y + wall.height / 2,
  radius: 38,
  bossKind: "charger",
  chargeState: "charging",
  chargeTimer: 10,
  chargeDirX: 1,
  chargeDirY: 0,
  chargeSpeed: 2000,
  touchTimer: 999,
};
const bossGame = {
  enemies: [boss],
  player: { hp: 100, radius: 16, x: wall.x + wall.width + 200, y: boss.y },
  world: climb.world,
};
const enemyBehaviors = createEnemyBehaviorSystem({
  canvas: { width: climb.world.width, height: climb.world.height },
  spatial,
  getGame: () => bossGame,
  distance: (first, second) => Math.hypot(first.x - second.x, first.y - second.y),
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  damagePlayer: () => {},
});
enemyBehaviors.updateEnemies(0.1);
assert.ok(
  boss.x <= wall.x - boss.radius + 0.001,
  "charger boss cannot tunnel through Climb wall terrain"
);

const calls = [];
const context = new Proxy(
  {},
  {
    get:
      (_, key) =>
      (...args) =>
        calls.push([key, ...args]),
    set: () => true,
  }
);
const browser = createBrowserRenderingAdapters({
  canvas: { width: climb.world.width, height: climb.world.height, getContext: () => context },
});
browser.renderers.renderFrame({ game: climb, spatialView: {}, spriteAdapters: {} });
const fills = calls.filter(([name]) => name === "fillRect");
assert.ok(
  fills.some(
    ([, x, y, width, height]) =>
      x === wall.x && y === wall.y && width === wall.width && height === wall.height
  ),
  "production renderer draws shared wall coordinates"
);
assert.ok(
  calls.filter(([name]) => name === "beginPath").length >= walls.length,
  "production walls include mortar segments"
);

console.log("climb walls smoke passed");
