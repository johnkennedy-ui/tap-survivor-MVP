import { existsSync } from "node:fs";
import { join } from "node:path";
import { root } from "./content-paths.mjs";
import { readContentSchema } from "./content-schema.mjs";

function validateShopItems(shopItems, { fail, requireNumber, requireString, schema, validateSpritePath }) {
  const seenShopItems = new Set();
  const shopItemEffectStats = schema.effectRegistries?.shopItem?.stats || [];
  const shopItemRules = schema.fieldRules?.shopItem || {};
  const shopItemRequiredFields = shopItemRules.required || ["id", "name", "description", "kind", "cost", "maxTier"];
  const shopItemKinds = shopItemRules.kinds || [];
  const shopItemCostMin = shopItemRules.cost?.min ?? 0;
  const shopItemMaxTierMin = shopItemRules.maxTier?.min ?? 1;

  shopItems.forEach((item) => {
    requireString(item.id, "shopItem.id");
    if (seenShopItems.has(item.id)) fail(`duplicate shop item ${item.id}`);
    seenShopItems.add(item.id);
    shopItemRequiredFields
      .filter((field) => ["name", "description", "kind"].includes(field))
      .forEach((field) => requireString(item[field], `shopItem ${item.id}.${field}`));
    if (shopItemKinds.length && !shopItemKinds.includes(item.kind)) {
      fail(`shopItem ${item.id} has unsupported kind ${item.kind}`);
    }
    if (Array.isArray(item.cost)) {
      item.cost.forEach((cost, index) => {
        requireNumber(cost, `shopItem ${item.id}.cost[${index}]`, shopItemCostMin);
        if (shopItemRules.cost?.tiersMustIncrease && index > 0 && cost <= item.cost[index - 1]) {
          fail(`shopItem ${item.id}.cost[${index}] must be greater than cost[${index - 1}]`);
        }
      });
    } else {
      requireNumber(item.cost, `shopItem ${item.id}.cost`, shopItemCostMin);
    }
    if (shopItemRequiredFields.includes("maxTier") || item.maxTier !== undefined) {
      requireNumber(item.maxTier, `shopItem ${item.id}.maxTier`, shopItemMaxTierMin);
    }
    if (shopItemRules.cost?.arrayLengthMustMatchMaxTier && Array.isArray(item.cost) && item.maxTier && item.cost.length !== item.maxTier) {
      fail(`shopItem ${item.id}.cost length must match maxTier`);
    }
    if (item.effect) {
      requireString(item.effect.stat, `shopItem ${item.id}.effect.stat`);
      if (!shopItemEffectStats.includes(item.effect.stat)) {
        fail(`shopItem ${item.id} has unsupported effect stat ${item.effect.stat}`);
      }
      requireNumber(item.effect.value, `shopItem ${item.id}.effect.value`, 0);
    }
    if (item.spritePath) validateSpritePath(item.spritePath, `shopItem ${item.id}.spritePath`);
  });
}

