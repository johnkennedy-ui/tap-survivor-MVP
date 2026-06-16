import { spawnSync } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const wwwDir = path.resolve("www");
const forbiddenDirNames = new Set([".git", ".github", "android", "docs", "node_modules", "scripts", "tests"]);
const forbiddenFileNames = new Set([".env", "AGENTS.md", "package.json", "package-lock.json", "README.md", "key.properties"]);
const forbiddenFilePatterns = [
  /(^|[-_.])secret(s)?([-_.]|$)/i,
  /(^|[-_.])credential(s)?([-_.]|$)/i,
  /service[-_.]?account/i,
  /keystore/i,
  /\.(jks|keystore|p12|pfx|pem)$/i,
];

function runGit(args, fallback = null) {
  const result = spawnSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  if (result.status !== 0) return fallback;
  return result.stdout.trim() || fallback;
}

function isForbiddenRuntimePath(relativePath) {
  const normalized = relativePath.split(path.sep).join("/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.some((part) => forbiddenDirNames.has(part))) return true;

  const basename = parts.at(-1) || "";
  if (forbiddenFileNames.has(basename)) return true;
  return forbiddenFilePatterns.some((pattern) => pattern.test(basename));
}

async function copyRuntimePath(source, target) {
  await cp(source, target, {
    dereference: false,
    recursive: true,
    filter: (sourcePath) => {
      const relativePath = path.relative(process.cwd(), sourcePath);
      return !isForbiddenRuntimePath(relativePath);
    },
  });
}

await rm(wwwDir, { recursive: true, force: true });
await mkdir(wwwDir, { recursive: true });

await copyRuntimePath("index.html", path.join(wwwDir, "index.html"));
await copyRuntimePath("src", path.join(wwwDir, "src"));
await copyRuntimePath("assets", path.join(wwwDir, "assets"));

const buildInfo = {
  gitCommit: runGit(["rev-parse", "HEAD"], "unknown"),
  branch: runGit(["branch", "--show-current"], "unknown"),
  buildTimestamp: new Date().toISOString(),
  source: "shared-www",
  appName: "Tap Survivor",
};

await writeFile(path.join(wwwDir, ".nojekyll"), "");
await writeFile(path.join(wwwDir, "build-info.json"), `${JSON.stringify(buildInfo, null, 2)}\n`);

if (!(await fileExists(path.join(wwwDir, "index.html")))) {
  throw new Error("www/index.html is missing after build");
}

const forbidden = await findForbiddenRuntimeFiles(wwwDir);
if (forbidden.length) {
  throw new Error(`Forbidden runtime files in www/:\n${forbidden.map((file) => `- ${file}`).join("\n")}`);
}

console.log("Shared web runtime built: www/");

async function fileExists(filePath) {
  try {
    const fileStat = await import("node:fs/promises").then(({ stat }) => stat(filePath));
    return fileStat.isFile();
  } catch {
    return false;
  }
}

async function findForbiddenRuntimeFiles(rootDir) {
  const { readdir } = await import("node:fs/promises");
  const files = [];

  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(rootDir, fullPath);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && isForbiddenRuntimePath(relativePath)) {
        files.push(relativePath.split(path.sep).join("/"));
      }
    }
  }

  await walk(rootDir);
  return files;
}
