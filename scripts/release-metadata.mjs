import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, rename, rmdir, unlink } from "node:fs/promises";
import path from "node:path";

const procDescriptorDirectory = "/proc/self/fd";
const directoryOpenFlags = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;

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

function safeComponent(component, label) {
  if (
    typeof component !== "string" ||
    !component ||
    component === "." ||
    component === ".." ||
    component.includes("/") ||
    component.includes("\0")
  ) {
    fail(`${label} contains an unsafe path component`);
  }
  return component;
}

function relativeRepositoryPath(repositoryRoot, candidate, label) {
  const absolute = path.resolve(repositoryRoot, candidate);
  const relative = path.relative(repositoryRoot, absolute);
  if (
    !relative ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    fail(`${label} must be inside the repository: ${candidate}`);
  }
  const components = relative.split(path.sep);
  components.forEach((component) => safeComponent(component, label));
  return { components, relative: components.join("/") };
}

function descriptorDirectoryPath(handle) {
  if (!Number.isInteger(handle?.fd) || handle.fd < 0) {
    fail("A live directory descriptor is required");
  }
  return `${procDescriptorDirectory}/${handle.fd}`;
}

function descriptorEntryPath(directoryHandle, component) {
  return `${descriptorDirectoryPath(directoryHandle)}/${safeComponent(component, "Descriptor entry")}`;
}

// CLI callers never supply hooks; the in-process smoke test uses them as deterministic race barriers.
async function invokeTestHook(options, name, context) {
  const hook = options?.[name];
  if (hook === undefined) return;
  if (typeof hook !== "function") fail(`Test hook ${name} must be a function`);
  await hook(Object.freeze({ ...context }));
}

async function assertDescriptorTraversalSupport() {
  if (
    process.platform !== "linux" ||
    !Number.isInteger(constants.O_DIRECTORY) ||
    !Number.isInteger(constants.O_NOFOLLOW)
  ) {
    fail("Release metadata requires Linux descriptor traversal with O_DIRECTORY and O_NOFOLLOW");
  }
  let procHandle;
  try {
    procHandle = await open(procDescriptorDirectory, directoryOpenFlags);
  } catch {
    fail("Release metadata requires trusted /proc/self/fd descriptor traversal");
  } finally {
    await procHandle?.close();
  }
}

async function openRepositoryRoot() {
  await assertDescriptorTraversalSupport();
  try {
    return await open(".", directoryOpenFlags);
  } catch {
    fail("Unable to securely anchor the repository working directory");
  }
}

async function openDirectoryComponent(parentHandle, component, label) {
  let handle;
  try {
    handle = await open(descriptorEntryPath(parentHandle, component), directoryOpenFlags);
  } catch {
    fail(`${label} cannot be opened securely: ${component}`);
  }
  try {
    if (!(await handle.stat()).isDirectory()) {
      fail(`${label} is not a directory: ${component}`);
    }
    return handle;
  } catch (error) {
    await handle.close();
    throw error;
  }
}

async function closeOwnedDirectory(anchor) {
  if (anchor.owned) await anchor.handle.close();
}

async function openExistingDirectory(rootHandle, components, label, options) {
  let current = rootHandle;
  let owned = false;
  try {
    for (let index = 0; index < components.length; index += 1) {
      const component = components[index];
      const next = await openDirectoryComponent(current, component, label);
      try {
        await invokeTestHook(options, "afterDirectoryOpen", {
          component,
          index,
          label,
          relative: components.slice(0, index + 1).join("/"),
        });
      } catch (error) {
        await next.close();
        throw error;
      }
      if (owned) await current.close();
      current = next;
      owned = true;
    }
    return { handle: current, owned };
  } catch (error) {
    if (owned) await current.close();
    throw error;
  }
}

