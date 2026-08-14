import { spawnSync } from "node:child_process";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { chmod, mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";

const repoRoot = process.cwd();
const localRequire = createRequire(import.meta.url);
const cli = parseCli(process.argv.slice(2));
const root = cli.root ? resolve(repoRoot, cli.root) : repoRoot;
const viewport = resolveViewport(cli.viewport);
const strict = cli.failOnDiff || Boolean(globalThis["__TapSurvivorParityFailOnDiff__"]);
const framesToAdvance = cli.frames;
const dtMs = cli.dtMs;
const screenshotDir = cli.screenshotDir ? resolve(repoRoot, cli.screenshotDir) : "";
const syntheticPagePrefix = "/__runtime-parity/";
const classicBaselineRevision = "1a443bffcd92ef10bc89afceaa0463e74c398f2f";
const classicAssetMount = `${syntheticPagePrefix}classic-assets/`;
const syntheticPages = {
  classic: `${syntheticPagePrefix}classic.html`,
  esm: `${syntheticPagePrefix}esm.html`,
};
const runningDockerChild = process.env.PARITY_BROWSER_DOCKER_CHILD === "1";
const browserDiagnosticSampleLimits = Object.freeze({
  consoleErrors: 32,
  failedRequests: 32,
  httpFailures: 32,
  moduleUrls: 32,
  pageErrors: 32,
  requests: 96,
  responses: 96,
  scriptUrls: 64,
});
const pageDiagnosticSampleLimits = Object.freeze({
  audioAttempts: { first: 32, total: 64 },
  audioErrors: { first: 32, total: 32 },
  audioPatchErrors: { first: 32, total: 32 },
  consoleErrors: { first: 32, total: 32 },
  drawCalls: { first: 64, total: 256 },
  failedRequests: { first: 32, total: 32 },
  httpFailures: { first: 32, total: 32 },
  moduleRequests: { first: 32, total: 64 },
  pageErrors: { first: 32, total: 32 },
  rafSamples: { first: 32, total: 64 },
  requestErrors: { first: 32, total: 32 },
  requests: { first: 32, total: 64 },
  responses: { first: 32, total: 64 },
  scriptRequests: { first: 32, total: 64 },
  spriteLoadRequests: { first: 32, total: 64 },
  spriteLoads: { first: 32, total: 64 },
  spriteRegistrations: { first: 32, total: 64 },
  updateCalls: { first: 32, total: 64 },
});
const reportBounds = Object.freeze({
  maxArrayEntries: 256,
  maxDepth: 16,
  maxObjectKeys: 128,
  maxStringLength: 8192,
});

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
  browserExecutable: "",
  browserExecutableSource: "",
  browserDriverSource: "",
  classicAssetMount,
  classicBaseline: {
    cleanupStatus: "pending",
    materialized: false,
    revision: classicBaselineRevision,
  },
  classicBaselineRevision,
  classic: null,
  comparison: null,
  diagnosticMode: !strict,
  esm: null,
  exitCode: null,
  firstDivergence: null,
  medium: runningDockerChild ? "docker" : "host-direct",
  pageUrl: null,
  reportFile: cli.reportFile ? resolve(repoRoot, cli.reportFile) : "",
  rootDir: root,
  surfaces: [],
  surfaceRoots: [],
  strictResult: strict ? "pending" : "not-requested",
  strictMode: strict,
  viewport,
  xdgRuntimeDir: "",
  xdgRuntimeOwned: false,
  xdgRuntimeSource: "",
};

let classicBaselineRoot = "";
let classicScripts = [];
let classicShellPage = "";
let surfaceRoots = [];

async function main() {
  let browser = null;
  let browserProfileDir = "";
  let browserRuntime = null;
  let exitCode = 0;
  try {
    await initializeRuntime();
    const browserDriver = loadBrowserDriver();
    const browserLaunch = await resolveBrowserLaunch(browserDriver.chromium);
    browserRuntime = browserLaunch.runtime;
    report.browserExecutable = browserLaunch.executablePath;
    report.browserExecutableSource = browserLaunch.source;
    report.browserDriverSource = browserDriver.source;
    report.xdgRuntimeDir = browserLaunch.xdgRuntimeDir;
    report.xdgRuntimeOwned = browserLaunch.runtime.owned;
    report.xdgRuntimeSource = browserLaunch.runtime.source;
    browserProfileDir = await createBrowserProfile(browserLaunch.xdgRuntimeDir);
    browser = await browserDriver.chromium.launchPersistentContext(browserProfileDir, browserLaunch.options);

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

    if (strict && comparisonSummary.strictFailures.length > 0) {
      exitCode = 1;
    }
  } catch (error) {
    const infraFailure = error?.stack || error?.message || String(error);
    report.appLevelResult = "fail";
    report.comparison = {
      appLevelResult: "fail",
      comparisonNotes: [],
      strictFailures: [`infra failure: ${shortMessage(infraFailure)}`],
    };
    exitCode = 1;
  } finally {
    await browser?.close().catch(() => {});
    if (browserProfileDir) await rm(browserProfileDir, { force: true, recursive: true }).catch(() => {});
    if (browserRuntime?.owned) await rm(browserRuntime.dir, { force: true, recursive: true }).catch(() => {});
    try {
      await cleanupClassicBaseline();
    } catch (error) {
      const cleanupFailure = shortMessage(error?.stack || error?.message || String(error));
      report.classicBaselineCleanupError = cleanupFailure;
      report.classicBaseline = {
        cleanupStatus: "failed",
        materialized: Boolean(report.classicBaseline?.materialized),
        revision: classicBaselineRevision,
      };
      report.appLevelResult = "fail";
      report.comparison = {
        appLevelResult: "fail",
        comparisonNotes: report.comparison?.comparisonNotes || [],
        strictFailures: [...(report.comparison?.strictFailures || []), `classic baseline cleanup failed: ${cleanupFailure}`],
      };
      report.firstDivergence ||= `classic baseline cleanup failed: ${cleanupFailure}`;
      exitCode = 1;
    }
  }

  report.exitCode = exitCode;
  report.strictResult = strict ? (exitCode === 0 ? "pass" : "fail") : "not-requested";
  try {
    await writeReportFile(report);
  } catch (error) {
    report.exitCode = 1;
    report.reportWriteError = shortMessage(error?.stack || error?.message || String(error));
    report.strictResult = strict ? "fail" : "not-requested";
    console.error(`Unable to write parity report: ${report.reportWriteError}`);
  }
  emitReport(report);
  process.exitCode = report.exitCode;
}

async function initializeRuntime() {
  if (!existsSync(root)) {
    throw new Error(`Required parity root is missing: ${root}`);
  }
  await materializeClassicBaseline();
  const classicIndexSource = readFileSync(join(classicBaselineRoot, "index.html"), "utf8");
  classicScripts = resolveClassicScripts(classicIndexSource);
  for (const script of classicScripts) {
    const scriptPath = resolveRequestPath(script, classicBaselineRoot);
    if (!scriptPath || !existsSync(scriptPath)) {
      throw new Error(`Classic baseline archive is missing scripted asset: ${script}`);
    }
  }
  classicShellPage = injectBase(stripScripts(classicIndexSource), classicAssetMount);
  surfaceRoots = resolveSurfaceRoots(root);
  report.surfaceRoots = surfaceRoots.map((surface) => ({
    exists: surface.exists,
    name: surface.name,
    rootDir: surface.rootDir,
    surfaceUrl: surface.surfaceUrl,
  }));
}

