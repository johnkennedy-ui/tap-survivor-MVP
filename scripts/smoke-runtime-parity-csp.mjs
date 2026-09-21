import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  buildClassicPage,
  buildEsmPage,
  getSyntheticScriptResource,
  syntheticScriptResources,
} from "./smoke-runtime-parity-browser.mjs";

const repoRoot = process.cwd();
const localRequire = createRequire(import.meta.url);
const browserExecutable = parseBrowserExecutable(process.argv.slice(2));
const staticOnly = process.argv.includes("--static-only");
const expectedCsp =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";

await main();

async function main() {
  const indexHtml = await readFile(resolve(repoRoot, "index.html"), "utf8");
  assert.match(
    indexHtml,
    new RegExp(`Content-Security-Policy[\\s\\S]*${escapeRegExp(expectedCsp)}`)
  );

  assertExternalScriptTags(buildClassicPage("<html><body></body></html>", ["src/game.js"]));
  assertExternalScriptTags(buildEsmPage({ rootDir: repoRoot }));

  const server = createServer((request, response) => {
    const requestPath = new URL(request.url || "/", "http://127.0.0.1").pathname;
    if (requestPath === "/csp-control.html") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(
        `<!doctype html><meta http-equiv="Content-Security-Policy" content="${expectedCsp}"><script src="${syntheticScriptResources.esmPrelude}"></script><script>globalThis.__inlineCspControlExecuted = true;</script>`
      );
      return;
    }
    const resource = getSyntheticScriptResource(requestPath);
    if (!resource) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "content-type": resource.contentType });
    response.end(resource.body);
  });

  await new Promise((resolveServer, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveServer);
  });

  const port = server.address().port;
  const origin = `http://127.0.0.1:${port}`;
  try {
    for (const path of Object.values(syntheticScriptResources)) {
      const response = await fetch(`${origin}${path}`);
      assert.equal(response.status, 200, `synthetic resource did not route: ${path}`);
      assert.equal(
        response.headers.get("content-type"),
        "text/javascript; charset=utf-8",
        `synthetic resource has unsafe MIME: ${path}`
      );
      assert.ok((await response.text()).trim(), `synthetic resource is empty: ${path}`);
    }
    if (!staticOnly) await assertBrowserCspControl(origin);
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
  }

  console.log(`Runtime parity CSP transport controls passed${staticOnly ? " (static-only)" : ""}`);
}

function assertExternalScriptTags(html) {
  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)];
  assert.ok(scripts.length > 0, "synthetic page has no script tags");
  for (const script of scripts) {
    assert.match(
      script[1],
      /\bsrc="[^"]+"/,
      `synthetic page contains executable inline script: ${script[0]}`
    );
  }
}

async function assertBrowserCspControl(origin) {
  if (!browserExecutable)
    throw new Error(
      "CSP browser control requires --browser-executable or PARITY_BROWSER_EXECUTABLE"
    );
  const { chromium } = localRequire("playwright");
  const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  try {
    await page.goto(`${origin}/csp-control.html`, { waitUntil: "load" });
    await page.waitForFunction(() => globalThis.__TapSurvivorParity?.mode === "esm");
    assert.equal(await page.evaluate(() => globalThis.__inlineCspControlExecuted === true), false);
    assert.ok(
      consoleErrors.some((message) =>
        /Executing inline script violates the following Content Security Policy directive 'script-src 'self''/.test(
          message
        )
      ),
      "deliberate inline CSP violation was not detected"
    );
  } finally {
    await browser.close();
  }
}

function parseBrowserExecutable(args) {
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--browser-executable") return resolve(repoRoot, args[index + 1] || "");
    if (args[index].startsWith("--browser-executable=")) {
      return resolve(repoRoot, args[index].slice("--browser-executable=".length));
    }
  }
  return process.env.PARITY_BROWSER_EXECUTABLE
    ? resolve(repoRoot, process.env.PARITY_BROWSER_EXECUTABLE)
    : "";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
