export const MODULE_NATIVE_ENEMY_BEHAVIOR_SLOTS = Object.freeze(["enemyBehaviors"]);

export const MODULE_NATIVE_ENEMY_BEHAVIOR_PROOF_SLOTS = Object.freeze([
  "createEnemyBehaviorSystem",
]);

/**
 * @param {any} [options]
 */
export function createEnemyBehaviorSystem(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const enemyBehaviors = requireGlobal(globalThis, "TapSurvivorEnemyBehaviors");
  const factory = enemyBehaviors.createEnemyBehaviorSystem;

  if (typeof factory !== "function") {
    throw new Error(
      "Missing Tap Survivor module enemy behavior dependency: createEnemyBehaviorSystem"
    );
  }

  return factory(resolvedOptions);
}

function requireGlobal(globalRef, name) {
  const value = globalRef?.[name];
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module enemy behavior dependency: ${name}`);
  }
  return value;
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module enemy behavior dependency: ${name}`);
  }
  return value;
}
