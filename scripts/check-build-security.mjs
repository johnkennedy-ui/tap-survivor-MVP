import assert from "node:assert/strict";
import { isForbiddenRuntimePath } from "./build-web.mjs";

for (const file of [
  ".env",
  ".env.local",
  "settings.env",
  "release.key",
  "key.properties",
  "cert.pem",
]) {
  assert.equal(isForbiddenRuntimePath(`assets/${file}`), true, `${file} must be excluded`);
}

for (const file of ["key-art.svg", "env-banner.png", "keyboard.png", "environment-map.webp"]) {
  assert.equal(
    isForbiddenRuntimePath(`assets/${file}`),
    false,
    `${file} is not a sensitive filename`
  );
}

console.log("Build security filename rules passed");
