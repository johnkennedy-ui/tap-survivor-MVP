import { linkQuestAfter, readContent, readContentSchema, writeContent, parseArgs, validateContent } from "./content-tools.mjs";

const args = parseArgs(process.argv.slice(2));
const [type, id] = args._;
const schema = readContentSchema();

function usage() {
  console.log(`Usage:
  node scripts/add-content.mjs quest <id> --name "Name" --description "Do thing" --target 100 --reward 2 --group kill [--weapon spark_bolt] [--after previous_id] [--opens next_id]
  node scripts/add-content.mjs weapon <id> --name "Name" --description "Weapon text" --kind projectile --damage 20 --cooldown 1 --color "#ffffff" --unlock-cost 2 --branch Core [--requires-node unlock_laser] [--requires-quest use_laser_run]
  node scripts/add-content.mjs shop-item <id> --name "Name" --description "Item text" --kind stat_upgrade --cost 100 --effect-stat speed --effect-value 5 [--max-tier 1]
  node scripts/add-content.mjs level <id> --name "Name" --starts-at 120 [--enemies drifter,skitter] [--spawn-count 2] [--spawn-rate 1.1]
  node scripts/add-content.mjs character <id> --name "Name" --description "Character text" --sprite player`);
}

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

try {
  if (!type || !id || args.help) {
    usage();
    process.exit(type || args.help ? 0 : 1);
  }

  const content = readContent();
  content.weapons ||= {};
  content.weaponUnlocks ||= [];
  content.quests ||= {};
  content.questGroups ||= {};
  content.enemyTypes ||= [];
  content.characters ||= [];
  content.shopItems ||= [];
  content.levels ||= [];

  if (type === "quest") {
    if (content.quests[id]) throw new Error(`Quest already exists: ${id}`);
    const group = args.group;
    if (args.after === id) throw new Error("--after cannot point at the new quest");
    content.quests[id] = {
      name: requireValue("name"),
      description: requireValue("description"),
      ...(args.weapon ? { weaponId: args.weapon } : {}),
      target: numberValue("target"),
      rewardQp: numberValue("reward"),
      ...(args.opens ? { opensQuest: args.opens } : {}),
    };
    if (group) {
      content.questGroups[group] ||= [];
      if (!content.questGroups[group].includes(id)) content.questGroups[group].push(id);
    }
    if (args.after) linkQuestAfter(content.quests, args.after, id);
  } else if (type === "weapon") {
    if (content.weapons[id]) throw new Error(`Weapon already exists: ${id}`);
    const unlockId = args["unlock-id"] || `unlock_${id}`;
    content.weapons[id] = {
      name: requireValue("name"),
      description: requireValue("description"),
      upgradeId: args["upgrade-id"] || `${id}_damage`,
      cooldown: numberValue("cooldown", 1),
      damage: numberValue("damage", 10),
      kind: requireValue("kind"),
      speed: numberValue("speed", 320),
      radius: numberValue("radius", 8),
      color: args.color || "#ffffff",
    };
    content.weaponUnlocks.push({
      id: unlockId,
      weaponId: id,
      cost: numberValue("unlock-cost", 1),
      branch: args.branch || "Core",
      ...(args["requires-node"] ? { requiresNode: args["requires-node"] } : {}),
      ...(args["requires-quest"] ? { requiresQuest: args["requires-quest"] } : {}),
      ...(args["opens-quest"] ? { opensQuest: args["opens-quest"] } : {}),
    });
  } else if (type === "shop-item") {
    if (content.shopItems.some((item) => item.id === id)) throw new Error(`Shop item already exists: ${id}`);
    const effectStat = args["effect-stat"] || args.effect;
    const effectValue = numberValue("effect-value", numberValue("value", 0));
    const shopEffectStats = schema.effectRegistries?.shopItem?.stats || [];
    if (effectStat && !shopEffectStats.includes(effectStat)) {
      throw new Error(`Unsupported shop item effect stat: ${effectStat}`);
    }
    content.shopItems.push({
      id,
      name: requireValue("name"),
      description: requireValue("description"),
      kind: args.kind || schema.contentTypes?.shopItem?.defaultKind || "stat_upgrade",
      cost: numberValue("cost"),
      maxTier: numberValue("max-tier", schema.contentTypes?.shopItem?.defaultMaxTier || 1),
      ...(effectStat ? { effect: { stat: effectStat, value: effectValue } } : {}),
    });
  } else if (type === "level") {
    if (content.levels.some((level) => level.id === id)) throw new Error(`Level already exists: ${id}`);
    content.levels.push({
      id,
      name: requireValue("name"),
      startsAt: numberValue("starts-at"),
      enemyIds: args.enemies ? args.enemies.split(",").filter(Boolean) : [],
      spawnCount: numberValue("spawn-count", 2),
      spawnRateMultiplier: numberValue("spawn-rate", 1),
      notes: args.notes || "",
    });
  } else if (type === "character") {
    if (content.characters.some((character) => character.id === id)) throw new Error(`Character already exists: ${id}`);
    content.characters.push({
      id,
      name: requireValue("name"),
      description: requireValue("description"),
      spriteId: requireValue("sprite"),
      notes: args.notes || "",
    });
  } else {
    throw new Error(`Unknown content type: ${type}`);
  }

  const errors = validateContent(content);
  if (errors.length) {
    throw new Error(errors.join("\n"));
  }

  writeContent(content);
  console.log(`PASS added ${type} ${id}`);
  console.log("Run: npm run build:content && npm test");
} catch (error) {
  console.error(`FAIL ${error.message}`);
  usage();
  process.exit(1);
}
