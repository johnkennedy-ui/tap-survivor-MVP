export const MODULE_RUNTIME_RENDERING_ADAPTER_SLOTS = Object.freeze([
  "renderEnemies",
  "renderHud",
  "renderSkillRail",
  "rendering",
]);

export const MODULE_RUNTIME_RENDERING_ADAPTER_PROOF_SLOTS = Object.freeze([
  "clearFrame",
  "missingRendererFallback",
  "renderEnemies",
  "renderFrame",
  "renderHud",
  "renderSkillRail",
]);

export const MODULE_RUNTIME_RENDERING_ADAPTER_LOW_LEVEL_SLOTS = Object.freeze([
  "assetAdapters",
  "platformAdapters",
  "renderers",
  "spriteAdapters",
  "uiAdapters",
]);

export function createModuleRuntimeRenderingAdapter(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const renderers = requireObject(resolvedOptions.renderers || {}, "options.renderers");
  const dependencies = {
    assetAdapters: resolvedOptions.assetAdapters,
    platformAdapters: resolvedOptions.platformAdapters,
    spriteAdapters: resolvedOptions.spriteAdapters,
    uiAdapters: resolvedOptions.uiAdapters,
  };
  const onMissingRenderer = resolvedOptions.onMissingRenderer;

  function invokeRenderer(name, payload = {}) {
    const renderer = renderers[name];
    if (typeof renderer !== "function") {
      return missingRendererFallback(name, payload);
    }
    return renderer({
      ...dependencies,
      ...payload,
    });
  }

  function missingRendererFallback(name, payload = {}) {
    if (typeof onMissingRenderer === "function") {
      onMissingRenderer({
        name,
        payload,
      });
    }
    return false;
  }

  function clearFrame(frame = {}) {
    return invokeRenderer("clearFrame", frame);
  }

  function renderFrame(game, frame = {}) {
    return invokeRenderer("renderFrame", {
      ...frame,
      game,
    });
  }

  function renderHud(game, frame = {}) {
    return invokeRenderer("renderHud", {
      ...frame,
      game,
    });
  }

  function renderEnemies(enemies, frame = {}) {
    return invokeRenderer("renderEnemies", {
      ...frame,
      enemies,
    });
  }

  function renderSkillRail(game, frame = {}) {
    return invokeRenderer("renderSkillRail", {
      ...frame,
      game,
    });
  }

  return {
    renderEnemies: {
      renderEnemies,
    },
    renderHud: {
      renderHud,
    },
    renderSkillRail: {
      renderSkillRail,
    },
    rendering: {
      clearFrame,
      missingRendererFallback,
      renderFrame,
    },
  };
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module runtime rendering adapter options: ${name}`);
  }
  return value;
}
