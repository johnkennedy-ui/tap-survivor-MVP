export const MODULE_NATIVE_ASSET_RESOLVER_SLOTS = Object.freeze([
  "choiceIconDefinition",
  "choiceIconPath",
  "fallbackSkillIcon",
  "relicIcon",
  "runUpgradeIcon",
  "runUpgradeSprite",
  "spriteSource",
  "weaponIcon",
  "weaponSprite",
]);

export const MODULE_NATIVE_ASSET_RESOLVER_PROOF_SLOTS = Object.freeze([
  "createAssetResolver",
  ...MODULE_NATIVE_ASSET_RESOLVER_SLOTS,
]);

export const MODULE_NATIVE_ASSET_RESOLVER_LOW_LEVEL_SLOTS = Object.freeze([
  "assetDefs",
  "fallbackSkillIcon",
]);

const DEFAULT_SKILL_ICON = "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610";

export function createAssetResolver(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const assetDefs = requireObject(
    resolvedOptions.assetDefs || resolvedOptions.content?.assets || {},
    "options.assetDefs"
  );
  const sprites = assetDefs.sprites || {};
  const fallbackSkillIcon =
    resolvedOptions.fallbackSkillIcon || sprites.ui?.quest || DEFAULT_SKILL_ICON;

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
    throw new Error(`Missing Tap Survivor module assets dependency: ${name}`);
  }
  return value;
}
