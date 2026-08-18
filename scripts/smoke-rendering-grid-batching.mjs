import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { chmod, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

import { createBrowserRenderingAdapters } from "../src/app/browser-rendering-adapters.js";

const parentReferenceSha = "f6c9161fbfbf1cb5a083b886dc616ebda3690040";
const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const require = createRequire(import.meta.url);
const gridCases = [
  {
    height: 96,
    horizontalSegments: [
      [0, 0, 96, 0],
      [0, 48, 96, 48],
    ],
    name: "96x96",
    verticalSegments: [
      [0, 0, 0, 96],
      [48, 0, 48, 96],
    ],
    width: 96,
  },
  {
    height: 96,
    horizontalSegments: [
      [0, 0, 0, 0],
      [0, 48, 0, 48],
    ],
    name: "0x96",
    verticalSegments: [],
    width: 0,
  },
  {
    height: 0,
    horizontalSegments: [],
    name: "96x0",
    verticalSegments: [
      [0, 0, 0, 0],
      [48, 0, 48, 0],
    ],
    width: 96,
  },
  {
    height: 0,
    horizontalSegments: [],
    name: "0x0",
    verticalSegments: [],
    width: 0,
  },
];
const rasterCases = [
  { backgroundDrawn: false, lineCap: "butt", lineJoin: "miter", name: "fallback-default-cap" },
  { backgroundDrawn: true, lineCap: "butt", lineJoin: "miter", name: "sprite-background-default-cap" },
  { backgroundDrawn: false, lineCap: "round", lineJoin: "bevel", name: "fallback-round-cap" },
  { backgroundDrawn: true, lineCap: "round", lineJoin: "bevel", name: "sprite-background-round-cap" },
];

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

function matches(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function renderGrid({ backgroundDrawn, height, width }) {
  const calls = [];
  const state = {
    fillStyle: undefined,
    font: undefined,
    lineCap: "round",
    lineJoin: "bevel",
    lineWidth: undefined,
    strokeStyle: undefined,
  };
  const styleProperty = (property) => ({
    get: () => state[property],
    set: (value) => {
      state[property] = value;
      calls.push(["set", property, value]);
    },
  });
  const context = {
    beginPath() {
      calls.push(["beginPath", state.strokeStyle, state.lineWidth, state.lineCap, state.lineJoin]);
    },
    fillRect(...args) {
      calls.push(["fillRect", ...args, state.fillStyle]);
    },
    fillText(...args) {
      calls.push(["fillText", ...args, state.fillStyle, state.font]);
    },
    lineTo(...args) {
      calls.push(["lineTo", ...args]);
    },
    moveTo(...args) {
      calls.push(["moveTo", ...args]);
    },
    stroke() {
      calls.push(["stroke", state.strokeStyle, state.lineWidth, state.lineCap, state.lineJoin]);
    },
  };
  Object.defineProperties(context, {
    fillStyle: styleProperty("fillStyle"),
    font: styleProperty("font"),
    lineCap: styleProperty("lineCap"),
    lineJoin: styleProperty("lineJoin"),
    lineWidth: styleProperty("lineWidth"),
    strokeStyle: styleProperty("strokeStyle"),
  });
  const canvas = {
    getContext: () => context,
    height,
    width,
  };
  const { renderers } = createBrowserRenderingAdapters({ canvas });
  renderers.renderFrame({
    game: null,
    spriteAdapters: {
      spriteSystem: {
        drawImage(...args) {
          calls.push(["drawImage", ...args]);
          return backgroundDrawn;
        },
      },
    },
  });
  return { calls, state };
}

function expectedOperations({ backgroundDrawn, height, horizontalSegments, verticalSegments, width }) {
  const strokeStyle = backgroundDrawn ? "rgba(223, 246, 255, 0.08)" : "#243244";
  const calls = [
    ["drawImage", "background:tower_floor", 0, 0, width, height],
    ...(!backgroundDrawn
      ? [
          ["set", "fillStyle", "#17202c"],
          ["fillRect", 0, 0, width, height, "#17202c"],
        ]
      : []),
    ["set", "fillStyle", "rgba(10, 14, 20, 0.16)"],
    ["fillRect", 0, 0, width, height, "rgba(10, 14, 20, 0.16)"],
    ["set", "strokeStyle", strokeStyle],
    ["set", "lineWidth", 1],
  ];
  const appendOrientation = (segments) => {
    if (!segments.length) return;
    calls.push(["beginPath", strokeStyle, 1, "round", "bevel"]);
    for (const [startX, startY, endX, endY] of segments) {
      calls.push(["moveTo", startX, startY]);
      calls.push(["lineTo", endX, endY]);
    }
    calls.push(["stroke", strokeStyle, 1, "round", "bevel"]);
  };
  appendOrientation(verticalSegments);
  appendOrientation(horizontalSegments);
  calls.push(
    ["set", "fillStyle", "#f3f6fb"],
    ["set", "font", "700 28px sans-serif"],
    ["fillText", "Tap Survivor", 36, 58, "#f3f6fb", "700 28px sans-serif"],
    ["set", "font", "16px sans-serif"],
    ["fillText", "Unlock weapons, then start a run.", 36, 88, "#f3f6fb", "16px sans-serif"]
  );
  return calls;
}

for (const backgroundDrawn of [false, true]) {
  for (const gridCase of gridCases) {
    const actual = renderGrid({ backgroundDrawn, ...gridCase });
    const expected = expectedOperations({ backgroundDrawn, ...gridCase });
    check(
      `fake Canvas ${backgroundDrawn ? "sprite" : "fallback"} ${gridCase.name} exact operation/style order`,
      matches(actual.calls, expected)
    );
    check(
      `fake Canvas ${backgroundDrawn ? "sprite" : "fallback"} ${gridCase.name} retains Canvas lineCap/lineJoin`,
      actual.state.lineCap === "round" && actual.state.lineJoin === "bevel"
    );
  }
}

function loadChromium() {
  const moduleOverride = process.env.GRID_SMOKE_PLAYWRIGHT_MODULE || "";
  const candidates = [
    { load: () => require("playwright"), source: "repo" },
    ...(moduleOverride ? [{ load: () => require(resolve(moduleOverride)), source: "caller-override" }] : []),
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
    `Playwright module is unavailable without installing packages; set GRID_SMOKE_PLAYWRIGHT_MODULE to an existing module path: ${lastError?.message || lastError}`
  );
}

function isExistingExecutable(filePath) {
  try {
    return Boolean(filePath && existsSync(filePath) && statSync(filePath).isFile());
  } catch {
    return false;
  }
}

async function createBrowserLaunch(chromium) {
  const bundledPath = chromium.executablePath();
  const executablePath = [bundledPath, "/snap/bin/chromium", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find(
    isExistingExecutable
  );
  if (!executablePath) throw new Error("No Playwright or system Chromium executable is available.");

  if (resolve(executablePath) !== "/snap/bin/chromium") {
    const runtimeDir = process.env.XDG_RUNTIME_DIR || "";
    if (!runtimeDir || !existsSync(runtimeDir)) {
      throw new Error("A 0700 XDG_RUNTIME_DIR is required for non-Snap Chromium.");
    }
    if ((statSync(runtimeDir).mode & 0o777) !== 0o700) {
      throw new Error(`XDG_RUNTIME_DIR must be mode 0700: ${runtimeDir}`);
    }
    return {
      executablePath,
      options: { env: { ...process.env, XDG_RUNTIME_DIR: runtimeDir }, executablePath, headless: true },
      runtime: { dir: runtimeDir, owned: false, source: "caller" },
    };
  }

  const runtimeParent = join(homedir(), "snap", "chromium", "common");
  if (!existsSync(runtimeParent)) throw new Error(`Snap runtime parent is unavailable: ${runtimeParent}`);
  const runtimeDir = await mkdtemp(join(runtimeParent, "tap-survivor-grid-smoke-runtime-"));
  await chmod(runtimeDir, 0o700);
  return {
    executablePath,
    options: { env: { ...process.env, XDG_RUNTIME_DIR: runtimeDir }, executablePath, headless: true },
    runtime: { dir: runtimeDir, owned: true, source: "snap-common" },
  };
}

function fixtureHtml() {
  return `<!doctype html>
<meta charset="utf-8">
<title>Tap Survivor grid pixel equivalence fixture</title>
<script type="module">
  import { createBrowserRenderingAdapters as createCandidateAdapters } from "/candidate-browser-rendering-adapters.js";
  import { createBrowserRenderingAdapters as createParentAdapters } from "/parent-browser-rendering-adapters.js";

  const crop = { height: 192, width: 192, x: 48, y: 96 };
  const canvasSize = 288;

  function render(createAdapters, backgroundDrawn, lineCap, lineJoin) {
    const canvas = document.createElement("canvas");
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const context = canvas.getContext("2d");
    context.lineCap = lineCap;
    context.lineJoin = lineJoin;
    const { renderers } = createAdapters({ canvas });
    renderers.renderFrame({
      game: null,
      spriteAdapters: { spriteSystem: { drawImage: () => backgroundDrawn } },
    });
    return {
      data: context.getImageData(crop.x, crop.y, crop.width, crop.height).data,
      lineCap: context.lineCap,
      lineJoin: context.lineJoin,
    };
  }

  window.runGridPixelCase = ({ backgroundDrawn, lineCap, lineJoin, name }) => {
    const candidate = render(createCandidateAdapters, backgroundDrawn, lineCap, lineJoin);
    const parent = render(createParentAdapters, backgroundDrawn, lineCap, lineJoin);
    let differentChannelCount = 0;
    let differentPixelCount = 0;
    let firstDifference = null;
    let maxChannelDelta = 0;
    for (let index = 0; index < candidate.data.length; index += 4) {
      let pixelDifferent = false;
      for (let channel = 0; channel < 4; channel += 1) {
        const candidateValue = candidate.data[index + channel];
        const parentValue = parent.data[index + channel];
        const delta = Math.abs(candidateValue - parentValue);
        if (!delta) continue;
        differentChannelCount += 1;
        pixelDifferent = true;
        maxChannelDelta = Math.max(maxChannelDelta, delta);
        if (!firstDifference) {
          const pixelIndex = index / 4;
          firstDifference = {
            candidateValue,
            channel,
            parentValue,
            x: crop.x + (pixelIndex % crop.width),
            y: crop.y + Math.floor(pixelIndex / crop.width),
          };
        }
      }
      if (pixelDifferent) differentPixelCount += 1;
    }
    return {
      backgroundDrawn,
      candidateState: { lineCap: candidate.lineCap, lineJoin: candidate.lineJoin },
      comparedPixelCount: crop.width * crop.height,
      crop,
      differentChannelCount,
      differentPixelCount,
      firstDifference,
      lineCap,
      lineJoin,
      maxChannelDelta,
      name,
      parentState: { lineCap: parent.lineCap, lineJoin: parent.lineJoin },
    };
  };
</script>`;
}

async function listen(server) {
  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", rejectListen);
      resolveListen();
    });
  });
}