async function outputDirectoryInsideRepository(rootHandle, repositoryRoot, candidate, options) {
  const output = relativeRepositoryPath(repositoryRoot, candidate, "Output directory");
  let current = rootHandle;
  let owned = false;
  try {
    for (let index = 0; index < output.components.length; index += 1) {
      const component = output.components[index];
      let created = false;
      try {
        await mkdir(descriptorEntryPath(current, component), { mode: 0o700 });
        created = true;
      } catch (error) {
        if (error?.code !== "EEXIST") {
          fail(`Output directory cannot be created securely: ${output.relative}`);
        }
      }
      if (created) {
        await invokeTestHook(options, "afterDirectoryCreateBeforeOpen", {
          component,
          index,
          label: "Output directory",
          relative: output.components.slice(0, index + 1).join("/"),
        });
      }
      const next = await openDirectoryComponent(current, component, "Output directory");
      try {
        await invokeTestHook(options, "afterDirectoryOpen", {
          component,
          index,
          label: "Output directory",
          relative: output.components.slice(0, index + 1).join("/"),
        });
      } catch (error) {
        await next.close();
        throw error;
      }
      if (owned) await current.close();
      current = next;
      owned = true;
    }
    return { ...output, handle: current, owned };
  } catch (error) {
    if (owned) await current.close();
    throw error;
  }
}

async function readRegularFile(rootHandle, components, label, options) {
  const parent = await openExistingDirectory(rootHandle, components.slice(0, -1), label, options);
  let handle;
  try {
    const filename = components.at(-1);
    await invokeTestHook(options, "beforeFileOpen", {
      label,
      relative: components.join("/"),
    });
    try {
      handle = await open(
        descriptorEntryPath(parent.handle, filename),
        constants.O_RDONLY | constants.O_NOFOLLOW
      );
    } catch {
      fail(`${label} cannot be opened securely: ${components.join("/")}`);
    }
    const metadata = await handle.stat();
    if (!metadata.isFile()) fail(`${label} is not a regular file: ${components.join("/")}`);
    const bytes = await handle.readFile();
    return { bytes, size: bytes.length };
  } finally {
    await handle?.close();
    await closeOwnedDirectory(parent);
  }
}

