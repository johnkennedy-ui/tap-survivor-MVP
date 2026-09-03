import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { extname, join, normalize, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { tmpdir } from "node:os";

const execFileAsync = promisify(execFile);
const REPORT_VERSION = 1;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MANUAL_TIMEOUT_MS = 300_000;
const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const cli = parseCli(process.argv.slice(2));
const root = resolve(process.cwd());
const reportPath = resolve(root, cli.reportPath);
const report = createReport();
let server;
let context;
let profilePath = "";
let exitCode = 1;

try {
  await run();
  exitCode = report.decision === "PASS" ? 0 : 1;
} catch (error) {
  report.decision = "REVISE";
  if (report.scenarios.some((scenario) => scenario.status === "REVISE")) {
    report.summary = `Browser scenario failed: ${messageFor(error)}`;
  } else {
    report.summary = `Infrastructure failure: ${messageFor(error)}`;
    report.infrastructureFailure = serializeError(error);
  }
} finally {
  await closeQuietly(context, "browserClose");
  await closeServer(server);
  if (profilePath) {
    await rm(profilePath, { force: true, recursive: true }).catch((error) => {
      report.cleanupFailures.push({ phase: "profileCleanup", message: messageFor(error) });
    });
  }
  report.finishedAt = new Date().toISOString();
  report.candidateClean = await candidateIsClean();
  finalizeReport();
  await writeValidatedReport();
}

process.exitCode = exitCode;

async function run() {
  report.candidateSha = await git("rev-parse", "HEAD");
  report.startedAt = new Date().toISOString();
  server = await startServer(root);
  report.server = { host: "127.0.0.1", port: server.port, origin: server.origin };

  await preflightMimeTypes(server.origin);
  const { chromium } = await loadChromium();
  report.browser.executable = chromium.executablePath();
  profilePath = await mkdtemp(join(tmpdir(), "tap-survivor-debug-qa-"));
  report.browser.profile = { mode: "persistent-disposable", pathCreated: true };
  context = await withTimeout(
    chromium.launchPersistentContext(profilePath, {
      headless: !cli.headed,
      viewport: { height: 900, width: 1440 },
    }),
    cli.launchTimeoutMs,
    "Playwright persistent-context launch"
  );

  const page = context.pages()[0] || (await context.newPage());
  installDiagnostics(page, server.origin);
  await runNonOptInControl(page, server.origin);
  const catalog = await runOptInCatalogAudit(page, server.origin);
  await runInactiveRunCheck(page, catalog);
  await holdForManualInspection(page, server.origin);

  const unexpectedDiagnostics = report.diagnostics.filter(
    (entry) => entry.applicationOrigin && (entry.kind !== "console" || entry.severity === "error")
  );
  if (unexpectedDiagnostics.length) {
    report.decision = "REVISE";
    report.summary = `${unexpectedDiagnostics.length} application-origin browser diagnostic(s) observed`;
    return;
  }
  if (report.scenarios.some((scenario) => scenario.status !== "PASS")) {
    report.decision = "REVISE";
    report.summary = "One or more browser scenarios did not pass";
    return;
  }
  report.decision = "PASS";
  report.summary = `Catalog-driven browser QA passed ${report.coverage.invocations} registered command invocation(s)`;
}

function createReport() {
  return {
    browser: { executable: null, profile: null },
    candidateClean: null,
    candidateSha: null,
    cleanupFailures: [],
    coverage: { families: [], invocations: 0 },
    decision: "REVISE",
    diagnostics: [],
    finishedAt: null,
    infrastructureFailure: null,
    manualInspection: { enabled: cli.headed, timeoutMs: cli.manualTimeoutMs },
    mimePreflight: [],
    reportVersion: REPORT_VERSION,
    scenarios: [],
    server: null,
    startedAt: new Date().toISOString(),
    summary: "Browser QA did not complete",
    validated: false,
  };
}

function parseCli(args) {
  const parsed = {
    headed: false,
    launchTimeoutMs: DEFAULT_TIMEOUT_MS,
    manualTimeoutMs: DEFAULT_MANUAL_TIMEOUT_MS,
    pageTimeoutMs: DEFAULT_TIMEOUT_MS,
    reportPath: "tmp/debug-runtime-browser-qa/report.json",
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--headed") {
      parsed.headed = true;
      continue;
    }
    const [name, inlineValue] = arg.split("=", 2);
    const value = inlineValue ?? args[index + 1];
    if (name === "--report") {
      parsed.reportPath = value || parsed.reportPath;
      if (inlineValue === undefined) index += 1;
      continue;
    }
    if (name === "--launch-timeout-ms") {
      parsed.launchTimeoutMs = positiveInteger(value, name);
      if (inlineValue === undefined) index += 1;
      continue;
    }
    if (name === "--page-timeout-ms") {
      parsed.pageTimeoutMs = positiveInteger(value, name);
      if (inlineValue === undefined) index += 1;
      continue;
    }
    if (name === "--manual-timeout-ms") {
      parsed.manualTimeoutMs = positiveInteger(value, name);
      if (inlineValue === undefined) index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function positiveInteger(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw new Error(`${name} must be a positive integer`);
  return number;
}

async function loadChromium() {
  try {
    const playwright = await import("playwright");
    if (typeof playwright.chromium?.launchPersistentContext !== "function") {
      throw new Error("Playwright chromium.launchPersistentContext is unavailable");
    }
    return playwright;
  } catch (error) {
    throw new Error(`Playwright/browser unavailable: ${messageFor(error)}`);
  }
}

async function startServer(serverRoot) {
  const httpServer = createServer((request, response) => {
    const filePath = resolveRequestPath(serverRoot, request.url || "/");
    if (!filePath) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": CONTENT_TYPES[extname(filePath)] || "application/octet-stream",
    });
    createReadStream(filePath).pipe(response);
  });
  await new Promise((resolveListen, rejectListen) => {
    httpServer.once("error", rejectListen);
    httpServer.listen(0, "127.0.0.1", resolveListen);
  });
  const address = httpServer.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { httpServer, origin: `http://127.0.0.1:${port}`, port };
}

function resolveRequestPath(serverRoot, url) {
  const pathname = decodeURIComponent(new URL(url, "http://127.0.0.1").pathname);
  const normalized = normalize(pathname).replace(/^([/\\])+/, "");
  const candidate = resolve(serverRoot, normalized || "index.html");
  if (relative(serverRoot, candidate).startsWith("..") || !existsSync(candidate)) return null;
  if (statSync(candidate).isDirectory()) {
    const indexPath = join(candidate, "index.html");
    return existsSync(indexPath) ? indexPath : null;
  }
  return candidate;
}

async function preflightMimeTypes(origin) {
  for (const path of ["/src/app/production-module-autoboot.js", "/src/content.generated.mjs"]) {
    const response = await withTimeout(fetch(`${origin}${path}`, { cache: "no-store" }), cli.pageTimeoutMs, `MIME preflight ${path}`);
    const contentType = response.headers.get("content-type") || "";
    const pass = response.ok && /^text\/javascript(?:;|$)/i.test(contentType);
    report.mimePreflight.push({ contentType, pass, path, status: response.status });
    if (!pass) throw new Error(`MIME preflight failed for ${path}: ${response.status} ${contentType}`);
  }
}

function installDiagnostics(page, origin) {
  page.on("console", (message) => {
    const location = message.location();
    recordDiagnostic({
      applicationOrigin: isApplicationUrl(location.url, origin),
      detail: short(message.text()),
      kind: "console",
      line: location.lineNumber || null,
      column: location.columnNumber || null,
      severity: message.type(),
      url: location.url || null,
    });
  });
  page.on("pageerror", (error) => {
    recordDiagnostic({
      applicationOrigin: true,
      detail: short(error.stack || error.message),
      kind: "pageerror",
      severity: "error",
      url: page.url() || null,
    });
  });
  page.on("requestfailed", (request) => {
    recordDiagnostic({
      applicationOrigin: isApplicationUrl(request.url(), origin),
      detail: short(request.failure()?.errorText),
      kind: "requestfailed",
      method: request.method(),
      resourceType: request.resourceType(),
      severity: "error",
      url: request.url(),
    });
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const request = response.request();
    recordDiagnostic({
      applicationOrigin: isApplicationUrl(response.url(), origin),
      detail: `HTTP ${response.status()}`,
      kind: "httpfailure",
      method: request.method(),
      resourceType: request.resourceType(),
      severity: "error",
      status: response.status(),
      url: response.url(),
    });
  });
}

function recordDiagnostic(entry) {
  report.diagnostics.push({ order: report.diagnostics.length + 1, ...entry });
}

async function runNonOptInControl(page, origin) {
  const scenario = beginScenario("non-opted-in-control");
  try {
    await page.goto(`${origin}/index.html`, { timeout: cli.pageTimeoutMs, waitUntil: "networkidle" });
    const present = await page.evaluate(() => Object.hasOwn(globalThis, "TapSurvivorDebugRuntime"));
    if (present) throw new Error("Debug API was published without the exact query opt-in");
    passScenario(scenario, { debugApiPresent: false });
  } catch (error) {
    failScenario(scenario, error);
    throw error;
  }
}

async function runOptInCatalogAudit(page, origin) {
  const scenario = beginScenario("opted-in-catalog-audit");
  try {
    await page.goto(`${origin}/index.html?debugRuntime=1`, { timeout: cli.pageTimeoutMs, waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(globalThis.TapSurvivorDebugRuntime), undefined, {
      timeout: cli.pageTimeoutMs,
    });
    const catalogResponse = await invoke(page, "catalog", {});
    requireSuccess(catalogResponse, "catalog");
    const catalog = catalogResponse.result;
    const families = catalogFamilies(catalog);
    if (!families.length) throw new Error("Debug catalog exposed no invocable registered content families");
    for (const family of families) {
      const coverage = { command: family.command, entries: family.entries.length, key: family.key, passed: 0 };
      for (const descriptor of family.entries) {
        const floor = eligibleFloor(descriptor);
        requireSuccess(await invoke(page, "run.reset", { towerFloor: floor }), `run.reset for ${family.key}:${descriptor.id}`);
        requireSuccess(await invoke(page, family.command, { id: descriptor.id }), `${family.command}:${descriptor.id}`);
        coverage.passed += 1;
        report.coverage.invocations += 1;
      }
      report.coverage.families.push(coverage);
    }
    await runInvalidInputChecks(page);
    passScenario(scenario, { families: report.coverage.families.length, invocations: report.coverage.invocations });
    return catalog;
  } catch (error) {
    failScenario(scenario, error);
    throw error;
  }
}

function catalogFamilies(catalog) {
  const commands = Array.isArray(catalog?.commands) ? catalog.commands : [];
  return Object.entries(catalog || {})
    .filter(([, entries]) => Array.isArray(entries) && entries.every(isDescriptor))
    .map(([key, entries]) => ({ command: commandForFamily(key, commands), entries, key }))
    .filter((family) => family.command && family.entries.length);
}

function isDescriptor(value) {
  return Boolean(value) && typeof value === "object" && typeof value.id === "string" && value.id.length > 0;
}

function commandForFamily(key, commands) {
  const prefix = singularize(key);
  return commands.find((command) => command.startsWith(`${prefix}.`)) || "";
}

function singularize(key) {
  if (key.endsWith("ies")) return `${key.slice(0, -3)}y`;
  if (key.endsWith("ses")) return key.slice(0, -2);
  return key.endsWith("s") ? key.slice(0, -1) : key;
}

function eligibleFloor(descriptor) {
  return Number.isInteger(descriptor.minTowerFloor) ? Math.max(1, descriptor.minTowerFloor) : 1;
}

async function runInvalidInputChecks(page) {
  const unknown = await invoke(page, "__debug_runner_unknown_command__", { id: "not-a-registered-entry" });
  if (unknown.ok || unknown.error?.code !== "UNKNOWN_COMMAND") {
    throw new Error("Unknown command did not return UNKNOWN_COMMAND");
  }
  const malformed = await invoke(page, "catalog", { unexpected: true });
  if (malformed.ok || malformed.error?.code !== "MALFORMED_ARGS") {
    throw new Error("Malformed catalog arguments did not return MALFORMED_ARGS");
  }
}

async function runInactiveRunCheck(page, catalog) {
  const scenario = beginScenario("inactive-run-nonmutation");
  try {
    const family = catalogFamilies(catalog).find((entry) => entry.entries.length);
    if (!family) throw new Error("No catalog family is available for inactive-run validation");
    const descriptor = family.entries[0];
    await page.reload({ timeout: cli.pageTimeoutMs, waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(globalThis.TapSurvivorDebugRuntime), undefined, {
      timeout: cli.pageTimeoutMs,
    });
    const startControl = await clickFirstAvailable(
      [page.locator("#titleStartGame"), page.getByRole("button", { name: /start game/i })],
      "run-start"
    );
    await page.waitForTimeout(50);
    const menuControl = await clickFirstAvailable([page.getByRole("button", { name: /^menu$/i })], "run menu");
    await page.waitForTimeout(50);
    const exitResult = await page.evaluate(() => {
      const button = [...document.querySelectorAll("button")].find((candidate) =>
        candidate.offsetParent !== null &&
        /(?:exit|end|quit)\s+(?:the\s+)?run/i.test(candidate.textContent || "")
      );
      if (!button) return { buttons: [...document.querySelectorAll("button")].map((candidate) => (candidate.textContent || "").trim()), clicked: false, label: "" };
      const label = (button.textContent || "").trim();
      button.click();
      return {
        buttons: [...document.querySelectorAll("button")].map((candidate) => (candidate.textContent || "").trim()),
        clicked: true,
        label,
      };
    });
    if (!exitResult.clicked) throw new Error("A real run-exit UI control was not available from the run menu");
    await page.waitForTimeout(50);
    const exitConfirmation = await clickFirstAvailable(
      [page.getByRole("button", { name: /return to menu/i })],
      "run-exit confirmation"
    );
    await page.waitForTimeout(50);
    const before = await observableUiSnapshot(page);
    const result = await invoke(page, family.command, { id: descriptor.id });
    const after = await observableUiSnapshot(page);
    if (result.ok || result.error?.code !== "INACTIVE_RUN") {
      throw new Error(
        `${family.command} did not reject an inactive run with INACTIVE_RUN after ${exitResult.label}: ${JSON.stringify({ buttons: exitResult.buttons, result })}`
      );
    }
    if (before !== after) throw new Error("Inactive-run command changed observable UI state");
    passScenario(scenario, {
      command: family.command,
      entryId: descriptor.id,
      exitControl: exitResult.label,
      exitConfirmation,
      menuControl,
      startControl,
    });
  } catch (error) {
    failScenario(scenario, error);
    throw error;
  }
}

async function clickFirstAvailable(locators, label) {
  for (const locator of locators) {
    if ((await locator.count().catch(() => 0)) > 0 && (await locator.first().isVisible().catch(() => false))) {
      await locator.first().click({ timeout: cli.pageTimeoutMs });
      return label;
    }
  }
  throw new Error(`A real ${label} UI control was not available`);
}

async function observableUiSnapshot(page) {
  return page.evaluate(() => document.body.innerText);
}

async function invoke(page, command, args) {
  return withTimeout(
    page.evaluate(
      ({ commandName, commandArgs }) => globalThis.TapSurvivorDebugRuntime.invoke(commandName, commandArgs),
      { commandArgs: args, commandName: command }
    ),
    cli.pageTimeoutMs,
    `debug command ${command}`
  );
}

function requireSuccess(response, label) {
  if (!response?.ok) {
    const code = response?.error?.code || "UNKNOWN_FAILURE";
    throw new Error(`${label} failed: ${code}`);
  }
}

async function holdForManualInspection(page, origin) {
  if (!cli.headed) return;
  const scenario = beginScenario("headed-manual-inspection");
  try {
    await page.goto(`${origin}/index.html?debugRuntime=1`, { timeout: cli.pageTimeoutMs, waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(globalThis.TapSurvivorDebugRuntime), undefined, {
      timeout: cli.pageTimeoutMs,
    });
    console.log(`Headed inspection: ${page.url()}`);
    console.log("Use TapSurvivorDebugRuntime.catalog() and TapSurvivorDebugRuntime.invoke(...) in DevTools.");
    console.log(`The browser will close after ${cli.manualTimeoutMs}ms (Ctrl+C also cleans up).`);
    await page.waitForTimeout(cli.manualTimeoutMs);
    passScenario(scenario, { durationMs: cli.manualTimeoutMs });
  } catch (error) {
    failScenario(scenario, error);
    throw error;
  }
}

function beginScenario(name) {
  const scenario = { name, status: "REVISE" };
  report.scenarios.push(scenario);
  return scenario;
}

function passScenario(scenario, details) {
  scenario.details = details;
  scenario.status = "PASS";
}

function failScenario(scenario, error) {
  scenario.error = serializeError(error);
  scenario.status = "REVISE";
}

function isApplicationUrl(url, origin) {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

function short(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 1000);
}

function messageFor(error) {
  return short(error instanceof Error ? error.message : error);
}

function serializeError(error) {
  return { message: messageFor(error), name: error instanceof Error ? error.name : "Error" };
}

async function withTimeout(promise, timeoutMs, label) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function closeQuietly(browserContext, phase) {
  if (!browserContext) return;
  await browserContext.close().catch((error) => {
    report.cleanupFailures.push({ phase, message: messageFor(error) });
  });
}

async function closeServer(activeServer) {
  if (!activeServer?.httpServer) return;
  await new Promise((resolveClose) => activeServer.httpServer.close(resolveClose));
}

async function candidateIsClean() {
  try {
    return (await git("status", "--porcelain")).length === 0;
  } catch {
    return null;
  }
}

async function git(...args) {
  const { stdout } = await execFileAsync("git", args, { cwd: root });
  return stdout.trim();
}

function finalizeReport() {
  if (report.decision !== "PASS") report.decision = "REVISE";
  report.validated = false;
  validateReport(report);
  report.validated = true;
}

function validateReport(candidate) {
  if (candidate.reportVersion !== REPORT_VERSION) throw new Error("Report version is invalid");
  if (!["PASS", "REVISE"].includes(candidate.decision)) throw new Error("Report decision is invalid");
  if (typeof candidate.summary !== "string" || !candidate.summary) throw new Error("Report summary is missing");
  if (!Array.isArray(candidate.diagnostics) || !Array.isArray(candidate.scenarios)) throw new Error("Report arrays are missing");
  if (!candidate.finishedAt || !candidate.startedAt) throw new Error("Report timestamps are missing");
  if (!candidate.server || !Number.isInteger(candidate.server.port)) throw new Error("Report server metadata is missing");
  if (!candidate.mimePreflight.every((entry) => typeof entry.path === "string" && typeof entry.pass === "boolean")) {
    throw new Error("MIME report entries are invalid");
  }
}

async function writeValidatedReport() {
  await mkdir(resolve(reportPath, ".."), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Debug runtime browser QA: ${report.decision} (${reportPath})`);
}