async function closeServer(server) {
  if (!server) return;
  await new Promise((resolveClose) => server.close(() => resolveClose()));
}

async function runChromiumPixelEquivalence() {
  const browserDriver = loadChromium();
  const browserLaunch = await createBrowserLaunch(browserDriver.chromium);
  const candidateSource = readFileSync(resolve(repoRoot, "src/app/browser-rendering-adapters.js"), "utf8");
  const parentSource = execFileSync(
    "git",
    ["show", `${parentReferenceSha}:src/app/browser-rendering-adapters.js`],
    { cwd: repoRoot, encoding: "utf8" }
  );
  let context;
  let profileDir;
  let server;
  try {
    server = createServer((request, response) => {
      const pathname = new URL(request.url || "/", "http://127.0.0.1").pathname;
      if (pathname === "/candidate-browser-rendering-adapters.js") {
        response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
        response.end(candidateSource);
        return;
      }
      if (pathname === "/parent-browser-rendering-adapters.js") {
        response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
        response.end(parentSource);
        return;
      }
      if (pathname === "/grid-pixel-fixture.html") {
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(fixtureHtml());
        return;
      }
      if (pathname === "/favicon.ico") {
        response.writeHead(204);
        response.end();
        return;
      }
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    });
    await listen(server);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Loopback grid fixture did not expose a TCP address.");
    const origin = `http://127.0.0.1:${address.port}`;
    profileDir = await mkdtemp(join(browserLaunch.runtime.dir, "tap-survivor-grid-smoke-profile-"));
    await chmod(profileDir, 0o700);
    context = await browserDriver.chromium.launchPersistentContext(profileDir, {
      ...browserLaunch.options,
      deviceScaleFactor: 1,
      viewport: { height: 320, width: 320 },
    });
    const page = context.pages()[0] || (await context.newPage());
    const diagnostics = { console: [], pageErrors: [] };
    page.on("console", (message) => diagnostics.console.push({ text: message.text(), type: message.type() }));
    page.on("pageerror", (error) => diagnostics.pageErrors.push({ message: error.message }));
    const response = await page.goto(`${origin}/grid-pixel-fixture.html`, { timeout: 30000, waitUntil: "load" });
    if (!response?.ok()) throw new Error(`Loopback grid fixture returned HTTP ${response?.status() || "unknown"}.`);
    await page.waitForFunction(() => typeof window.runGridPixelCase === "function", null, { timeout: 30000 });
    const cases = [];
    for (const rasterCase of rasterCases) {
      cases.push(await page.evaluate((input) => window.runGridPixelCase(input), rasterCase));
    }
    const browserVersion = context.browser()?.version() || "unknown";
    await context.close();
    context = undefined;
    return {
      browser: { executablePath: browserLaunch.executablePath, source: browserDriver.source, version: browserVersion },
      cases,
      diagnostics,
      parentReferenceSha,
    };
  } finally {
    await context?.close();
    await closeServer(server);
    if (profileDir) await rm(profileDir, { force: true, recursive: true });
    if (browserLaunch.runtime.owned) await rm(browserLaunch.runtime.dir, { force: true, recursive: true });
  }
}

