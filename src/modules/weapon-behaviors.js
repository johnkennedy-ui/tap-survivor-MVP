export const MODULE_NATIVE_WEAPON_BEHAVIORS_SLOTS = Object.freeze(["weaponBehaviors"]);

export const MODULE_NATIVE_WEAPON_BEHAVIORS_PROOF_SLOTS = Object.freeze([
  "createWeaponBehaviorSystem",
]);

/**
 * @param {any} [options]
 */
export function createWeaponBehaviorSystem(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const weaponBehaviors = requireGlobal(globalThis, "TapSurvivorWeaponBehaviors");
  const factory = weaponBehaviors.createWeaponBehaviorSystem;

  if (typeof factory !== "function") {
    throw new Error(
      "Missing Tap Survivor module weapon-behaviors dependency: createWeaponBehaviorSystem"
    );
  }

  return factory(resolvedOptions);
}

function requireGlobal(globalRef, name) {
  const value = globalRef?.[name];
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module weapon-behaviors dependency: ${name}`);
  }
  return value;
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module weapon-behaviors dependency: ${name}`);
  }
  return value;
}
