import { spawnSync } from "node:child_process";

const configuredTimeoutMs = Number(process.env.AGENT_CHECK_COMMAND_TIMEOUT_MS || 120000);
const commandTimeoutMs =
  Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0 ? configuredTimeoutMs : 120000;

const fullChecks = [
  ["git", ["diff", "--check"]],
  ["npm", ["run", "format:check"]],
  ["npm", ["run", "check:format-hygiene"]],
  ["npm", ["run", "check:globals"]],
  ["npm", ["run", "typecheck:content"]],
  ["node", ["--check", "scripts/agent-finish.mjs"]],
  ["node", ["--check", "scripts/agent-start.mjs"]],
  ["node", ["--check", "scripts/agent-handoff.mjs"]],
  ["node", ["--check", "scripts/agent-status.mjs"]],
  ["node", ["--check", "scripts/agent-check.mjs"]],
  ["node", ["--check", "scripts/agent-evidence.mjs"]],
  ["node", ["--check", "scripts/agent-prepush.mjs"]],
  ["node", ["--check", "scripts/agent-ship.mjs"]],
  ["node", ["--check", "scripts/agent-release.mjs"]],
  ["node", ["--check", "scripts/check-deploy.mjs"]],
  ["node", ["--check", "scripts/build-web.mjs"]],
  ["node", ["--check", "scripts/check-format-hygiene.mjs"]],
  ["node", ["--check", "scripts/check-runtime-parity.mjs"]],
  ["node", ["--check", "scripts/add-sfx.mjs"]],
  ["node", ["--check", "scripts/content-check.mjs"]],
  ["node", ["--check", "scripts/verify-focus.mjs"]],
  ["node", ["--check", "scripts/smoke-game-harness.mjs"]],
  ["node", ["--check", "scripts/smoke-browser.mjs"]],
  ["node", ["--check", "scripts/smoke-asset-resolver.mjs"]],
  ["node", ["--check", "scripts/smoke-audio-scaling.mjs"]],
  ["node", ["--check", "scripts/smoke-content-tools.mjs"]],
  ["node", ["--check", "scripts/smoke-add-content.mjs"]],
  ["node", ["--check", "scripts/smoke-balance-runtime.mjs"]],
  ["node", ["--check", "scripts/smoke-map-runtime.mjs"]],
  ["node", ["--check", "scripts/smoke-relic-run-start.mjs"]],
  ["node", ["--check", "scripts/extract-sprites.mjs"]],
  ["node", ["--check", "scripts/smoke-extract-sprites.mjs"]],
  ["node", ["--check", "scripts/content-summary.mjs"]],
  ["node", ["--check", "scripts/economy-check.mjs"]],
  ["node", ["--check", "scripts/check-script-order.mjs"]],
  ["node", ["--check", "src/effects.js"]],
  ["node", ["--check", "src/render-hud.js"]],
  ["npm", ["run", "content:check"]],
  ["npm", ["run", "content:summary"]],
  ["npm", ["run", "economy:check"]],
  ["npm", ["run", "verify:script-order"]],
  ["npm", ["run", "verify:assets"]],
  ["npm", ["run", "verify:audio"]],
  ["npm", ["run", "verify:content"]],
  ["npm", ["run", "verify:relics"]],
  ["npm", ["run", "verify:ui"]],
  ["npm", ["run", "smoke:assets"]],
  ["npm", ["run", "smoke:audio"]],
  ["npm", ["run", "smoke:browser"]],
  ["npm", ["run", "smoke:save"]],
  ["npm", ["run", "smoke:start-run"]],
  ["npm", ["run", "smoke:boss-run"]],
  ["npm", ["run", "smoke:shop"]],
  ["npm", ["run", "smoke:relic-run-start"]],
  ["npm", ["run", "smoke:debug"]],
  ["npm", ["run", "smoke:quest-flow"]],
  ["npm", ["run", "smoke:content-tools"]],
  ["npm", ["run", "smoke:add-content"]],
  ["npm", ["run", "smoke:balance-runtime"]],
  ["npm", ["run", "smoke:map-runtime"]],
  ["npm", ["run", "smoke:sprite-extract"]],
  ["npm", ["test"]],
];

function changedFiles() {
  const label = "git status --short --untracked-files=all";
  const result = spawnSync("git", ["status", "--short", "--untracked-files=all"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: commandTimeoutMs,
  });
  if (result.error?.code === "ETIMEDOUT") {
    printCommandOutput(result);
    console.error(`FAIL ${label} timed out after ${commandTimeoutMs}ms`);
    console.error("Agent validation failed fast because a child command exceeded its timeout.");
    process.exit(1);
  }
  if (result.status !== 0 || !result.stdout.trim()) return [];
  return result.stdout
    .trim()
    .split("\n")
    .map((line) => line.replace(/^[ MARCUD?!]{1,2}\s+/, "").trim())
    .map((file) => file.split(" -> ").pop())
    .filter(Boolean);
}

function printCommandOutput(result) {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}

