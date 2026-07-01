export const MODULE_NATIVE_LEVEL_UP_SLOTS = Object.freeze(["levelUp"]);

export const MODULE_NATIVE_LEVEL_UP_PROOF_SLOTS = Object.freeze(["createLevelUpSystem"]);

/**
 * @param {any} [options]
 */
export function createLevelUpSystem(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const levelUp = requireGlobal(globalThis, "TapSurvivorLevelUp");
  const factory = levelUp.createLevelUpSystem;

  if (typeof factory !== "function") {
    throw new Error("Missing Tap Survivor module level-up dependency: createLevelUpSystem");
  }

  return factory(resolvedOptions);
}

function requireGlobal(globalRef, name) {
  const value = globalRef?.[name];
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module level-up dependency: ${name}`);
  }
  return value;
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module level-up dependency: ${name}`);
  }
  return value;
}
