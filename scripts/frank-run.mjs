import { spawn, spawnSync } from "node:child_process";
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

const resultPath = ".agent/frank-last-command.json";
const statusPath = ".agent/frank-status.json";
const runsRoot = ".agent/runs";

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

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function appendLog(path, chunk) {
  appendFileSync(path, chunk);
}

function closeLog() {
  if (logClosed || logFd === undefined) return;
  closeSync(logFd);
  logClosed = true;
}

function createRunDir(command) {
  const stamp = new Date().toISOString().replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
  const slug = command
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "command";
  let candidate = `${runsRoot}/${stamp}_${slug}`;
  let suffix = 1;
  while (existsSync(candidate)) {
    candidate = `${runsRoot}/${stamp}_${slug}-${suffix}`;
    suffix += 1;
  }
  mkdirSync(candidate, { recursive: true });
  return candidate;
}

function isProcessAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function lastLines(path, count) {
  if (!existsSync(path)) return "";
  const lines = readFileSync(path, "utf8").split("\n");
  return lines.slice(Math.max(0, lines.length - count - 1)).join("\n");
}

function gitStatusShort() {
  const result = spawnSync("git", ["status", "--short"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return (result.stdout || result.stderr || "").trim();
}

function printFailure({ command, exitCode, logPath }) {
  console.error("\nFAIL frank:run command failed");
  console.error(`failed command: ${command}`);
  console.error(`exit code: ${exitCode}`);
  console.error(`log path: ${logPath}`);
  console.error("last 80 lines of output:");
  console.error(lastLines(logPath, 80) || "(log is empty)");
  console.error("current git status --short:");
  console.error(gitStatusShort() || "(clean)");
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
const runDir = createRunDir(parsed.command);
const logPath = `${runDir}/command.log`;
const statePath = `${runDir}/command-state.json`;
let child;
let logFd;
let logClosed = false;
let state = {
  command: parsed.command,
  pid: null,
  started_at: startedAt.toISOString(),
  ended_at: null,
  exit_code: null,
  signal: null,
  timeout_seconds: parsed.timeoutSeconds,
  timed_out: false,
  log_path: logPath,
  run_dir: runDir,
  status: "running",
};

function saveState(patch = {}) {
  state = {
    ...state,
    ...patch,
  };
  writeJson(statePath, state);
  writeJson(resultPath, state);
  writeStatus({
    currentCommand: state.status === "running" ? parsed.command : "",
    latestRunPath: runDir,
    latestCommandStatePath: statePath,
    latestCommandLogPath: logPath,
    latestCommandStatus: state.status,
    latestCommandExitCode: state.exit_code,
    latestCommandPid: state.pid,
    blocker:
      state.status === "failed"
        ? `Command failed (${state.exit_code}): ${parsed.command}`
        : state.status === "interrupted"
          ? `Command interrupted: ${parsed.command}`
          : "",
  });
}

console.log(`# frank:run`);
console.log(`command: ${parsed.command}`);
console.log(`run dir: ${runDir}`);
console.log(`log path: ${logPath}`);

appendLog(logPath, `# command: ${parsed.command}\n`);
appendLog(logPath, `# started_at: ${state.started_at}\n\n`);
logFd = openSync(logPath, "a");

child = spawn(parsed.commandArgv[0], parsed.commandArgv.slice(1), {
  stdio: ["ignore", logFd, logFd],
});
state.pid = child.pid || null;
saveState();
console.log(`pid: ${state.pid ?? "unavailable"}`);

const timeout = setTimeout(() => {
  state.timed_out = true;
  appendLog(logPath, `\n# TIMEOUT after ${parsed.timeoutSeconds}s\n`);
  child.kill("SIGTERM");
  setTimeout(() => {
    if (isProcessAlive(child.pid)) child.kill("SIGKILL");
  }, 5000).unref();
}, parsed.timeoutSeconds * 1000);

let interrupted = false;
function handleInterruption(signal) {
  interrupted = true;
  const childAlive = isProcessAlive(child?.pid);
  saveState({
    ended_at: new Date().toISOString(),
    status: "interrupted",
    signal,
    child_alive: childAlive,
  });
  console.error("\nINTERRUPTED frank:run");
  console.error(`interrupted command: ${parsed.command}`);
  console.error(`pid: ${state.pid ?? "unavailable"}`);
  console.error(`log path: ${logPath}`);
  console.error(`child alive: ${childAlive ? "yes" : "no"}`);
  console.error(`last known status: ${state.status}`);
  if (childAlive) child.kill(signal);
  process.exit(signal === "SIGINT" ? 130 : 143);
}

process.once("SIGINT", () => handleInterruption("SIGINT"));
process.once("SIGTERM", () => handleInterruption("SIGTERM"));

child.on("error", (error) => {
  clearTimeout(timeout);
  closeLog();
  const exitCode = 1;
  appendLog(logPath, `\n# spawn error: ${error.message}\n`);
  saveState({
    ended_at: new Date().toISOString(),
    exit_code: exitCode,
    status: "failed",
  });
  printFailure({ command: parsed.command, exitCode, logPath });
  process.exit(exitCode);
});

let exitInfo = null;

child.on("exit", (code, signal) => {
  exitInfo = { code, signal };
});

child.on("close", (code, signal) => {
  clearTimeout(timeout);
  if (interrupted) return;
  closeLog();
  const resolvedCode = exitInfo?.code ?? code;
  const resolvedSignal = exitInfo?.signal ?? signal;
  const exitCode = state.timed_out ? 124 : resolvedCode ?? (resolvedSignal ? 1 : 0);
  const status = exitCode === 0 ? "passed" : "failed";
  appendLog(logPath, `\n# ended_at: ${new Date().toISOString()}\n`);
  appendLog(logPath, `# exit_code: ${exitCode}\n`);
  if (resolvedSignal) appendLog(logPath, `# signal: ${resolvedSignal}\n`);
  saveState({
    ended_at: new Date().toISOString(),
    exit_code: exitCode,
    signal: resolvedSignal || null,
    status,
  });
  if (status === "failed") {
    printFailure({ command: parsed.command, exitCode, logPath });
  }
  process.exit(exitCode);
});
