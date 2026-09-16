const DEFAULT_SKILL_ICON = "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610";

export const MODULE_RUNTIME_ASSETS_ADAPTER_SLOTS = Object.freeze(["assets"]);

export const MODULE_RUNTIME_ASSETS_ADAPTER_PROOF_SLOTS = Object.freeze([
  "assetDefs",
  "choiceIconPath",
  "createAssetResolver",
  "relicIcon",
  "runUpgradeIcon",
  "spriteSource",
  "weaponIcon",
]);

export const MODULE_RUNTIME_ASSETS_ADAPTER_LOW_LEVEL_SLOTS = Object.freeze([
  "assetDefs",
  "fallbackSkillIcon",
]);

export function createModuleRuntimeAssetsAdapter(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const assetDefs = requireObject(resolvedOptions.assetDefs || {}, "options.assetDefs");
  const fallbackSkillIcon =
    resolvedOptions.fallbackSkillIcon || assetDefs.sprites?.ui?.quest || DEFAULT_SKILL_ICON;

  return {
    assets: {
      assetDefs,
      createAssetResolver: () => createAssetResolver({ assetDefs, fallbackSkillIcon }),
    },
  };
}

function createAssetResolver({ assetDefs, fallbackSkillIcon }) {
  const sprites = assetDefs.sprites || {};

  function spriteSource(definition) {
    if (typeof definition === "string") return definition;
    if (definition && typeof definition === "object") {
      return definition.src || definition.path || definition.iconSrc || "";
    }
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
    return (
      sprites.runUpgradeIcons?.[upgradeId] ||
      definition?.iconSrc ||
      spriteSource(definition) ||
      fallbackSkillIcon
    );
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
    choiceIconDefinition,
    choiceIconPath,
    fallbackSkillIcon,
    relicIcon,
    runUpgradeIcon,
    runUpgradeSprite,
    spriteSource,
    weaponIcon,
    weaponSprite,
  };
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module runtime assets adapter options: ${name}`);
  }
  return value;
}
