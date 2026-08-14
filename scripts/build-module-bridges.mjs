import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const bridges = [
  {
    source: "src/modules/balance.js",
    target: "src/balance.js",
    globalName: null,
    exports: ["floorDifficulty"],
  },
  {
    source: "src/modules/content-registry.js",
    target: "src/content-registry.js",
    globalName: null,
    exports: ["createContentRegistry"],
  },
  {
    source: "src/modules/debug.js",
    target: "src/debug.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorDebug",
    exports: ["createDebugSystem"],
  },
  {
    source: "src/modules/assets.js",
    target: "src/assets.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorAssets",
    exports: [
      "MODULE_NATIVE_ASSET_RESOLVER_SLOTS",
      "MODULE_NATIVE_ASSET_RESOLVER_PROOF_SLOTS",
      "MODULE_NATIVE_ASSET_RESOLVER_LOW_LEVEL_SLOTS",
      "createAssetResolver",
    ],
  },
  {
    source: "src/modules/effects.js",
    target: "src/effects.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorEffects",
    exports: ["createEffects"],
  },
  {
    source: "src/modules/upgrades.js",
    target: "src/upgrades.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorUpgrades",
    exports: ["createUpgradeContent"],
  },
  {
    source: "src/modules/level-up-choices.js",
    target: "src/level-up-choices.js",
    globalName: null,
    exports: ["choiceId", "shopFocusBonus", "shuffleChoices", "weightedChoices"],
  },
  {
    source: "src/modules/level-up.js",
    target: "src/level-up.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorLevelUp",
    exports: [
      "MODULE_NATIVE_LEVEL_UP_SLOTS",
      "MODULE_NATIVE_LEVEL_UP_PROOF_SLOTS",
      "createLevelUpSystem",
    ],
  },
  {
    source: "src/modules/map-system.js",
    target: "src/map-system.js",
    globalName: null,
    exports: ["createMapSystem"],
  },
  {
    source: "src/modules/progression.js",
    target: "src/progression.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorProgression",
    exports: ["MODULE_NATIVE_PROGRESSION_SLOTS", "MODULE_NATIVE_PROGRESSION_PROOF_SLOTS", "createProgressionSystem"],
  },
  {
    source: "src/modules/quests.js",
    target: "src/quests.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorQuests",
    exports: ["MODULE_NATIVE_QUEST_SLOTS", "MODULE_NATIVE_QUEST_PROOF_SLOTS", "createQuestSystem", "questOpenIds"],
  },
  {
    source: "src/modules/save-corruption.js",
    target: "src/save-corruption.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorSaveCorruption",
    exports: ["createSaveLoadHandler"],
  },
  {
    source: "src/modules/save-defaults.js",
    target: "src/save-defaults.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorSaveDefaults",
    exports: ["CURRENT_SAVE_VERSION", "createDefaultSave"],
  },
  {
    source: "src/modules/save-migrations.js",
    target: "src/save-migrations.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorSaveMigrations",
    exports: ["isPlainObject", "migrateSave"],
  },
  {
    source: "src/modules/save-normalize.js",
    target: "src/save-normalize.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorSaveNormalize",
    exports: ["arrayValue", "createSaveNormalizer", "objectValue"],
  },
  {
    source: "src/modules/save.js",
    target: "src/save.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorSave",
    exports: ["createSaveSystem"],
  },
  {
    source: "src/modules/shop-pricing.js",
    target: "src/shop-pricing.js",
    globalName: null,
    exports: ["createShopPricing"],
  },
  {
    source: "src/modules/shop.js",
    target: "src/shop.js",
    globalName: null,
    exports: ["MODULE_NATIVE_SHOP_SLOTS", "MODULE_NATIVE_SHOP_PROOF_SLOTS", "createShopSystem"],
    globalMembers: [],
  },
  {
    source: "src/modules/relics.js",
    target: "src/relics.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorRelics",
    exports: ["createRelicSystem"],
  },
  {
    source: "src/modules/shell-relic-ui.js",
    target: "src/shell-relic-ui.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorShellRelicUi",
    exports: ["createShellRelicUiAdapter", "createShellRelicUi"],
  },
  {
    source: "src/modules/shell-ui-classic-adapter.js",
    target: "src/shell-ui.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorShellUi",
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
    globalName: null,
    exports: ["clamp", "distance", "formatTime", "randomRange"],
  },
  {
    source: "src/modules/weapon-targeting.js",
    target: "src/weapon-targeting.js",
    globalName: null,
    exports: ["nearestEnemy"],
  },
  {
    source: "src/modules/weapon-cooldowns.js",
    target: "src/weapon-cooldowns.js",
    globalName: null,
    exports: ["createWeaponScaling"],
  },
  {
    source: "src/modules/weapon-projectiles.js",
    target: "src/weapon-projectiles.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorWeaponProjectiles",
    exports: ["createWeaponProjectileSystem", "rotateVector"],
  },
  {
    source: "src/modules/game-banners.js",
    target: "src/game-banners.js",
    globalName: null,
    exports: ["createGameBannerSystem"],
  },
  {
    source: "src/modules/game-runtime.js",
    target: "src/game-runtime.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorGameRuntime",
    exports: ["createGameRuntimeController"],
  },
  {
    source: "src/modules/input.js",
    target: "src/input.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorInput",
    exports: ["bindMovementInput", "setTargetFromEvent"],
  },
  {
    source: "src/modules/module-runtime-audio-adapter.js",
    target: "src/audio.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorAudio",
    exports: [
      "MODULE_RUNTIME_AUDIO_ADAPTER_SLOTS",
      "MODULE_RUNTIME_AUDIO_ADAPTER_PROOF_SLOTS",
      "MODULE_RUNTIME_AUDIO_ADAPTER_LOW_LEVEL_SLOTS",
      "createModuleRuntimeAudioAdapter",
    ],
  },
  {
    source: "src/modules/game-dependencies.js",
    target: "src/game-dependencies.js",
    globalName: "TapSurvivorGameDependencies",
    exports: ["createGameDependencyBag"],
    bundledSources: [
      {
        source: "src/modules/assets.js",
        exports: [
          "MODULE_NATIVE_ASSET_RESOLVER_SLOTS",
          "MODULE_NATIVE_ASSET_RESOLVER_PROOF_SLOTS",
          "MODULE_NATIVE_ASSET_RESOLVER_LOW_LEVEL_SLOTS",
          "createAssetResolver",
        ],
      },
      {
        source: "src/modules/balance.js",
        exports: ["floorDifficulty"],
      },
      {
        source: "src/modules/module-runtime-audio-adapter.js",
        exports: [
          "MODULE_RUNTIME_AUDIO_ADAPTER_SLOTS",
          "MODULE_RUNTIME_AUDIO_ADAPTER_PROOF_SLOTS",
          "MODULE_RUNTIME_AUDIO_ADAPTER_LOW_LEVEL_SLOTS",
          "createModuleRuntimeAudioAdapter",
        ],
      },
      {
        source: "src/modules/combat.js",
        exports: [
          "MODULE_NATIVE_COMBAT_SLOTS",
          "MODULE_NATIVE_COMBAT_PROOF_SLOTS",
          "createCombatSystem",
        ],
      },
      {
        source: "src/modules/combat-damage.js",
        exports: ["createCombatDamageSystem"],
      },
      {
        source: "src/modules/content-registry.js",
        exports: ["createContentRegistry"],
      },
      {
        source: "src/modules/debug.js",
        exports: ["createDebugSystem"],
      },
      {
        source: "src/modules/effects.js",
        exports: ["createEffects"],
      },
      {
        source: "src/modules/enemies.js",
        exports: [
          "MODULE_NATIVE_ENEMY_SLOTS",
          "MODULE_NATIVE_ENEMY_PROOF_SLOTS",
          "createEnemySystem",
        ],
      },
      {
        source: "src/modules/enemy-behaviors.js",
        exports: [
          "MODULE_NATIVE_ENEMY_BEHAVIOR_SLOTS",
          "MODULE_NATIVE_ENEMY_BEHAVIOR_PROOF_SLOTS",
          "createEnemyBehaviorSystem",
        ],
      },
      {
        source: "src/modules/enemy-spawning.js",
        exports: [
          "MODULE_NATIVE_ENEMY_SPAWN_SLOTS",
          "MODULE_NATIVE_ENEMY_SPAWN_PROOF_SLOTS",
          "createEnemySpawnSystem",
        ],
      },
      {
        source: "src/modules/game-banners.js",
        exports: ["createGameBannerSystem"],
      },
      {
        source: "src/modules/game-runtime.js",
        exports: ["createGameRuntimeController"],
      },
      {
        source: "src/modules/input.js",
        exports: ["bindMovementInput", "setTargetFromEvent"],
      },
      {
        source: "src/modules/map-system.js",
        exports: ["createMapSystem"],
      },
      {
        source: "src/modules/save-defaults.js",
        exports: ["CURRENT_SAVE_VERSION", "createDefaultSave"],
      },
      {
        source: "src/modules/save-migrations.js",
        exports: ["isPlainObject", "migrateSave"],
      },
      {
        source: "src/modules/save-corruption.js",
        exports: ["createSaveLoadHandler"],
      },
      {
        source: "src/modules/save-normalize.js",
        exports: ["arrayValue", "createSaveNormalizer", "objectValue"],
        renames: { DEFAULT_CURRENT_SAVE_VERSION: "DEFAULT_SAVE_NORMALIZE_VERSION" },
      },
      {
        source: "src/modules/save.js",
        exports: ["createSaveSystem"],
      },
      {
        source: "src/modules/level-up-choices.js",
        exports: ["choiceId", "shopFocusBonus", "shuffleChoices", "weightedChoices"],
      },
      {
        source: "src/modules/level-up.js",
        exports: [
          "MODULE_NATIVE_LEVEL_UP_SLOTS",
          "MODULE_NATIVE_LEVEL_UP_PROOF_SLOTS",
          "createLevelUpSystem",
        ],
      },
      {
        source: "src/modules/math.js",
        exports: ["clamp", "distance", "formatTime", "randomRange"],
      },
      {
        source: "src/modules/pickups.js",
        exports: ["createPickupSystem"],
      },
      {
        source: "src/modules/progression.js",
        exports: ["MODULE_NATIVE_PROGRESSION_SLOTS", "MODULE_NATIVE_PROGRESSION_PROOF_SLOTS", "createProgressionSystem"],
      },
      {
        source: "src/modules/quests.js",
        exports: ["MODULE_NATIVE_QUEST_SLOTS", "MODULE_NATIVE_QUEST_PROOF_SLOTS", "createQuestSystem", "questOpenIds"],
      },
      {
        source: "src/modules/relics.js",
        exports: ["createRelicSystem"],
      },
      {
        source: "src/modules/shop-pricing.js",
        exports: ["createShopPricing"],
      },
      {
        source: "src/modules/shop.js",
        exports: ["MODULE_NATIVE_SHOP_SLOTS", "MODULE_NATIVE_SHOP_PROOF_SLOTS", "createShopSystem"],
      },
      {
        source: "src/modules/shell-relic-ui.js",
        exports: ["createShellRelicUiAdapter", "createShellRelicUi"],
      },
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
      {
        source: "src/modules/shell-ui-classic-adapter.js",
        exports: ["createShellUiController"],
      },
      {
        source: "src/modules/upgrades.js",
        exports: ["createUpgradeContent"],
      },
      {
        source: "src/modules/ui.js",
        exports: ["MODULE_NATIVE_UI_SLOTS", "MODULE_NATIVE_UI_RENDERER_PROOF_SLOTS", "createUi", "createUiRenderer"],
      },
      {
        source: "src/modules/ui-progression.js",
        exports: ["MODULE_NATIVE_UI_PROGRESSION_RENDERER_PROOF_SLOTS", "createUiProgressionRenderer"],
      },
      {
        source: "src/modules/weapon-behaviors.js",
        exports: ["MODULE_NATIVE_WEAPON_BEHAVIORS_SLOTS", "MODULE_NATIVE_WEAPON_BEHAVIORS_PROOF_SLOTS", "createWeaponBehaviorSystem"],
      },
      {
        source: "src/modules/weapon-cooldowns.js",
        exports: ["createWeaponScaling"],
      },
      {
        source: "src/modules/weapon-fire.js",
        exports: ["MODULE_NATIVE_WEAPON_FIRE_SLOTS", "MODULE_NATIVE_WEAPON_FIRE_PROOF_SLOTS", "createWeaponFireSystem"],
      },
      {
        source: "src/modules/weapon-projectiles.js",
        exports: ["createWeaponProjectileSystem", "rotateVector"],
      },
      {
        source: "src/modules/weapon-targeting.js",
        exports: ["nearestEnemy"],
      },
      {
        source: "src/modules/run-lifecycle.js",
        exports: ["createRunLifecycle"],
      },
      {
        source: "src/modules/run-state.js",
        exports: ["createRunStateSystem"],
      },
      {
        source: "src/modules/run-ui.js",
        exports: ["createRunUi"],
      },
      {
        source: "src/modules/run-update.js",
        exports: ["createRunUpdater"],
      },
    ],
  },
  {
    source: "src/modules/run-lifecycle.js",
    target: "src/run-lifecycle.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorRunLifecycle",
    exports: ["createRunLifecycle"],
  },
  {
    source: "src/modules/run-state.js",
    target: "src/run-state.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorRunState",
    exports: ["createRunStateSystem"],
  },
  {
    source: "src/modules/run-update.js",
    target: "src/run-update.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorRunUpdate",
    exports: ["createRunUpdater"],
  },
  {
    source: "src/modules/run-ui.js",
    target: "src/run-ui.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorRunUi",
    exports: ["createRunUi"],
  },
  {
    source: "src/modules/pickups.js",
    target: "src/pickups.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorPickups",
    exports: ["createPickupSystem"],
  },
  {
    source: "src/modules/combat.js",
    target: "src/combat.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorCombat",
    exports: [
      "MODULE_NATIVE_COMBAT_SLOTS",
      "MODULE_NATIVE_COMBAT_PROOF_SLOTS",
      "createCombatSystem",
    ],
  },
  {
    source: "src/modules/combat-damage.js",
    target: "src/combat-damage.js",
    globalName: null,
    exports: ["createCombatDamageSystem"],
  },
  {
    source: "src/modules/ui.js",
    target: "src/ui.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorUi",
    exports: ["MODULE_NATIVE_UI_SLOTS", "MODULE_NATIVE_UI_RENDERER_PROOF_SLOTS", "createUi", "createUiRenderer"],
  },
  {
    source: "src/modules/ui-progression.js",
    target: "src/ui-progression.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorUiProgression",
    exports: ["MODULE_NATIVE_UI_PROGRESSION_RENDERER_PROOF_SLOTS", "createUiProgressionRenderer"],
  },
  {
    source: "src/modules/weapon-behaviors.js",
    target: "src/weapon-behaviors.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorWeaponBehaviors",
    exports: ["MODULE_NATIVE_WEAPON_BEHAVIORS_SLOTS", "MODULE_NATIVE_WEAPON_BEHAVIORS_PROOF_SLOTS", "createWeaponBehaviorSystem"],
  },
  {
    source: "src/modules/weapon-fire.js",
    target: "src/weapon-fire.js",
    globalName: null,
    retiredGlobalName: "TapSurvivorWeaponFire",
    exports: ["MODULE_NATIVE_WEAPON_FIRE_SLOTS", "MODULE_NATIVE_WEAPON_FIRE_PROOF_SLOTS", "createWeaponFireSystem"],
  },
];

