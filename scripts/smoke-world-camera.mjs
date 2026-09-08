import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as spatial from "../src/modules/world-camera.js";

const {
  createWorld,
  cameraFor,
  worldToView,
  viewToWorld,
  clientToView,
  worldBounds,
  visibleWorldBounds,
  rayExit,
} = spatial;
const viewport = Object.freeze({ width: 960, height: 540 });
const climb = createWorld(viewport);
const farm = createWorld({ ...viewport, modeId: "farm" });
let cases = 0;
let rejected = 0;

function record(actual, expected, label) {
  assert.deepEqual(actual, expected, label);
  assert.ok(Object.isFrozen(actual), `${label}: frozen result`);
  for (const value of Object.values(actual)) {
    if (typeof value === "number") assert.ok(Number.isFinite(value), `${label}: finite fields`);
  }
  cases += 1;
}

function near(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) <= 1e-10 * Math.max(1, Math.abs(expected)), label);
}

function invalid(call, label) {
  assert.throws(call, RangeError, label);
  rejected += 1;
}

assert.deepEqual(Object.keys(spatial).sort(), [
  "cameraFor",
  "clientToView",
  "createWorld",
  "rayExit",
  "viewToWorld",
  "visibleWorldBounds",
  "worldBounds",
  "worldToView",
]);
record(climb, { modeId: "climb", width: 2880, height: 1620, zoom: 1.25 }, "default Climb");
record(farm, { modeId: "farm", width: 960, height: 540, zoom: 1 }, "Farm");
for (const modeId of [undefined, null, "", "unknown", "Farm", "CLIMB", 0, false, {}]) {
  record(createWorld({ ...viewport, modeId }), climb, "only exact farm selects Farm");
}
record(
  createWorld({ width: 100, height: 80, worldScale: 2, zoom: 2.5, modeId: "climb" }),
  { modeId: "climb", width: 200, height: 160, zoom: 2.5 },
  "custom world/zoom"
);
record(
  createWorld({ ...viewport, modeId: "farm", worldScale: 8, zoom: 4 }),
  farm,
  "Farm ignores valid Climb tuning"
);

// Literal independent oracles: centre, each edge, each corner, out-of-world
// positions, and the exact follow-to-clamp transition on both axes.
const cameraCases = [
  [1440, 810, 1056, 594],
  [0, 810, 0, 594],
  [2880, 810, 2112, 594],
  [1440, 0, 1056, 0],
  [1440, 1620, 1056, 1188],
  [0, 0, 0, 0],
  [2880, 0, 2112, 0],
  [0, 1620, 0, 1188],
  [2880, 1620, 2112, 1188],
  [-100, -100, 0, 0],
  [4000, 3000, 2112, 1188],
  [-100, 3000, 0, 1188],
  [4000, -100, 2112, 0],
  [384, 216, 0, 0],
  [385, 217, 1, 1],
  [2496, 1404, 2112, 1188],
  [2495, 1403, 2111, 1187],
];
for (const [x, y, left, top] of cameraCases) {
  const camera = cameraFor({ world: climb, viewport, player: Object.freeze({ x, y }) });
  record(camera, { x: left, y: top, zoom: 1.25, width: 768, height: 432 }, "Climb clamp");
  record(
    visibleWorldBounds(camera),
    { left, top, right: left + 768, bottom: top + 432 },
    "visible dimensions are world units"
  );
  assert.ok(camera.x >= 0 && camera.y >= 0);
  assert.ok(camera.x + camera.width <= 2880 && camera.y + camera.height <= 1620);
  record(
    cameraFor({ world: farm, viewport, player: { x, y } }),
    { x: 0, y: 0, zoom: 1, width: 960, height: 540 },
    "Farm never follows player"
  );
}

