import { composeRuntime, createBrowserPlatform } from "./compose-runtime.js";

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
    dependencies,
    platform = createBrowserPlatform({ globalRef: options.globalRef }),
  } = options;

  if (!dependencies) {
    throw new Error("Missing Tap Survivor module runtime test dependency: dependencies");
  }

  const runtime = composeRuntime({
    platform,
    dependencies,
  });
  if (autoInitialize) runtime.initializeRuntime();

  return {
    platform,
    runtime,
  };
}
