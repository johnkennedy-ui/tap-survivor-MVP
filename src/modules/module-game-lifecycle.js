import { createGameRuntimeController } from "./game-runtime.js";
import { createModuleGameDependencyBag } from "./module-game-dependencies.js";
import { createRunLifecycle } from "./run-lifecycle.js";

export const MODULE_GAME_LIFECYCLE_OWNER_SLOTS = Object.freeze([
  "bind",
  "dispose",
  "init",
  "persist",
  "render",
  "showTitle",
  "startRun",
  "stop",
  "tick",
]);

export const MODULE_GAME_LIFECYCLE_OWNER_PROOF_SLOTS = Object.freeze([
  "createDependencyBag",
  "createRuntimeController",
  "init",
  "bind",
  "showTitle",
  "startRun",
  "tick",
  "render",
  "persist",
  "stop",
  "dispose",
]);

export const MODULE_GAME_LIFECYCLE_OWNER_LOW_LEVEL_SLOTS = Object.freeze([
  "dependencyBagOptions",
  "dependencies",
  "lifecycleHooks",
  "platform",
]);

/**
 * Module-only owner for the future game lifecycle entrypoint.
 *
 * Production still boots through `src/game.js`; this controller proves the
 * module path can own the same top-level lifecycle from injected dependencies.
 *
 * @param {any} [options]
 */
export function createModuleGameLifecycleOwner(options = {}) {
  const {
    dependencyBagOptions,
    dependencies,
    lifecycleHooks = {},
    platform,
  } = options;
  const resolvedPlatform = requireObject(platform, "platform");
  const documentRef = requireObject(resolvedPlatform.documentRef, "platform.documentRef");
  const runtimeGlobal = requireObject(resolvedPlatform.runtimeGlobal, "platform.runtimeGlobal");
  const runtimeDependencies =
    dependencies ||
    createModuleGameDependencyBag(
      requireObject(dependencyBagOptions, "dependencyBagOptions")
    );
  const runtime = createGameRuntimeController({
    ...runtimeDependencies,
    documentRef,
    globalRef: runtimeGlobal,
  });
  const runLifecycle = createLifecycle({
    dependencies: runtimeDependencies,
    lifecycleHooks,
  });
  let lastFrame = resolvedPlatform.runtimeGlobal.performance?.now?.() || 0;
  let initialized = false;
  let stopped = false;
  let disposed = false;

  if (typeof runtimeDependencies.loop?.attachFrameHandler === "function") {
    runtimeDependencies.loop.attachFrameHandler((now) => {
      if (disposed || stopped) return;
      const timestamp = Number.isFinite(now) ? now : resolvedPlatform.runtimeGlobal.performance?.now?.() || 0;
      const dt = Math.min(0.05, (timestamp - lastFrame) / 1000);
      lastFrame = timestamp;
      const game = runtimeDependencies.getGame?.();
      if (game?.running && !game.paused) {
        tick(dt * (runtime.getGameSpeed?.() || 1));
      }
      render({ now: timestamp });
      runtimeDependencies.runUi.updateRunHud?.();
    });
  }

  function ensureActive(name) {
    if (disposed) {
      throw new Error(`Tap Survivor module game lifecycle owner is disposed: ${name}`);
    }
  }

  function init() {
    ensureActive("init");
    initialized = true;
    stopped = false;
    return runtime.initializeRuntime();
  }

  function bind() {
    return init();
  }

  function showTitle() {
    ensureActive("showTitle");
    runtimeDependencies.shellUi.showTitleScreen?.();
    runtimeDependencies.runUi.updateRunHud?.();
    return snapshot();
  }

  function startRun() {
    ensureActive("startRun");
    stopped = false;
    runLifecycle.startRun();
    runtimeDependencies.runUi.updateRunHud?.();
    return runtimeDependencies.getGame();
  }

  function tick(dt = 0) {
    if (disposed || stopped) return false;
    if (typeof lifecycleHooks.tick === "function") {
      return lifecycleHooks.tick({
        dependencies: runtimeDependencies,
        dt,
        owner: api,
        runtime,
      });
    }
    if (typeof lifecycleHooks.update === "function") {
      return lifecycleHooks.update({
        dependencies: runtimeDependencies,
        dt,
        owner: api,
        runtime,
      });
    }
    return false;
  }

  function render(frame = {}) {
    if (disposed || stopped) return false;
    const game = runtimeDependencies.getGame();
    runtimeDependencies.rendering.clearFrame(frame);
    runtimeDependencies.rendering.renderFrame(game, frame);
    runtimeDependencies.renderHud.renderHud(game, frame);
    runtimeDependencies.renderEnemies.renderEnemies(game?.enemies || [], frame);
    runtimeDependencies.renderSkillRail.renderSkillRail(game, frame);
    return true;
  }

  function persist() {
    ensureActive("persist");
    return runtimeDependencies.persist();
  }

  function stop(reason = "stopped") {
    if (disposed) return false;
    stopped = true;
    const game = runtimeDependencies.getGame();
    if (game) {
      game.running = false;
      game.endReason = reason;
    }
    if (typeof lifecycleHooks.stop === "function") {
      lifecycleHooks.stop({
        dependencies: runtimeDependencies,
        owner: api,
        reason,
        runtime,
      });
    }
    return true;
  }

  function dispose() {
    if (disposed) return false;
    stop("disposed");
    disposed = true;
    if (typeof lifecycleHooks.dispose === "function") {
      lifecycleHooks.dispose({
        dependencies: runtimeDependencies,
        owner: api,
        runtime,
      });
    }
    return true;
  }

  function snapshot() {
    return {
      disposed,
      initialized,
      stopped,
    };
  }

  const api = {
    bind,
    dependencies: runtimeDependencies,
    dispose,
    init,
    persist,
    render,
    runtime,
    showTitle,
    snapshot,
    startRun,
    stop,
    tick,
  };

  return api;
}

function createLifecycle({ dependencies, lifecycleHooks }) {
  return createRunLifecycle({
    ui: dependencies.ui,
    getGame: dependencies.getGame,
    getSave: dependencies.getSave,
    resetGameState: () => {
      const nextGame =
        typeof lifecycleHooks.resetGameState === "function"
          ? lifecycleHooks.resetGameState({ dependencies })
          : dependencies.getGame() || createFallbackRun();
      dependencies.setGame(nextGame);
      return nextGame;
    },
    shopSystem: dependencies.shopSystem,
    shellUi: {
      ...dependencies.shellUi,
      closeStartFlow:
        dependencies.shellUi.closeStartFlow ||
        lifecycleHooks.closeStartFlow ||
        dependencies.shellUi.showTitleScreen ||
        (() => {}),
    },
    runUi: dependencies.runUi,
    relicSystem: lifecycleHooks.relicSystem || {
      relicChoices: () => [],
    },
    persist: dependencies.persist,
    renderMeta: dependencies.renderMeta,
    updateRunHud:
      lifecycleHooks.updateRunHud || (() => dependencies.runUi.updateRunHud?.()),
    showMovementGateBanner:
      lifecycleHooks.showMovementGateBanner ||
      (() => dependencies.bannerSystem.showMovementGateBanner?.()),
  });
}

function createFallbackRun() {
  return {
    awaitingFirstMoveInput: false,
    enemies: [],
    paused: false,
    player: {
      equippedWeapons: [],
    },
    running: true,
  };
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module game lifecycle owner option: ${name}`);
  }
  return value;
}