const centre = cameraFor({ world: climb, viewport, player: { x: 1440, y: 810 } });
// Check each transform directly against constants, not against its own inverse.
const transformCases = [
  [1056, 594, 0, 0],
  [1440, 810, 480, 270],
  [1824, 1026, 960, 540],
  [1136, 754, 100, 200],
  [1048, 586, -10, -10],
  [0, 0, -1320, -742.5],
  [2880, 1620, 2280, 1282.5],
];
for (const [wx, wy, vx, vy] of transformCases) {
  const worldPoint = Object.freeze({ x: wx, y: wy });
  const viewPoint = Object.freeze({ x: vx, y: vy });
  record(worldToView(worldPoint, centre), viewPoint, "independent forward oracle");
  record(viewToWorld(viewPoint, centre), worldPoint, "independent inverse oracle");
  record(viewToWorld(worldToView(worldPoint, centre), centre), worldPoint, "world round trip");
  record(worldToView(viewToWorld(viewPoint, centre), centre), viewPoint, "view round trip");
}
const identity = cameraFor({ world: farm, viewport, player: { x: 400, y: 300 } });
for (const point of [
  { x: 0, y: 0 },
  { x: 480, y: 270 },
  { x: -10, y: 700 },
]) {
  record(worldToView(point, identity), point, "Farm forward identity");
  record(viewToWorld(point, identity), point, "Farm inverse identity");
}

const rect = Object.freeze({ left: 100, top: 40, width: 480, height: 180 });
const cssCases = [
  [100, 40, 0, 0, 1056, 594],
  [340, 130, 480, 270, 1440, 810],
  [580, 220, 960, 540, 1824, 1026],
  [150, 100, 100, 180, 1136, 738],
  [90, 30, -20, -30, 1040, 570],
];
for (const [cx, cy, vx, vy, wx, wy] of cssCases) {
  const view = clientToView({ x: cx, y: cy }, rect, viewport);
  record(view, { x: vx, y: vy }, "CSS offset and nonuniform x2/y3 scale once");
  record(viewToWorld(view, centre), { x: wx, y: wy }, "independent CSS-to-world oracle");
  // A caller-side view-to-client oracle, independent of the production math.
  near(view.x / 2 + 100, cx, "client x round trip");
  near(view.y / 3 + 40, cy, "client y round trip");
}
record(
  clientToView({ x: 25, y: 10 }, { left: -25, top: -20, width: 200, height: 120 }, viewport),
  { x: 240, y: 135 },
  "negative CSS offset and fractional scale"
);

const small = createWorld({ width: 100, height: 80, worldScale: 1 });
for (const [view, player, expected] of [
  [
    { width: 300, height: 120 },
    { x: 50, y: 40 },
    { x: 0, y: 20, zoom: 3, width: 100, height: 40 },
  ],
  [
    { width: 120, height: 320 },
    { x: 50, y: 40 },
    { x: 35, y: 0, zoom: 4, width: 30, height: 80 },
  ],
  [
    { width: 300, height: 240 },
    { x: 90, y: 10 },
    { x: 0, y: 0, zoom: 3, width: 100, height: 80 },
  ],
  [
    { width: 300, height: 120 },
    { x: -1, y: -1 },
    { x: 0, y: 0, zoom: 3, width: 100, height: 40 },
  ],
  [
    { width: 300, height: 120 },
    { x: 200, y: 200 },
    { x: 0, y: 40, zoom: 3, width: 100, height: 40 },
  ],
  [
    { width: 120, height: 320 },
    { x: -1, y: -1 },
    { x: 0, y: 0, zoom: 4, width: 30, height: 80 },
  ],
  [
    { width: 120, height: 320 },
    { x: 200, y: 200 },
    { x: 70, y: 0, zoom: 4, width: 30, height: 80 },
  ],
]) {
  const camera = cameraFor({ world: small, viewport: view, player });
  record(camera, expected, "oversized viewport fit");
  assert.ok(camera.x >= 0 && camera.y >= 0);
  assert.ok(camera.x + camera.width <= 100 && camera.y + camera.height <= 80);
  near(camera.width * camera.zoom, view.width, "no blank horizontal pixels");
  near(camera.height * camera.zoom, view.height, "no blank vertical pixels");
}
assert.equal(small.zoom, 1.25, "effective zoom must not overwrite configured zoom");
record(
  cameraFor({
    world: createWorld({ width: 100, height: 80, worldScale: 1, zoom: 5 }),
    viewport: { width: 100, height: 80 },
    player: { x: 50, y: 40 },
  }),
  { x: 40, y: 32, zoom: 5, width: 20, height: 16 },
  "configured closer zoom wins over fit ratio"
);
record(
  cameraFor({
    world: createWorld({ width: 100, height: 80, worldScale: 1, zoom: 0.5 }),
    viewport: { width: 20, height: 10 },
    player: { x: 50, y: 40 },
  }),
  { x: 30, y: 30, zoom: 0.5, width: 40, height: 20 },
  "positive zoom below one is supported"
);

