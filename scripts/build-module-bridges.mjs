import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const bridges = [
  {
    source: "src/modules/balance.js",
    target: "src/balance.js",
    globalName: "TapSurvivorBalance",
    exports: ["floorDifficulty"],
  },
  {
    source: "src/modules/content-registry.js",
    target: "src/content-registry.js",
    globalName: "TapSurvivorContentRegistry",
    exports: ["createContentRegistry"],
  },
  {
    source: "src/modules/effects.js",
    target: "src/effects.js",
    globalName: "TapSurvivorEffects",
    exports: ["createEffects"],
    classicBoundarySource: "const classicEffects = createEffects();",
    globalMembers: [
      {
        name: "applyRunUpgradeEffects",
        value: "classicEffects.applyRunUpgradeEffects",
      },
      {
        name: "applyShopItemEffectToRun",
        value: "classicEffects.applyShopItemEffectToRun",
      },
      {
        name: "emptyShopBonuses",
        value: "classicEffects.emptyShopBonuses",
      },
      {
        name: "addShopItemBonus",
        value: "classicEffects.addShopItemBonus",
      },
      {
        name: "applyRelicSpecialEffects",
        value: "classicEffects.applyRelicSpecialEffects",
      },
    ],
  },
  {
    source: "src/modules/level-up-choices.js",
    target: "src/level-up-choices.js",
    globalName: "TapSurvivorLevelUpChoices",
    exports: ["choiceId", "shopFocusBonus", "shuffleChoices", "weightedChoices"],
  },
  {
    source: "src/modules/map-system.js",
    target: "src/map-system.js",
    globalName: "TapSurvivorMapSystem",
    exports: ["createMapSystem"],
  },
  {
    source: "src/modules/save-corruption.js",
    target: "src/save-corruption.js",
    globalName: "TapSurvivorSaveCorruption",
    exports: ["createSaveLoadHandler"],
  },
  {
    source: "src/modules/save-defaults.js",
    target: "src/save-defaults.js",
    globalName: "TapSurvivorSaveDefaults",
    exports: ["CURRENT_SAVE_VERSION", "createDefaultSave"],
  },
  {
    source: "src/modules/save-migrations.js",
    target: "src/save-migrations.js",
    globalName: "TapSurvivorSaveMigrations",
    exports: ["isPlainObject", "migrateSave"],
  },
  {
    source: "src/modules/save-normalize.js",
    target: "src/save-normalize.js",
    globalName: "TapSurvivorSaveNormalize",
    exports: ["arrayValue", "createSaveNormalizer", "objectValue"],
  },
  {
    source: "src/modules/save.js",
    target: "src/save.js",
    globalName: "TapSurvivorSave",
    exports: ["createSaveSystem"],
    classicExportWrappers: {
      createSaveSystem: {
        name: "createClassicSaveSystem",
        source: `function createClassicSaveSystem(options) {
  return createSaveSystem({
    saveNormalize: globalThis.${"TapSurvivorSaveNormalize"},
    saveCorruption: globalThis.${"TapSurvivorSaveCorruption"},
    storage: globalThis.${"TapSurvivorStorage"},
    ...options,
  });
}`,
      },
    },
  },
  {
    source: "src/modules/shop-pricing.js",
    target: "src/shop-pricing.js",
    globalName: "TapSurvivorShopPricing",
    exports: ["createShopPricing"],
  },
  {
    source: "src/modules/shop.js",
    target: "src/shop.js",
    globalName: "TapSurvivorShop",
    exports: ["MODULE_NATIVE_SHOP_SLOTS", "MODULE_NATIVE_SHOP_PROOF_SLOTS", "createShopSystem"],
    classicExportWrappers: {
      createShopSystem: {
        name: "createClassicShopSystem",
        source: `function createClassicShopSystem(options = {}) {
  const resolvedOptions = options && typeof options === "object" ? options : {};
  const documentRef = Object.prototype.hasOwnProperty.call(resolvedOptions, "documentRef")
    ? resolvedOptions.documentRef
    : globalThis.document;
  return createShopSystem({
    ...resolvedOptions,
    documentRef,
  });
}`,
      },
    },
    globalMembers: [
      {
        name: "createShopSystem",
        value: "createClassicShopSystem",
      },
    ],
  },
  {
    source: "src/modules/relics.js",
    target: "src/relics.js",
    globalName: "TapSurvivorRelics",
    exports: ["createRelicSystem"],
  },
  {
    source: "src/modules/shell-relic-ui.js",
    target: "src/shell-relic-ui.js",
    globalName: "TapSurvivorShellRelicUi",
    exports: ["createShellRelicUiAdapter", "createShellRelicUi"],
    classicExportWrappers: {
      createShellRelicUi: {
        name: "createClassicShellRelicUi",
        source: `function createClassicShellRelicUi(options = {}) {
  return createShellRelicUi({
    ...options,
    scheduler: options.scheduler || {
      clearTimeout: (timer) => globalThis.clearTimeout?.(timer),
      setTimeout: (callback, delay) => globalThis.setTimeout?.(callback, delay),
      animationSetTimeout: (callback, delay) => globalThis.setTimeout?.(callback, delay),
    },
    imageFactory: options.imageFactory || (() => (typeof Image === "undefined" ? null : new Image())),
  });
}`,
      },
    },
    globalMembers: [
      {
        name: "createShellRelicUi",
        value: "createClassicShellRelicUi",
      },
    ],
  },
  {
    source: "src/modules/shell-ui-classic-adapter.js",
    target: "src/shell-ui.js",
    globalName: "TapSurvivorShellUi",
    exports: ["createShellUiController"],
    bundledSources: [
      {
        source: "src/modules/shell-ui-presenter.js",
        exports: ["createShellUiPresenter"],
      },
      {
        source: "src/modules/shell-ui-dom-adapter.js",
        exports: ["createShellUiDomAdapter"],
      },
      {
        source: "src/modules/shell-ui-controller.js",
        exports: [{ name: "createShellUiController", as: "createModuleShellUiController" }],
      },
    ],
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
  {
    source: "src/modules/game-runtime.js",
    target: "src/game-runtime.js",
    globalName: "TapSurvivorGameRuntime",
    exports: ["createGameRuntimeController"],
  },
  {
    source: "src/modules/game-dependencies.js",
    target: "src/game-dependencies.js",
    globalName: "TapSurvivorGameDependencies",
    exports: ["createGameDependencyBag"],
  },
  {
    source: "src/modules/run-lifecycle.js",
    target: "src/run-lifecycle.js",
    globalName: "TapSurvivorRunLifecycle",
    exports: ["createRunLifecycle"],
  },
  {
    source: "src/modules/run-state.js",
    target: "src/run-state.js",
    globalName: "TapSurvivorRunState",
    exports: ["createRunStateSystem"],
  },
  {
    source: "src/modules/run-update.js",
    target: "src/run-update.js",
    globalName: "TapSurvivorRunUpdate",
    exports: ["createRunUpdater"],
  },
  {
    source: "src/modules/run-ui.js",
    target: "src/run-ui.js",
    globalName: "TapSurvivorRunUi",
    exports: ["createRunUi"],
  },
  {
    source: "src/modules/pickups.js",
    target: "src/pickups.js",
    globalName: "TapSurvivorPickups",
    exports: ["createPickupSystem"],
  },
  {
    source: "src/modules/combat-damage.js",
    target: "src/combat-damage.js",
    globalName: "TapSurvivorCombatDamage",
    exports: ["createCombatDamageSystem"],
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
 *   exports: string[],
 *   classicBoundarySource?: string,
 *   classicExportWrappers?: Record<string, { name: string, source: string }>,
 *   bundledSources?: { source: string, exports: (string | { name: string, as: string })[] }[],
 *   globalMembers?: { name: string, value: string }[],
 * }} bridge
 */
async function buildClassicBridge({
  source,
  target,
  globalName,
  exports,
  classicBoundarySource = "",
  classicExportWrappers = {},
  bundledSources = [],
  globalMembers,
}) {
  const bundledClassicSources = [];
  for (const bundledSource of bundledSources) {
    bundledClassicSources.push(
      await readClassicModuleSource(bundledSource.source, bundledSource.exports, {
        dropImports: true,
      })
    );
  }

  const classicSource = await readClassicModuleSource(source, exports, {
    dropImports: bundledSources.length > 0,
  });

  const classicWrapperSource = Object.values(classicExportWrappers)
    .map((wrapper) => wrapper.source)
    .join("\n\n");
  const classicBoundary = [classicWrapperSource, classicBoundarySource].filter(Boolean).join("\n\n");
  const bundledBody = bundledClassicSources.map((item) => item.trim()).join("\n\n");
  const classicBody = classicBoundary
    ? [bundledBody, classicSource.trim(), classicBoundary].filter(Boolean).join("\n\n")
    : [bundledBody, classicSource.trim()].filter(Boolean).join("\n\n");
  const resolvedGlobalMembers = globalMembers || exports.map((exportName) => {
    const wrapper = classicExportWrappers[exportName];
    return {
      name: exportName,
      value: wrapper ? wrapper.name : exportName,
    };
  });
  const globalMemberSource = resolvedGlobalMembers
    .map((exportName) => {
      if (exportName.name === exportName.value) {
        return `    ${exportName.name},`;
      }
      return `    ${exportName.name}: ${exportName.value},`;
    })
    .join("\n");
  const generatedSource = `// GENERATED FILE. Do not edit directly.
// Source: ${source}
// Run: npm run build:bridges
(() => {
  "use strict";

${indent(classicBody, 2)}

  globalThis.${globalName} = {
${globalMemberSource}
  };
})();
`;

  if (!generatedSource.includes(`globalThis.${globalName}`)) {
    throw new Error(`${target} generation did not include ${globalName}`);
  }
  for (const { name } of resolvedGlobalMembers) {
    if (!generatedSource.includes(name)) {
      throw new Error(`${target} generation did not include ${name}`);
    }
  }

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, generatedSource);
  console.log(`PASS generated ${target} from ${source}`);
}

