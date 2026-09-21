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

function safeAssetPath(value) {
  if (typeof value !== "string") return "";
  const path = value.trim();
  const pathname = path.split(/[?#]/, 1)[0];
  if (
    !pathname ||
    pathname.startsWith("/") ||
    pathname.includes(":") ||
    /[\\\\\u0000-\u001f\u007f]/.test(path)
  ) {
    return "";
  }
  const segments = pathname.split("/");
  if (
    segments.some((segment) => {
      if (!segment) return true;
      try {
        const decoded = decodeURIComponent(segment);
        return (
          decoded === "." ||
          decoded === ".." ||
          decoded.includes("/") ||
          /[\\\\\u0000-\u001f\u007f]/.test(decoded)
        );
      } catch {
        return true;
      }
    })
  ) {
    return "";
  }
  return path;
}

export function createAssetResolver(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const assetDefs = requireObject(
    resolvedOptions.assetDefs || resolvedOptions.content?.assets || {},
    "options.assetDefs"
  );
  const sprites = assetDefs.sprites || {};
  const fallbackSkillIcon =
    safeAssetPath(resolvedOptions.fallbackSkillIcon || sprites.ui?.quest) || DEFAULT_SKILL_ICON;

  function spriteSource(definition) {
    if (typeof definition === "string") return safeAssetPath(definition);
    if (definition && typeof definition === "object") {
      return safeAssetPath(definition.src || definition.path || definition.iconSrc);
    }
    return "";
  }

  function weaponSprite(weaponId) {
    return sprites.weapons?.[weaponId] || fallbackSkillIcon;
  }

  function weaponIcon(weaponId) {
    const definition = weaponSprite(weaponId);
    return safeAssetPath(definition?.iconSrc) || spriteSource(definition) || fallbackSkillIcon;
  }

  function runUpgradeSprite(upgradeId) {
    return sprites.runUpgrades?.[upgradeId] || fallbackSkillIcon;
  }

  function runUpgradeIcon(upgradeId) {
    const definition = runUpgradeSprite(upgradeId);
    return (
      safeAssetPath(sprites.runUpgradeIcons?.[upgradeId]) ||
      safeAssetPath(definition?.iconSrc) ||
      spriteSource(definition) ||
      fallbackSkillIcon
    );
  }

  function relicIcon(relic) {
    return (
      safeAssetPath(relic?.iconPath) || runUpgradeIcon(relic?.targetUpgradeId) || fallbackSkillIcon
    );
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
