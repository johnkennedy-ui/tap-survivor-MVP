import { spawnSync } from "node:child_process";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { chromium } from "playwright";

const repoRoot = process.cwd();
const cli = parseCli(process.argv.slice(2));
const root = cli.root ? resolve(repoRoot, cli.root) : repoRoot;
const viewport = resolveViewport(cli.viewport);
const strict = cli.failOnDiff || Boolean(globalThis["__TapSurvivorParityFailOnDiff__"]);
const framesToAdvance = cli.frames;
const dtMs = cli.dtMs;
const screenshotDir = cli.screenshotDir ? resolve(repoRoot, cli.screenshotDir) : "";
const syntheticPagePrefix = "/__runtime-parity/";
const syntheticPages = {
  classic: `${syntheticPagePrefix}classic.html`,
  esm: `${syntheticPagePrefix}esm.html`,
};

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const report = {
  appLevelResult: "fail",
  classic: null,
  comparison: null,
  diagnosticMode: !strict,
  esm: null,
  firstDivergence: null,
  pageUrl: null,
  rootDir: root,
  surfaces: [],
  surfaceRoots: [],
  strictMode: strict,
  viewport,
};

const classicIndexSource = readClassicIndexSource();
const classicScripts = resolveClassicScripts(classicIndexSource);
const shellPage = injectBase(stripScripts(classicIndexSource));
const surfaceRoots = resolveSurfaceRoots(root);
report.surfaceRoots = surfaceRoots.map((surface) => ({
  exists: surface.exists,
  name: surface.name,
  rootDir: surface.rootDir,
  surfaceUrl: surface.surfaceUrl,
}));

async function main() {
  const browser = await chromium.launch({ headless: true });
  let infraFailure = "";
  try {
    for (const surface of surfaceRoots) {
      const surfaceResult = await runSurface(browser, surface);
      report.surfaces.push(surfaceResult);
    }
    const comparisonSummary = summarizeSurfaceComparisons(report.surfaces);
    report.classic = comparisonSummary.classic;
    report.esm = comparisonSummary.esm;
    report.comparison = comparisonSummary.comparison;
    report.firstDivergence = comparisonSummary.firstDivergence;
    report.appLevelResult = comparisonSummary.appLevelResult;
    emitReport(report);

    if (strict && comparisonSummary.strictFailures.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    infraFailure = error?.stack || error?.message || String(error);
    report.appLevelResult = "fail";
    report.comparison = {
      appLevelResult: "fail",
      comparisonNotes: [],
      strictFailures: [`infra failure: ${shortMessage(infraFailure)}`],
    };
    emitReport(report);
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
  }
}

async function runSurface(browser, surface) {
  const result = {
    appLevelResult: "fail",
    builtOutputSurface: surface.name === "built",
    comparison: null,
    exists: surface.exists,
    firstDivergence: null,
    name: surface.name,
    rootDir: surface.rootDir,
    skipped: !surface.exists,
    skipReason: surface.exists ? "" : "surface root missing",
    viewports: [],
  };

  if (!surface.exists) return result;

  const server = createServer((req, res) => {
    const requestUrl = req.url || "/";
    if (requestUrl === syntheticPages.classic) {
      return sendHtml(res, buildClassicPage());
    }
    if (requestUrl === syntheticPages.esm) {
      return sendHtml(res, buildEsmPage());
    }

    const fullPath = resolveRequestPath(requestUrl, surface.rootDir);
    if (!fullPath || !fullPath.startsWith(surface.rootDir) || !existsSync(fullPath)) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const filePath = statSync(fullPath).isDirectory() ? join(fullPath, "index.html") : fullPath;
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "cache-control": "no-store",
      "content-type": contentTypeFor(filePath),
    });
    createReadStream(filePath).pipe(res);
  });

  await new Promise((resolveServer, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveServer);
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const origin = `http://127.0.0.1:${port}`;

  try {
    for (const viewportName of ["desktop", "mobile"]) {
      const runtimeViewport = resolveViewport(viewportName);
      const classic = await runRuntime(browser, origin, "classic", syntheticPages.classic, runtimeViewport, surface);
      const esm = await runRuntime(browser, origin, "esm", syntheticPages.esm, runtimeViewport, surface);
      const comparison = compareSnapshots(classic, esm);
      result.viewports.push({
        appLevelResult: comparison.appLevelResult,
        classic,
        comparison,
        esm,
        firstDivergence: comparison.strictFailures[0] || comparison.comparisonNotes[0] || null,
        runtimeViewport,
        viewportName,
      });
    }
    const summary = summarizeSurfaceResult(result);
    result.appLevelResult = summary.appLevelResult;
    result.comparison = summary.comparison;
    result.firstDivergence = summary.firstDivergence;
    result.classic = summary.classic;
    result.esm = summary.esm;
    result.strictFailures = summary.strictFailures;
    result.comparisonNotes = summary.comparisonNotes;
    return result;
  } catch (error) {
    const infraFailure = error?.stack || error?.message || String(error);
    result.appLevelResult = "fail";
    result.infraFailure = infraFailure;
    result.strictFailures = [`infra failure: ${shortMessage(infraFailure)}`];
    return result;
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
  }
}

