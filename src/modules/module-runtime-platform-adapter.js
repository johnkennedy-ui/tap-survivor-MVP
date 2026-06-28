export const MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS = Object.freeze([
  "bannerSystem",
  "bindMovementInput",
  "canvas",
  "debugSystem",
  "loop",
  "runUiAdapter",
  "shellUiAdapter",
  "shopSystemAdapter",
  "spriteSystem",
  "ui",
]);

export const MODULE_RUNTIME_PLATFORM_ADAPTER_PROOF_SLOTS = Object.freeze([
  "bindMovementInput",
]);

export function createModuleRuntimePlatformAdapter(adapters) {
  const resolvedAdapters = requireObject(adapters, "adapters");
  const bindMovementInput = requireFunction(
    resolvedAdapters.bindMovementInput,
    "adapters.bindMovementInput"
  );

  return {
    bannerSystem: requireAdapter(resolvedAdapters, "bannerSystem"),
    bindMovementInput,
    canvas: requireAdapter(resolvedAdapters, "canvas"),
    debugSystem: requireAdapter(resolvedAdapters, "debugSystem"),
    loop: requireFunction(resolvedAdapters.loop, "adapters.loop"),
    runUi: requireAdapter(resolvedAdapters, "runUiAdapter"),
    shellUi: requireAdapter(resolvedAdapters, "shellUiAdapter"),
    shopSystem: requireAdapter(resolvedAdapters, "shopSystemAdapter"),
    spriteSystem: requireAdapter(resolvedAdapters, "spriteSystem"),
    ui: requireAdapter(resolvedAdapters, "ui"),
  };
}

function requireAdapter(source, name) {
  if (!source?.[name]) {
    throw new Error(`Missing Tap Survivor module runtime platform adapter: ${name}`);
  }
  return source[name];
}

function requireFunction(value, name) {
  if (typeof value !== "function") {
    throw new Error(`Missing Tap Survivor module runtime platform adapter: ${name}`);
  }
  return value;
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module runtime platform adapter options: ${name}`);
  }
  return value;
}
