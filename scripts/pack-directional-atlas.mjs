import { existsSync } from "node:fs";
import { basename, parse } from "node:path";

import { readPng, writePng } from "./extract-sprites.mjs";

const DIRECTIONS = Object.freeze([
  { id: "nw", column: 0, row: 0 },
  { id: "n", column: 1, row: 0 },
  { id: "ne", column: 2, row: 0 },
  { id: "w", column: 0, row: 1 },
  { id: "e", column: 2, row: 1 },
  { id: "sw", column: 0, row: 2 },
  { id: "s", column: 1, row: 2 },
  { id: "se", column: 2, row: 2 },
]);

function usage() {
  return `Usage:
  node scripts/pack-directional-atlas.mjs <source.png> --out <atlas.png> [--cell 192] [--margin 12]

The source must contain eight transparent-background poses in the standard 3x3 layout
(NW/N/NE, W/empty/E, SW/S/SE). The command isolates the eight largest subjects,
attaches nearby detached details, and packs them into exact, non-overlapping cells.`;
}

function parseArgs(argv) {
  const args = [...argv];
  const source = args.shift() || "";
  const options = { source, output: "", cell: 192, margin: 12, inspect: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--out") options.output = args[++index] || "";
    else if (arg === "--cell") options.cell = Number(args[++index]);
    else if (arg === "--margin") options.margin = Number(args[++index]);
    else if (arg === "--inspect") options.inspect = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.help) return options;
  if (!source) throw new Error("Missing source PNG path.");
  if (!options.output && !options.inspect) throw new Error("Missing --out path.");
  if (!Number.isInteger(options.cell) || options.cell < 64) throw new Error("--cell must be an integer >= 64.");
  if (!Number.isInteger(options.margin) || options.margin < 0 || options.margin * 2 >= options.cell) {
    throw new Error("--margin must fit inside the cell.");
  }
  return options;
}

function findComponents(image, alphaThreshold = 8) {
  const total = image.width * image.height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  const components = [];

  for (let start = 0; start < total; start += 1) {
    if (visited[start] || alphaAt(image, start) <= alphaThreshold) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    let minX = image.width;
    let minY = image.height;
    let maxX = -1;
    let maxY = -1;
    let sumX = 0;
    let sumY = 0;
    const pixels = [];

    while (head < tail) {
      const index = queue[head++];
      const x = index % image.width;
      const y = Math.floor(index / image.width);
      pixels.push(index);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      sumX += x;
      sumY += y;

      visit(index - 1, x > 0);
      visit(index + 1, x + 1 < image.width);
      visit(index - image.width, y > 0);
      visit(index + image.width, y + 1 < image.height);
    }

    components.push({
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      pixels,
      pixelCount: pixels.length,
      centerX: sumX / pixels.length,
      centerY: sumY / pixels.length,
    });

    function visit(index, inBounds) {
      if (!inBounds || visited[index] || alphaAt(image, index) <= alphaThreshold) return;
      visited[index] = 1;
      queue[tail++] = index;
    }
  }

  return components;
}

function alphaAt(image, pixelIndex) {
  return image.data[pixelIndex * 4 + 3];
}

function resolveSubjects(components, image) {
  const primary = [...components]
    .sort((left, right) => right.pixelCount - left.pixelCount)
    .slice(0, DIRECTIONS.length);
  if (primary.length !== DIRECTIONS.length) {
    throw new Error(`Expected eight opaque subjects, found ${primary.length}.`);
  }

  const byVerticalPosition = [...primary].sort((left, right) => left.centerY - right.centerY);
  const rows = [
    byVerticalPosition.slice(0, 3).sort((left, right) => left.centerX - right.centerX),
    byVerticalPosition.slice(3, 5).sort((left, right) => left.centerX - right.centerX),
    byVerticalPosition.slice(5).sort((left, right) => left.centerX - right.centerX),
  ];
  const ordered = [...rows[0], ...rows[1], ...rows[2]];
  const groups = ordered.map((anchor, index) => ({
    direction: DIRECTIONS[index],
    anchor,
    components: [anchor],
  }));
  const primarySet = new Set(primary);
  const attachmentDistance = Math.max(image.width, image.height) * 0.2;

  for (const component of components) {
    if (primarySet.has(component) || component.pixelCount < 12) continue;
    const closest = groups
      .map((group) => ({ group, distance: distanceToBounds(component, group.anchor) }))
      .sort((left, right) => left.distance - right.distance)[0];
    if (closest.distance <= attachmentDistance) closest.group.components.push(component);
  }

  const resolved = groups.map((group) => ({
    ...group,
    bounds: combinedBounds(group.components, image),
  }));
  return hasPlausibleSubjects(resolved, image)
    ? resolved
    : resolveSubjectsByPosition(components, image);
}

