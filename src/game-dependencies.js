// GENERATED FILE. Do not edit directly.
// Source: src/modules/game-dependencies.js
// Run: npm run build:bridges
(() => {
  "use strict";

  /**
   * @typedef {{ hp: number, damage: number, spawnRate: number }} FloorDifficulty
   */

  const floorTable = [
    { hp: 0.9, damage: 0.85, spawnRate: 0.9 },
    { hp: 1.1, damage: 1, spawnRate: 1 },
    { hp: 1.33, damage: 1.15, spawnRate: 1.08 },
  ];

  /**
   * @param {number | null | undefined} floor
   * @returns {FloorDifficulty}
   */
  function floorDifficulty(floor) {
    const floorNumber = Math.max(1, Math.floor(floor || 1));
    const tableEntry = floorTable[floorNumber - 1];
    if (tableEntry) return { ...tableEntry };

    const extraFloors = floorNumber - floorTable.length;
    const floorThree = floorTable[floorTable.length - 1];
    return {
      hp: floorThree.hp + extraFloors * 0.2,
      damage: floorThree.damage + extraFloors * 0.13,
      spawnRate: floorThree.spawnRate + extraFloors * 0.05,
    };
  }

  function createCombatDamageSystem({
    canvas,
    getGame,
    getRelicSpecialEffects,
    addQuestProgressForWeapon,
    addQuestProgressGroup,
    killQuestIds,
    damageQuestIds,
    bossQuestIds,
    spawnLootDrops,
    advanceTowerFloor,
    distance,
    clamp,
  }) {
    function damageEnemy(enemy, amount, weaponId) {
      const game = getGame();
      const before = enemy.hp;
      const effects = getRelicSpecialEffects?.() || {};
      const finalAmount = enemy.boss ? amount * (1 + (effects.bossDamageBonus || 0)) : amount;
      enemy.hp -= finalAmount;
      const dealt = Math.max(0, Math.min(before, finalAmount));
      game.weaponDamage[weaponId] = (game.weaponDamage[weaponId] || 0) + dealt;
      addQuestProgressGroup(damageQuestIds, dealt);
      addQuestProgressForWeapon(weaponId, dealt);
      return dealt;
    }

    function damagePlayer(amount, source = {}) {
      const game = getGame();
      const p = game?.player;
      if (!p || p.invincibleTimer > 0) return 0;
      const effects = getRelicSpecialEffects?.() || {};
      if (effects.dodgeChance && Math.random() < Math.min(0.95, effects.dodgeChance)) {
        p.blinkTimer = Math.max(p.blinkTimer || 0, 0.35);
        return 0;
      }
      let finalDamage = amount * Math.max(0, 1 - (effects.damageReduction || 0));
      if (source.enemy && effects.thornDamage) {
        damageEnemy(source.enemy, effects.thornDamage, "relic_thorns");
      }
      if (effects.teleportOnHitCooldown && !(p.teleportCooldown > 0)) {
        p.x = clamp(
          p.x + (Math.random() < 0.5 ? -1 : 1) * (effects.teleportDistance || 140),
          p.radius,
          canvas.width - p.radius
        );
        p.y = clamp(
          p.y + (Math.random() < 0.5 ? -1 : 1) * (effects.teleportDistance || 140),
          p.radius,
          canvas.height - p.radius
        );
        p.targetX = p.x;
        p.targetY = p.y;
        p.teleportCooldown = effects.teleportOnHitCooldown;
      }
      p.hp -= finalDamage;
      if (effects.blinkInvulnerabilitySeconds) {
        p.invincibleTimer = Math.max(p.invincibleTimer || 0, effects.blinkInvulnerabilitySeconds);
        p.blinkTimer = Math.max(p.blinkTimer || 0, effects.blinkInvulnerabilitySeconds);
      }
      return finalDamage;
    }

    function reapEnemies() {
      const game = getGame();
      const dead = game.enemies.filter((enemy) => enemy.hp <= 0);
      dead.forEach((enemy) => {
        const effects = getRelicSpecialEffects?.() || {};
        if (effects.lifestealOnKill && game.player) {
          game.player.hp = Math.min(
            game.player.maxHp,
            game.player.hp + Math.ceil(game.player.maxHp * effects.lifestealOnKill)
          );
        }
        if (effects.killExplosionDamage && effects.killExplosionRadius) {
          game.enemies.forEach((candidate) => {
            if (candidate === enemy || candidate.hp <= 0) return;
            if (distance(enemy, candidate) <= effects.killExplosionRadius + candidate.radius) {
              damageEnemy(candidate, effects.killExplosionDamage, "relic_kill_explosion");
            }
          });
        }
        game.kills += 1;
        addQuestProgressGroup(killQuestIds, 1);
        game.xpDrops.push({ x: enemy.x, y: enemy.y, radius: enemy.boss ? 12 : 7, value: enemy.boss ? 8 : enemy.xp });
        spawnLootDrops(enemy);
        if (enemy.boss) {
          game.bossDefeated = true;
          addQuestProgressGroup(bossQuestIds, 1);
          advanceTowerFloor?.();
        }
      });
      game.enemies = game.enemies.filter((enemy) => enemy.hp > 0);
    }

    return {
      damageEnemy,
      damagePlayer,
      reapEnemies,
    };
  }

  function createContentRegistry({ content, upgradeContent }) {
    const weaponDefs = content.weapons || {};
    const weaponUnlocks = content.weaponUnlocks || [];
    const questDefs = content.quests || {};
    const questGroups = content.questGroups || {};
    const bossConfig = content.bossConfig || {};
    const bossAbilities = content.bossAbilities || {};
    const assetDefs = content.assets || {};

    return {
      weaponDefs,
      weaponUnlocks,
      spriteDefs: assetDefs.sprites || {},
      sfxDefs: assetDefs.sfx || {},
      upgradeDefs: upgradeContent.createUpgradeDefs?.(weaponDefs) || [],
      questDefs,
      questGroups,
      starterQuestIds: questGroups.starter || [],
      killQuestIds: questGroups.kill || [],
      damageQuestIds: questGroups.damage || [],
      survivalQuestIds: questGroups.survival || [],
      xpQuestIds: questGroups.xp || [],
      levelQuestIds: questGroups.level || [],
      bossQuestIds: questGroups.boss || [],
      runUpgradeDefs: upgradeContent.runUpgradeDefs || [],
      enemyTypes: content.enemyTypes || [],
      bossConfig,
      bossAbilities,
      shopItemDefs: content.shopItems || [],
      relicDefs: content.relics || [],
      levelDefs: content.levels || [],
      mapDefs: content.maps || [],
      tuningDefs: content.tuning || {},
    };
  }

  function createGameBannerSystem({ ui, getSave, persist }) {
    let bannerTimer = 0;

    function hasSeenBanner(id) {
      return getSave().seenBanners?.includes(id);
    }

    function markBannerSeen(id) {
      const save = getSave();
      save.seenBanners = [...new Set([...(save.seenBanners || []), id])];
      persist();
    }

    function showBanner(message, duration = 5200) {
      if (!ui.questBanner || !message) return;
      ui.questBanner.textContent = message;
      ui.questBanner.classList.remove("hidden");
      clearTimeout(bannerTimer);
      if (duration > 0) {
        bannerTimer = setTimeout(() => ui.questBanner.classList.add("hidden"), duration);
      }
    }

    function showMovementGateBanner() {
      showBanner("Click/tap to move", 0);
    }

    function hideMovementGateBanner() {
      if (!ui.questBanner || ui.questBanner.textContent !== "Click/tap to move") return;
      clearTimeout(bannerTimer);
      ui.questBanner.classList.add("hidden");
    }

    function showOnceBanner(id, message, duration) {
      if (hasSeenBanner(id)) return false;
      markBannerSeen(id);
      showBanner(message, duration);
      return true;
    }

    function showQuestBanner(quest, reward) {
      if (!quest) return;
      const firstQuest = !hasSeenBanner("first_quest_completion");
      if (firstQuest) {
        markBannerSeen("first_quest_completion");
      }
      showBanner(
        firstQuest
          ? `${quest.name} complete +${reward} QP. Open Menu > Rewards to spend Quest Points and review quests.`
          : `${quest.name} complete +${reward} QP`,
      );
    }

    return {
      hideMovementGateBanner,
      showBanner,
      showMovementGateBanner,
      showOnceBanner,
      showQuestBanner,
    };
  }

  /**
   * @typedef {{ src?: string, path?: string } | string} SpriteBackgroundDef
   * @typedef {Record<string, SpriteBackgroundDef>} SpriteBackgroundDefs
   * @typedef {{ backgrounds?: SpriteBackgroundDefs }} SpriteDefs
   * @typedef {{
   *   id?: string,
   *   name?: string,
   *   floorIds?: string[],
   *   backgroundAsset?: string | SpriteBackgroundDef,
   *   modifiers?: Record<string, unknown>
   * }} MapDef
   * @typedef {{
   *   id?: string,
   *   startsAt?: number,
   *   backgroundAsset?: string | SpriteBackgroundDef,
   *   modifiers?: Record<string, unknown>
   * }} LevelDef
   * @typedef {{
   *   map: MapDef,
   *   floor: LevelDef | null,
   *   modifiers: Record<string, unknown>,
   *   background: { id: string, spriteId: string, asset: string | SpriteBackgroundDef },
   *   floorPool: LevelDef[]
   * }} ResolvedMapState
   * @typedef {{
   *   towerFloor?: number,
   *   elapsed?: number,
   *   activeMap?: MapDef,
   *   activeFloor?: LevelDef | null,
   *   mapModifiers?: Record<string, unknown>,
   *   background?: { id: string, spriteId: string, asset: string | SpriteBackgroundDef },
   *   floorPool?: LevelDef[]
   * }} MapGame
   */

  /**
   * @param {{ mapDefs?: MapDef[], levelDefs?: LevelDef[], spriteDefs?: SpriteDefs }} options
   * @returns {{
   *   applyToGame(game: MapGame | null | undefined): ResolvedMapState | null,
   *   resolve(input?: { towerFloor?: number, elapsed?: number }): ResolvedMapState
   * }}
   */
  function createMapSystem({ mapDefs = [], levelDefs = [], spriteDefs = {} }) {
    const backgroundSprites = spriteDefs.backgrounds || {};
    const fallbackBackgroundId = backgroundSprites.tower_floor ? "tower_floor" : "";
    const fallbackMap = {
      id: "default_tower",
      name: "Default Tower",
      floorIds: levelDefs.map((level) => level.id).filter(Boolean),
      backgroundAsset: backgroundSprites[fallbackBackgroundId] || "",
      modifiers: {},
    };

    function usableMaps() {
      const maps = (mapDefs || []).filter((map) => map?.id);
      return maps.length ? maps : [fallbackMap];
    }

    function floorPoolForMap(map) {
      const ids = new Set(map?.floorIds || []);
      const floors = ids.size ? levelDefs.filter((level) => ids.has(level.id)) : levelDefs;
      return floors.length ? floors : levelDefs;
    }

    function resolveMap(towerFloor = 1) {
      const maps = usableMaps();
      const index = Math.max(0, Math.floor((Math.max(1, towerFloor) - 1) % maps.length));
      return maps[index] || fallbackMap;
    }

    function resolveFloor({ map, elapsed = 0 }) {
      const pool = floorPoolForMap(map).slice().sort((left, right) => (left.startsAt || 0) - (right.startsAt || 0));
      return pool.reduce((active, floor) => (elapsed >= (floor.startsAt || 0) ? floor : active), pool[0] || null);
    }

    function backgroundIdFor(entry) {
      const asset = entry?.backgroundAsset;
      if (!asset) return fallbackBackgroundId;
      const direct = Object.entries(backgroundSprites).find(([, value]) => {
        if (typeof value === "string") return value === asset;
        return value?.src === asset || value?.path === asset;
      });
      return direct?.[0] || fallbackBackgroundId;
    }

    function resolve({ towerFloor = 1, elapsed = 0 } = {}) {
      const map = resolveMap(towerFloor);
      const floor = resolveFloor({ map, elapsed });
      const backgroundId = backgroundIdFor(floor) || backgroundIdFor(map);
      return {
        map,
        floor,
        modifiers: { ...(map?.modifiers || {}), ...(floor?.modifiers || {}) },
        background: {
          id: backgroundId,
          spriteId: backgroundId ? `background:${backgroundId}` : "",
          asset: floor?.backgroundAsset || map?.backgroundAsset || "",
        },
        floorPool: floorPoolForMap(map),
      };
    }

    function applyToGame(game) {
      if (!game) return null;
      const resolved = resolve({ towerFloor: game.towerFloor || 1, elapsed: game.elapsed || 0 });
      game.activeMap = resolved.map;
      game.activeFloor = resolved.floor;
      game.mapModifiers = resolved.modifiers;
      game.background = resolved.background;
      game.floorPool = resolved.floorPool;
      return resolved;
    }

    return {
      applyToGame,
      resolve,
    };
  }

  const CURRENT_SAVE_VERSION = 3;

  function createDefaultSave({ starterQuestIds }) {
    return {
      saveVersion: CURRENT_SAVE_VERSION,
      coins: 0,
      towerFloor: 1,
      questPoints: 0,
      totalQuestPoints: 0,
      unlockedNodes: [],
      unlockedWeapons: ["spark_bolt"],
      selectedStartingWeapon: "spark_bolt",
      upgradeTiers: {},
      unlockedUpgrades: [],
      shopPurchases: {},
      seenBanners: [],
      unlockedRelics: [],
      equippedRelics: [],
      activeQuests: [...starterQuestIds],
      completedQuests: [],
      questProgress: {},
    };
  }

  const DEFAULT_CURRENT_SAVE_VERSION = 3;

  /**
   * Minimal persisted save shape used while stepping old saves forward.
   *
   * @typedef {Record<string, unknown> & {
   *   saveVersion?: number,
   *   shopPurchases?: Record<string, number>,
   *   seenBanners?: string[]
   * }} MigratingSave
   */

  /** @type {Record<number, (save: MigratingSave) => MigratingSave>} */
  const saveMigrations = {
    2(save) {
      return {
        ...save,
        shopPurchases: save.shopPurchases || {},
      };
    },
    3(save) {
      return {
        ...save,
        seenBanners: save.seenBanners || [],
      };
    },
  };

  /**
   * Guard for plain object save payloads before migration copies fields.
   *
   * @param {unknown} value
   * @returns {value is MigratingSave}
   */
  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  /**
   * Migrates an unknown persisted save payload to the current save schema version.
   *
   * @param {unknown} input
   * @param {{ currentSaveVersion?: number }} [options]
   * @returns {MigratingSave}
   */
  function migrateSave(input, options = {}) {
    const currentSaveVersion =
      options && typeof options === "object" && Number.isFinite(options.currentSaveVersion)
        ? options.currentSaveVersion
        : DEFAULT_CURRENT_SAVE_VERSION;
    let migrated = { ...(isPlainObject(input) ? input : {}) };
    let version = Math.max(1, Math.floor(migrated.saveVersion || 1));

    while (version < currentSaveVersion) {
      version += 1;
      migrated = saveMigrations[version]?.(migrated) || migrated;
      migrated.saveVersion = version;
    }

    migrated.saveVersion = currentSaveVersion;
    return migrated;
  }

  /**
   * @typedef {Record<string, unknown>} SaveData
   * @typedef {{ setCorruptBackupRaw?: (raw: string) => void }} CorruptBackupStorage
   * @typedef {() => SaveData} DefaultSaveFn
   * @typedef {(save: SaveData) => SaveData} NormalizeAndMigrateSaveFn
   * @typedef {{
   *   fromRaw(raw: string | null | undefined): SaveData,
   *   getLastLoadWarning(): string | null,
   *   storageReadFailed(): SaveData
   * }} SaveLoadHandler
   */

  /**
   * @param {{
   *   defaultSave: DefaultSaveFn,
   *   normalizeAndMigrateSave: NormalizeAndMigrateSaveFn,
   *   storage?: CorruptBackupStorage
   * }} options
   * @returns {SaveLoadHandler}
   */
  function createSaveLoadHandler({ defaultSave, normalizeAndMigrateSave, storage }) {
    let lastLoadWarning = null;

    function fromRaw(raw) {
      lastLoadWarning = null;

      if (!raw) {
        return normalizeAndMigrateSave({});
      }

      try {
        return normalizeAndMigrateSave(JSON.parse(raw));
      } catch {
        lastLoadWarning = "corrupt-save";
        storage?.setCorruptBackupRaw?.(raw);
        return defaultSave();
      }
    }

    function storageReadFailed() {
      lastLoadWarning = "storage-read-failed";
      return defaultSave();
    }

    function getLastLoadWarning() {
      return lastLoadWarning;
    }

    return {
      fromRaw,
      getLastLoadWarning,
      storageReadFailed,
    };
  }

  const DEFAULT_SAVE_NORMALIZE_VERSION = 3;

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function arrayValue(value) {
    return Array.isArray(value) ? value : [];
  }

  function objectValue(value) {
    return isPlainObject(value) ? value : {};
  }

  function createSaveNormalizer({
    currentSaveVersion = DEFAULT_SAVE_NORMALIZE_VERSION,
    defaultSave,
    isPlainObject: isPlainObjectValue = isPlainObject,
    questDefs,
    weaponUnlocks,
    upgradeDefs,
    shopItemById,
    questOpenIds,
  }) {
    const knownWeaponIds = new Set([
      "spark_bolt",
      ...arrayValue(weaponUnlocks)
        .map((unlock) => unlock.weaponId)
        .filter(Boolean),
    ]);

    function normalizeShopPurchases(purchases) {
      const normalizedPurchases = {};

      Object.entries(objectValue(purchases)).forEach(([id, rawTier]) => {
        const item = shopItemById.get(id);
        if (shopItemById.size && !item) return;

        const maxTier = Math.max(0, Math.floor(item?.maxTier || rawTier || 0));
        const tier = Math.min(maxTier, Math.max(0, Math.floor(rawTier || 0)));
        if (tier > 0) normalizedPurchases[id] = tier;
      });

      return normalizedPurchases;
    }

    function normalizeSave(input) {
      const normalized = { ...defaultSave(), ...(isPlainObjectValue(input) ? input : {}) };
      normalized.saveVersion = currentSaveVersion;
      normalized.unlockedWeapons = [
        ...new Set(["spark_bolt", ...arrayValue(normalized.unlockedWeapons)]),
      ];
      normalized.selectedStartingWeapon = normalizeSelectedStartingWeapon(
        normalized.selectedStartingWeapon,
        normalized.unlockedWeapons
      );
      normalized.coins = Math.max(0, Math.floor(normalized.coins || 0));
      normalized.towerFloor = Math.max(1, Math.floor(normalized.towerFloor || 1));
      normalized.unlockedNodes = arrayValue(normalized.unlockedNodes);
      normalized.upgradeTiers = objectValue(normalized.upgradeTiers);
      normalized.shopPurchases = normalizeShopPurchases(normalized.shopPurchases);
      normalized.seenBanners = [...new Set(arrayValue(normalized.seenBanners))];
      normalized.unlockedRelics = [...new Set(arrayValue(normalized.unlockedRelics))];
      normalized.equippedRelics = [
        ...new Set(
          arrayValue(normalized.equippedRelics).length
            ? arrayValue(normalized.equippedRelics)
            : normalized.unlockedRelics
        ),
      ]
        .filter((id) => normalized.unlockedRelics.includes(id))
        .slice(0, 5);
      normalized.activeQuests = arrayValue(normalized.activeQuests);
      normalized.completedQuests = arrayValue(normalized.completedQuests);
      normalized.questProgress = objectValue(normalized.questProgress);

      const ensureQuestOpen = (questId) => {
        if (!questId || !questDefs[questId]) return;
        if (
          !normalized.activeQuests.includes(questId) &&
          !normalized.completedQuests.includes(questId)
        ) {
          normalized.activeQuests.push(questId);
        }
        normalized.questProgress[questId] = normalized.questProgress[questId] || 0;
      };

      starterQuestAndUnlocks(normalized, ensureQuestOpen);

      normalized.unlockedUpgrades = Object.entries(normalized.upgradeTiers)
        .filter(([, tier]) => tier > 0)
        .map(([id]) => id);

      return normalized;
    }

    function normalizeSelectedStartingWeapon(value, unlockedWeapons) {
      if (
        typeof value === "string" &&
        knownWeaponIds.has(value) &&
        unlockedWeapons.includes(value)
      ) {
        return value;
      }
      return "spark_bolt";
    }

    function starterQuestAndUnlocks(normalized, ensureQuestOpen) {
      defaultSave().activeQuests.forEach((questId) => {
        ensureQuestOpen(questId);
      });

      normalized.completedQuests.forEach((questId) => {
        questOpenIds(questDefs[questId]).forEach(ensureQuestOpen);
      });

      normalized.unlockedNodes.forEach((nodeId) => {
        const unlock = weaponUnlocks.find((node) => node.id === nodeId);
        ensureQuestOpen(unlock?.opensQuest);
      });

      arrayValue(normalized.unlockedUpgrades).forEach((id) => {
        normalized.upgradeTiers[id] = Math.max(normalized.upgradeTiers[id] || 0, 1);
      });

      Object.entries(normalized.upgradeTiers).forEach(([upgradeId, tier]) => {
        if (tier > 0) {
          const upgrade = upgradeDefs.find((item) => item.id === upgradeId);
          ensureQuestOpen(upgrade?.opensQuest);
        }
      });
    }

    return {
      normalizeSave,
    };
  }

  /**
   * @typedef {{
   *   weaponId?: string,
   *   runUpgradeId?: string,
   *   name?: string,
   *   [key: string]: unknown
   * }} LevelUpChoice
   * @typedef {{ shopPurchases?: Record<string, number> }} ChoiceSave
   * @typedef {(choice: LevelUpChoice) => number} ChoiceWeightFn
   */

  /**
   * @param {LevelUpChoice[]} choices
   * @returns {LevelUpChoice[]}
   */
  function shuffleChoices(choices) {
    return choices
      .map((choice) => ({ choice, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ choice }) => choice);
  }

  /**
   * @param {LevelUpChoice[]} choices
   * @param {ChoiceWeightFn} weightForChoice
   * @returns {LevelUpChoice[]}
   */
  function weightedChoices(choices, weightForChoice) {
    return choices
      .map((choice) => ({
        choice,
        sort: Math.random() / Math.max(1, weightForChoice(choice)),
      }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ choice }) => choice);
  }

  /**
   * @param {LevelUpChoice} choice
   * @returns {string}
   */
  function choiceId(choice) {
    return choice.weaponId ? `weapon:${choice.weaponId}` : `run:${choice.runUpgradeId || choice.name}`;
  }

  /**
   * @param {ChoiceSave} save
   * @returns {number}
   */
  function shopFocusBonus(save) {
    return (save.shopPurchases?.relic_compass || 0) * 0.5;
  }

  /**
   * @typedef {{ x: number, y: number }} Point
   */

  /**
   * @param {Point} a
   * @param {Point} b
   * @returns {number}
   */
  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /**
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  /**
   * @param {number} seconds
   * @returns {string}
   */
  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(total / 60);
    const secs = String(total % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }

  const SHOP_FLOOR_PRICE_RATE = 0.03;
  const SHOP_INFLATION_RATE = 0.025;

  /**
   * @typedef {{ id: string, cost: number | number[], maxTier: number }} ShopPricingItem
   * @typedef {{ floorPriceRate?: number, inflationRate?: number }} ShopPricingConfig
   * @typedef {{
   *   coins: number,
   *   towerFloor?: number,
   *   shopPurchases?: Record<string, number>
   * }} ShopPricingSave
   * @typedef {{
   *   canBuy(item: ShopPricingItem): boolean,
   *   costFor(item: ShopPricingItem, tier: number): number,
   *   tierFor(item: ShopPricingItem): number
   * }} ShopPricingApi
   */

  /**
   * @param {{
   *   shopItemDefs: ShopPricingItem[],
   *   pricingConfig?: ShopPricingConfig,
   *   getSave: () => ShopPricingSave
   * }} options
   * @returns {ShopPricingApi}
   */
  function createShopPricing({ shopItemDefs, pricingConfig = {}, getSave }) {
    function floorPriceRate() {
      return Number.isFinite(pricingConfig.floorPriceRate)
        ? pricingConfig.floorPriceRate
        : SHOP_FLOOR_PRICE_RATE;
    }

    function inflationRate() {
      return Number.isFinite(pricingConfig.inflationRate)
        ? pricingConfig.inflationRate
        : SHOP_INFLATION_RATE;
    }

    function tierFor(item) {
      return getSave().shopPurchases?.[item.id] || 0;
    }

    function costFor(item, tier) {
      const baseCost = Array.isArray(item.cost) ? item.cost[tier] : item.cost;
      const floor = Math.max(1, getSave().towerFloor || 1);
      const floorMultiplier = floor <= 1 ? 1 : 1 + (floor - 1) * floorPriceRate();
      const inflationMultiplier = taperedInflationMultiplier(purchasedTierCount(item.id));
      return Math.ceil(baseCost * floorMultiplier * inflationMultiplier);
    }

    function taperedInflationMultiplier(purchasedTierCount) {
      return 1 + Math.log1p(Math.max(0, purchasedTierCount)) * inflationRate();
    }

    function purchasedTierCount(excludedItemId = "") {
      const purchases = getSave().shopPurchases || {};
      return shopItemDefs.reduce((total, item) => {
        if (item.id === excludedItemId) return total;
        return total + (purchases[item.id] || 0);
      }, 0);
    }

    function canBuy(item) {
      const save = getSave();
      const tier = tierFor(item);
      const cost = costFor(item, tier);
      return tier < item.maxTier && save.coins >= cost;
    }

    return {
      canBuy,
      costFor,
      tierFor,
    };
  }

  const MODULE_NATIVE_SHOP_SLOTS = Object.freeze(["shop"]);

  const MODULE_NATIVE_SHOP_PROOF_SLOTS = Object.freeze(["createShopSystem"]);

  /**
   * @param {any} [options]
   */
  function createShopSystem(options = {}) {
    const resolvedOptions = requireObject(options, "options");
    const documentRef = requireDocumentRef(resolvedOptions.documentRef);
    const ui = requireObject(resolvedOptions.ui, "ui");
    const effects = requireObject(resolvedOptions.effects, "effects");
    const shopPricing = requireObject(resolvedOptions.shopPricing, "shopPricing");
    const shopItemDefs = requireArray(resolvedOptions.shopItemDefs, "shopItemDefs");
    const getSave = requireFunction(resolvedOptions.getSave, "getSave");
    const getGame = requireFunction(resolvedOptions.getGame, "getGame");
    const persist = requireFunction(resolvedOptions.persist, "persist");
    const renderMeta = requireFunction(resolvedOptions.renderMeta, "renderMeta");
    const pricing = shopPricing.createShopPricing({
      shopItemDefs,
      pricingConfig: resolvedOptions.pricingConfig,
      getSave,
    });

    function canBuy(item) {
      return pricing.canBuy(item);
    }

    function buyItem(item) {
      if (!canBuy(item)) return;
      const save = getSave();
      const tier = pricing.tierFor(item);
      const cost = pricing.costFor(item, tier);
      save.coins -= cost;
      save.shopPurchases[item.id] = tier + 1;
      resolvedOptions.playPurchaseSfx?.();
      applyItemEffectToRun(item);
      persist();
      renderShop();
      showPurchaseNotice();
      renderMeta();
    }

    function showPurchaseNotice() {
      const message = "eh? The prices went up! Inflation huh.";
      resolvedOptions.onPurchaseNotice?.(message);
    }

    function applyItemEffectToRun(item) {
      effects.applyShopItemEffectToRun(getGame(), item);
    }

    function renderShop() {
      const save = getSave();
      if (isShopVisible()) resolvedOptions.onShopVisit?.();
      renderShopList(ui.shopItems, ui.shopCoinHud, save);
      renderShopList(ui.menuShopItems, ui.menuShopCoinHud, save);
      const notice = "Browser shop ready.";
      if (ui.shopNotice && !ui.shopNotice.textContent) ui.shopNotice.textContent = notice;
      if (ui.menuShopNotice && !ui.menuShopNotice.textContent) ui.menuShopNotice.textContent = notice;
    }

    function isShopVisible() {
      return !ui.shopModal?.classList.contains("hidden") || !ui.menuShopPanel?.classList.contains("hidden");
    }

    function renderShopList(container, coinHud, save) {
      if (!container || !coinHud) return;
      coinHud.textContent = `Coins: ${save.coins} | Tower Floor ${Math.max(1, save.towerFloor || 1)}`;
      container.innerHTML = "";
      if (!shopItemDefs.length) {
        const empty = documentRef.createElement("div");
        empty.className = "shop-item";
        empty.textContent = "No shop items yet.";
        container.appendChild(empty);
        return;
      }

      shopItemDefs.forEach((item) => {
        const tier = pricing.tierFor(item);
        const maxed = tier >= item.maxTier;
        const cost = pricing.costFor(item, tier);
        const affordable = !maxed && save.coins >= cost;
        const el = documentRef.createElement("div");
        el.className = `shop-item ${affordable ? "available" : "locked"}`;
        el.innerHTML = `
          <div class="shop-item-icon">
            ${item.spritePath ? `<img class="shop-item-sprite" src="${item.spritePath}" alt="" />` : ""}
          </div>
          <div class="shop-item-copy">
            <strong>${item.name}</strong>
            <span>${item.description}</span><br />
            <span>Tier: ${tier}/${item.maxTier}</span><br />
            <span>${maxed ? "Maxed" : affordable ? `Cost: ${cost} coins` : `Needs ${cost} coins`}</span>
          </div>
        `;
        const button = documentRef.createElement("button");
        button.textContent = maxed ? "Maxed" : `Buy Tier ${tier + 1}`;
        button.disabled = maxed || !affordable;
        button.addEventListener("click", () => buyItem(item));
        el.appendChild(button);
        container.appendChild(el);
      });
    }

    function openShop() {
      ui.shopModal.classList.remove("hidden");
      ui.menuShopPanel?.classList.remove("hidden");
      const game = getGame();
      if (game?.running && !game.paused) {
        game.paused = true;
        game.pauseReason = "shop";
      }
      renderShop();
    }

    function closeShop() {
      ui.shopModal.classList.add("hidden");
      ui.menuShopPanel?.classList.add("hidden");
      const game = getGame();
      if (game?.pauseReason === "shop") {
        game.paused = false;
        game.pauseReason = "";
      }
    }

    function getShopBonuses() {
      const save = getSave();
      const bonuses = effects.emptyShopBonuses();
      shopItemDefs.forEach((item) => {
        const tier = save.shopPurchases?.[item.id] || 0;
        effects.addShopItemBonus(bonuses, item, tier);
      });
      return bonuses;
    }

    return {
      closeShop,
      getShopBonuses,
      openShop,
      renderShop,
    };
  }

  function requireArray(value, name) {
    if (!Array.isArray(value)) {
      throw new Error(`Missing Tap Survivor native shop dependency: ${name}`);
    }
    return value;
  }

  function requireDocumentRef(value) {
    if (!value || typeof value.createElement !== "function") {
      throw new Error("Missing Tap Survivor native shop dependency: documentRef");
    }
    return value;
  }

  function requireFunction(value, name) {
    if (typeof value !== "function") {
      throw new Error(`Missing Tap Survivor native shop dependency: ${name}`);
    }
    return value;
  }

  function requireObject(value, name) {
    if (!value || typeof value !== "object") {
      throw new Error(`Missing Tap Survivor native shop dependency: ${name}`);
    }
    return value;
  }

  /**
   * @typedef {{
   *   id?: string,
   *   kind?: string,
   *   cooldown: number,
   *   damage: number,
   *   range?: number,
   *   radius?: number,
   *   upgradeId?: string,
   *   width?: number
   * }} WeaponDef
   * @typedef {Record<string, WeaponDef>} WeaponDefs
   * @typedef {{ fireRate?: number, attackRadius?: number, percentDamage?: number, flatDamage?: number }} ShopBonuses
   * @typedef {{
   *   areaRadiusBonus?: number,
   *   beamWidthBonus?: number,
   *   cooldownReduction?: number,
   *   damageBonus?: number,
   *   projectileSizeBonus?: number
   * }} RelicSpecialEffects
   * @typedef {{
   *   id: string,
   *   [key: string]: number | string | undefined
   * }} RunUpgradeDef
   * @typedef {{ playbackRate: number, minGapMs: number }} WeaponSfxOptions
   * @typedef {{
   *   projectileRadius(weapon: WeaponDef): number,
   *   projectileSkillModifier(weapon: WeaponDef, field: string): number,
   *   weaponCooldown(weapon: WeaponDef): number,
   *   weaponDamage(weaponId: string): number,
   *   weaponReach(weapon: WeaponDef): number,
   *   weaponSfxOptions(weapon: WeaponDef): WeaponSfxOptions,
   *   weaponWidth(weapon: WeaponDef): number
   * }} WeaponScalingApi
   */

  /**
   * @param {{
   *   content?: { runUpgrades?: RunUpgradeDef[] },
   *   weaponDefs: WeaponDefs,
   *   getUpgradeTier: (id: string | undefined) => number,
   *   getRunUpgradeTier: (id: string) => number,
   *   getShopBonuses?: () => ShopBonuses,
   *   getRelicSpecialEffects?: () => RelicSpecialEffects,
   *   getWeaponDamageMultiplier?: () => number,
   *   clamp: (value: number, min: number, max: number) => number
   * }} options
   * @returns {WeaponScalingApi}
   */
  function createWeaponScaling({
    content = {},
    weaponDefs,
    getUpgradeTier,
    getRunUpgradeTier,
    getShopBonuses,
    getRelicSpecialEffects,
    getWeaponDamageMultiplier,
    clamp,
  }) {
    function weaponCooldown(weapon) {
      const shopBonuses = getShopBonuses?.() || {};
      const relicEffects = getRelicSpecialEffects?.() || {};
      const rateTier =
        getUpgradeTier("fire_rate") +
        getRunUpgradeTier("run_fire_rate") +
        (shopBonuses.fireRate || 0);
      return (
        (weapon.cooldown / (1 + rateTier * 0.12 + (relicEffects.cooldownReduction || 0))) *
        projectileSkillModifier(weapon, "projectileCooldownMultiplier")
      );
    }

    function weaponSfxOptions(weapon) {
      const cooldown = Math.max(0.1, weaponCooldown(weapon));
      return {
        playbackRate: clamp(1.15 / cooldown, 0.75, 2.35),
        minGapMs: clamp(cooldown * 320, 35, 120),
      };
    }

    function weaponReach(weapon) {
      const shopBonuses = getShopBonuses?.() || {};
      const relicEffects = getRelicSpecialEffects?.() || {};
      const radiusTier =
        getUpgradeTier("attack_radius") +
        getRunUpgradeTier("run_attack_radius") +
        (shopBonuses.attackRadius || 0);
      return (weapon.range || 0) * (1 + radiusTier * 0.12 + (relicEffects.areaRadiusBonus || 0));
    }

    function weaponWidth(weapon) {
      const shopBonuses = getShopBonuses?.() || {};
      const relicEffects = getRelicSpecialEffects?.() || {};
      const radiusTier =
        getUpgradeTier("attack_radius") +
        getRunUpgradeTier("run_attack_radius") +
        (shopBonuses.attackRadius || 0);
      return (weapon.width || 0) * (1 + radiusTier * 0.1 + (relicEffects.beamWidthBonus || 0));
    }

    function projectileRadius(weapon) {
      const shopBonuses = getShopBonuses?.() || {};
      const relicEffects = getRelicSpecialEffects?.() || {};
      const radiusTier =
        getUpgradeTier("attack_radius") +
        getRunUpgradeTier("run_attack_radius") +
        (shopBonuses.attackRadius || 0);
      return (
        (weapon.radius || 0) * (1 + radiusTier * 0.12 + (relicEffects.projectileSizeBonus || 0))
      );
    }

    function weaponDamage(weaponId) {
      const weapon = weaponDefs[weaponId];
      const flatTier = getUpgradeTier("flat_damage") + getRunUpgradeTier("run_flat_damage");
      const shopBonuses = getShopBonuses?.() || {};
      const percentTier =
        getUpgradeTier("percent_damage") +
        getRunUpgradeTier("run_percent_damage") +
        getUpgradeTier(weapon.upgradeId) * 2 +
        (shopBonuses.percentDamage || 0);
      const relicEffects = getRelicSpecialEffects?.() || {};
      return (
        (weapon.damage + flatTier * 4 + (shopBonuses.flatDamage || 0)) *
        (1 + percentTier * 0.12 + (relicEffects.damageBonus || 0)) *
        (getWeaponDamageMultiplier?.() || 1) *
        projectileSkillModifier(weapon, "projectileDamageMultiplier")
      );
    }

    function projectileSkillModifier(weapon, field) {
      if (weapon?.kind !== "projectile") return 1;
      return (content?.runUpgrades || []).reduce((multiplier, upgrade) => {
        const tier = getRunUpgradeTier(upgrade.id);
        const value = upgrade[field];
        if (!tier || typeof value !== "number" || !Number.isFinite(value)) return multiplier;
        return multiplier * value ** tier;
      }, 1);
    }

    return {
      projectileRadius,
      projectileSkillModifier,
      weaponCooldown,
      weaponDamage,
      weaponReach,
      weaponSfxOptions,
      weaponWidth,
    };
  }

  /**
   * @typedef {{ x: number, y: number }} Point
   * @typedef {{ player: Point, enemies: Point[] }} TargetingGame
   * @typedef {(a: Point, b: Point) => number} DistanceFn
   */

  /**
   * @param {TargetingGame} game
   * @param {DistanceFn} distance
   * @returns {Point | null}
   */
  function nearestEnemy(game, distance) {
    if (!game.enemies.length) return null;

    const p = game.player;
    return game.enemies.reduce((best, enemy) =>
      distance(p, enemy) < distance(p, best) ? enemy : best
    );
  }

  function createGameDependencyBag({ globalRef, documentRef = globalRef?.document }) {
    return {
      audio: requireGlobal(globalRef, "TapSurvivorAudio"),
      assets: globalRef.TapSurvivorAssets || {},
      balance: { floorDifficulty },
      balanceRuntime: globalRef.TapSurvivorBalanceRuntime,
      combat: requireGlobal(globalRef, "TapSurvivorCombat"),
      combatDamage: { createCombatDamageSystem },
      content: globalRef.TapSurvivorBalanceRuntime?.content?.() || globalRef.TapSurvivorContent || {},
      contentRegistry: { createContentRegistry },
      debug: requireGlobal(globalRef, "TapSurvivorDebug"),
      debugBalance: globalRef.TapSurvivorDebugBalance,
      effects: requireGlobal(globalRef, "TapSurvivorEffects"),
      enemies: requireGlobal(globalRef, "TapSurvivorEnemies"),
      enemyBehaviors: requireGlobal(globalRef, "TapSurvivorEnemyBehaviors"),
      enemySpawning: requireGlobal(globalRef, "TapSurvivorEnemySpawning"),
      gameBanners: { createGameBannerSystem },
      gameRuntime: requireGlobal(globalRef, "TapSurvivorGameRuntime"),
      input: {
        bindMovementInput: requireFunction(
          globalRef?.TapSurvivorInput?.bindMovementInput,
          "globalThis.TapSurvivorInput.bindMovementInput"
        ),
      },
      levelUp: requireGlobal(globalRef, "TapSurvivorLevelUp"),
      levelUpChoices: { choiceId, shopFocusBonus, shuffleChoices, weightedChoices },
      mapSystem: { createMapSystem },
      math: { clamp, distance, formatTime, randomRange },
      pickups: requireGlobal(globalRef, "TapSurvivorPickups"),
      progression: requireGlobal(globalRef, "TapSurvivorProgression"),
      quests: requireGlobal(globalRef, "TapSurvivorQuests"),
      relics: requireGlobal(globalRef, "TapSurvivorRelics"),
      renderEnemies: requireGlobal(globalRef, "TapSurvivorRenderEnemies"),
      renderHud: requireGlobal(globalRef, "TapSurvivorRenderHud"),
      renderSkillRail: requireGlobal(globalRef, "TapSurvivorRenderSkillRail"),
      rendering: requireGlobal(globalRef, "TapSurvivorRendering"),
      runLifecycle: requireGlobal(globalRef, "TapSurvivorRunLifecycle"),
      runState: requireGlobal(globalRef, "TapSurvivorRunState"),
      runUi: requireGlobal(globalRef, "TapSurvivorRunUi"),
      runUpdate: requireGlobal(globalRef, "TapSurvivorRunUpdate"),
      save: requireGlobal(globalRef, "TapSurvivorSave"),
      saveCorruption: { createSaveLoadHandler },
      saveDefaults: { CURRENT_SAVE_VERSION, createDefaultSave },
      saveMigrations: { isPlainObject, migrateSave },
      saveNormalize: { arrayValue, createSaveNormalizer, objectValue },
      shellRelicUi: requireGlobal(globalRef, "TapSurvivorShellRelicUi"),
      shellUi: requireGlobal(globalRef, "TapSurvivorShellUi"),
      shop: {
        createShopSystem: (options = {}) =>
          createShopSystem({
            ...options,
            documentRef: options.documentRef || documentRef,
          }),
      },
      shopPricing: { createShopPricing },
      sprites: requireGlobal(globalRef, "TapSurvivorSprites"),
      storage: requireGlobal(globalRef, "TapSurvivorStorage"),
      ui: requireGlobal(globalRef, "TapSurvivorUi"),
      uiProgression: requireGlobal(globalRef, "TapSurvivorUiProgression"),
      upgrades: globalRef.TapSurvivorUpgrades || {},
      weaponBehaviors: requireGlobal(globalRef, "TapSurvivorWeaponBehaviors"),
      weaponCooldowns: { createWeaponScaling },
      weaponFire: requireGlobal(globalRef, "TapSurvivorWeaponFire"),
      weaponProjectiles: requireGlobal(globalRef, "TapSurvivorWeaponProjectiles"),
      weaponTargeting: { nearestEnemy },
    };
  }

  function requireGlobal(globalRef, name) {
    const value = globalRef?.[name];
    if (!value) {
      throw new Error(`Missing Tap Survivor runtime dependency: globalThis.${name}`);
    }
    return value;
  }

  function requireFunction(value, name) {
    if (typeof value !== "function") {
      throw new Error(`Missing Tap Survivor runtime dependency: ${name}`);
    }
    return value;
  }

  globalThis.TapSurvivorGameDependencies = {
    createGameDependencyBag,
  };
})();
