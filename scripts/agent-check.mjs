import { spawnSync } from "node:child_process";

const configuredTimeoutMs = Number(process.env.AGENT_CHECK_COMMAND_TIMEOUT_MS || 120000);
const commandTimeoutMs =
  Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0 ? configuredTimeoutMs : 120000;
const prettierExtensions = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".html",
  ".css",
  ".yml",
  ".yaml",
]);
const excludedFormatPrefixes = [
  ".git/",
  ".agent/runs/",
  "node_modules/",
  "dist/",
  "build/",
  "coverage/",
  ".cache/",
  "tmp/",
  "temp/",
  "out/",
  "www/",
];

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
  ["node", ["--check", "scripts/build-module-bridges.mjs"]],
  ["node", ["--check", "scripts/check-format-hygiene.mjs"]],
  ["node", ["--check", "scripts/check-runtime-parity.mjs"]],
  ["node", ["--check", "scripts/add-sfx.mjs"]],
  ["node", ["--check", "scripts/content-check.mjs"]],
  ["node", ["--check", "scripts/verify-focus.mjs"]],
  ["node", ["--check", "scripts/smoke-game-harness.mjs"]],
  ["node", ["--check", "scripts/smoke-browser.mjs"]],
  ["node", ["--check", "scripts/smoke-asset-resolver.mjs"]],
  ["node", ["--check", "scripts/smoke-projectile-colors.mjs"]],
  ["node", ["--check", "scripts/smoke-enemy-visual-states.mjs"]],
  ["node", ["--check", "scripts/smoke-spritesheets.mjs"]],
  ["node", ["--check", "scripts/smoke-audio-scaling.mjs"]],
  ["node", ["--check", "scripts/smoke-content-tools.mjs"]],
  ["node", ["--check", "scripts/smoke-add-content.mjs"]],
  ["node", ["--check", "scripts/smoke-balance-runtime.mjs"]],
  ["node", ["--check", "scripts/smoke-map-runtime.mjs"]],
  ["node", ["--check", "scripts/smoke-module-runtime-entrypoint.mjs"]],
  ["node", ["--check", "scripts/smoke-module-production-entrypoint.mjs"]],
  ["node", ["--check", "scripts/smoke-module-runtime-readiness.mjs"]],
  ["node", ["--check", "scripts/smoke-module-bridges.mjs"]],
  ["node", ["--check", "scripts/smoke-game-runtime-module.mjs"]],
  ["node", ["scripts/smoke-game-runtime-module.mjs"]],
  ["node", ["--check", "scripts/smoke-relic-run-start.mjs"]],
  ["node", ["--check", "scripts/extract-sprites.mjs"]],
  ["node", ["--check", "scripts/prep-spritesheets.mjs"]],
  ["node", ["--check", "scripts/smoke-extract-sprites.mjs"]],
  ["node", ["--check", "scripts/content-summary.mjs"]],
  ["node", ["--check", "scripts/economy-check.mjs"]],
  ["node", ["--check", "scripts/check-script-order.mjs"]],
  ["node", ["--check", "src/modules/balance.js"]],
  ["node", ["--check", "src/modules/level-up-choices.js"]],
  ["node", ["--check", "src/modules/map-system.js"]],
  ["node", ["--check", "src/modules/math.js"]],
  ["node", ["--check", "src/modules/save-corruption.js"]],
  ["node", ["--check", "src/modules/save-defaults.js"]],
  ["node", ["--check", "src/modules/save-migrations.js"]],
  ["node", ["--check", "src/modules/save-normalize.js"]],
  ["node", ["--check", "src/modules/save.js"]],
  ["node", ["--check", "src/modules/game-dependencies.js"]],
  ["node", ["--check", "src/modules/game-state-store.js"]],
  ["node", ["--check", "src/modules/module-runtime-platform-adapter.js"]],
  ["node", ["--check", "src/modules/module-game-dependencies.js"]],
  ["node", ["--check", "src/modules/game-runtime.js"]],
  ["node", ["--check", "src/modules/combat-damage.js"]],
  ["node", ["--check", "src/modules/pickups.js"]],
  ["node", ["--check", "src/modules/run-lifecycle.js"]],
  ["node", ["--check", "src/modules/run-state.js"]],
  ["node", ["--check", "src/modules/run-ui.js"]],
  ["node", ["--check", "src/modules/run-update.js"]],
  ["node", ["--check", "src/modules/shop-pricing.js"]],
  ["node", ["--check", "src/modules/weapon-cooldowns.js"]],
  ["node", ["--check", "src/modules/weapon-projectiles.js"]],
  ["node", ["--check", "src/modules/weapon-targeting.js"]],
  ["node", ["--check", "src/effects.js"]],
  ["node", ["--check", "src/render-hud.js"]],
  ["npm", ["run", "content:check"]],
  ["npm", ["run", "content:summary"]],
  ["npm", ["run", "economy:check"]],
  ["npm", ["run", "build:bridges"]],
  ["npm", ["run", "verify:script-order"]],
  ["npm", ["run", "verify:assets"]],
  ["npm", ["run", "verify:audio"]],
  ["npm", ["run", "verify:content"]],
  ["npm", ["run", "verify:relics"]],
  ["npm", ["run", "verify:ui"]],
  ["npm", ["run", "smoke:assets"]],
  ["npm", ["run", "smoke:projectile-colors"]],
  ["npm", ["run", "smoke:enemy-visual-states"]],
  ["npm", ["run", "smoke:spritesheets"]],
  ["npm", ["run", "smoke:audio"]],
  ["npm", ["run", "smoke:browser"]],
  ["npm", ["run", "smoke:save"]],
  ["npm", ["run", "smoke:start-run"]],
  ["npm", ["run", "smoke:boss-run"]],
  ["npm", ["run", "smoke:shop"]],
  ["npm", ["run", "smoke:module-runtime-platform-adapter"]],
  ["npm", ["run", "smoke:module-runtime-entrypoint"]],
  ["npm", ["run", "smoke:module-production-entrypoint"]],
  ["npm", ["run", "smoke:module-runtime-readiness"]],
  ["npm", ["run", "smoke:module-bridges"]],
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
  return [...new Set([...trackedChangedFiles(), ...untrackedChangedFiles()])];
}

