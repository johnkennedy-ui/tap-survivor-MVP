export const MODULE_NATIVE_RENDER_HUD_SLOTS = Object.freeze(["renderHud"]);

export const MODULE_NATIVE_RENDER_HUD_PROOF_SLOTS = Object.freeze(["createHudRenderer"]);

/**
 * @param {any} [options]
 */
export function createHudRenderer(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const renderHud = requireGlobal(globalThis, "TapSurvivorRenderHud");
  const factory = renderHud.createHudRenderer;

  if (typeof factory !== "function") {
    throw new Error("Missing Tap Survivor module render-hud dependency: createHudRenderer");
  }

  return factory(resolvedOptions);
}

function requireGlobal(globalRef, name) {
  const value = globalRef?.[name];
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module render-hud dependency: ${name}`);
  }
  return value;
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module render-hud dependency: ${name}`);
  }
  return value;
}
