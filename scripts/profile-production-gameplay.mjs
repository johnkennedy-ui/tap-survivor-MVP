import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { createHash } from "node:crypto";

const cli = parseCli(process.argv.slice(2));
const repoRoot = resolve(cli.root || process.cwd());
const reportPath = resolve(cli.report || "tmp/live-profile-report.json");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const sourcePath = new URL(import.meta.url).pathname;
const viewports = [
  { deviceScaleFactor: 1, hasTouch: false, height: 720, isMobile: false, name: "desktop", width: 1280 },
  { deviceScaleFactor: 3, hasTouch: true, height: 844, isMobile: true, name: "mobile", width: 390 },
];
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};
const report = {
  candidateSha: readRevision(repoRoot),
  diagnostics: { console: [], failedRequests: [], httpFailures: [], pageErrors: [] },
  fixtureSha256: sha256(sourcePath),
  fixture: "scripts/profile-production-gameplay.mjs",
  medium: {
    browserProfile: "disposable Playwright persistent context",
    clock: "native browser real time",
    server: "loopback-only",
  },
  outcome: "BLOCKED",
  root: repoRoot,
  runs: [],
  startedAt: new Date().toISOString(),
};

function parseCli(args) {
  const parsed = { report: "", root: "" };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--report") {
      parsed.report = args[index + 1] || "";
      index += 1;
    } else if (value.startsWith("--report=")) {
      parsed.report = value.slice("--report=".length);
    } else if (value === "--root") {
      parsed.root = args[index + 1] || "";
      index += 1;
    } else if (value.startsWith("--root=")) {
      parsed.root = value.slice("--root=".length);
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  if (!parsed.report) throw new Error("--report is required");
  return parsed;
}

function readRevision(root) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function contentTypeFor(filePath) {
  return contentTypes[extname(filePath)] || "application/octet-stream";
}

function resolveRequestPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://127.0.0.1").pathname);
  const relative = normalize(pathname === "/" ? "index.html" : pathname.replace(/^[/\\]+/, ""));
  const filePath = resolve(repoRoot, relative);
  if (filePath !== repoRoot && !filePath.startsWith(`${repoRoot}${sep}`)) return "";
  return existsSync(filePath) && !statSync(filePath).isDirectory() ? filePath : "";
}

function isApplicationUrl(url, origin) {
  try {
    const parsed = new URL(url);
    return parsed.origin === origin && /\.(?:css|html|ico|js|json|mjs|png|svg|webp)$/.test(parsed.pathname);
  } catch {
    return false;
  }
}

function summarize(values) {
  const finite = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!finite.length) return { count: 0, max: null, p50: null, p95: null, p99: null };
  const percentile = (percent) => {
    const position = (finite.length - 1) * percent;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    return finite[lower] + (finite[upper] - finite[lower]) * (position - lower);
  };
  return {
    count: finite.length,
    max: round(finite.at(-1)),
    p50: round(percentile(0.5)),
    p95: round(percentile(0.95)),
    p99: round(percentile(0.99)),
  };
}

function round(value) {
  return Number(Number(value).toFixed(4));
}

function sourcePathFor(url) {
  if (!url) return "<unattributed>";
  try {
    return new URL(url).pathname || "<unattributed>";
  } catch {
    return String(url);
  }
}

function classifySource(pathname) {
  if (pathname.includes("browser-sprite-system")) return "sprite-system";
  if (pathname.includes("render")) return "rendering";
  if (pathname.includes("weapon-projectiles")) return "projectiles";
  if (pathname.includes("weapon-behaviors")) return "weapon-behaviors";
  if (pathname.includes("enemy")) return "enemy-update-or-render";
  if (pathname.includes("pickups")) return "pickups";
  if (pathname.includes("run-update") || pathname.includes("game-lifecycle")) return "game-update";
  if (pathname.startsWith("/src/")) return "other-source";
  return "unattributed-or-browser";
}

