import { spawnSync } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const resultPath = ".agent/frank-last-command.json";
const statusPath = ".agent/frank-status.json";
const captureDir = ".agent/frank-capture";

function usage() {
  console.error('Usage: npm run frank:run -- "command" --timeout <seconds>');
}

function parseArgs(argv) {
  const commandParts = [];
  let timeoutSeconds = 120;

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--timeout") {
      const value = Number(argv[index + 1]);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error("--timeout requires a positive number of seconds");
      }
      timeoutSeconds = value;
      index += 1;
      continue;
    }
    commandParts.push(arg);
  }

  if (!commandParts.length) throw new Error("missing command");
  const commandArgv = commandParts.length === 1 ? splitCommand(commandParts[0]) : commandParts;
  if (!commandArgv.length) throw new Error("missing command");
  return {
    command: commandArgv.join(" "),
    commandArgv,
    timeoutSeconds,
  };
}

function splitCommand(command) {
  const parts = [];
  let current = "";
  let quote = "";

  for (const char of command) {
    if (quote) {
      if (char === quote) {
        quote = "";
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        parts.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) parts.push(current);
  return parts;
}

function readStatus() {
  if (!existsSync(statusPath)) return {};
  try {
    return JSON.parse(readFileSync(statusPath, "utf8"));
  } catch {
    return {};
  }
}

function writeStatus(patch) {
  const next = {
    ...readStatus(),
    ...patch,
    lastHeartbeat: new Date().toISOString(),
  };
  mkdirSync(dirname(statusPath), { recursive: true });
  writeFileSync(statusPath, `${JSON.stringify(next, null, 2)}\n`);
}

function writeResult(result) {
  mkdirSync(dirname(resultPath), { recursive: true });
  writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
}

let parsed;
try {
  parsed = parseArgs(process.argv);
} catch (error) {
  usage();
  console.error(`FAIL ${error.message}`);
  process.exit(2);
}

const startedAt = new Date();
writeStatus({ currentCommand: parsed.command, blocker: "" });

mkdirSync(captureDir, { recursive: true });
const captureId = `${process.pid}-${Date.now()}`;
const stdoutPath = `${captureDir}/${captureId}.stdout`;
const stderrPath = `${captureDir}/${captureId}.stderr`;
const stdoutFd = openSync(stdoutPath, "w");
const stderrFd = openSync(stderrPath, "w");
const result = spawnSync(parsed.commandArgv[0], parsed.commandArgv.slice(1), {
  encoding: "utf8",
  stdio: ["ignore", stdoutFd, stderrFd],
  timeout: parsed.timeoutSeconds * 1000,
});
closeSync(stdoutFd);
closeSync(stderrFd);

const finishedAt = new Date();
const timedOut = result.error?.code === "ETIMEDOUT";
const stdout = readFileSync(stdoutPath, "utf8");
const stderr = readFileSync(stderrPath, "utf8");
const exitCode = timedOut ? 124 : result.status ?? (result.error ? 1 : 0);
const outputStderr = timedOut ? `${stderr}${stderr.endsWith("\n") || !stderr ? "" : "\n"}TIMEOUT after ${parsed.timeoutSeconds}s\n` : stderr;
const commandResult = {
  command: parsed.command,
  timeoutSeconds: parsed.timeoutSeconds,
  timedOut,
  exitCode,
  signal: result.signal || null,
  startedAt: startedAt.toISOString(),
  finishedAt: finishedAt.toISOString(),
  durationMs: finishedAt.getTime() - startedAt.getTime(),
  stdout,
  stderr: outputStderr,
};

if (stdout) process.stdout.write(stdout);
if (outputStderr) process.stderr.write(outputStderr);
rmSync(stdoutPath, { force: true });
rmSync(stderrPath, { force: true });

writeResult(commandResult);
writeStatus({
  currentCommand: "",
  blocker: timedOut ? `Command timed out after ${parsed.timeoutSeconds}s: ${parsed.command}` : "",
});

process.exit(exitCode);
