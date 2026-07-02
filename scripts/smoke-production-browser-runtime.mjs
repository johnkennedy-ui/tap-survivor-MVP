import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const strict = process.env.SMOKE_PRODUCTION_BROWSER_STRICT === "1";
const root = process.cwd();
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
  console: { error: [], info: [], log: [], warning: [] },
  diagnosticMode: !strict,
  failedRequests: [],
  httpFailures: [],
  indexLoaded: false,
  menuButtons: {},
  nonStartButtonsDetected: [],
  nonStartButtonsProbed: [],
  nonStartButtonProbeResults: [],
  pageErrors: [],
  productionModuleAutobootLoaded: false,
  spriteDiagnostics: {
    spriteDraws: [],
    spriteLoads: [],
    spriteRegistrations: [],
    spriteLoadRequests: [],
  },
  spriteProof: {
    backgroundDrawSuccess: false,
    enemyDrawSuccess: false,
    nonBackgroundDrawSuccess: false,
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const consoleEvents = [];
  const requestEvents = [];
  const responseEvents = [];
  await page.addInitScript(() => {
    globalThis.__TapSurvivorBrowserDiagnostics = {
      spriteDraws: [],
      spriteLoadRequests: [],
      spriteLoads: [],
      spriteRegistrations: [],
    };
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
    if (url.includes("/src/app/production-module-autoboot.js") && status < 400) {
      report.productionModuleAutobootLoaded = true;
    }
    if (isLocalUrl(url, origin) && status >= 400) {
      report.httpFailures.push(entry);
    }
  });

  let infraFailure = "";
  try {
    const response = await page.goto(url, { waitUntil: "load", timeout: 30000 });
    report.indexLoaded = Boolean(response && response.ok());
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

    await sampleRuntime(page, report, origin);
    await probeButtons(page, report);
    report.spriteDiagnostics = await page.evaluate(() => {
      const diagnostics = globalThis.__TapSurvivorBrowserDiagnostics || {};
      return {
        spriteDraws: diagnostics.spriteDraws || [],
        spriteLoadRequests: diagnostics.spriteLoadRequests || [],
        spriteLoads: diagnostics.spriteLoads || [],
        spriteRegistrations: diagnostics.spriteRegistrations || [],
      };
    });

    const spriteProof = analyzeSpriteDiagnostics(report.spriteDiagnostics);
    report.spriteProof = spriteProof;

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
      !spriteProof.playerDrawSuccess ? "player sprite draw never succeeded" : null,
      report.startGameClickThrew ? "Start Game click threw" : null,
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
      return {
        canvas: canvas instanceof HTMLCanvasElement
          ? {
              height: canvas.height,
              width: canvas.width,
            }
          : null,
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
}

async function probeButtons(page, report) {
  const probed = [];
  const speedTwo = page.locator('button[data-speed="2"]');
  if ((await speedTwo.count().catch(() => 0)) > 0) {
    probed.push("speed:x2");
    await speedTwo.click().catch(() => {});
    await page.waitForTimeout(50);
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
}

function emitReport(report, extras = {}) {
  const summary = {
    appLevelResult: report.appLevelResult,
    canvasFound: report.canvasFound,
    criticalFailures: {
      consoleError: Boolean(extras.criticalConsoleError),
      failedRequest: Boolean(extras.criticalFailedRequest),
      httpFailure: Boolean(extras.criticalHttpFailure),
    },
    diagnosticMode: report.diagnosticMode,
    indexLoaded: report.indexLoaded,
    nonStartButtonsDetected: report.nonStartButtonsDetected,
    nonStartButtonsProbed: report.nonStartButtonsProbed,
    nonStartButtonProbeResults: report.nonStartButtonProbeResults,
    pageErrors: report.pageErrors.length,
    productionModuleAutobootLoaded: report.productionModuleAutobootLoaded,
    spriteProof: report.spriteProof,
    startGameClicked: report.startGameClicked,
    startGameClickThrew: report.startGameClickThrew,
    startGameFound: report.startGameFound,
    strictMode: report.strictMode,
    titleControlDetected: report.titleControlDetected,
    titleVisible: report.titleVisible,
  };

  console.log("# Production Browser Smoke");
  console.log(`mode: ${report.strictMode ? "strict" : "diagnostic"}`);
  console.log(`result: ${report.appLevelResult}`);
  console.log(`index.html loaded: ${report.indexLoaded ? "yes" : "no"}`);
  console.log(`production-module-autoboot.js loaded: ${report.productionModuleAutobootLoaded ? "yes" : "no"}`);
  console.log(`Start Game found: ${report.startGameFound ? "yes" : "no"}`);
  console.log(`Start Game clicked: ${report.startGameClicked ? "yes" : "no"}`);
  console.log(`Start Game click threw: ${report.startGameClickThrew ? "yes" : "no"}`);
  console.log(`canvas found: ${report.canvasFound ? "yes" : "no"}`);
  console.log(`title visible: ${report.titleVisible ? "yes" : "no"}`);
  console.log(`non-start buttons detected: ${report.nonStartButtonsDetected.join(", ") || "none"}`);
  console.log(`non-start buttons probed: ${report.nonStartButtonsProbed.join(", ") || "none"}`);
  console.log(`non-start probe results: ${report.nonStartButtonProbeResults.join(", ") || "none"}`);
  console.log(`console errors: ${report.console.error.length}`);
  console.log(`page errors: ${report.pageErrors.length}`);
  console.log(`failed requests: ${report.failedRequests.length}`);
  console.log(`local HTTP failures: ${report.httpFailures.length}`);
  console.log(`sprite draws: ${report.spriteDiagnostics.spriteDraws.length}`);
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
  return {
    backgroundDrawSuccess,
    enemyDrawSuccess,
    nonBackgroundDrawSuccess,
    playerDrawSuccess,
    spriteLoadRequests,
    spriteLoads,
    spriteRegistrations,
    weaponIconDrawSuccess,
  };
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