async function runRuntime(browser, origin, mode, pagePath, runtimeViewport, surface) {
  const page = await browser.newPage({ viewport: runtimeViewport || viewport });
  const result = createRuntimeResult(mode, pagePath);
  const responseStatusByUrl = new Map();

  await page.addInitScript(({ mode: initMode }) => {
    const root = globalThis;
    const parity = (root.__TapSurvivorParity = root.__TapSurvivorParity || {});
    parity.mode = initMode;
    parity.drawCalls = [];
    parity.raf = parity.raf || { count: 0, dts: [], timestamps: [] };
    parity.raf.count = 0;
    parity.raf.dts = [];
    parity.raf.timestamps = [];
    parity.pageErrors = [];
    parity.requestErrors = [];
    parity.spriteRegistrations = parity.spriteRegistrations || [];
    parity.spriteLoads = parity.spriteLoads || [];
    parity.spriteLoadRequests = parity.spriteLoadRequests || [];
    parity.scriptRequests = parity.scriptRequests || [];
    parity.moduleRequests = parity.moduleRequests || [];
    parity.started = false;

    const nativeRAF = root.requestAnimationFrame?.bind(root);
    let lastTimestamp = null;
    if (typeof nativeRAF === "function") {
      root.requestAnimationFrame = (callback) =>
        nativeRAF((timestamp) => {
          parity.raf.count += 1;
          parity.raf.timestamps.push(timestamp);
          parity.raf.dts.push(lastTimestamp === null ? 0 : timestamp - lastTimestamp);
          lastTimestamp = timestamp;
          return callback(timestamp);
        });
    }

    const contextProto = root.CanvasRenderingContext2D?.prototype;
    if (contextProto && !contextProto.__tapParityPatched) {
      const originalDrawImage = contextProto.drawImage;
      contextProto.drawImage = function patchedDrawImage(image, ...args) {
        const before = describeDraw(this, image, args);
        const beforeStats = sampleCanvasRect(this, before.visibleRect);
        let threw = false;
        try {
          return originalDrawImage.call(this, image, ...args);
        } catch (error) {
          threw = true;
          throw error;
        } finally {
          const afterStats = sampleCanvasRect(this, before.visibleRect);
          parity.drawCalls.push({
            ...before,
            afterStats,
            beforeStats,
            pixelDelta: pixelStatsDelta(beforeStats, afterStats),
            threw,
          });
        }
      };
      contextProto.__tapParityPatched = true;
    }

    root.addEventListener?.("error", (event) => {
      parity.pageErrors.push({
        message: event?.error?.message || event?.message || "window error",
      });
    });
    root.addEventListener?.("unhandledrejection", (event) => {
      parity.pageErrors.push({
        message: event?.reason?.message || String(event?.reason || "unhandled rejection"),
      });
    });

    const audio = (parity.audio = parity.audio || {
      api: {
        hasAudioContext: Boolean(root.AudioContext || root.webkitAudioContext),
        hasAudioElement: Boolean(root.Audio),
        hasMediaPlay: Boolean(root.HTMLMediaElement?.prototype?.play),
      },
      attempts: [],
      errors: [],
      patchErrors: [],
    });
    const mediaProto = root.HTMLMediaElement?.prototype;
    if (mediaProto && !mediaProto.__tapParityAudioPatched) {
      const originalPlay = mediaProto.play;
      if (typeof originalPlay === "function") {
        mediaProto.play = function patchedMediaPlay(...playArgs) {
          audio.attempts.push({
            operation: "play",
            source: this?.currentSrc || this?.src || "",
            tagName: this?.tagName || "",
          });
          try {
            const result = originalPlay.apply(this, playArgs);
            result?.catch?.((error) => {
              audio.errors.push({
                message: error?.message || String(error || "media play rejected"),
                operation: "play",
              });
            });
            return result;
          } catch (error) {
            audio.errors.push({
              message: error?.message || String(error || "media play failed"),
              operation: "play",
            });
            throw error;
          }
        };
      }
      const audioContextProto = (root.AudioContext || root.webkitAudioContext)?.prototype;
      if (audioContextProto && typeof audioContextProto.resume === "function") {
        const originalResume = audioContextProto.resume;
        audioContextProto.resume = function patchedAudioResume(...resumeArgs) {
          audio.attempts.push({
            operation: "resume",
            state: this?.state || "",
          });
          try {
            const result = originalResume.apply(this, resumeArgs);
            result?.catch?.((error) => {
              audio.errors.push({
                message: error?.message || String(error || "audio resume rejected"),
                operation: "resume",
              });
            });
            return result;
          } catch (error) {
            audio.errors.push({
              message: error?.message || String(error || "audio resume failed"),
              operation: "resume",
            });
            throw error;
          }
        };
      }
      mediaProto.__tapParityAudioPatched = true;
    }

    function describeDraw(context, image, args) {
      const canvas = context.canvas;
      const transform = context.getTransform?.();
      const sourceWidth = image?.naturalWidth || image?.videoWidth || image?.width || 0;
      const sourceHeight = image?.naturalHeight || image?.videoHeight || image?.height || 0;
      const dest = destinationRect(args, sourceWidth, sourceHeight);
      const transformedRect = transformRect(transform, dest);
      const visibleRect = intersectRect(transformedRect, {
        height: canvas?.height || 0,
        width: canvas?.width || 0,
        x: 0,
        y: 0,
      });
      return {
        canvas: {
          height: canvas?.height || 0,
          width: canvas?.width || 0,
        },
        dest,
        globalAlpha: context.globalAlpha,
        globalCompositeOperation: context.globalCompositeOperation,
        imageSrc: image?.currentSrc || image?.src || "",
        intersectsCanvas: Boolean(visibleRect && visibleRect.width > 0 && visibleRect.height > 0),
        source: {
          naturalHeight: sourceHeight,
          naturalWidth: sourceWidth,
        },
        transformedRect,
        transform: transform
          ? { a: transform.a, b: transform.b, c: transform.c, d: transform.d, e: transform.e, f: transform.f }
          : null,
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
      return { height: y2 - y1, width: x2 - x1, x: x1, y: y1 };
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
      return { x: transform.a * x + transform.c * y + transform.e, y: transform.b * x + transform.d * y + transform.f };
    }

    function intersectRect(rect, bounds) {
      const x1 = Math.max(rect.x, bounds.x);
      const x2 = Math.min(rect.x + rect.width, bounds.x + bounds.width);
      const y1 = Math.max(rect.y, bounds.y);
      const y2 = Math.min(rect.y + rect.height, bounds.y + bounds.height);
      if (x2 <= x1 || y2 <= y1) return null;
      return { height: y2 - y1, width: x2 - x1, x: x1, y: y1 };
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
        return { alphaSum, colorSum, height: sampleHeight, opaquePixels, width: sampleWidth, x: startX, y: startY };
      } catch (error) {
        return { error: error.message, height: sampleHeight, width: sampleWidth, x: startX, y: startY };
      }
    }

    function pixelStatsDelta(beforeStats, afterStats) {
      if (!beforeStats || !afterStats || beforeStats.error || afterStats.error) return 0;
      return (
        Math.abs((afterStats.alphaSum || 0) - (beforeStats.alphaSum || 0)) +
        Math.abs((afterStats.colorSum || 0) - (beforeStats.colorSum || 0))
      );
    }
  }, { mode });

  page.on("console", (message) => {
    if (message.type() === "error") {
      result.consoleErrors.push({
        location: message.location(),
        message: message.text(),
        type: message.type(),
      });
    }
  });
  page.on("pageerror", (error) => {
    result.pageErrors.push({ message: error.message, stack: error.stack });
  });
  page.on("request", (request) => {
    const entry = { method: request.method(), resourceType: request.resourceType(), url: request.url() };
    result.requests.push(entry);
    if (entry.resourceType === "script" || entry.resourceType === "document") {
      result.scriptUrls.push(entry.url);
    }
    if (entry.url.includes("/src/app/production-module-entrypoint.js") || entry.url.includes("/src/app/production-module-autoboot.js")) {
      result.moduleUrls.push(entry.url);
    }
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure();
    result.failedRequests.push({
      errorText: failure?.errorText || "request failed",
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
    });
  });
  page.on("response", (response) => {
    const entry = { status: response.status(), url: response.url() };
    result.responses.push(entry);
    responseStatusByUrl.set(normalizeImageSource(entry.url), entry.status);
    if (isLocalUrl(entry.url, origin) && entry.status >= 400) {
      result.httpFailures.push(entry);
    }
  });

  const pageUrl = `${origin}${pagePath}`;
  result.pageUrl = pageUrl;
  let infraFailure = "";
  try {
    const response = await page.goto(pageUrl, { waitUntil: "load", timeout: 30000 });
    result.indexLoaded = Boolean(response && response.ok());
    await page.waitForTimeout(350);

    result.canvasFound = (await page.locator("#game").count().catch(() => 0)) > 0;
    result.titleControlDetected =
      (await page.locator("#titleStartGame").count().catch(() => 0)) > 0 ||
      (await page.getByRole("button", { name: /start game/i }).count().catch(() => 0)) > 0;
    result.uiDetected = await detectUi(page);
    result.startGameFound = result.titleControlDetected;

    await waitForRuntimeReady(page);

    const startButton = await locateStartButton(page);
    if (startButton) {
      result.startGameClicked = true;
      await startButton.click({ timeout: 5000 }).catch((error) => {
        result.startGameClickThrew = true;
        result.pageErrors.push({ message: `Start Game click failed: ${error.message}`, stack: error.stack });
      });
    }

    const canvas = page.locator("#game");
    if ((await canvas.count().catch(() => 0)) > 0) {
      const box = await canvas.boundingBox().catch(() => null);
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2).catch(() => {});
      }
    }

    await page.waitForTimeout(450);
    await waitForFrameBudget(page, result, framesToAdvance, dtMs);
    await waitForPlayerState(page);
    await waitForEnemyEvidence(page);
    await waitForProjectileEvidence(page);

    result.snapshot = await page.evaluate(() => {
      const root = globalThis;
      const parity = root.__TapSurvivorParity || {};
      const canvas = document.getElementById("game");
      const titleScreen = document.getElementById("titleScreen");
      const startTransition = document.getElementById("startTransition");
      const openMenu = document.getElementById("openMenu");
      const fullscreenButton = document.getElementById("fullscreenButton");
      const muteAudio = document.getElementById("muteAudio");
      const speedButtons = [...document.querySelectorAll("[data-speed]")].map((button) => ({
        active: button.classList.contains("active"),
        speed: button.dataset.speed,
      }));
      const menuShopTab = document.getElementById("menuShopTab");
      const menuProgressTab = document.getElementById("menuProgressTab");
      const menuInventoryTab = document.getElementById("menuInventoryTab");
      const content = root.TapSurvivorContent || {};
      const game = parity.classicGame || parity.game || parity.esmApi?.dependencies?.getGame?.() || null;
      return {
        assetsLoaded: Boolean(content.assets),
        contentLoaded: Boolean(root.TapSurvivorContent),
        canvas: canvas instanceof HTMLCanvasElement ? { backing: { height: canvas.height, width: canvas.width }, css: rectSize(canvas.getBoundingClientRect()) } : null,
        controls: {
          fullscreenButton: Boolean(fullscreenButton),
          menuButton: Boolean(openMenu),
          menuInventoryTab: Boolean(menuInventoryTab),
          menuProgressTab: Boolean(menuProgressTab),
          menuShopTab: Boolean(menuShopTab),
          muteAudio: Boolean(muteAudio),
          speedButtons,
        },
        game: snapshotGame(game),
        registeredSpriteGroups: snapshotSpriteGroups(content.assets?.sprites || {}),
        registeredSpriteGroupDefs: content.assets?.sprites || {},
        audio: snapshotAudio(parity),
        title: {
          startTransitionHidden: startTransition?.classList.contains("hidden") ?? null,
          titleHidden: titleScreen?.classList.contains("hidden") ?? null,
        },
        diagnostics: {
          drawCalls: parity.drawCalls || [],
          pageErrors: parity.pageErrors || [],
          raf: parity.raf || { count: 0, dts: [], timestamps: [] },
          requestErrors: parity.requestErrors || [],
          spriteLoadRequests: parity.spriteLoadRequests || [],
          spriteLoads: parity.spriteLoads || [],
          spriteRegistrations: parity.spriteRegistrations || [],
        },
      };

      function rectSize(rect) {
        return rect ? { height: Math.round(rect.height), width: Math.round(rect.width) } : null;
      }

      function snapshotGame(gameState) {
        if (!gameState) return null;
        const player = gameState.player || null;
        const projectileCollections = sampleProjectileCollections(gameState);
        const enemySample = sampleEntity(gameState.enemies?.[0] || null);
        const weaponFireEvidence = sampleWeaponFireEvidence(gameState);
        return {
          awaitingFirstMoveInput: Boolean(gameState.awaitingFirstMoveInput),
          elapsed: Number(gameState.elapsed || 0),
          enemies: Array.isArray(gameState.enemies) ? gameState.enemies.length : 0,
          enemySample,
          weaponFireEvidence,
          projectileCollections: projectileCollections.collections,
          projectileCount: projectileCollections.count,
          projectileSample: projectileCollections.sample,
          projectileSource: projectileCollections.source,
          player: player
            ? {
                equippedWeapons: Array.isArray(player.equippedWeapons) ? [...player.equippedWeapons] : [],
                hp: Number.isFinite(player.hp) ? player.hp : null,
                maxHp: Number.isFinite(player.maxHp) ? player.maxHp : null,
                radius: Number.isFinite(player.radius) ? player.radius : null,
                spriteId: playerSpriteId(player),
                x: Number.isFinite(player.x) ? player.x : null,
                y: Number.isFinite(player.y) ? player.y : null,
              }
            : null,
          running: Boolean(gameState.running),
          towerFloor: Number.isFinite(gameState.towerFloor) ? gameState.towerFloor : null,
        };
      }

      function snapshotAudio(parityState) {
        const audioState = parityState.audio || {};
        return {
          adapterPresent: Boolean(parityState.esmApi?.dependencies?.audio?.createAudioSystem),
          api: audioState.api || {
            hasAudioContext: Boolean(root.AudioContext || root.webkitAudioContext),
            hasAudioElement: Boolean(root.Audio),
            hasMediaPlay: Boolean(root.HTMLMediaElement?.prototype?.play),
          },
          attempts: Array.isArray(audioState.attempts) ? [...audioState.attempts] : [],
          errors: Array.isArray(audioState.errors) ? [...audioState.errors] : [],
          observed: Boolean((audioState.attempts || []).length || (audioState.errors || []).length),
        };
      }

      function snapshotSpriteGroups(spriteGroups) {
        return {
          backgrounds: Object.keys(spriteGroups.backgrounds || {}),
          enemies: Object.keys(spriteGroups.enemies || {}),
          player: spriteGroups.player ? [spriteSource(spriteGroups.player)] : [],
          playerAnimations: Object.keys(spriteGroups.playerAnimations || {}),
          runUpgradeIcons: Object.keys(spriteGroups.runUpgradeIcons || {}),
          runUpgrades: Object.keys(spriteGroups.runUpgrades || {}),
          ui: Object.keys(spriteGroups.ui || {}),
          weapons: Object.keys(spriteGroups.weapons || {}),
        };
      }

      function playerSpriteId(player) {
        if (player?.actionTimer > 0 && player?.actionSprite) return `player:${player.actionSprite}`;
        if (player?.moving) return "player:walk";
        return "player";
      }

      function sampleProjectileCollections(gameState) {
        const candidates = [
          ["projectiles", gameState.projectiles],
          ["bolts", gameState.bolts],
          ["enemyBolts", gameState.enemyBolts],
          ["weaponBolts", gameState.weaponBolts],
          ["enemyProjectiles", gameState.enemyProjectiles],
          ["weaponProjectiles", gameState.weaponProjectiles],
        ].filter((entry) => Array.isArray(entry[1]));
        const firstNonEmpty = candidates.find((entry) => entry[1].length > 0) || candidates[0] || null;
        const collection = firstNonEmpty?.[1] || [];
        return {
          collections: Object.fromEntries(candidates.map(([name, items]) => [name, items.length])),
          count: collection.length,
          sample: sampleEntity(collection[0] || null),
          source: firstNonEmpty?.[0] || null,
        };
      }

      function sampleWeaponFireEvidence(gameState) {
        const bursts = Array.isArray(gameState.weaponBursts) ? gameState.weaponBursts : [];
        const flashes =
          gameState.weaponIconFlashes && typeof gameState.weaponIconFlashes === "object"
            ? gameState.weaponIconFlashes
            : {};
        const flashEntries = Object.entries(flashes).filter(([, value]) => Number(value) > 0);
        const player = gameState.player || null;
        return {
          burstCount: bursts.length,
          burstSample: sampleWeaponBurst(bursts[0] || null),
          iconFlashCount: flashEntries.length,
          iconFlashSample: flashEntries[0]
            ? {
                value: numberOrNull(flashEntries[0][1]),
                weaponId: stringOrNull(flashEntries[0][0]),
              }
            : null,
          playerAction: player
            ? {
                active: Boolean(player.actionTimer > 0 && player.actionSprite),
                spriteId: stringOrNull(player.actionSprite || ""),
                timer: numberOrNull(player.actionTimer),
              }
            : null,
        };
      }

      function sampleWeaponBurst(burst) {
        if (!burst || typeof burst !== "object") return null;
        return {
          color: stringOrNull(burst.color),
          life: numberOrNull(burst.life),
          maxLife: numberOrNull(burst.maxLife),
          radius: numberOrNull(burst.radius),
          weaponId: stringOrNull(burst.weaponId),
          x: numberOrNull(burst.x),
          y: numberOrNull(burst.y),
        };
      }

      function sampleEntity(entity) {
        if (!entity || typeof entity !== "object") return null;
        return {
          id: stringOrNull(entity.id ?? entity.name ?? entity.kind ?? ""),
          kind: stringOrNull(entity.kind ?? entity.type ?? ""),
          spriteId: stringOrNull(entity.spriteId ?? entity.sprite ?? entity.spriteName ?? entity.assetId ?? ""),
          type: stringOrNull(entity.type ?? entity.kind ?? ""),
          hp: numberOrNull(entity.hp),
          radius: numberOrNull(entity.radius),
          x: numberOrNull(entity.x),
          y: numberOrNull(entity.y),
        };
      }

      function stringOrNull(value) {
        return typeof value === "string" && value ? value : null;
      }

      function numberOrNull(value) {
        return Number.isFinite(value) ? value : null;
      }

      function spriteSource(definition) {
        if (typeof definition === "string") return definition;
        if (definition && typeof definition === "object") return definition.src || definition.path || definition.iconSrc || "";
        return "";
      }
    });

    result.classified = classifyDraws(result.snapshot?.diagnostics?.drawCalls || [], result.snapshot?.registeredSpriteGroupDefs || {});
    result.enemyEvidence = {
      count: result.snapshot?.game?.enemies || 0,
      sample: result.snapshot?.game?.enemySample || null,
    };
    result.fireEvidence = result.snapshot?.game?.weaponFireEvidence || null;
    result.projectileEvidence = {
      collections: result.snapshot?.game?.projectileCollections || {},
      count: result.snapshot?.game?.projectileCount || 0,
      sample: result.snapshot?.game?.projectileSample || null,
      source: result.snapshot?.game?.projectileSource || null,
    };
    result.playerDraw = findPlayerDraw(result.classified.drawCalls);
    result.backgroundDraw = result.classified.drawCalls.find((entry) => entry.kind === "background" && entry.intersectsCanvas) || null;
    result.enemyDraw = result.classified.drawCalls.find((entry) => entry.kind === "enemy" && entry.intersectsCanvas) || null;
    result.weaponDraw = result.classified.drawCalls.find((entry) => entry.kind === "weapon" && entry.intersectsCanvas) || null;
    result.menuEvidence = await collectMenuEvidence(page);
    if (result.snapshot) result.snapshot.menu = result.menuEvidence;
    result.audioEvidence = result.snapshot?.audio || null;
    result.playerVisible = Boolean(result.classified.playerCanvasVisible);
    result.loadedScriptUrls = result.scriptUrls.filter((url) => isLocalUrl(url, origin));
    result.loadedModuleUrls = result.moduleUrls.filter((url) => isLocalUrl(url, origin));
    result.canvasBackingSize = result.snapshot?.canvas?.backing || null;
    result.canvasCssSize = result.snapshot?.canvas?.css || null;
    result.startControlFound = Boolean(result.startGameFound);
    result.contentLoaded = Boolean(result.snapshot?.contentLoaded);
    result.assetsLoaded = Boolean(result.snapshot?.assetsLoaded);
    result.spriteGroups = result.snapshot?.registeredSpriteGroups || null;
    result.titleVisible = Boolean(result.snapshot?.title?.titleHidden === false);
    result.raf = result.snapshot?.diagnostics?.raf || { count: 0, dts: [], timestamps: [] };
    result.consoleErrors = result.consoleErrors || [];
    result.pageErrors = (result.pageErrors || []).concat(result.snapshot?.diagnostics?.pageErrors || []);
    result.browserErrors = {
      consoleErrors: result.consoleErrors,
      failedRequests: result.failedRequests,
      httpFailures: result.httpFailures,
      pageErrors: result.pageErrors,
    };
    result.summary = summarizeRuntime(result, origin);
    result.viewport = runtimeViewport || viewport;
    result.surface = surface?.name || "root";

    if (cli.screenshotDir) {
      await mkdir(cli.screenshotDir, { recursive: true });
      await page.screenshot({ path: join(cli.screenshotDir, `${mode}.png`), fullPage: true }).catch(() => {});
    }
  } catch (error) {
    infraFailure = error?.stack || error?.message || String(error);
    result.infraFailure = infraFailure;
  } finally {
    await page.close().catch(() => {});
  }

  if (infraFailure) {
    throw new Error(`${mode} runtime infra failure: ${infraFailure}`);
  }

  return result;
}

