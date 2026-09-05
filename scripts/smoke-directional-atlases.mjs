import { existsSync, readFileSync } from "node:fs";
import { readPng } from "./extract-sprites.mjs";

const root = "assets/generated/tower";
const atlasSize = 576;
const cellSize = 192;
const edgeMargin = 12;
const maxCompressedBytes = 5_000_000;
const maxDecodedBytes = 16_000_000;
const files = [
  "sheet-20260614/wizard-eight-way-run-v1.png",
  ...[
    "drifter", "skitter", "bulwark", "hexer", "verdant-skitter", "dusk-crawler",
    "crimson-hexer", "obsidian-bulwark", "warden", "charger", "turret",
  ].map((id) => `directional-v1/${id}-eight-way-v1.png`),
];
const cells = [0, 1, 2, 3, 5, 6, 7, 8];
let compressedBytes = 0;
let decodedBytes = 0;
for (const relative of files) {
  if (!existsSync(`${root}/${relative}`)) throw new Error(`Missing directional atlas: ${relative}`);
  const rawPng = readFileSync(`${root}/${relative}`);
  compressedBytes += rawPng.byteLength;
  if (rawPng.readUInt32BE(16) !== atlasSize || rawPng.readUInt32BE(20) !== atlasSize || rawPng[25] !== 6) throw new Error(`Invalid RGBA IHDR: ${relative}`);
  const image = readPng(`${root}/${relative}`);
  if (image.width !== atlasSize || image.height !== atlasSize) throw new Error(`Invalid dimensions: ${relative}`);
  decodedBytes += image.width * image.height * 4;
  const cell = cellSize;
  const alpha = (x, y) => image.data[(y * image.width + x) * 4 + 3];
  for (const index of cells) {
    const column = index % 3;
    const row = Math.floor(index / 3);
    let nonEmpty = false;
    for (let y = row * cell; y < (row + 1) * cell && !nonEmpty; y += 1) for (let x = column * cell; x < (column + 1) * cell; x += 1) if (alpha(x, y) > 0) nonEmpty = true;
    if (!nonEmpty) throw new Error(`Empty direction cell ${index}: ${relative}`);
  }
  for (let y = cell; y < cell * 2; y += 1) for (let x = cell; x < cell * 2; x += 1) if (alpha(x, y) !== 0) throw new Error(`Center cell is not transparent: ${relative}`);
  const margin = edgeMargin;
  for (const index of cells) {
    const column = index % 3; const row = Math.floor(index / 3);
    for (let y = row * cell; y < (row + 1) * cell; y += 1) for (let x = column * cell; x < (column + 1) * cell; x += 1) {
      const edge = x - column * cell < margin || (column + 1) * cell - 1 - x < margin || y - row * cell < margin || (row + 1) * cell - 1 - y < margin;
      if (edge && alpha(x, y) !== 0) throw new Error(`Reserved edge margin spill in cell ${index}: ${relative}`);
    }
  }
}
if (compressedBytes > maxCompressedBytes) {
  throw new Error(`Directional atlas transfer budget exceeded: ${compressedBytes} > ${maxCompressedBytes}`);
}
if (decodedBytes > maxDecodedBytes) {
  throw new Error(`Directional atlas decoded budget exceeded: ${decodedBytes} > ${maxDecodedBytes}`);
}
console.log(
  `Validated ${files.length} directional atlases (${atlasSize}x${atlasSize} RGBA, 8 cells, empty center; ${compressedBytes} compressed bytes, ${decodedBytes} decoded bytes).`,
);
