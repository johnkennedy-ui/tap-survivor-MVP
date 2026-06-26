import { createGameRuntimeController } from "../modules/game-runtime.js";

export function createBrowserPlatform({
  globalRef = globalThis,
  documentRef = globalRef.document,
} = {}) {
  return {
    documentRef,
    runtimeGlobal: {
      requestAnimationFrame: (callback) => globalRef.requestAnimationFrame(callback),
      addEventListener: (...args) => globalRef.addEventListener?.(...args),
      Capacitor: globalRef.Capacitor,
    },
  };
}

export function composeRuntime({ platform, dependencies }) {
  if (!platform?.documentRef) {
    throw new Error("Missing Tap Survivor module bootstrap dependency: platform.documentRef");
  }
  if (!platform?.runtimeGlobal?.requestAnimationFrame) {
    throw new Error("Missing Tap Survivor module bootstrap dependency: platform.runtimeGlobal");
  }
  if (!dependencies) {
    throw new Error("Missing Tap Survivor module bootstrap dependency: dependencies");
  }

  return createGameRuntimeController({
    ...dependencies,
    documentRef: platform.documentRef,
    globalRef: platform.runtimeGlobal,
  });
}
