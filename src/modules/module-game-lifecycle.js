import { createModuleGameDependencyBag } from "./module-game-dependencies.js";
import { createRunLifecycle } from "./run-lifecycle.js";

const EMPTY_RENDER_STRESS = Object.freeze({
  enemies: Object.freeze([]),
  projectiles: Object.freeze([]),
});
const MAX_RAW_FRAME_CATCH_UP_SECONDS = 0.1;
const MAX_RAW_FRAME_STEP_SECONDS = 0.05;

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
  "runtime",
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
    performanceTrace = null,
    platform,
    runtime,
  } = options;
  const resolvedPlatform = requireObject(platform, "platform");
  const documentRef = requireObject(resolvedPlatform.documentRef, "platform.documentRef");
  const runtimeGlobal = requireObject(resolvedPlatform.runtimeGlobal, "platform.runtimeGlobal");
  const runtimeDependencies =
    dependencies ||
    createModuleGameDependencyBag(
      requireObject(dependencyBagOptions, "dependencyBagOptions")
    );
  const resolvedRuntime = requireObject(runtime, "runtime");
  const runLifecycle = createLifecycle({
    dependencies: runtimeDependencies,
    documentRef,
    lifecycleHooks,
  });
  runtimeDependencies.bindRunLifecycle?.(runLifecycle);
  let lastFrame = resolvedPlatform.runtimeGlobal.performance?.now?.() || 0;
  let initialized = false;
  let stopped = false;
  let disposed = false;

  if (typeof runtimeDependencies.loop?.attachFrameHandler === "function") {
    const handleFrame =
      performanceTrace &&
      typeof performanceTrace.beginFrame === "function" &&
      typeof performanceTrace.endFrame === "function"
        ? createTracedFrameHandler({
            getDisposed: () => disposed,
            getStopped: () => stopped,
            getLastFrame: () => lastFrame,
            performanceTrace,
            renderTraced,
            runtimeDependencies,
            resolvedPlatform,
            resolvedRuntime,
            setLastFrame: (timestamp) => {
              lastFrame = timestamp;
            },
            tick,
          })
        : createNormalFrameHandler({
            getDisposed: () => disposed,
            getStopped: () => stopped,
            getLastFrame: () => lastFrame,
            render,
            runtimeDependencies,
            resolvedPlatform,
            resolvedRuntime,
            setLastFrame: (timestamp) => {
              lastFrame = timestamp;
            },
            tick,
          });
    runtimeDependencies.loop.attachFrameHandler(handleFrame);
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
    return resolvedRuntime.initializeRuntime();
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
        runtime: resolvedRuntime,
      });
    }
    if (typeof lifecycleHooks.update === "function") {
      return lifecycleHooks.update({
        dependencies: runtimeDependencies,
        dt,
        owner: api,
        runtime: resolvedRuntime,
      });
    }
    return tickDefaultRun(runtimeDependencies, dt);
  }

  function render(frame = {}) {
    if (disposed || stopped) return false;
    const game = runtimeDependencies.getGame();
    runtimeDependencies.rendering.clearFrame(frame);
    runtimeDependencies.rendering.renderFrame(game, frame);
    runtimeDependencies.renderEnemies.renderEnemies(game?.enemies || [], frame);
    runtimeDependencies.renderPlayer.renderPlayer(game, frame);
    runtimeDependencies.renderHud.renderHud(game, frame);
    runtimeDependencies.renderSkillRail.renderSkillRail(game, frame);
    return true;
  }

  function renderTraced(frame = {}, traceFrame) {
    const game = runtimeDependencies.getGame();
    performanceTrace.measureRenderPass(traceFrame, "clearFrame", () =>
      runtimeDependencies.rendering.clearFrame(frame)
    );
    performanceTrace.measureRenderPass(traceFrame, "renderFrame", () =>
      runtimeDependencies.rendering.renderFrame(game, frame)
    );
    performanceTrace.measureRenderPass(traceFrame, "renderEnemies", () =>
      runtimeDependencies.renderEnemies.renderEnemies(game?.enemies || [], frame)
    );
    performanceTrace.measureRenderPass(traceFrame, "renderPlayer", () =>
      runtimeDependencies.renderPlayer.renderPlayer(game, frame)
    );
    performanceTrace.measureRenderPass(traceFrame, "renderHud", () =>
      runtimeDependencies.renderHud.renderHud(game, frame)
    );
    performanceTrace.measureRenderPass(traceFrame, "renderSkillRail", () =>
      runtimeDependencies.renderSkillRail.renderSkillRail(game, frame)
    );
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
        runtime: resolvedRuntime,
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
    performanceTrace?.dispose?.();
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
    runtime: resolvedRuntime,
    showTitle,
    snapshot,
    startRun,
    stop,
    tick,
  };

  return api;
}

function createNormalFrameHandler({
  getDisposed,
  getLastFrame,
  getStopped,
  render,
  runtimeDependencies,
  resolvedPlatform,
  resolvedRuntime,
  setLastFrame,
  tick,
}) {
  return (now) => {
    if (getDisposed() || getStopped()) return;
    const timestamp = Number.isFinite(now) ? now : resolvedPlatform.runtimeGlobal.performance?.now?.() || 0;
    const elapsed = (timestamp - getLastFrame()) / 1000;
    setLastFrame(timestamp);
    const game = runtimeDependencies.getGame?.();
    if (game?.running && !game.paused) {
      runBoundedFrameUpdates(elapsed, resolvedRuntime.getGameSpeed?.() || 1, tick);
    }
    render({ now: timestamp });
    runtimeDependencies.runUi.updateRunHud?.();
  };
}

