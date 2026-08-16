export function createBrowserSpriteSystem({ assetDefs = {}, canvas, globalRef }) {
  const context = canvas.getContext?.("2d");
  const ImageCtor = globalRef?.Image;
  const diagnostics = canvas?.ownerDocument?.__TapSurvivorBrowserSmoke?.diagnostics;
  const sprites = new Map();
  const spriteSheets = new Map();
  const spriteConfigs = new Map();
  const rasterCache = new Map();

  function createRasterCanvas(width, height) {
    const OffscreenCanvasCtor = globalRef?.OffscreenCanvas;
    if (typeof OffscreenCanvasCtor === "function") {
      try {
        return new OffscreenCanvasCtor(width, height);
      } catch {
        // Fall through to the document canvas when OffscreenCanvas is unavailable.
      }
    }
    const documentRef = globalRef?.document || canvas?.ownerDocument;
    const rasterCanvas = documentRef?.createElement?.("canvas");
    if (!rasterCanvas) return null;
    rasterCanvas.width = width;
    rasterCanvas.height = height;
    return rasterCanvas;
  }

  function registerSprite(id, definition) {
    const src = spriteSource(definition);
    if (!id || !src) return false;
    const config = definition && typeof definition === "object" && !Array.isArray(definition)
      ? definition
      : {};
    spriteConfigs.set(id, config);
    if (typeof ImageCtor !== "function") return false;
    const image = new ImageCtor();
    image.addEventListener?.("load", () => {
      rasterCache.clear();
      diagnostics?.spriteLoads?.push?.({
        id,
        naturalHeight: image.naturalHeight || image.height || 0,
        naturalWidth: image.naturalWidth || image.width || 0,
        src,
        success: true,
      });
    });
    image.addEventListener?.("error", () => {
      diagnostics?.spriteLoads?.push?.({
        id,
        naturalHeight: image.naturalHeight || image.height || 0,
        naturalWidth: image.naturalWidth || image.width || 0,
        src,
        success: false,
      });
    });
    image.src = src;
    sprites.set(id, image);
    diagnostics?.spriteRegistrations?.push?.({
      id,
      src,
    });
    return true;
  }

  function registerGroup(prefix, definitions = {}) {
    Object.entries(definitions || {}).forEach(([id, definition]) => {
      registerSprite(`${prefix}:${id}`, definition);
      if (definition && typeof definition === "object" && definition.iconSrc) {
        registerSprite(`${prefix}Icon:${id}`, definition.iconSrc);
      }
    });
  }

  function registerSpriteSheet(id, definition) {
    const src = spriteSource(definition);
    if (!id || !src || typeof ImageCtor !== "function") return false;
    const config = definition && typeof definition === "object" && !Array.isArray(definition)
      ? definition
      : {};
    const image = new ImageCtor();
    image.addEventListener?.("load", () => {
      diagnostics?.spriteLoads?.push?.({
        id: `spriteSheet:${id}`,
        naturalHeight: image.naturalHeight || image.height || 0,
        naturalWidth: image.naturalWidth || image.width || 0,
        src,
        success: true,
      });
    });
    image.addEventListener?.("error", () => {
      diagnostics?.spriteLoads?.push?.({
        id: `spriteSheet:${id}`,
        naturalHeight: image.naturalHeight || image.height || 0,
        naturalWidth: image.naturalWidth || image.width || 0,
        src,
        success: false,
      });
    });
    image.src = src;
    spriteSheets.set(id, { config, image });
    diagnostics?.spriteRegistrations?.push?.({
      id: `spriteSheet:${id}`,
      src,
    });
    return true;
  }

  function loadSprites(spriteDefs = assetDefs.sprites || assetDefs || {}) {
    diagnostics?.spriteLoadRequests?.push?.({
      backgrounds: Object.keys(spriteDefs.backgrounds || {}),
      enemies: Object.keys(spriteDefs.enemies || {}),
      player: Boolean(spriteDefs.player),
      playerAnimations: Object.keys(spriteDefs.playerAnimations || {}),
      runUpgradeIcons: Object.keys(spriteDefs.runUpgradeIcons || {}),
      runUpgrades: Object.keys(spriteDefs.runUpgrades || {}),
      spriteSheets: Object.keys(spriteDefs.spriteSheets || {}),
      ui: Object.keys(spriteDefs.ui || {}),
      weapons: Object.keys(spriteDefs.weapons || {}),
    });
    registerSprite("player", spriteDefs.player);
    registerGroup("player", spriteDefs.playerAnimations);
    registerGroup("background", spriteDefs.backgrounds);
    registerGroup("enemy", spriteDefs.enemies);
    registerGroup("weapon", spriteDefs.weapons);
    registerGroup("runUpgrade", spriteDefs.runUpgrades);
    registerGroup("runUpgradeIcon", spriteDefs.runUpgradeIcons);
    registerGroup("ui", spriteDefs.ui);
    Object.entries(spriteDefs.spriteSheets || {}).forEach(([id, definition]) => {
      registerSpriteSheet(id, definition);
    });
    return true;
  }

  function drawImage(id, x = 0, y = 0, width, height) {
    const image = sprites.get(id);
    if (!context || !isDrawableImage(image)) {
      diagnostics?.spriteDraws?.push?.({
        id,
        kind: "drawImage",
        success: false,
      });
      return false;
    }
    try {
      context.drawImage(
        image,
        x,
        y,
        width || image.naturalWidth || image.width,
        height || image.naturalHeight || image.height
      );
    } catch {
      diagnostics?.spriteDraws?.push?.({
        id,
        kind: "drawImage",
        success: false,
      });
      return false;
    }
    diagnostics?.spriteDraws?.push?.({
      id,
      kind: "drawImage",
      naturalHeight: image.naturalHeight || image.height || 0,
      naturalWidth: image.naturalWidth || image.width || 0,
      src: image.src || "",
      success: true,
    });
    return true;
  }

  function drawSprite(id, x = 0, y = 0, size = 32, rotation = 0, options = {}) {
    const width = Math.max(1, numberValue(options.width, size));
    const height = Math.max(1, numberValue(options.height, size));
    const sheetDraw = drawSpriteSheet({
      height,
      options,
      rotation,
      width,
      x,
      y,
    });
    if (sheetDraw?.drawn) {
      recordSpriteDraw({
        animationId: options.animationId,
        frameIndex: sheetDraw.frame,
        id,
        image: sheetDraw.image,
        row: sheetDraw.row,
        sheetId: options.sheetId,
        source: "spriteSheet",
        state: options.animationState,
        success: true,
      });
      return true;
    }

    const image = sprites.get(id);
    if (!context || !isDrawableImage(image)) {
      recordSpriteDraw({
        animationId: options.animationId,
        id,
        image,
        sheetId: options.sheetId,
        source: options.sheetId ? "staticFallbackAfterSpriteSheet" : "static",
        success: false,
      });
      return false;
    }
    const config = spriteConfigs.get(id) || {};
    const frameIndex = currentFrameIndex(config, options);
    const bounds = spriteSourceBounds(image, config, frameIndex);
    const rasterWidth = Math.max(1, Math.ceil(numberValue(options.rasterWidth, width)));
    const rasterHeight = Math.max(1, Math.ceil(numberValue(options.rasterHeight, height)));
    const source = options.trim === false
      ? null
      : rasterizedSprite(id, image, rasterWidth, rasterHeight, config, frameIndex, bounds);
    const previousAlpha = context.globalAlpha;
    let drawn = false;
    try {
      context.save?.();
      context.translate?.(x, y);
      context.rotate?.(rotation);
      context.scale?.(options.flipX ? -1 : 1, options.flipY ? -1 : 1);
      if (Number.isFinite(Number(options.alpha))) {
        context.globalAlpha = (Number.isFinite(previousAlpha) ? previousAlpha : 1) * clampValue(options.alpha, 0, 1);
      }
      if (source) {
        context.drawImage(source, -width / 2, -height / 2, width, height);
      } else {
        context.drawImage(
          image,
          bounds.x,
          bounds.y,
          bounds.width,
          bounds.height,
          -width / 2,
          -height / 2,
          width,
          height
        );
      }
      drawn = true;
    } catch {
      drawn = false;
    } finally {
      if (Number.isFinite(Number(options.alpha))) context.globalAlpha = previousAlpha;
      context.restore?.();
    }
    recordSpriteDraw({
      animationId: options.animationId,
      frameIndex,
      id,
      image,
      sheetId: options.sheetId,
      source: options.sheetId ? "staticFallbackAfterSpriteSheet" : "static",
      state: options.animationState,
      success: drawn,
    });
    return drawn;
  }

  function drawSpriteSheet({ height, options, rotation, width, x, y }) {
    const sheetId = options.sheetId;
    const sheet = spriteSheets.get(sheetId);
    const image = sheet?.image;
    const animation = resolveSpriteSheetAnimation(
      sheet?.config,
      options.animationId,
      options.animationState
    );
    if (!context || !isDrawableImage(image) || !animation) return null;
    const columns = Math.max(1, Math.floor(numberValue(sheet.config?.columns, 1)));
    const rows = Math.max(1, Math.floor(numberValue(sheet.config?.rows, 1)));
    const frame = selectedSpriteSheetFrame(animation, options.time);
    const row = Number(animation.row);
    if (!Number.isInteger(row) || row < 0 || row >= rows || frame < 0 || frame >= columns) return null;

    const frameWidth = (image.naturalWidth || image.width) / columns;
    const frameHeight = (image.naturalHeight || image.height) / rows;
    if (!Number.isFinite(frameWidth) || !Number.isFinite(frameHeight) || frameWidth <= 0 || frameHeight <= 0) {
      return null;
    }

    const previousAlpha = context.globalAlpha;
    let drawn = false;
    try {
      context.save?.();
      context.translate?.(x, y);
      context.rotate?.(rotation);
      context.scale?.(options.flipX ? -1 : 1, options.flipY ? -1 : 1);
      if (Number.isFinite(Number(options.alpha))) {
        context.globalAlpha = (Number.isFinite(previousAlpha) ? previousAlpha : 1) * clampValue(options.alpha, 0, 1);
      }
      context.imageSmoothingEnabled = false;
      context.drawImage(
        image,
        frame * frameWidth,
        row * frameHeight,
        frameWidth,
        frameHeight,
        -width / 2,
        -height / 2,
        width,
        height
      );
      drawn = true;
    } catch {
      drawn = false;
    } finally {
      if (Number.isFinite(Number(options.alpha))) context.globalAlpha = previousAlpha;
      context.restore?.();
    }
    return { drawn, frame, image, row };
  }

  function resolveSpriteSheetAnimation(sheet, animationId, state) {
    const definition = sheet?.animations?.[animationId];
    if (!definition) return null;
    if (Array.isArray(definition.frames)) return definition;
    const stateDefinition = definition[state] || definition.idle || definition.default;
    if (!stateDefinition) return null;
    return {
      ...definition,
      ...stateDefinition,
      row: stateDefinition.row ?? definition.row,
    };
  }

  function selectedSpriteSheetFrame(animation, suppliedTime) {
    const frames = Array.isArray(animation?.frames) ? animation.frames : [];
    if (!frames.length) return -1;
    if (frames.length === 1) return Number(frames[0]);
    const fps = Math.max(1, numberValue(animation.fps, 8));
    const time = Number(suppliedTime);
    const elapsed = Number.isFinite(time)
      ? Math.max(0, time)
      : Math.max(0, numberValue(globalRef?.performance?.now?.(), 0) / 1000);
    const frameIndex = Math.floor(elapsed * fps);
    return Number(frames[animation.loop === false ? Math.min(frames.length - 1, frameIndex) : frameIndex % frames.length]);
  }

  function recordSpriteDraw({ animationId, frameIndex, id, image, row, sheetId, source, state, success }) {
    diagnostics?.spriteDraws?.push?.({
      animationId,
      frameIndex,
      id,
      kind: "drawSprite",
      naturalHeight: image?.naturalHeight || image?.height || 0,
      naturalWidth: image?.naturalWidth || image?.width || 0,
      row,
      sheetId,
      source,
      src: image?.src || "",
      state,
      success,
    });
  }

  function rasterizedSprite(id, image, width, height, config, frameIndex, bounds) {
    const frames = Array.isArray(config?.frames) ? config.frames : [];
    const transparentColor = Array.isArray(config?.transparentColor) ? config.transparentColor : null;
    if (!frames.length && !transparentColor) return null;
    const key = `${id}:${width}x${height}:${frameIndex}`;
    if (rasterCache.has(key)) return rasterCache.get(key);
    const rasterCanvas = createRasterCanvas(width, height);
    const rasterContext = rasterCanvas?.getContext?.("2d");
    if (!rasterCanvas || !rasterContext) return null;
    try {
      rasterContext.clearRect?.(0, 0, width, height);
      rasterContext.imageSmoothingEnabled = false;
      rasterContext.drawImage(
        image,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        0,
        0,
        width,
        height
      );
      applyTransparentColor(rasterContext, width, height, config);
      rasterCache.set(key, rasterCanvas);
      return rasterCanvas;
    } catch {
      return null;
    }
  }

  function applyTransparentColor(rasterContext, width, height, config) {
    const color = config?.transparentColor;
    if (!Array.isArray(color) || color.length < 3 || typeof rasterContext.getImageData !== "function") return;
    try {
      const pixels = rasterContext.getImageData(0, 0, width, height);
      const data = pixels.data;
      const tolerance = Math.max(0, numberValue(config.transparentTolerance, 28));
      for (let index = 0; index < data.length; index += 4) {
        const delta =
          Math.abs(data[index] - color[0]) +
          Math.abs(data[index + 1] - color[1]) +
          Math.abs(data[index + 2] - color[2]);
        if (delta <= tolerance) data[index + 3] = 0;
      }
      rasterContext.putImageData?.(pixels, 0, 0);
    } catch {
      // Pixel reads can be unavailable for cross-origin images; retain the cropped frame.
    }
  }

  function currentFrameIndex(config, options) {
    const frames = Array.isArray(config?.frames) ? config.frames : [];
    if (frames.length <= 1) return 0;
    const fps = Math.max(1, numberValue(config.fps, 10));
    const suppliedTime = Number(options?.time);
    const now = Number.isFinite(suppliedTime)
      ? suppliedTime * 1000
      : numberValue(globalRef?.performance?.now?.(), Date.now());
    return Math.floor((now / 1000) * fps) % frames.length;
  }

  function spriteSourceBounds(image, config, frameIndex) {
    const frames = Array.isArray(config?.frames) ? config.frames : [];
    if (frames[frameIndex]) return normalizeBounds(frames[frameIndex], image);
    if (config && (config.x !== undefined || config.y !== undefined)) return normalizeBounds(config, image);
    return normalizeBounds({}, image);
  }

  function normalizeBounds(bounds, image) {
    const imageWidth = Math.max(1, image.naturalWidth || image.width || 1);
    const imageHeight = Math.max(1, image.naturalHeight || image.height || 1);
    const x = clampInteger(bounds?.x, 0, imageWidth - 1);
    const y = clampInteger(bounds?.y, 0, imageHeight - 1);
    const width = clampInteger(bounds?.width ?? bounds?.w ?? imageWidth - x, 1, imageWidth - x);
    const height = clampInteger(bounds?.height ?? bounds?.h ?? imageHeight - y, 1, imageHeight - y);
    return { x, y, width, height };
  }

  function clampInteger(value, min, max) {
    const resolved = Number(value);
    return Math.max(min, Math.min(max, Math.floor(Number.isFinite(resolved) ? resolved : min)));
  }

  function numberValue(value, fallback = 0) {
    const resolved = Number(value);
    return Number.isFinite(resolved) ? resolved : fallback;
  }

  function clampValue(value, min, max) {
    return Math.max(min, Math.min(max, numberValue(value, min)));
  }

  return {
    drawImage,
    drawSprite,
    loadSprites,
  };
}

function isDrawableImage(image) {
  return Boolean(image?.complete && (image.naturalWidth || image.width));
}

function spriteSource(definition) {
  if (typeof definition === "string") return definition;
  if (definition && typeof definition === "object") {
    return definition.src || definition.path || definition.iconSrc || "";
  }
  return "";
}
