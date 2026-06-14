import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, parse } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function usage() {
  return `Usage:
  node scripts/extract-sprites.mjs <sheet.png> --out <dir> [--names a,b,c] [--padding 2] [--min-pixels 16]
  node scripts/extract-sprites.mjs <sheet.png> --out <dir> --sprite name:x,y,w,h [--sprite other:x,y,w,h]
  node scripts/extract-sprites.mjs <sheet.png> --out <dir> --manifest sprites.json

Auto mode finds connected non-transparent sprite islands, trims bounds, and writes PNGs.
Manual sprites use x,y,w,h rectangles and are still alpha-trimmed before writing.`;
}

function parseArgs(argv) {
  const args = [...argv];
  const sheetPath = args.shift();
  const options = {
    sheetPath,
    outDir: "",
    names: [],
    sprites: [],
    manifest: "",
    padding: 2,
    minPixels: 16,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--out") options.outDir = args[++i] || "";
    else if (arg === "--names") options.names = (args[++i] || "").split(",").map((name) => name.trim()).filter(Boolean);
    else if (arg === "--sprite") options.sprites.push(parseSpriteArg(args[++i] || ""));
    else if (arg === "--manifest") options.manifest = args[++i] || "";
    else if (arg === "--padding") options.padding = Number(args[++i] || 0);
    else if (arg === "--min-pixels") options.minPixels = Number(args[++i] || 0);
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.help) return options;
  if (!options.sheetPath) throw new Error("Missing sheet PNG path.");
  if (!options.outDir && !options.dryRun) throw new Error("Missing --out directory.");
  if (!Number.isFinite(options.padding) || options.padding < 0) throw new Error("--padding must be a number >= 0.");
  if (!Number.isFinite(options.minPixels) || options.minPixels < 1) throw new Error("--min-pixels must be a number >= 1.");
  return options;
}

function parseSpriteArg(value) {
  const [name, rectText] = value.split(":");
  const [x, y, width, height] = (rectText || "").split(",").map(Number);
  if (!name || ![x, y, width, height].every(Number.isFinite)) {
    throw new Error(`Invalid --sprite "${value}". Expected name:x,y,w,h.`);
  }
  return { name, x, y, width, height };
}

function readManifest(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const sprites = Array.isArray(parsed) ? parsed : parsed.sprites;
  if (!Array.isArray(sprites)) throw new Error("Manifest must be an array or an object with a sprites array.");
  return sprites.map((sprite) => {
    const name = sprite.name || sprite.id;
    const x = Number(sprite.x);
    const y = Number(sprite.y);
    const width = Number(sprite.width ?? sprite.w);
    const height = Number(sprite.height ?? sprite.h);
    if (!name || ![x, y, width, height].every(Number.isFinite)) {
      throw new Error(`Invalid manifest sprite: ${JSON.stringify(sprite)}`);
    }
    return { name, x, y, width, height };
  });
}

function readPng(path) {
  const buffer = readFileSync(path);
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error(`${path} is not a PNG file.`);
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  let bitDepth = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8) throw new Error("Only 8-bit PNG sheets are supported.");
  const channels = channelsForColorType(colorType);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rgba = new Uint8Array(width * height * 4);
  let sourceOffset = 0;
  let previous = new Uint8Array(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[sourceOffset];
    sourceOffset += 1;
    const scanline = Uint8Array.from(raw.subarray(sourceOffset, sourceOffset + stride));
    sourceOffset += stride;
    unfilter(scanline, previous, channels, filter);
    writeRgbaRow(rgba, y, width, colorType, scanline);
    previous = scanline;
  }

  return { width, height, data: rgba };
}

function channelsForColorType(colorType) {
  if (colorType === 0) return 1;
  if (colorType === 2) return 3;
  if (colorType === 4) return 2;
  if (colorType === 6) return 4;
  throw new Error(`Unsupported PNG color type ${colorType}. Use a truecolor/RGBA PNG sheet.`);
}

