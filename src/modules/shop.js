export const MODULE_NATIVE_SHOP_SLOTS = Object.freeze(["shop"]);

export const MODULE_NATIVE_SHOP_PROOF_SLOTS = Object.freeze(["createShopSystem"]);

/**
 * @param {any} [options]
 */
export function createShopSystem(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const shop = requireGlobal(globalThis, "TapSurvivorShop");
  const factory = shop.createShopSystem;

  if (typeof factory !== "function") {
    throw new Error("Missing Tap Survivor module shop dependency: createShopSystem");
  }

  return factory(resolvedOptions);
}

function requireGlobal(globalRef, name) {
  const value = globalRef?.[name];
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module shop dependency: ${name}`);
  }
  return value;
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module shop dependency: ${name}`);
  }
  return value;
}
