import { linkQuestAfter, readContent, readContentSchema, writeContent, parseArgs, validateContent } from "./content-tools.mjs";
import { pathToFileURL } from "node:url";

function templateDefaults(schema, typeName) {
  return schema.templates?.[typeName]?.defaults || {};
}

function usage(log = console.log) {
  log(`Usage:
  node scripts/add-content.mjs quest <id> --name "Name" --description "Do thing" --target 100 --reward 2 --group kill [--weapon spark_bolt] [--after previous_id] [--opens next_id]
  node scripts/add-content.mjs weapon <id> --name "Name" --description "Weapon text" --kind projectile --damage 20 --cooldown 1 --color "#ffffff" --unlock-cost 2 --branch Core [--requires-node unlock_laser] [--requires-quest use_laser_run]
  node scripts/add-content.mjs shop-item <id> --name "Name" --description "Item text" --kind stat_upgrade --cost 100 --effect-stat speed --effect-value 5 [--max-tier 1]
  node scripts/add-content.mjs run-upgrade <id> --name "Name" --description "Upgrade text" --stat speed --value 5 [--max-tier 1]
  node scripts/add-content.mjs relic <id> --name "Name" --description "Relic text" --target-upgrade run_fire_rate
  node scripts/add-content.mjs enemy <id> --name "Name" --color "#ffffff"
  node scripts/add-content.mjs boss <id> --name "Name" --color "#ff4f8b"
  node scripts/add-content.mjs floor <id> --name "Name" --starts-at 120 [--enemies drifter,skitter] [--spawn-count 2] [--spawn-rate 1.1]
  node scripts/add-content.mjs map <id> --name "Name" [--floors floor_one,floor_two]
  node scripts/add-content.mjs character <id> --name "Name" --description "Character text" --sprite player`);
}

const contentFilesByType = {
  weapon: "content/registry/weapons.json",
  quest: "content/registry/quests.json",
  "shop-item": "content/registry/shop-items.json",
  "run-upgrade": "content/registry/run-upgrades.json",
  relic: "content/registry/relics.json",
  enemy: "content/registry/enemies.json",
  boss: "content/registry/bosses.json",
  level: "content/registry/floors.json",
  floor: "content/registry/floors.json",
  map: "content/registry/maps.json",
  character: "content/registry/characters.json",
};

