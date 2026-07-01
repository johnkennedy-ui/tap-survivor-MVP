export const MODULE_NATIVE_ENEMY_SLOTS = Object.freeze(["enemies"]);

export const MODULE_NATIVE_ENEMY_PROOF_SLOTS = Object.freeze(["createEnemySystem"]);

/**
 * @param {any} [options]
 */
export function createEnemySystem(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const enemies = requireGlobal(globalThis, "TapSurvivorEnemies");
  const factory = enemies.createEnemySystem;

  if (typeof factory !== "function") {
    throw new Error("Missing Tap Survivor module enemy dependency: createEnemySystem");
  }

  return factory(resolvedOptions);
}

function requireGlobal(globalRef, name) {
  const value = globalRef?.[name];
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module enemy dependency: ${name}`);
  }
  return value;
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module enemy dependency: ${name}`);
  }
  return value;
}