function hasPlausibleSubjects(groups, image) {
  const anchorSizes = groups.map((group) => group.anchor.pixelCount).sort((left, right) => left - right);
  const median = anchorSizes[Math.floor(anchorSizes.length / 2)] || 0;
  return groups.length === DIRECTIONS.length
    && median > 0
    && groups.every((group) => (
      group.anchor.pixelCount >= median * 0.2
      && group.bounds.width <= image.width * 0.52
      && group.bounds.height <= image.height * 0.52
    ));
}

function resolveSubjectsByPosition(components, image) {
  const centers = DIRECTIONS.map((direction) => ({
    direction,
    x: (direction.column + 0.5) * image.width / 3,
    y: (direction.row + 0.5) * image.height / 3,
    components: [],
  }));
  const splitWidth = image.width * 0.48;
  const splitHeight = image.height * 0.48;

  for (const component of components) {
    if (component.pixelCount < 12) continue;
    if (component.width > splitWidth || component.height > splitHeight) {
      const pixelBuckets = centers.map(() => []);
      component.pixels.forEach((pixelIndex) => {
        const x = pixelIndex % image.width;
        const y = Math.floor(pixelIndex / image.width);
        pixelBuckets[nearestCenterIndex(x, y, centers)].push(pixelIndex);
      });
      pixelBuckets.forEach((pixels, index) => {
        if (pixels.length >= 12) centers[index].components.push(componentFromPixels(pixels, image));
      });
      continue;
    }
    centers[nearestCenterIndex(component.centerX, component.centerY, centers)].components.push(component);
  }

  return centers.map((center) => {
    const ordered = [...center.components].sort((left, right) => right.pixelCount - left.pixelCount);
    const anchor = ordered[0];
    if (!anchor) throw new Error(`Could not isolate the ${center.direction.id.toUpperCase()} subject.`);
    const attachmentDistance = Math.max(image.width, image.height) * 0.2;
    const attached = ordered.filter((component, index) => (
      index === 0 || distanceToBounds(component, anchor) <= attachmentDistance
    ));
    return {
      direction: center.direction,
      anchor,
      components: attached,
      bounds: combinedBounds(attached, image),
    };
  });
}

function nearestCenterIndex(x, y, centers) {
  let selectedIndex = 0;
  let selectedDistance = Number.POSITIVE_INFINITY;
  centers.forEach((center, index) => {
    const distance = Math.hypot(x - center.x, y - center.y);
    if (distance < selectedDistance) {
      selectedDistance = distance;
      selectedIndex = index;
    }
  });
  return selectedIndex;
}

function componentFromPixels(pixels, image) {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  let sumX = 0;
  let sumY = 0;
  pixels.forEach((pixelIndex) => {
    const x = pixelIndex % image.width;
    const y = Math.floor(pixelIndex / image.width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    sumX += x;
    sumY += y;
  });
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    pixels,
    pixelCount: pixels.length,
    centerX: sumX / pixels.length,
    centerY: sumY / pixels.length,
  };
}

function distanceToBounds(component, bounds) {
  const right = bounds.x + bounds.width - 1;
  const bottom = bounds.y + bounds.height - 1;
  const dx = component.centerX < bounds.x
    ? bounds.x - component.centerX
    : component.centerX > right
      ? component.centerX - right
      : 0;
  const dy = component.centerY < bounds.y
    ? bounds.y - component.centerY
    : component.centerY > bottom
      ? component.centerY - bottom
      : 0;
  return Math.hypot(dx, dy);
}

