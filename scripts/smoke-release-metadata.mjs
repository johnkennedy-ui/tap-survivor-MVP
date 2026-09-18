import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
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
    /Artifact resolves outside the repository/
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
    /Output directory resolves outside the repository/
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
