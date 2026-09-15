import { createWorld, cameraFor, visibleWorldBounds, rayExit } from "./world-camera.js";

import { createClimbMazeWalls } from "./climb-maze-layout.js";

const wallCache = new WeakMap();
const routeCache = new WeakMap();

function climbSolidWalls(world) {
  if (world?.modeId !== "climb" || !Number.isFinite(world.width) || !Number.isFinite(world.height))
    return [];
  if (world.width < 960 || world.height < 540) return [];
  if (Array.isArray(world.solidWalls)) return world.solidWalls;
  const cached = wallCache.get(world);
  if (cached) return cached;
  const walls = createClimbMazeWalls(world);
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
    return worldWithSolidWalls(
      createWorld({
        modeId,
        width: supplied ? world.width : canvas.width,
        height: supplied ? world.height : canvas.height,
        worldScale: supplied ? 1 : worldScale,
        zoom: supplied ? (world.zoom ?? zoom) : zoom,
      })
    );
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
    const walls = solidWalls(game);
    let changed = false;
    if (previous?.canSweep !== false) {
      let from = start;
      let remaining = { x: actor.x - start.x, y: actor.y - start.y };
      for (let pass = 0; pass < 2 && (remaining.x || remaining.y); pass += 1) {
        const end = { x: from.x + remaining.x, y: from.y + remaining.y };
        const hit = earliestWallHit(from, end, walls, radius);
        if (!hit) {
          actor.x = end.x;
          actor.y = end.y;
          break;
        }
        const time = Math.max(0, hit.time - 0.00001);
        actor.x = from.x + remaining.x * time;
        actor.y = from.y + remaining.y * time;
        const remainder = 1 - time;
        remaining = { x: remaining.x * remainder, y: remaining.y * remainder };
        if (hit.normalX) remaining.x = 0;
        if (hit.normalY) remaining.y = 0;
        from = { x: actor.x, y: actor.y };
        changed = true;
      }
    }
    for (let pass = 0; pass < walls.length; pass += 1) {
      let pushed = false;
      for (const wall of walls) pushed = pushOutOfWall(actor, wall, radius) || pushed;
      changed = changed || pushed;
      if (!pushed) break;
    }
    return changed;
  }

  function openPosition(game, point, radius = 0, bounds = null) {
    const actor = { radius, x: point?.x, y: point?.y };
    resolveSolidTerrain(game, actor, { canSweep: false, x: actor.x, y: actor.y });
    if (
      bounds &&
      (actor.x < bounds.left ||
        actor.x > bounds.right ||
        actor.y < bounds.top ||
        actor.y > bounds.bottom)
    ) {
      // Boss landings retain their visible-region inset even when a joined
      // wall would push the sampled point beyond it. No additional RNG draws.
      const walls = solidWalls(game);
      const xs = [
        Math.max(bounds.left, Math.min(bounds.right, point.x)),
        bounds.left,
        bounds.right,
      ];
      const ys = [
        Math.max(bounds.top, Math.min(bounds.bottom, point.y)),
        bounds.top,
        bounds.bottom,
      ];
      for (const wall of walls) {
        xs.push(wall.x - radius, wall.x + wall.width + radius);
        ys.push(wall.y - radius, wall.y + wall.height + radius);
      }
      let best = null,
        bestDistance = Infinity;
      for (const x of new Set(xs))
        for (const y of new Set(ys)) {
          if (
            x < bounds.left ||
            x > bounds.right ||
            y < bounds.top ||
            y > bounds.bottom ||
            !nodeClear({ x, y }, walls, radius)
          )
            continue;
          const distance = (x - point.x) ** 2 + (y - point.y) ** 2;
          if (distance < bestDistance) {
            best = { x, y };
            bestDistance = distance;
          }
        }
      if (best) return best;
    }
    return { x: actor.x, y: actor.y };
  }

  function routePosition(game, actor, target) {
    if (!actor || !target) return target;
    const radius = Math.max(0, Number(actor.radius) || 0);
    const walls = solidWalls(game);
    if (!walls.length || pathOpen(actor, target, walls, radius)) return target;
    const graph = routeGraph(game?.world, walls, radius);
    const nodes = [actor, ...graph.nodes, target];
    const distances = Array(nodes.length).fill(Infinity);
    const previous = Array(nodes.length).fill(-1);
    const pending = new Set(nodes.map((_, index) => index));
    distances[0] = 0;
    while (pending.size) {
      let current = -1;
      for (const index of pending)
        if (current < 0 || distances[index] < distances[current]) current = index;
      if (current < 0 || !Number.isFinite(distances[current]) || current === nodes.length - 1)
        break;
      pending.delete(current);
      for (let next = 0; next < nodes.length; next += 1) {
        const staticEdge =
          current > 0 && current < nodes.length - 1 && next > 0 && next < nodes.length - 1;
        if (
          !pending.has(next) ||
          (staticEdge
            ? !graph.edges[current - 1][next - 1]
            : !pathOpen(nodes[current], nodes[next], walls, radius))
        )
          continue;
        const candidate =
          distances[current] +
          Math.hypot(nodes[current].x - nodes[next].x, nodes[current].y - nodes[next].y);
        if (candidate < distances[next]) {
          distances[next] = candidate;
          previous[next] = current;
        }
      }
    }
    if (previous[nodes.length - 1] < 0) return target;
    let waypoint = nodes.length - 1;
    while (previous[waypoint] !== 0 && previous[waypoint] >= 0) waypoint = previous[waypoint];
    return nodes[waypoint] || target;
  }

  function routeGraph(world, walls, radius) {
    const cacheOwner = world && typeof world === "object" ? world : null;
    const fingerprint = walls
      .map((wall) => `${wall.x},${wall.y},${wall.width},${wall.height}`)
      .join(";");
    const cached = cacheOwner && routeCache.get(cacheOwner);
    const byRadius = cached || new Map();
    const prior = byRadius.get(radius);
    if (prior?.fingerprint === fingerprint) return prior;
    const pad = radius + 8;
    const nodes = walls
      .flatMap((wall) => [
        { x: wall.x - pad, y: wall.y - pad },
        { x: wall.x + wall.width + pad, y: wall.y - pad },
        { x: wall.x - pad, y: wall.y + wall.height + pad },
        { x: wall.x + wall.width + pad, y: wall.y + wall.height + pad },
      ])
      .filter(
        (node, index, all) =>
          nodeClear(node, walls, radius) &&
          all.findIndex((other) => other.x === node.x && other.y === node.y) === index
      );
    const edges = nodes.map((node, index) =>
      nodes.map((other, otherIndex) => index !== otherIndex && pathOpen(node, other, walls, radius))
    );
    const graph = Object.freeze({
      fingerprint,
      nodes: Object.freeze(nodes),
      edges: Object.freeze(edges.map((row) => Object.freeze(row))),
    });
    byRadius.set(radius, graph);
    if (cacheOwner) routeCache.set(cacheOwner, byRadius);
    return graph;
  }

  function pathOpen(start, end, walls, radius) {
    return (
      nodeClear(start, walls, radius) &&
      nodeClear(end, walls, radius) &&
      !walls.some((wall) => segmentEntry(start, end, wall, radius))
    );
  }

  function nodeClear(point, walls, radius) {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return false;
    return !walls.some((wall) => {
      const nearestX = Math.max(wall.x, Math.min(wall.x + wall.width, point.x));
      const nearestY = Math.max(wall.y, Math.min(wall.y + wall.height, point.y));
      return Math.hypot(point.x - nearestX, point.y - nearestY) < radius - 0.0001;
    });
  }

  function earliestWallHit(start, end, walls, radius) {
    let earliest = null;
    for (const wall of walls) {
      const hit = segmentEntry(start, end, wall, radius);
      if (hit && (!earliest || hit.time < earliest.time)) earliest = hit;
    }
    return earliest;
  }

  function segmentEntry(start, end, wall, radius) {
    const left = wall.x - radius;
    const right = wall.x + wall.width + radius;
    const top = wall.y - radius;
    const bottom = wall.y + wall.height + radius;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    // Contact correction can leave a circle-clear centre inside an expanded
    // AABB corner. Permit outward/tangent escape, not an unchecked sweep
    // through the collider simply because the AABB entry time is already zero.
    if (start.x > left && start.x < right && start.y > top && start.y < bottom) {
      const nearestX = Math.max(wall.x, Math.min(wall.x + wall.width, start.x));
      const nearestY = Math.max(wall.y, Math.min(wall.y + wall.height, start.y));
      const offsetX = start.x - nearestX,
        offsetY = start.y - nearestY;
      const length = Math.hypot(offsetX, offsetY);
      if (length >= radius - 0.0001 && length > 0 && dx * offsetX + dy * offsetY < 0) {
        return { time: 0, normalX: offsetX / length, normalY: offsetY / length };
      }
    }
    let enter = 0;
    let exit = 1;
    for (const [origin, delta, min, max] of [
      [start.x, dx, left, right],
      [start.y, dy, top, bottom],
    ]) {
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
    if (enter < 0 || enter > 1) return null;
    const atX =
      Math.abs(start.x + dx * enter - left) < 0.0001
        ? -1
        : Math.abs(start.x + dx * enter - right) < 0.0001
          ? 1
          : 0;
    const atY =
      Math.abs(start.y + dy * enter - top) < 0.0001
        ? -1
        : Math.abs(start.y + dy * enter - bottom) < 0.0001
          ? 1
          : 0;
    if (atX && atY) {
      // A corner is entered only when both incident faces are crossed. A path
      // that merely grazes one face must retain its legal tangent/escape move.
      if (!(dx * atX < 0 && dy * atY < 0)) return null;
      const scale = Math.SQRT1_2;
      const normalX = atX * scale;
      const normalY = atY * scale;
      return { time: enter, normalX, normalY };
    }
    if (enter === 0 && dx * atX + dy * atY >= 0) return null;
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
