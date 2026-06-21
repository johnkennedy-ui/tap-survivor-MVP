import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { assembleRegistryContent, isPlainObject } from "./content-assembly.mjs";
import { balanceDir, defaultBalanceProfile } from "./content-paths.mjs";

/** @typedef {import("./content-types.mjs").BalanceChange} BalanceChange */
/** @typedef {import("./content-types.mjs").BalanceOverrides} BalanceOverrides */
/** @typedef {import("./content-types.mjs").BalanceProfile} BalanceProfile */
/** @typedef {import("./content-types.mjs").ContentEntry} ContentEntry */
/** @typedef {import("./content-types.mjs").ContentRecord} ContentRecord */
/** @typedef {import("./content-types.mjs").JsonValue} JsonValue */
/** @typedef {import("./content-types.mjs").ValidationFailure} ValidationFailure */

/**
 * @typedef {{
 *   collection?: keyof ContentRecord,
 *   list?: boolean,
 *   singleton?: boolean,
 *   fields?: string[],
 *   arrays?: string[],
 *   nested?: Record<string, "number" | "numberMap">
 * }} BalanceOverrideRule
 */

/** @type {Record<string, BalanceOverrideRule>} */
const balanceOverrideRules = {
  weapons: {
    collection: "weapons",
    fields: [
      "damage",
      "cooldown",
      "radius",
      "range",
      "width",
      "speed",
      "pierce",
      "jumps",
      "duration",
      "tick",
      "armDelay",
      "explosionLife",
      "spawnOffset",
      "count",
    ],
  },
  enemies: {
    collection: "enemyTypes",
    list: true,
    fields: [
      "hp",
      "speed",
      "xp",
      "damage",
      "radius",
      "touchCooldown",
      "attackRange",
      "projectileCooldown",
      "projectileSpeed",
      "projectileDamage",
      "minTowerFloor",
    ],
  },
  relics: {
    collection: "relics",
    list: true,
    fields: [
      "selectionWeightBonus",
      "startingTierBonus",
      "maxTierBonus",
      "weaponSlotBonus",
      "weaponDamageMultiplier",
    ],
    nested: {
      "specialAbility.modifiers": "numberMap",
    },
  },
  shopItems: {
    collection: "shopItems",
    list: true,
    fields: ["cost", "maxTier"],
    nested: {
      "effect.value": "number",
    },
  },
  levels: {
    collection: "levels",
    list: true,
    fields: ["startsAt", "spawnCount", "spawnRateMultiplier"],
    arrays: ["enemyIds"],
  },
  maps: {
    collection: "maps",
    list: true,
    fields: [],
    arrays: ["floorIds"],
    nested: {
      modifiers: "numberMap",
    },
  },
  bossConfig: {
    singleton: true,
    fields: [
      "normalAbilityCount",
      "superAbilityCount",
      "baseHp",
      "hpPerKill",
      "superHpMultiplier",
      "touchDamage",
      "touchCooldown",
      "noticeLife",
      "dropWindup",
      "sideEntryMargin",
      "entryOffsetX",
      "entryOffsetY",
      "defaultAttackCooldown",
    ],
    nested: {
      drop: "numberMap",
      enemyBolt: "numberMap",
      projectileScaling: "numberMap",
    },
  },
  bossAbilities: {
    collection: "bossAbilities",
    fields: [
      "speed",
      "attackCooldown",
      "windup",
      "duration",
      "chargeSpeed",
      "superChargeSpeed",
      "attackRange",
      "projectileCooldown",
      "projectileSpeed",
      "projectileDamage",
      "superProjectileDamage",
      "initialShootTimer",
    ],
    nested: {
      shockwave: "numberMap",
      slash: "numberMap",
    },
  },
  tuning: {
    singleton: true,
    nested: {
      shop: "numberMap",
      loot: "numberMap",
    },
  },
};

/** @param {string} [profileId] */
export function readBalanceProfile(profileId = defaultBalanceProfile) {
  const file = join(balanceDir, `${profileId}.json`);
  if (!existsSync(file)) throw new Error(`Missing balance profile: ${profileId}`);
  return JSON.parse(readFileSync(file, "utf8"));
}

/** @returns {BalanceProfile[]} */
export function readBalanceProfiles() {
  if (!existsSync(balanceDir)) return [];
  return readdirSync(balanceDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => JSON.parse(readFileSync(join(balanceDir, file), "utf8")));
}

/**
 * @param {ContentRecord} content
 * @param {string} [profileId]
 * @returns {ContentRecord}
 */
export function applyBalanceProfile(content, profileId = defaultBalanceProfile) {
  if (!profileId) return structuredClone(content);
  const profile = readBalanceProfile(profileId);
  const cloned = structuredClone(content);
  applyBalanceOverrides(cloned, profile.overrides || {});
  if (profileId !== "default") cloned.activeBalanceProfile = profile.profileId || profileId;
  return cloned;
}

/**
 * @param {BalanceProfile | unknown} profile
 * @param {ContentRecord} [content]
 * @returns {string[]}
 */
