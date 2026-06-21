import { join, resolve } from "node:path";

/** @type {string} */
export const root = new URL("../..", import.meta.url).pathname;
/** @type {string} */
export const contentPath = process.env.TAP_SURVIVOR_CONTENT_PATH
  ? resolve(process.env.TAP_SURVIVOR_CONTENT_PATH)
  : join(root, "content/tap-survivor-content.json");
/** @type {string} */
export const registryDir = process.env.TAP_SURVIVOR_REGISTRY_DIR
  ? resolve(process.env.TAP_SURVIVOR_REGISTRY_DIR)
  : join(root, "content/registry");
/** @type {string} */
export const balanceDir = process.env.TAP_SURVIVOR_BALANCE_DIR
  ? resolve(process.env.TAP_SURVIVOR_BALANCE_DIR)
  : join(root, "content/balance");
/** @type {string} */
export const schemaPath = process.env.TAP_SURVIVOR_SCHEMA_PATH
  ? resolve(process.env.TAP_SURVIVOR_SCHEMA_PATH)
  : join(root, "content/tap-survivor-schema.json");
/** @type {string} */
export const defaultBalanceProfile = process.env.TAP_SURVIVOR_BALANCE_PROFILE || "default";
