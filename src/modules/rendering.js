export const MODULE_NATIVE_RENDERING_SLOTS = Object.freeze(["rendering"]);

export const MODULE_NATIVE_RENDERING_PROOF_SLOTS = Object.freeze(["createRenderer"]);

/**
 * @param {any} [options]
 */
export function createRenderer(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const rendering = requireGlobal(globalThis, "TapSurvivorRendering");
  const factory = rendering.createRenderer;

  if (typeof factory !== "function") {
    throw new Error("Missing Tap Survivor module rendering dependency: createRenderer");
  }

  return factory(resolvedOptions);
}

function requireGlobal(globalRef, name) {
  const value = globalRef?.[name];
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module rendering dependency: ${name}`);
  }
  return value;
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module rendering dependency: ${name}`);
  }
  return value;
}
