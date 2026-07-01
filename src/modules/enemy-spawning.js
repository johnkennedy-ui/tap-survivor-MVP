export const MODULE_NATIVE_ENEMY_SPAWN_SLOTS = Object.freeze(["enemySpawning"]);

export const MODULE_NATIVE_ENEMY_SPAWN_PROOF_SLOTS = Object.freeze(["createEnemySpawnSystem"]);

/**
 * @param {any} [options]
 */
export function createEnemySpawnSystem(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const enemySpawning = requireGlobal(globalThis, "TapSurvivorEnemySpawning");
  const factory = enemySpawning.createEnemySpawnSystem;

  if (typeof factory !== "function") {
    throw new Error("Missing Tap Survivor module enemy spawn dependency: createEnemySpawnSystem");
  }

  return factory(resolvedOptions);
}

function requireGlobal(globalRef, name) {
  const value = globalRef?.[name];
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module enemy spawn dependency: ${name}`);
  }
  return value;
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module enemy spawn dependency: ${name}`);
  }
  return value;
}