function analyseCpuProfile(profile) {
  const nodes = new Map((profile?.nodes || []).map((node) => [node.id, node]));
  const byFunction = new Map();
  const bySource = new Map();
  const byCategory = new Map();
  let totalMs = 0;
  for (let index = 0; index < (profile?.samples || []).length; index += 1) {
    const durationMs = Number(profile.timeDeltas?.[index] || 0) / 1000;
    if (!Number.isFinite(durationMs) || durationMs < 0) continue;
    const frame = nodes.get(profile.samples[index])?.callFrame || {};
    const sourcePath = sourcePathFor(frame.url);
    const functionName = frame.functionName || "<anonymous>";
    const functionKey = `${sourcePath}:${frame.lineNumber || 0}:${functionName}`;
    const category = classifySource(sourcePath);
    totalMs += durationMs;
    byFunction.set(functionKey, (byFunction.get(functionKey) || 0) + durationMs);
    bySource.set(sourcePath, (bySource.get(sourcePath) || 0) + durationMs);
    byCategory.set(category, (byCategory.get(category) || 0) + durationMs);
  }
  const asTop = (entries, transform) => [...entries.entries()]
    .map(([key, ms]) => transform(key, ms))
    .sort((left, right) => right.selfMs - left.selfMs)
    .slice(0, 12);
  return {
    sampledMs: round(totalMs),
    sampleCount: profile?.samples?.length || 0,
    topCategories: asTop(byCategory, (category, ms) => ({ category, selfMs: round(ms) })),
    topFunctions: asTop(byFunction, (key, ms) => {
      const [sourcePath, line, ...name] = key.split(":");
      return { functionName: name.join(":"), line: Number(line), selfMs: round(ms), sourcePath };
    }),
    topSources: asTop(bySource, (sourcePath, ms) => ({
      category: classifySource(sourcePath),
      selfMs: round(ms),
      sourcePath,
    })),
  };
}

function chooseLeader(runs) {
  const sourceVotes = new Map();
  for (const run of runs) {
    const source = run.cpu?.topSources?.find((entry) => entry.sourcePath.startsWith("/src/"));
    if (!source || source.selfMs <= 0) continue;
    const vote = sourceVotes.get(source.sourcePath) || { count: 0, samples: [] };
    vote.count += 1;
    vote.samples.push(source.selfMs);
    sourceVotes.set(source.sourcePath, vote);
  }
  const ranking = [...sourceVotes.entries()]
    .map(([sourcePath, vote]) => ({
      category: classifySource(sourcePath),
      measuredWindows: vote.count,
      medianSelfMs: summarize(vote.samples).p50,
      sourcePath,
    }))
    .sort((left, right) => right.measuredWindows - left.measuredWindows || right.medianSelfMs - left.medianSelfMs);
  const winner = ranking[0] || null;
  const requiredWindows = Math.ceil(runs.length * 0.67);
  return {
    candidates: ranking.slice(0, 8),
    decision: winner && winner.measuredWindows >= requiredWindows ? "PASS" : "REVISE",
    leader: winner && winner.measuredWindows >= requiredWindows ? winner : null,
    requiredWindows,
  };
}

async function createBrowserLaunch() {
  const bundled = chromium.executablePath();
  const executablePath = existsSync(bundled) ? bundled : "/snap/bin/chromium";
  if (!existsSync(executablePath)) throw new Error("No Playwright or system Chromium executable is available.");
  const runtime = resolve(executablePath) === "/snap/bin/chromium"
    ? await createSnapRuntime()
    : resolveHostRuntime();
  return {
    executablePath,
    options: { env: { ...process.env, XDG_RUNTIME_DIR: runtime.dir }, executablePath, headless: true },
    runtime,
  };
}

async function createSnapRuntime() {
  const parent = join(homedir(), "snap", "chromium", "common");
  if (!existsSync(parent)) throw new Error(`Snap runtime parent is unavailable: ${parent}`);
  const dir = await mkdtemp(join(parent, "tap-survivor-live-profile-runtime-"));
  await chmod(dir, 0o700);
  return { dir, owned: true, source: "snap-common" };
}

function resolveHostRuntime() {
  const dir = process.env.XDG_RUNTIME_DIR || "";
  if (!dir || !existsSync(dir)) throw new Error("A 0700 XDG_RUNTIME_DIR is required for host Chromium.");
  if ((statSync(dir).mode & 0o777) !== 0o700) throw new Error(`XDG_RUNTIME_DIR must be mode 0700: ${dir}`);
  return { dir, owned: false, source: "caller" };
}

