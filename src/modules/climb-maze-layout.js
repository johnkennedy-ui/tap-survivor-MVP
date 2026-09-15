const NOMINAL_WIDTH = 2880;
const NOMINAL_HEIGHT = 1620;

// Runs deliberately meet at their ends: their alternating turns form a legible
// maze while the broad centre and outside ring remain connected escape routes.
const MAZE_RUNS = Object.freeze([
  Object.freeze({ x: 0.12, y: 0.12, width: 0.24, height: 0.024 }),
  Object.freeze({ x: 0.12, y: 0.12, width: 0.024, height: 0.26 }),
  Object.freeze({ x: 0.12, y: 0.36, width: 0.2, height: 0.024 }),
  Object.freeze({ x: 0.296, y: 0.32, width: 0.024, height: 0.064 }),
  Object.freeze({ x: 0.12, y: 0.58, width: 0.22, height: 0.024 }),
  Object.freeze({ x: 0.316, y: 0.58, width: 0.024, height: 0.2 }),
  Object.freeze({ x: 0.316, y: 0.756, width: 0.2, height: 0.024 }),
  Object.freeze({ x: 0.6, y: 0.12, width: 0.024, height: 0.23 }),
  Object.freeze({ x: 0.6, y: 0.326, width: 0.23, height: 0.024 }),
  Object.freeze({ x: 0.806, y: 0.326, width: 0.024, height: 0.22 }),
  Object.freeze({ x: 0.6, y: 0.55, width: 0.23, height: 0.024 }),
  Object.freeze({ x: 0.6, y: 0.55, width: 0.024, height: 0.23 }),
  Object.freeze({ x: 0.47, y: 0.756, width: 0.154, height: 0.024 }),
  Object.freeze({ x: 0.47, y: 0.6, width: 0.024, height: 0.18 }),
]);

/**
 * Creates immutable Climb terrain descriptors for a valid simulation world.
 * The layout is expressed in normalized nominal-world coordinates so the same
 * maze shape works at 2880x1620 and the supported 960x540 minimum.
 *
 * @param {{ width?: number, height?: number }} world
 * @returns {ReadonlyArray<Readonly<{ id: string, x: number, y: number, width: number, height: number }>>}
 */
export function createClimbMazeWalls(world) {
  if (!Number.isFinite(world?.width) || !Number.isFinite(world?.height)) return Object.freeze([]);
  if (world.width < 960 || world.height < 540) return Object.freeze([]);

  const scaleX = world.width / NOMINAL_WIDTH;
  const scaleY = world.height / NOMINAL_HEIGHT;
  return Object.freeze(
    MAZE_RUNS.map((run, index) =>
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
