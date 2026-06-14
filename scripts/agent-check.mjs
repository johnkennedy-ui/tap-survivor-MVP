import { spawnSync } from "node:child_process";

const checks = [
  ["git", ["diff", "--check"]],
  ["node", ["--check", "scripts/agent-start.mjs"]],
  ["node", ["--check", "scripts/agent-handoff.mjs"]],
  ["node", ["--check", "scripts/agent-status.mjs"]],
  ["node", ["--check", "scripts/agent-check.mjs"]],
  ["node", ["--check", "scripts/agent-evidence.mjs"]],
  ["node", ["--check", "scripts/agent-prepush.mjs"]],
  ["node", ["--check", "scripts/smoke-game-harness.mjs"]],
  ["node", ["--check", "scripts/smoke-browser.mjs"]],
  ["node", ["--check", "scripts/smoke-content-tools.mjs"]],
  ["node", ["--check", "scripts/extract-sprites.mjs"]],
  ["node", ["--check", "scripts/smoke-extract-sprites.mjs"]],
  ["node", ["--check", "scripts/content-summary.mjs"]],
  ["node", ["--check", "src/render-hud.js"]],
  ["npm", ["run", "content:summary"]],
  ["npm", ["run", "smoke:browser"]],
  ["npm", ["run", "smoke:save"]],
  ["npm", ["run", "smoke:start-run"]],
  ["npm", ["run", "smoke:boss-run"]],
  ["npm", ["run", "smoke:shop"]],
  ["npm", ["run", "smoke:debug"]],
  ["npm", ["run", "smoke:quest-flow"]],
  ["npm", ["run", "smoke:content-tools"]],
  ["npm", ["run", "smoke:sprite-extract"]],
  ["npm", ["test"]],
];

console.log("# Tap Survivor Agent Check");

let failed = false;

for (const [command, args] of checks) {
  const label = `${command} ${args.join(" ")}`;
  console.log(`\n## ${label}`);
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    failed = true;
    console.log(`FAIL ${label} exited ${result.status}`);
    break;
  }

  console.log(`PASS ${label}`);
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log("\nPASS agent checks complete");
}
