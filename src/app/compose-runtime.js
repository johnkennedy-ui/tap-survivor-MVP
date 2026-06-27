import { createGameRuntimeController } from "../modules/game-runtime.js";
import { floorDifficulty } from "../modules/balance.js";
import { createContentRegistry } from "../modules/content-registry.js";
import { createEffects } from "../modules/effects.js";
import { createSaveLoadHandler } from "../modules/save-corruption.js";
import { createDefaultSave, CURRENT_SAVE_VERSION } from "../modules/save-defaults.js";
import { isPlainObject, migrateSave } from "../modules/save-migrations.js";
import { createSaveNormalizer } from "../modules/save-normalize.js";
import { createSaveSystem } from "../modules/save.js";
import { createShopPricing } from "../modules/shop-pricing.js";
import { createRelicSystem } from "../modules/relics.js";
import { createShellRelicPresenter } from "../modules/shell-relic-presenter.js";
import { createShellRelicUiAdapter } from "../modules/shell-relic-ui.js";

export function createBrowserPlatform({
  globalRef = globalThis,
  documentRef = globalRef.document,
} = {}) {
  return {
    documentRef,
    runtimeGlobal: {
      requestAnimationFrame: (callback) => globalRef.requestAnimationFrame(callback),
      addEventListener: (...args) => globalRef.addEventListener?.(...args),
      Capacitor: globalRef.Capacitor,
    },
  };
}

export function composeRuntime({ platform, dependencies }) {
  if (!platform?.documentRef) {
    throw new Error("Missing Tap Survivor module bootstrap dependency: platform.documentRef");
  }
  if (!platform?.runtimeGlobal?.requestAnimationFrame) {
    throw new Error("Missing Tap Survivor module bootstrap dependency: platform.runtimeGlobal");
  }
  if (!dependencies) {
    throw new Error("Missing Tap Survivor module bootstrap dependency: dependencies");
  }

  return createGameRuntimeController({
    ...dependencies,
    documentRef: platform.documentRef,
    globalRef: platform.runtimeGlobal,
  });
}

export function composeSaveSubsystem({
  saveKey,
  legacySaveKey,
  storageAdapter,
  starterQuestIds = [],
  questDefs = {},
  weaponUnlocks = [],
  upgradeDefs = [],
  shopItemDefs = [],
  questOpenIds = () => [],
}) {
  if (!saveKey || !legacySaveKey) {
    throw new Error("Missing Tap Survivor module save dependency: save keys");
  }
  if (!storageAdapter) {
    throw new Error("Missing Tap Survivor module save dependency: storageAdapter");
  }

  return createSaveSystem({
    saveKey,
    legacySaveKey,
    saveNormalize: {
      createSaveNormalizer,
    },
    saveCorruption: {
      createSaveLoadHandler,
    },
    saveDefaults: {
      CURRENT_SAVE_VERSION,
      createDefaultSave,
    },
    saveMigrations: {
      isPlainObject,
      migrateSave,
    },
    starterQuestIds,
    questDefs,
    weaponUnlocks,
    upgradeDefs,
    shopItemDefs,
    questOpenIds,
    storageAdapter,
  });
}

export function composeContentBalanceEffects({ content, contentSchema = {}, upgradeContent = {} }) {
  if (!content) {
    throw new Error("Missing Tap Survivor module content dependency: content");
  }

  return {
    balance: {
      floorDifficulty,
    },
    content,
    contentRegistry: createContentRegistry({ content, upgradeContent }),
    effects: createEffects({ contentSchema }),
  };
}

export function composeShopEconomy({
  shopItemDefs = [],
  pricingConfig = {},
  getSave,
  effects,
}) {
  if (typeof getSave !== "function") {
    throw new Error("Missing Tap Survivor module shop dependency: getSave");
  }
  if (!effects) {
    throw new Error("Missing Tap Survivor module shop dependency: effects");
  }

  return {
    pricing: createShopPricing({
      shopItemDefs,
      pricingConfig,
      getSave,
    }),
    effects,
    shopItemDefs,
  };
}

export function composeRelicProgression({
  relicDefs = [],
  weaponDefs = {},
  effects,
  random,
}) {
  if (!effects) {
    throw new Error("Missing Tap Survivor module relic dependency: effects");
  }

  return {
    progression: createRelicSystem({
      relicDefs,
      weaponDefs,
      random,
    }),
    effects,
    relicDefs,
  };
}

export function composeShellRelicPresentation({
  content = {},
  relicDefs = [],
  relicSystem,
  assetResolver,
}) {
  return createShellRelicPresenter({
    content,
    relicDefs,
    relicSystem,
    assetResolver,
  });
}

export function composeShellRelicUiAdapter({
  presenter,
  documentRef,
  root,
  onEquip,
  onUnequip,
  onSelect,
}) {
  return createShellRelicUiAdapter({
    presenter,
    documentRef,
    root,
    onEquip,
    onUnequip,
    onSelect,
  });
}
