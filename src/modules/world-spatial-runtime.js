import { createWorld, cameraFor, visibleWorldBounds, rayExit } from "./world-camera.js";

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
    return createWorld({
      modeId,
      width: supplied ? world.width : canvas.width,
      height: supplied ? world.height : canvas.height,
      worldScale: supplied ? 1 : worldScale,
      zoom: supplied ? (world.zoom ?? zoom) : zoom,
    });
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

  return Object.freeze({ createRunWorld, physicalSize, visibleBounds, spawnPosition });
}
