import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const TASKS_PATH = ".agent/tasks.json";
const STATUSES = new Set(["queued", "active", "complete", "blocked"]);
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(message) {
  console.error(`task-queue: ${message}`);
  process.exit(1);
}

function parseArgs(args) {
  const values = { _: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      values._.push(arg);
      continue;
    }
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      fail(`missing value for ${arg}`);
    }
    values[arg.slice(2)] = next;
    index += 1;
  }
  return values;
}

function readTasks({ createForAdd = false } = {}) {
  if (!existsSync(TASKS_PATH)) {
    if (createForAdd) {
      mkdirSync(dirname(TASKS_PATH), { recursive: true });
      writeFileSync(TASKS_PATH, "[]\n");
    } else {
      fail(`${TASKS_PATH} does not exist`);
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(TASKS_PATH, "utf8"));
  } catch (error) {
    fail(`invalid JSON in ${TASKS_PATH}: ${error.message}`);
  }

  const errors = validateTasks(parsed);
  if (errors.length) {
    fail(`${TASKS_PATH} is invalid:\n- ${errors.join("\n- ")}`);
  }
  return parsed;
}

function writeTasks(tasks) {
  writeFileSync(TASKS_PATH, `${JSON.stringify(tasks, null, 2)}\n`);
}

function isParseableDate(value) {
  return typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value));
}

function validateTasks(tasks) {
  const errors = [];
  if (!Array.isArray(tasks)) {
    return ["root value must be an array"];
  }

  const ids = new Set();
  tasks.forEach((task, index) => {
    const label = `task[${index}]`;
    if (!task || typeof task !== "object" || Array.isArray(task)) {
      errors.push(`${label} must be an object`);
      return;
    }

    if (typeof task.id !== "string" || !ID_PATTERN.test(task.id)) {
      errors.push(`${label}.id must be kebab-case`);
    } else if (ids.has(task.id)) {
      errors.push(`${label}.id duplicates ${task.id}`);
    } else {
      ids.add(task.id);
    }

    if (!STATUSES.has(task.status)) {
      errors.push(`${label}.status must be one of ${Array.from(STATUSES).join(", ")}`);
    }
    if (typeof task.summary !== "string" || task.summary.trim() === "") {
      errors.push(`${label}.summary must be non-empty`);
    }
    if (!Array.isArray(task.scope_allowed)) {
      errors.push(`${label}.scope_allowed must be an array`);
    }
    if (!Array.isArray(task.scope_forbidden)) {
      errors.push(`${label}.scope_forbidden must be an array`);
    }
    if (typeof task.skill !== "string" && task.skill !== null) {
      errors.push(`${label}.skill must be a string or null`);
    }
    if (typeof task.evidence !== "string" && task.evidence !== null) {
      errors.push(`${label}.evidence must be a string or null`);
    }
    if (!isParseableDate(task.opened)) {
      errors.push(`${label}.opened must be a parseable date string`);
    }
    if (task.closed !== null && !isParseableDate(task.closed)) {
      errors.push(`${label}.closed must be null or a parseable date string`);
    }
    if (task.status === "complete" && task.evidence === null) {
      errors.push(`${label}.evidence is required when status is complete`);
    }
    if ((task.status === "complete" || task.status === "blocked") && task.closed === null) {
      errors.push(`${label}.closed is required when status is ${task.status}`);
    }
  });

  return errors;
}

function findTask(tasks, id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) {
    fail(`unknown task id: ${id}`);
  }
  return task;
}

function requireId(id) {
  if (!id) {
    fail("missing task id");
  }
  if (!ID_PATTERN.test(id)) {
    fail("task id must be kebab-case");
  }
}

function commandList() {
  const tasks = readTasks();
  if (!tasks.length) {
    console.log("No tasks.");
    return;
  }

  const rows = tasks.map((task) => [
    task.id,
    task.status,
    task.skill ?? "-",
    task.evidence ?? "-",
    task.summary,
  ]);
  const headers = ["id", "status", "skill", "evidence", "summary"];
  const widths = headers.map((header, column) =>
    Math.max(header.length, ...rows.map((row) => String(row[column]).length))
  );
  const printRow = (row) =>
    console.log(row.map((value, column) => String(value).padEnd(widths[column])).join("  "));

  printRow(headers);
  console.log(widths.map((width) => "-".repeat(width)).join("  "));
  rows.forEach(printRow);
}

function commandValidate() {
  readTasks();
  console.log(`${TASKS_PATH} valid`);
}

function commandAdd(args) {
  const options = parseArgs(args);
  const id = options.id;
  const summary = options.summary;
  requireId(id);
  if (!summary || summary.trim() === "") {
    fail("missing non-empty --summary");
  }

  const tasks = readTasks({ createForAdd: true });
  if (tasks.some((task) => task.id === id)) {
    fail(`duplicate task id: ${id}`);
  }

  tasks.push({
    id,
    status: "queued",
    summary: summary.trim(),
    scope_allowed: [],
    scope_forbidden: [],
    skill: options.skill === undefined || options.skill === "null" ? null : options.skill,
    evidence: null,
    opened: new Date().toISOString(),
    closed: null,
  });
  writeTasks(tasks);
  console.log(`added ${id}`);
}

function commandActive(args) {
  const id = args[0];
  requireId(id);
  const tasks = readTasks();
  const task = findTask(tasks, id);
  task.status = "active";
  task.closed = null;
  writeTasks(tasks);
  console.log(`active ${id}`);
}

function commandComplete(args) {
  const id = args[0];
  requireId(id);
  const options = parseArgs(args.slice(1));
  if (!options.evidence || options.evidence.trim() === "") {
    fail("complete requires --evidence");
  }

  const tasks = readTasks();
  const task = findTask(tasks, id);
  task.status = "complete";
  task.evidence = options.evidence.trim();
  task.closed = new Date().toISOString();
  writeTasks(tasks);
  console.log(`complete ${id}`);
}

function commandBlocked(args) {
  const id = args[0];
  requireId(id);
  const options = parseArgs(args.slice(1));
  const tasks = readTasks();
  const task = findTask(tasks, id);
  task.status = "blocked";
  if (options.evidence !== undefined) {
    task.evidence = options.evidence.trim() || null;
  }
  task.closed = new Date().toISOString();
  writeTasks(tasks);
  console.log(`blocked ${id}`);
}

const [command, ...args] = process.argv.slice(2);

if (command === "list") {
  commandList();
} else if (command === "validate") {
  commandValidate();
} else if (command === "add") {
  commandAdd(args);
} else if (command === "active") {
  commandActive(args);
} else if (command === "complete") {
  commandComplete(args);
} else if (command === "blocked") {
  commandBlocked(args);
} else {
  fail("usage: task-queue.mjs list|validate|add|active|complete|blocked");
}
