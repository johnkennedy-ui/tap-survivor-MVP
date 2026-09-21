import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, mkdtemp, open, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReleaseMetadata } from "./release-metadata.mjs";

const repositoryRoot = process.cwd();
await mkdir(path.join(repositoryRoot, "tmp"), { recursive: true });
const fixtureDirectory = await mkdtemp(path.join(repositoryRoot, "tmp/release-metadata-smoke-"));
const taskRoot = path.dirname(repositoryRoot);
await mkdir(path.join(taskRoot, "output"), { recursive: true });
const externalFixtureDirectory = await mkdtemp(
  path.join(taskRoot, "output/release-metadata-external-")
);
const artifactPath = path.join(fixtureDirectory, "artifact.txt");
const outputPath = path.join(fixtureDirectory, "metadata");
const descriptorDirectoryFlags = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;

try {
  const artifactContents = "Tap Survivor release metadata smoke fixture\n";
  await writeFile(artifactPath, artifactContents);
  await createReleaseMetadata([
    "--artifact",
    path.relative(repositoryRoot, artifactPath),
    "--output",
    path.relative(repositoryRoot, outputPath),
  ]);
  const manifest = JSON.parse(await readFile(path.join(outputPath, "checksums.json"), "utf8"));
  const sbom = JSON.parse(await readFile(path.join(outputPath, "sbom.cdx.json"), "utf8"));
  assert.match(manifest.gitCommit, /^[0-9a-f]{40}$/);
  assert.equal(manifest.artifacts.length, 1);
  assert.equal(manifest.artifacts[0].path.endsWith("artifact.txt"), true);
  assert.equal(
    manifest.artifacts[0].sha256,
    createHash("sha256").update(artifactContents).digest("hex")
  );
  assert.match(manifest.inventory, /^npm package-lock only;/);
  assert.equal(sbom.bomFormat, "CycloneDX");
  assert.equal(
    sbom.metadata.properties.find((property) => property.name === "tap-survivor.git.commit").value,
    manifest.gitCommit
  );
  assert.equal(
    sbom.metadata.properties.find((property) => property.name === "tap-survivor.inventory.scope")
      .value,
    "npm package-lock only"
  );
  assert.equal(
    sbom.components.some(
      (component) =>
        component.name === "@capacitor/android" &&
        component.purl === "pkg:npm/%40capacitor/android@8.4.0"
    ),
    true
  );
  assert.equal(
    sbom.dependencies.some(
      (dependency) => Array.isArray(dependency.dependsOn) && dependency.dependsOn.length > 0
    ),
    true
  );

  const externalArtifact = path.join(externalFixtureDirectory, "artifact.txt");
  const externalArtifactContents = "external artifact target\n";
  await writeFile(externalArtifact, externalArtifactContents);
  const artifactSymlink = path.join(fixtureDirectory, "outside-artifact.txt");
  await symlink(externalArtifact, artifactSymlink);
  await assert.rejects(
    createReleaseMetadata([
      "--artifact",
      path.relative(repositoryRoot, artifactSymlink),
      "--output",
      path.relative(repositoryRoot, outputPath),
    ]),
    /Artifact cannot be opened securely/
  );
  assert.equal(await readFile(externalArtifact, "utf8"), externalArtifactContents);

  const outputSymlink = path.join(fixtureDirectory, "outside-output");
  const externalOutput = path.join(externalFixtureDirectory, "metadata");
  await mkdir(externalOutput);
  await symlink(externalOutput, outputSymlink);
  await assert.rejects(
    createReleaseMetadata([
      "--artifact",
      path.relative(repositoryRoot, artifactPath),
      "--output",
      path.relative(repositoryRoot, outputSymlink),
    ]),
    /Output directory cannot be opened securely/
  );
  assert.deepEqual(await readdir(externalOutput), []);

  const checksumTarget = path.join(externalFixtureDirectory, "checksums.json");
  const checksumContents = "external checksum target\n";
  await writeFile(checksumTarget, checksumContents);
  await rm(path.join(outputPath, "checksums.json"));
  await symlink(checksumTarget, path.join(outputPath, "checksums.json"));
  await assert.rejects(
    createReleaseMetadata([
      "--artifact",
      path.relative(repositoryRoot, artifactPath),
      "--output",
      path.relative(repositoryRoot, outputPath),
    ]),
    /Output file must not be a symbolic link/
  );
  assert.equal(await readFile(checksumTarget, "utf8"), checksumContents);
  await rm(path.join(outputPath, "checksums.json"));

  const sbomTarget = path.join(externalFixtureDirectory, "sbom.cdx.json");
  const sbomContents = "external SBOM target\n";
  await writeFile(sbomTarget, sbomContents);
  await rm(path.join(outputPath, "sbom.cdx.json"));
  await symlink(sbomTarget, path.join(outputPath, "sbom.cdx.json"));
  await assert.rejects(
    createReleaseMetadata([
      "--artifact",
      path.relative(repositoryRoot, artifactPath),
      "--output",
      path.relative(repositoryRoot, outputPath),
    ]),
    /Output file must not be a symbolic link/
  );
  assert.equal(await readFile(sbomTarget, "utf8"), sbomContents);
  await rm(path.join(outputPath, "sbom.cdx.json"));

  await createReleaseMetadata([
    "--artifact",
    path.relative(repositoryRoot, artifactPath),
    "--output",
    path.relative(repositoryRoot, outputPath),
  ]);
  assert.equal(
    JSON.parse(await readFile(path.join(outputPath, "checksums.json"), "utf8")).artifacts[0].sha256,
    createHash("sha256").update(artifactContents).digest("hex")
  );

  const artifactRaceDirectory = path.join(fixtureDirectory, "artifact-ancestor-race");
  const artifactRaceParent = path.join(artifactRaceDirectory, "parent");
  const artifactRaceMoved = path.join(artifactRaceDirectory, "parent-held");
  const artifactRacePath = path.join(artifactRaceParent, "artifact.txt");
  const artifactRaceContents = "descriptor-held artifact bytes\n";
  const externalArtifactRaceDirectory = path.join(externalFixtureDirectory, "artifact-race-target");
  const externalArtifactRacePath = path.join(externalArtifactRaceDirectory, "artifact.txt");
  const externalArtifactRaceContents = "outside artifact bytes\n";
  await mkdir(artifactRaceParent, { recursive: true });
  await mkdir(externalArtifactRaceDirectory);
  await writeFile(artifactRacePath, artifactRaceContents);
  await writeFile(externalArtifactRacePath, externalArtifactRaceContents);
  let artifactAncestorSwapped = false;
  await createReleaseMetadata(
    [
      "--artifact",
      path.relative(repositoryRoot, artifactRacePath),
      "--output",
      path.relative(repositoryRoot, outputPath),
    ],
    {
      async afterDirectoryOpen(context) {
        if (
          !artifactAncestorSwapped &&
          context.label === "Artifact" &&
          context.relative === path.relative(repositoryRoot, artifactRaceParent)
        ) {
          await rename(artifactRaceParent, artifactRaceMoved);
          await symlink(externalArtifactRaceDirectory, artifactRaceParent);
          artifactAncestorSwapped = true;
        }
      },
    }
  );
  assert.equal(artifactAncestorSwapped, true);
  const artifactRaceManifest = JSON.parse(
    await readFile(path.join(outputPath, "checksums.json"), "utf8")
  );
  assert.equal(
    artifactRaceManifest.artifacts[0].sha256,
    createHash("sha256").update(artifactRaceContents).digest("hex")
  );
  assert.equal(await readFile(externalArtifactRacePath, "utf8"), externalArtifactRaceContents);

  const artifactLeafRaceDirectory = path.join(fixtureDirectory, "artifact-leaf-race");
  const artifactLeafRacePath = path.join(artifactLeafRaceDirectory, "artifact.txt");
  const externalArtifactLeafRacePath = path.join(externalFixtureDirectory, "artifact-leaf-target.txt");
  const externalArtifactLeafContents = "outside artifact leaf bytes\n";
  await mkdir(artifactLeafRaceDirectory);
  await writeFile(artifactLeafRacePath, "inside artifact leaf bytes\n");
  await writeFile(externalArtifactLeafRacePath, externalArtifactLeafContents);
  let artifactLeafSwapped = false;
  await assert.rejects(
    createReleaseMetadata(
      [
        "--artifact",
        path.relative(repositoryRoot, artifactLeafRacePath),
        "--output",
        path.relative(repositoryRoot, outputPath),
      ],
      {
        async beforeFileOpen(context) {
          if (
            !artifactLeafSwapped &&
            context.label === "Artifact" &&
            context.relative === path.relative(repositoryRoot, artifactLeafRacePath)
          ) {
            await rm(artifactLeafRacePath);
            await symlink(externalArtifactLeafRacePath, artifactLeafRacePath);
            artifactLeafSwapped = true;
          }
        },
      }
    ),
    /Artifact cannot be opened securely/
  );
  assert.equal(artifactLeafSwapped, true);
  assert.equal(await readFile(externalArtifactLeafRacePath, "utf8"), externalArtifactLeafContents);

  const stagingOutputRace = path.join(fixtureDirectory, "staging-mkdir-race");
  const externalStagingRace = path.join(externalFixtureDirectory, "staging-mkdir-target");
  const externalStagingSentinel = path.join(externalStagingRace, "sentinel.txt");
  const externalStagingSentinelContents = "outside staging sentinel\n";
  await mkdir(externalStagingRace);
  await writeFile(externalStagingSentinel, externalStagingSentinelContents);
  let stagingBeforeReopenSwapped = false;
  await assert.rejects(
    createReleaseMetadata(
      [
        "--artifact",
        path.relative(repositoryRoot, artifactPath),
        "--output",
        path.relative(repositoryRoot, stagingOutputRace),
      ],
      {
        async afterDirectoryCreateBeforeOpen(context) {
          if (!stagingBeforeReopenSwapped && context.label === "SBOM staging directory") {
            const stagingPath = path.join(repositoryRoot, context.relative);
            await rename(stagingPath, `${stagingPath}-held`);
            await symlink(externalStagingRace, stagingPath);
            stagingBeforeReopenSwapped = true;
          }
        },
      }
    ),
    /SBOM staging directory cannot be opened securely/
  );
  assert.equal(stagingBeforeReopenSwapped, true);
  assert.equal(await readFile(externalStagingSentinel, "utf8"), externalStagingSentinelContents);
  assert.deepEqual(await readdir(externalStagingRace), ["sentinel.txt"]);

  const outputAncestorRace = path.join(fixtureDirectory, "output-ancestor-race");
  const outputAncestorRaceMoved = path.join(fixtureDirectory, "output-ancestor-race-held");
  const externalOutputAncestorRace = path.join(externalFixtureDirectory, "output-ancestor-race-target");
  await mkdir(externalOutputAncestorRace);
  let outputAncestorSwapped = false;
  await createReleaseMetadata(
    [
      "--artifact",
      path.relative(repositoryRoot, artifactPath),
      "--output",
      path.relative(repositoryRoot, outputAncestorRace),
    ],
    {
      async afterDirectoryOpen(context) {
        if (
          !outputAncestorSwapped &&
          context.label === "Output directory" &&
          context.relative === path.relative(repositoryRoot, outputAncestorRace)
        ) {
          await rename(outputAncestorRace, outputAncestorRaceMoved);
          await symlink(externalOutputAncestorRace, outputAncestorRace);
          outputAncestorSwapped = true;
        }
      },
    }
  );
  assert.equal(outputAncestorSwapped, true);
  assert.equal(
    JSON.parse(await readFile(path.join(outputAncestorRaceMoved, "checksums.json"), "utf8")).artifacts[0]
      .sha256,
    createHash("sha256").update(artifactContents).digest("hex")
  );
  assert.deepEqual(await readdir(externalOutputAncestorRace), []);

  const mkdirRace = path.join(fixtureDirectory, "mkdir-before-reopen-race");
  const mkdirRaceMoved = path.join(fixtureDirectory, "mkdir-before-reopen-race-held");
  const externalMkdirRace = path.join(externalFixtureDirectory, "mkdir-before-reopen-target");
  const externalMkdirSentinel = path.join(externalMkdirRace, "sentinel.txt");
  const externalMkdirSentinelContents = "outside mkdir sentinel\n";
  await mkdir(externalMkdirRace);
  await writeFile(externalMkdirSentinel, externalMkdirSentinelContents);
  let mkdirBeforeReopenSwapped = false;
  await assert.rejects(
    createReleaseMetadata(
      [
        "--artifact",
        path.relative(repositoryRoot, artifactPath),
        "--output",
        path.relative(repositoryRoot, path.join(mkdirRace, "nested")),
      ],
      {
        async afterDirectoryCreateBeforeOpen(context) {
          if (
            !mkdirBeforeReopenSwapped &&
            context.label === "Output directory" &&
            context.relative === path.relative(repositoryRoot, mkdirRace)
          ) {
            await rename(mkdirRace, mkdirRaceMoved);
            await symlink(externalMkdirRace, mkdirRace);
            mkdirBeforeReopenSwapped = true;
          }
        },
      }
    ),
    /Output directory cannot be opened securely/
  );
  assert.equal(mkdirBeforeReopenSwapped, true);
  assert.equal(await readFile(externalMkdirSentinel, "utf8"), externalMkdirSentinelContents);
  assert.deepEqual(await readdir(externalMkdirRace), ["sentinel.txt"]);

  const leafOutputRace = path.join(fixtureDirectory, "output-leaf-race");
  const externalLeafTarget = path.join(externalFixtureDirectory, "checksums-leaf-target.json");
  const externalLeafContents = "external checksum leaf target\n";
  await writeFile(externalLeafTarget, externalLeafContents);
  await createReleaseMetadata([
    "--artifact",
    path.relative(repositoryRoot, artifactPath),
    "--output",
    path.relative(repositoryRoot, leafOutputRace),
  ]);
  let outputLeafSwapped = false;
  await createReleaseMetadata(
    [
      "--artifact",
      path.relative(repositoryRoot, artifactPath),
      "--output",
      path.relative(repositoryRoot, leafOutputRace),
    ],
    {
      async beforeOutputPublish(context) {
        if (!outputLeafSwapped && context.filename === "checksums.json") {
          await rm(path.join(leafOutputRace, "checksums.json"));
          await symlink(externalLeafTarget, path.join(leafOutputRace, "checksums.json"));
          outputLeafSwapped = true;
        }
      },
    }
  );
  assert.equal(outputLeafSwapped, true);
  assert.equal(await readFile(externalLeafTarget, "utf8"), externalLeafContents);
  assert.equal((await lstat(path.join(leafOutputRace, "checksums.json"))).isSymbolicLink(), false);
  assert.equal(
    JSON.parse(await readFile(path.join(leafOutputRace, "checksums.json"), "utf8")).artifacts[0]
      .sha256,
    createHash("sha256").update(artifactContents).digest("hex")
  );

  const relocationDirectory = path.join(fixtureDirectory, "descriptor-relocation-limit");
  const relocationMoved = path.join(fixtureDirectory, "descriptor-relocation-limit-held");
  const relocationReplacement = path.join(fixtureDirectory, "descriptor-relocation-limit");
  const relocationFile = "still-held.txt";
  await mkdir(relocationDirectory);
  const heldDirectory = await open(relocationDirectory, descriptorDirectoryFlags);
  try {
    await rename(relocationDirectory, relocationMoved);
    await mkdir(relocationReplacement);
    await writeFile(`/proc/self/fd/${heldDirectory.fd}/${relocationFile}`, "held descriptor bytes\n");
  } finally {
    await heldDirectory.close();
  }
  assert.equal(
    await readFile(path.join(relocationMoved, relocationFile), "utf8"),
    "held descriptor bytes\n"
  );
  assert.equal((await readdir(relocationReplacement)).includes(relocationFile), false);
  console.log("Release metadata descriptor relocation limitation demonstrated");

  const coldRoot = path.join(fixtureDirectory, "cold-checkout");
  await mkdir(coldRoot);
  await writeFile(
    path.join(coldRoot, "package-lock.json"),
    await readFile(path.join(repositoryRoot, "package-lock.json"))
  );
  await writeFile(path.join(coldRoot, "artifact.txt"), artifactContents);
  execFileSync("git", ["init", "--quiet"], { cwd: coldRoot });
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Test Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "--quiet",
      "--allow-empty",
      "-m",
      "Synthetic metadata fixture",
    ],
    { cwd: coldRoot }
  );
  const coldResult = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("./release-metadata.mjs", import.meta.url)),
      "--artifact",
      "artifact.txt",
      "--output",
      "brand-new/nested",
    ],
    { cwd: coldRoot, encoding: "utf8", timeout: 20000 }
  );
  assert.equal(coldResult.status, 0, coldResult.stderr || coldResult.stdout);
  const coldManifest = JSON.parse(
    await readFile(path.join(coldRoot, "brand-new/nested/checksums.json"), "utf8")
  );
  assert.equal(
    coldManifest.artifacts[0].sha256,
    createHash("sha256").update(artifactContents).digest("hex")
  );
  console.log("Release metadata cold-output CLI regression passed");
  console.log("Release metadata smoke test passed");
} finally {
  await rm(fixtureDirectory, { recursive: true, force: true });
  await rm(externalFixtureDirectory, { recursive: true, force: true });
}
