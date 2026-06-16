import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const wwwDir = path.resolve("www");
const requiredFiles = ["index.html", ".nojekyll", "build-info.json"];
const forbiddenDirNames = new Set([".git", ".github", "android", "docs", "node_modules", "scripts", "tests"]);
const forbiddenFileNames = new Set([".env", "AGENTS.md", "package.json", "package-lock.json", "README.md", "key.properties"]);
const forbiddenFilePatterns = [
  /(^|[-_.])secret(s)?([-_.]|$)/i,
  /(^|[-_.])credential(s)?([-_.]|$)/i,
  /service[-_.]?account/i,
  /keystore/i,
  /\.(jks|keystore|p12|pfx|pem)$/i,
];

function isForbiddenRuntimePath(relativePath) {
  const normalized = relativePath.split(path.sep).join("/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.some((part) => forbiddenDirNames.has(part))) return true;

  const basename = parts.at(-1) || "";
  if (forbiddenFileNames.has(basename)) return true;
  return forbiddenFilePatterns.some((pattern) => pattern.test(basename));
}

async function assertFile(relativePath) {
  const fullPath = path.join(wwwDir, relativePath);
  try {
    const fileStat = await stat(fullPath);
    if (!fileStat.isFile()) throw new Error(`${relativePath} is not a file`);
  } catch (error) {
    throw new Error(`Missing required runtime file: www/${relativePath}`, { cause: error });
  }
}

async function listFiles(rootDir) {
  const files = [];

  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(rootDir, fullPath).split(path.sep).join("/");
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && relativePath !== "runtime-manifest.json") {
        files.push(relativePath);
      }
    }
  }

  await walk(rootDir);
  return files;
}

async function hashFile(relativePath) {
  const bytes = await readFile(path.join(wwwDir, relativePath));
  return createHash("sha256").update(bytes).digest("hex");
}

function assertRelativeRuntimePaths(indexHtml) {
  const absoluteRuntimePaths = [...indexHtml.matchAll(/\b(?:src|href)=["']\/(?:src|assets|content)\//g)];
  if (absoluteRuntimePaths.length) {
    throw new Error("index.html contains root-absolute runtime src/href paths");
  }

  if (/["']\/(?:src|assets)\/[^"']+/g.test(indexHtml)) {
    throw new Error('Runtime contains obvious absolute "/src/" or "/assets/" paths');
  }
}

for (const requiredFile of requiredFiles) {
  await assertFile(requiredFile);
}

const files = await listFiles(wwwDir);
const forbidden = files.filter((file) => isForbiddenRuntimePath(file));
if (forbidden.length) {
  throw new Error(`Forbidden runtime files in www/:\n${forbidden.map((file) => `- ${file}`).join("\n")}`);
}

const indexHtml = await readFile(path.join(wwwDir, "index.html"), "utf8");
assertRelativeRuntimePaths(indexHtml);

const fileEntries = [];
for (const file of files) {
  fileEntries.push({
    path: file,
    sha256: await hashFile(file),
  });
}
fileEntries.sort((a, b) => a.path.localeCompare(b.path));

const runtimeHash = createHash("sha256")
  .update(fileEntries.map((entry) => `${entry.sha256}  ${entry.path}`).join("\n"))
  .digest("hex");

const manifest = {
  source: "shared-www",
  appName: "Tap Survivor",
  fileCount: fileEntries.length,
  runtimeHash,
  files: fileEntries,
};

await writeFile(path.join(wwwDir, "runtime-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log("Runtime parity source ready: www/");
