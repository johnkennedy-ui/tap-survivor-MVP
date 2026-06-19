import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { spawnSync } from "node:child_process";

const root = new URL("..", import.meta.url).pathname;
const required = process.env.SMOKE_BROWSER_REQUIRED === "1";
const browserTimeoutMs = Number(process.env.SMOKE_BROWSER_TIMEOUT_MS || 15000);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
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
  return [
    process.env.CHROME_BIN,
    "chromium",
    "chromium-browser",
    "google-chrome",
    "google-chrome-stable",
  ].filter(Boolean);
}

function runBrowser(browser, url) {
  return spawnSync(browser, [
    "--headless",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--hide-scrollbars",
    "--virtual-time-budget=5000",
    "--dump-dom",
    url,
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: browserTimeoutMs,
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

server.listen(0, "127.0.0.1", () => {
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/scripts/browser-smoke.html`;
  let lastError = "";

  for (const browser of candidateBrowsers()) {
    const result = runBrowser(browser, url);
    if (result.error?.code === "ENOENT") continue;
    if (result.error?.code === "ETIMEDOUT") {
      lastError = `Browser ${browser} timed out after ${browserTimeoutMs}ms.`;
      continue;
    }
    const output = `${result.stdout || ""}\n${result.stderr || ""}`;
    if (result.status === 0 && output.includes("SMOKE_BROWSER_PASS")) {
      console.log(`# Browser Smoke\nPASS ${browser}`);
      output
        .split("\n")
        .filter((line) => line.startsWith("PASS ") || line.startsWith("FAIL "))
        .forEach((line) => console.log(line));
      server.close();
      return;
    }
    if (output.includes("SMOKE_BROWSER_FAIL")) {
      console.error(`Browser ${browser} found an app smoke failure.\n${output}`);
      server.close();
      process.exitCode = 1;
      return;
    }
    lastError = `Browser ${browser} failed.\n${output}`;
  }

  server.close();
  if (!lastError) {
    skipOrFail("no headless browser found.");
    return;
  }

  skipOrFail(lastError);
});
