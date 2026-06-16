import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { basename, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { networkInterfaces } from "node:os";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith("--")) continue;
  const [key, inlineValue] = arg.slice(2).split("=", 2);
  const value = inlineValue ?? (process.argv[index + 1]?.startsWith("--") ? "true" : process.argv[index + 1]);
  args.set(key, value ?? "true");
  if (inlineValue === undefined && value !== "true") index += 1;
}

const apkPath = resolve(args.get("apk") || "android/app/build/outputs/apk/debug/app-debug.apk");
const host = args.get("host") || "0.0.0.0";
const port = Number(args.get("port") || process.env.APK_PORT || 8765);

function tailscaleIp() {
  try {
    for (const addresses of Object.values(networkInterfaces())) {
      for (const address of addresses || []) {
        const parts = address.family === "IPv4" ? address.address.split(".").map(Number) : [];
        if (parts.length === 4 && parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) {
          return address.address;
        }
      }
    }
  } catch {
    // Some sandboxed runners block interface enumeration; the tailscale CLI may still work.
  }

  try {
    const output = execFileSync("tailscale", ["ip", "-4"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return output.split(/\s+/).find(Boolean) || "";
  } catch {
    return "";
  }
}

function contentUrl() {
  const ip = tailscaleIp();
  const publicHost = ip || (host === "0.0.0.0" ? "127.0.0.1" : host);
  return `http://${publicHost}:${port}/${basename(apkPath)}`;
}

function apkStat() {
  try {
    const info = statSync(apkPath);
    if (!info.isFile()) throw new Error(`${apkPath} is not a file`);
    return info;
  } catch (error) {
    console.error(`Debug APK not found: ${apkPath}`);
    console.error("Build it first with: npm run android:debug");
    process.exit(1);
  }
}

const info = apkStat();

if (args.has("print-url")) {
  console.log(contentUrl());
  process.exit(0);
}

const server = createServer((req, res) => {
  const path = new URL(req.url || "/", "http://localhost").pathname;
  if (path === "/health") {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end("ok\n");
    return;
  }

  if (path !== "/" && path !== `/${basename(apkPath)}`) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found\n");
    return;
  }

  res.writeHead(200, {
    "content-type": "application/vnd.android.package-archive",
    "content-length": info.size,
    "content-disposition": `attachment; filename="${basename(apkPath)}"`,
  });
  createReadStream(apkPath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`Serving debug APK: ${contentUrl()}`);
  console.log(`APK path: ${apkPath}`);
  console.log(`APK size: ${info.size} bytes`);
});

server.on("error", (error) => {
  console.error(`APK server failed: ${error.code || error.message}`);
  process.exit(1);
});
