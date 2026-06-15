import { spawnSync } from "node:child_process";

function usage() {
  console.log(`Usage:
  npm run agent:ship -- [--message "Commit message"] [--deploy]

Runs the standard prepush/full validation path, commits any local changes, and pushes only if the checks pass.`);
}

function flag(name) {
  return process.argv.includes(name);
}

if (flag("--help")) {
  usage();
  process.exit(0);
}

const forwardedArgs = process.argv.slice(2);
const finishArgs = ["run", "agent:finish", "--", "--push", ...forwardedArgs];

console.log("# Tap Survivor Agent Ship");
console.log("Runs `npm run agent:finish -- --push` so prepush validation must pass before any push.");

const result = spawnSync("npm", finishArgs, {
  stdio: "inherit",
});

process.exit(result.status || 0);
