import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assembleRegistryContent,
  linkQuestAfter,
  readContentSchema,
  root,
  validateContent,
} from "./content-tools.mjs";

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

const badShopKindContent = JSON.parse(JSON.stringify(schemaBackedContent));
badShopKindContent.shopItems[0].kind = "loot_box";
check(
  "schema-backed shop item kind rejects unsupported kind",
  validateContent(badShopKindContent).some((error) => error.includes("unsupported kind loot_box")),
);

const badShopCostContent = JSON.parse(JSON.stringify(schemaBackedContent));
badShopCostContent.shopItems[0].cost = [10, 5];
badShopCostContent.shopItems[0].maxTier = 2;
check(
  "schema-backed shop item cost tiers must increase",
  validateContent(badShopCostContent).some((error) => error.includes("cost[1] must be greater than cost[0]")),
);

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

const progressionContent = {
  ...schemaBackedContent,
  tuning: {
    progression: {
      relicSlotLevels: [3, 8, 15],
      questCacheCost: 3,
      questCacheFallbackCoins: 40,
    },
  },
};
check("schema-backed progression tuning validates", validateContent(progressionContent).length === 0);

const invalidProgressionLevels = JSON.parse(JSON.stringify(progressionContent));
invalidProgressionLevels.tuning.progression.relicSlotLevels = [3, 3, 15];
check(
  "progression slot levels reject repeated thresholds",
  validateContent(invalidProgressionLevels).some((error) => error.includes("must be strictly ascending")),
);

const invalidProgressionCost = JSON.parse(JSON.stringify(progressionContent));
invalidProgressionCost.tuning.progression.questCacheCost = 0;
check(
  "progression Quest Cache cost rejects unsafe values",
  validateContent(invalidProgressionCost).some((error) => error.includes("questCacheCost must be an integer >= 1")),
);

const canonicalContent = assembleRegistryContent();
const compatibilityMirrorPath = join(root, "content/tap-survivor-content.json");
check(
  "compatibility mirror matches canonical assembled registry content",
  readFileSync(compatibilityMirrorPath, "utf8") === `${JSON.stringify(canonicalContent, null, 2)}\n`,
);

const temporaryContentDir = mkdtempSync(join(tmpdir(), "tap-survivor-content-"));
const overridePath = join(temporaryContentDir, "override-content.json");
const overrideContent = {
  ...canonicalContent,
  relics: [],
};
const overrideSource = `${JSON.stringify(overrideContent, null, 2)}\n`;
writeFileSync(overridePath, overrideSource);

try {
  const statusOutput = execFileSync(process.execPath, ["scripts/agent-status.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      TAP_SURVIVOR_CONTENT_PATH: overridePath,
    },
  });
  check(
    "agent status reads canonical registry content despite an external content override",
    statusOutput.includes(`- relics: ${canonicalContent.relics.length}`) && !statusOutput.includes("- relics: 0"),
  );

  execFileSync(process.execPath, ["scripts/build-content.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      TAP_SURVIVOR_CONTENT_PATH: overridePath,
    },
  });
  check(
    "content build preserves an external TAP_SURVIVOR_CONTENT_PATH override",
    readFileSync(overridePath, "utf8") === overrideSource,
  );
} finally {
  try {
    execFileSync(process.execPath, ["scripts/build-content.mjs"], {
      cwd: root,
      encoding: "utf8",
    });
  } finally {
    rmSync(temporaryContentDir, { force: true, recursive: true });
  }
}
