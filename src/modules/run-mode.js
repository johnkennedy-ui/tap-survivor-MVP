export const DEFAULT_RUN_MODE = "climb";

export function normalizeRunMode(value) {
  return value === "farm" ? "farm" : DEFAULT_RUN_MODE;
}
