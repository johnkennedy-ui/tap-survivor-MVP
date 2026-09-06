// GENERATED FILE. Do not edit directly.
// Source: src/modules/balance-runtime.js
// Run: npm run build:bridges
// Retired global: TapSurvivorBalanceRuntime. Exports are supplied through the game dependency bag.
(() => {
  "use strict";

  const BALANCE_RUNTIME_PROFILE_STORAGE_KEY = "tapSurvivor.balanceProfile";
  const BALANCE_RUNTIME_OVERRIDE_STORAGE_KEY = "tapSurvivor.balanceOverrides";
  const BALANCE_RUNTIME_DEFAULT_PROFILE_ID = "default";

  /**
   * @typedef {Error & { errors: string[] }} BalanceRuntimeOverrideError
   */

  /**
   * @typedef {Error & { code: string, missing: string[], missingProviders: string[] }} BalanceRuntimeProviderError
   */

  const balanceRuntimeOverrideRules = {
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

  function cloneBalanceRuntimeValue(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function isBalanceRuntimePlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function readBalanceRuntimeStorage(storageRef, key) {
    try {
      return storageRef.current?.getItem?.(key) || "";
    } catch {
      return "";
    }
  }

  function writeBalanceRuntimeStorage(storageRef, key, value) {
    try {
      storageRef.current?.setItem?.(key, value);
    } catch {
      // Storage can be unavailable in private or embedded contexts; runtime still works in memory.
    }
  }

  function removeBalanceRuntimeStorage(storageRef, key) {
    try {
      storageRef.current?.removeItem?.(key);
    } catch {
      // Storage can be unavailable in private or embedded contexts; runtime still works in memory.
    }
  }

  function queryBalanceRuntimeProfile(profileSearch) {
    const search = String(profileSearch?.() || "").replace(/^\?/, "");
    return search
      .split("&")
      .map((part) => part.split("="))
      .find(([key]) => decodeURIComponent(key || "") === "balance")?.[1];
  }

  function balanceRuntimeCollectionById(content, collection, list) {
    const value = content[collection] || (list ? [] : {});
    if (!list) return value;
    return Object.fromEntries(value.map((item) => [item.id, item]));
  }

  function balanceRuntimeTargetForOverride(content, section, id) {
    const rule = balanceRuntimeOverrideRules[section];
    if (!rule) return null;
    if (rule.singleton) return content[section] || {};
    return balanceRuntimeCollectionById(content, rule.collection, rule.list)[id] || null;
  }

  function validateBalanceRuntimeOverrides(overrides, content) {
    const errors = [];
    const fail = (message) => errors.push(message);
    Object.entries(overrides || {}).forEach(([section, sectionOverrides]) => {
      const rule = balanceRuntimeOverrideRules[section];
      if (!rule) {
        fail(`unknown balance override section ${section}`);
        return;
      }
      if (!isBalanceRuntimePlainObject(sectionOverrides)) {
        fail(`balance override section ${section} must be an object`);
        return;
      }
      if (rule.singleton) {
        validateBalanceRuntimeOverrideObject(section, "", sectionOverrides, rule, content, fail);
        return;
      }
      Object.entries(sectionOverrides).forEach(([id, override]) => {
        if (!balanceRuntimeTargetForOverride(content, section, id)) {
          fail(`balance override ${section}.${id} points at unknown ID`);
        }
        validateBalanceRuntimeOverrideObject(section, id, override, rule, content, fail);
      });
    });
    return errors;
  }

  function validateBalanceRuntimeOverrideObject(section, id, override, rule, content, fail) {
    if (!isBalanceRuntimePlainObject(override)) {
      fail(`balance override ${section}${id ? `.${id}` : ""} must be an object`);
      return;
    }
    Object.entries(override).forEach(([field, value]) => {
      if (rule.fields?.includes(field)) {
        validateBalanceRuntimeNumericOverride(section, id, field, value, fail);
        return;
      }
      if (rule.arrays?.includes(field)) {
        if (!Array.isArray(value)) {
          fail(`balance override ${section}${id ? `.${id}` : ""}.${field} must be an array`);
        }
        validateBalanceRuntimeReferenceArray(section, id, field, value, content, fail);
        return;
      }
      const nestedRule = rule.nested?.[field];
      if (nestedRule === "numberMap") {
        if (!isBalanceRuntimePlainObject(value)) {
          fail(`balance override ${section}${id ? `.${id}` : ""}.${field} must be an object of numbers`);
          return;
        }
        Object.entries(value).forEach(([nestedField, nestedValue]) =>
          validateBalanceRuntimeNumericOverride(section, id, `${field}.${nestedField}`, nestedValue, fail),
        );
        return;
      }
      if (nestedRule === "number") {
        validateBalanceRuntimeNumericOverride(section, id, field, value, fail);
        return;
      }
      fail(`balance override ${section}${id ? `.${id}` : ""}.${field} is not supported`);
    });
  }

  function validateBalanceRuntimeNumericOverride(section, id, field, value, fail) {
    if (Array.isArray(value)) {
      value.forEach((item, index) =>
        validateBalanceRuntimeNumericOverride(section, id, `${field}[${index}]`, item, fail),
      );
      return;
    }
    if (!Number.isFinite(value)) {
      fail(`balance override ${section}${id ? `.${id}` : ""}.${field} must be numeric`);
    }
    if (Number.isFinite(value) && value < 0 && !field.includes("weaponSlotBonus")) {
      fail(`balance override ${section}${id ? `.${id}` : ""}.${field} must be >= 0`);
    }
  }

  function validateBalanceRuntimeReferenceArray(section, id, field, value, content, fail) {
    if (!Array.isArray(value)) return;
    if (section === "levels" && field === "enemyIds") {
      const enemies = new Set((content.enemyTypes || []).map((enemy) => enemy.id));
      value.forEach((enemyId) => {
        if (!enemies.has(enemyId)) {
          fail(`balance override levels.${id}.enemyIds references unknown enemy ${enemyId}`);
        }
      });
    }
    if (section === "maps" && field === "floorIds") {
      const floors = new Set((content.levels || []).map((level) => level.id));
      value.forEach((floorId) => {
        if (!floors.has(floorId)) {
          fail(`balance override maps.${id}.floorIds references unknown floor ${floorId}`);
        }
      });
    }
  }

  function setBalanceRuntimeNestedValue(target, path, value) {
    const parts = path.split(".");
    let cursor = target;
    parts.slice(0, -1).forEach((part) => {
      cursor[part] ||= {};
      cursor = cursor[part];
    });
    cursor[parts.at(-1)] = value;
  }

  function applyBalanceRuntimeOverrideObject(target, override, rule) {
    Object.entries(override || {}).forEach(([field, value]) => {
      if (rule.fields?.includes(field) || rule.arrays?.includes(field)) {
        target[field] = cloneBalanceRuntimeValue(value);
        return;
      }
      const nestedRule = rule.nested?.[field];
      if (nestedRule === "numberMap") {
        target[field] = { ...(target[field] || {}), ...cloneBalanceRuntimeValue(value) };
        return;
      }
      if (nestedRule === "number") setBalanceRuntimeNestedValue(target, field, value);
    });
  }

  function applyBalanceRuntimeOverrides(content, overrides) {
    Object.entries(overrides || {}).forEach(([section, sectionOverrides]) => {
      const rule = balanceRuntimeOverrideRules[section];
      if (!rule) return;
      if (rule.singleton) {
        applyBalanceRuntimeOverrideObject(content[section] ||= {}, sectionOverrides, rule);
        return;
      }
      Object.entries(sectionOverrides || {}).forEach(([id, override]) => {
        const target = balanceRuntimeTargetForOverride(content, section, id);
        if (target) applyBalanceRuntimeOverrideObject(target, override, rule);
      });
    });
  }

  function replaceBalanceRuntimeObject(target, source) {
    Object.keys(target).forEach((key) => {
      if (!(key in source)) delete target[key];
    });
    Object.entries(source).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (!Array.isArray(target[key])) target[key] = [];
        target[key].length = 0;
        value.forEach((item) => target[key].push(cloneBalanceRuntimeValue(item)));
        return;
      }
      if (isBalanceRuntimePlainObject(value)) {
        if (!isBalanceRuntimePlainObject(target[key])) target[key] = {};
        replaceBalanceRuntimeObject(target[key], value);
        return;
      }
      target[key] = value;
    });
  }

  function createRuntimeBalance({ content, logger, profileSearch, profiles, publishContent, storageRef }) {
    const baseContent = cloneBalanceRuntimeValue(content || {});
    const profileList = Array.isArray(profiles) ? profiles : [];
    const profileById = Object.fromEntries(profileList.map((profile) => [profile.profileId, profile]));
    const activeContent = content || {};
    const publish = typeof publishContent === "function" ? publishContent : () => {};
    let runtimeOverrides = {};
    let activeProfileId = balanceRuntimeProfileIdOrDefault(
      decodeURIComponent(
        queryBalanceRuntimeProfile(profileSearch) ||
          readBalanceRuntimeStorage(storageRef, BALANCE_RUNTIME_PROFILE_STORAGE_KEY),
      ),
      profileById,
    );

    const savedOverrides = readBalanceRuntimeStorage(storageRef, BALANCE_RUNTIME_OVERRIDE_STORAGE_KEY);
    if (savedOverrides) {
      try {
        const parsed = JSON.parse(savedOverrides);
        if (!validateBalanceRuntimeOverrides(parsed, baseContent).length) runtimeOverrides = parsed;
      } catch {
        runtimeOverrides = {};
      }
    }

    function rebuild() {
      const nextContent = cloneBalanceRuntimeValue(baseContent);
      const profile = profileById[activeProfileId] || profileById[BALANCE_RUNTIME_DEFAULT_PROFILE_ID];
      applyBalanceRuntimeOverrides(nextContent, profile?.overrides || {});
      applyBalanceRuntimeOverrides(nextContent, runtimeOverrides);
      nextContent.activeBalanceProfile = activeProfileId;
      replaceBalanceRuntimeObject(activeContent, nextContent);
      publish(activeContent);
      return activeContent;
    }

    function setProfile(profileId) {
      const nextProfile = balanceRuntimeProfileIdOrDefault(profileId, profileById);
      activeProfileId = nextProfile;
      runtimeOverrides = {};
      writeBalanceRuntimeStorage(storageRef, BALANCE_RUNTIME_PROFILE_STORAGE_KEY, nextProfile);
      removeBalanceRuntimeStorage(storageRef, BALANCE_RUNTIME_OVERRIDE_STORAGE_KEY);
      return {
        activeProfile: activeProfileId,
        content: rebuild(),
        fallback: nextProfile !== profileId,
      };
    }

    function applyLocalOverrides(overrides) {
      const errors = validateBalanceRuntimeOverrides(overrides, baseContent);
      if (errors.length) {
        const error = /** @type {BalanceRuntimeOverrideError} */ (new Error(errors.join("\n")));
        error.errors = errors;
        throw error;
      }
      runtimeOverrides = cloneBalanceRuntimeValue(overrides);
      return {
        activeProfile: activeProfileId,
        overrides: cloneBalanceRuntimeValue(runtimeOverrides),
        content: rebuild(),
      };
    }

    function clearOverrides() {
      runtimeOverrides = {};
      removeBalanceRuntimeStorage(storageRef, BALANCE_RUNTIME_OVERRIDE_STORAGE_KEY);
      return {
        activeProfile: activeProfileId,
        content: rebuild(),
      };
    }

    function saveOverrides() {
      writeBalanceRuntimeStorage(
        storageRef,
        BALANCE_RUNTIME_OVERRIDE_STORAGE_KEY,
        JSON.stringify(runtimeOverrides),
      );
      return cloneBalanceRuntimeValue(runtimeOverrides);
    }

    function summary() {
      return {
        activeProfile: activeProfileId,
        profiles: profileList.map((profile) => ({
          profileId: profile.profileId,
          description: profile.description || "",
          overrideSections: Object.keys(profile.overrides || {}),
        })),
        overrides: cloneBalanceRuntimeValue(runtimeOverrides),
        content: {
          weapons: Object.keys(activeContent.weapons || {}).length,
          enemies: (activeContent.enemyTypes || []).length,
          shopItems: (activeContent.shopItems || []).length,
          floors: (activeContent.levels || []).length,
          maps: (activeContent.maps || []).length,
          tuning: cloneBalanceRuntimeValue(activeContent.tuning || {}),
        },
      };
    }

    rebuild();

    return {
      applyOverrides: applyLocalOverrides,
      clearOverrides,
      content: () => activeContent,
      exportOverrides: () => cloneBalanceRuntimeValue(runtimeOverrides),
      getActiveProfile: () => activeProfileId,
      listProfiles: () => profileList.map((profile) => profile.profileId),
      printSummary: () => {
        const report = summary();
        logger?.table?.(report.profiles);
        logger?.log?.(report);
        return report;
      },
      saveOverrides,
      setProfile,
      summary,
      validateOverrides: (overrides) => validateBalanceRuntimeOverrides(overrides, baseContent),
    };
  }

  function balanceRuntimeProfileIdOrDefault(profileId, profileById) {
    return profileById[profileId] ? profileId : BALANCE_RUNTIME_DEFAULT_PROFILE_ID;
  }

  /**
   * @param {string[]} missing
   * @returns {BalanceRuntimeProviderError}
   */
  function balanceRuntimeProviderError(missing) {
    const error = /** @type {BalanceRuntimeProviderError} */ (
      new Error(`TAP_SURVIVOR_BALANCE_PROVIDER_MISSING: ${missing.join(", ")}`)
    );
    error.name = "TapSurvivorBalanceProviderError";
    error.code = "TAP_SURVIVOR_BALANCE_PROVIDER_MISSING";
    error.missing = missing;
    error.missingProviders = missing;
    return error;
  }

  /**
   * @param {{
   *   logger?: { log?: (...args: unknown[]) => void, table?: (...args: unknown[]) => void } | null,
   *   publishContent?: (content: object) => void,
   * }} [options]
   */
  function createRuntimeBalanceProvider({ logger = null, publishContent } = {}) {
    let configuredContent;
    let configuredProfiles;
    let configuredRuntime;
    const storageRef = { current: null };

    function requireConfiguredRuntime() {
      if (configuredRuntime) return configuredRuntime;
      throw balanceRuntimeProviderError(["content", "profiles"]);
    }

    const runtimeBalance = {
      applyOverrides: (...args) => requireConfiguredRuntime().applyOverrides(...args),
      clearOverrides: (...args) => requireConfiguredRuntime().clearOverrides(...args),
      configureDefaultProviders(providers = {}) {
        const { content, profiles } = providers;
        const missing = [];
        if (!content || typeof content !== "object") missing.push("content");
        if (!Array.isArray(profiles)) missing.push("profiles");
        if (missing.length) throw balanceRuntimeProviderError(missing);
        if (Object.prototype.hasOwnProperty.call(providers, "storage")) {
          storageRef.current = providers.storage || null;
        }
        if (content === configuredContent && profiles === configuredProfiles) return runtimeBalance;

        configuredContent = content;
        configuredProfiles = profiles;
        configuredRuntime = createRuntimeBalance({
          content,
          logger,
          profileSearch: providers.profileSearch,
          profiles,
          publishContent,
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
})();
