import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const bridges = [
  {
    source: "src/modules/shop-pricing.js",
    target: "src/shop-pricing.js",
    globalName: "TapSurvivorShopPricing",
    exports: ["createShopPricing"],
  },
  {
    source: "src/modules/math.js",
    target: "src/math.js",
    globalName: "TapSurvivorMath",
    exports: ["clamp", "distance", "formatTime", "randomRange"],
  },
  {
    source: "src/modules/weapon-targeting.js",
    target: "src/weapon-targeting.js",
    globalName: "TapSurvivorWeaponTargeting",
    exports: ["nearestEnemy"],
  },
  {
    source: "src/modules/weapon-cooldowns.js",
    target: "src/weapon-cooldowns.js",
    globalName: "TapSurvivorWeaponCooldowns",
    exports: ["createWeaponScaling"],
  },
  {
    source: "src/modules/weapon-projectiles.js",
    target: "src/weapon-projectiles.js",
    globalName: "TapSurvivorWeaponProjectiles",
    exports: ["createWeaponProjectileSystem", "rotateVector"],
  },
];

for (const bridge of bridges) {
  await buildClassicBridge(bridge);
}

/**
 * @param {{
 *   source: string,
 *   target: string,
 *   globalName: string,
 *   exports: string[]
 * }} bridge
 */
async function buildClassicBridge({ source, target, globalName, exports }) {
  const moduleSource = await readFile(source, "utf8");
  if (/\bimport\s+/m.test(moduleSource)) {
    throw new Error(`${source} uses import; this bridge builder supports standalone modules only`);
  }

  let classicSource = moduleSource;
  for (const exportName of exports) {
    const previousSource = classicSource;
    classicSource = classicSource.replace(
      new RegExp(`\\bexport\\s+function\\s+${exportName}\\s*\\(`),
      `function ${exportName}(`
    );
    if (classicSource === previousSource) {
      throw new Error(`${source} must export function ${exportName}`);
    }
  }

  if (/^\s*export\s+/m.test(classicSource)) {
    throw new Error(`${source} contains unsupported export syntax`);
  }

  const globalMembers = exports.map((exportName) => `    ${exportName},`).join("\n");
  const generatedSource = `// GENERATED FILE. Do not edit directly.
// Source: ${source}
// Run: npm run build:bridges
(() => {
  "use strict";

${indent(classicSource.trim(), 2)}

  globalThis.${globalName} = {
${globalMembers}
  };
})();
`;

  if (!generatedSource.includes(`globalThis.${globalName}`)) {
    throw new Error(`${target} generation did not include ${globalName}`);
  }
  for (const exportName of exports) {
    if (!generatedSource.includes(exportName)) {
      throw new Error(`${target} generation did not include ${exportName}`);
    }
  }

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, generatedSource);
  console.log(`PASS generated ${target} from ${source}`);
}

/**
 * @param {string} source
 * @param {number} spaces
 * @returns {string}
 */
function indent(source, spaces) {
  const prefix = " ".repeat(spaces);
  return source
    .split("\n")
    .map((line) => (line ? `${prefix}${line}` : ""))
    .join("\n");
}