function trackedChangedFiles() {
  const label = "git diff --name-only --diff-filter=ACMRT HEAD --";
  const result = spawnSync("git", ["diff", "--name-only", "--diff-filter=ACMRT", "HEAD", "--"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: commandTimeoutMs,
  });
  return parseGitFileListResult(label, result);
}

function untrackedChangedFiles() {
  const label = "git ls-files --others --exclude-standard";
  const result = spawnSync("git", ["ls-files", "--others", "--exclude-standard"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: commandTimeoutMs,
  });
  return parseGitFileListResult(label, result);
}

function parseGitFileListResult(label, result) {
  if (result.error?.code === "ETIMEDOUT") {
    printCommandOutput(result);
    console.error(`FAIL ${label} timed out after ${commandTimeoutMs}ms`);
    console.error("Agent validation failed fast because a child command exceeded its timeout.");
    process.exit(1);
  }
  if (result.status !== 0) {
    printCommandOutput(result);
    console.error(`FAIL ${label} exited ${result.status}`);
    process.exit(1);
  }
  if (!result.stdout.trim()) return [];
  return result.stdout
    .trim()
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
}

function extensionFor(file) {
  const match = file.toLowerCase().match(/(\.[^.\/]+)$/);
  return match ? match[1] : "";
}

function formatSkipReason(file) {
  if (
    excludedFormatPrefixes.some((prefix) => file === prefix.slice(0, -1) || file.startsWith(prefix))
  ) {
    return "excluded path";
  }
  if (!prettierExtensions.has(extensionFor(file))) {
    return "unsupported extension";
  }
  return "";
}

