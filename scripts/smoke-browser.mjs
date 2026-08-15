import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { chmod, mkdtemp, rm, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = new URL("..", import.meta.url).pathname;
const required = process.env.SMOKE_BROWSER_REQUIRED === "1";
const configuredBrowserTimeoutMs = Number(process.env.SMOKE_BROWSER_TIMEOUT_MS || 15000);
const browserTimeoutMs = Number.isFinite(configuredBrowserTimeoutMs) && configuredBrowserTimeoutMs > 0
  ? configuredBrowserTimeoutMs
  : 15000;
const fixture = resolveFixture(process.env.SMOKE_BROWSER_FIXTURE || "scripts/browser-smoke.html");
const reportFile = process.env.SMOKE_BROWSER_REPORT_FILE || "";
const snapChromiumPath = "/snap/bin/chromium";
const defaultSnapRuntimeParent = "/home/logix/snap/chromium/common";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function resolvePath(url) {
  const requested = decodeURIComponent(new URL(url, "http://127.0.0.1").pathname);
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const fullPath = join(root, safePath === "/" ? "index.html" : safePath);
  if (!fullPath.startsWith(root)) return null;
  if (!existsSync(fullPath)) return null;
  if (statSync(fullPath).isDirectory()) return join(fullPath, "index.html");
  return fullPath;
}

function candidateBrowsers() {
  if (process.env.CHROME_BIN) return [process.env.CHROME_BIN];
  return [
    "chromium",
    "chromium-browser",
    "google-chrome",
    "google-chrome-stable",
  ].filter(Boolean);
}

function browserArgs(url, profileDir = "") {
  return [
    "--headless",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--hide-scrollbars",
    "--virtual-time-budget=5000",
    "--dump-dom",
    ...(profileDir ? [`--user-data-dir=${profileDir}`] : []),
    url,
  ];
}

function isSnapChromium(browser) {
  return resolve(browser) === snapChromiumPath;
}

async function createBrowserLaunch(browser) {
  if (!isSnapChromium(browser)) {
    return {
      environment: process.env,
      metadata: {
        browserExecutable: browser,
        privateRuntime: {
          cleanup: { attempted: false, success: true },
          enabled: false,
          mode: "not-applicable",
        },
      },
      profileDir: "",
      runtimeDir: "",
    };
  }

  const runtimeParent = process.env.SMOKE_BROWSER_RUNTIME_PARENT || defaultSnapRuntimeParent;
  let runtimeDir = "";
  let profileDir = "";
  try {
    const parentStat = await stat(runtimeParent);
    if (!parentStat.isDirectory()) {
      throw new Error(`Snap browser runtime parent is not a directory: ${runtimeParent}`);
    }
    runtimeDir = await mkdtemp(join(runtimeParent, "tap-survivor-smoke-runtime-"));
    await chmod(runtimeDir, 0o700);
    profileDir = await mkdtemp(join(runtimeParent, "tap-survivor-smoke-profile-"));
    await chmod(profileDir, 0o700);
  } catch (error) {
    await removeOwnedDirectories(profileDir, runtimeDir);
    throw error;
  }

  return {
    environment: { ...process.env, XDG_RUNTIME_DIR: runtimeDir },
    metadata: {
      browserExecutable: browser,
      privateRuntime: {
        cleanup: { attempted: false, success: false },
        enabled: true,
        mode: "snap-private",
        profileDirectoryMode: "0700",
        runtimeDirectoryMode: "0700",
        runtimeParent,
      },
    },
    profileDir,
    runtimeDir,
  };
}

async function removeOwnedDirectories(profileDir, runtimeDir) {
  const cleanup = {
    attempted: Boolean(profileDir || runtimeDir),
    profile: { removed: !profileDir },
    runtime: { removed: !runtimeDir },
    success: false,
  };
  if (profileDir) {
    try {
      await rm(profileDir, { force: true, recursive: true });
      cleanup.profile.removed = true;
    } catch (error) {
      cleanup.profile.error = error.message;
    }
  }
  if (runtimeDir) {
    try {
      await rm(runtimeDir, { force: true, recursive: true });
      cleanup.runtime.removed = true;
    } catch (error) {
      cleanup.runtime.error = error.message;
    }
  }
  cleanup.success = cleanup.profile.removed && cleanup.runtime.removed;
  return cleanup;
}

function runBrowserProcess(browser, url, launch) {
  return new Promise((resolveResult) => {
    let output = "";
    let errorOutput = "";
    let settled = false;
    let timedOut = false;
    const child = spawn(browser, browserArgs(url, launch.profileDir), {
      env: launch.environment,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolveResult({ ...result, stderr: errorOutput, stdout: output, timedOut });
    };
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, browserTimeoutMs);
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      errorOutput += chunk;
    });
    child.once("error", (error) => finish({ error, status: null }));
    child.once("close", (status, signal) => finish({ error: null, signal, status }));
  });
}