async function installInstrumentation(page) {
  await page.addInitScript(() => {
    const limit = 512;
    const state = {
      canvas: { arc: 0, drawImage: 0, fill: 0, stroke: 0 },
      raf: [],
      resetAt: performance.now(),
    };
    const retain = (entry) => {
      if (state.raf.length >= limit) state.raf.shift();
      state.raf.push(entry);
    };
    const nativeRaf = globalThis.requestAnimationFrame.bind(globalThis);
    let previousTimestamp = null;
    globalThis.requestAnimationFrame = (callback) => nativeRaf((timestamp) => {
      const startedAt = performance.now();
      try {
        return callback(timestamp);
      } finally {
        retain({
          callbackMs: performance.now() - startedAt,
          deltaMs: previousTimestamp === null ? null : timestamp - previousTimestamp,
        });
        previousTimestamp = timestamp;
      }
    });
    const prototype = globalThis.CanvasRenderingContext2D?.prototype;
    for (const method of ["drawImage", "fill", "stroke", "arc"]) {
      const original = prototype?.[method];
      if (typeof original !== "function") continue;
      prototype[method] = function measuredCanvasMethod(...args) {
        state.canvas[method] += 1;
        return original.apply(this, args);
      };
    }
    document.__TapSurvivorLiveProfile = {
      emptyRafControl: async () => new Promise((resolveControl) => {
        const samples = [];
        const step = () => {
          const startedAt = performance.now();
          samples.push(performance.now() - startedAt);
          if (samples.length >= 24) resolveControl(samples);
          else globalThis.requestAnimationFrame(step);
        };
        globalThis.requestAnimationFrame(step);
      }),
      reset: () => {
        state.canvas = { arc: 0, drawImage: 0, fill: 0, stroke: 0 };
        state.raf = [];
        state.resetAt = performance.now();
      },
      snapshot: () => ({
        canvas: { ...state.canvas },
        gameSurface: {
          canvas: (() => {
            const element = document.getElementById("game");
            return element instanceof HTMLCanvasElement
              ? { height: element.height, width: element.width }
              : null;
          })(),
          startTransitionHidden: document.getElementById("startTransition")?.classList.contains("hidden") ?? null,
          titleHidden: document.getElementById("titleScreen")?.classList.contains("hidden") ?? null,
        },
        raf: [...state.raf],
        sinceResetMs: performance.now() - state.resetAt,
      }),
    };
  });
}

async function locateStartButton(page) {
  const candidates = [
    page.locator("#titleStartGame"),
    page.getByRole("button", { name: /^start game$/i }),
    page.getByRole("button", { name: /start game/i }),
  ];
  for (const locator of candidates) {
    if ((await locator.count().catch(() => 0)) > 0) return locator.first();
  }
  return null;
}

async function startAndMove(page, viewportResult) {
  const startButton = await locateStartButton(page);
  viewportResult.startGameFound = Boolean(startButton);
  if (startButton) {
    await startButton.click({ timeout: 5000 });
    viewportResult.startGameClicked = true;
  }
  const canvas = page.locator("#game");
  viewportResult.canvasFound = (await canvas.count().catch(() => 0)) > 0;
  if (!viewportResult.canvasFound) return;
  const box = await canvas.boundingBox();
  if (!box || box.width < 3 || box.height < 3) throw new Error("Movement input requires a usable #game canvas bounding box.");
  await canvas.click({ position: { x: Math.floor(box.width / 2), y: Math.floor(box.height / 2) }, timeout: 5000 });
  viewportResult.movementInputTriggered = true;
}

function summarizeWindow(snapshot, cpu) {
  const raf = snapshot.raf || [];
  const deltas = raf.map((sample) => sample.deltaMs).filter(Number.isFinite);
  return {
    canvasOperations: snapshot.canvas,
    cpu,
    frameTiming: {
      callbackMs: summarize(raf.map((sample) => sample.callbackMs)),
      deltaMs: summarize(deltas),
      missed16_67ms: deltas.filter((value) => value > 16.67).length,
      missed33_33ms: deltas.filter((value) => value > 33.33).length,
    },
    gameSurface: snapshot.gameSurface,
    observedDurationMs: round(snapshot.sinceResetMs),
  };
}

