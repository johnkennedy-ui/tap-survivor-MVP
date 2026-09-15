export const DIRECTIONAL_HEADINGS = Object.freeze(["nw", "n", "ne", "w", "e", "sw", "s", "se"]);

/** Resolve a vector to the nearest 45-degree sector in screen coordinates. */
export function resolveHeading(x, y, fallback = "s") {
  const dx = Number(x);
  const dy = Number(y);
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.hypot(dx, dy) < 0.0001) {
    return DIRECTIONAL_HEADINGS.includes(fallback) ? fallback : "s";
  }
  const sector = Math.round((Math.atan2(-dy, dx) / (Math.PI / 4) + 8) % 8) % 8;
  return ["e", "ne", "n", "nw", "w", "sw", "s", "se"][sector];
}

export function headingForEntity(entity, fallback = "s") {
  const chargeX = Number(entity?.chargeDirX);
  const chargeY = Number(entity?.chargeDirY);
  if (entity?.chargeState && Math.hypot(chargeX, chargeY) >= 0.0001) return resolveHeading(chargeX, chargeY, fallback);
  const velocityX = Number(entity?.vx);
  const velocityY = Number(entity?.vy);
  if (Math.hypot(velocityX, velocityY) >= 0.0001) return resolveHeading(velocityX, velocityY, fallback);
  return resolveHeading(entity?.facingX, entity?.facingY, fallback);
}
