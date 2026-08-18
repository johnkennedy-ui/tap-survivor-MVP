import { createBrowserRenderingAdapters } from "../src/app/browser-rendering-adapters.js";

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

function matches(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function renderGrid(width, height) {
  const calls = [];
  let strokeStyle;
  let lineWidth;
  const context = {
    beginPath() {
      calls.push(["beginPath", strokeStyle, lineWidth]);
    },
    moveTo(...args) {
      calls.push(["moveTo", ...args]);
    },
    lineTo(...args) {
      calls.push(["lineTo", ...args]);
    },
    stroke() {
      calls.push(["stroke", strokeStyle, lineWidth]);
    },
    fillRect() {},
    fillText() {},
  };
  Object.defineProperties(context, {
    strokeStyle: {
      get: () => strokeStyle,
      set: (value) => {
        strokeStyle = value;
      },
    },
    lineWidth: {
      get: () => lineWidth,
      set: (value) => {
        lineWidth = value;
      },
    },
    fillStyle: {
      set() {},
    },
    font: {
      set() {},
    },
  });
  const canvas = {
    width,
    height,
    getContext: () => context,
  };
  const { renderers } = createBrowserRenderingAdapters({ canvas });
  renderers.renderFrame({ game: null, spriteAdapters: {} });
  return calls;
}

const normalGridCalls = renderGrid(96, 96);
const normalGridPathCalls = normalGridCalls.filter(([method]) =>
  ["beginPath", "moveTo", "lineTo", "stroke"].includes(method)
);

check(
  "96x96 grid batches exact segment coordinate/order and style",
  matches(normalGridPathCalls, [
    ["beginPath", "#243244", 1],
    ["moveTo", 0, 0],
    ["lineTo", 0, 96],
    ["moveTo", 48, 0],
    ["lineTo", 48, 96],
    ["moveTo", 0, 0],
    ["lineTo", 96, 0],
    ["moveTo", 0, 48],
    ["lineTo", 96, 48],
    ["stroke", "#243244", 1],
  ])
);

const zeroGridPathCalls = renderGrid(0, 0).filter(([method]) =>
  ["beginPath", "moveTo", "lineTo", "stroke"].includes(method)
);
check("zero-sized grid has no path or stroke", zeroGridPathCalls.length === 0);

if (process.exitCode) {
  console.error("\nRendering grid batching smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nRendering grid batching smoke passed.");
