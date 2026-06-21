import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { contentPath, registryDir } from "./content-paths.mjs";

/** @typedef {import("./content-types.mjs").ContentRecord} ContentRecord */
/** @typedef {import("./content-types.mjs").JsonValue} JsonValue */

/** @type {string[]} */
const domainFiles = [
  "weapons",
  "run-upgrades",
  "quests",
  "enemies",
  "bosses",
  "characters",
  "shop-items",
  "floors",
  "assets",
  "audio",
  "relics",
  "maps",
  "tuning",
];

/** @returns {ContentRecord} */
export function assembleRegistryContent() {
  /** @type {ContentRecord} */
  const legacy = existsSync(contentPath) ? JSON.parse(readFileSync(contentPath, "utf8")) : {};
  /** @type {ContentRecord} */
  const content = { schemaVersion: legacy.schemaVersion || 1 };
  domainFiles.forEach((name) => {
    const file = join(registryDir, `${name}.json`);
    if (!existsSync(file)) return;
    deepMerge(content, JSON.parse(readFileSync(file, "utf8")));
  });
  content.assets ||= {};
  content.maps ||= [];
  content.tuning ||= {};
  return content;
}

/** @param {ContentRecord} content */
export function writeRegistryContent(content) {
  mkdirSync(registryDir, { recursive: true });
  writeJson(join(registryDir, "weapons.json"), {
    weapons: content.weapons || {},
    weaponUnlocks: content.weaponUnlocks || [],
    metaUpgrades: content.metaUpgrades || [],
  });
  writeJson(join(registryDir, "relics.json"), { relics: content.relics || [] });
  writeJson(join(registryDir, "shop-items.json"), { shopItems: content.shopItems || [] });
  writeJson(join(registryDir, "run-upgrades.json"), { runUpgrades: content.runUpgrades || [] });
  writeJson(join(registryDir, "enemies.json"), { enemyTypes: content.enemyTypes || [] });
  writeJson(join(registryDir, "bosses.json"), {
    bossConfig: content.bossConfig || {},
    bossAbilities: content.bossAbilities || {},
  });
  writeJson(join(registryDir, "floors.json"), { levels: content.levels || [] });
  writeJson(join(registryDir, "maps.json"), { maps: content.maps || [] });
  writeJson(join(registryDir, "quests.json"), {
    quests: content.quests || {},
    questGroups: content.questGroups || {},
  });
  writeJson(join(registryDir, "characters.json"), { characters: content.characters || [] });
  writeJson(join(registryDir, "assets.json"), {
    assets: {
      sources: content.assets?.sources || [],
      sprites: content.assets?.sprites || {},
    },
  });
  writeJson(join(registryDir, "audio.json"), { assets: { sfx: content.assets?.sfx || {} } });
  writeJson(join(registryDir, "tuning.json"), { tuning: content.tuning || {} });
}

/**
 * @param {string} file
 * @param {JsonValue | undefined} value
 */
function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * @param {Record<string, JsonValue | undefined>} target
 * @param {Record<string, JsonValue | undefined> | undefined} source
 * @returns {Record<string, JsonValue | undefined>}
 */
function deepMerge(target, source) {
  Object.entries(source || {}).forEach(([key, value]) => {
    if (isPlainObject(value) && isPlainObject(target[key])) {
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  });
  return target;
}

/** @param {unknown} value */
export function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
