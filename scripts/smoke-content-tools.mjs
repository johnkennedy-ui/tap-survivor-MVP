import { linkQuestAfter, readContentSchema, validateContent } from "./content-tools.mjs";

function check(name, pass) {
  if (!pass) {
    console.error(`FAIL ${name}`);
    process.exit(1);
  }
  console.log(`PASS ${name}`);
}

const quests = {
  first: { name: "First" },
  second: { name: "Second" },
  branch: { name: "Branch" },
};

linkQuestAfter(quests, "first", "second");
check("first follow-up uses opensQuest", quests.first.opensQuest === "second");

linkQuestAfter(quests, "first", "branch");
check("branch follow-up uses opensQuests", quests.first.opensQuest === "second" && quests.first.opensQuests.includes("branch"));

linkQuestAfter(quests, "first", "branch");
check("branch follow-up is not duplicated", quests.first.opensQuests.length === 1);

let missingFailed = false;
try {
  linkQuestAfter(quests, "missing", "second");
} catch {
  missingFailed = true;
}
check("missing previous quest fails", missingFailed);

const schema = readContentSchema();
const shopStat = schema.effectRegistries.shopItem.stats[0];
const weaponKind = schema.behaviorRegistries.weaponKinds.ids[0];
const schemaBackedContent = {
  weapons: {
    schema_weapon: {
      name: "Schema Weapon",
      description: "Uses schema-backed behavior validation.",
      upgradeId: "schema_weapon_damage",
      cooldown: 1,
      damage: 1,
      kind: weaponKind,
    },
  },
  weaponUnlocks: [],
  metaUpgrades: [],
  runUpgrades: [],
  quests: {},
  questGroups: {},
  enemyTypes: [],
  bossConfig: {},
  bossAbilities: {},
  characters: [],
  shopItems: [{
    id: "schema_shop_item",
    name: "Schema Shop Item",
    description: "Uses schema-backed shop effect validation.",
    kind: "stat_upgrade",
    cost: 1,
    maxTier: 1,
    effect: { stat: shopStat, value: 1 },
  }],
  relics: [],
  levels: [],
  assets: {},
};

check("schema-backed shop effect validates", validateContent(schemaBackedContent).length === 0);

const badWeaponKindContent = JSON.parse(JSON.stringify(schemaBackedContent));
badWeaponKindContent.weapons.schema_weapon.kind = "unsupported_kind";
check(
  "schema-backed weapon kind rejects unsupported kind",
  validateContent(badWeaponKindContent).some((error) => error.includes("unsupported kind unsupported_kind")),
);

const badBossAbilityContent = JSON.parse(JSON.stringify(schemaBackedContent));
badBossAbilityContent.bossConfig = { abilityIds: ["blink"] };
badBossAbilityContent.bossAbilities = {
  blink: {
    name: "Blink",
    color: "#ffffff",
    speed: 1,
    attackCooldown: 1,
  },
};
check(
  "schema-backed boss ability rejects unsupported kind",
  validateContent(badBossAbilityContent).some((error) => error.includes("unsupported boss ability blink")),
);
