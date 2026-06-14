(() => {
function createSpriteSystem({ ctx, spriteDefs }) {
  const sprites = {};
  const spriteCache = new Map();
  const spriteBounds = new Map();

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

  function drawSprite(id, x, y, size, rotation = 0, options = {}) {
    const image = sprites[id];
    if (!image?.complete || !image.naturalWidth) return false;
    const source = rasterizedSprite(id, image, size) || image;
    const flipX = Boolean(options.flipX);
    const flipY = Boolean(options.flipY);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
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
    const bounds = trimmedSpriteBounds(id, image);
    rasterCtx.imageSmoothingEnabled = false;
    rasterCtx.clearRect(0, 0, rasterSize, rasterSize);
    rasterCtx.drawImage(
      image,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      0,
      0,
      rasterSize,
      rasterSize,
    );
    spriteCache.set(key, canvas);
    return canvas;
  }

  function trimmedSpriteBounds(id, image) {
    if (spriteBounds.has(id)) return spriteBounds.get(id);
    const fallback = {
      x: 0,
      y: 0,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    };
    const canvas = createRasterCanvas(fallback.width, fallback.height);
    const rasterCtx = canvas?.getContext?.("2d", { willReadFrequently: true });
    if (!canvas || !rasterCtx || !fallback.width || !fallback.height) return fallback;

    try {
      rasterCtx.clearRect(0, 0, fallback.width, fallback.height);
      rasterCtx.drawImage(image, 0, 0);
      const pixels = rasterCtx.getImageData(0, 0, fallback.width, fallback.height).data;
      let minX = fallback.width;
      let minY = fallback.height;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < fallback.height; y += 1) {
        for (let x = 0; x < fallback.width; x += 1) {
          if (pixels[(y * fallback.width + x) * 4 + 3] <= 8) continue;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
      if (maxX >= minX && maxY >= minY) {
        const padding = 2;
        const x0 = Math.max(0, minX - padding);
        const y0 = Math.max(0, minY - padding);
        const x1 = Math.min(fallback.width - 1, maxX + padding);
        const y1 = Math.min(fallback.height - 1, maxY + padding);
        const bounds = {
          x: x0,
          y: y0,
          width: x1 - x0 + 1,
          height: y1 - y0 + 1,
        };
        spriteBounds.set(id, bounds);
        return bounds;
      }
    } catch {
      // Some browsers can block pixel reads for unusual image sources; full-frame drawing still works.
    }

    spriteBounds.set(id, fallback);
    return fallback;
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