async function checksumArtifact(rootHandle, repositoryRoot, candidate, options) {
  const artifact = relativeRepositoryPath(repositoryRoot, candidate, "Artifact");
  const { bytes, size } = await readRegularFile(rootHandle, artifact.components, "Artifact", options);
  return {
    path: artifact.relative,
    bytes: size,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

async function inspectOutputFile(outputDirectory, filename) {
  try {
    const metadata = await lstat(descriptorEntryPath(outputDirectory.handle, filename));
    if (metadata.isSymbolicLink()) {
      fail(`Output file must not be a symbolic link: ${outputDirectory.relative}/${filename}`);
    }
    if (!metadata.isFile()) {
      fail(`Output file is not a regular file: ${outputDirectory.relative}/${filename}`);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function gitCommit(rootHandle) {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: descriptorDirectoryPath(rootHandle),
    encoding: "utf8",
  });
  if (result.status !== 0 || !/^[0-9a-f]{40}\n?$/.test(result.stdout)) {
    fail("Unable to determine the exact Git commit");
  }
  return result.stdout.trim();
}

function npmInvocation() {
  if (process.env.npm_execpath) {
    return { command: process.execPath, prefix: [process.env.npm_execpath] };
  }
  return { command: path.join(path.dirname(process.execPath), "npm"), prefix: [] };
}

function randomName(prefix, suffix = "") {
  return `${prefix}${randomBytes(18).toString("hex")}${suffix}`;
}

async function writeFreshFile(directoryHandle, filename, contents) {
  const handle = await open(
    descriptorEntryPath(directoryHandle, filename),
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
    0o600
  );
  try {
    await handle.writeFile(contents);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function createPrivateStagingDirectory(outputDirectory, options) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const name = randomName(".npm-sbom-");
    try {
      await mkdir(descriptorEntryPath(outputDirectory.handle, name), { mode: 0o700 });
    } catch (error) {
      if (error?.code === "EEXIST") continue;
      fail("Unable to create a secure SBOM staging directory");
    }
    await invokeTestHook(options, "afterDirectoryCreateBeforeOpen", {
      component: name,
      index: 0,
      label: "SBOM staging directory",
      relative: `${outputDirectory.relative}/${name}`,
    });
    const handle = await openDirectoryComponent(outputDirectory.handle, name, "SBOM staging directory");
    return { handle, name };
  }
  fail("Unable to allocate a unique secure SBOM staging directory");
}

async function unlinkIfPresent(directoryHandle, filename) {
  try {
    await unlink(descriptorEntryPath(directoryHandle, filename));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function removePrivateStagingDirectory(outputDirectory, stagingDirectory) {
  try {
    await unlinkIfPresent(stagingDirectory.handle, "package.json");
    await unlinkIfPresent(stagingDirectory.handle, "package-lock.json");
  } finally {
    await stagingDirectory.handle.close();
  }
  try {
    await rmdir(descriptorEntryPath(outputDirectory.handle, stagingDirectory.name));
  } catch (error) {
    if (error?.code !== "ENOENT" && error?.code !== "ENOTEMPTY") throw error;
  }
}

async function packageLockCycloneDx(rootHandle, outputDirectory, commit, options) {
  const { bytes } = await readRegularFile(rootHandle, ["package-lock.json"], "package-lock.json", options);
  const lockfile = JSON.parse(bytes.toString("utf8"));
  const rootPackage = lockfile.packages?.[""];
  if (!rootPackage?.name) fail("package-lock.json is missing its root package name");

  // npm requires a versioned root package to create a valid root PURL. The repository's
  // package metadata is intentionally unversioned, so only this temporary input receives
  // a synthetic application version; dependency resolutions remain from package-lock.json.
  rootPackage.version ||= "0.0.0";
  const stagingDirectory = await createPrivateStagingDirectory(outputDirectory, options);
  try {
    try {
      await writeFreshFile(
        stagingDirectory.handle,
        "package.json",
        `${JSON.stringify({ name: rootPackage.name, version: rootPackage.version, private: true })}\n`
      );
      await writeFreshFile(
        stagingDirectory.handle,
        "package-lock.json",
        `${JSON.stringify(lockfile)}\n`
      );
    } catch {
      fail("Unable to prepare secure SBOM input files");
    }
    const npm = npmInvocation();
    const result = spawnSync(
      npm.command,
      [...npm.prefix, "sbom", "--sbom-format", "cyclonedx", "--package-lock-only"],
      { cwd: descriptorDirectoryPath(stagingDirectory.handle), encoding: "utf8" }
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
    await removePrivateStagingDirectory(outputDirectory, stagingDirectory);
  }
}

async function writePublishedJson(outputDirectory, filename, contents, options) {
  await inspectOutputFile(outputDirectory, filename);
  let temporaryFilename;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = randomName(`.${filename}.`, ".tmp");
    try {
      await writeFreshFile(outputDirectory.handle, candidate, contents);
      temporaryFilename = candidate;
      break;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
  }
  if (!temporaryFilename) fail(`Unable to allocate a fresh output file: ${filename}`);
  try {
    await invokeTestHook(options, "beforeOutputPublish", {
      filename,
      output: outputDirectory.relative,
    });
    await rename(
      descriptorEntryPath(outputDirectory.handle, temporaryFilename),
      descriptorEntryPath(outputDirectory.handle, filename)
    );
  } catch (error) {
    await unlinkIfPresent(outputDirectory.handle, temporaryFilename);
    throw error;
  }
}

export async function createReleaseMetadata(argv = process.argv.slice(2), options = {}) {
  const { artifacts, output } = parseArguments(argv);
  const repositoryRoot = process.cwd();
  const rootHandle = await openRepositoryRoot();
  let outputDirectory;
  try {
    outputDirectory = await outputDirectoryInsideRepository(
      rootHandle,
      repositoryRoot,
      output,
      options
    );
    const checksums = await Promise.all(
      artifacts.map((artifact) => checksumArtifact(rootHandle, repositoryRoot, artifact, options))
    );
    checksums.sort((left, right) => left.path.localeCompare(right.path));
    const commit = gitCommit(rootHandle);
    const sbom = await packageLockCycloneDx(rootHandle, outputDirectory, commit, options);
    const manifest = {
      schemaVersion: 1,
      gitCommit: commit,
      inventory: "npm package-lock only; excludes native Android components and build attestations",
      artifacts: checksums,
    };
    await writePublishedJson(outputDirectory, "sbom.cdx.json", `${JSON.stringify(sbom, null, 2)}\n`, options);
    await writePublishedJson(
      outputDirectory,
      "checksums.json",
      `${JSON.stringify(manifest, null, 2)}\n`,
      options
    );
    console.log(`Wrote metadata for ${checksums.length} artifact(s) at commit ${commit}`);
  } finally {
    await closeOwnedDirectory(outputDirectory ?? { owned: false });
    await rootHandle.close();
  }
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  await createReleaseMetadata();
}
