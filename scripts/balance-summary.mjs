import { assembleRegistryContent, changedBalanceValues, readBalanceProfiles, validateBalanceProfile } from "./content-tools.mjs";

const content = assembleRegistryContent();
const profiles = readBalanceProfiles();

console.log("# Tap Survivor Balance Summary");

if (!profiles.length) {
  console.log("- no balance profiles found");
  process.exit(0);
}

profiles.forEach((profile) => {
  const errors = validateBalanceProfile(profile, content);
  const changes = changedBalanceValues(content, profile);
  console.log(`\n## ${profile.profileId}`);
  console.log(`- description: ${profile.description || "none"}`);
  console.log(`- override sections: ${Object.keys(profile.overrides || {}).join(", ") || "none"}`);
  console.log(`- changed values: ${changes.length}`);
  console.log(`- validation: ${errors.length ? `FAIL (${errors.length})` : "PASS"}`);
  changes.slice(0, 40).forEach((change) => {
    const id = change.id ? `.${change.id}` : "";
    console.log(`  - ${change.section}${id}.${change.field}: ${change.before} -> ${change.after}`);
  });
  if (changes.length > 40) console.log(`  - ...${changes.length - 40} more`);
});
