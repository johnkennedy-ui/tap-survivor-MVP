(() => {
const profileStorageKey = "tapSurvivor.balanceProfile";
const overrideStorageKey = "tapSurvivor.balanceOverrides";
const defaultProfileId = "default";

const overrideRules = {
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

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readStorage(storageRef, key) {
  try {
    return storageRef.current?.getItem?.(key) || "";
  } catch {
    return "";
  }
}

function writeStorage(storageRef, key, value) {
  try {
    storageRef.current?.setItem?.(key, value);
  } catch {
    // Storage can be unavailable in private or embedded contexts; runtime still works in memory.
  }
}

function removeStorage(storageRef, key) {
  try {
    storageRef.current?.removeItem?.(key);
  } catch {
    // Storage can be unavailable in private or embedded contexts; runtime still works in memory.
  }
}

function queryBalanceProfile(profileSearch) {
  const search = String(profileSearch?.() || "").replace(/^\?/, "");
  return search
    .split("&")
    .map((part) => part.split("="))
    .find(([key]) => decodeURIComponent(key || "") === "balance")?.[1];
}

function collectionById(content, collection, list) {
  const value = content[collection] || (list ? [] : {});
  if (!list) return value;
  return Object.fromEntries(value.map((item) => [item.id, item]));
}

function targetForOverride(content, section, id) {
  const rule = overrideRules[section];
  if (!rule) return null;
  if (rule.singleton) return content[section] || {};
  return collectionById(content, rule.collection, rule.list)[id] || null;
}

function validateOverrides(overrides, content) {
  const errors = [];
  const fail = (message) => errors.push(message);
  Object.entries(overrides || {}).forEach(([section, sectionOverrides]) => {
    const rule = overrideRules[section];
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
  return errors;
}

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
      Object.entries(value).forEach(([nestedField, nestedValue]) =>
        validateNumericOverride(section, id, `${field}.${nestedField}`, nestedValue, fail),
      );
      return;
    }
    if (nestedRule === "number") {
      validateNumericOverride(section, id, field, value, fail);
      return;
    }
    fail(`balance override ${section}${id ? `.${id}` : ""}.${field} is not supported`);
  });
}

function validateNumericOverride(section, id, field, value, fail) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateNumericOverride(section, id, `${field}[${index}]`, item, fail));
    return;
  }
  if (!Number.isFinite(value)) fail(`balance override ${section}${id ? `.${id}` : ""}.${field} must be numeric`);
  if (Number.isFinite(value) && value < 0 && !field.includes("weaponSlotBonus")) {
    fail(`balance override ${section}${id ? `.${id}` : ""}.${field} must be >= 0`);
  }
}

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

function setNestedValue(target, path, value) {
  const parts = path.split(".");
  let cursor = target;
  parts.slice(0, -1).forEach((part) => {
    cursor[part] ||= {};
    cursor = cursor[part];
  });
  cursor[parts.at(-1)] = value;
}

function applyOverrideObject(target, override, rule) {
  Object.entries(override || {}).forEach(([field, value]) => {
    if (rule.fields?.includes(field) || rule.arrays?.includes(field)) {
      target[field] = clone(value);
      return;
    }
    const nestedRule = rule.nested?.[field];
    if (nestedRule === "numberMap") {
      target[field] = { ...(target[field] || {}), ...clone(value) };
      return;
    }
    if (nestedRule === "number") setNestedValue(target, field, value);
  });
}

function applyOverrides(content, overrides) {
  Object.entries(overrides || {}).forEach(([section, sectionOverrides]) => {
    const rule = overrideRules[section];
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

function replaceObject(target, source) {
  Object.keys(target).forEach((key) => {
    if (!(key in source)) delete target[key];
  });
  Object.entries(source).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (!Array.isArray(target[key])) target[key] = [];
      target[key].length = 0;
      value.forEach((item) => target[key].push(clone(item)));
      return;
    }
    if (isPlainObject(value)) {
      if (!isPlainObject(target[key])) target[key] = {};
      replaceObject(target[key], value);
      return;
    }
    target[key] = value;
  });
}

