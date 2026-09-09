import {
  cameraFor,
  clientToView,
  viewToWorld,
  visibleWorldBounds,
  worldBounds,
} from "./world-camera.js";

const playerVisualInset = (player) =>
  Math.max(56, Number.isFinite(player?.pickupRadius) ? player.pickupRadius + 2 : 0);

const movementBounds = (bounds, player) => {
  const preferredInset = playerVisualInset(player);
  const xInset = Math.min(preferredInset, bounds.right / 2);
  const yInset = Math.min(preferredInset, bounds.bottom / 2);
  return {
    minX: xInset,
    maxX: bounds.right - xInset,
    minY: yInset,
    maxY: bounds.bottom - yInset,
  };
};

// Source-owned composition capability: derive, never retain, a run's camera.
export function createWorldViewRuntime({ canvas }) {
  function snapshot(game) {
    if (!game?.world || !game?.player) return null;
    const viewport = Object.freeze({ width: canvas.width, height: canvas.height });
    const camera = cameraFor({ world: game.world, viewport, player: game.player });
    return Object.freeze({
      camera,
      viewport,
      visibleBounds: visibleWorldBounds(camera),
      worldBounds: worldBounds(game.world),
    });
  }

  function targetFromEvent(event, game) {
    const point = event?.touches ? event.touches[0] : event;
    const view = clientToView(
      { x: point?.clientX, y: point?.clientY },
      canvas.getBoundingClientRect(),
      canvas
    );
    const spatialView = snapshot(game);
    if (!spatialView) return view;
    const pointInWorld = viewToWorld(view, spatialView.camera);
    const limits = movementBounds(spatialView.worldBounds, game.player);
    return Object.freeze({
      x: Math.max(limits.minX, Math.min(limits.maxX, pointInWorld.x)),
      y: Math.max(limits.minY, Math.min(limits.maxY, pointInWorld.y)),
    });
  }

  return Object.freeze({ snapshot, targetFromEvent });
}
