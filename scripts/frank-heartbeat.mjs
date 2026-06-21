import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const statusPath = ".agent/frank-status.json";

function readStatus() {
  if (!existsSync(statusPath)) return {};
  try {
    return JSON.parse(readFileSync(statusPath, "utf8"));
  } catch {
    return {};
  }
}

function readValues(flag) {
  const values = [];
  for (let index = 2; index < process.argv.length; index += 1) {
    if (process.argv[index] === flag && process.argv[index + 1]) {
      values.push(process.argv[index + 1]);
      index += 1;
    }
  }
  return values;
}

function readValue(flag) {
  const values = readValues(flag);
  return values.length ? values[values.length - 1] : undefined;
}

const previous = readStatus();
const completedSteps = Array.isArray(previous.completedSteps) ? [...previous.completedSteps] : [];
for (const step of readValues("--completed-step")) {
  completedSteps.push({
    step,
    completedAt: new Date().toISOString(),
  });
}

const next = {
  ...previous,
  task: readValue("--task") ?? previous.task ?? "",
  phase: readValue("--phase") ?? previous.phase ?? "",
  currentCommand: readValue("--current-command") ?? previous.currentCommand ?? "",
  blocker: readValue("--blocker") ?? previous.blocker ?? "",
  completedSteps,
  lastHeartbeat: new Date().toISOString(),
};

mkdirSync(dirname(statusPath), { recursive: true });
writeFileSync(statusPath, `${JSON.stringify(next, null, 2)}\n`);

console.log(`# Frank Heartbeat\nTask: ${next.task || "none"}\nPhase: ${next.phase || "none"}\nCurrent command: ${next.currentCommand || "none"}\nBlocker: ${next.blocker || "none"}\nLast heartbeat: ${next.lastHeartbeat}`);