function createRuntimeResult(mode, pagePath) {
  return {
    assetsLoaded: false,
    backgroundDraw: null,
    browserErrors: null,
    canvasBackingSize: null,
    canvasCssSize: null,
    canvasFound: false,
    classified: null,
    consoleErrors: [],
    contentLoaded: false,
    diagnostics: null,
    drawCalls: [],
    enemyDraw: null,
    failedRequests: [],
    httpFailures: [],
    indexLoaded: false,
    loadedModuleUrls: [],
    loadedScriptUrls: [],
    mode,
    pageErrors: [],
    pagePath,
    pageUrl: null,
    enemyEvidence: null,
    menuEvidence: null,
    projectileEvidence: null,
    surface: null,
    playerDraw: null,
    playerVisible: false,
    raf: { count: 0, dts: [], timestamps: [] },
    requests: [],
    responses: [],
    moduleUrls: [],
    scriptUrls: [],
    snapshot: null,
    spriteGroups: null,
    startControlFound: false,
    startGameClicked: false,
    startGameClickThrew: false,
    startGameFound: false,
    summary: null,
    titleVisible: false,
    viewport: null,
    uiDetected: null,
    weaponDraw: null,
    audioEvidence: null,
    fireEvidence: null,
  };
}

function compareSnapshots(classic, esm) {
  const notes = [];
  const strictFailures = [];
  const classicCanvas = classic.canvasBackingSize || classic.snapshot?.canvas?.backing || null;
  const esmCanvas = esm.canvasBackingSize || esm.snapshot?.canvas?.backing || null;
  const classicPlayer = classic.snapshot?.game?.player || null;
  const esmPlayer = esm.snapshot?.game?.player || null;
  const classicBackground = classic.backgroundDraw;
  const esmBackground = esm.backgroundDraw;
  const classicPlayerVisible = Boolean(classic.playerVisible);
  const esmPlayerVisible = Boolean(esm.playerVisible);
  const classicEnemyCount = Number(classic.enemyEvidence?.count ?? classic.snapshot?.game?.enemies ?? 0);
  const esmEnemyCount = Number(esm.enemyEvidence?.count ?? esm.snapshot?.game?.enemies ?? 0);
  const classicProjectileCount = Number(classic.projectileEvidence?.count ?? classic.snapshot?.game?.projectileCount ?? 0);
  const esmProjectileCount = Number(esm.projectileEvidence?.count ?? esm.snapshot?.game?.projectileCount ?? 0);
  const classicMenu = classic.menuEvidence?.tabs || classic.snapshot?.menu?.tabs || {};
  const esmMenu = esm.menuEvidence?.tabs || esm.snapshot?.menu?.tabs || {};
  const classicAudio = classic.audioEvidence || classic.snapshot?.audio || null;
  const esmAudio = esm.audioEvidence || esm.snapshot?.audio || null;
  const classicEnemyDraw = classic.enemyDraw || null;
  const esmEnemyDraw = esm.enemyDraw || null;
  const classicFireEvidence = classic.fireEvidence || classic.snapshot?.game?.weaponFireEvidence || null;
  const esmFireEvidence = esm.fireEvidence || esm.snapshot?.game?.weaponFireEvidence || null;
  const classicFireObserved = hasWeaponFireEvidence(classicFireEvidence);
  const esmFireObserved = hasWeaponFireEvidence(esmFireEvidence);

  if (!classic.indexLoaded) strictFailures.push("classic runtime page did not load");
  if (!esm.indexLoaded) strictFailures.push("esm runtime page did not load");
  if (classicCanvas && esmCanvas && (classicCanvas.width !== esmCanvas.width || classicCanvas.height !== esmCanvas.height)) {
    strictFailures.push(`canvas backing mismatch: classic ${describeSize(classicCanvas)} vs esm ${describeSize(esmCanvas)}`);
  }
  if (classic.canvasCssSize && esm.canvasCssSize && (classic.canvasCssSize.width !== esm.canvasCssSize.width || classic.canvasCssSize.height !== esm.canvasCssSize.height)) {
    strictFailures.push(`canvas CSS mismatch: classic ${describeSize(classic.canvasCssSize)} vs esm ${describeSize(esm.canvasCssSize)}`);
  }

  if (classic.startControlFound && !esm.startControlFound) strictFailures.push("classic found Start Game but ESM did not");
  if (classic.startGameClicked && !esm.startGameClicked) strictFailures.push("classic clicked Start Game but ESM did not");
  if (classic.canvasFound && !esm.canvasFound) strictFailures.push("classic has canvas but ESM does not");
  if (classicBackground && !esmBackground) strictFailures.push("classic recorded background draw but ESM did not");
  if (classicPlayerVisible && !esmPlayerVisible) strictFailures.push("classic recorded visible player draw but ESM did not");
  if (classicEnemyDraw && !esmEnemyDraw) {
    strictFailures.push("classic recorded enemy draw evidence but ESM did not");
  }
  if (classicEnemyCount > 0 && esmEnemyCount === 0) {
    strictFailures.push(`classic sampled ${classicEnemyCount} enemies but ESM sampled none`);
  } else if (classicEnemyCount > 0 && esmEnemyCount > 0 && classicEnemyCount !== esmEnemyCount) {
    notes.push(`enemy count differs: classic ${classicEnemyCount} vs esm ${esmEnemyCount}`);
  }
  if (classicProjectileCount > 0 && esmProjectileCount === 0) {
    strictFailures.push(`classic sampled ${classicProjectileCount} projectiles but ESM sampled none`);
  } else if (classicProjectileCount > 0 && esmProjectileCount > 0 && classicProjectileCount !== esmProjectileCount) {
    notes.push(`projectile count differs: classic ${classicProjectileCount} vs esm ${esmProjectileCount}`);
  }
  if (classicFireObserved && !esmFireObserved) {
    strictFailures.push("classic observed a weapon fire attempt but ESM did not");
  } else if (classicFireObserved && esmFireObserved) {
    const classicFireCount = Number(classicFireEvidence?.burstCount || 0);
    const esmFireCount = Number(esmFireEvidence?.burstCount || 0);
    if (classicFireCount > 0 && esmFireCount > 0 && classicFireCount !== esmFireCount) {
      notes.push(`weapon fire burst count differs: classic ${classicFireCount} vs esm ${esmFireCount}`);
    }
  }
  for (const tabName of ["progress", "shop", "inventory"]) {
    const classicTab = classicMenu[tabName] || {};
    const esmTab = esmMenu[tabName] || {};
    if (classicTab.meaningful && (esmTab.blank || esmTab.placeholderOnly || !esmTab.meaningful)) {
      strictFailures.push(
        `classic menu ${tabName} tab has content but ESM tab is ${esmTab.placeholderOnly ? "placeholder-only" : "blank"}`
      );
    } else if (classicTab.meaningful && esmTab.meaningful && classicTab.textLength !== esmTab.textLength) {
      notes.push(`menu ${tabName} text length differs: classic ${classicTab.textLength} vs esm ${esmTab.textLength}`);
    }
    if (classicTab.exists && !esmTab.exists) {
      strictFailures.push(`classic menu ${tabName} tab exists but ESM tab is missing`);
    }
  }
  const classicAudioAttempts = Array.isArray(classicAudio?.attempts) ? classicAudio.attempts.length : 0;
  const esmAudioAttempts = Array.isArray(esmAudio?.attempts) ? esmAudio.attempts.length : 0;
  const classicAudioErrors = Array.isArray(classicAudio?.errors) ? classicAudio.errors.length : 0;
  const esmAudioErrors = Array.isArray(esmAudio?.errors) ? esmAudio.errors.length : 0;
  if (classicAudioAttempts > 0 && esmAudioAttempts === 0) {
    strictFailures.push("classic observed an audio attempt but ESM did not");
  } else if (classicAudioAttempts > 0 && esmAudioErrors > 0) {
    strictFailures.push("classic observed audio but ESM reported audio errors");
  }
  if (classicAudioAttempts === 0 && esmAudioAttempts === 0 && classicAudioErrors === 0 && esmAudioErrors === 0) {
    notes.push("audio remained diagnostic-only; no safe audio attempt observed");
  }
  if ((classic.consoleErrors?.length || 0) === 0 && (esm.consoleErrors?.length || 0) > 0) {
    strictFailures.push("classic had no console errors but ESM did");
  }
  if ((classic.pageErrors?.length || 0) === 0 && (esm.pageErrors?.length || 0) > 0) {
    strictFailures.push("classic had no page errors but ESM did");
  }
  if ((classic.failedRequests?.length || 0) === 0 && (esm.failedRequests?.length || 0) > 0) {
    strictFailures.push("classic had no failed requests but ESM did");
  }

  if (!classicPlayer && !esmPlayer) {
    notes.push("player state unavailable in both runtimes");
  } else if (classicPlayer && esmPlayer) {
    const delta = distance(classicPlayer.x, classicPlayer.y, esmPlayer.x, esmPlayer.y);
    if (Number.isFinite(delta) && delta > 1) {
      notes.push(`player position diverged by ${delta.toFixed(2)}px`);
    }
    if (classicPlayer.radius !== esmPlayer.radius) {
      notes.push(`player radius differs: classic ${classicPlayer.radius} vs esm ${esmPlayer.radius}`);
    }
    if (classicPlayer.maxHp !== esmPlayer.maxHp) {
      notes.push(`player maxHp differs: classic ${classicPlayer.maxHp} vs esm ${esmPlayer.maxHp}`);
      strictFailures.push(`player maxHp mismatch: classic ${classicPlayer.maxHp} vs esm ${esmPlayer.maxHp}`);
    }
  }

  const classicDeterministic = classic.raf?.count || 0;
  const esmDeterministic = esm.raf?.count || 0;
  if (classicDeterministic && esmDeterministic && classicDeterministic !== esmDeterministic) {
    notes.push(`RAF frame count differs: classic ${classicDeterministic} vs esm ${esmDeterministic}`);
  }

  const appLevelResult = strictFailures.length === 0 ? "pass" : notes.length ? "partial" : "fail";
  return {
    appLevelResult,
    comparisonNotes: notes,
    classicHasPlayerDraw: classicPlayerVisible,
    classicHasStartControl: classic.startControlFound,
    classicPlayer,
    classicSummary: classic.summary,
    esmHasPlayerDraw: esmPlayerVisible,
    esmHasStartControl: esm.startControlFound,
    esmPlayer,
    esmSummary: esm.summary,
    strictFailures,
  };
}

