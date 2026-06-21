import { assembleRegistryContent, readContent, validateBalanceProfiles, validateContent } from "./content-tools.mjs";

const content = readContent();
const sourceContent = assembleRegistryContent();
const errors = [...validateContent(content), ...validateBalanceProfiles(sourceContent).map((error) => `balance profile: ${error}`)];

console.log("# Tap Survivor Content Validation");

if (errors.length) {
  errors.forEach((error) => console.error(`FAIL ${error}`));
  process.exit(1);
}

console.log(`PASS ${Object.keys(content.weapons || {}).length} weapons`);
console.log(`PASS ${(content.weaponUnlocks || []).length} weapon unlocks`);
console.log(`PASS ${Object.keys(content.quests || {}).length} quests`);
console.log(`PASS ${(content.enemyTypes || []).length} enemy types`);
console.log(`PASS ${(content.characters || []).length} characters`);
console.log(`PASS ${(content.shopItems || []).length} shop items`);
console.log(`PASS ${(content.levels || []).length} level entries`);
console.log(`PASS ${(content.maps || []).length} map entries`);