let pixelEquivalence = { cases: [], outcome: "FAIL" };
try {
  pixelEquivalence = { ...(await runChromiumPixelEquivalence()), outcome: "PASS" };
  for (const pixelCase of pixelEquivalence.cases) {
    check(
      `real Chromium ${pixelCase.name} exact ${pixelCase.crop.width}x${pixelCase.crop.height} non-menu grid crop`,
      pixelCase.differentPixelCount === 0 && pixelCase.differentChannelCount === 0 && pixelCase.maxChannelDelta === 0
    );
    check(
      `real Chromium ${pixelCase.name} retains requested Canvas cap/join state`,
      pixelCase.candidateState.lineCap === pixelCase.lineCap &&
        pixelCase.candidateState.lineJoin === pixelCase.lineJoin &&
        pixelCase.parentState.lineCap === pixelCase.lineCap &&
        pixelCase.parentState.lineJoin === pixelCase.lineJoin
    );
  }
  const diagnosticsPass = !pixelEquivalence.diagnostics.console.length && !pixelEquivalence.diagnostics.pageErrors.length;
  if (!diagnosticsPass) {
    console.error(`Loopback browser diagnostics: ${JSON.stringify(pixelEquivalence.diagnostics)}`);
  }
  check("real Chromium loopback fixture has no browser diagnostics", diagnosticsPass);
} catch (error) {
  pixelEquivalence = { error: error?.stack || String(error), outcome: "FAIL" };
  check("real Chromium pixel-equivalence execution", false);
  console.error(pixelEquivalence.error);
}

if (process.exitCode) {
  console.error("\nRendering grid batching smoke failed.");
  process.exit(process.exitCode);
}

console.log(`\nRendering grid batching smoke passed against parent ${parentReferenceSha}.`);