function combinedBounds(components, image) {
  const minX = Math.max(0, Math.min(...components.map((component) => component.x)) - 2);
  const minY = Math.max(0, Math.min(...components.map((component) => component.y)) - 2);
  const maxX = Math.min(
    image.width - 1,
    Math.max(...components.map((component) => component.x + component.width - 1)) + 2,
  );
  const maxY = Math.min(
    image.height - 1,
    Math.max(...components.map((component) => component.y + component.height - 1)) + 2,
  );
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function packAtlas(image, groups, { cell, margin }) {
  const output = {
    width: cell * 3,
    height: cell * 3,
    data: new Uint8Array(cell * 3 * cell * 3 * 4),
  };
  const maxWidth = Math.max(...groups.map((group) => group.bounds.width));
  const maxHeight = Math.max(...groups.map((group) => group.bounds.height));
  const scale = Math.min((cell - margin * 2) / maxWidth, (cell - margin * 2) / maxHeight, 1);

  groups.forEach((group, groupIndex) => {
    const membership = new Uint8Array(image.width * image.height);
    group.components.forEach((component) => {
      component.pixels.forEach((pixelIndex) => {
        membership[pixelIndex] = 1;
      });
    });
    const scaledWidth = Math.max(1, Math.floor(group.bounds.width * scale));
    const scaledHeight = Math.max(1, Math.floor(group.bounds.height * scale));
    const offsetX = group.direction.column * cell + Math.floor((cell - scaledWidth) / 2);
    const offsetY = group.direction.row * cell + Math.floor((cell - scaledHeight) / 2);

    for (let targetY = 0; targetY < scaledHeight; targetY += 1) {
      const sourceY = Math.min(
        group.bounds.y + group.bounds.height - 1,
        group.bounds.y + Math.floor(targetY / scale),
      );
      for (let targetX = 0; targetX < scaledWidth; targetX += 1) {
        const sourceX = Math.min(
          group.bounds.x + group.bounds.width - 1,
          group.bounds.x + Math.floor(targetX / scale),
        );
        const sourcePixel = sourceY * image.width + sourceX;
        if (!membership[sourcePixel]) continue;
        const sourceOffset = sourcePixel * 4;
        const targetOffset = ((offsetY + targetY) * output.width + offsetX + targetX) * 4;
        output.data.set(image.data.subarray(sourceOffset, sourceOffset + 4), targetOffset);
      }
    }

    group.output = { index: groupIndex, offsetX, offsetY, scaledWidth, scaledHeight };
  });

  return { output, scale };
}

function packDirectionalAtlas(options) {
  const image = readPng(options.source);
  const components = findComponents(image);
  const groups = resolveSubjects(components, image);
  if (options.inspect) return { image, components, groups, scale: null, output: null };
  const packed = packAtlas(image, groups, options);
  writePng(options.output, packed.output);
  return { image, components, groups, ...packed };
}

function summarize(options, result) {
  return {
    source: basename(options.source),
    sourceSize: { width: result.image.width, height: result.image.height },
    output: options.output || null,
    outputSize: result.output ? { width: result.output.width, height: result.output.height } : null,
    scale: result.scale,
    components: result.components.length,
    directions: result.groups.map((group) => ({
      id: group.direction.id,
      sourceBounds: group.bounds,
      componentCount: group.components.length,
      pixels: group.components.reduce((total, component) => total + component.pixelCount, 0),
      output: group.output || null,
    })),
  };
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
      return;
    }
    if (!existsSync(options.source)) throw new Error(`Source not found: ${options.source}`);
    const result = packDirectionalAtlas(options);
    console.log(JSON.stringify(summarize(options, result), null, 2));
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exit(1);
  }
}

if (process.argv[1] && parse(process.argv[1]).base === "pack-directional-atlas.mjs") main();

export { DIRECTIONS, findComponents, packDirectionalAtlas, resolveSubjects };