function summarizeRuntime(result, origin) {
  const snapshot = result.snapshot || {};
  const game = snapshot.game || null;
  const canvas = snapshot.canvas || null;
  const drawCalls = result.classified?.drawCalls || [];
  const menuTabs = result.menuEvidence?.tabs || snapshot.menu?.tabs || {};
  const audio = result.audioEvidence || snapshot.audio || null;
  return {
    runtime: result.mode,
    pageUrl: result.pageUrl,
    canvasBackingSize: canvas?.backing || result.canvasBackingSize || null,
    canvasCssSize: canvas?.css || result.canvasCssSize || null,
    contentLoaded: Boolean(snapshot.contentLoaded),
    assetsLoaded: Boolean(snapshot.assetsLoaded),
    startControlFound: result.startControlFound,
    startClicked: result.startGameClicked,
    consoleErrors: result.consoleErrors.length,
    pageErrors: result.pageErrors.length,
    failedRequests: result.failedRequests.length,
    httpFailures: result.httpFailures.length,
    loadedScriptUrls: result.loadedScriptUrls.filter((url) => isLocalUrl(url, origin)),
    loadedModuleUrls: result.loadedModuleUrls.filter((url) => isLocalUrl(url, origin)),
    player: game?.player || null,
    enemies: game?.enemies || [],
    enemyCount: Number(result.enemyEvidence?.count ?? game?.enemies?.length ?? 0),
    enemySample: game?.enemySample || null,
    fireEvidence: game?.weaponFireEvidence || null,
    projectileCount: Number(result.projectileEvidence?.count ?? game?.projectileCount ?? 0),
    projectileSample: game?.projectileSample || null,
    projectileSource: game?.projectileSource || null,
    menuTabs,
    menuOpen: Boolean(result.menuEvidence?.runMenuVisible ?? snapshot.menu?.runMenuVisible ?? false),
    audioAttempts: Array.isArray(audio?.attempts) ? audio.attempts.length : 0,
    audioErrors: Array.isArray(audio?.errors) ? audio.errors.length : 0,
    weaponIconsDrawn: drawCalls.filter((entry) => entry.kind === "weapon").length,
    backgroundDraws: drawCalls.filter((entry) => entry.kind === "background").length,
    playerDraws: drawCalls.filter((entry) => entry.kind === "player").length,
    enemyDraws: drawCalls.filter((entry) => entry.kind === "enemy").length,
    raf: result.raf,
  };
}

