// GENERATED FILE. Do not edit directly.
// Source: src/modules/sprites.js
// Run: npm run build:bridges
(() => {
  "use strict";

  const MODULE_NATIVE_SPRITES_SLOTS = Object.freeze(["sprites"]);

  const MODULE_NATIVE_SPRITES_PROOF_SLOTS = Object.freeze([
    "createSpriteSystem",
    "createSpriteSheetRenderer",
  ]);

  function createSpriteSystem({ ctx, spriteDefs }) {
    const sprites = {};
    const spriteConfigs = {};
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

    function registerSprite(id, definition) {
      const src = spriteSource(definition);
      if (!src || typeof Image === "undefined") return;
      spriteConfigs[id] = typeof definition === "object" && !Array.isArray(definition) ? definition : {};
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
      Object.entries(spriteDefs.playerAnimations || {}).forEach(([id, src]) => registerSprite(`player:${id}`, src));
      Object.entries(spriteDefs.backgrounds || {}).forEach(([id, src]) => registerSprite(`background:${id}`, src));
      Object.entries(spriteDefs.enemies || {}).forEach(([id, src]) => registerSprite(`enemy:${id}`, src));
      Object.entries(spriteDefs.weapons || {}).forEach(([id, src]) => {
        registerSprite(`weapon:${id}`, src);
        if (src && typeof src === "object" && src.iconSrc) registerSprite(`weaponIcon:${id}`, src.iconSrc);
      });
      Object.entries(spriteDefs.runUpgrades || {}).forEach(([id, src]) => registerSprite(`runUpgrade:${id}`, src));
      Object.entries(spriteDefs.runUpgradeIcons || {}).forEach(([id, src]) => registerSprite(`runUpgradeIcon:${id}`, src));
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
      const config = spriteConfigs[id] || {};
      const frameIndex = currentFrameIndex(config);
      const drawWidth = Math.max(1, Number(options.width || size));
      const drawHeight = Math.max(1, Number(options.height || size));
      const rasterWidth = Math.max(1, Number(options.rasterWidth || drawWidth));
      const rasterHeight = Math.max(1, Number(options.rasterHeight || drawHeight));
      const source = options.trim === false ? image : rasterizedSprite(id, image, rasterWidth, rasterHeight, config, frameIndex) || image;
      const flipX = Boolean(options.flipX);
      const flipY = Boolean(options.flipY);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      if (Number.isFinite(options.alpha)) ctx.globalAlpha *= Math.max(0, Math.min(1, options.alpha));
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(source, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
      return true;
    }

    function rasterizedSprite(id, image, width, height, config = {}, frameIndex = 0) {
      const rasterWidth = Math.max(1, Math.ceil(width));
      const rasterHeight = Math.max(1, Math.ceil(height));
      const key = `${id}:${rasterWidth}x${rasterHeight}:${frameIndex}`;
      if (spriteCache.has(key)) return spriteCache.get(key);
      const canvas = createRasterCanvas(rasterWidth, rasterHeight);
      const rasterCtx = /** @type {CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null} */ (
        canvas?.getContext?.("2d")
      );
      if (!canvas || !rasterCtx) return null;
      const bounds = spriteSourceBounds(id, image, config, frameIndex);
      rasterCtx.imageSmoothingEnabled = false;
      rasterCtx.clearRect(0, 0, rasterWidth, rasterHeight);
      rasterCtx.drawImage(
        image,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        0,
        0,
        rasterWidth,
        rasterHeight,
      );
      applyTransparentColor(rasterCtx, rasterWidth, rasterHeight, config);
      spriteCache.set(key, canvas);
      return canvas;
    }

    function spriteSource(definition) {
      if (typeof definition === "string") return definition;
      if (definition && typeof definition === "object") return definition.src || definition.path;
      return "";
    }

    function currentFrameIndex(config) {
      const frames = Array.isArray(config.frames) ? config.frames : [];
      if (frames.length <= 1) return 0;
      const fps = Math.max(1, Number(config.fps || 10));
      const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      return Math.floor((now / 1000) * fps) % frames.length;
    }

    function spriteSourceBounds(id, image, config, frameIndex) {
      const frames = Array.isArray(config.frames) ? config.frames : [];
      if (frames[frameIndex]) return normalizeBounds(frames[frameIndex], image);
      if (config.x !== undefined) return normalizeBounds(config, image);
      return trimmedSpriteBounds(id, image);
    }

    function normalizeBounds(bounds, image) {
      const imageWidth = image.naturalWidth || image.width;
      const imageHeight = image.naturalHeight || image.height;
      const x = clampInt(bounds.x, 0, imageWidth - 1);
      const y = clampInt(bounds.y, 0, imageHeight - 1);
      const width = clampInt(bounds.width ?? bounds.w, 1, imageWidth - x);
      const height = clampInt(bounds.height ?? bounds.h, 1, imageHeight - y);
      return { x, y, width, height };
    }

    function clampInt(value, min, max) {
      return Math.max(min, Math.min(max, Math.floor(Number(value) || min)));
    }

    function applyTransparentColor(rasterCtx, width, height, config) {
      const color = config.transparentColor;
      if (!Array.isArray(color) || color.length < 3) return;
      const tolerance = Math.max(0, Number(config.transparentTolerance ?? 28));
      const pixels = rasterCtx.getImageData(0, 0, width, height);
      const data = pixels.data;
      for (let i = 0; i < data.length; i += 4) {
        const delta = Math.abs(data[i] - color[0]) + Math.abs(data[i + 1] - color[1]) + Math.abs(data[i + 2] - color[2]);
        if (delta <= tolerance) data[i + 3] = 0;
      }
      rasterCtx.putImageData(pixels, 0, 0);
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
      const rasterCtx = /** @type {CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null} */ (
        canvas?.getContext?.("2d", { willReadFrequently: true })
      );
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

  globalThis.TapSurvivorSprites = {
    createSpriteSystem,
    createSpriteSheetRenderer,
  };
})();