function createTracedFrameHandler({
  getDisposed,
  getLastFrame,
  getStopped,
  performanceTrace,
  renderTraced,
  runtimeDependencies,
  resolvedPlatform,
  resolvedRuntime,
  setLastFrame,
  tick,
}) {
  return (now) => {
    if (getDisposed() || getStopped()) return;
    const timestamp = Number.isFinite(now) ? now : resolvedPlatform.runtimeGlobal.performance?.now?.() || 0;
    const traceFrame = performanceTrace.beginFrame(timestamp);
    const elapsed = (timestamp - getLastFrame()) / 1000;
    setLastFrame(timestamp);
    const game = runtimeDependencies.getGame?.();
    if (game?.running && !game.paused) {
      performanceTrace.measureStage(traceFrame, "update", () =>
        runBoundedFrameUpdates(elapsed, resolvedRuntime.getGameSpeed?.() || 1, tick)
      );
    }
    const renderStress = getRenderStress(performanceTrace, game);
    performanceTrace.measureStage(traceFrame, "render", () =>
      renderTraced(
        {
          now: timestamp,
          stressEnemies: renderStress.enemies,
          stressProjectiles: renderStress.projectiles,
        },
        traceFrame
      )
    );
    performanceTrace.measureStage(traceFrame, "hud", () =>
      runtimeDependencies.runUi.updateRunHud?.()
    );
    performanceTrace.endFrame(traceFrame, {
      pressure: collectPressure(game, renderStress),
    });
  };
}

function runBoundedFrameUpdates(elapsed, gameSpeed, tick) {
  let remaining = Math.max(0, Math.min(MAX_RAW_FRAME_CATCH_UP_SECONDS, elapsed));
  do {
    const rawStep = Math.min(MAX_RAW_FRAME_STEP_SECONDS, remaining);
    tick(rawStep * gameSpeed);
    remaining = Math.max(0, remaining - rawStep);
  } while (remaining > 0);
}

function getRenderStress(performanceTrace, game) {
  if (!game || typeof performanceTrace?.getRenderStress !== "function") {
    return EMPTY_RENDER_STRESS;
  }
  const stress = performanceTrace.getRenderStress();
  if (!stress || typeof stress !== "object") return EMPTY_RENDER_STRESS;
  return {
    enemies: Array.isArray(stress.enemies) ? stress.enemies : EMPTY_RENDER_STRESS.enemies,
    projectiles: Array.isArray(stress.projectiles)
      ? stress.projectiles
      : EMPTY_RENDER_STRESS.projectiles,
  };
}

function collectPressure(game, renderStress = EMPTY_RENDER_STRESS) {
  const pickups = countEntries(game?.xpDrops) + countEntries(game?.lootDrops);
  const projectiles = countEntries(game?.bolts) + countEntries(game?.enemyBolts);
  const effects =
    countEntries(game?.areas) +
    countEntries(game?.beams) +
    countEntries(game?.bossAttacks) +
    countEntries(game?.pickupTexts) +
    countEntries(game?.weaponBursts);
  return {
    effects,
    enemies: countEntries(game?.enemies),
    pickups,
    projectiles,
    syntheticEnemies: countEntries(renderStress.enemies),
    syntheticProjectiles: countEntries(renderStress.projectiles),
  };
}

function countEntries(value) {
  return Array.isArray(value) ? value.length : 0;
}

function createLifecycle({ dependencies, documentRef, lifecycleHooks }) {
  return createRunLifecycle({
    documentRef: lifecycleHooks.documentRef || documentRef,
    ui: dependencies.ui,
    getGame: dependencies.getGame,
    getSave: dependencies.getSave,
    resetGameState: () => {
      const nextGame =
        typeof lifecycleHooks.resetGameState === "function"
          ? lifecycleHooks.resetGameState({ dependencies })
          : dependencies.resetGameState?.() || dependencies.getGame() || createFallbackRun();
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
    relicSystem:
      lifecycleHooks.relicSystem ||
      dependencies.relicSystem ||
      dependencies.moduleSystems?.relics || {
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

function tickDefaultRun(dependencies, dt = 0) {
  const game = dependencies.getGame?.();
  if (!game?.running || game.paused || game.awaitingFirstMoveInput) return false;
  const player = game.player;
  if (!player) return false;
  const delta = Math.max(0, Number(dt) || 0);
  if (typeof dependencies.runUpdater?.update === "function") {
    dependencies.runUpdater.update(delta);
    return true;
  }
  game.elapsed = (Number(game.elapsed) || 0) + delta;
  const dx = (Number(player.targetX) || 0) - (Number(player.x) || 0);
  const dy = (Number(player.targetY) || 0) - (Number(player.y) || 0);
  const distance = Math.hypot(dx, dy);
  player.moving = distance > 3;
  if (distance > 3) {
    player.facingX = dx / distance;
    player.facingY = dy / distance;
    const speed = Math.max(0, Number(player.speed) || 0);
    const step = Math.min(distance, speed * delta);
    player.x += player.facingX * step;
    player.y += player.facingY * step;
  }
  return true;
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