function formatChangedFiles(files) {
  console.log("\n## format changed files");
  if (!files.length) {
    console.log("Changed files found: none");
    console.log("No eligible changed files to format.");
    return;
  }

  const selected = [];
  const skipped = [];
  for (const file of files) {
    const reason = formatSkipReason(file);
    if (reason) {
      skipped.push({ file, reason });
    } else {
      selected.push(file);
    }
  }

  console.log("Changed files found:");
  files.forEach((file) => console.log(`- ${file}`));
  console.log("Files selected for formatting:");
  if (selected.length) selected.forEach((file) => console.log(`- ${file}`));
  else console.log("- none");
  console.log("Files skipped:");
  if (skipped.length) skipped.forEach(({ file, reason }) => console.log(`- ${file} (${reason})`));
  else console.log("- none");

  if (!selected.length) {
    console.log("No eligible changed files to format.");
    return;
  }

  const result = spawnSync("npx", ["prettier", "--write", ...selected], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: commandTimeoutMs,
  });
  printCommandOutput(result);
  if (result.error?.code === "ETIMEDOUT") {
    console.error(`FAIL npx prettier --write timed out after ${commandTimeoutMs}ms`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`FAIL npx prettier --write exited ${result.status}`);
    process.exit(1);
  }
  console.log("PASS formatted changed files");
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
        file.startsWith("src/modules/") ||
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
      (file) =>
        file === "src/balance.js" ||
        file === "src/modules/balance.js" ||
        file === "src/level-up-choices.js" ||
        file === "src/modules/level-up-choices.js" ||
        file === "src/map-system.js" ||
        file === "src/modules/map-system.js" ||
        file === "src/save-corruption.js" ||
        file === "src/modules/save-corruption.js" ||
        file === "src/save-defaults.js" ||
        file === "src/modules/save-defaults.js" ||
        file === "src/save-migrations.js" ||
        file === "src/modules/save-migrations.js" ||
        file === "src/save-normalize.js" ||
        file === "src/modules/save-normalize.js" ||
        file === "src/save.js" ||
        file === "src/modules/save.js" ||
        file === "src/shop-pricing.js" ||
        file === "src/math.js" ||
        file === "src/modules/math.js" ||
        file === "src/modules/shop-pricing.js" ||
        file === "src/weapon-cooldowns.js" ||
        file === "src/modules/weapon-cooldowns.js" ||
        file === "src/weapon-projectiles.js" ||
        file === "src/modules/weapon-projectiles.js" ||
        file === "src/weapon-targeting.js" ||
        file === "src/modules/weapon-targeting.js" ||
        file === "src/game-runtime.js" ||
        file === "src/modules/game-runtime.js" ||
        file === "src/game-dependencies.js" ||
        file === "src/modules/game-dependencies.js" ||
        file === "src/modules/module-game-dependencies.js" ||
        file === "src/app/production-module-entrypoint.js" ||
        file === "src/modules/module-runtime-platform-adapter.js" ||
        file === "src/combat-damage.js" ||
        file === "src/modules/combat-damage.js" ||
        file === "src/pickups.js" ||
        file === "src/modules/pickups.js" ||
        file === "src/run-update.js" ||
        file === "src/modules/run-update.js" ||
        file === "src/run-ui.js" ||
        file === "src/modules/run-ui.js" ||
        file === "src/app/module-runtime-test-entrypoint.js" ||
        file === "scripts/smoke-game-harness.mjs" ||
        file === "scripts/smoke-game-runtime-module.mjs" ||
        file === "scripts/smoke-module-runtime-entrypoint.mjs" ||
        file === "scripts/smoke-module-production-entrypoint.mjs" ||
        file === "scripts/smoke-module-runtime-readiness.mjs" ||
        file === "scripts/build-module-bridges.mjs" ||
        file === "scripts/smoke-module-bridges.mjs" ||
        file === "package.json"
    )
  ) {
    checks.push(
      ["npm", ["run", "build:bridges"]],
      ["npm", ["run", "verify:script-order"]],
      ["npm", ["run", "smoke:module-runtime-platform-adapter"]],
      ["npm", ["run", "smoke:module-runtime-entrypoint"]],
      ["npm", ["run", "smoke:module-production-entrypoint"]],
      ["npm", ["run", "smoke:module-runtime-readiness"]],
      ["npm", ["run", "smoke:module-bridges"]],
      ["npm", ["run", "smoke:shop"]]
    );
  }
  if (
    files.some(
      (file) => file.startsWith("assets/") || file.includes("sprites") || file === "src/assets.js"
    )
  ) {
    checks.push(
      ["npm", ["run", "verify:assets"]],
      ["npm", ["run", "smoke:assets"]],
      ["npm", ["run", "smoke:spritesheets"]]
    );
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
  if (
    files.some(
      (file) =>
        file === "src/modules/game-runtime.js" ||
        file === "src/game-runtime.js" ||
        file === "src/modules/game-dependencies.js" ||
        file === "src/game-dependencies.js" ||
        file === "scripts/smoke-game-harness.mjs" ||
        file === "scripts/smoke-game-runtime-module.mjs" ||
        file === "package.json"
    )
  ) {
    checks.push(["node", ["scripts/smoke-game-runtime-module.mjs"]]);
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
const fixFormatChanged = process.argv.includes("--fix-format-changed");
let files = changedFiles();
if (fixFormatChanged) {
  formatChangedFiles(files);
  files = changedFiles();
}
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
