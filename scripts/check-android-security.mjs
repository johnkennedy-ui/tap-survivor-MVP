#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const failures = [];

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) failures.push(message);
}

function forbidMatch(source, pattern, message) {
  if (pattern.test(source)) failures.push(message);
}

const manifest = read("android/app/src/main/AndroidManifest.xml");
const capacitorConfig = JSON.parse(read("capacitor.config.json"));
const wrapperProperties = read("android/gradle/wrapper/gradle-wrapper.properties");
const appGradle = read("android/app/build.gradle");
const packageJson = JSON.parse(read("package.json"));

requireMatch(
  manifest,
  /<application\b[^>]*\bandroid:allowBackup="true"/s,
  "Android backup policy changed: allowBackup=true must remain until device evidence authorizes a change."
);
requireMatch(
  manifest,
  /<application\b[^>]*\bandroid:usesCleartextTraffic="false"/s,
  "Cleartext traffic must be explicitly disabled for the production WebView."
);
requireMatch(
  manifest,
  /<activity\b[\s\S]*?android:name="\.MainActivity"[\s\S]*?android:exported="true"[\s\S]*?<action android:name="android\.intent\.action\.MAIN"\s*\/>[\s\S]*?<category android:name="android\.intent\.category\.LAUNCHER"\s*\/>/,
  "MainActivity must be the exported launcher activity."
);
requireMatch(
  manifest,
  /<provider\b[\s\S]*?android:name="androidx\.core\.content\.FileProvider"[\s\S]*?android:exported="false"/,
  "FileProvider must remain non-exported."
);

const exportedComponents = [
  ...manifest.matchAll(
    /<(activity|activity-alias|service|receiver|provider)\b[^>]*\bandroid:exported="true"/g
  ),
];
if (exportedComponents.length !== 1 || exportedComponents[0][1] !== "activity") {
  failures.push("Only the launcher activity may be exported by the app manifest.");
}
for (const [tag] of manifest.matchAll(
  /<(?:activity|activity-alias|service|receiver|provider)\b[^>]*>/g
)) {
  if (!tag.includes('android:name=".MainActivity"') && !tag.includes('android:exported="false"')) {
    failures.push("Non-launcher components must explicitly disable exporting.");
  }
}

const permissions = [...manifest.matchAll(/<uses-permission\b[^>]*\bandroid:name="([^"]+)"/g)].map(
  (match) => match[1]
);
if (permissions.length !== 1 || permissions[0] !== "android.permission.INTERNET") {
  failures.push("Only the retained INTERNET permission is permitted pending device verification.");
}

if (capacitorConfig.server?.androidScheme !== "https") {
  failures.push("Capacitor androidScheme must remain https.");
}
if (
  capacitorConfig.server?.url ||
  capacitorConfig.server?.allowNavigation ||
  capacitorConfig.allowNavigation
) {
  failures.push(
    "Remote server URLs and allowNavigation are not permitted in Capacitor configuration."
  );
}
if (
  capacitorConfig.server?.cleartext === true ||
  capacitorConfig.android?.allowMixedContent === true ||
  capacitorConfig.android?.webContentsDebuggingEnabled === true
) {
  failures.push("Production cleartext, mixed content and WebView debugging must remain disabled.");
}
const plugins = Object.keys(packageJson.dependencies || {})
  .filter(
    (name) =>
      name.startsWith("@capacitor/") && !["@capacitor/core", "@capacitor/android"].includes(name)
  )
  .sort();
if (JSON.stringify(plugins) !== JSON.stringify(["@capacitor/app", "@capacitor/preferences"])) {
  failures.push("Capacitor plugin set changed without a security review.");
}

forbidMatch(
  manifest,
  /android:debuggable="true"/,
  "Debuggable must not be enabled in the main manifest."
);
forbidMatch(
  appGradle,
  /debuggable\s+true/,
  "Debuggable must not be enabled through app Gradle configuration."
);
requireMatch(
  wrapperProperties,
  /distributionUrl=.*gradle-8\.14\.3-all\.zip/,
  "Gradle wrapper must remain on the reviewed 8.14.3 distribution."
);
requireMatch(
  wrapperProperties,
  /^distributionSha256Sum=ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c$/m,
  "Gradle distribution integrity must match the reviewed official checksum."
);
const wrapperDigest = createHash("sha256")
  .update(readFileSync(new URL("../android/gradle/wrapper/gradle-wrapper.jar", import.meta.url)))
  .digest("hex");
if (wrapperDigest !== "7d3a4ac4de1c32b59bc6a4eb8ecb8e612ccd0cf1ae1e99f66902da64df296172") {
  failures.push("Gradle wrapper JAR must match the reviewed official checksum.");
}

const trackedFiles = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n");
const forbiddenTrackedName =
  /(^|\/)(?:\.env(?:\..*)?|[^/]+\.(?:env|key|jks|keystore|p12|pfx|pem)|key\.properties|service-account[^/]*\.json|google-services\.json)$/i;
// Filename permission is not content approval: Gitleaks still scans templates.
const safeEnvExample = /(^|\/)\.env(?:\.[^/]+)?\.example$/i;
if (trackedFiles.some((path) => forbiddenTrackedName.test(path) && !safeEnvExample.test(path))) {
  failures.push("Tracked signing, environment, or Google services secret file detected.");
}

if (failures.length) {
  console.error("Android security guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Android security guard passed.");
}
