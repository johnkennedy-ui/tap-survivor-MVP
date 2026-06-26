import { createGameRuntimeController } from "../modules/game-runtime.js";
import { floorDifficulty } from "../modules/balance.js";
import { createSaveLoadHandler } from "../modules/save-corruption.js";
import { createDefaultSave, CURRENT_SAVE_VERSION } from "../modules/save-defaults.js";
import { isPlainObject, migrateSave } from "../modules/save-migrations.js";
import { createSaveNormalizer } from "../modules/save-normalize.js";
import { createSaveSystem } from "../modules/save.js";

export function createBrowserPlatform({
  globalRef = globalThis,
  documentRef = globalRef.document,
} = {}) {
  return {
    documentRef,
    runtimeGlobal: {
      requestAnimationFrame: (callback) => globalRef.requestAnimationFrame(callback),
      addEventListener: (...args) => globalRef.addEventListener?.(...args),
      Capacitor: globalRef.Capacitor,
    },
  };
}

export function composeRuntime({ platform, dependencies }) {
  if (!platform?.documentRef) {
    throw new Error("Missing Tap Survivor module bootstrap dependency: platform.documentRef");
  }
  if (!platform?.runtimeGlobal?.requestAnimationFrame) {
    throw new Error("Missing Tap Survivor module bootstrap dependency: platform.runtimeGlobal");
  }
  if (!dependencies) {
    throw new Error("Missing Tap Survivor module bootstrap dependency: dependencies");
  }

  return createGameRuntimeController({
    ...dependencies,
    documentRef: platform.documentRef,
    globalRef: platform.runtimeGlobal,
  });
}

export function composeSaveSubsystem({
  saveKey,
  legacySaveKey,
  storageAdapter,
  starterQuestIds = [],
  questDefs = {},
  weaponUnlocks = [],
  upgradeDefs = [],
  shopItemDefs = [],
  questOpenIds = () => [],
}) {
  if (!saveKey || !legacySaveKey) {
    throw new Error("Missing Tap Survivor module save dependency: save keys");
  }
  if (!storageAdapter) {
    throw new Error("Missing Tap Survivor module save dependency: storageAdapter");
  }

  return createSaveSystem({
    saveKey,
    legacySaveKey,
    saveNormalize: {
      createSaveNormalizer,
    },
    saveCorruption: {
      createSaveLoadHandler,
    },
    saveDefaults: {
      CURRENT_SAVE_VERSION,
      createDefaultSave,
    },
    saveMigrations: {
      isPlainObject,
      migrateSave,
    },
    starterQuestIds,
    questDefs,
    weaponUnlocks,
    upgradeDefs,
    shopItemDefs,
    questOpenIds,
    storageAdapter,
  });
}

export function composeContentBalanceEffects({ content, contentSchema = {}, upgradeContent = {} }) {
  if (!content) {
    throw new Error("Missing Tap Survivor module content dependency: content");
  }

  return {
    balance: {
      floorDifficulty,
    },
    content,
    contentRegistry: createContentRegistry({ content, upgradeContent }),
    effects: createEffects({ contentSchema }),
  };
}

function createContentRegistry({ content, upgradeContent }) {
  const weaponDefs = content.weapons || {};
  const questGroups = content.questGroups || {};
  const assetDefs = content.assets || {};

  return {
    weaponDefs,
    weaponUnlocks: content.weaponUnlocks || [],
    spriteDefs: assetDefs.sprites || {},
    sfxDefs: assetDefs.sfx || {},
    upgradeDefs: upgradeContent.createUpgradeDefs?.(weaponDefs) || [],
    questDefs: content.quests || {},
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
    bossConfig: content.bossConfig || {},
    bossAbilities: content.bossAbilities || {},
    shopItemDefs: content.shopItems || [],
    relicDefs: content.relics || [],
    levelDefs: content.levels || [],
    mapDefs: content.maps || [],
    tuningDefs: content.tuning || {},
  };
}

function createEffects({ contentSchema }) {
  const playerStatEffects = {
    speed(player, value) {
      player.speed += value;
    },
    pickupRadius(player, value) {
      player.pickupRadius += value;
    },
    maxHp(player, value) {
      player.maxHp += value;
      player.hp += value;
    },
  };
  const shopBonusStats = contentSchema.effectRegistries?.shopItem?.stats || [
    "speed",
    "pickupRadius",
    "maxHp",
    "flatDamage",
    "attackRadius",
    "fireRate",
    "percentDamage",
    "relicFocus",
  ];

  function applyPlayerStatEffect(player, effect) {
    const handler = playerStatEffects[effect?.stat];
    if (!player || !handler) return false;
    handler(player, effect.value || 0);
    return true;
  }

  function applyRunUpgradeEffects(game, effects) {
    (effects || []).forEach((effect) => {
      if (effect.type === "playerStatAdd") {
        applyPlayerStatEffect(game.player, effect);
        return;
      }
      if (effect.type === "playerHeal") {
        game.player.hp = Math.min(game.player.maxHp, game.player.hp + effect.value);
      }
    });
  }

  function applyShopItemEffectToRun(game, item) {
    if (!game?.running || !game.player || !item?.effect) return false;
    return applyPlayerStatEffect(game.player, item.effect);
  }

  function emptyShopBonuses() {
    return Object.fromEntries(shopBonusStats.map((stat) => [stat, 0]));
  }

  function addShopItemBonus(bonuses, item, tier) {
    if (!item?.effect || !Object.prototype.hasOwnProperty.call(bonuses, item.effect.stat)) return;
    bonuses[item.effect.stat] += item.effect.value * tier;
  }

  function applyRelicSpecialEffects(game, effects = {}) {
    const player = game?.player;
    if (!player) return;
    if (effects.maxHpBonus) {
      player.maxHp += effects.maxHpBonus;
      player.hp += effects.maxHpBonus;
    }
    if (effects.maxHpMultiplier) {
      const nextMaxHp = Math.ceil(player.maxHp * (1 + effects.maxHpMultiplier));
      player.hp += nextMaxHp - player.maxHp;
      player.maxHp = nextMaxHp;
    }
    if (effects.speedBonus) player.speed += effects.speedBonus;
    if (effects.speedMultiplier) player.speed *= 1 + effects.speedMultiplier;
    if (effects.pickupRadiusBonus) player.pickupRadius += effects.pickupRadiusBonus;
    if (effects.pickupRadiusMultiplier) player.pickupRadius *= 1 + effects.pickupRadiusMultiplier;
  }

  return {
    applyRunUpgradeEffects,
    applyShopItemEffectToRun,
    emptyShopBonuses,
    addShopItemBonus,
    applyRelicSpecialEffects,
  };
}
