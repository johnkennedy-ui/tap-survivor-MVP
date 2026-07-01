export const MODULE_NATIVE_COMBAT_SLOTS = Object.freeze(["combat"]);

export const MODULE_NATIVE_COMBAT_PROOF_SLOTS = Object.freeze(["createCombatSystem"]);

/**
 * @param {any} [options]
 */
export function createCombatSystem(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const combat = requireGlobal(globalThis, "TapSurvivorCombat");
  const factory = combat.createCombatSystem;

  if (typeof factory !== "function") {
    throw new Error("Missing Tap Survivor module combat dependency: createCombatSystem");
  }

  return factory(resolvedOptions);
}

function requireGlobal(globalRef, name) {
  const value = globalRef?.[name];
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module combat dependency: ${name}`);
  }
  return value;
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module combat dependency: ${name}`);
  }
  return value;
}