async function runViewport(browserLaunch, viewport, origin) {
  const profileDir = await mkdtemp(join(browserLaunch.runtime.dir, `tap-survivor-live-profile-${viewport.name}-`));
  await chmod(profileDir, 0o700);
  const result = {
    browserDiagnosticsStart: diagnosticsCount(),
    browserProfileDirMode: "0700 disposable",
    control: null,
    indexLoaded: false,
    movementInputTriggered: false,
    productionModuleAutobootLoaded: false,
    startGameClicked: false,
    startGameFound: false,
    viewport,
    windows: [],
  };
  let context;
  try {
    context = await chromium.launchPersistentContext(profileDir, { ...browserLaunch.options, viewport });
    result.browserVersion = context.browser()?.version() || "unknown";
    const page = context.pages()[0] || await context.newPage();
    await installInstrumentation(page);
    page.on("console", (message) => report.diagnostics.console.push({
      location: message.location(), sequence: nextDiagnosticSequence(), text: message.text(), type: message.type(), viewport: viewport.name,
    }));
    page.on("pageerror", (error) => report.diagnostics.pageErrors.push({
      message: error.message, sequence: nextDiagnosticSequence(), stack: error.stack || "", viewport: viewport.name,
    }));
    page.on("request", (request) => {
      if (request.url().includes("/src/app/production-module-autoboot.js")) result.productionModuleAutobootLoaded = true;
    });
    page.on("requestfailed", (request) => report.diagnostics.failedRequests.push({
      failure: request.failure()?.errorText || "request failed", method: request.method(), resourceType: request.resourceType(), sequence: nextDiagnosticSequence(), url: request.url(), viewport: viewport.name,
    }));
    page.on("response", (response) => {
      if (response.url().includes("/src/app/production-module-autoboot.js") && response.status() < 400) {
        result.productionModuleAutobootLoaded = true;
      }
      if (response.status() >= 400) report.diagnostics.httpFailures.push({
        method: response.request().method(), resourceType: response.request().resourceType(), sequence: nextDiagnosticSequence(), status: response.status(), url: response.url(), viewport: viewport.name,
      });
    });
    const response = await page.goto(`${origin}/index.html`, { timeout: 30000, waitUntil: "load" });
    result.indexLoaded = Boolean(response?.ok());
    result.control = { emptyRafCallbackMs: summarize(await page.evaluate(() => document.__TapSurvivorLiveProfile.emptyRafControl())) };
    await startAndMove(page, result);
    await page.waitForTimeout(1500);
    for (let windowIndex = 0; windowIndex < 3; windowIndex += 1) {
      await page.evaluate(() => document.__TapSurvivorLiveProfile.reset());
      const session = await context.newCDPSession(page);
      await session.send("Profiler.enable");
      await session.send("Profiler.start");
      await page.waitForTimeout(1800);
      const profile = await session.send("Profiler.stop");
      await session.send("Profiler.disable").catch(() => {});
      const snapshot = await page.evaluate(() => document.__TapSurvivorLiveProfile.snapshot());
      result.windows.push({ index: windowIndex + 1, ...summarizeWindow(snapshot, analyseCpuProfile(profile.profile)) });
    }
    result.browserDiagnosticsEnd = diagnosticsCount();
    result.applicationFailures = [
      !result.indexLoaded ? "index.html did not load" : null,
      !result.productionModuleAutobootLoaded ? "production-module-autoboot.js was not observed" : null,
      !result.startGameFound ? "Start Game control was not found" : null,
      !result.startGameClicked ? "Start Game was not clicked" : null,
      !result.canvasFound ? "#game canvas was not found" : null,
      !result.movementInputTriggered ? "movement input was not triggered" : null,
    ].filter(Boolean);
  } catch (error) {
    result.infrastructureError = error?.stack || error?.message || String(error);
  } finally {
    await context?.close().catch(() => {});
    await rm(profileDir, { force: true, recursive: true }).catch(() => {});
  }
  return result;
}

let diagnosticSequence = 0;
function nextDiagnosticSequence() {
  diagnosticSequence += 1;
  return diagnosticSequence;
}

