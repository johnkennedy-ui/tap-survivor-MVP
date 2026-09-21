import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const runner = fileURLToPath(new URL("./frank-run.mjs", import.meta.url));
const root = mkdtempSync(join(tmpdir(), "tap-frank-run-"));
const node = JSON.stringify(process.execPath);
const cases = [
  ...["&&", "||", ";", "|", "&", ">", ">>", "<"].map((operator) => ({
    name: `reject ${operator}`,
    command: `${node} --version ${operator} ${node} --version`,
    expected: 2,
  })),
  {
    name: "reject adjacent operator",
    command: `${node} --version&&${node} --version`,
    expected: 2,
  },
  { name: "reject unterminated quote", command: `${node} -e 'unterminated`, expected: 2 },
  { name: "allow one command", command: `${node} --version`, expected: 0, childExit: 0 },
  {
    name: "allow quoted literal operator",
    command: `${node} -e 'console.log("&&")'`,
    expected: 0,
    childExit: 0,
  },
  {
    name: "preserve child failure",
    command: `${node} -e 'process.exit(7)'`,
    expected: 7,
    childExit: 7,
  },
];

for (const [index, test] of cases.entries()) {
  const cwd = join(root, String(index));
  mkdirSync(cwd);
  const result = spawnSync(process.execPath, [runner, test.command, "--timeout", "5"], {
    cwd,
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(result.status, test.expected, `${test.name}: ${result.stderr || result.stdout}`);
  const receipt = join(cwd, ".agent/frank-last-command.json");
  if (test.childExit === undefined) {
    assert.equal(
      existsSync(receipt),
      false,
      "Rejected commands must not start a workload or create a success receipt"
    );
    assert.match(result.stderr, /Shell operators|Unterminated quote/);
  } else {
    const state = JSON.parse(readFileSync(receipt, "utf8"));
    assert.equal(state.exit_code, test.childExit);
    assert.equal(state.status, test.childExit === 0 ? "passed" : "failed");
    assert.ok(state.ended_at);
  }
  console.log(`PASS frank:run ${test.name}`);
}
console.log(`PASS ${cases.length} frank:run boundary controls; fixture root ${root}`);
