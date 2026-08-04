import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { chromium } from "playwright";

const cli = parseCli(process.argv.slice(2));
const strict = cli.strict || process.env.SMOKE_PRODUCTION_BROWSER_STRICT === "1";
const root = cli.root ? resolve(process.cwd(), cli.root) : process.cwd();
const viewport = resolveViewport(cli.viewport);
const screenshotPath = cli.screenshotPath ? resolve(process.cwd(), cli.screenshotPath) : "";
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
  browserImage: process.env.PLAYWRIGHT_DOCKER_IMAGE || "mcr.microsoft.com/playwright:v1.61.1-noble",
  canvasFound: false,
  canvasBackingSize: null,
  canvasCssSize: null,
  console: { error: [], info: [], log: [], warning: [] },
  diagnosticMode: !strict,
  failedRequests: [],
  httpFailures: [],
  indexLoaded: false,
  moduleScriptUrl: null,
  movementInputTriggered: false,
  menuButtons: {},
  nonStartButtonsDetected: [],
  nonStartButtonsProbed: [],
  nonStartButtonProbeResults: [],
  pageUrl: null,
  pageErrors: [],
  productionModuleAutobootLoaded: false,
  retiredPublisherGlobalReadAttempts: {},
  retiredPublisherGlobalReadCount: 0,
  playerSpriteAssetResponseStatus: null,
  playerSpriteAssetUrl: null,
  rootDir: root,
  spriteDiagnostics: {
    canvasDrawCount: 0,
    canvasWitnesses: {
      background: null,
      player: null,
    },
    spriteDraws: [],
    spriteLoads: [],
    spriteRegistrations: [],
    spriteLoadRequests: [],
  },
  spriteProof: {
    backgroundDrawSuccess: false,
    enemyDrawSuccess: false,
    nonBackgroundDrawSuccess: false,
    playerCanvasVisible: false,
    playerDrawSuccess: false,
    weaponIconDrawSuccess: false,
  },
  startGameFound: false,
  startGameClicked: false,
  startGameClickThrew: false,
  strictMode: strict,
  titleControlDetected: false,
  titleVisible: false,
  runtimeSamples: [],
  screenshotPath: screenshotPath || null,
  speedControlProbeResults: [],
  viewport,
};

function contentTypeFor(filePath) {
  return contentTypes[extname(filePath)] || "application/octet-stream";
}

function resolveRequestPath(url) {
  const requested = decodeURIComponent(new URL(url, "http://127.0.0.1").pathname);
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  return join(root, safePath === "/" ? "index.html" : safePath);
}

