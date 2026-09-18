export function installProductionBrowserWitnesses(platform = globalThis) {
  const { CanvasRenderingContext2D, document } = platform;
  const retiredPublisherNames = [
    "TapSurvivorAudio",
    "TapSurvivorAssets",
    "TapSurvivorCombat",
    "TapSurvivorEnemies",
    "TapSurvivorEnemyBehaviors",
    "TapSurvivorEnemySpawning",
    "TapSurvivorPickups",
    "TapSurvivorRelics",
    "TapSurvivorWeaponBehaviors",
    "TapSurvivorWeaponFire",
    "TapSurvivorLevelUp",
    "TapSurvivorGameRuntime",
    "TapSurvivorInput",
    "TapSurvivorShellUi",
  ];
  const retiredPublisherReads = Object.fromEntries(retiredPublisherNames.map((name) => [name, 0]));
  retiredPublisherNames.forEach((name) => {
    Object.defineProperty(platform, name, {
      configurable: true,
      get() {
        retiredPublisherReads[name] += 1;
        throw new Error(`Forbidden retired Tap Survivor publisher read: ${name}`);
      },
    });
  });
  const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  const diagnostics = {
    canvasDrawCount: 0,
    canvasWitnesses: {
      background: null,
      player: null,
    },
    playerCanvasVisible: false,
    spriteDraws: [],
    spriteLoadRequests: [],
    spriteLoads: [],
    spriteRegistrations: [],
  };
  document.__TapSurvivorBrowserSmoke = {
    diagnostics,
    retiredPublisherReads,
  };
  CanvasRenderingContext2D.prototype.drawImage = function patchedDrawImage(image, ...args) {
    const before = describeCanvasDraw(this, image, args);
    const id = spriteIdForImageSource(before.imageSrc, diagnostics.spriteRegistrations);
    const kind = kindForSpriteId(id);
    const beforeStats = kind === "player" ? sampleCanvasRect(this, before.visibleRect) : null;
    let result;
    let threw;
    try {
      result = originalDrawImage.call(this, image, ...args);
      return result;
    } catch (error) {
      threw = error;
      throw error;
    } finally {
      const afterStats = kind === "player" ? sampleCanvasRect(this, before.visibleRect) : null;
      retainCanvasWitness({
        ...before,
        id,
        kind,
        pixelDelta: pixelStatsDelta(beforeStats, afterStats),
        sequence: ++diagnostics.canvasDrawCount,
        threw: Boolean(threw),
      });
    }
  };

  function retainCanvasWitness(entry) {
    if (entry.kind === "background" && entry.intersectsCanvas) {
      diagnostics.canvasWitnesses.background = summarizeCanvasWitness(entry);
      diagnostics.playerCanvasVisible = false;
      return;
    }
    if (entry.kind !== "player") return;
    const witness = summarizeCanvasWitness(entry);
    if (witness.visibleSpriteProof) {
      diagnostics.canvasWitnesses.player = witness;
      diagnostics.playerCanvasVisible = true;
    }
  }

  function summarizeCanvasWitness(entry) {
    const positiveDestination = entry.dest?.width > 0 && entry.dest?.height > 0;
    const visibleCoverage =
      positiveDestination && entry.visibleRect
        ? (entry.visibleRect.width * entry.visibleRect.height) /
          (entry.dest.width * entry.dest.height)
        : 0;
    const validSource = entry.source?.naturalWidth > 0 && entry.source?.naturalHeight > 0;
    const visibleSpriteProof =
      entry.kind === "player" &&
      positiveDestination &&
      visibleCoverage >= 0.9 &&
      validSource &&
      entry.intersectsCanvas &&
      entry.globalAlpha > 0 &&
      entry.globalCompositeOperation !== "destination-out" &&
      (entry.pixelDelta || 0) > 0;
    return {
      dest: entry.dest,
      globalAlpha: entry.globalAlpha,
      globalCompositeOperation: entry.globalCompositeOperation,
      id: entry.id,
      imageSrc: entry.imageSrc,
      intersectsCanvas: entry.intersectsCanvas,
      kind: entry.kind,
      pixelDelta: entry.pixelDelta,
      positiveDestination,
      sequence: entry.sequence,
      source: entry.source,
      threw: entry.threw,
      validSource,
      visibleCoverage,
      visibleRect: entry.visibleRect,
      visibleSpriteProof,
    };
  }

  function spriteIdForImageSource(src, registrations = []) {
    const normalizedSrc = normalizeSpriteSource(src);
    const registration = registrations.find(
      (entry) => normalizeSpriteSource(entry.src) === normalizedSrc
    );
    return registration?.id || "";
  }

  function normalizeSpriteSource(src = "") {
    try {
      const url = new URL(src, "http://127.0.0.1");
      return `${url.pathname}${url.search}`;
    } catch {
      return String(src || "");
    }
  }

  function kindForSpriteId(id = "") {
    if (id === "background:tower_floor" || id.startsWith("background:")) return "background";
    if (id === "player" || id.startsWith("player:")) return "player";
    if (id === "spriteSheet:directional_player") return "player";
    if (id.startsWith("enemy:")) return "enemy";
    if (id.startsWith("weapon:") || id.startsWith("weaponIcon:")) return "weapon";
    return "unknown";
  }

  function describeCanvasDraw(context, image, args) {
    const canvas = context.canvas;
    const transform = context.getTransform?.();
    const sourceWidth = image?.naturalWidth || image?.videoWidth || image?.width || 0;
    const sourceHeight = image?.naturalHeight || image?.videoHeight || image?.height || 0;
    const rect = destinationRect(args, sourceWidth, sourceHeight);
    const transformedRect = transformRect(transform, rect);
    const visibleRect = intersectRect(transformedRect, {
      height: canvas?.height || 0,
      width: canvas?.width || 0,
      x: 0,
      y: 0,
    });
    return {
      dest: rect,
      globalAlpha: context.globalAlpha,
      globalCompositeOperation: context.globalCompositeOperation,
      imageSrc: image?.currentSrc || image?.src || "",
      intersectsCanvas: Boolean(visibleRect && visibleRect.width > 0 && visibleRect.height > 0),
      source: {
        naturalHeight: sourceHeight,
        naturalWidth: sourceWidth,
      },
      visibleRect,
    };
  }

  function destinationRect(args, sourceWidth, sourceHeight) {
    if (args.length >= 8) {
      return normalizeRect({
        height: Number(args[7]) || 0,
        width: Number(args[6]) || 0,
        x: Number(args[4]) || 0,
        y: Number(args[5]) || 0,
      });
    }
    if (args.length >= 4) {
      return normalizeRect({
        height: Number(args[3]) || 0,
        width: Number(args[2]) || 0,
        x: Number(args[0]) || 0,
        y: Number(args[1]) || 0,
      });
    }
    return normalizeRect({
      height: sourceHeight,
      width: sourceWidth,
      x: Number(args[0]) || 0,
      y: Number(args[1]) || 0,
    });
  }

  function normalizeRect(rect) {
    const x1 = Math.min(rect.x, rect.x + rect.width);
    const x2 = Math.max(rect.x, rect.x + rect.width);
    const y1 = Math.min(rect.y, rect.y + rect.height);
    const y2 = Math.max(rect.y, rect.y + rect.height);
    return {
      height: y2 - y1,
      width: x2 - x1,
      x: x1,
      y: y1,
    };
  }

  function transformRect(transform, rect) {
    if (!transform) return rect;
    const points = [
      transformPoint(transform, rect.x, rect.y),
      transformPoint(transform, rect.x + rect.width, rect.y),
      transformPoint(transform, rect.x, rect.y + rect.height),
      transformPoint(transform, rect.x + rect.width, rect.y + rect.height),
    ];
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return {
      height: Math.max(...ys) - Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      x: Math.min(...xs),
      y: Math.min(...ys),
    };
  }

  function transformPoint(transform, x, y) {
    return {
      x: transform.a * x + transform.c * y + transform.e,
      y: transform.b * x + transform.d * y + transform.f,
    };
  }

  function intersectRect(rect, bounds) {
    const x1 = Math.max(rect.x, bounds.x);
    const x2 = Math.min(rect.x + rect.width, bounds.x + bounds.width);
    const y1 = Math.max(rect.y, bounds.y);
    const y2 = Math.min(rect.y + rect.height, bounds.y + bounds.height);
    if (x2 <= x1 || y2 <= y1) return null;
    return {
      height: y2 - y1,
      width: x2 - x1,
      x: x1,
      y: y1,
    };
  }

  function sampleCanvasRect(context, rect) {
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    const sampleWidth = Math.min(16, Math.max(1, Math.floor(rect.width)));
    const sampleHeight = Math.min(16, Math.max(1, Math.floor(rect.height)));
    const startX = Math.max(0, Math.floor(rect.x + (rect.width - sampleWidth) / 2));
    const startY = Math.max(0, Math.floor(rect.y + (rect.height - sampleHeight) / 2));
    try {
      const imageData = context.getImageData(startX, startY, sampleWidth, sampleHeight).data;
      let alphaSum = 0;
      let colorSum = 0;
      let opaquePixels = 0;
      for (let index = 0; index < imageData.length; index += 4) {
        const alpha = imageData[index + 3];
        alphaSum += alpha;
        colorSum += imageData[index] + imageData[index + 1] + imageData[index + 2];
        if (alpha > 0) opaquePixels += 1;
      }
      return {
        alphaSum,
        colorSum,
        height: sampleHeight,
        opaquePixels,
        width: sampleWidth,
        x: startX,
        y: startY,
      };
    } catch (error) {
      return {
        error: error.message,
        height: sampleHeight,
        width: sampleWidth,
        x: startX,
        y: startY,
      };
    }
  }

  function pixelStatsDelta(beforeStats, afterStats) {
    if (!beforeStats || !afterStats || beforeStats.error || afterStats.error) return 0;
    return (
      Math.abs((afterStats.alphaSum || 0) - (beforeStats.alphaSum || 0)) +
      Math.abs((afterStats.colorSum || 0) - (beforeStats.colorSum || 0))
    );
  }
  return { diagnostics, kindForSpriteId, summarizeCanvasWitness, retainCanvasWitness };
}