function createRuntimeBalance({ content, profiles, profileSearch, storageRef }) {
  const baseContent = clone(content || {});
  const profileList = Array.isArray(profiles) ? profiles : [];
  const profileById = Object.fromEntries(profileList.map((profile) => [profile.profileId, profile]));
  const activeContent = content || {};
  let runtimeOverrides = {};
  let activeProfileId = profileIdOrDefault(
    decodeURIComponent(queryBalanceProfile(profileSearch) || "") || readStorage(storageRef, profileStorageKey),
  );

  const savedOverrides = readStorage(storageRef, overrideStorageKey);
  if (savedOverrides) {
    try {
      const parsed = JSON.parse(savedOverrides);
      if (!validateOverrides(parsed, baseContent).length) runtimeOverrides = parsed;
    } catch {
      runtimeOverrides = {};
    }
  }

  function profileIdOrDefault(profileId) {
    return profileById[profileId] ? profileId : defaultProfileId;
  }

  function rebuild() {
    const nextContent = clone(baseContent);
    const profile = profileById[activeProfileId] || profileById[defaultProfileId];
    applyOverrides(nextContent, profile?.overrides || {});
    applyOverrides(nextContent, runtimeOverrides);
    nextContent.activeBalanceProfile = activeProfileId;
    replaceObject(activeContent, nextContent);
    globalThis.TapSurvivorContent = activeContent;
    return activeContent;
  }

  function setProfile(profileId) {
    const nextProfile = profileIdOrDefault(profileId);
    activeProfileId = nextProfile;
    runtimeOverrides = {};
    writeStorage(storageRef, profileStorageKey, nextProfile);
    removeStorage(storageRef, overrideStorageKey);
    return {
      activeProfile: activeProfileId,
      content: rebuild(),
      fallback: nextProfile !== profileId,
    };
  }

  function applyLocalOverrides(overrides) {
    const errors = validateOverrides(overrides, baseContent);
    if (errors.length) {
      const error = new Error(errors.join("\n"));
      error.errors = errors;
      throw error;
    }
    runtimeOverrides = clone(overrides);
    return {
      activeProfile: activeProfileId,
      overrides: clone(runtimeOverrides),
      content: rebuild(),
    };
  }

  function clearOverrides() {
    runtimeOverrides = {};
    removeStorage(storageRef, overrideStorageKey);
    return {
      activeProfile: activeProfileId,
      content: rebuild(),
    };
  }

  function saveOverrides() {
    writeStorage(storageRef, overrideStorageKey, JSON.stringify(runtimeOverrides));
    return clone(runtimeOverrides);
  }

  function summary() {
    return {
      activeProfile: activeProfileId,
      profiles: profileList.map((profile) => ({
        profileId: profile.profileId,
        description: profile.description || "",
        overrideSections: Object.keys(profile.overrides || {}),
      })),
      overrides: clone(runtimeOverrides),
      content: {
        weapons: Object.keys(activeContent.weapons || {}).length,
        enemies: (activeContent.enemyTypes || []).length,
        shopItems: (activeContent.shopItems || []).length,
        floors: (activeContent.levels || []).length,
        maps: (activeContent.maps || []).length,
        tuning: clone(activeContent.tuning || {}),
      },
    };
  }

  rebuild();

  return {
    applyOverrides: applyLocalOverrides,
    clearOverrides,
    content: () => activeContent,
    exportOverrides: () => clone(runtimeOverrides),
    getActiveProfile: () => activeProfileId,
    listProfiles: () => profileList.map((profile) => profile.profileId),
    printSummary: () => {
      const report = summary();
      console.table?.(report.profiles);
      console.log(report);
      return report;
    },
    saveOverrides,
    setProfile,
    summary,
    validateOverrides: (overrides) => validateOverrides(overrides, baseContent),
  };
}

function balanceProviderError(missing) {
  const error = new Error(`TAP_SURVIVOR_BALANCE_PROVIDER_MISSING: ${missing.join(", ")}`);
  error.name = "TapSurvivorBalanceProviderError";
  error.code = "TAP_SURVIVOR_BALANCE_PROVIDER_MISSING";
  error.missing = missing;
  error.missingProviders = missing;
  return error;
}

function createRuntimeBalanceProvider() {
  let configuredContent;
  let configuredProfiles;
  let configuredRuntime;
  const storageRef = { current: null };

  function requireConfiguredRuntime() {
    if (configuredRuntime) return configuredRuntime;
    throw balanceProviderError(["content", "profiles"]);
  }

  const runtimeBalance = {
    applyOverrides: (...args) => requireConfiguredRuntime().applyOverrides(...args),
    clearOverrides: (...args) => requireConfiguredRuntime().clearOverrides(...args),
    configureDefaultProviders(providers = {}) {
      const { content, profiles } = providers;
      const missing = [];
      if (!content || typeof content !== "object") missing.push("content");
      if (!Array.isArray(profiles)) missing.push("profiles");
      if (missing.length) throw balanceProviderError(missing);
      if (Object.prototype.hasOwnProperty.call(providers, "storage")) {
        storageRef.current = providers.storage || null;
      }
      if (content === configuredContent && profiles === configuredProfiles) return runtimeBalance;

      configuredContent = content;
      configuredProfiles = profiles;
      configuredRuntime = createRuntimeBalance({
        content,
        profiles,
        profileSearch: providers.profileSearch,
        storageRef,
      });
      return runtimeBalance;
    },
    content: (...args) => requireConfiguredRuntime().content(...args),
    exportOverrides: (...args) => requireConfiguredRuntime().exportOverrides(...args),
    getActiveProfile: (...args) => requireConfiguredRuntime().getActiveProfile(...args),
    listProfiles: (...args) => requireConfiguredRuntime().listProfiles(...args),
    printSummary: (...args) => requireConfiguredRuntime().printSummary(...args),
    saveOverrides: (...args) => requireConfiguredRuntime().saveOverrides(...args),
    setProfile: (...args) => requireConfiguredRuntime().setProfile(...args),
    summary: (...args) => requireConfiguredRuntime().summary(...args),
    validateOverrides: (...args) => requireConfiguredRuntime().validateOverrides(...args),
  };

  return runtimeBalance;
}

const runtimeBalance = createRuntimeBalanceProvider();

globalThis.TapSurvivorBalanceRuntime = runtimeBalance;
globalThis.TapSurvivorDebugBalance = {
  applyOverrides: runtimeBalance.applyOverrides,
  clearOverrides: runtimeBalance.clearOverrides,
  exportOverrides: runtimeBalance.exportOverrides,
  getActiveProfile: runtimeBalance.getActiveProfile,
  listProfiles: runtimeBalance.listProfiles,
  printSummary: runtimeBalance.printSummary,
  saveOverrides: runtimeBalance.saveOverrides,
  setProfile: runtimeBalance.setProfile,
  validateOverrides: runtimeBalance.validateOverrides,
};
})();
