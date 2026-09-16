/**
 * Pure spatial seam. All returned records are frozen, with no retained inputs.
 *
 * World: { modeId, width, height, zoom } in simulation units; zoom is configured.
 * Camera: { x, y, zoom, width, height }; x/y are the visible world's top-left,
 * width/height are visible WORLD dimensions, zoom is effective view/world scale.
 * Point: { x, y }. Bounds: { left, top, right, bottom }, inclusive world edges.
 * Ray exit: { x, y, distance, hitX, hitY }; point + direction * distance.
 * `distance` is a ray parameter (a physical distance only for unit directions).
 *
 * Numeric inputs must be finite numbers, not coerced strings. Sizes/scales must
 * be positive. Invalid or unrepresentable geometry throws RangeError. Callers
 * handle invalid input before changing movement targets or first-input gates.
 * No DOM, ambient runtime state, randomness, save access, or input mutation.
 */

function finite(value, label) {
  if (!Number.isFinite(value)) throw new RangeError(`${label} must be finite`);
  return value === 0 ? 0 : value;
}

function positive(value, label) {
  finite(value, label);
  if (value <= 0) throw new RangeError(`${label} must be positive`);
  return value;
}

function checkPoint(point, label) {
  finite(point?.x, `${label}.x`);
  finite(point?.y, `${label}.y`);
}

function checkSize(size, label) {
  positive(size?.width, `${label}.width`);
  positive(size?.height, `${label}.height`);
}

function checkCamera(camera) {
  checkPoint(camera, "camera");
  checkSize(camera, "camera");
  positive(camera.zoom, "camera.zoom");
}

function pointRecord(x, y) {
  return Object.freeze({ x: finite(x, "result.x"), y: finite(y, "result.y") });
}

function boundsRecord(left, top, right, bottom) {
  finite(left, "bounds.left");
  finite(top, "bounds.top");
  finite(right, "bounds.right");
  finite(bottom, "bounds.bottom");
  if (right <= left || bottom <= top) throw new RangeError("bounds must have positive area");
  return Object.freeze({ left: left === 0 ? 0 : left, top: top === 0 ? 0 : top, right, bottom });
}

/**
 * Logical run-start width/height are required. Only exact modeId === "farm"
 * selects Farm; absent/unknown modes select Climb. All supplied numeric options
 * are validated even in Farm, where valid worldScale/zoom are ignored.
 * @param {{modeId?: unknown, width?: number, height?: number, worldScale?: number, zoom?: number}} [options]
 */
export function createWorld({ modeId, width, height, worldScale = 3, zoom = 1.25 } = {}) {
  checkSize({ width, height }, "viewport");
  positive(worldScale, "worldScale");
  positive(zoom, "zoom");
  const farm = modeId === "farm";
  return Object.freeze({
    modeId: farm ? "farm" : "climb",
    width: positive(farm ? width : width * worldScale, "world.width"),
    height: positive(farm ? height : height * worldScale, "world.height"),
    zoom: farm ? 1 : zoom,
  });
}

/**
 * Derive a snapshot from the current player, including teleports/outside points.
 * Climb raises effective zoom for small worlds/large logical viewports without
 * changing world.zoom. Farm is always identity; an oversized logical Farm
 * viewport is rejected rather than silently zooming or exposing off-map pixels.
 * CSS-only resize belongs in clientToView and never changes world dimensions.
 * @param {{world?: {modeId?: unknown, width: number, height: number, zoom: number}, viewport?: {width: number, height: number}, player?: {x: number, y: number}}} [options]
 */
export function cameraFor({ world, viewport, player } = {}) {
  checkSize(world, "world");
  positive(world.zoom, "world.zoom");
  checkSize(viewport, "viewport");
  checkPoint(player, "player");
  if (world.modeId === "farm") {
    if (viewport.width > world.width || viewport.height > world.height) {
      throw new RangeError("Farm identity viewport must fit the world");
    }
    return Object.freeze({ x: 0, y: 0, zoom: 1, width: viewport.width, height: viewport.height });
  }
  let zoom = positive(
    Math.max(world.zoom, viewport.width / world.width, viewport.height / world.height),
    "effective zoom"
  );
  // A rounded-down fit ratio must not leave a sliver of off-map viewport.
  if (viewport.width / zoom > world.width || viewport.height / zoom > world.height) {
    zoom = positive(zoom * (1 + Number.EPSILON), "effective zoom");
  }
  const width = positive(viewport.width / zoom, "camera.width");
  const height = positive(viewport.height / zoom, "camera.height");
  return Object.freeze({
    x: Math.max(0, Math.min(world.width - width, player.x - width / 2)),
    y: Math.max(0, Math.min(world.height - height, player.y - height / 2)),
    zoom,
    width,
    height,
  });
}

