import { createBrowserPlatform } from "./compose-runtime.js";
import { createModuleGameLifecycleOwner } from "../modules/module-game-lifecycle.js";

/**
 * Test-only module runtime entrypoint.
 *
 * Production still boots through index.html classic script order. This helper
 * proves the future ESM entrypoint shape can create the runtime from injected
 * browser/platform dependencies without reading classic compatibility globals.
 *
 * @param {any} [options]
 */
export function createModuleRuntimeTestEntrypoint(options = {}) {
  const {
    autoInitialize = false,
    dependencyBagOptions,
    dependencies,
    lifecycleHooks,
    platform = createBrowserPlatform({ globalRef: options.globalRef }),
  } = options;

  const lifecycle = createModuleGameLifecycleOwner({
    dependencies,
    dependencyBagOptions,
    lifecycleHooks,
    platform,
  });
  if (autoInitialize) lifecycle.init();

  return {
    dependencies: lifecycle.dependencies,
    lifecycle,
    platform,
    runtime: lifecycle.runtime,
  };
}
