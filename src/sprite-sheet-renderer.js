(() => {
function createSpriteSheetRenderer({ ctx, spriteSheets = {} }) {
  const images = new Map();

  function imageFor(sheet) {
    if (!sheet?.path || typeof Image === "undefined") return null;
    if (images.has(sheet.id)) return images.get(sheet.id);
    const image = new Image();
    image.src = sheet.path;
    images.set(sheet.id, image);
    return image;
  }

  function drawAnimation(sheetId, animationId, state, x, y, width, height, options = {}) {
    const sheet = spriteSheets[sheetId];
    const animation = resolveAnimation(sheet, animationId, state);
    const image = imageFor(sheet);
    if (!sheet || !animation || !image?.complete || !image.naturalWidth) return false;
    const columns = Math.max(1, Number(sheet.columns || 1));
    const rows = Math.max(1, Number(sheet.rows || 1));
    const frameWidth = image.naturalWidth / columns;
    const frameHeight = image.naturalHeight / rows;
    const frame = selectedFrame(animation, options.time);
    if (frame < 0 || frame >= columns || animation.row < 0 || animation.row >= rows) return false;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(options.flipX ? -1 : 1, options.flipY ? -1 : 1);
    if (Number.isFinite(options.alpha)) ctx.globalAlpha *= Math.max(0, Math.min(1, options.alpha));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      image,
      frame * frameWidth,
      animation.row * frameHeight,
      frameWidth,
      frameHeight,
      -width / 2,
      -height / 2,
      width,
      height,
    );
    ctx.restore();
    return true;
  }

  function resolveAnimation(sheet, animationId, state) {
    const definition = sheet?.animations?.[animationId];
    if (!definition) return null;
    if (Array.isArray(definition.frames)) return definition;
    return definition[state] || definition.idle || definition.default || null;
  }

  function selectedFrame(animation, time = 0) {
    const frames = Array.isArray(animation.frames) ? animation.frames : [];
    if (!frames.length) return -1;
    if (frames.length === 1) return frames[0];
    const fps = Math.max(1, Number(animation.fps || 8));
    const elapsed = Math.max(0, Number(time || 0));
    const index = Math.floor(elapsed * fps);
    return frames[animation.loop === false ? Math.min(frames.length - 1, index) : index % frames.length];
  }

  return {
    drawAnimation,
  };
}

const spriteNamespace = globalThis["TapSurvivorSprites"] || {};
spriteNamespace.createSpriteSheetRenderer = createSpriteSheetRenderer;
})();
