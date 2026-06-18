#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const steps = [
  ["npm", ["run", "format:check"]],
  ["npm", ["run", "check:format-hygiene"]],
  ["npm", ["run", "check:package-id"]],
  ["npm", ["run", "build:content"]],
  ["npm", ["run", "validate:content"]],
  ["npm", ["test"]],
  ["npm", ["run", "agent:check"]],
  ["npm", ["run", "build:web"]],
  ["npm", ["run", "check:runtime-parity"]],
  ["npm", ["run", "android:sync"]],
  ["npm", ["run", "android:debug"]],
  ["npm", ["run", "android:bundle:local"]],
];

function formatCommand(command, args) {
  return [command, ...args].join(" ");
}

console.log("# Tap Survivor Release Candidate Gate");
console.log("This gate validates a local Play/internal-testing candidate.");
console.log("It does not upload to Play Console or require signing secrets.");
console.log("");

for (const [command, args] of steps) {
  const label = formatCommand(command, args);
  console.log(`## ${label}`);

  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.error(`FAIL ${label}`);
    throw result.error;
  }

  if (result.status !== 0) {
    console.error(`FAIL ${label} exited ${result.status}`);
    process.exit(result.status ?? 1);
  }

  console.log(`PASS ${label}`);
  console.log("");
}

console.log("PASS release candidate gate complete");