function resolveSurfaceRoots(baseRoot) {
  return [
    { exists: existsSync(baseRoot), name: "root", rootDir: baseRoot, surfaceUrl: baseRoot },
    {
      exists: existsSync(join(baseRoot, "www")),
      name: "built",
      rootDir: join(baseRoot, "www"),
      surfaceUrl: join(baseRoot, "www"),
    },
  ];
}

function summarizeSurfaceResult(surfaceResult) {
  const viewports = surfaceResult.viewports || [];
  const classic = viewports.map((entry) => entry.classic).find(Boolean) || null;
  const esm = viewports.map((entry) => entry.esm).find(Boolean) || null;
  const comparison = viewports.map((entry) => entry.comparison).find(Boolean) || null;
  const strictFailures = viewports.flatMap((entry) => entry.comparison?.strictFailures || []);
  const comparisonNotes = viewports.flatMap((entry) => entry.comparison?.comparisonNotes || []);
  const firstDivergence =
    viewports.map((entry) => entry.firstDivergence).find(Boolean) ||
    strictFailures[0] ||
    comparisonNotes[0] ||
    null;
  const appLevelResult = viewports.some((entry) => entry.appLevelResult === "fail")
    ? "fail"
    : viewports.some((entry) => entry.appLevelResult === "partial")
      ? "partial"
      : "pass";
  return {
    appLevelResult,
    classic,
    comparison,
    comparisonNotes,
    firstDivergence,
    esm,
    strictFailures,
  };
}

function summarizeSurfaceComparisons(surfaceResults) {
  const allViewports = surfaceResults.flatMap((surface) => surface.viewports || []);
  const classic = allViewports.map((entry) => entry.classic).find(Boolean) || null;
  const esm = allViewports.map((entry) => entry.esm).find(Boolean) || null;
  const comparison = allViewports.map((entry) => entry.comparison).find(Boolean) || null;
  const strictFailures = allViewports.flatMap((entry) => entry.comparison?.strictFailures || []);
  const comparisonNotes = allViewports.flatMap((entry) => entry.comparison?.comparisonNotes || []);
  const firstDivergence =
    surfaceResults.map((surface) => surface.firstDivergence).find(Boolean) ||
    allViewports.map((entry) => entry.firstDivergence).find(Boolean) ||
    strictFailures[0] ||
    comparisonNotes[0] ||
    null;
  const appLevelResult = surfaceResults.some((surface) => surface.appLevelResult === "fail")
    ? "fail"
    : surfaceResults.some((surface) => surface.appLevelResult === "partial")
      ? "partial"
      : "pass";
  return {
    appLevelResult,
    classic,
    comparison,
    comparisonNotes,
    firstDivergence,
    esm,
    strictFailures,
  };
}

