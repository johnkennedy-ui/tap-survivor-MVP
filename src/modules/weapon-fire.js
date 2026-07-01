export const MODULE_NATIVE_WEAPON_FIRE_SLOTS = Object.freeze(["weaponFire"]);

export const MODULE_NATIVE_WEAPON_FIRE_PROOF_SLOTS = Object.freeze(["createWeaponFireSystem"]);

/**
 * @param {any} [options]
 */
export function createWeaponFireSystem(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const weaponFire = requireGlobal(globalThis, "TapSurvivorWeaponFire");
  const factory = weaponFire.createWeaponFireSystem;

  if (typeof factory !== "function") {
    throw new Error("Missing Tap Survivor module weapon-fire dependency: createWeaponFireSystem");
  }

  return factory(resolvedOptions);
}

function requireGlobal(globalRef, name) {
  const value = globalRef?.[name];
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module weapon-fire dependency: ${name}`);
  }
  return value;
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module weapon-fire dependency: ${name}`);
  }
  return value;
}
