import { createRunUi } from "./run-ui.js";
import { createShellUiController } from "./shell-ui-controller.js";

export const MODULE_RUNTIME_UI_ADAPTER_SLOTS = Object.freeze([
  "runUiAdapter",
  "shellUiAdapter",
  "shopSystemAdapter",
  "ui",
]);

export const MODULE_RUNTIME_UI_ADAPTER_PROOF_SLOTS = Object.freeze([
  "runUiAdapter",
  "shellUiAdapter",
  "shopSystemAdapter",
  "ui",
]);

export const MODULE_RUNTIME_UI_ADAPTER_LOW_LEVEL_SLOTS = Object.freeze([
  "runUiAdapter",
  "shellUiAdapter",
  "shopSystemAdapter",
  "ui",
]);

export function createModuleRuntimeUiAdapters(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const ui = requireAdapter(resolvedOptions, "ui");
  const stateStore = resolvedOptions.stateStore || {};

  return {
    runUiAdapter: createRunUiService({
      fallbackAdapter: resolvedOptions.runUiAdapter,
      getGame: stateStore.getGame,
      getSave: stateStore.getSave,
      ui,
      ...(resolvedOptions.runUi || {}),
    }),
    shellUiAdapter: createShellUiService({
      fallbackAdapter: resolvedOptions.shellUiAdapter,
      ...(resolvedOptions.shellUi || {}),
    }),
    shopSystemAdapter: requireAdapter(resolvedOptions, "shopSystemAdapter"),
    ui,
  };
}

/** @param {any} [options] */
function createRunUiService({
  fallbackAdapter,
  formatTime,
  getGame,
  getSave,
  getGameSpeed,
  maxEquippedWeapons,
  renderDebug,
  ui,
} = {}) {
  if (
    typeof formatTime === "function" &&
    typeof getGame === "function" &&
    typeof getSave === "function" &&
    typeof getGameSpeed === "function" &&
    typeof maxEquippedWeapons === "function" &&
    typeof renderDebug === "function"
  ) {
    return createRunUi({
      formatTime,
      getGame,
      getSave,
      getGameSpeed,
      maxEquippedWeapons,
      renderDebug,
      ui,
    });
  }

  return requireAdapter({ fallbackAdapter }, "fallbackAdapter");
}

/** @param {any} [options] */
function createShellUiService({ fallbackAdapter, ...controllerOptions } = {}) {
  if (controllerOptions.shellRelicController) {
    const controller = createShellUiController(controllerOptions);
    return {
      bind: () => controller.init(),
      closeRunMenu: () => controller.closeMenu(),
      showTitleScreen: () => controller.render({ screen: "title" }),
    };
  }

  return requireAdapter({ fallbackAdapter }, "fallbackAdapter");
}

function requireAdapter(source, name) {
  if (!source?.[name]) {
    throw new Error(`Missing Tap Survivor module runtime UI adapter: ${name}`);
  }
  return source[name];
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module runtime UI adapter options: ${name}`);
  }
  return value;
}
