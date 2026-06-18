#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const DEFAULT_FORBIDS = [
  "www/**",
  "src/content.generated.js",
  "android/key.properties",
  "*.jks",
  "*.keystore",
  ".env",
  ".env.*",
];

function printHelp() {
  console.log(`Usage:
  node scripts/check-task-scope.mjs [options]

Options:
  --base <ref>                 Base ref. Defaults to HEAD.
  --allow <glob>               Allowed changed path glob. Repeatable.
  --forbid <glob>              Forbidden changed path glob. Repeatable.
  --require-changed <path>     Path that must be changed. Repeatable.
  --mode <git|working>         Check mode. Defaults to working.
  --help                       Show this help.

Examples:
  npm run check:task-scope -- --mode working --allow "docs/**"
  npm run check:task-scope -- --mode git --base origin/main --allow "scripts/**"
`);
}

function failUsage(message) {
  console.error(`FAIL ${message}`);
  console.error("Run with --help for usage.");
  process.exit(2);
}

function parseArgs(argv) {
  const options = {
    allow: [],
    base: "HEAD",
    forbid: [],
    mode: "working",
    requireChanged: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help") {
      options.help = true;
      continue;
    }

    if (arg === "--base") {
      options.base = readValue(argv, ++index, arg);
      continue;
    }

    if (arg === "--allow") {
      options.allow.push(readValue(argv, ++index, arg));
      continue;
    }

    if (arg === "--forbid") {
      options.forbid.push(readValue(argv, ++index, arg));
      continue;
    }

    if (arg === "--require-changed") {
      options.requireChanged.push(readValue(argv, ++index, arg));
      continue;
    }

    if (arg === "--mode") {
      options.mode = readValue(argv, ++index, arg);
      continue;
    }

    failUsage(`unknown argument: ${arg}`);
  }

  if (!["git", "working"].includes(options.mode)) {
    failUsage(`--mode must be git or working, got: ${options.mode}`);
  }

  return options;
}

function readValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    failUsage(`${flag} requires a value`);
  }
  return value;
}

function runGit(args) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    shell: false,
  });

  if (result.status !== 0) {
    const detail = result.stderr || result.error?.message || "unknown git error";
    throw new Error(`git ${args.join(" ")} failed: ${detail.trim()}`);
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values)].sort();
}

function getChangedFiles(options) {
  if (options.mode === "git") {
    return unique(runGit(["diff", "--name-only", options.base, "HEAD"]));
  }

  return unique([
    ...runGit(["diff", "--name-only"]),
    ...runGit(["diff", "--name-only", "--cached"]),
    ...runGit(["ls-files", "--others", "--exclude-standard"]),
  ]);
}

function globToRegex(glob) {
  let source = "";

  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    const next = glob[index + 1];

    if (char === "*" && next === "*") {
      source += ".*";
      index += 1;
      continue;
    }

    if (char === "*") {
      source += "[^/]*";
      continue;
    }

    source += char.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
  }

  return new RegExp(`^${source}$`);
}

function matchesGlob(path, glob) {
  if (glob.endsWith("/**")) {
    const prefix = glob.slice(0, -3);
    return path === prefix || path.startsWith(`${prefix}/`);
  }

  if (glob.startsWith("**/")) {
    const filename = glob.slice(3);
    return path === filename || path.endsWith(`/${filename}`);
  }

  return globToRegex(glob).test(path);
}

function matchesAny(path, globs) {
  return globs.some((glob) => matchesGlob(path, glob));
}

function printList(label, values) {
  console.log(`${label}:`);
  if (!values.length) {
    console.log("  - none");
    return;
  }
  values.forEach((value) => console.log(`  - ${value}`));
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const forbiddenGlobs = unique([...DEFAULT_FORBIDS, ...options.forbid]);
const changedFiles = getChangedFiles(options);
const failures = [];

for (const file of changedFiles) {
  if (!matchesAny(file, options.allow)) {
    failures.push(`${file} does not match any --allow glob`);
  }

  if (matchesAny(file, forbiddenGlobs)) {
    failures.push(`${file} matches a forbidden glob`);
  }
}

for (const file of options.requireChanged) {
  if (!changedFiles.includes(file)) {
    failures.push(`${file} is required by --require-changed but was not changed`);
  }
}

console.log("# Tap Survivor Task Scope Check");
console.log(`Base ref: ${options.base}`);
console.log(`Mode: ${options.mode}`);
printList("Changed files", changedFiles);
printList("Allowed globs", options.allow);
printList("Forbidden globs", forbiddenGlobs);

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  console.error("FAIL task scope check failed");
  process.exit(1);
}

console.log("PASS task scope check");