function emitReport(finalReport) {
  console.log("# Runtime Parity Harness");
  console.log(`mode: ${finalReport.strictMode ? "strict" : "diagnostic"}`);
  console.log(`root: ${finalReport.rootDir}`);
  console.log(`viewport: ${finalReport.viewport.width}x${finalReport.viewport.height} @${finalReport.viewport.deviceScaleFactor}`);
  console.log(`app result: ${finalReport.appLevelResult}`);
  console.log("REPORT_JSON " + JSON.stringify(finalReport, null, 2));
}

async function waitForFrameBudget(page, result, frameCount, stepMs) {
  const startCount = result.snapshot?.diagnostics?.raf?.count || 0;
  const target = startCount + Math.max(0, frameCount);
  if (target <= startCount) return;
  const timeoutMs = Math.max(2500, frameCount * stepMs * 8);
  await page.waitForFunction(
    (expected) => {
      const root = globalThis;
      return (root.__TapSurvivorParity?.raf?.count || 0) >= expected;
    },
    target,
    { polling: 16, timeout: timeoutMs }
  ).catch(() => {});
}

async function waitForPlayerState(page) {
  await page
    .waitForFunction(
      () => {
        const root = globalThis;
        const parity = root.__TapSurvivorParity || {};
        const game = parity.classicGame || parity.game || parity.esmApi?.dependencies?.getGame?.() || null;
        const player = game?.player || null;
        return Number.isFinite(player?.hp) && Number.isFinite(player?.maxHp) && Number.isFinite(player?.x) && Number.isFinite(player?.y);
      },
      null,
      { polling: 16, timeout: 10000 }
    )
    .catch(() => {});
}

async function waitForRuntimeReady(page) {
    await page
      .waitForFunction(
      () => {
        const body = document?.body;
        return body?.dataset?.gameSpeed === "1";
      },
      null,
      { polling: 16, timeout: 10000 }
    )
    .catch(() => {});
}

async function waitForEnemyEvidence(page, timeoutMs = 5000) {
  await page
    .waitForFunction(
      () => {
        const root = globalThis;
        const parity = root.__TapSurvivorParity || {};
        const game = parity.classicGame || parity.game || parity.esmApi?.dependencies?.getGame?.() || null;
        return Array.isArray(game?.enemies) && game.enemies.length > 0;
      },
      null,
      { polling: 16, timeout: timeoutMs }
    )
    .catch(() => {});
}

async function waitForProjectileEvidence(page, timeoutMs = 3000) {
  await page
    .waitForFunction(
      () => {
        const root = globalThis;
        const parity = root.__TapSurvivorParity || {};
        const game = parity.classicGame || parity.game || parity.esmApi?.dependencies?.getGame?.() || null;
        if (!game) return false;
        const candidates = [
          game.projectiles,
          game.bolts,
          game.enemyBolts,
          game.weaponBolts,
          game.enemyProjectiles,
          game.weaponProjectiles,
        ];
        return candidates.some((collection) => Array.isArray(collection) && collection.length > 0);
      },
      null,
      { polling: 16, timeout: timeoutMs }
    )
    .catch(() => {});
}

async function collectMenuEvidence(page) {
  const result = {
    openMenuClicked: false,
    openMenuFound: false,
    runMenuVisible: null,
    tabs: {},
  };

  result.openMenuFound = (await page.locator("#openMenu").count().catch(() => 0)) > 0;
  if (!result.openMenuFound) return result;

  result.openMenuClicked = await openMenuIfNeeded(page);
  result.runMenuVisible = await isRunMenuVisible(page);
  await page.waitForTimeout(100);

  for (const tab of ["progress", "shop", "inventory"]) {
    const tabResult = await selectMenuTab(page, tab);
    result.tabs[tab] = tabResult;
  }

  return result;
}

async function openMenuIfNeeded(page) {
  if (await isRunMenuVisible(page)) return true;
  const button = page.locator("#openMenu");
  if ((await button.count().catch(() => 0)) === 0) return false;
  await button.click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(100);
  return await isRunMenuVisible(page);
}

async function isRunMenuVisible(page) {
  return page.evaluate(() => {
    const runMenu = document.getElementById("runMenu");
    if (!runMenu) return null;
    return !runMenu.classList.contains("hidden");
  }).catch(() => null);
}

async function selectMenuTab(page, tab) {
  const tabId = `menu${capitalize(tab)}Tab`;
  const panelId = `menu${capitalize(tab)}Panel`;
  const selector = `#${tabId}`;
  const tabLocator = page.locator(selector);
  const tabExists = (await tabLocator.count().catch(() => 0)) > 0;
  const tabClicked = tabExists ? await clickMenuTab(tabLocator) : false;
  await page.waitForTimeout(100);
  return page.evaluate(
    ({ panelId, tabId, tabExists, tabClicked, tab }) => {
      const panel = document.getElementById(panelId);
      const button = document.getElementById(tabId);
      const text = normalizeText(panel?.textContent || "");
      const controlCount = panel
        ? panel.querySelectorAll("button,input,select,textarea,a[href],[role='button']").length
        : 0;
      const itemCount = panel
        ? panel.querySelectorAll(".shop-item,.relic-item,.quest-item,.module-shell-panel-item,li,article,details").length
        : 0;
      const visible = Boolean(panel && !panel.hidden && !panel.classList.contains("hidden"));
      const placeholderText = placeholderFor(tab);
      const placeholderOnly = Boolean(
        text &&
          placeholderText.some((entry) => text.includes(entry)) &&
          controlCount === 0 &&
          itemCount === 0
      );
      const blank = !text || ((text.length <= 40 || placeholderOnly) && controlCount === 0 && itemCount === 0);
      return {
        active: Boolean(button?.classList.contains("active")),
        blank,
        controlCount,
        exists: tabExists,
        hidden: Boolean(panel?.hidden || panel?.classList.contains("hidden")),
        itemCount,
        meaningful: !placeholderOnly && (controlCount > 0 || itemCount > 0 || text.length > 40),
        placeholderOnly,
        tab,
        tabClicked,
        text,
        textLength: text.length,
        visible,
      };

      function normalizeText(value) {
        return String(value || "").replace(/\s+/g, " ").trim();
      }

      function placeholderFor(tabName) {
        if (tabName === "shop") return ["Browser shop ready.", "Shop panel"];
        if (tabName === "inventory") return ["Relic inventory"];
        return ["Progress panel"];
      }
    },
    { panelId, tab, tabId, tabClicked, tabExists }
  ).catch(() => ({
    active: false,
    blank: true,
    controlCount: 0,
    exists: tabExists,
    hidden: true,
    itemCount: 0,
    meaningful: false,
    placeholderOnly: false,
    tab,
    tabClicked,
    text: "",
    textLength: 0,
    visible: false,
  }));
}