record(worldBounds(climb), { left: 0, top: 0, right: 2880, bottom: 1620 }, "world bounds");
record(
  worldBounds(farm, 72),
  { left: -72, top: -72, right: 1032, bottom: 612 },
  "spawn margin expands"
);
record(
  worldBounds(farm, -18),
  { left: 18, top: 18, right: 942, bottom: 522 },
  "player margin insets"
);
record(
  visibleWorldBounds(centre),
  { left: 1056, top: 594, right: 1824, bottom: 1026 },
  "visible bounds"
);

const rayRect = Object.freeze({ left: 10, top: 20, right: 110, bottom: 80 });
const rayCases = [
  [
    { x: 60, y: 50 },
    { x: 1, y: 0 },
    { x: 110, y: 50, distance: 50, hitX: true, hitY: false },
  ],
  [
    { x: 60, y: 50 },
    { x: -1, y: 0 },
    { x: 10, y: 50, distance: 50, hitX: true, hitY: false },
  ],
  [
    { x: 60, y: 50 },
    { x: 0, y: 1 },
    { x: 60, y: 80, distance: 30, hitX: false, hitY: true },
  ],
  [
    { x: 60, y: 50 },
    { x: 0, y: -1 },
    { x: 60, y: 20, distance: 30, hitX: false, hitY: true },
  ],
  [
    { x: 60, y: 50 },
    { x: 2, y: 1 },
    { x: 110, y: 75, distance: 25, hitX: true, hitY: false },
  ],
  [
    { x: 60, y: 50 },
    { x: 5, y: 3 },
    { x: 110, y: 80, distance: 10, hitX: true, hitY: true },
  ],
  [
    { x: 60, y: 50 },
    { x: -5, y: 3 },
    { x: 10, y: 80, distance: 10, hitX: true, hitY: true },
  ],
  [
    { x: 60, y: 50 },
    { x: 5, y: -3 },
    { x: 110, y: 20, distance: 10, hitX: true, hitY: true },
  ],
  [
    { x: 60, y: 50 },
    { x: -5, y: -3 },
    { x: 10, y: 20, distance: 10, hitX: true, hitY: true },
  ],
  [
    { x: 10, y: 50 },
    { x: -1, y: 0 },
    { x: 10, y: 50, distance: 0, hitX: true, hitY: false },
  ],
  [
    { x: 10, y: 50 },
    { x: 1, y: 0 },
    { x: 110, y: 50, distance: 100, hitX: true, hitY: false },
  ],
  [
    { x: 10, y: 50 },
    { x: 0, y: 1 },
    { x: 10, y: 80, distance: 30, hitX: false, hitY: true },
  ],
  [
    { x: 10, y: 20 },
    { x: -1, y: -1 },
    { x: 10, y: 20, distance: 0, hitX: true, hitY: true },
  ],
  [
    { x: 10, y: 20 },
    { x: 5, y: 3 },
    { x: 110, y: 80, distance: 20, hitX: true, hitY: true },
  ],
];
for (const [origin, direction, expected] of rayCases) {
  Object.freeze(origin);
  Object.freeze(direction);
  record(rayExit(origin, direction, rayRect), expected, "ray independent oracle");
  record(rayExit(origin, direction, rayRect), expected, "ray repeat is deterministic");
}
const nearCorner = rayExit({ x: 60, y: 50 }, { x: 5, y: 3.000001 }, rayRect);
assert.equal(nearCorner.hitX, false, "near corner is not an exact double reflection");
assert.equal(nearCorner.hitY, true);
assert.ok(nearCorner.x < 110 && nearCorner.y === 80);
record(
  rayExit({ x: 480, y: 270 }, { x: 1, y: 0 }, worldBounds(farm, 72)),
  { x: 1032, y: 270, distance: 552, hitX: true, hitY: false },
  "Farm expanded spawn perimeter"
);

