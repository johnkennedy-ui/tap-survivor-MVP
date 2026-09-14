import { createWorld, cameraFor, visibleWorldBounds, rayExit } from "./world-camera.js";

const CLIMB_WALL_LAYOUT = Object.freeze([
  Object.freeze({ x: 0.19, y: 0.27, width: 0.09, height: 0.018 }),
  Object.freeze({ x: 0.34, y: 0.66, width: 0.018, height: 0.13 }),
  Object.freeze({ x: 0.58, y: 0.22, width: 0.1, height: 0.018 }),
  Object.freeze({ x: 0.7, y: 0.54, width: 0.018, height: 0.14 }),
  Object.freeze({ x: 0.82, y: 0.77, width: 0.1, height: 0.018 }),
]);
const wallCache = new WeakMap();

function climbSolidWalls(world) {
  if (world?.modeId !== "climb" || !Number.isFinite(world.width) || !Number.isFinite(world.height)) return [];
  if (world.width < 960 || world.height < 540) return [];
  if (Array.isArray(world.solidWalls)) return world.solidWalls;
  const cached = wallCache.get(world);
  if (cached) return cached;
  const walls = Object.freeze(
    CLIMB_WALL_LAYOUT.map((wall, id) =>
      Object.freeze({
        id: `climb-wall-${id + 1}`,
        x: world.width * wall.x,
        y: world.height * wall.y,
        width: world.width * wall.width,
        height: world.height * wall.height,
      })
    )
  );
  wallCache.set(world, walls);
  return walls;
}

function worldWithSolidWalls(world) {
  if (world?.modeId !== "climb") return world;
  const next = { ...world };
  Object.defineProperty(next, "solidWalls", {
    value: climbSolidWalls(world),
    enumerable: false,
  });
  return Object.freeze(next);
}

/**
 * Source-owned simulation capability, injected into native and retained factories.
 * The viewport is read live for spawn queries only; physical dimensions are fixed
 * by the run's copied, frozen descriptor. No RNG, save access or global publisher.
 */