async function materializeClassicBaseline() {
  classicBaselineRoot = await mkdtemp(join(tmpdir(), "tap-survivor-parity-classic-"));
  await chmod(classicBaselineRoot, 0o700);

  const archive = spawnSync("git", ["archive", "--format=tar", classicBaselineRevision], {
    cwd: repoRoot,
    encoding: null,
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (archive.error || archive.status !== 0 || !archive.stdout?.length) {
    throw new Error(`Unable to archive classic baseline ${classicBaselineRevision}: ${spawnFailureMessage(archive)}`);
  }

  const extraction = spawnSync(
    "tar",
    ["-xf", "-", "-C", classicBaselineRoot, "--no-same-owner", "--no-same-permissions"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      input: archive.stdout,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["pipe", "ignore", "pipe"],
    }
  );
  if (extraction.error || extraction.status !== 0) {
    throw new Error(`Unable to extract classic baseline ${classicBaselineRevision}: ${spawnFailureMessage(extraction)}`);
  }
  if (!existsSync(join(classicBaselineRoot, "index.html"))) {
    throw new Error(`Classic baseline archive ${classicBaselineRevision} is missing index.html`);
  }
  report.classicBaseline = {
    cleanupStatus: "pending",
    materialized: true,
    revision: classicBaselineRevision,
  };
}

async function cleanupClassicBaseline() {
  if (!classicBaselineRoot) return;
  const baselineRoot = classicBaselineRoot;
  await rm(baselineRoot, { force: true, recursive: true });
  classicBaselineRoot = "";
  report.classicBaseline = {
    cleanupStatus: "complete",
    materialized: Boolean(report.classicBaseline?.materialized),
    revision: classicBaselineRevision,
  };
}

function spawnFailureMessage(result) {
  return shortMessage(result?.error?.message || result?.stderr?.toString("utf8") || `exit ${result?.status ?? "unknown"}`);
}

async function resolveBrowserLaunch(chromiumLauncher) {
  const executable = resolveBrowserExecutable(chromiumLauncher);
  const runtime = isSnapChromium(executable.path) ? await createSnapRuntime() : resolveHostRuntime();
  return {
    executablePath: executable.path,
    options: {
      env: { ...process.env, XDG_RUNTIME_DIR: runtime.dir },
      executablePath: executable.path,
      headless: true,
    },
    runtime,
    source: executable.source,
    xdgRuntimeDir: runtime.dir,
  };
}

function resolveBrowserExecutable(chromiumLauncher) {
  const override = cli.browserExecutable || process.env.PARITY_BROWSER_EXECUTABLE || "";
  if (override) {
    const overridePath = resolve(repoRoot, override);
    if (isExistingExecutable(overridePath)) return { path: overridePath, source: "override" };
    throw new Error(`Configured browser executable does not exist: ${overridePath}`);
  }

  const bundledPath = chromiumLauncher.executablePath();
  if (isExistingExecutable(bundledPath)) return { path: bundledPath, source: "playwright-bundled" };

  const systemPaths = [
    "/snap/bin/chromium",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ];
  const systemPath = systemPaths.find(isExistingExecutable);
  if (systemPath) return { path: systemPath, source: "system" };

  throw new Error("No browser executable found: configure --browser-executable or install Playwright/system Chromium first");
}

function loadBrowserDriver() {
  const moduleOverride = process.env.PARITY_PLAYWRIGHT_MODULE || "";
  const candidates = [
    { load: () => localRequire("playwright"), source: "repo" },
    ...(moduleOverride
      ? [{ load: () => localRequire(resolve(repoRoot, moduleOverride)), source: "caller-override" }]
      : []),
  ];
  let lastError = null;
  for (const candidate of candidates) {
    try {
      const playwright = candidate.load();
      if (!playwright?.chromium) throw new Error("Playwright Chromium launcher is unavailable");
      return { chromium: playwright.chromium, source: candidate.source };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(
    `Playwright module is unavailable without installing packages; set PARITY_PLAYWRIGHT_MODULE to an existing Playwright module path: ${shortMessage(lastError?.message || lastError)}`
  );
}

function isExistingExecutable(filePath) {
  try {
    return Boolean(filePath && existsSync(filePath) && statSync(filePath).isFile());
  } catch {
    return false;
  }
}

function isSnapChromium(executablePath) {
  return resolve(executablePath) === "/snap/bin/chromium";
}

async function createSnapRuntime() {
  const runtimeParent = resolveSnapRuntimeParent();
  const runtimeDir = await mkdtemp(join(runtimeParent.dir, "tap-survivor-parity-runtime-"));
  await chmod(runtimeDir, 0o700);
  return { dir: runtimeDir, owned: true, source: runtimeParent.source };
}

function resolveSnapRuntimeParent() {
  const callerParent = process.env.PARITY_BROWSER_RUNTIME_PARENT || "";
  const runtimeParent = callerParent
    ? resolve(repoRoot, callerParent)
    : join(homedir(), "snap", "chromium", "common");
  const runtimeStat = statSync(runtimeParent);
  if (!runtimeStat.isDirectory()) throw new Error(`Snap browser runtime parent is not a directory: ${runtimeParent}`);
  return { dir: runtimeParent, source: callerParent ? "caller-override" : "snap-common" };
}

function resolveHostRuntime() {
  const runtimeDir = process.env.XDG_RUNTIME_DIR || "";
  if (!runtimeDir) throw new Error("Direct host Chromium requires a caller-supplied XDG_RUNTIME_DIR");
  const runtimeStat = statSync(runtimeDir);
  if (!runtimeStat.isDirectory()) throw new Error(`XDG_RUNTIME_DIR is not a directory: ${runtimeDir}`);
  if ((runtimeStat.mode & 0o777) !== 0o700) {
    throw new Error(`XDG_RUNTIME_DIR must have mode 0700: ${runtimeDir}`);
  }
  return { dir: runtimeDir, owned: false, source: "caller" };
}

async function createBrowserProfile(runtimeDir) {
  const profileDir = await mkdtemp(join(runtimeDir, "tap-survivor-parity-profile-"));
  await chmod(profileDir, 0o700);
  return profileDir;
}

async function writeReportFile(finalReport) {
  if (!cli.reportFile) return;
  const reportPath = resolve(repoRoot, cli.reportFile);
  await mkdir(dirname(reportPath), { recursive: true });
  const temporaryPath = `${reportPath}.tmp-${process.pid}-${Date.now()}`;
  const outputReport = createBoundedReport(finalReport);
  await writeFile(temporaryPath, `${JSON.stringify(outputReport, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, reportPath);
}

function createBoundedReport(value) {
  return boundReportValue(value, new WeakSet(), 0);
}

function boundReportValue(value, ancestors, depth) {
  if (value === null || value === undefined || typeof value === "boolean") return value ?? null;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "string") return boundReportString(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") return `[${typeof value}]`;
  if (depth >= reportBounds.maxDepth) return "[depth-limit]";
  if (typeof value !== "object") return String(value);
  if (ancestors.has(value)) return "[circular]";

  ancestors.add(value);
  let bounded;
  if (Array.isArray(value)) {
    const retained = value.slice(0, reportBounds.maxArrayEntries);
    bounded = retained.map((entry) => boundReportValue(entry, ancestors, depth + 1));
    if (value.length > retained.length) {
      bounded.push({ omittedEntries: value.length - retained.length, truncated: true });
    }
  } else {
    bounded = {};
    const entries = Object.entries(value);
    for (const [key, entry] of entries.slice(0, reportBounds.maxObjectKeys)) {
      bounded[boundReportString(key)] = boundReportValue(entry, ancestors, depth + 1);
    }
    if (entries.length > reportBounds.maxObjectKeys) {
      bounded.__truncatedKeys = entries.length - reportBounds.maxObjectKeys;
    }
  }
  ancestors.delete(value);
  return bounded;
}

function boundReportString(value) {
  const text = String(value ?? "");
  if (text.length <= reportBounds.maxStringLength) return text;
  return `${text.slice(0, reportBounds.maxStringLength)}…[truncated ${text.length - reportBounds.maxStringLength} chars]`;
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

  const classicPage = buildClassicPage();
  const esmPage = buildEsmPage(surface);
  const server = createServer((req, res) => {
    const requestUrl = req.url || "/";
    const requestPath = requestPathFromUrl(requestUrl);
    if (requestPath === syntheticPages.classic) {
      return sendHtml(res, classicPage);
    }
    if (requestPath === syntheticPages.esm) {
      return sendHtml(res, esmPage);
    }
    if (requestPath === "/favicon.ico") {
      return sendSyntheticFavicon(res);
    }

    if (requestPath.startsWith(classicAssetMount)) {
      return sendStaticFile(res, resolveMountedRequestPath(requestUrl, classicAssetMount, classicBaselineRoot));
    }
    return sendStaticFile(res, resolveRequestPath(requestUrl, surface.rootDir));
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
  await page.addInitScript(({ diagnosticLimits: initDiagnosticLimits, mode: initMode }) => {
    const root = globalThis;
    const parity = (root.__TapSurvivorParity = root.__TapSurvivorParity || {});
    const diagnosticLimits = initDiagnosticLimits || {};
    parity.mode = initMode;
    parity.diagnosticCounts = {};
    parity.diagnosticOverflows = {};
    parity.diagnosticSampleOrders = {};
    parity.started = false;
    [
      "consoleErrors",
      "drawCalls",
      "failedRequests",
      "httpFailures",
      "moduleRequests",
      "pageErrors",
      "requestErrors",
      "requests",
      "responses",
      "scriptRequests",
      "spriteLoadRequests",
      "spriteLoads",
      "spriteRegistrations",
      "updateCalls",
    ].forEach((name) => resetDiagnostic(name));
    parity.raf = { count: 0, dts: [], sampleCount: 0, sampleOverflow: 0, timestamps: [] };
    parity.recordDiagnostic = recordDiagnostic;

    function diagnosticLimit(name) {
      const configured = diagnosticLimits[name] || {};
      const total = Math.max(1, Math.floor(Number(configured.total) || 32));
      const first = Math.min(total, Math.max(0, Math.floor(Number(configured.first) || total)));
      return { first, total };
    }

    function resetDiagnostic(name, target) {
      const samples = Array.isArray(target) ? target : [];
      samples.length = 0;
      if (!Array.isArray(target)) parity[name] = samples;
      parity.diagnosticCounts[name] = 0;
      parity.diagnosticOverflows[name] = 0;
      parity.diagnosticSampleOrders[name] = [];
      return samples;
    }

    function recordDiagnostic(name, entry, target) {
      const samples = Array.isArray(target) ? target : Array.isArray(parity[name]) ? parity[name] : resetDiagnostic(name);
      const { first, total } = diagnosticLimit(name);
      const count = Number(parity.diagnosticCounts[name] || 0) + 1;
      const orders = parity.diagnosticSampleOrders[name] || (parity.diagnosticSampleOrders[name] = []);
      parity.diagnosticCounts[name] = count;
      if (samples.length < total) {
        samples.push(entry);
        orders.push(count);
      } else if (first < total) {
        const tailLength = total - first;
        const index = first + ((count - first - 1) % tailLength);
        samples[index] = entry;
        orders[index] = count;
      }
      parity.diagnosticOverflows[name] = Math.max(0, count - samples.length);
      return entry;
    }

    function recordRafSample(timestamp, delta) {
      const raf = parity.raf;
      const { first, total } = diagnosticLimit("rafSamples");
      raf.count += 1;
      raf.sampleCount = raf.count;
      const orders = parity.diagnosticSampleOrders.rafSamples || (parity.diagnosticSampleOrders.rafSamples = []);
      parity.diagnosticCounts.rafSamples = raf.count;
      if (raf.dts.length < total) {
        raf.dts.push(delta);
        raf.timestamps.push(timestamp);
        orders.push(raf.count);
      } else if (first < total) {
        const tailLength = total - first;
        const index = first + ((raf.count - first - 1) % tailLength);
        raf.dts[index] = delta;
        raf.timestamps[index] = timestamp;
        orders[index] = raf.count;
      }
      raf.sampleOverflow = Math.max(0, raf.count - raf.dts.length);
      parity.diagnosticOverflows.rafSamples = raf.sampleOverflow;
    }

    const nativeRAF = root.requestAnimationFrame?.bind(root);
    let lastTimestamp = null;
    if (typeof nativeRAF === "function") {
      root.requestAnimationFrame = (callback) =>
        nativeRAF((timestamp) => {
          recordRafSample(timestamp, lastTimestamp === null ? 0 : timestamp - lastTimestamp);
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
          parity.recordDiagnostic("drawCalls", {
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
      parity.recordDiagnostic("pageErrors", {
        message: event?.error?.message || event?.message || "window error",
      });
    });
    root.addEventListener?.("unhandledrejection", (event) => {
      parity.recordDiagnostic("pageErrors", {
        message: event?.reason?.message || String(event?.reason || "unhandled rejection"),
      });
    });

    const audio = (parity.audio = {
      api: {
        hasAudioContext: Boolean(root.AudioContext || root.webkitAudioContext),
        hasAudioElement: Boolean(root.Audio),
        hasMediaPlay: Boolean(root.HTMLMediaElement?.prototype?.play),
      },
      attempts: [],
      buckets: {},
      errors: [],
      patchErrors: [],
    });
    resetDiagnostic("audioAttempts", audio.attempts);
    resetDiagnostic("audioErrors", audio.errors);
    resetDiagnostic("audioPatchErrors", audio.patchErrors);
    parity.audioScope = null;

    function audioBucket(scope) {
      const key = scope === "start" || scope === "weapon" || scope === "menu" ? scope : "unscoped";
      return (audio.buckets[key] = audio.buckets[key] || {
        attemptCount: 0,
        errorCount: 0,
        firstAttempt: null,
        operations: {},
      });
    }

    function recordAudioAttempt(entry) {
      parity.recordDiagnostic("audioAttempts", entry, audio.attempts);
      const bucket = audioBucket(entry.scope);
      bucket.attemptCount += 1;
      bucket.firstAttempt ||= entry;
      const operation = entry.operation || "unknown";
      bucket.operations[operation] = Number(bucket.operations[operation] || 0) + 1;
    }

    function recordAudioError(entry) {
      parity.recordDiagnostic("audioErrors", entry, audio.errors);
      audioBucket(entry.scope).errorCount += 1;
    }

    const mediaProto = root.HTMLMediaElement?.prototype;
    if (mediaProto && !mediaProto.__tapParityAudioPatched) {
      const originalPlay = mediaProto.play;
      if (typeof originalPlay === "function") {
        mediaProto.play = function patchedMediaPlay(...playArgs) {
          recordAudioAttempt({
            operation: "play",
            scope: parity.audioScope || null,
            source: this?.currentSrc || this?.src || "",
            tagName: this?.tagName || "",
          });
          try {
            const result = originalPlay.apply(this, playArgs);
            result?.catch?.((error) => {
              recordAudioError({
                message: error?.message || String(error || "media play rejected"),
                operation: "play",
                scope: parity.audioScope || null,
              });
            });
            return result;
          } catch (error) {
            recordAudioError({
              message: error?.message || String(error || "media play failed"),
              operation: "play",
              scope: parity.audioScope || null,
            });
            throw error;
          }
        };
      }
      const audioContextProto = (root.AudioContext || root.webkitAudioContext)?.prototype;
      if (audioContextProto && typeof audioContextProto.resume === "function") {
        const originalResume = audioContextProto.resume;
        audioContextProto.resume = function patchedAudioResume(...resumeArgs) {
          recordAudioAttempt({
            operation: "resume",
            scope: parity.audioScope || null,
            state: this?.state || "",
          });
          try {
            const result = originalResume.apply(this, resumeArgs);
            result?.catch?.((error) => {
              recordAudioError({
                message: error?.message || String(error || "audio resume rejected"),
                operation: "resume",
                scope: parity.audioScope || null,
              });
            });
            return result;
          } catch (error) {
            recordAudioError({
              message: error?.message || String(error || "audio resume failed"),
              operation: "resume",
              scope: parity.audioScope || null,
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
  }, { diagnosticLimits: pageDiagnosticSampleLimits, mode });

  page.on("console", (message) => {
    if (message.type() === "error") {
      recordRuntimeDiagnostic(result, "consoleErrors", {
        location: message.location(),
        message: message.text(),
        type: message.type(),
      });
    }
  });
  page.on("pageerror", (error) => {
    recordRuntimeDiagnostic(result, "pageErrors", { message: error.message, stack: error.stack });
  });
  page.on("request", (request) => {
    const entry = { method: request.method(), resourceType: request.resourceType(), url: request.url() };
    recordRuntimeDiagnostic(result, "requests", entry);
    if (entry.resourceType === "script" || entry.resourceType === "document") {
      recordRuntimeDiagnostic(result, "scriptUrls", entry.url);
    }
    if (entry.url.includes("/src/app/production-module-entrypoint.js") || entry.url.includes("/src/app/production-module-autoboot.js")) {
      recordRuntimeDiagnostic(result, "moduleUrls", entry.url);
    }
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure();
    recordRuntimeDiagnostic(result, "failedRequests", {
      errorText: failure?.errorText || "request failed",
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
    });
  });
  page.on("response", (response) => {
    const entry = { status: response.status(), url: response.url() };
    recordRuntimeDiagnostic(result, "responses", entry);
    if (entry.status >= 400) {
      recordRuntimeDiagnostic(result, "httpFailures", entry);
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
      await setAudioScope(page, "start");
      await startButton.click({ timeout: 5000 }).catch((error) => {
        result.startGameClickThrew = true;
        recordRuntimeDiagnostic(result, "pageErrors", { message: `Start Game click failed: ${error.message}`, stack: error.stack });
      });
    }

    await page.waitForTimeout(450);
    await page
      .waitForFunction(
        () => {
          const root = globalThis;
          const parity = root.__TapSurvivorParity || {};
          const game = parity.classicGame || parity.game || parity.esmApi?.dependencies?.getGame?.() || null;
          return Boolean(game?.running && game.awaitingFirstMoveInput);
        },
        null,
        { polling: 16, timeout: 10000 }
      )
      .catch(() => {});
    const canvas = page.locator("#game");
    if ((await canvas.count().catch(() => 0)) > 0) {
      const box = await canvas.boundingBox().catch(() => null);
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2).catch(() => {});
      }
    }

    await setAudioScope(page, "weapon");
    await waitForFrameBudget(page, result, framesToAdvance, dtMs);
    await waitForPlayerState(page);
    await waitForEnemyEvidence(page, result);
    await waitForProjectileEvidence(page, result);

    result.snapshot = await page.evaluate((isClassic) => {
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
      const retiredPublisherNames = [
        "TapSurvivorEffects",
        "TapSurvivorUpgrades",
        "TapSurvivorSave",
        "TapSurvivorShellRelicUi",
        "TapSurvivorWeaponProjectiles",
        "TapSurvivorRunUpdate",
      ];
      const retiredPublisherPresence = Object.fromEntries(
        retiredPublisherNames.map((name) => [name, Object.prototype.hasOwnProperty.call(root, name)])
      );
      const diagnostics = snapshotDiagnostics(parity);
      const spriteSnapshot = snapshotSpriteIndex(content.assets?.sprites || {}, diagnostics.drawCalls);
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
        retiredPublisherPresence,
        registeredSpriteGroupCounts: spriteSnapshot.counts,
        registeredSpriteGroupDefs: spriteSnapshot.definitions,
        registeredSpriteGroupOverflows: spriteSnapshot.overflows,
        registeredSpriteGroups: spriteSnapshot.groups,
        audio: snapshotAudio(parity),
        title: {
          startTransitionHidden: startTransition?.classList.contains("hidden") ?? null,
          titleHidden: titleScreen?.classList.contains("hidden") ?? null,
        },
        diagnostics,
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

      function snapshotDiagnostics(parityState) {
        const raf = parityState.raf || {};
        const rafDts = orderedDiagnosticSamples(parityState, "rafSamples", raf.dts);
        const rafTimestamps = orderedDiagnosticSamples(parityState, "rafSamples", raf.timestamps);
        return {
          drawCallCount: diagnosticCount(parityState, "drawCalls", parityState.drawCalls),
          drawCallOverflow: diagnosticOverflow(parityState, "drawCalls", parityState.drawCalls),
          drawCalls: orderedDiagnosticSamples(parityState, "drawCalls", parityState.drawCalls),
          pageErrorCount: diagnosticCount(parityState, "pageErrors", parityState.pageErrors),
          pageErrorOverflow: diagnosticOverflow(parityState, "pageErrors", parityState.pageErrors),
          pageErrors: orderedDiagnosticSamples(parityState, "pageErrors", parityState.pageErrors),
          raf: {
            count: Number(raf.count || 0),
            dts: rafDts,
            sampleCount: diagnosticCount(parityState, "rafSamples", rafDts),
            sampleOverflow: diagnosticOverflow(parityState, "rafSamples", rafDts),
            timestamps: rafTimestamps,
          },
          requestErrorCount: diagnosticCount(parityState, "requestErrors", parityState.requestErrors),
          requestErrorOverflow: diagnosticOverflow(parityState, "requestErrors", parityState.requestErrors),
          requestErrors: orderedDiagnosticSamples(parityState, "requestErrors", parityState.requestErrors),
          spriteLoadRequestCount: diagnosticCount(parityState, "spriteLoadRequests", parityState.spriteLoadRequests),
          spriteLoadRequestOverflow: diagnosticOverflow(parityState, "spriteLoadRequests", parityState.spriteLoadRequests),
          spriteLoadRequests: orderedDiagnosticSamples(parityState, "spriteLoadRequests", parityState.spriteLoadRequests),
          spriteLoadCount: diagnosticCount(parityState, "spriteLoads", parityState.spriteLoads),
          spriteLoadOverflow: diagnosticOverflow(parityState, "spriteLoads", parityState.spriteLoads),
          spriteLoads: orderedDiagnosticSamples(parityState, "spriteLoads", parityState.spriteLoads),
          spriteRegistrationCount: diagnosticCount(parityState, "spriteRegistrations", parityState.spriteRegistrations),
          spriteRegistrationOverflow: diagnosticOverflow(parityState, "spriteRegistrations", parityState.spriteRegistrations),
          spriteRegistrations: orderedDiagnosticSamples(parityState, "spriteRegistrations", parityState.spriteRegistrations),
        };
      }

      function diagnosticCount(parityState, name, samples) {
        const count = Number(parityState?.diagnosticCounts?.[name]);
        return Number.isFinite(count) ? count : Array.isArray(samples) ? samples.length : 0;
      }

      function diagnosticOverflow(parityState, name, samples) {
        const overflow = Number(parityState?.diagnosticOverflows?.[name]);
        if (Number.isFinite(overflow)) return overflow;
        return Math.max(0, diagnosticCount(parityState, name, samples) - (Array.isArray(samples) ? samples.length : 0));
      }

      function orderedDiagnosticSamples(parityState, name, samples) {
        if (!Array.isArray(samples)) return [];
        const orders = Array.isArray(parityState?.diagnosticSampleOrders?.[name])
          ? parityState.diagnosticSampleOrders[name]
          : [];
        return samples
          .map((entry, index) => ({ entry, index, order: Number(orders[index] || index + 1) }))
          .sort((left, right) => left.order - right.order || left.index - right.index)
          .map(({ entry }) => entry);
      }

      function snapshotAudio(parityState) {
        const audioState = parityState.audio || {};
        const attempts = orderedDiagnosticSamples(parityState, "audioAttempts", audioState.attempts);
        const errors = orderedDiagnosticSamples(parityState, "audioErrors", audioState.errors);
        const attemptCount = diagnosticCount(parityState, "audioAttempts", attempts);
        const errorCount = diagnosticCount(parityState, "audioErrors", errors);
        return {
          adapterPresent: Boolean(parityState.esmApi?.dependencies?.audio?.createAudioSystem),
          api: {
            hasAudioContext: Boolean(audioState.api?.hasAudioContext),
            hasAudioElement: Boolean(audioState.api?.hasAudioElement),
            hasMediaPlay: Boolean(audioState.api?.hasMediaPlay),
          },
          attemptCount,
          attemptOverflow: diagnosticOverflow(parityState, "audioAttempts", attempts),
          attempts,
          errorCount,
          errorOverflow: diagnosticOverflow(parityState, "audioErrors", errors),
          errors,
          observed: Boolean(attemptCount || errorCount),
          startGesture: summarizeAudioBucket(audioState, attempts, "start"),
          weaponFire: summarizeAudioBucket(audioState, attempts, "weapon"),
          menuShop: summarizeAudioBucket(audioState, attempts, "menu"),
          unscoped: summarizeAudioBucket(audioState, attempts, "unscoped"),
        };
      }

      function summarizeAudioBucket(audioState, attempts, scope) {
        const bucket = audioState.buckets?.[scope] || {};
        const fallbackAttempts = attempts.filter((attempt) => (attempt?.scope || "unscoped") === scope);
        return {
          attemptCount: Number(bucket.attemptCount || fallbackAttempts.length),
          errorCount: Number(bucket.errorCount || 0),
          firstAttempt: bucket.firstAttempt || fallbackAttempts[0] || null,
          operations: Object.fromEntries(Object.entries(bucket.operations || {}).slice(0, 16)),
        };
      }

      function snapshotSpriteIndex(spriteGroups, drawCalls) {
        const groupNames = [
          "backgrounds",
          "enemies",
          "playerAnimations",
          "runUpgradeIcons",
          "runUpgrades",
          "ui",
          "weapons",
        ];
        const maxEntriesPerGroup = 64;
        const observedSources = new Set(
          (drawCalls || []).map((entry) => normalizeSpriteSource(entry?.imageSrc || "")).filter(Boolean)
        );
        const definitions = Object.fromEntries(groupNames.map((name) => [name, {}]));
        const counts = {};
        const overflows = {};

        for (const name of groupNames) {
          const entries = Object.entries(spriteGroups?.[name] || {});
          counts[name] = entries.length;
          overflows[name] = 0;
          for (const [id, value] of entries) {
            const definition = compactSpriteDefinition(value);
            if (!spriteDefinitionMatches(definition, observedSources)) continue;
            if (Object.keys(definitions[name]).length >= maxEntriesPerGroup) {
              overflows[name] += 1;
              continue;
            }
            definitions[name][id] = definition;
          }
        }

        counts.player = spriteGroups?.player ? 1 : 0;
        overflows.player = 0;
        const playerDefinition = compactSpriteDefinition(spriteGroups?.player);
        if (spriteDefinitionMatches(playerDefinition, observedSources)) definitions.player = playerDefinition;

        return {
          counts,
          definitions,
          groups: snapshotSpriteGroups(definitions),
          overflows,
        };
      }

      function compactSpriteDefinition(definition) {
        if (Array.isArray(definition)) return compactSpriteDefinition(definition[0]);
        if (typeof definition === "string") return { src: definition };
        if (!definition || typeof definition !== "object") return {};
        const compact = {};
        for (const field of ["src", "path", "iconSrc"]) {
          if (typeof definition[field] === "string" && definition[field]) compact[field] = definition[field];
        }
        return compact;
      }

      function spriteDefinitionMatches(definition, observedSources) {
        if (observedSources.size === 0) return false;
        return [definition?.src, definition?.path, definition?.iconSrc]
          .filter((value) => typeof value === "string" && value)
          .some((value) => observedSources.has(normalizeSpriteSource(value)));
      }

      function normalizeSpriteSource(value) {
        try {
          const url = new URL(String(value || ""), document.baseURI || location.href);
          return `${url.pathname}${url.search}`;
        } catch {
          return String(value || "");
        }
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
    }, mode === "classic");
    await setAudioScope(page, "menu");

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
    result.controlEvidence = await collectControlEvidence(page, mode, result.menuEvidence);
    await setAudioScope(page, null);
    if (result.snapshot) {
      result.snapshot.controls = result.controlEvidence;
      result.snapshot.menu = result.menuEvidence;
    }
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
    const snapshotDiagnostics = result.snapshot?.diagnostics || {};
    appendRuntimeDiagnosticSamples(
      result,
      "pageErrors",
      snapshotDiagnostics.pageErrors,
      snapshotDiagnostics.pageErrorCount
    );
    result.browserErrors = {
      counts: {
        consoleErrors: runtimeDiagnosticCount(result, "consoleErrors"),
        failedRequests: runtimeDiagnosticCount(result, "failedRequests"),
        httpFailures: runtimeDiagnosticCount(result, "httpFailures"),
        pageErrors: runtimeDiagnosticCount(result, "pageErrors"),
      },
      consoleErrors: result.consoleErrors,
      failedRequests: result.failedRequests,
      httpFailures: result.httpFailures,
      overflow: {
        consoleErrors: runtimeDiagnosticOverflow(result, "consoleErrors"),
        failedRequests: runtimeDiagnosticOverflow(result, "failedRequests"),
        httpFailures: runtimeDiagnosticOverflow(result, "httpFailures"),
        pageErrors: runtimeDiagnosticOverflow(result, "pageErrors"),
      },
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
    controlEvidence: null,
    contentLoaded: false,
    diagnosticCounts: createRuntimeDiagnosticMap(),
    diagnosticOverflows: createRuntimeDiagnosticMap(),
    diagnostics: null,
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
    enemyEvidenceObserved: null,
    enemyEvidence: null,
    menuEvidence: null,
    projectileEvidenceObserved: null,
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

function createRuntimeDiagnosticMap() {
  return Object.fromEntries(Object.keys(browserDiagnosticSampleLimits).map((name) => [name, 0]));
}

function recordRuntimeDiagnostic(result, name, entry) {
  appendRuntimeDiagnosticSamples(result, name, [entry], 1);
}

function appendRuntimeDiagnosticSamples(result, name, samples, totalCount) {
  const retained = Array.isArray(result[name]) ? result[name] : (result[name] = []);
  const incoming = Array.isArray(samples) ? samples : [];
  const reportedCount = Number(totalCount);
  const count = Number.isFinite(reportedCount) ? Math.max(incoming.length, Math.floor(reportedCount)) : incoming.length;
  const limit = Number(browserDiagnosticSampleLimits[name] || 32);
  let inserted = 0;
  for (const sample of incoming) {
    if (retained.length >= limit) break;
    retained.push(sample);
    inserted += 1;
  }
  result.diagnosticCounts ||= {};
  result.diagnosticOverflows ||= {};
  result.diagnosticCounts[name] = Number(result.diagnosticCounts[name] || 0) + count;
  result.diagnosticOverflows[name] = Number(result.diagnosticOverflows[name] || 0) + Math.max(0, count - inserted);
}

function runtimeDiagnosticCount(result, name) {
  const count = Number(result?.diagnosticCounts?.[name]);
  return Number.isFinite(count) ? count : Array.isArray(result?.[name]) ? result[name].length : 0;
}

function runtimeDiagnosticOverflow(result, name) {
  const overflow = Number(result?.diagnosticOverflows?.[name]);
  if (Number.isFinite(overflow)) return overflow;
  return Math.max(0, runtimeDiagnosticCount(result, name) - (Array.isArray(result?.[name]) ? result[name].length : 0));
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
  const classicEnemyCount = Number(
    classic.enemyEvidenceObserved?.count ?? classic.enemyEvidence?.count ?? classic.snapshot?.game?.enemies ?? 0
  );
  const esmEnemyCount = Number(esm.enemyEvidenceObserved?.count ?? esm.enemyEvidence?.count ?? esm.snapshot?.game?.enemies ?? 0);
  const classicProjectileCount = Number(
    classic.projectileEvidenceObserved?.count ??
      classic.projectileEvidence?.count ??
      classic.snapshot?.game?.projectileCount ??
      0
  );
  const esmProjectileCount = Number(
    esm.projectileEvidenceObserved?.count ??
      esm.projectileEvidence?.count ??
      esm.snapshot?.game?.projectileCount ??
      0
  );
  const classicMenu = classic.menuEvidence?.tabs || classic.snapshot?.menu?.tabs || {};
  const esmMenu = esm.menuEvidence?.tabs || esm.snapshot?.menu?.tabs || {};
  const classicAudio = classic.audioEvidence || classic.snapshot?.audio || null;
  const esmAudio = esm.audioEvidence || esm.snapshot?.audio || null;
  const classicStartAudio = classicAudio?.startGesture || { attemptCount: 0, errorCount: 0, operations: {} };
  const esmStartAudio = esmAudio?.startGesture || { attemptCount: 0, errorCount: 0, operations: {} };
  const classicWeaponAudio = classicAudio?.weaponFire || { attemptCount: 0, errorCount: 0, operations: {} };
  const esmWeaponAudio = esmAudio?.weaponFire || { attemptCount: 0, errorCount: 0, operations: {} };
  const classicMenuAudio = classicAudio?.menuShop || { attemptCount: 0, errorCount: 0, operations: {} };
  const esmMenuAudio = esmAudio?.menuShop || { attemptCount: 0, errorCount: 0, operations: {} };
  const classicEnemyDraw = classic.enemyDraw || null;
  const esmEnemyDraw = esm.enemyDraw || null;
  const classicFireEvidence = classic.fireEvidence || classic.snapshot?.game?.weaponFireEvidence || null;
  const esmFireEvidence = esm.fireEvidence || esm.snapshot?.game?.weaponFireEvidence || null;
  const classicFireObserved = hasWeaponFireEvidence(classicFireEvidence);
  const esmFireObserved = hasWeaponFireEvidence(esmFireEvidence);
  const classicControls = classic.controlEvidence || classic.snapshot?.controls || null;
  const esmControls = esm.controlEvidence || esm.snapshot?.controls || null;
  const esmRetiredPublisherPresence = esm.snapshot?.retiredPublisherPresence || {};
  const classicConsoleErrorCount = runtimeDiagnosticCount(classic, "consoleErrors");
  const classicPageErrorCount = runtimeDiagnosticCount(classic, "pageErrors");
  const classicFailedRequestCount = runtimeDiagnosticCount(classic, "failedRequests");
  const classicHttpFailureCount = runtimeDiagnosticCount(classic, "httpFailures");
  const esmConsoleErrorCount = runtimeDiagnosticCount(esm, "consoleErrors");
  const esmPageErrorCount = runtimeDiagnosticCount(esm, "pageErrors");
  const esmFailedRequestCount = runtimeDiagnosticCount(esm, "failedRequests");
  const esmHttpFailureCount = runtimeDiagnosticCount(esm, "httpFailures");

  if (!classic.indexLoaded) strictFailures.push("classic runtime page did not load");
  if (!esm.indexLoaded) strictFailures.push("esm runtime page did not load");
  if (classicConsoleErrorCount > 0) {
    strictFailures.push(`classic runtime emitted ${classicConsoleErrorCount} console error(s)`);
  }
  if (classicPageErrorCount > 0) {
    strictFailures.push(`classic runtime emitted ${classicPageErrorCount} page error(s)`);
  }
  if (classicFailedRequestCount > 0) {
    strictFailures.push(`classic runtime recorded ${classicFailedRequestCount} failed request(s)`);
  }
  if (classicHttpFailureCount > 0) {
    strictFailures.push(`classic runtime recorded ${classicHttpFailureCount} HTTP failure(s)`);
  }
  appendRuntimeControlFailures(strictFailures, "classic", classicControls);
  appendRuntimeControlFailures(strictFailures, "esm", esmControls);
  for (const name of [
    "TapSurvivorEffects",
    "TapSurvivorUpgrades",
    "TapSurvivorSave",
    "TapSurvivorShellRelicUi",
    "TapSurvivorWeaponProjectiles",
    "TapSurvivorRunUpdate",
  ]) {
    if (esmRetiredPublisherPresence[name]) {
      strictFailures.push(`ESM runtime retained retired publisher ${name}`);
    }
  }
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
  if (classicStartAudio.attemptCount > 0 && esmStartAudio.attemptCount === 0) {
    strictFailures.push("classic observed Start Game audio but ESM did not");
  } else if (classicStartAudio.attemptCount > 0 && esmStartAudio.errorCount > 0) {
    strictFailures.push("classic observed Start Game audio but ESM reported audio errors");
  }
  if (classicWeaponAudio.attemptCount > 0 || esmWeaponAudio.attemptCount > 0) {
    notes.push(
      `weapon-fire audio diagnostic bucket: classic ${classicWeaponAudio.attemptCount} vs esm ${esmWeaponAudio.attemptCount}`
    );
  }
  if (classicMenuAudio.attemptCount > 0 || esmMenuAudio.attemptCount > 0) {
    notes.push(
      `menu/shop audio diagnostic bucket: classic ${classicMenuAudio.attemptCount} vs esm ${esmMenuAudio.attemptCount}`
    );
  }
  if (
    classicStartAudio.attemptCount === 0 &&
    esmStartAudio.attemptCount === 0 &&
    classicWeaponAudio.attemptCount === 0 &&
    esmWeaponAudio.attemptCount === 0 &&
    classicMenuAudio.attemptCount === 0 &&
    esmMenuAudio.attemptCount === 0
  ) {
    notes.push("audio remained diagnostic-only; no safe start, weapon, or menu audio attempt observed");
  }
  if (classicConsoleErrorCount === 0 && esmConsoleErrorCount > 0) {
    strictFailures.push("classic had no console errors but ESM did");
  }
  if (classicPageErrorCount === 0 && esmPageErrorCount > 0) {
    strictFailures.push("classic had no page errors but ESM did");
  }
  if (classicFailedRequestCount === 0 && esmFailedRequestCount > 0) {
    strictFailures.push("classic had no failed requests but ESM did");
  }
  if (esmHttpFailureCount > 0) {
    strictFailures.push(`esm runtime recorded ${esmHttpFailureCount} HTTP failure(s)`);
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
    classicControls,
    classicPlayer,
    classicSummary: classic.summary,
    esmHasPlayerDraw: esmPlayerVisible,
    esmHasStartControl: esm.startControlFound,
    esmControls,
    esmPlayer,
    esmSummary: esm.summary,
    strictFailures,
  };
}

function appendRuntimeControlFailures(strictFailures, runtime, controls) {
  if (!controls || typeof controls !== "object") {
    strictFailures.push(`${runtime} runtime is missing control evidence`);
    return;
  }

  const mute = controls.mute || {};
  if (!mute.found) strictFailures.push(`${runtime} runtime is missing #muteAudio`);
  if (!mute.clicked) strictFailures.push(`${runtime} runtime did not click #muteAudio`);
  if (!mute.succeeded) strictFailures.push(`${runtime} runtime #muteAudio did not prove a state transition`);

  const runMenu = controls.runMenu || {};
  const menuOpen = runMenu.open || {};
  const menuClose = runMenu.close || {};
  if (!menuOpen.action?.found) strictFailures.push(`${runtime} runtime is missing #openMenu`);
  if (!menuOpen.action?.clicked) strictFailures.push(`${runtime} runtime did not click #openMenu`);
  if (!menuOpen.succeeded) strictFailures.push(`${runtime} runtime #openMenu did not make #runMenu visible`);
  if (!menuClose.action?.found) strictFailures.push(`${runtime} runtime is missing #closeMenu`);
  if (!menuClose.action?.clicked) strictFailures.push(`${runtime} runtime did not click #closeMenu`);
  if (!menuClose.succeeded) {
    strictFailures.push(`${runtime} runtime #closeMenu did not make #runMenu hidden with #openMenu aria-expanded=false`);
  }

  for (const [controlName, control] of Object.entries({
    "#closeShop": controls.shop?.top,
    "#closeShopBottom": controls.shop?.bottom,
  })) {
    if (!control) {
      strictFailures.push(`${runtime} runtime is missing ${controlName} control evidence`);
      continue;
    }
    const setup = control.setup || {};
    const action = control.action || {};
    const final = control.final || {};
    if (!setup.sourceCaptured) strictFailures.push(`${runtime} runtime ${controlName} setup did not capture its source-owned shop system`);
    if (!setup.methodAvailable) strictFailures.push(`${runtime} runtime ${controlName} setup has no callable openShop boundary`);
    if (!setup.called) strictFailures.push(`${runtime} runtime ${controlName} setup did not call openShop`);
    if (!setup.succeeded) strictFailures.push(`${runtime} runtime ${controlName} setup did not make #shopModal visible and pause the game`);
    if (!action.found) strictFailures.push(`${runtime} runtime is missing ${controlName}`);
    if (!action.clicked) strictFailures.push(`${runtime} runtime did not click ${controlName}`);
    if (!final.succeeded) {
      strictFailures.push(`${runtime} runtime ${controlName} did not hide #shopModal and restore an unpaused empty-reason game`);
    }
  }
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
    consoleErrors: runtimeDiagnosticCount(result, "consoleErrors"),
    pageErrors: runtimeDiagnosticCount(result, "pageErrors"),
    failedRequests: runtimeDiagnosticCount(result, "failedRequests"),
    httpFailures: runtimeDiagnosticCount(result, "httpFailures"),
    loadedScriptUrls: result.loadedScriptUrls.filter((url) => isLocalUrl(url, origin)),
    loadedModuleUrls: result.loadedModuleUrls.filter((url) => isLocalUrl(url, origin)),
    player: game?.player || null,
    enemies: game?.enemies || [],
    enemyCount: Number(result.enemyEvidenceObserved?.count ?? result.enemyEvidence?.count ?? game?.enemies?.length ?? 0),
    enemySample: game?.enemySample || null,
    fireEvidence: game?.weaponFireEvidence || null,
    projectileCount: Number(
      result.projectileEvidenceObserved?.count ?? result.projectileEvidence?.count ?? game?.projectileCount ?? 0
    ),
    projectileSample: game?.projectileSample || null,
    projectileSource: result.projectileEvidenceObserved?.source || game?.projectileSource || null,
    menuTabs,
    menuOpen: Boolean(result.menuEvidence?.runMenuVisible ?? snapshot.menu?.runMenuVisible ?? false),
    controls: result.controlEvidence || snapshot.controls || null,
    audioAttempts: Number(audio?.attemptCount || 0),
    audioErrors: Number(audio?.errorCount || 0),
    audioStartAttempts: Number(audio?.startGesture?.attemptCount || 0),
    audioWeaponAttempts: Number(audio?.weaponFire?.attemptCount || 0),
    audioMenuAttempts: Number(audio?.menuShop?.attemptCount || 0),
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
  const outputReport = createBoundedReport(finalReport);
  if (cli.compactOutput) {
    console.log(
      "PARITY_RESULT " +
        JSON.stringify({
          appLevelResult: outputReport.appLevelResult,
          browserExecutable: outputReport.browserExecutable,
          exitCode: outputReport.exitCode,
          firstDivergence: outputReport.firstDivergence,
          medium: outputReport.medium,
          reportFile: outputReport.reportFile,
          strictMode: outputReport.strictMode,
          strictResult: outputReport.strictResult,
          xdgRuntimeDir: outputReport.xdgRuntimeDir,
        })
    );
    return;
  }
  console.log("# Runtime Parity Harness");
  console.log(`mode: ${outputReport.strictMode ? "strict" : "diagnostic"}`);
  console.log(`root: ${outputReport.rootDir}`);
  console.log(`viewport: ${outputReport.viewport.width}x${outputReport.viewport.height} @${outputReport.viewport.deviceScaleFactor}`);
  console.log(`app result: ${outputReport.appLevelResult}`);
  console.log("REPORT_JSON " + JSON.stringify(outputReport, null, 2));
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

async function waitForEnemyEvidence(page, result, timeoutMs = 5000) {
  const handle = await page
    .waitForFunction(
      () => {
        const root = globalThis;
        const parity = root.__TapSurvivorParity || {};
        const game = parity.classicGame || parity.game || parity.esmApi?.dependencies?.getGame?.() || null;
        if (!Array.isArray(game?.enemies) || game.enemies.length === 0) return null;
        const enemy = game.enemies[0] || null;
        return {
          count: game.enemies.length,
          sample: enemy
            ? {
                id: String(enemy.id || enemy.name || enemy.kind || ""),
                kind: String(enemy.kind || enemy.type || ""),
                spriteId: String(enemy.spriteId || enemy.sprite || enemy.spriteName || enemy.assetId || ""),
                type: String(enemy.type || enemy.kind || ""),
                hp: Number.isFinite(enemy.hp) ? enemy.hp : null,
                radius: Number.isFinite(enemy.radius) ? enemy.radius : null,
                x: Number.isFinite(enemy.x) ? enemy.x : null,
                y: Number.isFinite(enemy.y) ? enemy.y : null,
              }
            : null,
        };
      },
      null,
      { polling: 16, timeout: timeoutMs }
    )
    .catch(() => null);
  if (handle) {
    result.enemyEvidenceObserved = await handle.jsonValue().catch(() => null);
  }
}

async function waitForProjectileEvidence(page, result, timeoutMs = 3000) {
  const handle = await page
    .waitForFunction(
      () => {
        const root = globalThis;
        const parity = root.__TapSurvivorParity || {};
        const game = parity.classicGame || parity.game || parity.esmApi?.dependencies?.getGame?.() || null;
        if (!game) return null;
        const candidates = [
          ["projectiles", game.projectiles],
          ["bolts", game.bolts],
          ["enemyBolts", game.enemyBolts],
          ["weaponBolts", game.weaponBolts],
          ["enemyProjectiles", game.enemyProjectiles],
          ["weaponProjectiles", game.weaponProjectiles],
        ].filter((entry) => Array.isArray(entry[1]) && entry[1].length > 0);
        const firstNonEmpty = candidates[0] || null;
        if (!firstNonEmpty) return null;
        const [source, collection] = firstNonEmpty;
        const projectile = collection[0] || null;
        return {
          count: collection.length,
          sample: projectile
            ? {
                id: String(projectile.id || projectile.name || projectile.kind || ""),
                kind: String(projectile.kind || projectile.type || ""),
                radius: Number.isFinite(projectile.radius) ? projectile.radius : null,
                x: Number.isFinite(projectile.x) ? projectile.x : null,
                y: Number.isFinite(projectile.y) ? projectile.y : null,
              }
            : null,
          source,
        };
      },
      null,
      { polling: 16, timeout: timeoutMs }
    )
    .catch(() => null);
  if (handle) {
    result.projectileEvidenceObserved = await handle.jsonValue().catch(() => null);
  }
}

async function collectMenuEvidence(page) {
  const result = {
    openMenuClicked: false,
    openMenuFound: false,
    openTransition: null,
    runMenuVisible: null,
    tabs: {},
  };

  result.openTransition = await openRunMenuControl(page);
  result.openMenuFound = Boolean(result.openTransition.action?.found);
  result.openMenuClicked = Boolean(result.openTransition.action?.clicked);
  result.runMenuVisible = result.openTransition.final?.visible ?? null;
  if (!result.runMenuVisible) return result;
  await page.waitForTimeout(100);

  for (const tab of ["progress", "shop", "inventory"]) {
    const tabResult = await selectMenuTab(page, tab);
    result.tabs[tab] = tabResult;
  }

  return result;
}

async function collectControlEvidence(page, mode, menuEvidence) {
  const runMenuClose = await closeRunMenuControl(page);
  const mute = await collectMuteControlEvidence(page);
  return {
    mute,
    runMenu: {
      close: runMenuClose,
      open: menuEvidence?.openTransition || null,
    },
    shop: {
      top: await exerciseShopCloseControl(page, mode, "#closeShop"),
      bottom: await exerciseShopCloseControl(page, mode, "#closeShopBottom"),
    },
  };
}

async function setAudioScope(page, scope) {
  await page.evaluate(
    (nextScope) => {
      const parity = (window["__TapSurvivorParity"] = window["__TapSurvivorParity"] || {});
      parity.audioScope = nextScope ?? null;
    },
    scope
  ).catch(() => {});
}

async function collectMuteControlEvidence(page) {
  const before = await readMuteControlState(page);
  const button = page.locator("#muteAudio");
  const action = {
    clicked: false,
    error: "",
    found: (await button.count().catch(() => 0)) > 0,
  };
  if (action.found) {
    try {
      await button.click({ timeout: 3000 });
      action.clicked = true;
    } catch (error) {
      action.error = shortMessage(error?.message || String(error));
    }
  }
  await page.waitForTimeout(100);
  const after = await readMuteControlState(page);
  return {
    ...action,
    after,
    before,
    succeeded:
      Boolean(action.found && action.clicked) &&
      before.ariaPressed !== null &&
      after.ariaPressed !== null &&
      before.ariaPressed !== after.ariaPressed,
  };
}

async function readMuteControlState(page) {
  return page
    .evaluate(() => {
      const button = document.getElementById("muteAudio");
      return {
        active: button ? button.classList.contains("active") : null,
        ariaPressed: button?.getAttribute("aria-pressed") ?? null,
        text: button?.textContent?.trim() ?? null,
      };
    })
    .catch(() => ({ active: null, ariaPressed: null, text: null }));
}

async function openRunMenuControl(page) {
  const initial = await readRunMenuState(page);
  const button = page.locator("#openMenu");
  const action = {
    clicked: false,
    error: "",
    found: (await button.count().catch(() => 0)) > 0,
  };
  if (action.found && initial.hidden === true) {
    try {
      await button.click({ timeout: 3000 });
      action.clicked = true;
    } catch (error) {
      action.error = shortMessage(error?.message || String(error));
    }
  }
  await page.waitForTimeout(100);
  const final = await readRunMenuState(page);
  return {
    action,
    final,
    initial,
    succeeded: Boolean(action.found && action.clicked && final.visible && final.ariaExpanded === "true"),
  };
}

async function closeRunMenuControl(page) {
  const initial = await readRunMenuState(page);
  const button = page.locator("#closeMenu");
  const action = {
    clicked: false,
    error: "",
    found: (await button.count().catch(() => 0)) > 0,
  };
  if (action.found && initial.visible === true) {
    try {
      await button.click({ timeout: 3000 });
      action.clicked = true;
    } catch (error) {
      action.error = shortMessage(error?.message || String(error));
    }
  }
  await page.waitForTimeout(100);
  const final = await readRunMenuState(page);
  return {
    action,
    final,
    initial,
    succeeded: Boolean(action.found && action.clicked && final.hidden && final.ariaExpanded === "false"),
  };
}

async function readRunMenuState(page) {
  return page
    .evaluate(() => {
      const runMenu = document.getElementById("runMenu");
      const openMenu = document.getElementById("openMenu");
      const hidden = runMenu ? runMenu.classList.contains("hidden") : null;
      return {
        ariaExpanded: openMenu?.getAttribute("aria-expanded") ?? null,
        hidden,
        runMenuFound: Boolean(runMenu),
        visible: hidden === null ? null : !hidden,
      };
    })
    .catch(() => ({ ariaExpanded: null, hidden: null, runMenuFound: false, visible: null }));
}

async function exerciseShopCloseControl(page, mode, selector) {
  const setup = await openShopFromSourceBoundary(page, mode);
  const action = {
    clicked: false,
    error: "",
    found: false,
    selector,
    skipped: false,
  };
  if (setup.succeeded) {
    const button = page.locator(selector);
    action.found = (await button.count().catch(() => 0)) > 0;
    if (action.found) {
      try {
        await button.click({ timeout: 3000 });
        action.clicked = true;
      } catch (error) {
        action.error = shortMessage(error?.message || String(error));
      }
    }
  } else {
    action.skipped = true;
  }
  await page.waitForTimeout(100);
  const final = await readShopControlState(page);
  final.succeeded = Boolean(
    action.found && action.clicked && final.modalHidden && final.gamePresent && final.paused === false && final.pauseReason === ""
  );
  return {
    action,
    final,
    setup,
    succeeded: Boolean(setup.succeeded && final.succeeded),
  };
}

async function openShopFromSourceBoundary(page, mode) {
  const invocation = await page
    .evaluate((runtimeMode) => {
      const root = globalThis;
      const parity = root.__TapSurvivorParity || {};
      const classicCapture = parity.classicShopSystemCapture || {};
      const shopSystem =
        runtimeMode === "classic"
          ? parity.classicShopSystem
          : parity.esmApi?.dependencies?.shopSystem;
      const result = {
        boundary:
          runtimeMode === "classic"
            ? "TapSurvivorShop.createShopSystem return"
            : "__TapSurvivorParity.esmApi.dependencies.shopSystem",
        callError: "",
        called: false,
        methodAvailable: typeof shopSystem?.openShop === "function",
        sourceCaptured:
          runtimeMode === "classic"
            ? Boolean(classicCapture.captured && classicCapture.factory === "TapSurvivorShop.createShopSystem")
            : Boolean(parity.esmApi?.dependencies?.shopSystem),
      };
      if (!result.methodAvailable) return result;
      try {
        shopSystem.openShop();
        result.called = true;
      } catch (error) {
        result.callError = String(error?.message || error || "openShop failed");
      }
      return result;
    }, mode)
    .catch((error) => ({
      boundary: mode === "classic" ? "TapSurvivorShop.createShopSystem return" : "__TapSurvivorParity.esmApi.dependencies.shopSystem",
      callError: shortMessage(error?.message || String(error)),
      called: false,
      methodAvailable: false,
      sourceCaptured: false,
    }));
  await page.waitForTimeout(100);
  const state = await readShopControlState(page);
  return {
    ...invocation,
    state,
    succeeded: Boolean(
      invocation.sourceCaptured &&
        invocation.methodAvailable &&
        invocation.called &&
        state.modalVisible &&
        state.gamePresent &&
        state.paused === true &&
        state.pauseReason === "shop"
    ),
  };
}

async function readShopControlState(page) {
  return page
    .evaluate(() => {
      const root = globalThis;
      const parity = root.__TapSurvivorParity || {};
      const game = parity.classicGame || parity.game || parity.esmApi?.dependencies?.getGame?.() || null;
      const shopModal = document.getElementById("shopModal");
      const menuShopPanel = document.getElementById("menuShopPanel");
      const modalHidden = shopModal ? shopModal.classList.contains("hidden") : null;
      const menuPanelHidden = menuShopPanel ? menuShopPanel.classList.contains("hidden") : null;
      return {
        gamePresent: Boolean(game),
        menuPanelHidden,
        modalFound: Boolean(shopModal),
        modalHidden,
        modalVisible: modalHidden === null ? null : !modalHidden,
        pauseReason: typeof game?.pauseReason === "string" ? game.pauseReason : null,
        paused: typeof game?.paused === "boolean" ? game.paused : null,
      };
    })
    .catch(() => ({
      gamePresent: false,
      menuPanelHidden: null,
      modalFound: false,
      modalHidden: null,
      modalVisible: null,
      pauseReason: null,
      paused: null,
    }));
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
  return classicShellPage.replace(
    "</body>",
    `\n    <script>${renderParityPrelude("classic")}</script>\n    ${renderedScripts}\n  </body>`
  );
}

function buildEsmPage(surface) {
  const indexPath = join(surface.rootDir, "index.html");
  if (!existsSync(indexPath)) {
    throw new Error(`ESM surface index is missing: ${indexPath}`);
  }
  const shellPage = injectBase(stripScripts(readFileSync(indexPath, "utf8")), "/");
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
  wrapGlobal("TapSurvivorShop", "createShopSystem", (original, args, context) => {
    const shopSystem = original.apply(context, args);
    parity.classicShopSystem = shopSystem;
    parity.classicShopSystemCapture = {
      captured: Boolean(shopSystem),
      factory: "TapSurvivorShop.createShopSystem",
      openShopCallable: typeof shopSystem?.openShop === "function",
    };
    return shopSystem;
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

function injectBase(html, baseHref) {
  return html.replace("<head>", `<head><base href="${baseHref}" />`);
}

function stripScripts(html) {
  return html.replace(/\n\s*<script[\s\S]*?<\/script>/g, "");
}

function parseScriptSources(html) {
  return [...html.matchAll(/<script[^>]+src="([^"]+)"[^>]*><\/script>/g)].map((match) => match[1]);
}

function resolveClassicScripts(classicIndexSource) {
  const parsed = parseScriptSources(classicIndexSource);
  if (!parsed.some((src) => /src\/game\.js(\?|$)/.test(src))) {
    throw new Error(`Classic baseline ${classicBaselineRevision} has no classic game entrypoint`);
  }
  if (parsed.some((src) => /production-module-autoboot\.js/.test(src))) {
    throw new Error(`Classic baseline ${classicBaselineRevision} unexpectedly includes the ESM autoboot entrypoint`);
  }
  return parsed;
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

function requestPathFromUrl(url) {
  try {
    return decodeURIComponent(new URL(url, "http://127.0.0.1").pathname);
  } catch {
    return "";
  }
}

function resolveRequestPath(url, rootDir) {
  const requested = requestPathFromUrl(url);
  if (!requested) return "";
  const resolvedRoot = resolve(rootDir);
  const relativePath = requested === "/" ? "index.html" : requested.replace(/^[/\\]+/, "");
  const fullPath = resolve(resolvedRoot, relativePath);
  return fullPath === resolvedRoot || fullPath.startsWith(`${resolvedRoot}/`) ? fullPath : "";
}

function resolveMountedRequestPath(url, mount, rootDir) {
  const requested = requestPathFromUrl(url);
  if (!requested.startsWith(mount)) return "";
  return resolveRequestPath(`/${requested.slice(mount.length)}`, rootDir);
}

function sendStaticFile(res, fullPath) {
  if (!fullPath || !existsSync(fullPath)) {
    sendNotFound(res);
    return;
  }

  let filePath = fullPath;
  try {
    if (statSync(filePath).isDirectory()) filePath = join(filePath, "index.html");
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      sendNotFound(res);
      return;
    }
  } catch {
    sendNotFound(res);
    return;
  }

  res.writeHead(200, {
    "cache-control": "no-store",
    "content-type": contentTypeFor(filePath),
  });
  const stream = createReadStream(filePath);
  stream.once("error", (error) => res.destroy(error));
  stream.pipe(res);
}

function sendNotFound(res) {
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not found");
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

function sendSyntheticFavicon(res) {
  res.writeHead(200, {
    "cache-control": "no-store",
    "content-type": "image/svg+xml",
  });
  res.end('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
}

function parseCli(args) {
  const parsed = {
    browserExecutable: "",
    compactOutput: false,
    docker: false,
    dtMs: 16.666,
    frames: 8,
    failOnDiff: false,
    reportFile: "",
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
    if (arg === "--browser-executable") {
      parsed.browserExecutable = args[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg.startsWith("--browser-executable=")) {
      parsed.browserExecutable = arg.slice("--browser-executable=".length);
      continue;
    }
    if (arg === "--compact-output") {
      parsed.compactOutput = true;
      continue;
    }
    if (arg === "--docker") {
      parsed.docker = true;
      continue;
    }
    if (arg === "--report-file") {
      parsed.reportFile = args[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg.startsWith("--report-file=")) {
      parsed.reportFile = arg.slice("--report-file=".length);
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

async function failBeforeMain(message) {
  report.appLevelResult = "fail";
  report.comparison = {
    appLevelResult: "fail",
    comparisonNotes: [],
    strictFailures: [message],
  };
  report.exitCode = 1;
  report.strictResult = strict ? "fail" : "not-requested";
  try {
    await writeReportFile(report);
  } catch (error) {
    report.reportWriteError = shortMessage(error?.stack || error?.message || String(error));
    console.error(`Unable to write parity report: ${report.reportWriteError}`);
  }
  emitReport(report);
  process.exitCode = 1;
}

const dockerBinary = existsSync("/usr/bin/docker") ? "/usr/bin/docker" : "docker";

if (cli.docker && !runningDockerChild) {
  const dockerVersion = spawnSync(dockerBinary, ["version"], { encoding: "utf8", stdio: "ignore" });
  if (dockerVersion.status !== 0) {
    void failBeforeMain("Docker parity mode was requested but Docker is unavailable");
  } else {
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
        'runtime_dir="$(mktemp -d /tmp/tap-survivor-parity-runtime.XXXXXX)"',
        'trap \'rm -rf "$workdir" "$runtime_dir"\' EXIT',
        'mkdir -p "$workdir/repo"',
        'cp -a /repo/. "$workdir/repo"/',
        'cd "$workdir/repo"',
        "npm ci --ignore-scripts --no-audit --no-fund",
        'chmod 700 "$runtime_dir"',
        'export XDG_RUNTIME_DIR="$runtime_dir"',
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
} else {
  void main();
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}
