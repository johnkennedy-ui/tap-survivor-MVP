import { createBrowserDependencyBagOptions } from "./browser-dependency-bag.js";
import { createBrowserPlatform } from "./compose-runtime.js";
import { createModuleGameDependencyBag } from "../modules/module-game-dependencies.js";
import { createModuleGameLifecycleOwner } from "../modules/module-game-lifecycle.js";

export const PRODUCTION_MODULE_ENTRYPOINT_PROOF_SLOTS = Object.freeze([
  "boot",
  "createDependencyBag",
  "createLifecycleOwner",
  "init",
  "startRun",
  "tick",
  "render",
  "persist",
  "dispose",
]);

/**
 * Production ESM entrypoint candidate.
 *
 * This is intentionally not selected by `index.html` yet. It proves the future
 * module script can compose the module dependency bag and lifecycle owner from
 * injected browser/platform dependencies without the classic script order.
 *
 * @param {any} [options]
 */
export function createProductionModuleEntrypoint(options = {}) {
  const {
    autoInitialize = false,
    autoStart = false,
    browserDependencyBagOptions,
    dependencyBagOptions,
    dependencies,
    globalRef,
    lifecycleHooks,
    platform,
  } = options;
  const resolvedGlobalRef = globalRef || globalThis;
  const resolvedPlatform =
    platform || createBrowserPlatform({ globalRef: resolvedGlobalRef });
  const resolvedDependencyBagOptions =
    dependencyBagOptions ||
    createBrowserDependencyBagOptions({
      ...(browserDependencyBagOptions || {}),
      documentRef: resolvedPlatform.documentRef,
      globalRef: resolvedGlobalRef,
    });
  const resolvedDependencies =
    dependencies ||
    createModuleGameDependencyBag(resolvedDependencyBagOptions);
  const lifecycle = createModuleGameLifecycleOwner({
    dependencies: resolvedDependencies,
    lifecycleHooks,
    platform: resolvedPlatform,
  });

  function boot({ start = autoStart } = {}) {
    lifecycle.init();
    if (start) lifecycle.startRun();
    return api;
  }

  const api = {
    boot,
    dependencies: resolvedDependencies,
    dispose: lifecycle.dispose,
    init: lifecycle.init,
    lifecycle,
    persist: lifecycle.persist,
    platform: resolvedPlatform,
    render: lifecycle.render,
    runtime: lifecycle.runtime,
    startRun: lifecycle.startRun,
    tick: lifecycle.tick,
  };

  if (autoInitialize) boot();

  return api;
}

export function bootProductionModuleEntrypoint(options = {}) {
  return createProductionModuleEntrypoint({
    ...options,
    autoInitialize: true,
  });
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor production module entrypoint option: ${name}`);
  }
  return value;
}