export function validateContent(content) {
  const errors = [];
  const weapons = content.weapons || {};
  const weaponUnlocks = content.weaponUnlocks || [];
  const metaUpgrades = content.metaUpgrades || [];
  const runUpgrades = content.runUpgrades || [];
  const quests = content.quests || {};
  const questGroups = content.questGroups || {};
  const enemyTypes = content.enemyTypes || [];
  const bossConfig = content.bossConfig || {};
  const bossAbilities = content.bossAbilities || {};
  const characters = content.characters || [];
  const shopItems = content.shopItems || [];
  const relics = content.relics || [];
  const levels = content.levels || [];
  const maps = content.maps || [];
  const assets = content.assets || {};
  const tuning = content.tuning || {};
  const schema = readContentSchema();
  const runUpgradeEffectTypes = schema.effectRegistries?.runUpgrade?.types || [];
  const runUpgradePlayerStats = schema.effectRegistries?.runUpgrade?.playerStatAddStats || [];
  const weaponBehaviorKinds = schema.behaviorRegistries?.weaponKinds?.ids || [];
  const bossAbilityKinds = schema.behaviorRegistries?.bossAbilityKinds?.ids || [];

  const seenUnlocks = new Set();
  const seenMetaUpgrades = new Set();
  const seenRunUpgrades = new Set();
  const seenEnemies = new Set();
  const seenCharacters = new Set();
  const seenRelics = new Set();
  const seenLevels = new Set();
  const seenMaps = new Set();

  function fail(message) {
    errors.push(message);
  }

  function requireObject(value, owner) {
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${owner} must be an object`);
  }

  function requireArray(value, owner) {
    if (!Array.isArray(value)) fail(`${owner} must be an array`);
  }

  function requireNumber(value, owner, min = 0) {
    if (!Number.isFinite(value) || value < min) fail(`${owner} must be a number >= ${min}`);
  }

  function requireString(value, owner) {
    if (!value || typeof value !== "string") fail(`${owner} must be a non-empty string`);
  }

  requireObject(content, "content");
  requireObject(weapons, "weapons");
  requireArray(weaponUnlocks, "weaponUnlocks");
  requireArray(metaUpgrades, "metaUpgrades");
  requireArray(runUpgrades, "runUpgrades");
  requireObject(quests, "quests");
  requireObject(questGroups, "questGroups");
  requireArray(enemyTypes, "enemyTypes");
  requireObject(bossConfig, "bossConfig");
  requireObject(bossAbilities, "bossAbilities");
  requireArray(characters, "characters");
  requireArray(shopItems, "shopItems");
  requireArray(relics, "relics");
  requireArray(levels, "levels");
  requireArray(maps, "maps");
  if (content.assets) requireObject(assets, "assets");
  if (content.tuning) requireObject(tuning, "tuning");

  Object.entries(weapons).forEach(([id, weapon]) => {
    requireString(id, "weapon id");
    requireString(weapon.name, `weapon ${id}.name`);
    requireString(weapon.description, `weapon ${id}.description`);
    requireString(weapon.kind, `weapon ${id}.kind`);
    if (weaponBehaviorKinds.length && !weaponBehaviorKinds.includes(weapon.kind)) {
      fail(`weapon ${id} has unsupported kind ${weapon.kind}`);
    }
    requireString(weapon.upgradeId, `weapon ${id}.upgradeId`);
    requireNumber(weapon.cooldown, `weapon ${id}.cooldown`, 0.01);
    requireNumber(weapon.damage, `weapon ${id}.damage`, 0);
    if (weapon.assetId && assets.sprites?.weapons && !assets.sprites.weapons[weapon.assetId]) {
      fail(`weapon ${id} references missing weapon asset ${weapon.assetId}`);
    }
  });

  weaponUnlocks.forEach((unlock) => {
    requireString(unlock.id, "weaponUnlock.id");
    if (seenUnlocks.has(unlock.id)) fail(`duplicate weapon unlock ${unlock.id}`);
    seenUnlocks.add(unlock.id);
    if (!weapons[unlock.weaponId]) fail(`${unlock.id} references missing weapon ${unlock.weaponId}`);
    if (unlock.requiresNode && !weaponUnlocks.some((item) => item.id === unlock.requiresNode)) {
      fail(`${unlock.id} references missing requiresNode ${unlock.requiresNode}`);
    }
    if (unlock.requiresQuest && !quests[unlock.requiresQuest]) {
      fail(`${unlock.id} references missing requiresQuest ${unlock.requiresQuest}`);
    }
    if (unlock.opensQuest && !quests[unlock.opensQuest]) {
      fail(`${unlock.id} references missing opensQuest ${unlock.opensQuest}`);
    }
    requireNumber(unlock.cost, `${unlock.id}.cost`, 0);
  });

  metaUpgrades.forEach((upgrade) => {
    requireString(upgrade.id, "metaUpgrade.id");
    if (seenMetaUpgrades.has(upgrade.id)) fail(`duplicate meta upgrade ${upgrade.id}`);
    seenMetaUpgrades.add(upgrade.id);
    ["name", "description"].forEach((field) => requireString(upgrade[field], `metaUpgrade ${upgrade.id}.${field}`));
    requireArray(upgrade.cost, `metaUpgrade ${upgrade.id}.cost`);
    const costs = Array.isArray(upgrade.cost) ? upgrade.cost : [];
    costs.forEach((cost, index) => requireNumber(cost, `metaUpgrade ${upgrade.id}.cost[${index}]`, 0));
    requireNumber(upgrade.maxTier, `metaUpgrade ${upgrade.id}.maxTier`, 1);
    if (costs.length && costs.length !== upgrade.maxTier) {
      fail(`metaUpgrade ${upgrade.id}.cost length must match maxTier`);
    }
    if (upgrade.requiresNode && !weaponUnlocks.some((item) => item.id === upgrade.requiresNode)) {
      fail(`${upgrade.id} references missing requiresNode ${upgrade.requiresNode}`);
    }
    if (upgrade.requiresQuest && !quests[upgrade.requiresQuest]) {
      fail(`${upgrade.id} references missing requiresQuest ${upgrade.requiresQuest}`);
    }
    if (upgrade.opensQuest && !quests[upgrade.opensQuest]) {
      fail(`${upgrade.id} references missing opensQuest ${upgrade.opensQuest}`);
    }
  });

  runUpgrades.forEach((upgrade) => {
    requireString(upgrade.id, "runUpgrade.id");
    if (seenRunUpgrades.has(upgrade.id)) fail(`duplicate run upgrade ${upgrade.id}`);
    seenRunUpgrades.add(upgrade.id);
    ["name", "description"].forEach((field) => requireString(upgrade[field], `runUpgrade ${upgrade.id}.${field}`));
    requireNumber(upgrade.maxTier, `runUpgrade ${upgrade.id}.maxTier`, 1);
    if (upgrade.effects) requireArray(upgrade.effects, `runUpgrade ${upgrade.id}.effects`);
    const effects = Array.isArray(upgrade.effects) ? upgrade.effects : [];
    effects.forEach((effect, index) => {
      requireString(effect.type, `runUpgrade ${upgrade.id}.effects[${index}].type`);
      requireNumber(effect.value, `runUpgrade ${upgrade.id}.effects[${index}].value`, 0);
      if (effect.type === "playerStatAdd") {
        if (!runUpgradePlayerStats.includes(effect.stat)) {
          fail(`runUpgrade ${upgrade.id}.effects[${index}] has unsupported player stat ${effect.stat}`);
        }
      } else if (!runUpgradeEffectTypes.includes(effect.type)) {
        fail(`runUpgrade ${upgrade.id}.effects[${index}] has unsupported type ${effect.type}`);
      }
    });
  });

  Object.entries(quests).forEach(([id, quest]) => {
    requireString(quest.name, `quest ${id}.name`);
    requireString(quest.description, `quest ${id}.description`);
    requireNumber(quest.target, `quest ${id}.target`, 1);
    requireNumber(quest.rewardQp, `quest ${id}.rewardQp`, 0);
    if (quest.weaponId && !weapons[quest.weaponId]) fail(`${id} references missing weapon ${quest.weaponId}`);
    if (quest.opensQuest && !quests[quest.opensQuest]) fail(`${id} references missing opensQuest ${quest.opensQuest}`);
    (quest.opensQuests || []).forEach((nextQuestId) => {
      if (!quests[nextQuestId]) fail(`${id} references missing opensQuests item ${nextQuestId}`);
    });
  });

  Object.entries(questGroups).forEach(([group, ids]) => {
    requireArray(ids, `questGroups.${group}`);
    ids.forEach((questId) => {
      if (!quests[questId]) fail(`questGroups.${group} references missing quest ${questId}`);
    });
  });

  enemyTypes.forEach((enemy) => {
    requireString(enemy.id, "enemy.id");
    if (seenEnemies.has(enemy.id)) fail(`duplicate enemy ${enemy.id}`);
    seenEnemies.add(enemy.id);
    ["name", "color"].forEach((field) => requireString(enemy[field], `enemy ${enemy.id}.${field}`));
    ["radius", "hp", "speed", "damage", "xp"].forEach((field) => requireNumber(enemy[field], `enemy ${enemy.id}.${field}`, 0));
    if (enemy.behaviorKind) {
      const behaviorKinds = schema.behaviorRegistries?.enemyBehaviorKinds?.ids || [];
      if (behaviorKinds.length && !behaviorKinds.includes(enemy.behaviorKind)) {
        fail(`enemy ${enemy.id} has unsupported behaviorKind ${enemy.behaviorKind}`);
      }
    }
    if (enemy.assetId && assets.sprites?.enemies && !assets.sprites.enemies[enemy.assetId]) {
      fail(`enemy ${enemy.id} references missing enemy asset ${enemy.assetId}`);
    }
  });

  if (bossConfig.abilityIds !== undefined) {
    requireArray(bossConfig.abilityIds, "bossConfig.abilityIds");
    (Array.isArray(bossConfig.abilityIds) ? bossConfig.abilityIds : []).forEach((abilityId) => {
      requireString(abilityId, "bossConfig.abilityIds item");
      if (!bossAbilities[abilityId]) fail(`bossConfig references missing boss ability ${abilityId}`);
      if (bossAbilityKinds.length && !bossAbilityKinds.includes(abilityId)) {
        fail(`bossConfig references unsupported boss ability ${abilityId}`);
      }
    });
  }
  [
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
  ].forEach((field) => {
    if (bossConfig[field] !== undefined) requireNumber(bossConfig[field], `bossConfig.${field}`, 0);
  });
  if (bossConfig.drop) {
    requireObject(bossConfig.drop, "bossConfig.drop");
    ["radius", "superRadius", "damage", "superDamage"].forEach((field) => {
      requireNumber(bossConfig.drop[field], `bossConfig.drop.${field}`, 0);
    });
  }
  if (bossConfig.enemyBolt) {
    requireObject(bossConfig.enemyBolt, "bossConfig.enemyBolt");
    ["radius", "life"].forEach((field) => requireNumber(bossConfig.enemyBolt[field], `bossConfig.enemyBolt.${field}`, 0));
  }
  if (bossConfig.projectileScaling) {
    requireObject(bossConfig.projectileScaling, "bossConfig.projectileScaling");
    ["fireRateBase", "fireRatePerFloor", "fireRateMax", "speedBase", "speedPerFloor", "speedMax"].forEach((field) => {
      requireNumber(bossConfig.projectileScaling[field], `bossConfig.projectileScaling.${field}`, 0);
    });
  }
  Object.entries(bossAbilities).forEach(([id, ability]) => {
    requireString(id, "boss ability id");
    ["name", "color"].forEach((field) => requireString(ability[field], `boss ability ${id}.${field}`));
    ["speed", "attackCooldown"].forEach((field) => requireNumber(ability[field], `boss ability ${id}.${field}`, 0));
    if (id === "warden") {
      requireObject(ability.shockwave, "boss ability warden.shockwave");
      ["radius", "damage", "windup"].forEach((field) => requireNumber(ability.shockwave?.[field], `boss ability warden.shockwave.${field}`, 0));
    }
    if (id === "charger") {
      ["windup", "duration", "chargeSpeed", "superChargeSpeed"].forEach((field) => requireNumber(ability[field], `boss ability charger.${field}`, 0));
      requireObject(ability.slash, "boss ability charger.slash");
      ["offset", "arcPi", "radius", "superRadius", "damageMultiplier", "superDamageMultiplier", "windup"].forEach((field) => {
        requireNumber(ability.slash?.[field], `boss ability charger.slash.${field}`, 0);
      });
    }
    if (id === "turret") {
      ["attackRange", "projectileCooldown", "projectileSpeed", "projectileDamage", "superProjectileDamage", "initialShootTimer"].forEach((field) => {
        requireNumber(ability[field], `boss ability turret.${field}`, 0);
      });
    }
  });

  characters.forEach((character) => {
    requireString(character.id, "character.id");
    if (seenCharacters.has(character.id)) fail(`duplicate character ${character.id}`);
    seenCharacters.add(character.id);
    ["name", "description", "spriteId"].forEach((field) =>
      requireString(character[field], `character ${character.id}.${field}`),
    );
    if (assets.sprites?.player && character.spriteId !== "player" && !assets.sprites?.characters?.[character.spriteId]) {
      fail(`character ${character.id} references missing character sprite ${character.spriteId}`);
    }
  });

  (assets.sources || []).forEach((source) => {
    requireString(source.id, "asset source.id");
    requireString(source.name, `asset source ${source.id}.name`);
    requireString(source.license, `asset source ${source.id}.license`);
    if (source.commercialUse !== true) fail(`asset source ${source.id} must explicitly allow commercial use`);
    if (source.attributionRequired !== false) {
      fail(`asset source ${source.id} must explicitly say attribution is not required`);
    }
    requireString(source.localLicense, `asset source ${source.id}.localLicense`);
    if (!existsSync(join(root, source.localLicense))) {
      fail(`asset source ${source.id} local license file is missing: ${source.localLicense}`);
    }
  });

  function validateSpritePath(value, owner) {
    if (typeof value === "string") {
      const localPath = value.split("?")[0];
      if (!existsSync(join(root, localPath))) fail(`${owner} references missing asset ${value}`);
      return;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.entries(value).forEach(([key, child]) => validateSpritePath(child, `${owner}.${key}`));
    }
  }

  validateSpritePath(assets.sprites, "assets.sprites");
  validateSpritePath(assets.sfx, "assets.sfx");

  validateShopItems(shopItems, { fail, requireNumber, requireString, schema, validateSpritePath });

  relics.forEach((relic) => {
    requireString(relic.id, "relic.id");
    if (seenRelics.has(relic.id)) fail(`duplicate relic ${relic.id}`);
    seenRelics.add(relic.id);
    ["name", "description", "targetUpgradeId"].forEach((field) => requireString(relic[field], `relic ${relic.id}.${field}`));
    if (!runUpgrades.some((upgrade) => upgrade.id === relic.targetUpgradeId)) {
      fail(`relic ${relic.id} references missing run upgrade ${relic.targetUpgradeId}`);
    }
    requireNumber(relic.selectionWeightBonus, `relic ${relic.id}.selectionWeightBonus`, 0);
    requireNumber(relic.startingTierBonus, `relic ${relic.id}.startingTierBonus`, 0);
    requireNumber(relic.maxTierBonus, `relic ${relic.id}.maxTierBonus`, 0);
    if (relic.iconPath) validateSpritePath(relic.iconPath, `relic ${relic.id}.iconPath`);
    if (relic.specialAbility) {
      const supportedKinds = schema.behaviorRegistries?.relicSpecialKinds?.ids || [];
      const specialKind = relic.specialAbility.kind || "modifiers";
      if (supportedKinds.length && !supportedKinds.includes(specialKind)) {
        fail(`relic ${relic.id} has unsupported specialAbility.kind ${specialKind}`);
      }
      if (relic.specialAbility.modifiers) {
        requireObject(relic.specialAbility.modifiers, `relic ${relic.id}.specialAbility.modifiers`);
        const validStats = schema.effectRegistries?.relic?.modifierStats || [];
        Object.entries(relic.specialAbility.modifiers || {}).forEach(([stat, value]) => {
          if (validStats.length && !validStats.includes(stat)) {
            fail(`relic ${relic.id} has unsupported specialAbility modifier ${stat}`);
          }
          requireNumber(value, `relic ${relic.id}.specialAbility.modifiers.${stat}`, 0);
        });
      }
    }
  });

  const knownEnemyIds = new Set(enemyTypes.map((enemy) => enemy.id));
  levels.forEach((level) => {
    requireString(level.id, "level.id");
    if (seenLevels.has(level.id)) fail(`duplicate level ${level.id}`);
    seenLevels.add(level.id);
    requireString(level.name, `level ${level.id}.name`);
    requireNumber(level.startsAt, `level ${level.id}.startsAt`, 0);
    if (level.enemyIds) {
      requireArray(level.enemyIds, `level ${level.id}.enemyIds`);
      (Array.isArray(level.enemyIds) ? level.enemyIds : []).forEach((enemyId) => {
        requireString(enemyId, `level ${level.id}.enemyIds item`);
        if (!knownEnemyIds.has(enemyId)) fail(`level ${level.id} references missing enemy ${enemyId}`);
      });
    }
    if (level.spawnCount !== undefined) requireNumber(level.spawnCount, `level ${level.id}.spawnCount`, 1);
    if (level.spawnRateMultiplier !== undefined) {
      requireNumber(level.spawnRateMultiplier, `level ${level.id}.spawnRateMultiplier`, 0.01);
    }
    if (level.notes !== undefined) requireString(level.notes, `level ${level.id}.notes`);
  });

  const knownLevelIds = new Set(levels.map((level) => level.id));
  maps.forEach((map) => {
    requireString(map.id, "map.id");
    if (seenMaps.has(map.id)) fail(`duplicate map ${map.id}`);
    seenMaps.add(map.id);
    requireString(map.name, `map ${map.id}.name`);
    if (map.floorIds) {
      requireArray(map.floorIds, `map ${map.id}.floorIds`);
      (Array.isArray(map.floorIds) ? map.floorIds : []).forEach((floorId) => {
        requireString(floorId, `map ${map.id}.floorIds item`);
        if (!knownLevelIds.has(floorId)) fail(`map ${map.id} references missing floor ${floorId}`);
      });
    }
    if (map.backgroundAsset) validateSpritePath(map.backgroundAsset, `map ${map.id}.backgroundAsset`);
    if (map.modifiers) {
      requireObject(map.modifiers, `map ${map.id}.modifiers`);
      Object.entries(map.modifiers || {}).forEach(([key, value]) => requireNumber(value, `map ${map.id}.modifiers.${key}`, 0));
    }
  });

  if (tuning.shop) {
    requireObject(tuning.shop, "tuning.shop");
    ["floorPriceRate", "inflationRate"].forEach((field) => {
      if (tuning.shop[field] !== undefined) requireNumber(tuning.shop[field], `tuning.shop.${field}`, 0);
    });
  }
  if (tuning.loot) {
    requireObject(tuning.loot, "tuning.loot");
    ["coinFloorRewardRate", "normalCoinBaseValue", "bossCoinBaseValue"].forEach((field) => {
      if (tuning.loot[field] !== undefined) requireNumber(tuning.loot[field], `tuning.loot.${field}`, 0);
    });
  }

  return errors;
}
