(() => {
function createSpriteSystem({ ctx, spriteDefs }) {
  const sprites = {};

  function registerSprite(id, src) {
    if (!src || typeof Image === "undefined") return;
    const image = new Image();
    image.src = src;
    sprites[id] = image;
  }

  function loadSprites() {
    registerSprite("player", spriteDefs.player);
    Object.entries(spriteDefs.enemies || {}).forEach(([id, src]) => registerSprite(`enemy:${id}`, src));
    Object.entries(spriteDefs.weapons || {}).forEach(([id, src]) => registerSprite(`weapon:${id}`, src));
    Object.entries(spriteDefs.ui || {}).forEach(([id, src]) => registerSprite(`ui:${id}`, src));
  }

  function drawSprite(id, x, y, size, rotation = 0) {
    const image = sprites[id];
    if (!image?.complete || !image.naturalWidth) return false;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, -size / 2, -size / 2, size, size);
    ctx.restore();
    return true;
  }

  return {
    drawSprite,
    loadSprites,
  };
}

globalThis.TapSurvivorSprites = {
  createSpriteSystem,
};
})();