function unfilter(row, previous, bpp, filter) {
  for (let x = 0; x < row.length; x += 1) {
    const left = x >= bpp ? row[x - bpp] : 0;
    const up = previous[x] || 0;
    const upLeft = x >= bpp ? previous[x - bpp] || 0 : 0;
    if (filter === 1) row[x] = (row[x] + left) & 255;
    else if (filter === 2) row[x] = (row[x] + up) & 255;
    else if (filter === 3) row[x] = (row[x] + Math.floor((left + up) / 2)) & 255;
    else if (filter === 4) row[x] = (row[x] + paeth(left, up, upLeft)) & 255;
    else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}.`);
  }
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function writeRgbaRow(rgba, y, width, colorType, row) {
  for (let x = 0; x < width; x += 1) {
    const out = (y * width + x) * 4;
    if (colorType === 6) {
      const source = x * 4;
      rgba[out] = row[source];
      rgba[out + 1] = row[source + 1];
      rgba[out + 2] = row[source + 2];
      rgba[out + 3] = row[source + 3];
    } else if (colorType === 2) {
      const source = x * 3;
      rgba[out] = row[source];
      rgba[out + 1] = row[source + 1];
      rgba[out + 2] = row[source + 2];
      rgba[out + 3] = 255;
    } else if (colorType === 4) {
      const source = x * 2;
      rgba[out] = row[source];
      rgba[out + 1] = row[source];
      rgba[out + 2] = row[source];
      rgba[out + 3] = row[source + 1];
    } else {
      rgba[out] = row[x];
      rgba[out + 1] = row[x];
      rgba[out + 2] = row[x];
      rgba[out + 3] = 255;
    }
  }
}

function writePng(path, image) {
  const { width, height, data } = image;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 4 + 1);
    raw[rowOffset] = 0;
    Buffer.from(data.subarray(y * width * 4, (y + 1) * width * 4)).copy(raw, rowOffset + 1);
  }
  const chunks = [
    chunk("IHDR", ihdr(width, height)),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ];
  writeFileSync(path, Buffer.concat([PNG_SIGNATURE, ...chunks]));
}

function ihdr(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;
  data[9] = 6;
  return data;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  typeBuffer.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return out;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function autoDetectSprites(image, { padding, minPixels, names }) {
  const visited = new Uint8Array(image.width * image.height);
  const sprites = [];
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const index = y * image.width + x;
      if (visited[index] || alphaAt(image, x, y) <= 8) continue;
      const component = floodFill(image, x, y, visited);
      if (component.pixels < minPixels) continue;
      sprites.push(paddedBounds(component, image, padding));
    }
  }
  sprites.sort((a, b) => a.y - b.y || a.x - b.x);
  return sprites.map((sprite, index) => ({
    ...sprite,
    name: safeName(names[index] || `sprite-${String(index + 1).padStart(2, "0")}`),
  }));
}

function floodFill(image, startX, startY, visited) {
  const stack = [[startX, startY]];
  let minX = startX;
  let minY = startY;
  let maxX = startX;
  let maxY = startY;
  let pixels = 0;
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue;
    const index = y * image.width + x;
    if (visited[index] || alphaAt(image, x, y) <= 8) continue;
    visited[index] = 1;
    pixels += 1;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, pixels };
}

function alphaAt(image, x, y) {
  return image.data[(y * image.width + x) * 4 + 3];
}

function paddedBounds(bounds, image, padding) {
  const x = Math.max(0, bounds.x - padding);
  const y = Math.max(0, bounds.y - padding);
  const right = Math.min(image.width, bounds.x + bounds.width + padding);
  const bottom = Math.min(image.height, bounds.y + bounds.height + padding);
  return { x, y, width: right - x, height: bottom - y };
}

function cropAndTrim(image, sprite, padding) {
  const bounds = {
    x: Math.max(0, Math.floor(sprite.x)),
    y: Math.max(0, Math.floor(sprite.y)),
    width: Math.min(image.width - sprite.x, Math.floor(sprite.width)),
    height: Math.min(image.height - sprite.y, Math.floor(sprite.height)),
  };
  const trimmed = trimBounds(image, bounds, padding);
  return crop(image, trimmed);
}

function trimBounds(image, bounds, padding) {
  let minX = bounds.x + bounds.width;
  let minY = bounds.y + bounds.height;
  let maxX = bounds.x - 1;
  let maxY = bounds.y - 1;
  for (let y = bounds.y; y < bounds.y + bounds.height; y += 1) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x += 1) {
      if (alphaAt(image, x, y) <= 8) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) return bounds;
  return paddedBounds({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }, image, padding);
}

function crop(image, bounds) {
  const data = new Uint8Array(bounds.width * bounds.height * 4);
  for (let y = 0; y < bounds.height; y += 1) {
    const sourceStart = ((bounds.y + y) * image.width + bounds.x) * 4;
    const sourceEnd = sourceStart + bounds.width * 4;
    data.set(image.data.subarray(sourceStart, sourceEnd), y * bounds.width * 4);
  }
  return { width: bounds.width, height: bounds.height, data };
}

function safeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "sprite";
}

function extractSprites(options) {
  const image = readPng(options.sheetPath);
  const manifestSprites = options.manifest ? readManifest(options.manifest) : [];
  const sprites = [...manifestSprites, ...options.sprites];
  const selected = sprites.length
    ? sprites.map((sprite) => ({ ...sprite, name: safeName(sprite.name) }))
    : autoDetectSprites(image, options);
  const outputs = selected.map((sprite) => {
    const cropped = cropAndTrim(image, sprite, options.padding);
    const filename = `${sprite.name}.png`;
    return {
      name: sprite.name,
      filename,
      path: options.outDir ? join(options.outDir, filename) : filename,
      x: sprite.x,
      y: sprite.y,
      width: cropped.width,
      height: cropped.height,
      image: cropped,
    };
  });

  if (!options.dryRun) {
    mkdirSync(options.outDir, { recursive: true });
    outputs.forEach((output) => writePng(output.path, output.image));
  }

  return outputs.map(({ image, ...output }) => output);
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
      return;
    }
    if (!existsSync(options.sheetPath)) throw new Error(`Sheet not found: ${options.sheetPath}`);
    const outputs = extractSprites(options);
    console.log(JSON.stringify({
      sheet: basename(options.sheetPath),
      outputDir: options.outDir || null,
      count: outputs.length,
      sprites: outputs.map((output) => ({
        name: output.name,
        path: output.path,
        source: { x: output.x, y: output.y },
        size: { width: output.width, height: output.height },
      })),
    }, null, 2));
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exit(1);
  }
}

if (process.argv[1] && parse(process.argv[1]).base === "extract-sprites.mjs") {
  main();
}

export {
  extractSprites,
  readPng,
  writePng,
};
