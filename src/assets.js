(() => {
const EMPTY_CONTENT = Object.freeze({});

function createAssetResolver(content = EMPTY_CONTENT) {
  const sprites = content.assets?.sprites || {};
  const fallbackSkillIcon = sprites.ui?.quest || "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610";

  function spriteSource(definition) {
    if (typeof definition === "string") return definition;
    if (definition && typeof definition === "object") return definition.src || definition.path || definition.iconSrc || "";
    return "";
  }

  function weaponSprite(weaponId) {
    return sprites.weapons?.[weaponId] || fallbackSkillIcon;
  }

  function weaponIcon(weaponId) {
    const definition = weaponSprite(weaponId);
    return definition?.iconSrc || spriteSource(definition) || fallbackSkillIcon;
  }

  function runUpgradeSprite(upgradeId) {
    return sprites.runUpgrades?.[upgradeId] || fallbackSkillIcon;
  }

  function runUpgradeIcon(upgradeId) {
    const definition = runUpgradeSprite(upgradeId);
    return sprites.runUpgradeIcons?.[upgradeId] || definition?.iconSrc || spriteSource(definition) || fallbackSkillIcon;
  }

  function relicIcon(relic) {
    return relic?.iconPath || runUpgradeIcon(relic?.targetUpgradeId) || fallbackSkillIcon;
  }

  function choiceIconDefinition(choice) {
    if (choice?.weaponId) return weaponSprite(choice.weaponId);
    if (choice?.runUpgradeId) return runUpgradeSprite(choice.runUpgradeId);
    return fallbackSkillIcon;
  }

  function choiceIconPath(choice) {
    if (choice?.weaponId) return weaponIcon(choice.weaponId);
    if (choice?.runUpgradeId) return runUpgradeIcon(choice.runUpgradeId);
    return fallbackSkillIcon;
  }

  return {
    fallbackSkillIcon,
    spriteSource,
    weaponSprite,
    weaponIcon,
    runUpgradeSprite,
    runUpgradeIcon,
    relicIcon,
    choiceIconDefinition,
    choiceIconPath,
  };
}

globalThis.TapSurvivorAssets = {
  createAssetResolver,
};
})();
