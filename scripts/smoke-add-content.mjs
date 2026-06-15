import { readFileSync } from "node:fs";
import { join } from "node:path";
import { addContentFromArgs } from "./add-content.mjs";

const root = new URL("..", import.meta.url).pathname;
const content = JSON.parse(readFileSync(join(root, "content/tap-survivor-content.json"), "utf8"));
const schema = JSON.parse(readFileSync(join(root, "content/tap-survivor-schema.json"), "utf8"));
let failed = false;

function runAddContent(args) {
  addContentFromArgs(args, { content, schema, write: false });
  return true;
}

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) failed = true;
}

check("weapon add-content succeeds with schema defaults", runAddContent([
  "weapon",
  "smoke_schema_weapon",
  "--name",
  "Smoke Schema Weapon",
  "--description",
  "Added by smoke test with schema defaults.",
]));
check("weapon uses schema default kind", content.weapons.smoke_schema_weapon.kind === "projectile");
check("weapon creates default unlock", content.weaponUnlocks.some((unlock) => unlock.id === "unlock_smoke_schema_weapon"));

check("quest add-content succeeds with schema defaults", runAddContent([
  "quest",
  "smoke_schema_quest",
  "--name",
  "Smoke Schema Quest",
  "--description",
  "Added by smoke test with schema defaults.",
  "--group",
  "starter",
]));
check("quest uses schema default target", content.quests.smoke_schema_quest.target === 1);
check("quest uses schema default reward", content.quests.smoke_schema_quest.rewardQp === 1);
check("quest is added to group", content.questGroups.starter.includes("smoke_schema_quest"));

check("shop item add-content succeeds with schema defaults", runAddContent([
  "shop-item",
  "smoke_schema_shop_item",
  "--name",
  "Smoke Schema Shop Item",
  "--description",
  "Added by smoke test with schema defaults.",
]));
const shopItem = content.shopItems.find((item) => item.id === "smoke_schema_shop_item");
check("shop item uses schema default kind", shopItem?.kind === "stat_upgrade");
check("shop item uses schema default cost", shopItem?.cost === 100);
check("shop item uses schema default max tier", shopItem?.maxTier === 1);

check("level add-content succeeds", runAddContent([
  "level",
  "smoke_schema_level",
  "--name",
  "Smoke Schema Level",
  "--starts-at",
  "999",
  "--enemies",
  "drifter,skitter",
]));
check("level is added", content.levels.some((level) => level.id === "smoke_schema_level"));

check("character add-content succeeds", runAddContent([
  "character",
  "smoke_schema_character",
  "--name",
  "Smoke Schema Character",
  "--description",
  "Added by smoke test.",
  "--sprite",
  "player",
]));
check("character is added", content.characters.some((character) => character.id === "smoke_schema_character"));

if (failed) {
  console.error("\nAdd-content smoke failed.");
  process.exit(1);
}

console.log("\nAdd-content smoke passed.");
