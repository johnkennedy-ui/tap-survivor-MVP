#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const usage = `Usage:
  node scripts/check-commit-evidence.mjs [options]

Options:
  --commit <ref>                 Commit/ref to inspect. Defaults to HEAD.
  --expect-file <path>           File that must exist in the committed object. Repeatable.
  --min-lines <path>=<number>    Minimum committed line count for a file. Repeatable.
  --max-line-length <number>     Maximum line length for expected files. Defaults to 240.
  --allow-unchanged              Allow expected files that were not changed by the commit.
  --help                         Show this help.

Example:
  npm run check:commit-evidence -- \\
    --commit HEAD \\
    --expect-file docs/MECHANIC_EXTENSION_GUIDE.md \\
    --min-lines docs/MECHANIC_EXTENSION_GUIDE.md=180 \\
    --max-line-length 240
`;

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function die(message) {
  console.error(`ERROR ${message}`);
  process.exit(2);
}

function git(args, options = {}) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  const ok = result.status === 0;

  if (!ok && !options.allowFailure) {
    const detail = result.stderr || result.error?.message || "unknown git error";
    die(`git ${args.join(" ")} failed: ${detail.trim()}`);
  }

  return {
    ok,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function parseNumber(raw, flagName) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    die(`${flagName} must be a non-negative integer: ${raw}`);
  }
  return value;
}

function parseArgs(argv) {
  const options = {
    commit: "HEAD",
    expectFiles: [],
    minLines: new Map(),
    maxLineLength: 240,
    allowUnchanged: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help") {
      console.log(usage);
      process.exit(0);
    }

    if (arg === "--allow-unchanged") {
      options.allowUnchanged = true;
      continue;
    }

    if (arg === "--commit") {
      options.commit = argv[index + 1] ?? die("--commit requires a value");
      index += 1;
      continue;
    }

    if (arg === "--expect-file") {
      const file = argv[index + 1] ?? die("--expect-file requires a value");
      options.expectFiles.push(file);
      index += 1;
      continue;
    }

    if (arg === "--min-lines") {
      const spec = argv[index + 1] ?? die("--min-lines requires a value");
      const separator = spec.lastIndexOf("=");
      if (separator <= 0 || separator === spec.length - 1) {
        die(`--min-lines must use <path>=<number>: ${spec}`);
      }
      const file = spec.slice(0, separator);
      const minimum = parseNumber(spec.slice(separator + 1), "--min-lines");
      options.minLines.set(file, minimum);
      index += 1;
      continue;
    }

    if (arg === "--max-line-length") {
      options.maxLineLength = parseNumber(
        argv[index + 1] ?? die("--max-line-length requires a value"),
        "--max-line-length"
      );
      index += 1;
      continue;
    }

    die(`unknown option: ${arg}`);
  }

  if (options.expectFiles.length === 0) {
    die("at least one --expect-file is required");
  }

  const expected = new Set(options.expectFiles);
  for (const file of options.minLines.keys()) {
    if (!expected.has(file)) {
      die(`--min-lines file must also be passed with --expect-file: ${file}`);
    }
  }

  return options;
}

function getChangedFiles(commit) {
  const output = git(["show", "--name-only", "--format=", commit]).stdout;
  return new Set(output.split(/\r?\n/).filter(Boolean));
}

function readCommittedFile(commit, file) {
  const result = git(["show", `${commit}:${file}`], { allowFailure: true });

  if (!result.ok) {
    return {
      exists: false,
      content: "",
    };
  }

  return {
    exists: true,
    content: result.stdout,
  };
}

function getLineStats(content) {
  if (content.length === 0) {
    return {
      lineCount: 0,
      longestLine: 0,
    };
  }

  const normalized = content.endsWith("\n") ? content.slice(0, -1) : content;
  const lines = normalized.length === 0 ? [""] : normalized.split(/\r?\n/);
  return {
    lineCount: lines.length,
    longestLine: Math.max(...lines.map((line) => line.length)),
  };
}

const options = parseArgs(process.argv.slice(2));
const changedFiles = getChangedFiles(options.commit);

console.log("# Commit Evidence Check");
console.log(`Commit: ${options.commit}`);
console.log(`Allow unchanged: ${options.allowUnchanged ? "yes" : "no"}`);
console.log(`Max line length: ${options.maxLineLength}`);
console.log("");

for (const file of options.expectFiles) {
  const committed = readCommittedFile(options.commit, file);
  const changed = changedFiles.has(file);
  const stats = committed.exists
    ? getLineStats(committed.content)
    : { lineCount: "-", longestLine: "-" };

  console.log(`File: ${file}`);
  console.log(`  exists in commit: ${committed.exists ? "yes" : "no"}`);
  console.log(`  changed in commit: ${changed ? "yes" : "no"}`);
  console.log(`  committed line count: ${stats.lineCount}`);
  console.log(`  longest committed line: ${stats.longestLine}`);

  if (!committed.exists) {
    fail(`${file} does not exist in ${options.commit}`);
    console.log("");
    continue;
  }

  if (!changed && !options.allowUnchanged) {
    fail(`${file} was not changed in ${options.commit}`);
  }

  const minimum = options.minLines.get(file);
  if (minimum !== undefined && stats.lineCount < minimum) {
    fail(`${file} has ${stats.lineCount} lines, expected at least ${minimum}`);
  }

  if (stats.longestLine > options.maxLineLength) {
    fail(
      `${file} has longest line ${stats.longestLine}, expected at most ${options.maxLineLength}`
    );
  }

  console.log("");
}

if (process.exitCode) {
  console.error("Commit evidence check failed.");
} else {
  console.log("PASS commit evidence check");
}