function focusedChecks(files) {
  const checks = [
    ["git", ["diff", "--check"]],
    ["npm", ["run", "format:check"]],
    ["npm", ["run", "check:format-hygiene"]],
  ];
  files
    .filter((file) => /\.(mjs|js)$/.test(file) && !file.endsWith("src/content.generated.js"))
    .forEach((file) => checks.push(["node", ["--check", file]]));
  if (files.some((file) => file.startsWith("content/") || file === "src/content.generated.js")) {
    checks.push(
      ["npm", ["run", "content:check"]],
      ["npm", ["run", "economy:check"]],
      ["npm", ["run", "smoke:add-content"]],
      ["npm", ["run", "verify:content"]]
    );
  }
  if (
    files.some(
      (file) =>
        file === "scripts/add-content.mjs" ||
        file === "scripts/content-tools.mjs" ||
        file === "scripts/smoke-add-content.mjs"
    )
  ) {
    checks.push(["npm", ["run", "smoke:add-content"]]);
  }
  if (
    files.some(
      (file) =>
        file.startsWith("scripts/content/") ||
        file === "scripts/content-tools.mjs" ||
        file === "tsconfig.content.json" ||
        file === "package.json" ||
        file === "package-lock.json"
    )
  ) {
    checks.push(["npm", ["run", "typecheck:content"]]);
  }
  if (
    files.some(
      (file) => file === "src/shop.js" || file === "src/pickups.js" || file === "src/balance.js"
    )
  ) {
    checks.push(["npm", ["run", "economy:check"]]);
  }
  if (
    files.some(
      (file) => file.startsWith("assets/") || file.includes("sprites") || file === "src/assets.js"
    )
  ) {
    checks.push(["npm", ["run", "verify:assets"]], ["npm", ["run", "smoke:assets"]]);
  }
  if (
    files.some(
      (file) => file === "src/audio.js" || file === "src/weapon-fire.js" || file.includes("sfx")
    )
  ) {
    checks.push(
      ["npm", ["run", "verify:audio"]],
      ["npm", ["run", "smoke:audio"]],
      ["npm", ["run", "smoke:start-run"]]
    );
  }
  if (
    files.some(
      (file) => file === "src/relics.js" || file === "src/shell-ui.js" || file.includes("relic")
    )
  ) {
    checks.push(["npm", ["run", "verify:relics"]], ["npm", ["run", "smoke:relic-run-start"]]);
  }
  if (
    files.some(
      (file) =>
        file === "index.html" ||
        file === "src/styles.css" ||
        file === "src/level-up.js" ||
        file === "src/shell-ui.js"
    )
  ) {
    checks.push(
      ["npm", ["run", "verify:script-order"]],
      ["npm", ["run", "verify:ui"]],
      ["npm", ["run", "smoke:browser"]]
    );
  }
  if (
    files.some(
      (file) =>
        file.startsWith("src/") ||
        file === "index.html" ||
        file === "scripts/check-globals.mjs" ||
        file === "scripts/allowed-globals.json" ||
        file === "docs/GLOBAL_STATE_INVENTORY.md" ||
        file.startsWith("docs/") ||
        file === "AGENTS.md" ||
        file === "README.md" ||
        file === "scripts/check-format-hygiene.mjs"
    )
  ) {
    checks.push(["npm", ["run", "check:format-hygiene"]]);
  }
  if (
    files.some(
      (file) =>
        file.startsWith("src/") ||
        file === "index.html" ||
        file.startsWith("scripts/") ||
        file === "scripts/allowed-globals.json"
    )
  ) {
    checks.push(["npm", ["run", "check:globals"]]);
  }
  if (files.some((file) => file.startsWith("src/") && /\.(js)$/.test(file))) {
    checks.push(["npm", ["run", "verify:script-order"]]);
  }
  return dedupeChecks(checks);
}

function needsFullCheck(files) {
  return files.some(
    (file) =>
      file === "package.json" || file.startsWith(".github/") || file === "scripts/agent-check.mjs"
  );
}

function dedupeChecks(checks) {
  const seen = new Set();
  return checks.filter(([command, args]) => {
    const key = `${command} ${args.join(" ")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

console.log("# Tap Survivor Agent Check");

let failed = false;
const files = changedFiles();
const full =
  process.argv.includes("--full") ||
  process.env.AGENT_CHECK_FULL === "1" ||
  !files.length ||
  needsFullCheck(files);
const checks = full ? fullChecks : focusedChecks(files);

console.log(full ? "Mode: full" : "Mode: focused");
console.log(`Command timeout: ${commandTimeoutMs}ms`);
if (!full) {
  console.log("Changed files:");
  files.forEach((file) => console.log(`- ${file}`));
}

for (const [command, args] of checks) {
  const label = `${command} ${args.join(" ")}`;
  console.log(`\n## ${label}`);
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: commandTimeoutMs,
  });

  printCommandOutput(result);

  if (result.error?.code === "ETIMEDOUT") {
    failed = true;
    console.log(`FAIL ${label} timed out after ${commandTimeoutMs}ms`);
    console.log("Agent validation failed fast because a child command exceeded its timeout.");
    break;
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