for (const bridge of bridges) {
  await buildClassicBridge(bridge);
}

/**
 * @param {{
 *   source: string,
 *   target: string,
 *   globalName: string | null,
 *   retiredGlobalName?: string,
 *   exports: string[],
 *   classicBoundarySource?: string,
 *   classicPublisherSource?: string,
 *   classicExportWrappers?: Record<string, { name: string, source: string }>,
 *   bundledSources?: {
 *     source: string,
 *     exports: (string | { name: string, as: string })[],
 *     renames?: Record<string, string>,
 *   }[],
 *   globalMembers?: { name: string, value: string }[],
 * }} bridge
 */
async function buildClassicBridge({
  source,
  target,
  globalName,
  retiredGlobalName = "",
  exports,
  classicBoundarySource = "",
  classicPublisherSource = "",
  classicExportWrappers = {},
  bundledSources = [],
  globalMembers,
}) {
  const bundledClassicSources = [];
  for (const bundledSource of bundledSources) {
    bundledClassicSources.push(
      await readClassicModuleSource(bundledSource.source, bundledSource.exports, {
        dropImports: true,
        renames: bundledSource.renames,
        target,
      })
    );
  }

  const classicSource = await readClassicModuleSource(source, exports, {
    dropImports: bundledSources.length > 0,
    target,
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
  const defaultPublisherSource = `globalThis.${globalName} = {
${globalMemberSource}
  };`
  const publisherSource = globalName ? `
  ${classicPublisherSource || defaultPublisherSource}` : "";
  const publisherSeparator = publisherSource ? "\n" : "";
  const retirementComment = retiredGlobalName
    ? `// Retired global: ${retiredGlobalName}. Exports are supplied through the game dependency bag.\n`
    : "";
  const generatedSource = `// GENERATED FILE. Do not edit directly.
// Source: ${source}
// Run: npm run build:bridges
${retirementComment}(() => {
  "use strict";

${indent(classicBody, 2)}${publisherSeparator}${publisherSource}
})();
`;

  if (globalName && !generatedSource.includes(`globalThis.${globalName}`)) {
    throw new Error(`${target} generation did not include ${globalName}`);
  }
  for (const { name } of resolvedGlobalMembers) {
    if (!generatedSource.includes(name)) {
      throw new Error(`${target} generation did not include ${name}`);
    }
  }

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, normalizeGeneratedSource(generatedSource));
  console.log(`PASS generated ${target} from ${source}`);
}

/**
 * @param {string} source
 * @param {(string | { name: string, as: string })[]} exports
 * @param {{ dropImports?: boolean, renames?: Record<string, string>, target?: string }} [options]
 */
async function readClassicModuleSource(source, exports, options = {}) {
  if (!options.target) {
    throw new Error(`${source} generation requires a target context`);
  }

  const moduleSource = await readFile(source, "utf8");
  if (/\bimport\s+/m.test(moduleSource) && !options.dropImports) {
    throw new Error(`${source} uses import; this bridge builder supports standalone modules only`);
  }

  let classicSource = options.dropImports ? moduleSource.replace(/^\s*import\s+[^;]+;\s*$/gm, "") : moduleSource;
  classicSource = relocateJSDocRelativeImportTypes(classicSource, source, options.target);
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

  if (options.renames) {
    for (const [from, to] of Object.entries(options.renames)) {
      classicSource = classicSource.replace(new RegExp(`\\b${from}\\b`, "g"), to);
    }
  }

  if (/^\s*export\s+/m.test(classicSource)) {
    throw new Error(`${source} contains unsupported export syntax`);
  }
  return classicSource;
}

/**
 * Rewrites only quoted relative import(...) type specifiers found in JSDoc comments.
 * @param {string} sourceText
 * @param {string} source
 * @param {string} target
 * @returns {string}
 */
function relocateJSDocRelativeImportTypes(sourceText, source, target) {
  const sourcePath = resolveRepositoryPath(source, `${source} source`);
  const targetPath = resolveRepositoryPath(target, `${target} target`);
  const sourceDirectory = path.dirname(sourcePath);
  const targetDirectory = path.dirname(targetPath);
  const replacements = [];

  for (const { start, end } of findJSDocCommentRanges(sourceText)) {
    collectJSDocRelativeImportTypeReplacements(
      sourceText,
      start,
      end,
      sourceDirectory,
      targetDirectory,
      source,
      target,
      replacements
    );
  }

  return applyRangeReplacements(sourceText, replacements);
}

/**
 * @param {string} sourceText
 * @returns {{ start: number, end: number }[]}
 */
function findJSDocCommentRanges(sourceText) {
  const ranges = [];
  let cursor = 0;

  while (cursor < sourceText.length) {
    const character = sourceText[cursor];
    if (character === '"' || character === "'" || character === "`") {
      cursor = skipStringLiteral(sourceText, cursor);
      continue;
    }
    if (character !== "/") {
      cursor += 1;
      continue;
    }

    if (sourceText[cursor + 1] === "/") {
      const lineEnd = sourceText.indexOf("\n", cursor + 2);
      cursor = lineEnd === -1 ? sourceText.length : lineEnd + 1;
      continue;
    }
    if (sourceText[cursor + 1] !== "*") {
      cursor += 1;
      continue;
    }

    const commentEnd = sourceText.indexOf("*/", cursor + 2);
    if (commentEnd === -1) {
      return ranges;
    }
    if (sourceText[cursor + 2] === "*") {
      ranges.push({ start: cursor, end: commentEnd + 2 });
    }
    cursor = commentEnd + 2;
  }

  return ranges;
}

/**
 * @param {string} sourceText
 * @param {number} commentStart
 * @param {number} commentEnd
 * @param {string} sourceDirectory
 * @param {string} targetDirectory
 * @param {string} source
 * @param {string} target
 * @param {{ start: number, end: number, value: string }[]} replacements
 */
function collectJSDocRelativeImportTypeReplacements(
  sourceText,
  commentStart,
  commentEnd,
  sourceDirectory,
  targetDirectory,
  source,
  target,
  replacements
) {
  const contentEnd = commentEnd - 2;
  let cursor = commentStart + 3;

  while (cursor < contentEnd) {
    const importStart = sourceText.indexOf("import", cursor);
    if (importStart === -1 || importStart >= contentEnd) {
      return;
    }
    cursor = importStart + "import".length;
    if (
      isIdentifierCharacter(sourceText[importStart - 1]) ||
      isIdentifierCharacter(sourceText[cursor])
    ) {
      continue;
    }

    let tokenCursor = skipWhitespace(sourceText, cursor, contentEnd);
    if (sourceText[tokenCursor] !== "(") {
      continue;
    }
    tokenCursor = skipWhitespace(sourceText, tokenCursor + 1, contentEnd);
    const quote = sourceText[tokenCursor];
    if (quote !== '"' && quote !== "'") {
      continue;
    }

    const specifierStart = tokenCursor + 1;
    const specifierEnd = findQuotedSpecifierEnd(sourceText, specifierStart, quote, contentEnd);
    if (specifierEnd === -1) {
      continue;
    }
    tokenCursor = skipWhitespace(sourceText, specifierEnd + 1, contentEnd);
    if (sourceText[tokenCursor] !== ")") {
      cursor = specifierEnd + 1;
      continue;
    }
    cursor = tokenCursor + 1;

    const specifier = sourceText.slice(specifierStart, specifierEnd);
    if (!isRelativeModuleSpecifier(specifier)) {
      continue;
    }

    const resolvedSourceSpecifier = path.resolve(sourceDirectory, specifier);
    assertPathWithinRepository(
      resolvedSourceSpecifier,
      `${source} JSDoc type import ${specifier}`
    );
    const targetSpecifier = toTargetRelativeSpecifier(targetDirectory, resolvedSourceSpecifier);
    const resolvedTargetSpecifier = path.resolve(targetDirectory, targetSpecifier);
    assertPathWithinRepository(
      resolvedTargetSpecifier,
      `${target} JSDoc type import ${targetSpecifier}`
    );
    if (path.normalize(resolvedTargetSpecifier) !== path.normalize(resolvedSourceSpecifier)) {
      throw new Error(`${source} JSDoc type import ${specifier} did not round-trip for ${target}`);
    }
    if (targetSpecifier !== specifier) {
      replacements.push({ start: specifierStart, end: specifierEnd, value: targetSpecifier });
    }
  }
}

/**
 * @param {string} sourceText
 * @param {number} start
 * @param {string} quote
 * @param {number} end
 * @returns {number}
 */
function findQuotedSpecifierEnd(sourceText, start, quote, end) {
  for (let cursor = start; cursor < end; cursor += 1) {
    if (sourceText[cursor] === "\\") {
      return -1;
    }
    if (sourceText[cursor] === quote) {
      return cursor;
    }
  }
  return -1;
}

/**
 * @param {string} sourceText
 * @param {number} start
 * @returns {number}
 */
function skipStringLiteral(sourceText, start) {
  const quote = sourceText[start];
  for (let cursor = start + 1; cursor < sourceText.length; cursor += 1) {
    if (sourceText[cursor] === "\\") {
      cursor += 1;
      continue;
    }
    if (sourceText[cursor] === quote) {
      return cursor + 1;
    }
  }
  return sourceText.length;
}

/**
 * @param {string} sourceText
 * @param {number} start
 * @param {number} end
 * @returns {number}
 */
function skipWhitespace(sourceText, start, end) {
  let cursor = start;
  while (cursor < end && /\s/.test(sourceText[cursor])) {
    cursor += 1;
  }
  return cursor;
}

/**
 * @param {string | undefined} character
 * @returns {boolean}
 */
function isIdentifierCharacter(character) {
  return Boolean(character && /[A-Za-z0-9_$]/.test(character));
}

/**
 * @param {string} specifier
 * @returns {boolean}
 */
function isRelativeModuleSpecifier(specifier) {
  return specifier.startsWith("./") || specifier.startsWith("../");
}

/**
 * @param {string} relativePath
 * @param {string} label
 * @returns {string}
 */
function resolveRepositoryPath(relativePath, label) {
  const resolvedPath = path.resolve(repositoryRoot, relativePath);
  assertPathWithinRepository(resolvedPath, label);
  return resolvedPath;
}

/**
 * @param {string} candidatePath
 * @param {string} label
 */
function assertPathWithinRepository(candidatePath, label) {
  const relativePath = path.relative(repositoryRoot, candidatePath);
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`${label} escapes repository root`);
  }
}