async function runBrowser(browser, url) {
  let launch;
  let result;
  try {
    launch = await createBrowserLaunch(browser);
    result = await runBrowserProcess(browser, url, launch);
  } catch (error) {
    result = { error, status: null, stderr: "", stdout: "", timedOut: false };
  } finally {
    if (launch?.metadata.privateRuntime.enabled) {
      launch.metadata.privateRuntime.cleanup = await removeOwnedDirectories(
        launch.profileDir,
        launch.runtimeDir
      );
    }
  }
  return {
    ...result,
    metadata: launch?.metadata || {
      browserExecutable: browser,
      privateRuntime: {
        cleanup: { attempted: false, success: false },
        enabled: isSnapChromium(browser),
        mode: isSnapChromium(browser) ? "snap-private-setup-failed" : "not-applicable",
      },
    },
  };
}

function resolveFixture(value) {
  const normalized = normalize(String(value || "")).replace(/^[/\\]+/, "");
  if (!normalized || normalized === "." || normalized.startsWith("..")) return "";
  return normalized;
}

function extractBrowserReport(output) {
  const match = output.match(
    /<script\b(?=[^>]*\bid=["']smoke-browser-report["'])[^>]*>([\s\S]*?)<\/script>/i
  );
  if (!match) return { error: "browser fixture did not emit #smoke-browser-report", report: null };
  try {
    const report = JSON.parse(match[1]);
    if (!report || typeof report !== "object" || Array.isArray(report)) {
      return { error: "browser fixture report must be a JSON object", report: null };
    }
    return { error: "", report };
  } catch (error) {
    return { error: `browser fixture report is not valid JSON: ${error.message}`, report: null };
  }
}

function writeBrowserReport(report) {
  if (!reportFile) return;
  const reportPath = normalize(reportFile);
  const parent = reportPath.slice(0, Math.max(0, reportPath.lastIndexOf("/"))) || ".";
  const temporaryPath = `${reportPath}.tmp-${process.pid}-${Date.now()}`;
  mkdirSync(parent, { recursive: true });
  writeFileSync(temporaryPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  renameSync(temporaryPath, reportPath);
}

function addRunnerMetadata(report, metadata) {
  return {
    ...report,
    runner: {
      browserExecutable: metadata.browserExecutable,
      fixture,
      privateRuntime: metadata.privateRuntime,
      timeoutMs: browserTimeoutMs,
    },
  };
}

function validateBrowserReport(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    return "browser fixture report must be a JSON object";
  }
  if (!["pass", "fail"].includes(report.outcome)) {
    return "browser fixture report must declare outcome as pass or fail";
  }
  if (!Array.isArray(report.checks)) {
    return "browser fixture report must include a checks array";
  }
  if (!report.readiness || typeof report.readiness !== "object") {
    return "browser fixture report must include readiness state";
  }
  if (typeof report.readiness.ready !== "boolean" || typeof report.readiness.timedOut !== "boolean") {
    return "browser fixture report readiness must include boolean ready and timedOut values";
  }
  if (!report.diagnostics || typeof report.diagnostics !== "object") {
    return "browser fixture report must include diagnostics";
  }
  for (const key of ["pageErrors", "resourceErrors", "unhandledRejections"]) {
    if (!Array.isArray(report.diagnostics[key])) {
      return `browser fixture report diagnostics.${key} must be an array`;
    }
  }
  return "";
}

function reportIndicatesPass(report) {
  const diagnostics = report.diagnostics;
  return (
    report.outcome === "pass" &&
    report.readiness.ready &&
    !report.readiness.timedOut &&
    report.checks.length > 0 &&
    report.checks.every((check) => check?.pass === true) &&
    diagnostics.pageErrors.length === 0 &&
    diagnostics.resourceErrors.length === 0 &&
    diagnostics.unhandledRejections.length === 0
  );
}

function printReportChecks(report) {
  report.checks.forEach((check) => {
    console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}`);
  });
}

function skipOrFail(reason) {
  if (!required) {
    console.log(`# Browser Smoke\nSKIP ${reason} Set SMOKE_BROWSER_REQUIRED=1 to fail instead.`);
    return;
  }

  console.error(reason);
  process.exitCode = 1;
}

const server = createServer((req, res) => {
  const fullPath = resolvePath(req.url || "/");
  if (!fullPath) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  res.writeHead(200, {
    "content-type": contentTypes[extname(fullPath)] || "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(fullPath).pipe(res);
});

server.on("error", (error) => {
  skipOrFail(`local server unavailable: ${error.code || error.message}.`);
});

function closeServer() {
  return new Promise((resolveClose) => server.close(resolveClose));
}

async function runSmoke() {
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/${fixture}`;
  let lastError = "";

  try {
    if (!fixture) {
      skipOrFail("configured browser fixture path is invalid.");
      return;
    }

    for (const browser of candidateBrowsers()) {
      const result = await runBrowser(browser, url);
      if (result.error?.code === "ENOENT") continue;
      const output = `${result.stdout || ""}\n${result.stderr || ""}`;
      if (result.timedOut) {
        skipOrFail(`Browser ${browser} timed out after ${browserTimeoutMs}ms.`);
        return;
      }
      if (result.error) {
        skipOrFail(`Browser ${browser} failed to launch: ${result.error.message || result.error}.`);
        return;
      }

      const parsed = extractBrowserReport(output);
      if (parsed.error) {
        skipOrFail(`Browser ${browser} did not emit a usable smoke report: ${parsed.error}.\n${output}`);
        return;
      }

      const report = addRunnerMetadata(parsed.report, result.metadata);
      if (reportFile) {
        try {
          writeBrowserReport(report);
        } catch (error) {
          skipOrFail(`Browser ${browser} completed but could not write its report: ${error.message}.\n${output}`);
          return;
        }
      }

      const reportError = validateBrowserReport(report);
      if (reportError) {
        skipOrFail(`Browser ${browser} emitted an invalid smoke report: ${reportError}.\n${output}`);
        return;
      }
      if (result.status !== 0) {
        skipOrFail(`Browser ${browser} exited with status ${result.status}.\n${output}`);
        return;
      }
      if (!result.metadata.privateRuntime.cleanup.success) {
        skipOrFail(`Browser ${browser} completed but private runtime cleanup failed.`);
        return;
      }
      if (reportIndicatesPass(report)) {
        console.log(`# Browser Smoke\nPASS ${browser}`);
        printReportChecks(report);
        return;
      }
      skipOrFail(`Browser ${browser} reported a smoke failure.\n${output}`);
      return;
    }

    if (!lastError) {
      skipOrFail("no headless browser found.");
      return;
    }

    skipOrFail(lastError);
  } finally {
    await closeServer();
  }
}

server.listen(0, "127.0.0.1", () => {
  void runSmoke().catch(async (error) => {
    console.error(error.stack || error.message || String(error));
    process.exitCode = 1;
    await closeServer();
  });
});
