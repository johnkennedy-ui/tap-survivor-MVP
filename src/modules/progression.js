export const MODULE_NATIVE_PROGRESSION_SLOTS = Object.freeze(["progression"]);

export const MODULE_NATIVE_PROGRESSION_PROOF_SLOTS = Object.freeze(["createProgressionSystem"]);

/**
 * @param {any} [options]
 */
export function createProgressionSystem(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const progression = requireGlobal(globalThis, "TapSurvivorProgression");
  const factory = progression.createProgressionSystem;

  if (typeof factory !== "function") {
    throw new Error("Missing Tap Survivor module progression dependency: createProgressionSystem");
  }

  return factory(resolvedOptions);
}

function requireGlobal(globalRef, name) {
  const value = globalRef?.[name];
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module progression dependency: ${name}`);
  }
  return value;
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module progression dependency: ${name}`);
  }
  return value;
}
