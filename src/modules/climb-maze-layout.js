const NOMINAL_WIDTH = 2880;
const NOMINAL_HEIGHT = 1620;
const CLIMB_LAYOUT_SEED = Symbol("TapSurvivor.climbLayoutSeed");

export function attachClimbLayoutSeed(world, seed) {
  if (!world || typeof world !== "object") return world;
  Object.defineProperty(world, CLIMB_LAYOUT_SEED, {
    value: normalizeSeed(seed),
    enumerable: false,
  });
  return world;
}

export function climbLayoutSeed(world) {
  const seed = world?.[CLIMB_LAYOUT_SEED];
  return Number.isInteger(seed) ? seed : null;
}

/**
 * Creates immutable Climb terrain descriptors for a valid simulation world.
 * The layout is expressed in normalized nominal-world coordinates so the same
 * maze family works at 2880x1620 and the supported 960x540 minimum. A hidden
 * per-run seed produces deterministic geometry within that run without exposing
 * the seed through normal object enumeration or JSON snapshots.
 *
 * @param {{ width?: number, height?: number }} world
 * @returns {ReadonlyArray<Readonly<{ id: string, x: number, y: number, width: number, height: number }>>}
 */
export function createClimbMazeWalls(world) {
  if (!Number.isFinite(world?.width) || !Number.isFinite(world?.height)) return Object.freeze([]);
  if (world.width < 960 || world.height < 540) return Object.freeze([]);

  const scaleX = world.width / NOMINAL_WIDTH;
  const scaleY = world.height / NOMINAL_HEIGHT;
  const seed = Number.isInteger(world[CLIMB_LAYOUT_SEED]) ? world[CLIMB_LAYOUT_SEED] : 0;
  const runs = proceduralRuns(seed);
  return Object.freeze(
    runs.map((run, index) =>
      Object.freeze({
        id: `climb-wall-${index + 1}`,
        x: run.x * NOMINAL_WIDTH * scaleX,
        y: run.y * NOMINAL_HEIGHT * scaleY,
        width: run.width * NOMINAL_WIDTH * scaleX,
        height: run.height * NOMINAL_HEIGHT * scaleY,
      })
    )
  );
}

function proceduralRuns(seed) {
  const random = seededRandom(seed);
  const thickness = between(random, 0.021, 0.027);
  const leftEdge = between(random, 0.125, 0.155);
  const leftTurn = between(random, 0.285, 0.35);
  const centerTurn = between(random, 0.455, 0.52);
  const rightTurn = between(random, 0.59, 0.65);
  const rightEdge = between(random, 0.785, 0.855);
  const top = between(random, 0.105, 0.135);
  const upper = between(random, 0.35, 0.39);
  const lower = between(random, 0.565, 0.62);
  const bottom = between(random, 0.745, 0.795);
  const centerVerticalTop = Math.max(lower + 0.035, 0.6);

  return Object.freeze([
    horizontal(leftEdge, leftTurn, top, thickness),
    horizontal(leftEdge, leftTurn, upper, thickness),
    horizontal(leftEdge, leftTurn, lower, thickness),
    vertical(leftTurn, lower, bottom, thickness),
    horizontal(leftTurn, centerTurn, bottom, thickness),
    vertical(rightTurn, top, upper, thickness),
    horizontal(rightTurn, rightEdge, upper, thickness),
    vertical(rightEdge, upper, lower, thickness),
    horizontal(rightTurn, rightEdge, lower, thickness),
    vertical(rightTurn, lower, bottom, thickness),
    horizontal(centerTurn, rightTurn, bottom, thickness),
    vertical(centerTurn, centerVerticalTop, bottom, thickness),
  ]);
}

function horizontal(startX, endX, y, thickness) {
  const x = Math.min(startX, endX);
  return Object.freeze({
    x,
    y: y - thickness / 2,
    width: Math.abs(endX - startX),
    height: thickness,
  });
}

function vertical(x, startY, endY, thickness) {
  const y = Math.min(startY, endY);
  return Object.freeze({
    x: x - thickness / 2,
    y,
    width: thickness,
    height: Math.abs(endY - startY),
  });
}

function between(random, min, max) {
  return min + (max - min) * random();
}

function normalizeSeed(seed) {
  return Number.isFinite(seed) ? seed >>> 0 : 0;
}

function seededRandom(seed) {
  let state = normalizeSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}
