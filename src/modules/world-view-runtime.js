import {
  cameraFor,
  clientToView,
  viewToWorld,
  visibleWorldBounds,
  worldBounds,
} from "./world-camera.js";

const playerVisualInset = (player) =>
  Math.max(56, Number.isFinite(player?.pickupRadius) ? player.pickupRadius + 2 : 0);

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
    const inset = playerVisualInset(game.player);
    return Object.freeze({
      x: Math.max(inset, Math.min(spatialView.worldBounds.right - inset, pointInWorld.x)),
      y: Math.max(inset, Math.min(spatialView.worldBounds.bottom - inset, pointInWorld.y)),
    });
  }

  return Object.freeze({ snapshot, targetFromEvent });
}