export function createWorldSpatialRuntime({ canvas, worldScale = 3, zoom = 1.25 }) {
  /** @param {{ modeId?: unknown, world?: { width?: number, height?: number, zoom?: number } }} [options] */
  function createRunWorld({ modeId, world } = {}) {
    // A supplied world is already in simulation units (including boss continuation).
    // Invalid legacy dimensions fall back to a fresh viewport-based descriptor.
    const supplied =
      Number.isFinite(world?.width) &&
      world.width > 0 &&
      Number.isFinite(world?.height) &&
      world.height > 0;
    return worldWithSolidWalls(createWorld({
      modeId,
      width: supplied ? world.width : canvas.width,
      height: supplied ? world.height : canvas.height,
      worldScale: supplied ? 1 : worldScale,
      zoom: supplied ? (world.zoom ?? zoom) : zoom,
    }));
  }

  function physicalSize(game) {
    return game?.world || canvas;
  }

  function visibleBounds(game) {
    if (game?.world?.modeId !== "climb") return null;
    return visibleWorldBounds(
      cameraFor({ world: game.world, viewport: canvas, player: game.player })
    );
  }

  function spawnPosition(game, angle, margin) {
    const visible = visibleBounds(game);
    if (!visible) return null; // Farm keeps its original arithmetic and RNG mapping.
    const world = physicalSize(game);
    // Clip the expanded view to physical bounds, except for a bounded exterior
    // entry band where the camera actually touches a world edge. Never clamp a
    // sampled position back into view or substitute the distant world perimeter.
    const entry = {
      left: visible.left === 0 ? -margin : Math.max(0, visible.left - margin),
      top: visible.top === 0 ? -margin : Math.max(0, visible.top - margin),
      right:
        visible.right === world.width
          ? world.width + margin
          : Math.min(world.width, visible.right + margin),
      bottom:
        visible.bottom === world.height
          ? world.height + margin
          : Math.min(world.height, visible.bottom + margin),
    };
    const hit = rayExit(game.player, { x: Math.cos(angle), y: Math.sin(angle) }, entry);
    return { x: hit.x, y: hit.y };
  }

  function solidWalls(game) {
    return climbSolidWalls(game?.world);
  }

  function resolveSolidTerrain(game, actor, previous = actor) {
    const radius = Number.isFinite(actor?.radius) ? Math.max(0, actor.radius) : 0;
    if (!radius || !Number.isFinite(actor?.x) || !Number.isFinite(actor?.y)) return false;
    const start = {
      x: Number.isFinite(previous?.x) ? previous.x : actor.x,
      y: Number.isFinite(previous?.y) ? previous.y : actor.y,
    };
    let changed = false;
    for (const wall of solidWalls(game)) {
      const hit = previous?.canSweep === false ? null : segmentEntry(start, actor, wall, radius);
      if (hit) {
        const dx = actor.x - start.x;
        const dy = actor.y - start.y;
        actor.x = start.x + dx * Math.max(0, hit.time - 0.00001);
        actor.y = start.y + dy * Math.max(0, hit.time - 0.00001);
        if (hit.normalX && !hit.normalY) actor.y = start.y + dy;
        else if (hit.normalY && !hit.normalX) actor.x = start.x + dx;
        changed = true;
      }
      changed = pushOutOfWall(actor, wall, radius) || changed;
    }
    return changed;
  }

  function openPosition(game, point, radius = 0) {
    const actor = { radius, x: point?.x, y: point?.y };
    resolveSolidTerrain(game, actor, { canSweep: false, x: actor.x, y: actor.y });
    return { x: actor.x, y: actor.y };
  }

  function routePosition(game, actor, target) {
    if (!actor || !target) return target;
    const radius = Math.max(0, Number(actor.radius) || 0);
    for (const wall of solidWalls(game)) {
      if (!segmentEntry(actor, target, wall, radius)) continue;
      const pad = radius + 8;
      const ends = [
        { x: wall.x - pad, y: wall.y - pad },
        { x: wall.x + wall.width + pad, y: wall.y - pad },
        { x: wall.x - pad, y: wall.y + wall.height + pad },
        { x: wall.x + wall.width + pad, y: wall.y + wall.height + pad },
      ];
      return ends.reduce((best, point) =>
        routeLength(actor, point, target) < routeLength(actor, best, target) ? point : best
      );
    }
    return target;
  }

  function routeLength(actor, waypoint, target) {
    return Math.hypot(actor.x - waypoint.x, actor.y - waypoint.y) + Math.hypot(target.x - waypoint.x, target.y - waypoint.y);
  }

  function segmentEntry(start, end, wall, radius) {
    const left = wall.x - radius;
    const right = wall.x + wall.width + radius;
    const top = wall.y - radius;
    const bottom = wall.y + wall.height + radius;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    let enter = 0;
    let exit = 1;
    for (const [origin, delta, min, max] of [[start.x, dx, left, right], [start.y, dy, top, bottom]]) {
      if (Math.abs(delta) < 0.0000001) {
        if (origin < min || origin > max) return null;
        continue;
      }
      const first = (min - origin) / delta;
      const second = (max - origin) / delta;
      enter = Math.max(enter, Math.min(first, second));
      exit = Math.min(exit, Math.max(first, second));
      if (enter > exit) return null;
    }
    if (!(enter > 0 && enter <= 1)) return null;
    const atX = Math.abs((start.x + dx * enter) - left) < 0.0001 ? -1 : Math.abs((start.x + dx * enter) - right) < 0.0001 ? 1 : 0;
    const atY = Math.abs((start.y + dy * enter) - top) < 0.0001 ? -1 : Math.abs((start.y + dy * enter) - bottom) < 0.0001 ? 1 : 0;
    if (atX && atY) {
      const scale = Math.SQRT1_2;
      return { time: enter, normalX: atX * scale, normalY: atY * scale };
    }
    return { time: enter, normalX: atX, normalY: atY };
  }

  function pushOutOfWall(actor, wall, radius) {
    const nearestX = Math.max(wall.x, Math.min(wall.x + wall.width, actor.x));
    const nearestY = Math.max(wall.y, Math.min(wall.y + wall.height, actor.y));
    const dx = actor.x - nearestX;
    const dy = actor.y - nearestY;
    const distance = Math.hypot(dx, dy);
    if (distance >= radius - 0.00001) return false;
    if (distance > 0.00001) {
      const correction = radius - distance;
      actor.x += (dx / distance) * correction;
      actor.y += (dy / distance) * correction;
      return true;
    }
    const options = [
      [wall.x - radius - actor.x, 0],
      [wall.x + wall.width + radius - actor.x, 0],
      [0, wall.y - radius - actor.y],
      [0, wall.y + wall.height + radius - actor.y],
    ];
    options.sort((left, right) => Math.abs(left[0] + left[1]) - Math.abs(right[0] + right[1]));
    actor.x += options[0][0];
    actor.y += options[0][1];
    return true;
  }

  return Object.freeze({
    createRunWorld,
    physicalSize,
    visibleBounds,
    spawnPosition,
    solidWalls,
    resolveSolidTerrain,
    openPosition,
    routePosition,
  });
}