export function validateBalanceProfile(profile, content = assembleRegistryContent()) {
  const errors = [];
  const fail = (message) => errors.push(message);
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    return ["balance profile must be an object"];
  }
  const balanceProfile = /** @type {BalanceProfile} */ (profile);
  if (!balanceProfile.profileId || typeof balanceProfile.profileId !== "string") {
    fail("balance profile profileId must be a non-empty string");
  }
  if (!balanceProfile.overrides || typeof balanceProfile.overrides !== "object" || Array.isArray(balanceProfile.overrides)) {
    fail(`balance profile ${balanceProfile.profileId || "unknown"} overrides must be an object`);
    return errors;
  }
  validateBalanceOverrides(balanceProfile.overrides, content, fail);
  return errors;
}

/** @param {ContentRecord} [content] */
export function validateBalanceProfiles(content = assembleRegistryContent()) {
  return readBalanceProfiles().flatMap((profile) =>
    validateBalanceProfile(profile, content).map((error) => `${profile.profileId || "unknown"}: ${error}`),
  );
}

/**
 * @param {ContentRecord} baseContent
 * @param {BalanceProfile} profile
 * @returns {BalanceChange[]}
 */
export function changedBalanceValues(baseContent, profile) {
  const overlaid = structuredClone(baseContent);
  applyBalanceOverrides(overlaid, profile.overrides || {});
  return collectOverrideChanges(baseContent, overlaid, profile.overrides || {});
}

/**
 * @param {ContentRecord} content
 * @param {keyof ContentRecord} collection
 * @param {boolean | undefined} list
 * @returns {Record<string, ContentEntry>}
 */
function collectionById(content, collection, list) {
  const value = content[collection] || (list ? [] : {});
  if (!list) return value;
  return Object.fromEntries(value.map((item) => [item.id, item]));
}

/**
 * @param {ContentRecord} content
 * @param {string} section
 * @param {string} id
 * @returns {ContentEntry | Record<string, ContentEntry> | null}
 */
function targetForOverride(content, section, id) {
  const rule = balanceOverrideRules[section];
  if (!rule) return null;
  if (rule.singleton) return content[section] || {};
  return collectionById(content, rule.collection, rule.list)[id] || null;
}

/**
 * @param {ContentRecord} content
 * @param {BalanceOverrides} overrides
 */
function applyBalanceOverrides(content, overrides) {
  Object.entries(overrides || {}).forEach(([section, sectionOverrides]) => {
    const rule = balanceOverrideRules[section];
    if (!rule) return;
    if (rule.singleton) {
      applyOverrideObject(content[section] ||= {}, sectionOverrides, rule);
      return;
    }
    Object.entries(sectionOverrides || {}).forEach(([id, override]) => {
      const target = targetForOverride(content, section, id);
      if (target) applyOverrideObject(target, override, rule);
    });
  });
}

/**
 * @param {ContentEntry | Record<string, ContentEntry>} target
 * @param {JsonValue | Record<string, JsonValue> | undefined} override
 * @param {BalanceOverrideRule} rule
 */
function applyOverrideObject(target, override, rule) {
  Object.entries(override || {}).forEach(([field, value]) => {
    if (rule.fields?.includes(field) || rule.arrays?.includes(field)) {
      target[field] = value;
      return;
    }
    const nestedRule = rule.nested?.[field];
    if (nestedRule === "numberMap") {
      target[field] = { ...(target[field] || {}), ...value };
      return;
    }
    if (nestedRule === "number") {
      setNestedValue(target, field, value);
      return;
    }
    if (field.includes(".") && rule.nested?.[field] === "number") {
      setNestedValue(target, field, value);
    }
  });
}

/**
 * @param {ContentEntry | Record<string, ContentEntry>} target
 * @param {string} path
 * @param {JsonValue} value
 */
function setNestedValue(target, path, value) {
  const parts = path.split(".");
  let cursor = target;
  parts.slice(0, -1).forEach((part) => {
    cursor[part] ||= {};
    cursor = cursor[part];
  });
  cursor[parts.at(-1)] = value;
}

/**
 * @param {ContentEntry | Record<string, ContentEntry>} target
 * @param {string} path
 * @returns {JsonValue | undefined}
 */
function valueAtPath(target, path) {
  return path.split(".").reduce((cursor, part) => cursor?.[part], target);
}

/**
 * @param {ContentRecord} baseContent
 * @param {ContentRecord} overlaidContent
 * @param {BalanceOverrides} overrides
 * @returns {BalanceChange[]}
 */
function collectOverrideChanges(baseContent, overlaidContent, overrides) {
  /** @type {BalanceChange[]} */
  const changes = [];
  Object.entries(overrides || {}).forEach(([section, sectionOverrides]) => {
    const rule = balanceOverrideRules[section];
    if (!rule) return;
    if (rule.singleton) {
      collectObjectChanges(changes, section, "", baseContent[section] || {}, overlaidContent[section] || {}, sectionOverrides, rule);
      return;
    }
    Object.entries(sectionOverrides || {}).forEach(([id, override]) => {
      const base = targetForOverride(baseContent, section, id) || {};
      const overlaid = targetForOverride(overlaidContent, section, id) || {};
      collectObjectChanges(changes, section, id, base, overlaid, override, rule);
    });
  });
  return changes;
}

