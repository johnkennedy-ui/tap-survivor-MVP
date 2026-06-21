import { existsSync, readFileSync } from "node:fs";

const statusPath = ".agent/frank-status.json";
const staleMs = 10 * 60 * 1000;

if (!existsSync(statusPath)) {
  console.log("# Frank Watch\nNo active Frank status exists.");
  process.exit(0);
}

let status;
try {
  status = JSON.parse(readFileSync(statusPath, "utf8"));
} catch (error) {
  console.error(`FAIL could not read ${statusPath}: ${error.message}`);
  process.exit(1);
}

const heartbeatMs = Date.parse(status.lastHeartbeat || "");
if (!Number.isFinite(heartbeatMs)) {
  console.error(`# Frank Watch\nFAIL no valid lastHeartbeat.\nPhase: ${status.phase || "none"}\nCurrent command: ${status.currentCommand || "none"}`);
  process.exit(1);
}

const ageMs = Date.now() - heartbeatMs;
if (ageMs > staleMs) {
  console.error(`# Frank Watch\nFAIL stale heartbeat: ${Math.floor(ageMs / 1000)}s old.\nPhase: ${status.phase || "none"}\nCurrent command: ${status.currentCommand || "none"}`);
  process.exit(1);
}

console.log(`# Frank Watch\nPASS heartbeat age ${Math.floor(ageMs / 1000)}s.\nPhase: ${status.phase || "none"}\nCurrent command: ${status.currentCommand || "none"}`);
