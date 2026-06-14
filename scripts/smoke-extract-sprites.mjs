import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { extractSprites, readPng, writePng } from "./extract-sprites.mjs";

function check(name, pass) {
  if (!pass) {
    console.error(`FAIL ${name}`);
    process.exit(1);
  }
  console.log(`PASS ${name}`);
}

const tmp = mkdtempSync(join(tmpdir(), "tap-survivor-sprite-extract-"));

try {
  const sheetPath = join(tmp, "sheet.png");
  const outDir = join(tmp, "out");
  const sheet = {
    width: 12,
    height: 6,
    data: new Uint8Array(12 * 6 * 4),
  };

  fillRect(sheet, 1, 1, 3, 3, [255, 0, 0, 255]);
  fillRect(sheet, 8, 2, 2, 2, [0, 0, 255, 255]);
  writePng(sheetPath, sheet);

  const auto = extractSprites({
    sheetPath,
    outDir,
    names: ["red", "blue"],
    sprites: [],
    padding: 0,
    minPixels: 2,
    dryRun: false,
  });

  check("auto extraction writes two sprites", auto.length === 2 && existsSync(join(outDir, "red.png")) && existsSync(join(outDir, "blue.png")));
  check("auto extraction trims first sprite", readPng(join(outDir, "red.png")).width === 3 && readPng(join(outDir, "red.png")).height === 3);
  check("auto extraction trims second sprite", readPng(join(outDir, "blue.png")).width === 2 && readPng(join(outDir, "blue.png")).height === 2);

  const manualOut = join(tmp, "manual");
  const manual = extractSprites({
    sheetPath,
    outDir: manualOut,
    names: [],
    sprites: [{ name: "manual-red", x: 0, y: 0, width: 6, height: 6 }],
    padding: 0,
    minPixels: 1,
    dryRun: false,
  });
  check("manual rectangle trims transparent padding", manual.length === 1 && readPng(join(manualOut, "manual-red.png")).width === 3);

  const manifestPath = join(tmp, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify({ sprites: [{ name: "manifest-blue", x: 7, y: 1, width: 4, height: 4 }] }));
  const manifest = extractSprites({
    sheetPath,
    outDir: join(tmp, "manifest"),
    names: [],
    sprites: [],
    manifest: manifestPath,
    padding: 0,
    minPixels: 1,
    dryRun: false,
  });
  check("manifest rectangle extracts named sprite", manifest.length === 1 && existsSync(join(tmp, "manifest", "manifest-blue.png")));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

function fillRect(image, x0, y0, width, height, rgba) {
  for (let y = y0; y < y0 + height; y += 1) {
    for (let x = x0; x < x0 + width; x += 1) {
      const index = (y * image.width + x) * 4;
      image.data[index] = rgba[0];
      image.data[index + 1] = rgba[1];
      image.data[index + 2] = rgba[2];
      image.data[index + 3] = rgba[3];
    }
  }
}
