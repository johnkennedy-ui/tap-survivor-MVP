import { assembleRegistryContent, readBalanceProfiles, validateBalanceProfile } from "./content-tools.mjs";

const content = assembleRegistryContent();
const profiles = readBalanceProfiles();
const errors = profiles.flatMap((profile) =>
  validateBalanceProfile(profile, content).map((error) => `${profile.profileId || "unknown"}: ${error}`),
);

console.log("# Tap Survivor Balance Check");
console.log(`- profiles checked: ${profiles.length}`);

if (errors.length) {
  errors.forEach((error) => console.error(`FAIL ${error}`));
  process.exit(1);
}

console.log("PASS balance profiles are valid");
