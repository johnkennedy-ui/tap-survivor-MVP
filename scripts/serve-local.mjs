import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function resolvePath(url) {
  const requested = decodeURIComponent(new URL(url, `http://localhost:${port}`).pathname);
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const fullPath = join(root, safePath === "/" ? "index.html" : safePath);
  if (!fullPath.startsWith(root)) return null;
  if (!existsSync(fullPath)) return null;
  if (statSync(fullPath).isDirectory()) return join(fullPath, "index.html");
  return fullPath;
}

createServer((req, res) => {
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
}).listen(port, host, () => {
  console.log(`Tap Survivor MVP local server: http://${host}:${port}/`);
  console.log("Use this for local debugging only; phone testing should use GitHub Pages.");
});
