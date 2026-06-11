import { spawnSync } from "node:child_process";

const checks = [
  ["git", ["diff", "--check"]],
  ["node", ["--check", "scripts/agent-start.mjs"]],
  ["node", ["--check", "scripts/agent-status.mjs"]],
  ["node", ["--check", "scripts/agent-check.mjs"]],
  ["node", ["--check", "scripts/agent-evidence.mjs"]],
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