// Expected negative fixtures are successful tests, not validation failures.
const notFinite = [NaN, Infinity, -Infinity, undefined, null, "12", {}, true];
const notPositive = [...notFinite, 0, -0, -1];
for (const value of notPositive) {
  for (const field of ["width", "height", "worldScale", "zoom"]) {
    if (value === undefined && (field === "worldScale" || field === "zoom")) continue;
    for (const modeId of ["farm", "climb"]) {
      invalid(
        () => createWorld({ ...viewport, modeId, [field]: value }),
        `invalid ${modeId} ${field}`
      );
    }
  }
  for (const field of ["width", "height"]) {
    invalid(
      () =>
        cameraFor({
          world: climb,
          viewport: { ...viewport, [field]: value },
          player: { x: 0, y: 0 },
        }),
      `invalid viewport ${field}`
    );
    invalid(
      () => cameraFor({ world: { ...climb, [field]: value }, viewport, player: { x: 0, y: 0 } }),
      `invalid world ${field}`
    );
    invalid(
      () => clientToView({ x: 0, y: 0 }, { ...rect, [field]: value }, viewport),
      `invalid CSS ${field}`
    );
    invalid(
      () => clientToView({ x: 0, y: 0 }, rect, { ...viewport, [field]: value }),
      `invalid client viewport ${field}`
    );
    invalid(() => worldBounds({ ...climb, [field]: value }), `invalid bounds ${field}`);
  }
  for (const field of ["width", "height", "zoom"]) {
    const bad = { ...centre, [field]: value };
    invalid(() => worldToView({ x: 0, y: 0 }, bad), `invalid forward camera ${field}`);
    invalid(() => viewToWorld({ x: 0, y: 0 }, bad), `invalid inverse camera ${field}`);
    invalid(() => visibleWorldBounds(bad), `invalid visible camera ${field}`);
  }
  invalid(
    () => cameraFor({ world: { ...climb, zoom: value }, viewport, player: { x: 0, y: 0 } }),
    "invalid configured camera zoom"
  );
}
for (const value of notFinite) {
  if (value !== undefined) invalid(() => worldBounds(climb, value), "invalid margin");
  for (const field of ["x", "y"]) {
    const point = { x: 60, y: 50, [field]: value };
    invalid(() => cameraFor({ world: climb, viewport, player: point }), "invalid player");
    invalid(() => worldToView(point, centre), "invalid world point");
    invalid(() => viewToWorld(point, centre), "invalid view point");
    invalid(() => clientToView(point, rect, viewport), "invalid client point");
    invalid(() => rayExit(point, { x: 1, y: 0 }, rayRect), "invalid ray origin");
    invalid(() => rayExit({ x: 60, y: 50 }, point, rayRect), "invalid ray direction");
    invalid(() => visibleWorldBounds({ ...centre, [field]: value }), "invalid camera origin");
  }
  for (const field of ["left", "top", "right", "bottom"]) {
    invalid(
      () => rayExit({ x: 60, y: 50 }, { x: 1, y: 0 }, { ...rayRect, [field]: value }),
      "invalid ray rect"
    );
  }
  for (const field of ["left", "top"]) {
    invalid(
      () => clientToView({ x: 0, y: 0 }, { ...rect, [field]: value }, viewport),
      "invalid CSS offset"
    );
  }
}
invalid(() => createWorld(), "missing world config");
invalid(() => cameraFor(), "missing camera config");
invalid(() => clientToView(undefined, rect, viewport), "empty touches have no point");
invalid(() => worldBounds(farm, -270), "empty inset");
invalid(() => worldBounds(farm, -500), "inverted inset");
invalid(() => rayExit({ x: 0, y: 0 }, { x: 1, y: 0 }, rayRect), "outside ray origin");
invalid(() => rayExit({ x: 60, y: 50 }, { x: 0, y: -0 }, rayRect), "zero ray direction");
invalid(
  () => rayExit({ x: 60, y: 50 }, { x: 1, y: 0 }, { ...rayRect, right: 10 }),
  "empty ray rect"
);
invalid(
  () => rayExit({ x: 60, y: 50 }, { x: 1, y: 0 }, { ...rayRect, bottom: 0 }),
  "inverted ray rect"
);
invalid(
  () => cameraFor({ world: farm, viewport: { width: 1920, height: 540 }, player: { x: 0, y: 0 } }),
  "Farm oversized logical width rejected"
);
invalid(
  () => cameraFor({ world: farm, viewport: { width: 960, height: 1080 }, player: { x: 0, y: 0 } }),
  "Farm oversized logical height rejected"
);
invalid(
  () => createWorld({ width: Number.MAX_VALUE, height: 540 }),
  "world multiplication overflow"
);
invalid(
  () => createWorld({ width: Number.MIN_VALUE, height: 540, worldScale: 0.1 }),
  "world multiplication underflow"
);
invalid(
  () =>
    cameraFor({ world: { ...small, width: Number.MIN_VALUE }, viewport, player: { x: 0, y: 0 } }),
  "fit ratio overflow"
);
invalid(
  () => worldToView({ x: Number.MAX_VALUE, y: 0 }, { ...centre, zoom: 2 }),
  "transform overflow"
);
invalid(
  () => viewToWorld({ x: Number.MAX_VALUE, y: 0 }, { ...centre, zoom: 0.5 }),
  "inverse overflow"
);
invalid(
  () => clientToView({ x: Number.MAX_VALUE, y: 0 }, { ...rect, width: 1 }, viewport),
  "CSS overflow"
);
invalid(
  () => worldBounds({ width: Number.MAX_VALUE, height: 100 }, Number.MAX_VALUE),
  "expanded bounds overflow"
);
invalid(
  () => visibleWorldBounds({ ...centre, x: Number.MAX_VALUE, width: Number.MAX_VALUE }),
  "visible bounds overflow"
);
invalid(
  () => rayExit({ x: 60, y: 50 }, { x: Number.MIN_VALUE, y: 0 }, rayRect),
  "unrepresentable ray distance"
);

// Freeze inputs and verify no retained aliases/ambient capabilities in the seam.
const config = { ...viewport, modeId: "climb" };
const frozenWorld = createWorld(config);
config.width = 1;
assert.equal(frozenWorld.width, 2880);
assert.throws(() => {
  frozenWorld.width = 1;
}, TypeError);
assert.throws(() => {
  centre.x = 1;
}, TypeError);
const source = readFileSync(new URL("../src/modules/world-camera.js", import.meta.url), "utf8");
assert.doesNotMatch(
  source,
  /\b(?:window|globalThis|document|localStorage|Date|performance|process)\b|Math\s*\.\s*random\s*\(|^\s*import\s/m,
  "pure seam has no ambient capability or imported side effects"
);
console.log(
  `World-camera PASS: ${cases} frozen numeric records; ${rejected} expected RangeError fixtures; independent Farm/Climb, clamps, transforms, CSS, fit, bounds and ray oracles; no runtime wiring.`
);
