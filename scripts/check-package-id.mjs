#!/usr/bin/env node

import { readFileSync } from "node:fs";

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function matchGradleValue(source, pattern, label) {
  const match = source.match(pattern);
  if (!match) {
    fail(`missing ${label}`);
    return null;
  }
  return match[1];
}

const capacitorConfig = readJson("capacitor.config.json");
const buildGradle = readFileSync("android/app/build.gradle", "utf8");

const appId = capacitorConfig.appId;
const namespace = matchGradleValue(
  buildGradle,
  /^\s*namespace\s*=\s*["']([^"']+)["']/m,
  "android namespace",
);
const applicationId = matchGradleValue(
  buildGradle,
  /^\s*applicationId\s+["']([^"']+)["']/m,
  "android applicationId",
);

console.log("# Tap Survivor Package ID Check");
console.log(`capacitor appId: ${appId}`);
console.log(`android namespace: ${namespace}`);
console.log(`android applicationId: ${applicationId}`);

if (!appId) {
  fail("capacitor.config.json appId is missing");
}

if (namespace && appId && namespace !== appId) {
  fail(`android namespace ${namespace} does not match capacitor appId ${appId}`);
}

if (applicationId && appId && applicationId !== appId) {
  fail(
    `android applicationId ${applicationId} does not match capacitor appId ${appId}`,
  );
}

if (process.exitCode) {
  console.error("Package ID check failed.");
} else {
  console.log("PASS package IDs match");
}
