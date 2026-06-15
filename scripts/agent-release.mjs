import { spawnSync } from "node:child_process";

function usage() {
  console.log(`Usage:
  npm run agent:release -- [--message "Commit message"]

Runs the standard ship path and requires live deployment verification after the push.`);
}

function flag(name) {
  return process.argv.includes(name);
}

if (flag("--help")) {
  usage();
  process.exit(0);
}

const forwardedArgs = process.argv.slice(2).filter((arg) => arg !== "--deploy");
const shipArgs = ["run", "agent:ship", "--", "--deploy", ...forwardedArgs];

console.log("# Tap Survivor Agent Release");
console.log("Runs `npm run agent:ship -- --deploy` so validated pushes are followed by live deployment checks.");

const result = spawnSync("npm", shipArgs, {
  stdio: "inherit",
});

process.exit(result.status || 0);
