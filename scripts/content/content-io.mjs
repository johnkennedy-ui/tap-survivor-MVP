import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { applyBalanceProfile } from "./balance-overlays.mjs";
import { assembleRegistryContent, writeRegistryContent } from "./content-assembly.mjs";
import { contentPath, defaultBalanceProfile, registryDir } from "./content-paths.mjs";

/** @typedef {import("./content-types.mjs").ContentRecord} ContentRecord */

/** @returns {ContentRecord} */
export function readContent() {
  const content = process.env.TAP_SURVIVOR_CONTENT_PATH || !existsSync(registryDir)
    ? JSON.parse(readFileSync(contentPath, "utf8"))
    : assembleRegistryContent();
  return applyBalanceProfile(content, defaultBalanceProfile);
}

/** @param {ContentRecord} content */
export function writeContent(content) {
  if (!process.env.TAP_SURVIVOR_CONTENT_PATH && existsSync(registryDir)) {
    writeRegistryContent(content);
  }
  writeFileSync(contentPath, `${JSON.stringify(content, null, 2)}\n`);
}