/**
 * @param {BalanceChange[]} changes
 * @param {string} section
 * @param {string} id
 * @param {ContentEntry | Record<string, ContentEntry>} base
 * @param {ContentEntry | Record<string, ContentEntry>} overlaid
 * @param {JsonValue | Record<string, JsonValue> | undefined} override
 * @param {BalanceOverrideRule} rule
 */
function collectObjectChanges(changes, section, id, base, overlaid, override, rule) {
  Object.entries(override || {}).forEach(([field, value]) => {
    if (rule.nested?.[field] === "numberMap") {
      Object.keys(value || {}).forEach((nestedField) => {
        const path = `${field}.${nestedField}`;
        changes.push({ section, id, field: path, before: valueAtPath(base, path), after: valueAtPath(overlaid, path) });
      });
      return;
    }
    changes.push({ section, id, field, before: valueAtPath(base, field), after: valueAtPath(overlaid, field) });
  });
}

/**
 * @param {BalanceOverrides} overrides
 * @param {ContentRecord} content
 * @param {ValidationFailure} fail
 */
function validateBalanceOverrides(overrides, content, fail) {
  Object.entries(overrides || {}).forEach(([section, sectionOverrides]) => {
    const rule = balanceOverrideRules[section];
    if (!rule) {
      fail(`unknown balance override section ${section}`);
      return;
    }
    if (!isPlainObject(sectionOverrides)) {
      fail(`balance override section ${section} must be an object`);
      return;
    }
    if (rule.singleton) {
      validateOverrideObject(section, "", sectionOverrides, rule, content, fail);
      return;
    }
    Object.entries(sectionOverrides).forEach(([id, override]) => {
      if (!targetForOverride(content, section, id)) fail(`balance override ${section}.${id} points at unknown ID`);
      validateOverrideObject(section, id, override, rule, content, fail);
    });
  });
}

/**
 * @param {string} section
 * @param {string} id
 * @param {JsonValue | Record<string, JsonValue> | undefined} override
 * @param {BalanceOverrideRule} rule
 * @param {ContentRecord} content
 * @param {ValidationFailure} fail
 */
function validateOverrideObject(section, id, override, rule, content, fail) {
  if (!isPlainObject(override)) {
    fail(`balance override ${section}${id ? `.${id}` : ""} must be an object`);
    return;
  }
  Object.entries(override).forEach(([field, value]) => {
    if (rule.fields?.includes(field)) {
      validateNumericOverride(section, id, field, value, fail);
      return;
    }
    if (rule.arrays?.includes(field)) {
      if (!Array.isArray(value)) fail(`balance override ${section}${id ? `.${id}` : ""}.${field} must be an array`);
      validateReferenceArray(section, id, field, value, content, fail);
      return;
    }
    const nestedRule = rule.nested?.[field];
    if (nestedRule === "numberMap") {
      if (!isPlainObject(value)) {
        fail(`balance override ${section}${id ? `.${id}` : ""}.${field} must be an object of numbers`);
        return;
      }
      Object.entries(value).forEach(([nestedField, nestedValue]) => validateNumericOverride(section, id, `${field}.${nestedField}`, nestedValue, fail));
      return;
    }
    if (nestedRule === "number") {
      validateNumericOverride(section, id, field, value, fail);
      return;
    }
    fail(`balance override ${section}${id ? `.${id}` : ""}.${field} is not supported`);
  });
}

/**
 * @param {string} section
 * @param {string} id
 * @param {string} field
 * @param {unknown} value
 * @param {ValidationFailure} fail
 */
function validateNumericOverride(section, id, field, value, fail) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateNumericOverride(section, id, `${field}[${index}]`, item, fail));
    return;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(`balance override ${section}${id ? `.${id}` : ""}.${field} must be numeric`);
  }
  if (typeof value === "number" && Number.isFinite(value) && value < 0 && !field.includes("weaponSlotBonus")) {
    fail(`balance override ${section}${id ? `.${id}` : ""}.${field} must be >= 0`);
  }
}

/**
 * @param {string} section
 * @param {string} id
 * @param {string} field
 * @param {unknown} value
 * @param {ContentRecord} content
 * @param {ValidationFailure} fail
 */
function validateReferenceArray(section, id, field, value, content, fail) {
  if (!Array.isArray(value)) return;
  if (section === "levels" && field === "enemyIds") {
    const enemies = new Set((content.enemyTypes || []).map((enemy) => enemy.id));
    value.forEach((enemyId) => {
      if (!enemies.has(enemyId)) fail(`balance override levels.${id}.enemyIds references unknown enemy ${enemyId}`);
    });
  }
  if (section === "maps" && field === "floorIds") {
    const floors = new Set((content.levels || []).map((level) => level.id));
    value.forEach((floorId) => {
      if (!floors.has(floorId)) fail(`balance override maps.${id}.floorIds references unknown floor ${floorId}`);
    });
  }
}
