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
  let lifecycle;
  const browserLoop = createProductionBrowserLoop({
    getGameSpeed: () => lifecycle?.runtime?.getGameSpeed?.() || 1,
    getLifecycle: () => lifecycle,
    runtimeGlobal: resolvedPlatform.runtimeGlobal,
  });
  const resolvedDependencyBagOptions =
    dependencyBagOptions ||
    createProductionBrowserDependencyBagOptions({
      browserDependencyBagOptions,
      browserLoop,
      documentRef: resolvedPlatform.documentRef,
      globalRef: resolvedGlobalRef,
      getLifecycle: () => lifecycle,
    });
  const resolvedDependencies =
    dependencies ||
    createModuleGameDependencyBag(resolvedDependencyBagOptions);
  lifecycle = createModuleGameLifecycleOwner({
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

export function bootProductionModuleRuntime(options = {}) {
  return bootProductionModuleEntrypoint(options);
}

function createProductionBrowserLoop({ getGameSpeed, getLifecycle, runtimeGlobal }) {
  let lastFrame = 0;

  function loop(now = 0) {
    const lifecycle = getLifecycle();
    if (!lifecycle || lifecycle.snapshot?.().disposed) return;
    const elapsed = lastFrame ? (Number(now) - lastFrame) / 1000 : 0;
    const dt = Math.min(0.05, Math.max(0, elapsed)) * getGameSpeed();
    lastFrame = Number(now) || lastFrame;
    lifecycle.tick(dt);
    lifecycle.render({ dt, now });
    runtimeGlobal.requestAnimationFrame(loop);
  }

  return { loop };
}

function createProductionBrowserDependencyBagOptions({
  browserDependencyBagOptions = {},
  browserLoop,
  documentRef,
  getLifecycle,
  globalRef,
}) {
  const resolvedOptions = createBrowserDependencyBagOptions({
    ...browserDependencyBagOptions,
    documentRef,
    globalRef,
    onStartRun: () => getLifecycle()?.startRun?.(),
  });
  resolvedOptions.adapters.platformAdapters.loop =
    browserDependencyBagOptions.platformAdapters?.loop || browserLoop.loop;
  return resolvedOptions;
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor production module entrypoint option: ${name}`);
  }
  return value;
}
