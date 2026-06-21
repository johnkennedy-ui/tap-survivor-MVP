import { existsSync, readFileSync } from "node:fs";

const statusPath = ".agent/frank-status.json";

if (!existsSync(statusPath)) {
  console.log("# Frank Status\nNo active Frank status exists.");
  process.exit(0);
}

let status;
try {
  status = JSON.parse(readFileSync(statusPath, "utf8"));
} catch (error) {
  console.error(`FAIL could not read ${statusPath}: ${error.message}`);
  process.exit(1);
}

console.log("# Frank Status");
console.log(`Task: ${status.task || "none"}`);
console.log(`Phase: ${status.phase || "none"}`);
console.log(`Last heartbeat: ${status.lastHeartbeat || "none"}`);
console.log(`Current command: ${status.currentCommand || "none"}`);
console.log(`Blocker: ${status.blocker || "none"}`);
console.log("Completed steps:");
const completedSteps = Array.isArray(status.completedSteps) ? status.completedSteps : [];
if (!completedSteps.length) {
  console.log("- none");
} else {
  for (const entry of completedSteps) {
    const label = typeof entry === "string" ? entry : entry.step;
    const stamp = typeof entry === "string" ? "" : ` (${entry.completedAt || "unknown time"})`;
    console.log(`- ${label || "unnamed step"}${stamp}`);
  }
}
