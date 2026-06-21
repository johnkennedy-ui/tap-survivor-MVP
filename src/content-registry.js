(() => {
  /** @typedef {import("../types/content.js").AssetDefs} AssetDefs */
  /** @typedef {import("../types/content.js").BossAbilityDef} BossAbilityDef */
  /** @typedef {import("../types/content.js").BossConfigDef} BossConfigDef */
  /** @typedef {import("../types/content.js").EnemyTypeDef} EnemyTypeDef */
  /** @typedef {import("../types/content.js").FloorDef} FloorDef */
  /** @typedef {import("../types/content.js").GeneratedContent} GeneratedContent */
  /** @typedef {import("../types/content.js").MapDef} MapDef */
  /** @typedef {import("../types/content.js").RelicDef} RelicDef */
  /** @typedef {import("../types/content.js").RuntimeContentRegistry} RuntimeContentRegistry */
  /** @typedef {import("../types/content.js").RunUpgradeDef} RunUpgradeDef */
  /** @typedef {import("../types/content.js").ShopItemDef} ShopItemDef */
  /** @typedef {import("../types/content.js").SpriteSheetDef} SpriteSheetDef */
  /** @typedef {import("../types/content.js").TuningDefs} TuningDefs */
  /** @typedef {import("../types/content.js").UpgradeContent} UpgradeContent */
  /** @typedef {import("../types/content.js").WeaponDef} WeaponDef */

  /**
   * @param {{ content: GeneratedContent, upgradeContent: UpgradeContent }} dependencies
   * @returns {RuntimeContentRegistry}
   */
  function createContentRegistry({ content, upgradeContent }) {
    /** @type {Record<string, WeaponDef>} */
    const weaponDefs = content.weapons || {};
    const weaponUnlocks = content.weaponUnlocks || [];
    const questDefs = content.quests || {};
    const questGroups = content.questGroups || {};
    /** @type {BossConfigDef} */
    const bossConfig = content.bossConfig || {};
    /** @type {Record<string, BossAbilityDef>} */
    const bossAbilities = content.bossAbilities || {};
    /** @type {AssetDefs} */
    const assetDefs = content.assets || {};
    /** @type {Record<string, SpriteSheetDef>} */
    const spriteSheetDefs = assetDefs.sprites?.spriteSheets || {};

    return {
      weaponDefs,
      weaponUnlocks,
      spriteDefs: assetDefs.sprites || {},
      sfxDefs: assetDefs.sfx || {},
      upgradeDefs: upgradeContent.createUpgradeDefs?.(weaponDefs) || [],
      questDefs,
      questGroups,
      starterQuestIds: questGroups.starter || [],
      killQuestIds: questGroups.kill || [],
      damageQuestIds: questGroups.damage || [],
      survivalQuestIds: questGroups.survival || [],
      xpQuestIds: questGroups.xp || [],
      levelQuestIds: questGroups.level || [],
      bossQuestIds: questGroups.boss || [],
      /** @type {RunUpgradeDef[]} */
      runUpgradeDefs: upgradeContent.runUpgradeDefs || [],
      /** @type {EnemyTypeDef[]} */
      enemyTypes: content.enemyTypes || [],
      bossConfig,
      bossAbilities,
      /** @type {ShopItemDef[]} */
      shopItemDefs: content.shopItems || [],
      /** @type {RelicDef[]} */
      relicDefs: content.relics || [],
      /** @type {FloorDef[]} */
      levelDefs: content.levels || [],
      /** @type {MapDef[]} */
      mapDefs: content.maps || [],
      /** @type {TuningDefs} */
      tuningDefs: content.tuning || {},
    };
  }

  globalThis.TapSurvivorContentRegistry = {
    createContentRegistry,
  };
})();
