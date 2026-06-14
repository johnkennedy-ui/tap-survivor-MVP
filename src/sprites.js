(() => {
function createSpriteSystem({ ctx, spriteDefs }) {
  const sprites = {};
  const spriteCache = new Map();

  function createRasterCanvas(width, height) {
    if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
    if (typeof document !== "undefined" && document.createElement) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }
    return null;
  }

  function registerSprite(id, src) {
    if (!src || typeof Image === "undefined") return;
    const image = new Image();
    image.addEventListener?.("load", () => {
      [...spriteCache.keys()]
        .filter((key) => key.startsWith(`${id}:`))
        .forEach((key) => spriteCache.delete(key));
    });
    image.src = src;
    sprites[id] = image;
  }

  function loadSprites() {
    registerSprite("player", spriteDefs.player);
    Object.entries(spriteDefs.backgrounds || {}).forEach(([id, src]) => registerSprite(`background:${id}`, src));
    Object.entries(spriteDefs.enemies || {}).forEach(([id, src]) => registerSprite(`enemy:${id}`, src));
    Object.entries(spriteDefs.weapons || {}).forEach(([id, src]) => registerSprite(`weapon:${id}`, src));
    Object.entries(spriteDefs.ui || {}).forEach(([id, src]) => registerSprite(`ui:${id}`, src));
  }

  function drawImage(id, x, y, width, height) {
    const image = sprites[id];
    if (!image?.complete || !image.naturalWidth) return false;
    ctx.drawImage(image, x, y, width, height);
    return true;
  }

  function drawSprite(id, x, y, size, rotation = 0) {
    const image = sprites[id];
    if (!image?.complete || !image.naturalWidth) return false;
    const source = rasterizedSprite(id, image, size) || image;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, -size / 2, -size / 2, size, size);
    ctx.restore();
    return true;
  }

  function rasterizedSprite(id, image, size) {
    const rasterSize = Math.max(1, Math.ceil(size));
    const key = `${id}:${rasterSize}`;
    if (spriteCache.has(key)) return spriteCache.get(key);
    const canvas = createRasterCanvas(rasterSize, rasterSize);
    const rasterCtx = canvas?.getContext?.("2d");
    if (!canvas || !rasterCtx) return null;
    rasterCtx.imageSmoothingEnabled = false;
    rasterCtx.clearRect(0, 0, rasterSize, rasterSize);
    rasterCtx.drawImage(image, 0, 0, rasterSize, rasterSize);
    spriteCache.set(key, canvas);
    return canvas;
  }

  return {
    drawImage,
    drawSprite,
    loadSprites,
  };
}

globalThis.TapSurvivorSprites = {
  createSpriteSystem,
};
})();
