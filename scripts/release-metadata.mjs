import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, mkdtemp, open, readFile, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const rootRealPath = await realpath(root);

function fail(message) {
  throw new Error(message);
}

function parseArguments(argv) {
  const artifacts = [];
  let output = "tmp/release-metadata";
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--artifact") {
      const artifact = argv[(index += 1)];
      if (!artifact) fail("--artifact requires a file path");
      artifacts.push(artifact);
    } else if (value === "--output") {
      output = argv[(index += 1)];
      if (!output) fail("--output requires a directory path");
    } else {
      fail(`Unknown argument: ${value}`);
    }
  }
  if (!artifacts.length) fail("At least one --artifact path is required");
  return { artifacts, output };
}

function relativeRepositoryPath(candidate, label) {
  const absolute = path.resolve(root, candidate);
  const relative = path.relative(root, absolute);
  if (
    !relative ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    fail(`${label} must be inside the repository: ${candidate}`);
  }
  return { absolute, relative: relative.split(path.sep).join("/") };
}

function isInsideRepository(candidate) {
  const relative = path.relative(rootRealPath, candidate);
  return (
    relative === "" ||
    (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
  );
}

async function resolvedPathInsideRepository(absolute, label) {
  let resolved;
  try {
    resolved = await realpath(absolute);
  } catch {
    fail(`${label} cannot be resolved: ${absolute}`);
  }
  if (!isInsideRepository(resolved)) fail(`${label} resolves outside the repository: ${absolute}`);
  return resolved;
}

async function outputDirectoryInsideRepository(candidate) {
  const output = relativeRepositoryPath(candidate, "Output directory");
  let ancestor = output.absolute;
  while (true) {
    try {
      await resolvedPathInsideRepository(ancestor, "Output directory");
      break;
    } catch (error) {
      if (!error.message.includes("cannot be resolved")) throw error;
      const parent = path.dirname(ancestor);
      if (parent === ancestor) throw error;
      ancestor = parent;
    }
  }
  await mkdir(output.absolute, { recursive: true });
  await resolvedPathInsideRepository(output.absolute, "Output directory");
  return output;
}

async function outputFileInsideRepository(outputDirectory, filename) {
  const outputFile = path.join(outputDirectory.absolute, filename);
  try {
    const metadata = await lstat(outputFile);
    if (metadata.isSymbolicLink()) {
      fail(`Output file must not be a symbolic link: ${outputDirectory.relative}/${filename}`);
    }
    if (!metadata.isFile()) {
      fail(`Output file is not a regular file: ${outputDirectory.relative}/${filename}`);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return outputFile;
}

function gitCommit() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  if (result.status !== 0 || !/^[0-9a-f]{40}\n?$/.test(result.stdout))
    fail("Unable to determine the exact Git commit");
  return result.stdout.trim();
}

async function checksumArtifact(candidate) {
  const artifact = relativeRepositoryPath(candidate, "Artifact");
  const resolvedArtifact = await resolvedPathInsideRepository(artifact.absolute, "Artifact");
  const handle = await open(resolvedArtifact, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile()) fail(`Artifact is not a regular file: ${artifact.relative}`);
    const bytes = await handle.readFile();
    return {
      path: artifact.relative,
      bytes: metadata.size,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  } finally {
    await handle.close();
  }
}

function npmInvocation() {
  if (process.env.npm_execpath) {
    return { command: process.execPath, prefix: [process.env.npm_execpath] };
  }
  return { command: path.join(path.dirname(process.execPath), "npm"), prefix: [] };
}

async function packageLockCycloneDx(outputDirectory, commit) {
  const lockfile = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
  const rootPackage = lockfile.packages?.[""];
  if (!rootPackage?.name) fail("package-lock.json is missing its root package name");

  // npm requires a versioned root package to create a valid root PURL. The repository's
  // package metadata is intentionally unversioned, so only this temporary input receives
  // a synthetic application version; dependency resolutions remain from package-lock.json.
  rootPackage.version ||= "0.0.0";
  const stagingDirectory = await mkdtemp(path.join(outputDirectory.absolute, ".npm-sbom-"));
  try {
    await writeFile(
      path.join(stagingDirectory, "package.json"),
      `${JSON.stringify({ name: rootPackage.name, version: rootPackage.version, private: true })}\n`
    );
    await writeFile(
      path.join(stagingDirectory, "package-lock.json"),
      `${JSON.stringify(lockfile)}\n`
    );
    const npm = npmInvocation();
    const result = spawnSync(
      npm.command,
      [...npm.prefix, "sbom", "--sbom-format", "cyclonedx", "--package-lock-only"],
      { cwd: stagingDirectory, encoding: "utf8" }
    );
    if (result.status !== 0) {
      fail(`npm sbom failed: ${(result.stderr || result.stdout || "unknown error").trim()}`);
    }
    let sbom;
    try {
      sbom = JSON.parse(result.stdout);
    } catch {
      fail("npm sbom did not emit valid CycloneDX JSON");
    }
    sbom.metadata ??= {};
    sbom.metadata.properties = [
      ...(sbom.metadata.properties || []),
      { name: "tap-survivor.git.commit", value: commit },
      { name: "tap-survivor.inventory.scope", value: "npm package-lock only" },
    ];
    return sbom;
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
  }
}

export async function createReleaseMetadata(argv = process.argv.slice(2)) {
  const { artifacts, output } = parseArguments(argv);
  const outputDirectory = await outputDirectoryInsideRepository(output);
  const sbomOutput = await outputFileInsideRepository(outputDirectory, "sbom.cdx.json");
  const checksumsOutput = await outputFileInsideRepository(outputDirectory, "checksums.json");
  const checksums = await Promise.all(artifacts.map(checksumArtifact));
  checksums.sort((left, right) => left.path.localeCompare(right.path));
  const commit = gitCommit();
  const sbom = await packageLockCycloneDx(outputDirectory, commit);
  const manifest = {
    schemaVersion: 1,
    gitCommit: commit,
    inventory: "npm package-lock only; excludes native Android components and build attestations",
    artifacts: checksums,
  };
  await writeFile(sbomOutput, `${JSON.stringify(sbom, null, 2)}\n`);
  await writeFile(checksumsOutput, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote metadata for ${checksums.length} artifact(s) at commit ${commit}`);
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  await createReleaseMetadata();
}