export function addContentFromArgs(rawArgs, options = {}) {
  const args = parseArgs(rawArgs);
  const [type, id] = args._;
  const schema = options.schema || readContentSchema();
  const content = options.content || readContent();

  function requireValue(name) {
    const value = args[name];
    if (value === undefined || value === true || value === "") {
      throw new Error(`Missing --${name}`);
    }
    return value;
  }

  function numberValue(name, fallback = undefined) {
    const raw = args[name];
    if (raw === undefined) return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`--${name} must be a number`);
    return value;
  }

  if (!type || !id || args.help) {
    return { content, id, skipped: true, type, exitCode: type || args.help ? 0 : 1 };
  }

  content.weapons ||= {};
  content.weaponUnlocks ||= [];
  content.quests ||= {};
  content.questGroups ||= {};
  content.enemyTypes ||= [];
  content.characters ||= [];
  content.shopItems ||= [];
  content.levels ||= [];
  content.maps ||= [];
  content.relics ||= [];
  content.runUpgrades ||= [];
  content.bossAbilities ||= {};

  if (type === "quest") {
    const defaults = templateDefaults(schema, "quest");
    if (content.quests[id]) throw new Error(`Quest already exists: ${id}`);
    const group = args.group;
    if (args.after === id) throw new Error("--after cannot point at the new quest");
    content.quests[id] = {
      name: requireValue("name"),
      description: requireValue("description"),
      ...(args.weapon ? { weaponId: args.weapon } : {}),
      target: numberValue("target", defaults.target),
      rewardQp: numberValue("reward", defaults.rewardQp),
      ...(args.opens ? { opensQuest: args.opens } : {}),
    };
    if (group) {
      content.questGroups[group] ||= [];
      if (!content.questGroups[group].includes(id)) content.questGroups[group].push(id);
    }
    if (args.after) linkQuestAfter(content.quests, args.after, id);
  } else if (type === "weapon") {
    const defaults = templateDefaults(schema, "weapon");
    if (content.weapons[id]) throw new Error(`Weapon already exists: ${id}`);
    const unlockId = args["unlock-id"] || `unlock_${id}`;
    content.weapons[id] = {
      name: requireValue("name"),
      description: requireValue("description"),
      upgradeId: args["upgrade-id"] || `${id}_damage`,
      cooldown: numberValue("cooldown", defaults.cooldown),
      damage: numberValue("damage", defaults.damage),
      kind: args.kind || defaults.kind,
      speed: numberValue("speed", defaults.speed),
      radius: numberValue("radius", defaults.radius),
      color: args.color || defaults.color,
    };
    content.weaponUnlocks.push({
      id: unlockId,
      weaponId: id,
      cost: numberValue("unlock-cost", defaults.unlockCost),
      branch: args.branch || defaults.branch,
      ...(args["requires-node"] ? { requiresNode: args["requires-node"] } : {}),
      ...(args["requires-quest"] ? { requiresQuest: args["requires-quest"] } : {}),
      ...(args["opens-quest"] ? { opensQuest: args["opens-quest"] } : {}),
    });
  } else if (type === "shop-item") {
    const defaults = templateDefaults(schema, "shopItem");
    if (content.shopItems.some((item) => item.id === id)) throw new Error(`Shop item already exists: ${id}`);
    const effectStat = args["effect-stat"] || args.effect;
    const effectValue = numberValue("effect-value", numberValue("value", defaults.effectValue));
    const shopEffectStats = schema.effectRegistries?.shopItem?.stats || [];
    if (effectStat && !shopEffectStats.includes(effectStat)) {
      throw new Error(`Unsupported shop item effect stat: ${effectStat}`);
    }
    content.shopItems.push({
      id,
      name: requireValue("name"),
      description: requireValue("description"),
      kind: args.kind || defaults.kind || schema.contentTypes?.shopItem?.defaultKind || "stat_upgrade",
      cost: numberValue("cost", defaults.cost),
      maxTier: numberValue("max-tier", defaults.maxTier || schema.contentTypes?.shopItem?.defaultMaxTier || 1),
      ...(effectStat ? { effect: { stat: effectStat, value: effectValue } } : {}),
    });
  } else if (type === "run-upgrade") {
    const defaults = templateDefaults(schema, "runUpgrade");
    if (content.runUpgrades.some((upgrade) => upgrade.id === id)) throw new Error(`Run upgrade already exists: ${id}`);
    const stat = args.stat || defaults.effects?.[0]?.stat || "speed";
    content.runUpgrades.push({
      id,
      name: requireValue("name"),
      description: requireValue("description"),
      maxTier: numberValue("max-tier", defaults.maxTier || 1),
      effects: [
        {
          type: args["effect-type"] || defaults.effects?.[0]?.type || "playerStatAdd",
          stat,
          value: numberValue("value", defaults.effects?.[0]?.value ?? 0),
        },
      ],
    });
  } else if (type === "relic") {
    const defaults = templateDefaults(schema, "relic");
    if (content.relics.some((relic) => relic.id === id)) throw new Error(`Relic already exists: ${id}`);
    content.relics.push({
      id,
      name: requireValue("name"),
      description: requireValue("description"),
      targetUpgradeId: args["target-upgrade"] || defaults.targetUpgradeId,
      selectionWeightBonus: numberValue("selection-weight", defaults.selectionWeightBonus),
      startingTierBonus: numberValue("starting-tier", defaults.startingTierBonus),
      maxTierBonus: numberValue("max-tier-bonus", defaults.maxTierBonus),
      iconPath: args.icon || defaults.iconPath,
    });
  } else if (type === "enemy") {
    const defaults = templateDefaults(schema, "enemy");
    if (content.enemyTypes.some((enemy) => enemy.id === id)) throw new Error(`Enemy already exists: ${id}`);
    content.enemyTypes.push({
      id,
      name: args.name || defaults.name,
      color: args.color || defaults.color,
      radius: numberValue("radius", defaults.radius),
      hp: numberValue("hp", defaults.hp),
      speed: numberValue("speed", defaults.speed),
      damage: numberValue("damage", defaults.damage),
      touchCooldown: numberValue("touch-cooldown", 0.6),
      xp: numberValue("xp", defaults.xp),
      assetId: args["asset-id"] || defaults.assetId || "drifter",
      minTowerFloor: numberValue("min-tower-floor", defaults.minTowerFloor),
      ...(args["behavior-kind"] ? { behaviorKind: args["behavior-kind"] } : {}),
    });
  } else if (type === "boss") {
    const defaults = templateDefaults(schema, "boss");
    if (content.bossAbilities[id]) throw new Error(`Boss ability already exists: ${id}`);
    content.bossAbilities[id] = {
      name: args.name || defaults.name,
      color: args.color || defaults.color,
      speed: numberValue("speed", defaults.speed),
      attackCooldown: numberValue("attack-cooldown", defaults.attackCooldown),
    };
  } else if (type === "level" || type === "floor") {
    const defaults = templateDefaults(schema, "floor");
    if (content.levels.some((level) => level.id === id)) throw new Error(`Level already exists: ${id}`);
    content.levels.push({
      id,
      name: requireValue("name"),
      startsAt: numberValue("starts-at", defaults.startsAt),
      enemyIds: args.enemies ? args.enemies.split(",").filter(Boolean) : defaults.enemyIds || [],
      spawnCount: numberValue("spawn-count", defaults.spawnCount),
      spawnRateMultiplier: numberValue("spawn-rate", defaults.spawnRateMultiplier),
      ...(args.notes ? { notes: args.notes } : {}),
    });
  } else if (type === "map") {
    const defaults = templateDefaults(schema, "map");
    if (content.maps.some((map) => map.id === id)) throw new Error(`Map already exists: ${id}`);
    content.maps.push({
      id,
      name: requireValue("name"),
      floorIds: args.floors ? args.floors.split(",").filter(Boolean) : defaults.floorIds || [],
      backgroundAsset: args.background || defaults.backgroundAsset,
      modifiers: defaults.modifiers || {},
    });
  } else if (type === "character") {
    const defaults = templateDefaults(schema, "character");
    if (content.characters.some((character) => character.id === id)) throw new Error(`Character already exists: ${id}`);
    content.characters.push({
      id,
      name: requireValue("name"),
      description: requireValue("description"),
      spriteId: args.sprite || defaults.spriteId || requireValue("sprite"),
      notes: args.notes || defaults.notes || "",
    });
  } else {
    throw new Error(`Unknown content type: ${type}`);
  }

  const errors = validateContent(content);
  if (errors.length) {
    throw new Error(errors.join("\n"));
  }

  if (options.write !== false) writeContent(content);
  return { content, filesChanged: [contentFilesByType[type] || "content/registry"], id, skipped: false, type };
}

function runCli() {
  try {
    const result = addContentFromArgs(process.argv.slice(2));
    if (result.skipped) {
      usage();
      process.exit(result.exitCode);
    }
    console.log(`PASS added ${result.type} ${result.id}`);
    console.log(`Files changed: ${result.filesChanged.join(", ")}`);
    console.log("Run: npm run build:content && npm run validate:content && npm test");
  } catch (error) {
    console.error(`FAIL ${error.message}`);
    usage(console.error);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