function isLocalUrl(url, origin) {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

function isCriticalAsset(url, origin) {
  if (!isLocalUrl(url, origin)) return false;
  const path = new URL(url).pathname;
  return /\.(?:css|html|js|json|mjs|png|svg|ico|webp|jpg|jpeg|gif|woff2?|ttf)$/.test(path) || path === "/index.html";
}

function shortMessage(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function parseCli(args) {
  const parsed = {
    root: "",
    screenshotPath: "",
    strict: false,
    viewport: "desktop",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--strict") {
      parsed.strict = true;
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
    if (arg === "--screenshot") {
      const next = args[index + 1];
      if (next && !next.startsWith("--")) {
        parsed.screenshotPath = next;
        index += 1;
      } else {
        parsed.screenshotPath = "tmp/browser-smoke/latest.png";
      }
      continue;
    }
    if (arg.startsWith("--screenshot=")) {
      parsed.screenshotPath = arg.slice("--screenshot=".length) || "tmp/browser-smoke/latest.png";
    }
  }

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

function snapshotFailure(entry) {
  return {
    ...entry,
    message: shortMessage(entry.message),
  };
}

function truncate(items, limit = 5) {
  return items.slice(0, limit);
}

async function main() {
  const server = createServer((req, res) => {
    const fullPath = resolveRequestPath(req.url || "/");
    if (!fullPath.startsWith(root) || !existsSync(fullPath)) {
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

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const origin = `http://127.0.0.1:${port}`;
  const url = `${origin}/index.html`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport });
  const consoleEvents = [];
  const requestEvents = [];
  const responseEvents = [];
  const responseStatusByUrl = new Map();
  await page.addInitScript(() => {
    const retiredPublisherNames = [
      "TapSurvivorCombat",
      "TapSurvivorEnemies",
      "TapSurvivorEnemyBehaviors",
      "TapSurvivorEnemySpawning",
      "TapSurvivorWeaponBehaviors",
      "TapSurvivorWeaponFire",
      "TapSurvivorLevelUp",
    ];
    const retiredPublisherReads = Object.fromEntries(
      retiredPublisherNames.map((name) => [name, 0])
    );
    globalThis.__TapSurvivorRetiredPublisherReads = retiredPublisherReads;
    retiredPublisherNames.forEach((name) => {
      Object.defineProperty(globalThis, name, {
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
    globalThis.__TapSurvivorBrowserDiagnostics = diagnostics;
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
          ? (entry.visibleRect.width * entry.visibleRect.height) / (entry.dest.width * entry.dest.height)
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
  });

  page.on("console", (message) => {
    const entry = {
      location: message.location(),
      message: message.text(),
      type: message.type(),
    };
    consoleEvents.push(entry);
    if (entry.type === "error") {
      report.console.error.push(entry);
    } else if (entry.type === "warning") {
      report.console.warning.push(entry);
    } else if (entry.type === "info") {
      report.console.info.push(entry);
    } else if (entry.type === "log") {
      report.console.log.push(entry);
    }
  });

  page.on("pageerror", (error) => {
    const entry = { message: error.message, stack: error.stack };
    report.pageErrors.push(entry);
  });

  page.on("request", (request) => {
    const url = request.url();
    const entry = { method: request.method(), resourceType: request.resourceType(), url };
    requestEvents.push(entry);
    if (url.includes("/src/app/production-module-autoboot.js")) {
      report.productionModuleAutobootLoaded = true;
      report.moduleScriptUrl = url;
    }
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure();
    const entry = {
      errorText: failure?.errorText || "request failed",
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
    };
    report.failedRequests.push(entry);
  });

  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();
    const entry = { status, url };
    responseEvents.push(entry);
    responseStatusByUrl.set(normalizeImageSource(url), status);
    if (url.includes("/src/app/production-module-autoboot.js") && status < 400) {
      report.productionModuleAutobootLoaded = true;
      report.moduleScriptUrl = url;
    }
    if (isLocalUrl(url, origin) && status >= 400) {
      report.httpFailures.push(entry);
    }
  });

  let infraFailure = "";
  try {
    const response = await page.goto(url, { waitUntil: "load", timeout: 30000 });
    report.indexLoaded = Boolean(response && response.ok());
    report.pageUrl = url;
    await page.waitForTimeout(250);

    report.titleVisible = await page.locator("#titleScreen").isVisible().catch(() => false);
    report.titleControlDetected =
      (await page.locator("#titleStartGame").count().catch(() => 0)) > 0 ||
      (await page.getByRole("button", { name: /start game/i }).count().catch(() => 0)) > 0;
    report.canvasFound = (await page.locator("#game").count().catch(() => 0)) > 0;
    report.nonStartButtonsDetected = await detectNonStartButtons(page);

    const startButton = await locateStartButton(page);
    report.startGameFound = Boolean(startButton);
    if (startButton) {
      try {
        report.startGameClicked = true;
        await startButton.click({ timeout: 5000 });
      } catch (error) {
        report.startGameClickThrew = true;
        report.pageErrors.push({ message: `Start Game click failed: ${error.message}`, stack: error.stack });
      }
    }

    const canvas = page.locator("#game");
    if ((await canvas.count().catch(() => 0)) > 0) {
      try {
        await canvas.click({ position: { x: 240, y: 270 }, timeout: 5000 });
        report.movementInputTriggered = true;
      } catch (error) {
        report.pageErrors.push({ message: `Movement input failed: ${error.message}`, stack: error.stack });
      }
    }

    await sampleRuntime(page, report, origin);
    if (screenshotPath) {
      await mkdir(dirname(screenshotPath), { recursive: true });
      await page.screenshot({ fullPage: true, path: screenshotPath });
      report.screenshotPath = screenshotPath;
    }
    await probeButtons(page, report);
    report.spriteDiagnostics = await page.evaluate(() => {
      const diagnostics = globalThis.__TapSurvivorBrowserDiagnostics || {};
      const canvasWitnesses = diagnostics.canvasWitnesses || {};
      const backgroundWitness = canvasWitnesses.background || null;
      const playerWitness = canvasWitnesses.player || null;
      return {
        canvasDrawCount: Number(diagnostics.canvasDrawCount || 0),
        canvasWitnesses: {
          background: backgroundWitness,
          player: playerWitness,
        },
        playerCanvasVisible: Boolean(
          diagnostics.playerCanvasVisible &&
            playerWitness?.visibleSpriteProof &&
            Number(playerWitness.sequence || 0) > Number(backgroundWitness?.sequence || 0)
        ),
        spriteDraws: diagnostics.spriteDraws || [],
        spriteLoadRequests: diagnostics.spriteLoadRequests || [],
        spriteLoads: diagnostics.spriteLoads || [],
        spriteRegistrations: diagnostics.spriteRegistrations || [],
      };
    });
    report.retiredPublisherGlobalReadAttempts = await page.evaluate(
      () => globalThis.__TapSurvivorRetiredPublisherReads || {}
    );
    report.retiredPublisherGlobalReadCount = Object.values(
      report.retiredPublisherGlobalReadAttempts
    ).reduce((total, reads) => total + Number(reads || 0), 0);

    const spriteProof = analyzeSpriteDiagnostics(report.spriteDiagnostics);
    report.spriteProof = spriteProof;
    const playerSpriteLoad = report.spriteDiagnostics.spriteLoads.find((entry) => entry.id === "player");
    if (playerSpriteLoad?.src) {
      report.playerSpriteAssetUrl = new URL(playerSpriteLoad.src, report.pageUrl || url).href;
      report.playerSpriteAssetResponseStatus = responseStatusByUrl.get(
        normalizeImageSource(report.playerSpriteAssetUrl)
      ) || null;
    }

    const criticalConsoleError = report.console.error.find((entry) =>
      isLocalUrl(entry.location?.url || "", origin) || /src\/|index\.html|Tap Survivor/i.test(entry.message)
    );
    const criticalFailedRequest = report.failedRequests.find((entry) => isCriticalAsset(entry.url, origin));
    const criticalHttpFailure = report.httpFailures.find((entry) => isCriticalAsset(entry.url, origin));

    const findings = {
      criticalConsoleError: Boolean(criticalConsoleError),
      criticalFailedRequest: Boolean(criticalFailedRequest),
      criticalHttpFailure: Boolean(criticalHttpFailure),
      indexLoaded: report.indexLoaded,
      pageErrors: report.pageErrors.length,
      productionModuleAutobootLoaded: report.productionModuleAutobootLoaded,
      startGameClickThrew: report.startGameClickThrew,
      startGameFound: report.startGameFound,
    };

    const appFailures = [
      !report.indexLoaded ? "index.html did not load" : null,
      !report.productionModuleAutobootLoaded ? "production-module-autoboot.js was not requested or loaded" : null,
      report.pageErrors.length ? `page errors captured (${report.pageErrors.length})` : null,
      criticalConsoleError ? "console error from app code" : null,
      criticalFailedRequest ? "failed local module or script request" : null,
      criticalHttpFailure ? "local app HTTP failure for script or asset" : null,
      !spriteProof.backgroundDrawSuccess ? "background floor draw never succeeded" : null,
      !spriteProof.playerDrawSuccess ? "player sprite draw was never attempted successfully" : null,
      !spriteProof.playerCanvasVisible ? "player sprite draw did not produce visible canvas evidence" : null,
      report.startGameClickThrew ? "Start Game click threw" : null,
      !report.movementInputTriggered ? "movement input click did not complete" : null,
      report.retiredPublisherGlobalReadCount > 0
        ? `retired publisher globals were read (${report.retiredPublisherGlobalReadCount})`
        : null,
      !["speed:x1", "speed:x2", "speed:x5"].every((id) =>
        report.speedControlProbeResults.some((result) => result.id === id && result.clicked)
      )
        ? "one or more speed controls x1/x2/x5 did not click"
        : null,
      !report.canvasFound ? "no canvas found" : null,
      !report.startGameFound && !report.titleVisible ? "no title or Start Game control found" : null,
    ].filter(Boolean);

    if (appFailures.length === 0) {
      report.appLevelResult = "pass";
    } else if (report.indexLoaded && report.startGameFound && report.canvasFound && spriteProof.backgroundDrawSuccess) {
      report.appLevelResult = "partial";
    } else {
      report.appLevelResult = "fail";
    }

    emitReport(report, {
      criticalConsoleError,
      criticalFailedRequest,
      criticalHttpFailure,
      findings,
      spriteProof,
      requestCount: requestEvents.length,
      responseCount: responseEvents.length,
      consoleCount: consoleEvents.length,
    });

    if (strict && appFailures.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    infraFailure = error.stack || error.message || String(error);
    report.appLevelResult = "fail";
    emitReport(report, { infraFailure });
    process.exitCode = 1;
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
    await new Promise((resolve) => server.close(resolve));
  }
}

async function locateStartButton(page) {
  const selectors = [
    page.locator("#titleStartGame"),
    page.getByRole("button", { name: /^start game$/i }),
    page.getByRole("button", { name: /start game/i }),
    page.getByText(/^start game$/i, { exact: true }),
  ];
  for (const locator of selectors) {
    if ((await locator.count().catch(() => 0)) > 0) {
      return locator.first();
    }
  }
  return null;
}

async function detectNonStartButtons(page) {
  const probes = [
    { id: "speed:x1", locator: page.locator('button[data-speed="1"]') },
    { id: "speed:x2", locator: page.locator('button[data-speed="2"]') },
    { id: "speed:x5", locator: page.locator('button[data-speed="5"]') },
    { id: "muteAudio", locator: page.locator("#muteAudio") },
    { id: "fullscreenButton", locator: page.locator("#fullscreenButton") },
    { id: "openMenu", locator: page.locator("#openMenu") },
  ];
  const detected = [];
  for (const probe of probes) {
    if ((await probe.locator.count().catch(() => 0)) > 0) {
      detected.push(probe.id);
    }
  }
  return detected;
}

async function sampleRuntime(page, report, origin) {
  const canvasSnapshot = async () =>
    page.evaluate(() => {
      const canvas = document.getElementById("game");
      const titleScreen = document.getElementById("titleScreen");
      const startTransition = document.getElementById("startTransition");
      const openMenu = document.getElementById("openMenu");
      const fullscreenButton = document.getElementById("fullscreenButton");
      const muteAudio = document.getElementById("muteAudio");
      const menuShopTab = document.getElementById("menuShopTab");
      const menuProgressTab = document.getElementById("menuProgressTab");
      const menuInventoryTab = document.getElementById("menuInventoryTab");
      const speedButtons = [...document.querySelectorAll("[data-speed]")].map((button) => ({
        active: button.classList.contains("active"),
        speed: button.dataset.speed,
      }));
      const samplePixels = [];
      if (canvas instanceof HTMLCanvasElement) {
        const context = canvas.getContext("2d");
        if (context) {
          const points = [
            [0, 0],
            [Math.max(0, Math.floor(canvas.width / 2)), Math.max(0, Math.floor(canvas.height / 2))],
            [Math.max(0, canvas.width - 1), Math.max(0, canvas.height - 1)],
          ];
          for (const [x, y] of points) {
            try {
              const pixel = context.getImageData(x, y, 1, 1).data;
              samplePixels.push([pixel[0], pixel[1], pixel[2], pixel[3]]);
            } catch {
              samplePixels.push(null);
            }
          }
        }
      }
      const canvasBackingSize = canvas instanceof HTMLCanvasElement
        ? {
            height: canvas.height,
            width: canvas.width,
          }
        : null;
      const canvasRect = canvas instanceof HTMLCanvasElement ? canvas.getBoundingClientRect() : null;
      const canvasCssSize = canvasRect
        ? {
            height: Math.round(canvasRect.height),
            width: Math.round(canvasRect.width),
          }
        : null;
      return {
        canvas: canvasBackingSize,
        canvasBackingSize,
        canvasCssSize,
        fullscreenButton: Boolean(fullscreenButton),
        menuProgressTab: Boolean(menuProgressTab),
        menuInventoryTab: Boolean(menuInventoryTab),
        menuShopTab: Boolean(menuShopTab),
        muteAudio: Boolean(muteAudio),
        openMenu: Boolean(openMenu),
        samplePixels,
        speedButtons,
        startTransitionHidden: startTransition?.classList.contains("hidden") ?? null,
        titleHidden: titleScreen?.classList.contains("hidden") ?? null,
      };
    });

  report.runtimeSamples.push(await canvasSnapshot());
  await page.waitForTimeout(250);
  report.runtimeSamples.push(await canvasSnapshot());
  await page.waitForTimeout(250);
  report.runtimeSamples.push(await canvasSnapshot());
  report.menuButtons = report.runtimeSamples[report.runtimeSamples.length - 1] || {};
  report.canvasBackingSize = report.menuButtons.canvasBackingSize || null;
  report.canvasCssSize = report.menuButtons.canvasCssSize || null;
}

async function probeButtons(page, report) {
  const probed = [];
  const speedControlProbeResults = [];
  for (const speed of [1, 2, 5]) {
    const id = `speed:x${speed}`;
    const control = page.locator(`button[data-speed="${speed}"]`);
    if ((await control.count().catch(() => 0)) === 0) {
      speedControlProbeResults.push({ clicked: false, id, present: false });
      continue;
    }
    try {
      await control.click({ timeout: 5000 });
      probed.push(id);
      speedControlProbeResults.push({ clicked: true, id, present: true });
      await page.waitForTimeout(50);
    } catch (error) {
      speedControlProbeResults.push({ clicked: false, id, present: true });
      report.pageErrors.push({ message: `${id} click failed: ${error.message}`, stack: error.stack });
    }
  }

  const openMenu = page.locator("#openMenu");
  if ((await openMenu.count().catch(() => 0)) > 0) {
    probed.push("menu:open/close");
    await openMenu.click().catch(() => {});
    await page.waitForTimeout(100);
    const closeMenu = page.locator("#closeMenu");
    if ((await closeMenu.count().catch(() => 0)) > 0) {
      await closeMenu.click().catch(() => {});
      await page.waitForTimeout(50);
    }
  }

  const shopTab = page.locator("#menuShopTab");
  if ((await shopTab.count().catch(() => 0)) > 0) {
    probed.push("shop:tab");
    await openMenu.click().catch(() => {});
    await page.waitForTimeout(100);
    await shopTab.click().catch(() => {});
    await page.waitForTimeout(100);
    const closeShop = page.locator("#closeShop");
    const closeShopBottom = page.locator("#closeShopBottom");
    if ((await closeShop.count().catch(() => 0)) > 0) {
      await closeShop.click().catch(() => {});
    } else if ((await closeShopBottom.count().catch(() => 0)) > 0) {
      await closeShopBottom.click().catch(() => {});
    }
    await page.waitForTimeout(50);
  }

  report.nonStartButtonsProbed = probed;
  report.nonStartButtonProbeResults = probed.map((item) => `${item}:attempted`);
  report.speedControlProbeResults = speedControlProbeResults;
}

function emitReport(report, extras = {}) {
  const summary = {
    appLevelResult: report.appLevelResult,
    canvasFound: report.canvasFound,
    canvasBackingSize: report.canvasBackingSize,
    canvasCssSize: report.canvasCssSize,
    criticalFailures: {
      consoleError: Boolean(extras.criticalConsoleError),
      failedRequest: Boolean(extras.criticalFailedRequest),
      httpFailure: Boolean(extras.criticalHttpFailure),
    },
    diagnosticMode: report.diagnosticMode,
    indexLoaded: report.indexLoaded,
    moduleScriptUrl: report.moduleScriptUrl,
    movementInputTriggered: report.movementInputTriggered,
    nonStartButtonsDetected: report.nonStartButtonsDetected,
    nonStartButtonsProbed: report.nonStartButtonsProbed,
    nonStartButtonProbeResults: report.nonStartButtonProbeResults,
    pageErrors: report.pageErrors.length,
    pageUrl: report.pageUrl,
    productionModuleAutobootLoaded: report.productionModuleAutobootLoaded,
    retiredPublisherGlobalReadAttempts: report.retiredPublisherGlobalReadAttempts,
    retiredPublisherGlobalReadCount: report.retiredPublisherGlobalReadCount,
    playerSpriteAssetResponseStatus: report.playerSpriteAssetResponseStatus,
    playerSpriteAssetUrl: report.playerSpriteAssetUrl,
    rootDir: report.rootDir,
    spriteProof: report.spriteProof,
    startGameClicked: report.startGameClicked,
    startGameClickThrew: report.startGameClickThrew,
    startGameFound: report.startGameFound,
    speedControlProbeResults: report.speedControlProbeResults,
    strictMode: report.strictMode,
    titleControlDetected: report.titleControlDetected,
    titleVisible: report.titleVisible,
    viewport: report.viewport,
  };

  console.log("# Production Browser Smoke");
  console.log(`mode: ${report.strictMode ? "strict" : "diagnostic"}`);
  console.log(`result: ${report.appLevelResult}`);
  console.log(`page url: ${report.pageUrl || "unknown"}`);
  console.log(`served root: ${report.rootDir}`);
  console.log(`viewport: ${report.viewport.width}x${report.viewport.height} @${report.viewport.deviceScaleFactor}`);
  console.log(`index.html loaded: ${report.indexLoaded ? "yes" : "no"}`);
  console.log(`production-module-autoboot.js loaded: ${report.productionModuleAutobootLoaded ? "yes" : "no"}`);
  console.log(`module script url: ${report.moduleScriptUrl || "unknown"}`);
  console.log(`Start Game found: ${report.startGameFound ? "yes" : "no"}`);
  console.log(`Start Game clicked: ${report.startGameClicked ? "yes" : "no"}`);
  console.log(`Start Game click threw: ${report.startGameClickThrew ? "yes" : "no"}`);
  console.log(`movement input clicked: ${report.movementInputTriggered ? "yes" : "no"}`);
  console.log(`canvas found: ${report.canvasFound ? "yes" : "no"}`);
  console.log(`canvas css size: ${report.canvasCssSize ? `${report.canvasCssSize.width}x${report.canvasCssSize.height}` : "unknown"}`);
  console.log(`canvas backing size: ${report.canvasBackingSize ? `${report.canvasBackingSize.width}x${report.canvasBackingSize.height}` : "unknown"}`);
  console.log(`player sprite asset url: ${report.playerSpriteAssetUrl || "unknown"}`);
  console.log(`player sprite asset response: ${report.playerSpriteAssetResponseStatus ?? "unknown"}`);
  console.log(`screenshot: ${report.screenshotPath || "none"}`);
  console.log(`title visible: ${report.titleVisible ? "yes" : "no"}`);
  console.log(`non-start buttons detected: ${report.nonStartButtonsDetected.join(", ") || "none"}`);
  console.log(`non-start buttons probed: ${report.nonStartButtonsProbed.join(", ") || "none"}`);
  console.log(`non-start probe results: ${report.nonStartButtonProbeResults.join(", ") || "none"}`);
  console.log(`speed probe results: ${JSON.stringify(report.speedControlProbeResults)}`);
  console.log(`retired publisher global reads: ${report.retiredPublisherGlobalReadCount}`);
  console.log(`console errors: ${report.console.error.length}`);
  console.log(`page errors: ${report.pageErrors.length}`);
  console.log(`failed requests: ${report.failedRequests.length}`);
  console.log(`local HTTP failures: ${report.httpFailures.length}`);
  console.log(`sprite draws: ${report.spriteDiagnostics.spriteDraws.length}`);
  console.log(`canvas draw count: ${report.spriteDiagnostics.canvasDrawCount}`);
  console.log(`runtime samples: ${report.runtimeSamples.length}`);
  console.log("REPORT_JSON " + JSON.stringify({
    ...summary,
    browserImage: report.browserImage,
    console: {
      error: truncate(report.console.error),
      info: truncate(report.console.info),
      log: truncate(report.console.log),
      warning: truncate(report.console.warning),
    },
    failedRequests: truncate(report.failedRequests),
    httpFailures: truncate(report.httpFailures),
    pageErrors: truncate(report.pageErrors),
    runtimeSamples: report.runtimeSamples,
    spriteDiagnostics: {
      canvasDrawCount: report.spriteDiagnostics.canvasDrawCount,
      canvasWitnesses: report.spriteDiagnostics.canvasWitnesses,
      playerCanvasVisible: report.spriteDiagnostics.playerCanvasVisible,
      spriteDraws: truncate(report.spriteDiagnostics.spriteDraws),
      spriteLoadRequests: truncate(report.spriteDiagnostics.spriteLoadRequests),
      spriteLoads: truncate(report.spriteDiagnostics.spriteLoads),
      spriteRegistrations: truncate(report.spriteDiagnostics.spriteRegistrations),
    },
    ...extras,
  }, null, 2));
}

function analyzeSpriteDiagnostics(diagnostics = {}) {
  const spriteDraws = diagnostics.spriteDraws || [];
  const canvasDrawCount = Number(diagnostics.canvasDrawCount || 0);
  const canvasWitnesses = diagnostics.canvasWitnesses || {};
  const backgroundWitness = canvasWitnesses.background || null;
  const playerWitness = canvasWitnesses.player || null;
  const spriteLoads = diagnostics.spriteLoads || [];
  const spriteRegistrations = diagnostics.spriteRegistrations || [];
  const spriteLoadRequests = diagnostics.spriteLoadRequests || [];
  const backgroundDrawSuccess = spriteDraws.some(
    (entry) => entry.kind === "drawImage" && entry.id === "background:tower_floor" && entry.success
  );
  const playerDrawSuccess = spriteDraws.some(
    (entry) =>
      entry.kind === "drawSprite" &&
      entry.success &&
      (entry.id === "player" || entry.id.startsWith("player:"))
  );
  const enemyDrawSuccess = spriteDraws.some(
    (entry) => entry.kind === "drawSprite" && entry.success && entry.id.startsWith("enemy:")
  );
  const weaponIconDrawSuccess = spriteDraws.some(
    (entry) => entry.kind === "drawSprite" && entry.success && entry.id.startsWith("weaponIcon:")
  );
  const nonBackgroundDrawSuccess = spriteDraws.some(
    (entry) => entry.success && !String(entry.id || "").startsWith("background:")
  );
  const playerCanvasVisible = Boolean(
    diagnostics.playerCanvasVisible &&
      playerWitness?.visibleSpriteProof &&
      Number(playerWitness.sequence || 0) > Number(backgroundWitness?.sequence || 0)
  );
  return {
    backgroundDrawSuccess,
    canvasDrawCount,
    canvasWitnesses: {
      background: backgroundWitness,
      player: playerWitness,
    },
    enemyDrawSuccess,
    nonBackgroundDrawSuccess,
    playerCanvasVisible,
    playerDrawSuccess,
    spriteLoadRequests,
    spriteLoads,
    spriteRegistrations,
    weaponIconDrawSuccess,
  };
}

function normalizeImageSource(src = "") {
  try {
    const url = new URL(src, "http://127.0.0.1");
    return `${url.pathname}${url.search}`;
  } catch {
    return String(src || "");
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