async function clickMenuTab(tabLocator) {
  try {
    await tabLocator.click({ timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

function capitalize(value) {
  const text = String(value || "");
  return text ? text[0].toUpperCase() + text.slice(1) : "";
}

async function detectUi(page) {
  return {
    fullscreenButton: (await page.locator("#fullscreenButton").count().catch(() => 0)) > 0,
    menuButton: (await page.locator("#openMenu").count().catch(() => 0)) > 0,
    menuInventoryTab: (await page.locator("#menuInventoryTab").count().catch(() => 0)) > 0,
    menuProgressTab: (await page.locator("#menuProgressTab").count().catch(() => 0)) > 0,
    menuShopTab: (await page.locator("#menuShopTab").count().catch(() => 0)) > 0,
    muteAudio: (await page.locator("#muteAudio").count().catch(() => 0)) > 0,
    speedButtons: await page.locator("[data-speed]").evaluateAll((buttons) =>
      buttons.map((button) => ({
        active: button.classList.contains("active"),
        speed: button.getAttribute("data-speed"),
      }))
    ).catch(() => []),
  };
}

async function locateStartButton(page) {
  const selectors = [
    page.locator("#titleStartGame"),
    page.getByRole("button", { name: /^start game$/i }),
    page.getByRole("button", { name: /start game/i }),
    page.getByText(/^start game$/i, { exact: true }),
  ];
  for (const locator of selectors) {
    if ((await locator.count().catch(() => 0)) > 0) return locator.first();
  }
  return null;
}

function buildClassicPage() {
  const hookScript = renderClassicHookScript();
  const scripts = [...classicScripts];
  const gameIndex = scripts.findIndex((src) => /src\/game\.js(\?|$)/.test(src));
  const renderedScripts = scripts
    .flatMap((src, index) => {
      const tags = [];
      if (index === gameIndex) tags.push(hookScript);
      tags.push(`<script src="${src}"></script>`);
      return tags;
    })
    .join("\n    ");
  return shellPage.replace(
    "</body>",
    `\n    <script>${renderParityPrelude("classic")}</script>\n    ${renderedScripts}\n  </body>`
  );
}

function buildEsmPage() {
  const bootScript = renderEsmBootScript();
  return shellPage.replace(
    "</body>",
    `\n    <script>${renderParityPrelude("esm")}</script>\n    <script type="module">\n${bootScript}\n    </script>\n  </body>`
  );
}

function renderClassicHookScript() {
  return `<script>
(() => {
  const parity = globalThis.__TapSurvivorParity = globalThis.__TapSurvivorParity || {};
  parity.classicHooks = parity.classicHooks || {};
  wrapGlobal("TapSurvivorRunState", "createRunStateSystem", (original, args, context) => {
    const result = original.apply(context, args);
    if (result && typeof result.resetGameState === "function") {
      const reset = result.resetGameState.bind(result);
      result.resetGameState = (...resetArgs) => {
        const game = reset(...resetArgs);
        parity.classicGame = game;
        return game;
      };
    }
    return result;
  });
  wrapGlobal("TapSurvivorRunUpdate", "createRunUpdater", (original, args, context) => {
    const updater = original.apply(context, args);
    if (updater && typeof updater.update === "function") {
      const update = updater.update.bind(updater);
      updater.update = (dt) => {
        parity.updateCalls = parity.updateCalls || [];
        parity.updateCalls.push(Number(dt) || 0);
        return update(dt);
      };
    }
    return updater;
  });
  wrapGlobal("TapSurvivorGameRuntime", "createGameRuntimeController", (original, args, context) => {
    const runtime = original.apply(context, args);
    parity.classicRuntime = runtime;
    return runtime;
  });

  function wrapGlobal(globalName, methodName, wrapper) {
    const namespace = globalThis[globalName];
    if (!namespace || typeof namespace[methodName] !== "function") return;
    const original = namespace[methodName];
    if (original.__tapParityWrapped) return;
    const patched = function (...args) {
      return wrapper(original, args, this);
    };
    patched.__tapParityWrapped = true;
    namespace[methodName] = patched;
  }
})();
</script>`;
}

function renderParityPrelude(mode) {
  return `
(() => {
  const parity = globalThis.__TapSurvivorParity = globalThis.__TapSurvivorParity || {};
  parity.mode = ${JSON.stringify(mode)};
  parity.consoleErrors = parity.consoleErrors || [];
  parity.pageErrors = parity.pageErrors || [];
  parity.failedRequests = parity.failedRequests || [];
  parity.httpFailures = parity.httpFailures || [];
  parity.requests = parity.requests || [];
  parity.responses = parity.responses || [];
  parity.drawCalls = parity.drawCalls || [];
  parity.spriteRegistrations = parity.spriteRegistrations || [];
  parity.spriteLoadRequests = parity.spriteLoadRequests || [];
  parity.spriteLoads = parity.spriteLoads || [];
  parity.raf = parity.raf || { count: 0, dts: [], timestamps: [] };
})();
`;
}

function renderEsmBootScript() {
  return `
import { bootProductionModuleEntrypoint } from "/src/app/production-module-entrypoint.js";

globalThis.__TapSurvivorParity = globalThis.__TapSurvivorParity || {};
globalThis.__TapSurvivorParity.esmApi = bootProductionModuleEntrypoint({
  autoInitialize: true,
  globalRef: globalThis,
});
`;
}

function injectBase(html) {
  return html.replace("<head>", '<head><base href="/" />');
}

function stripScripts(html) {
  return html.replace(/\n\s*<script[\s\S]*?<\/script>/g, "");
}

function parseScriptSources(html) {
  return [...html.matchAll(/<script[^>]+src="([^"]+)"[^>]*><\/script>/g)].map((match) => match[1]);
}

function readClassicIndexSource() {
  const historicalCandidates = [
    ["HEAD^:index.html"],
    ["f06d154^:index.html"],
  ];
  for (const [spec] of historicalCandidates) {
    const historical = spawnSync("git", ["show", spec], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (historical.status === 0 && historical.stdout) return historical.stdout;
  }
  const current = readFileSync(join(repoRoot, "index.html"), "utf8");
  return current;
}

function resolveClassicScripts(classicIndexSource) {
  const parsed = parseScriptSources(classicIndexSource);
  if (parsed.some((src) => /src\/game\.js(\?|$)/.test(src)) && !parsed.some((src) => /production-module-autoboot\.js/.test(src))) {
    return parsed;
  }
  return [
    "src/content.generated.js?v=auto-7f90557a",
    "src/balance-runtime.js?v=auto-balance-runtime",
    "src/assets.js?v=auto-73843940",
    "src/math.js?v=maintenance-20260611",
    "src/sprites.js?v=auto-92dd6d0b",
    "src/audio.js?v=auto-bbfd1bc6",
    "src/quests.js?v=maintenance-20260611",
    "src/storage-adapter.js?v=auto-save-storage",
    "src/save-defaults.js?v=auto-save-helpers",
    "src/save-migrations.js?v=auto-save-helpers",
    "src/save-normalize.js?v=auto-save-helpers",
    "src/save-corruption.js?v=auto-save-helpers",
    "src/save.js?v=auto-f7bb016d",
    "src/effects.js?v=auto-fe2763a1",
    "src/upgrades.js?v=auto-88b55a84",
    "src/content-registry.js?v=auto-e9ef327f",
    "src/map-system.js?v=auto-map-system",
    "src/progression.js?v=auto-71c4c358",
    "src/sprite-sheet-renderer.js?v=auto-spritesheets",
    "src/render-skill-rail.js?v=auto-render-helpers",
    "src/render-hud.js?v=auto-59cf5b58",
    "src/render-enemies.js?v=auto-render-helpers",
    "src/rendering.js?v=auto-03e052a7",
    "src/balance.js?v=maintenance-20260612",
    "src/weapon-projectiles.js?v=auto-weapon-helpers",
    "src/weapon-targeting.js?v=auto-weapon-helpers",
    "src/weapon-cooldowns.js?v=auto-weapon-helpers",
    "src/weapon-behaviors.js?v=auto-weapon-helpers",
    "src/weapon-fire.js?v=auto-b96ca3db",
    "src/enemy-behaviors.js?v=auto-enemy-helpers",
    "src/enemy-spawning.js?v=auto-enemy-helpers",
    "src/enemies.js?v=auto-44e405a4",
    "src/combat-damage.js?v=auto-combat-helpers",
    "src/combat.js?v=auto-fb2beec8",
    "src/ui-progression.js?v=auto-ui-helpers",
    "src/ui.js?v=auto-6e982117",
    "src/run-ui.js?v=auto-ca5121aa",
    "src/level-up-choices.js?v=auto-level-up-helpers",
    "src/level-up.js?v=auto-1f04c9e8",
    "src/input.js?v=maintenance-20260611",
    "src/pickups.js?v=auto-f0c71b70",
    "src/shop-pricing.js?v=auto-shop-helpers",
    "src/shop.js?v=auto-1c3b8c96",
    "src/relics.js?v=auto-815236c5",
    "src/run-state.js?v=auto-b88ef356",
    "src/run-update.js?v=auto-4b0f4f98",
    "src/debug.js?v=maintenance-20260611",
    "src/shell-relic-ui.js?v=auto-shell-helpers",
    "src/shell-ui.js?v=auto-b114267e",
    "src/game-banners.js?v=auto-game-helpers",
    "src/run-lifecycle.js?v=auto-game-helpers",
    "src/game-runtime.js?v=auto-game-helpers",
    "src/game-dependencies.js?v=auto-game-dependencies",
    "src/game.js?v=auto-3c6b5b28",
  ];
}

function classifyDraws(drawCalls, spriteGroups = {}) {
  const spriteIndex = buildSpriteIndex(spriteGroups);
  const classified = drawCalls.map((entry, sequence) => {
    const id = inferSpriteId(entry.imageSrc, spriteIndex);
    const kind = inferSpriteKind(id);
    const visibleCoverage =
      entry.dest?.width > 0 && entry.dest?.height > 0 && entry.visibleRect
        ? (entry.visibleRect.width * entry.visibleRect.height) / (entry.dest.width * entry.dest.height)
        : 0;
    return {
      ...entry,
      id,
      kind,
      sequence,
      visibleCoverage,
      visibleSpriteProof:
        kind === "player" && entry.intersectsCanvas && visibleCoverage >= 0.9 && (entry.pixelDelta || 0) > 0 && entry.globalAlpha > 0,
    };
  });
  const latestBackgroundSequence = Math.max(
    -1,
    ...classified.filter((entry) => entry.kind === "background" && entry.intersectsCanvas).map((entry) => entry.sequence)
  );
  const playerCanvasVisible = classified.some(
    (entry) => entry.kind === "player" && entry.visibleSpriteProof && entry.sequence > latestBackgroundSequence
  );
  return { drawCalls: classified, playerCanvasVisible };
}

function buildSpriteIndex(spriteGroups = {}) {
  const entries = [];
  const addEntry = (id, value) => {
    const src = spriteSource(value);
    if (id && src) entries.push({ id, src: normalizeImageSource(src) });
  };
  Object.entries(spriteGroups.backgrounds || {}).forEach(([id, value]) => addEntry(`background:${id}`, value));
  Object.entries(spriteGroups.enemies || {}).forEach(([id, value]) => addEntry(`enemy:${id}`, value));
  Object.entries(spriteGroups.playerAnimations || {}).forEach(([id, value]) => addEntry(`player:${id}`, value));
  Object.entries(spriteGroups.runUpgradeIcons || {}).forEach(([id, value]) => addEntry(`runUpgradeIcon:${id}`, value));
  Object.entries(spriteGroups.runUpgrades || {}).forEach(([id, value]) => addEntry(`runUpgrade:${id}`, value));
  Object.entries(spriteGroups.ui || {}).forEach(([id, value]) => addEntry(`ui:${id}`, value));
  Object.entries(spriteGroups.weapons || {}).forEach(([id, value]) => {
    addEntry(`weapon:${id}`, value);
    if (value && typeof value === "object" && value.iconSrc) {
      addEntry(`weaponIcon:${id}`, value.iconSrc);
    }
  });
  if (spriteGroups.player) addEntry("player", Array.isArray(spriteGroups.player) ? spriteGroups.player[0] : spriteGroups.player);
  return entries;
}

function inferSpriteId(src, spriteIndex) {
  const normalized = normalizeImageSource(src);
  return spriteIndex.find((entry) => entry.src === normalized)?.id || "";
}

function inferSpriteKind(id) {
  if (id === "player" || id.startsWith("player:")) return "player";
  if (id.startsWith("background:")) return "background";
  if (id.startsWith("enemy:")) return "enemy";
  if (id.startsWith("weapon:") || id.startsWith("weaponIcon:") || id.startsWith("runUpgradeIcon:") || id.startsWith("runUpgrade:") || id.startsWith("ui:")) return "weapon";
  return "unknown";
}

function findPlayerDraw(drawCalls) {
  return drawCalls.find((entry) => entry.kind === "player" && entry.visibleSpriteProof) || null;
}

function spriteSource(definition) {
  if (Array.isArray(definition)) return spriteSource(definition[0]);
  if (typeof definition === "string") return definition;
  if (definition && typeof definition === "object") return definition.src || definition.path || definition.iconSrc || "";
  return "";
}

function normalizeImageSource(src = "") {
  try {
    const url = new URL(src, "http://127.0.0.1");
    return `${url.pathname}${url.search}`;
  } catch {
    return String(src || "");
  }
}

function contentTypeFor(filePath) {
  return contentTypes[extname(filePath)] || "application/octet-stream";
}

function resolveRequestPath(url, rootDir) {
  const requested = decodeURIComponent(new URL(url, "http://127.0.0.1").pathname);
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  return join(rootDir, safePath === "/" ? "index.html" : safePath);
}

function isLocalUrl(url, origin) {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

function sendHtml(res, html) {
  res.writeHead(200, {
    "cache-control": "no-store",
    "content-type": "text/html; charset=utf-8",
  });
  res.end(html);
}

function parseCli(args) {
  const parsed = {
    dtMs: 16.666,
    frames: 8,
    failOnDiff: false,
    root: "",
    screenshotDir: "",
    viewport: "desktop",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--fail-on-diff") {
      parsed.failOnDiff = true;
      continue;
    }
    if (arg === "--root") {
      parsed.root = args[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg.startsWith("--root=")) {
      parsed.root = arg.slice("--root=".length);
      continue;
    }
    if (arg === "--viewport") {
      parsed.viewport = args[index + 1] || "desktop";
      index += 1;
      continue;
    }
    if (arg.startsWith("--viewport=")) {
      parsed.viewport = arg.slice("--viewport=".length);
      continue;
    }
    if (arg === "--frames") {
      parsed.frames = Number(args[index + 1] || 8);
      index += 1;
      continue;
    }
    if (arg.startsWith("--frames=")) {
      parsed.frames = Number(arg.slice("--frames=".length) || 8);
      continue;
    }
    if (arg === "--dt-ms") {
      parsed.dtMs = Number(args[index + 1] || 16.666);
      index += 1;
      continue;
    }
    if (arg.startsWith("--dt-ms=")) {
      parsed.dtMs = Number(arg.slice("--dt-ms=".length) || 16.666);
      continue;
    }
    if (arg === "--screenshot-dir") {
      parsed.screenshotDir = args[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg.startsWith("--screenshot-dir=")) {
      parsed.screenshotDir = arg.slice("--screenshot-dir=".length);
    }
  }

  if (!Number.isFinite(parsed.frames) || parsed.frames < 1) parsed.frames = 8;
  if (!Number.isFinite(parsed.dtMs) || parsed.dtMs <= 0) parsed.dtMs = 16.666;
  return parsed;
}

function resolveViewport(name) {
  if (name === "desktop") {
    return { deviceScaleFactor: 1, hasTouch: false, height: 720, isMobile: false, width: 1280 };
  }
  if (name === "mobile") {
    return { deviceScaleFactor: 3, hasTouch: true, height: 844, isMobile: true, width: 390 };
  }
  const match = String(name || "").match(/^(\d+)x(\d+)(?:@(\d+(?:\.\d+)?))?$/);
  if (match) {
    return {
      deviceScaleFactor: Number(match[3] || 1),
      hasTouch: false,
      height: Number(match[2]),
      isMobile: false,
      width: Number(match[1]),
    };
  }
  throw new Error(`Unknown viewport preset: ${name}`);
}

function shortMessage(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function describeSize(size) {
  return size ? `${size.width}x${size.height}` : "unknown";
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(Number(x2 || 0) - Number(x1 || 0), Number(y2 || 0) - Number(y1 || 0));
}

function hasWeaponFireEvidence(evidence) {
  if (!evidence) return false;
  return (
    Number(evidence.burstCount || 0) > 0 ||
    Number(evidence.iconFlashCount || 0) > 0 ||
    Boolean(evidence.playerAction?.active)
  );
}

function compareAndListRuntime(result) {
  return {
    ...result,
    browserErrors: {
      consoleErrors: result.consoleErrors,
      failedRequests: result.failedRequests,
      httpFailures: result.httpFailures,
      pageErrors: result.pageErrors,
    },
  };
}

function readJsonSafe(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

const dockerBinary = existsSync("/usr/bin/docker") ? "/usr/bin/docker" : "docker";

if (process.env.PARITY_BROWSER_DOCKER_CHILD !== "1" && spawnSync(dockerBinary, ["version"], { encoding: "utf8", stdio: "ignore" }).status === 0) {
  const image = process.env.PLAYWRIGHT_DOCKER_IMAGE || "mcr.microsoft.com/playwright:v1.61.1-noble";
  const smokeArgs = process.argv.slice(2);
  const result = spawnSync(
    dockerBinary,
    [
      "run",
      "--rm",
      "--init",
      "--shm-size=1g",
      "-e",
      "CI=1",
      "-e",
      "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1",
      "-e",
      "PARITY_BROWSER_DOCKER_CHILD=1",
      "-e",
      `SMOKE_PARITY_BROWSER_STRICT=${process.env.SMOKE_PARITY_BROWSER_STRICT || "0"}`,
      "-v",
      `${repoRoot}:/repo:ro`,
      image,
      "bash",
      "-lc",
      [
        "set -euo pipefail",
        'workdir="$(mktemp -d /tmp/tap-survivor-parity.XXXXXX)"',
        'trap \'rm -rf "$workdir"\' EXIT',
        'mkdir -p "$workdir/repo"',
        'cp -a /repo/. "$workdir/repo"/',
        'cd "$workdir/repo"',
        "npm ci --ignore-scripts --no-audit --no-fund",
        ["node", "scripts/smoke-runtime-parity-browser.mjs", ...smokeArgs.map(shellQuote)].join(" "),
      ].join("; "),
    ],
    {
      encoding: "utf8",
      stdio: "inherit",
    }
  );

  if (result.error) {
    console.error(result.error.stack || result.error.message || String(result.error));
    process.exitCode = 1;
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}
