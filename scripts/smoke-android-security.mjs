import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const files = [
  "scripts/check-android-security.mjs",
  "android/app/src/main/AndroidManifest.xml",
  "capacitor.config.json",
  "android/gradle/wrapper/gradle-wrapper.properties",
  "android/gradle/wrapper/gradle-wrapper.jar",
  "android/app/build.gradle",
  "package.json",
];
const originals = Object.fromEntries(
  files.map((path) => [
    path,
    readFileSync(
      new URL(`../${path}`, import.meta.url),
      path.endsWith(".jar") ? undefined : "utf8"
    ),
  ])
);
const manifest = "android/app/src/main/AndroidManifest.xml";
const cases = [
  ["reviewed candidate", {}, 0],
  [
    "wrapper JAR mutation",
    { "android/gradle/wrapper/gradle-wrapper.jar": "synthetic invalid wrapper" },
    1,
  ],
  [
    "missing distribution checksum",
    {
      "android/gradle/wrapper/gradle-wrapper.properties": originals[
        "android/gradle/wrapper/gradle-wrapper.properties"
      ].replace(/^distributionSha256Sum=.*\n/m, ""),
    },
    1,
  ],
  [
    "cleartext",
    {
      [manifest]: originals[manifest].replace(
        'usesCleartextTraffic="false"',
        'usesCleartextTraffic="true"'
      ),
    },
    1,
  ],
  [
    "extra exported service",
    {
      [manifest]: originals[manifest].replace(
        "</application>",
        '<service android:name=".Unsafe" android:exported="true" /></application>'
      ),
    },
    1,
  ],
  [
    "implicit component export",
    {
      [manifest]: originals[manifest].replace(
        "</application>",
        '<receiver android:name=".Implicit"><intent-filter /></receiver></application>'
      ),
    },
    1,
  ],
  [
    "provider export",
    {
      [manifest]: originals[manifest].replace(
        'android:exported="false"',
        'android:exported="true"'
      ),
    },
    1,
  ],
  [
    "extra permission",
    {
      [manifest]: originals[manifest].replace(
        "</manifest>",
        '<uses-permission android:name="android.permission.CAMERA" /></manifest>'
      ),
    },
    1,
  ],
  [
    "release debugging",
    {
      "android/app/build.gradle":
        originals["android/app/build.gradle"] + "\n// mutation\ndebuggable true\n",
    },
    1,
  ],
];
for (const change of [
  { server: { url: "https://example.invalid" } },
  { server: { allowNavigation: ["*"] } },
  { server: { cleartext: true } },
  { android: { allowMixedContent: true } },
  { android: { webContentsDebuggingEnabled: true } },
]) {
  const config = JSON.parse(originals["capacitor.config.json"]);
  for (const [key, value] of Object.entries(change)) config[key] = { ...config[key], ...value };
  cases.push([JSON.stringify(change), { "capacitor.config.json": JSON.stringify(config) }, 1]);
}
for (const path of [
  ".env",
  ".env.production",
  "private.key",
  "signing.pfx",
  "settings.env",
  "service-account-test.json",
  "google-services.json",
])
  cases.push([`sensitive filename ${path}`, { [path]: "synthetic filename fixture only\n" }, 1]);
for (const path of [".env.example", ".env.production.example"])
  cases.push([`safe template ${path}`, { [path]: "# placeholder template only\n" }, 0]);
const pluginChange = JSON.parse(originals["package.json"]);
pluginChange.dependencies["@capacitor/camera"] = "0.0.0";
cases.push(["unreviewed plugin", { "package.json": JSON.stringify(pluginChange) }, 1]);

// Each fixture is isolated, synthetic and retained for failure diagnosis.
const root = mkdtempSync(join(tmpdir(), "tap-android-security-"));
for (const [index, [name, overrides, expected]] of cases.entries()) {
  const fixture = join(root, String(index));
  mkdirSync(fixture);
  for (const [path, contents] of Object.entries({ ...originals, ...overrides })) {
    const target = join(fixture, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
  execFileSync("git", ["init", "--quiet"], { cwd: fixture });
  execFileSync("git", ["add", "--", "."], { cwd: fixture });
  const result = spawnSync(process.execPath, ["scripts/check-android-security.mjs"], {
    cwd: fixture,
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(result.status, expected, `${name}: ${result.stderr || result.stdout}`);
  console.log(`PASS Android guard: ${name}`);
}
console.log(`PASS ${cases.length} Android security controls; fixture root ${root}`);
