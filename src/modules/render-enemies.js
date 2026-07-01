export const MODULE_NATIVE_RENDER_ENEMIES_SLOTS = Object.freeze(["renderEnemies"]);

export const MODULE_NATIVE_RENDER_ENEMIES_PROOF_SLOTS = Object.freeze([
  "createEnemyRenderer",
]);

/**
 * @param {any} [options]
 */
export function createEnemyRenderer(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const renderEnemies = requireGlobal(globalThis, "TapSurvivorRenderEnemies");
  const factory = renderEnemies.createEnemyRenderer;

  if (typeof factory !== "function") {
    throw new Error("Missing Tap Survivor module render-enemies dependency: createEnemyRenderer");
  }

  return factory(resolvedOptions);
}

function requireGlobal(globalRef, name) {
  const value = globalRef?.[name];
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module render-enemies dependency: ${name}`);
  }
  return value;
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module render-enemies dependency: ${name}`);
  }
  return value;
}