/**
 * @param {string} source
 * @param {(string | { name: string, as: string })[]} exports
 * @param {{ dropImports?: boolean }} [options]
 */
async function readClassicModuleSource(source, exports, options = {}) {
  const moduleSource = await readFile(source, "utf8");
  if (/\bimport\s+/m.test(moduleSource) && !options.dropImports) {
    throw new Error(`${source} uses import; this bridge builder supports standalone modules only`);
  }

  let classicSource = options.dropImports ? moduleSource.replace(/^\s*import\s+[^;]+;\s*$/gm, "") : moduleSource;
  for (const exportSpec of exports) {
    const exportName = typeof exportSpec === "string" ? exportSpec : exportSpec.name;
    const localName = typeof exportSpec === "string" ? exportSpec : exportSpec.as;
    const previousSource = classicSource;
    classicSource = classicSource.replace(
      new RegExp(`\\bexport\\s+function\\s+${exportName}\\s*\\(`),
      `function ${localName}(`
    );
    classicSource = classicSource.replace(
      new RegExp(`\\bexport\\s+const\\s+${exportName}\\s*=`),
      `const ${localName} =`
    );
    if (classicSource === previousSource) {
      throw new Error(`${source} must export function or const ${exportName}`);
    }
  }

  if (/^\s*export\s+/m.test(classicSource)) {
    throw new Error(`${source} contains unsupported export syntax`);
  }
  return classicSource;
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