/** Convert world units to logical view/backing-canvas units (not CSS pixels). */
export function worldToView(point, camera) {
  checkPoint(point, "point");
  checkCamera(camera);
  return pointRecord((point.x - camera.x) * camera.zoom, (point.y - camera.y) * camera.zoom);
}

/** Convert logical view units to world units; points are intentionally not clamped. */
export function viewToWorld(point, camera) {
  checkPoint(point, "point");
  checkCamera(camera);
  return pointRecord(point.x / camera.zoom + camera.x, point.y / camera.zoom + camera.y);
}

/**
 * point is {x: clientX, y: clientY}; rect is {left, top, width, height} in CSS
 * pixels and viewport is {width, height} in logical view units. Apply independent
 * CSS axis scales exactly once. No DPR multiplier, camera offset, or clamp here.
 * Missing points (including empty touch lists) and zero-sized rects must not be
 * passed through as targets: they throw. Values outside the rect remain outside.
 */
export function clientToView(point, rect, viewport) {
  checkPoint(point, "client");
  finite(rect?.left, "rect.left");
  finite(rect?.top, "rect.top");
  checkSize(rect, "rect");
  checkSize(viewport, "viewport");
  return pointRecord(
    ((point.x - rect.left) / rect.width) * viewport.width,
    ((point.y - rect.top) / rect.height) * viewport.height
  );
}

/** Positive margin expands all edges; negative margin insets. Empty insets throw. */
export function worldBounds(world, margin = 0) {
  checkSize(world, "world");
  finite(margin, "margin");
  return boundsRecord(-margin, -margin, world.width + margin, world.height + margin);
}

/** Snapshot bounds in world units, not scaled view units. */
export function visibleWorldBounds(camera) {
  checkCamera(camera);
  return boundsRecord(camera.x, camera.y, camera.x + camera.width, camera.y + camera.height);
}

/**
 * Exit a nonempty inclusive bounds rect from an inside/on-edge point along a
 * finite nonzero direction. Outside origins throw (this is not an entry cast).
 * Axis-aligned rays are supported without division by zero. An outward ray on
 * an edge exits at distance 0; inward/tangent rays reach the next forward edge.
 * Exact corner ties set both hit flags. Near-corner hits keep the nearest axis.
 */
export function rayExit(point, direction, rect) {
  checkPoint(point, "point");
  checkPoint(direction, "direction");
  const { left, top, right, bottom } = boundsRecord(
    rect?.left,
    rect?.top,
    rect?.right,
    rect?.bottom
  );
  if (point.x < left || point.x > right || point.y < top || point.y > bottom) {
    throw new RangeError("ray origin must be inside bounds");
  }
  if (direction.x === 0 && direction.y === 0) throw new RangeError("ray direction must be nonzero");
  const xEdge = direction.x > 0 ? right : left;
  const yEdge = direction.y > 0 ? bottom : top;
  const tx = direction.x === 0 ? Infinity : (xEdge - point.x) / direction.x;
  const ty = direction.y === 0 ? Infinity : (yEdge - point.y) / direction.y;
  const distance = finite(Math.min(tx, ty), "ray distance");
  const hitX = tx === distance;
  const hitY = ty === distance;
  // Snap the hit axes exactly to their edges to avoid arithmetic overshoot.
  const x = hitX ? xEdge : Math.max(left, Math.min(right, point.x + direction.x * distance));
  const y = hitY ? yEdge : Math.max(top, Math.min(bottom, point.y + direction.y * distance));
  return Object.freeze({ ...pointRecord(x, y), distance, hitX, hitY });
}
