import { createLevelUpSystem } from "../modules/level-up.js";
import { createProgressionSystem } from "../modules/progression.js";
import { createQuestSystem, questOpenIds } from "../modules/quests.js";
import { createShopSystem } from "../modules/shop.js";
import { createUiProgressionRenderer } from "../modules/ui-progression.js";
import { createUpgradeContent } from "../modules/upgrades.js";

export function createBrowserProgressionSystems({ documentRef, ui }) {
  return {
    levelUp: {
      createLevelUpSystem: (options = {}) =>
        createLevelUpSystem({
          ...options,
          documentRef: options.documentRef || documentRef,
          ui: options.ui || ui,
        }),
    },
    progression: { createProgressionSystem },
    quests: { createQuestSystem, questOpenIds },
    shop: {
      createShopSystem: (options = {}) => createShopSystem({ documentRef, ...options }),
    },
    uiProgression: {
      createUiProgressionRenderer: (options = {}) =>
        createUiProgressionRenderer({
          ...options,
          documentRef,
        }),
    },
    upgrades: { createUpgradeContent },
  };
}