function diagnosticsCount() {
  return Object.values(report.diagnostics).reduce((total, entries) => total + entries.length, 0);
}

async function writeReport() {
  await mkdir(dirname(reportPath), { recursive: true });
  const temporaryPath = `${reportPath}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporaryPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, reportPath);
}

async function main() {
  let server;
  let browserLaunch;
  try {
    if (!existsSync(join(repoRoot, "index.html"))) throw new Error(`Repository root has no index.html: ${repoRoot}`);
    server = createServer((request, response) => {
      const filePath = resolveRequestPath(request.url || "/");
      if (!filePath) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }
      response.writeHead(200, { "cache-control": "no-store", "content-type": contentTypeFor(filePath) });
      createReadStream(filePath).pipe(response);
    });
    await new Promise((resolveServer, rejectServer) => {
      server.once("error", rejectServer);
      server.listen(0, "127.0.0.1", resolveServer);
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    if (!port) throw new Error("Loopback profiler server did not obtain a port.");
    browserLaunch = await createBrowserLaunch();
    report.browser = {
      executable: browserLaunch.executablePath,
      runtimeSource: browserLaunch.runtime.source,
      version: "pending",
    };
    for (const viewport of viewports) report.runs.push(await runViewport(browserLaunch, viewport, `http://127.0.0.1:${port}`));
    const windows = report.runs.flatMap((run) => run.windows);
    const readinessFailures = report.runs.flatMap((run) => [
      ...(run.applicationFailures || []),
      run.infrastructureError ? `infrastructure: ${run.infrastructureError}` : null,
    ]).filter(Boolean);
    const newApplicationDiagnostics = [
      ...report.diagnostics.pageErrors.map((entry) => `page error: ${entry.message}`),
      ...report.diagnostics.console
        .filter((entry) => entry.type === "error" && isApplicationUrl(entry.location?.url || "", `http://127.0.0.1:${port}`))
        .map((entry) => `console error: ${entry.text}`),
      ...report.diagnostics.failedRequests
        .filter((entry) => isApplicationUrl(entry.url, `http://127.0.0.1:${port}`))
        .map((entry) => `failed request: ${entry.url}`),
      ...report.diagnostics.httpFailures
        .filter((entry) => isApplicationUrl(entry.url, `http://127.0.0.1:${port}`))
        .map((entry) => `HTTP ${entry.status}: ${entry.url}`),
    ];
    report.leaderAnalysis = chooseLeader(windows);
    report.observed = {
      applicationDiagnostics: newApplicationDiagnostics,
      readinessFailures,
      measuredWindowCount: windows.length,
    };
    report.outcome = readinessFailures.length || newApplicationDiagnostics.length || !windows.length
      ? "REVISE"
      : report.leaderAnalysis.decision;
    report.browser.version = [...new Set(report.runs.map((run) => run.browserVersion).filter(Boolean))];
    report.inference = report.leaderAnalysis.leader
      ? `Repeatable sampled source candidate: ${report.leaderAnalysis.leader.sourcePath} across ${report.leaderAnalysis.leader.measuredWindows}/${windows.length} measured windows.`
      : "No repeatable source-owned sampled leader was established; do not select a production edit from this profile.";
    report.limitations = [
      "This is a local Chromium profile of the exact source base, not a profile of the user's device/GPU.",
      "The production page does not expose a stable game-state count API to this fixture; canvas/RAF counters are correlation only.",
      "CDP sampled self time does not prove inclusive time or a universal FPS result.",
    ];
  } catch (error) {
    report.outcome = "BLOCKED";
    report.infrastructureError = error?.stack || error?.message || String(error);
  } finally {
    if (browserLaunch?.runtime?.owned) await rm(browserLaunch.runtime.dir, { force: true, recursive: true }).catch(() => {});
    await new Promise((resolveClose) => server?.close(resolveClose) || resolveClose());
    report.finishedAt = new Date().toISOString();
    await writeReport();
  }
  console.log(`live production profile outcome: ${report.outcome}`);
  console.log(`report: ${reportPath}`);
  if (report.outcome === "BLOCKED") process.exitCode = 1;
}

await main();
