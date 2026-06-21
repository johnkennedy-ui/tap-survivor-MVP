import { readFileSync } from "node:fs";
import { schemaPath } from "./content-paths.mjs";

/** @typedef {import("./content-types.mjs").ContentSchema} ContentSchema */
/** @typedef {import("./content-types.mjs").ContentEntry} ContentEntry */
/** @typedef {import("./content-types.mjs").ParsedArgs} ParsedArgs */

/** @returns {ContentSchema} */
export function readContentSchema() {
  return JSON.parse(readFileSync(schemaPath, "utf8"));
}

/**
 * @param {Record<string, ContentEntry>} quests
 * @param {string} previousId
 * @param {string} nextId
 */
export function linkQuestAfter(quests, previousId, nextId) {
  const previous = quests?.[previousId];
  if (!previous) throw new Error(`Missing --after quest: ${previousId}`);
  if (!quests?.[nextId]) throw new Error(`Missing follow-up quest: ${nextId}`);
  if (previous.opensQuest === nextId || (previous.opensQuests || []).includes(nextId)) return;
  if (!previous.opensQuest) {
    previous.opensQuest = nextId;
    return;
  }
  previous.opensQuests = [...new Set([...(previous.opensQuests || []), nextId])];
}

/** @param {string[]} args */
export function parseArgs(args) {
  /** @type {ParsedArgs} */
  const parsed = { _: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      parsed._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}