/**
 * @param {string} targetDirectory
 * @param {string} resolvedSourceSpecifier
 * @returns {string}
 */
function toTargetRelativeSpecifier(targetDirectory, resolvedSourceSpecifier) {
  let targetSpecifier = path.relative(targetDirectory, resolvedSourceSpecifier);
  if (!targetSpecifier.startsWith(".")) {
    targetSpecifier = `.${path.sep}${targetSpecifier}`;
  }
  return targetSpecifier.split(path.sep).join("/");
}

/**
 * @param {string} sourceText
 * @param {{ start: number, end: number, value: string }[]} replacements
 * @returns {string}
 */
function applyRangeReplacements(sourceText, replacements) {
  const rightToLeft = [...replacements].sort((left, right) => right.start - left.start);
  let replacedSource = sourceText;
  let rightBoundary = sourceText.length;

  for (const replacement of rightToLeft) {
    if (replacement.start > replacement.end || replacement.end > rightBoundary) {
      throw new Error("JSDoc type import replacement ranges overlap");
    }
    replacedSource = `${replacedSource.slice(0, replacement.start)}${replacement.value}${replacedSource.slice(
      replacement.end
    )}`;
    rightBoundary = replacement.start;
  }

  return replacedSource;
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

/**
 * Keep generated single-string frozen slot declarations in the same shape
 * Prettier chooses when the resulting line fits the repository print width.
 * @param {string} source
 * @returns {string}
 */
function normalizeGeneratedSource(source) {
  return source.replace(
    /(\n[ \t]*)const ([A-Z0-9_]+) = Object\.freeze\(\[\n[ \t]+("(?:[^"\\]|\\.)*"),\n[ \t]+\]\);/g,
    (match, indentation, name, value) => {
      const compact = `${indentation}const ${name} = Object.freeze([${value}]);`;
      return compact.length <= 100 ? compact : match;
    }
  );
}
