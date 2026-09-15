export const MODULE_RUNTIME_PROGRESSION_ADAPTER_SLOTS = Object.freeze([
  "levelUp",
  "progression",
  "quests",
  "shop",
  "uiProgression",
  "upgrades",
]);

export const MODULE_RUNTIME_PROGRESSION_ADAPTER_PROOF_SLOTS = Object.freeze([
  "createLevelUpSystem",
  "createProgressionSystem",
  "createQuestSystem",
  "createShopSystem",
  "createUiProgressionRenderer",
  "createUpgradeContent",
  "missingProgressionAdapterFallback",
  "questOpenIds",
]);

export const MODULE_RUNTIME_PROGRESSION_ADAPTER_LOW_LEVEL_SLOTS = Object.freeze([
  "balance",
  "content",
  "contentRegistry",
  "effects",
  "levelUpChoices",
  "progressionSystems",
  "relicProgression",
  "relics",
  "save",
  "shopPricing",
]);

export function createModuleRuntimeProgressionAdapter(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const progressionSystems = requireObject(
    resolvedOptions.progressionSystems,
    "options.progressionSystems"
  );
  const canonicalSystems = {
    balance: resolvedOptions.balance,
    content: resolvedOptions.content,
    contentRegistry: resolvedOptions.contentRegistry,
    effects: resolvedOptions.effects,
    levelUpChoices: resolvedOptions.levelUpChoices,
    relicProgression: resolvedOptions.relicProgression,
    relics: resolvedOptions.relics,
    save: resolvedOptions.save,
    shopPricing: resolvedOptions.shopPricing,
  };
  const onMissingAdapter = resolvedOptions.onMissingAdapter;

  function missingProgressionAdapterFallback(name, payload = {}) {
    if (typeof onMissingAdapter === "function") {
      onMissingAdapter({
        name,
        payload,
      });
    }
    return false;
  }

  function invokeFactory(adapterName, factoryName, optionsForFactory = {}) {
    const adapter = progressionSystems[adapterName];
    const factory = adapter?.[factoryName];
    if (typeof factory !== "function") {
      return missingProgressionAdapterFallback(`${adapterName}.${factoryName}`, optionsForFactory);
    }
    return factory(optionsForFactory);
  }

  function questOpenIds(quest) {
    const helper = progressionSystems.quests?.questOpenIds;
    if (typeof helper === "function") return helper(quest);
    return [quest?.opensQuest, ...(quest?.opensQuests || [])].filter(Boolean);
  }

  const upgrades = {
    createUpgradeContent(optionsForFactory = {}) {
      return invokeFactory("upgrades", "createUpgradeContent", {
        content: canonicalSystems.content,
        contentRegistry: canonicalSystems.contentRegistry,
        effects: canonicalSystems.effects,
        ...optionsForFactory,
      });
    },
  };
  const quests = {
    createQuestSystem(optionsForFactory = {}) {
      return invokeFactory("quests", "createQuestSystem", {
        contentRegistry: canonicalSystems.contentRegistry,
        save: canonicalSystems.save,
        ...optionsForFactory,
      });
    },
    questOpenIds,
  };
  const progression = {
    createProgressionSystem(optionsForFactory = {}) {
      return invokeFactory("progression", "createProgressionSystem", {
        balance: canonicalSystems.balance,
        contentRegistry: canonicalSystems.contentRegistry,
        relics: canonicalSystems.relics,
        save: canonicalSystems.save,
        ...optionsForFactory,
      });
    },
  };
  const levelUp = {
    createLevelUpSystem(optionsForFactory = {}) {
      return invokeFactory("levelUp", "createLevelUpSystem", {
        content: canonicalSystems.content,
        contentRegistry: canonicalSystems.contentRegistry,
        levelUpChoices: canonicalSystems.levelUpChoices,
        relicProgression: canonicalSystems.relicProgression,
        relics: canonicalSystems.relics,
        ...optionsForFactory,
      });
    },
  };
  const shop = {
    createShopSystem(optionsForFactory = {}) {
      return invokeFactory("shop", "createShopSystem", {
        contentRegistry: canonicalSystems.contentRegistry,
        effects: canonicalSystems.effects,
        save: canonicalSystems.save,
        shopPricing: canonicalSystems.shopPricing,
        ...optionsForFactory,
      });
    },
  };
  const uiProgression = {
    createUiProgressionRenderer(optionsForFactory = {}) {
      return invokeFactory("uiProgression", "createUiProgressionRenderer", {
        contentRegistry: canonicalSystems.contentRegistry,
        levelUpChoices: canonicalSystems.levelUpChoices,
        relics: canonicalSystems.relics,
        ...optionsForFactory,
      });
    },
  };

  return {
    levelUp,
    missingProgressionAdapterFallback,
    progression,
    quests,
    shop,
    uiProgression,
    upgrades,
  };
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module runtime progression adapter options: ${name}`);
  }
  return value;
}
