import { assembleRegistryContent, changedBalanceValues, readBalanceProfile } from "./content-tools.mjs";

const profileId = process.argv[2] || process.env.TAP_SURVIVOR_BALANCE_PROFILE || "default";
const content = assembleRegistryContent();
const profile = readBalanceProfile(profileId);
const changes = changedBalanceValues(content, profile);

console.log(`# Tap Survivor Balance Diff: ${profile.profileId || profileId}`);

if (!changes.length) {
  console.log("- no value changes from base registry");
  process.exit(0);
}

changes.forEach((change) => {
  const id = change.id ? `.${change.id}` : "";
  console.log(`- ${change.section}${id}.${change.field}: ${change.before} -> ${change.after}`);
});
