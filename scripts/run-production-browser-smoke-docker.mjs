import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const image = process.env.PLAYWRIGHT_DOCKER_IMAGE || "mcr.microsoft.com/playwright:v1.61.1-noble";

const result = spawnSync(
  "docker",
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
    `SMOKE_PRODUCTION_BROWSER_STRICT=${process.env.SMOKE_PRODUCTION_BROWSER_STRICT || "0"}`,
    "-v",
    `${repoRoot}:/repo:ro`,
    image,
    "bash",
    "-lc",
    [
      "set -euo pipefail",
      'workdir="$(mktemp -d /tmp/tap-survivor-browser-smoke.XXXXXX)"',
      'trap \'rm -rf "$workdir"\' EXIT',
      'mkdir -p "$workdir/repo"',
      'cp -a /repo/. "$workdir/repo"/',
      'cd "$workdir/repo"',
      "npm ci --ignore-scripts --no-audit --no-fund",
      "node scripts/smoke-production-browser-runtime.mjs",
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
} else {
  process.exitCode = result.status ?? 1;
}
