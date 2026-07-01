export const MODULE_NATIVE_SPRITES_SLOTS = Object.freeze(["sprites"]);

export const MODULE_NATIVE_SPRITES_PROOF_SLOTS = Object.freeze(["createSpriteSystem"]);

/**
 * @param {any} [options]
 */
export function createSpriteSystem(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const sprites = requireGlobal(globalThis, "TapSurvivorSprites");
  const factory = sprites.createSpriteSystem;

  if (typeof factory !== "function") {
    throw new Error("Missing Tap Survivor module sprites dependency: createSpriteSystem");
  }

  return factory(resolvedOptions);
}

function requireGlobal(globalRef, name) {
  const value = globalRef?.[name];
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module sprites dependency: ${name}`);
  }
  return value;
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module sprites dependency: ${name}`);
  }
  return value;
}
