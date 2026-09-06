export const MODULE_RUNTIME_SPRITE_ADAPTER_SLOTS = Object.freeze(["spriteSystem"]);

export const MODULE_RUNTIME_SPRITE_ADAPTER_PROOF_SLOTS = Object.freeze([
  "loadSprites",
  "drawImage",
  "drawSprite",
]);

export const MODULE_RUNTIME_SPRITE_ADAPTER_LOW_LEVEL_SLOTS = Object.freeze([
  "spriteSystem",
]);

export function createModuleRuntimeSpriteAdapter(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const spriteSystem = requireObject(resolvedOptions.spriteSystem, "options.spriteSystem");

  return {
    spriteSystem: {
      drawImage: requireFunction(spriteSystem.drawImage, "options.spriteSystem.drawImage"),
      drawSprite: requireFunction(spriteSystem.drawSprite, "options.spriteSystem.drawSprite"),
      loadSprites: requireFunction(spriteSystem.loadSprites, "options.spriteSystem.loadSprites"),
    },
  };
}

function requireFunction(value, name) {
  if (typeof value !== "function") {
    throw new Error(`Missing Tap Survivor module runtime sprite adapter: ${name}`);
  }
  return value;
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module runtime sprite adapter options: ${name}`);
  }
  return value;
}
