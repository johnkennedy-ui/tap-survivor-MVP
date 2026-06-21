import { join, resolve } from "node:path";

export const root = new URL("../..", import.meta.url).pathname;
export const contentPath = process.env.TAP_SURVIVOR_CONTENT_PATH
  ? resolve(process.env.TAP_SURVIVOR_CONTENT_PATH)
  : join(root, "content/tap-survivor-content.json");
export const registryDir = process.env.TAP_SURVIVOR_REGISTRY_DIR
  ? resolve(process.env.TAP_SURVIVOR_REGISTRY_DIR)
  : join(root, "content/registry");
export const balanceDir = process.env.TAP_SURVIVOR_BALANCE_DIR
  ? resolve(process.env.TAP_SURVIVOR_BALANCE_DIR)
  : join(root, "content/balance");
export const schemaPath = process.env.TAP_SURVIVOR_SCHEMA_PATH
  ? resolve(process.env.TAP_SURVIVOR_SCHEMA_PATH)
  : join(root, "content/tap-survivor-schema.json");
export const defaultBalanceProfile = process.env.TAP_SURVIVOR_BALANCE_PROFILE || "default";
