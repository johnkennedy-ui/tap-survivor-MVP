import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const root = new URL("..", import.meta.url).pathname;
export const contentPath = join(root, "content/tap-survivor-content.json");

export function readContent() {
  return JSON.parse(readFileSync(contentPath, "utf8"));
}

export function writeContent(content) {
  writeFileSync(contentPath, `${JSON.stringify(content, null, 2)}\n`);
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
  const characters = content.characters || [];
  const shopItems = content.shopItems || [];
  const relics = content.relics || [];
  const levels = content.levels || [];
  const assets = content.assets || {};

  const seenUnlocks = new Set();
  const seenMetaUpgrades = new Set();
  const seenRunUpgrades = new Set();
  const seenEnemies = new Set();
  const seenCharacters = new Set();
  const seenShopItems = new Set();
  const seenRelics = new Set();
  const seenLevels = new Set();

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
  requireArray(characters, "characters");
  requireArray(shopItems, "shopItems");
  requireArray(relics, "relics");
  requireArray(levels, "levels");
  if (content.assets) requireObject(assets, "assets");

  Object.entries(weapons).forEach(([id, weapon]) => {
    requireString(id, "weapon id");
    requireString(weapon.name, `weapon ${id}.name`);
    requireString(weapon.description, `weapon ${id}.description`);
    requireString(weapon.kind, `weapon ${id}.kind`);
    requireString(weapon.upgradeId, `weapon ${id}.upgradeId`);
    requireNumber(weapon.cooldown, `weapon ${id}.cooldown`, 0.01);
    requireNumber(weapon.damage, `weapon ${id}.damage`, 0);
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
        if (!["speed", "pickupRadius", "maxHp"].includes(effect.stat)) {
          fail(`runUpgrade ${upgrade.id}.effects[${index}] has unsupported player stat ${effect.stat}`);
        }
      } else if (effect.type !== "playerHeal") {
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
  });

  characters.forEach((character) => {
    requireString(character.id, "character.id");
    if (seenCharacters.has(character.id)) fail(`duplicate character ${character.id}`);
    seenCharacters.add(character.id);
    ["name", "description", "spriteId"].forEach((field) =>
      requireString(character[field], `character ${character.id}.${field}`),
    );
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

  shopItems.forEach((item) => {
    requireString(item.id, "shopItem.id");
    if (seenShopItems.has(item.id)) fail(`duplicate shop item ${item.id}`);
    seenShopItems.add(item.id);
    ["name", "description", "kind"].forEach((field) => requireString(item[field], `shopItem ${item.id}.${field}`));
    if (Array.isArray(item.cost)) {
      item.cost.forEach((cost, index) => requireNumber(cost, `shopItem ${item.id}.cost[${index}]`, 0));
    } else {
      requireNumber(item.cost, `shopItem ${item.id}.cost`, 0);
    }
    if (item.maxTier) requireNumber(item.maxTier, `shopItem ${item.id}.maxTier`, 1);
    if (Array.isArray(item.cost) && item.maxTier && item.cost.length !== item.maxTier) {
      fail(`shopItem ${item.id}.cost length must match maxTier`);
    }
    if (item.effect) {
      requireString(item.effect.stat, `shopItem ${item.id}.effect.stat`);
      if (!["speed", "pickupRadius", "maxHp", "flatDamage", "attackRadius", "fireRate", "percentDamage", "relicFocus"].includes(item.effect.stat)) {
        fail(`shopItem ${item.id} has unsupported effect stat ${item.effect.stat}`);
      }
      requireNumber(item.effect.value, `shopItem ${item.id}.effect.value`, 0);
    }
    if (item.spritePath) validateSpritePath(item.spritePath, `shopItem ${item.id}.spritePath`);
  });

  relics.forEach((relic) => {
    requireString(relic.id, "relic.id");
    if (seenRelics.has(relic.id)) fail(`duplicate relic ${relic.id}`);
    seenRelics.add(relic.id);
    ["name", "description", "targetUpgradeId"].forEach((field) => requireString(relic[field], `relic ${relic.id}.${field}`));
    if (!runUpgrades.some((upgrade) => upgrade.id === relic.targetUpgradeId)) {
      fail(`relic ${relic.id} references missing run upgrade ${relic.targetUpgradeId}`);
    }
    requireNumber(relic.selectionWeightBonus, `relic ${relic.id}.selectionWeightBonus`, 0);
    requireNumber(relic.maxTierBonus, `relic ${relic.id}.maxTierBonus`, 0);
  });

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
        if (!seenEnemies.has(enemyId)) fail(`level ${level.id} references missing enemy ${enemyId}`);
      });
    }
    if (level.spawnCount !== undefined) requireNumber(level.spawnCount, `level ${level.id}.spawnCount`, 1);
    if (level.spawnRateMultiplier !== undefined) {
      requireNumber(level.spawnRateMultiplier, `level ${level.id}.spawnRateMultiplier`, 0.01);
    }
    if (level.notes !== undefined) requireString(level.notes, `level ${level.id}.notes`);
  });

  return errors;
}

export function parseArgs(args) {
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
