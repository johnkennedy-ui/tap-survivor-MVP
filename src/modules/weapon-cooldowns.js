/**
 * @typedef {{
 *   id?: string,
 *   kind?: string,
 *   cooldown: number,
 *   damage: number,
 *   range?: number,
 *   radius?: number,
 *   upgradeId?: string,
 *   width?: number
 * }} WeaponDef
 * @typedef {Record<string, WeaponDef>} WeaponDefs
 * @typedef {{ fireRate?: number, attackRadius?: number, percentDamage?: number, flatDamage?: number }} ShopBonuses
 * @typedef {{
 *   areaRadiusBonus?: number,
 *   beamWidthBonus?: number,
 *   cooldownReduction?: number,
 *   damageBonus?: number,
 *   projectileSizeBonus?: number
 * }} RelicSpecialEffects
 * @typedef {{
 *   id: string,
 *   exclusiveGroup?: string,
 *   [key: string]: number | string | undefined
 * }} RunUpgradeDef
 * @typedef {{ playbackRate: number, minGapMs: number }} WeaponSfxOptions
 * @typedef {{
 *   projectileRadius(weapon: WeaponDef): number,
 *   projectileSkillModifier(weapon: WeaponDef, field: string): number,
 *   weaponCooldown(weapon: WeaponDef): number,
 *   weaponDamage(weaponId: string): number,
 *   weaponReach(weapon: WeaponDef): number,
 *   weaponSfxOptions(weapon: WeaponDef): WeaponSfxOptions,
 *   weaponWidth(weapon: WeaponDef): number
 * }} WeaponScalingApi
 */

/**
 * @param {{
 *   content?: { runUpgrades?: RunUpgradeDef[] },
 *   weaponDefs: WeaponDefs,
 *   getUpgradeTier: (id: string | undefined) => number,
 *   getRunUpgradeTier: (id: string) => number,
 *   getShopBonuses?: () => ShopBonuses,
 *   getRelicSpecialEffects?: () => RelicSpecialEffects,
 *   getWeaponDamageMultiplier?: () => number,
 *   clamp: (value: number, min: number, max: number) => number
 * }} options
 * @returns {WeaponScalingApi}
 */
export function createWeaponScaling({
  content = {},
  weaponDefs,
  getUpgradeTier,
  getRunUpgradeTier,
  getShopBonuses,
  getRelicSpecialEffects,
  getWeaponDamageMultiplier,
  clamp,
}) {
  function weaponCooldown(weapon) {
    const shopBonuses = getShopBonuses?.() || {};
    const relicEffects = getRelicSpecialEffects?.() || {};
    const rateTier =
      getUpgradeTier("fire_rate") +
      getRunUpgradeTier("run_fire_rate") +
      (shopBonuses.fireRate || 0);
    return (
      (weapon.cooldown / (1 + rateTier * 0.12 + (relicEffects.cooldownReduction || 0))) *
      projectileSkillModifier(weapon, "projectileCooldownMultiplier")
    );
  }

  function weaponSfxOptions(weapon) {
    const cooldown = Math.max(0.1, weaponCooldown(weapon));
    return {
      playbackRate: clamp(1.15 / cooldown, 0.75, 2.35),
      minGapMs: clamp(cooldown * 320, 35, 120),
    };
  }

  function weaponReach(weapon) {
    const shopBonuses = getShopBonuses?.() || {};
    const relicEffects = getRelicSpecialEffects?.() || {};
    const radiusTier =
      getUpgradeTier("attack_radius") +
      getRunUpgradeTier("run_attack_radius") +
      (shopBonuses.attackRadius || 0);
    return (weapon.range || 0) * (1 + radiusTier * 0.12 + (relicEffects.areaRadiusBonus || 0));
  }

  function weaponWidth(weapon) {
    const shopBonuses = getShopBonuses?.() || {};
    const relicEffects = getRelicSpecialEffects?.() || {};
    const radiusTier =
      getUpgradeTier("attack_radius") +
      getRunUpgradeTier("run_attack_radius") +
      (shopBonuses.attackRadius || 0);
    return (weapon.width || 0) * (1 + radiusTier * 0.1 + (relicEffects.beamWidthBonus || 0));
  }

  function projectileRadius(weapon) {
    const shopBonuses = getShopBonuses?.() || {};
    const relicEffects = getRelicSpecialEffects?.() || {};
    const projectileSizeBonus = relicEffects.projectileSizeBonus || 0;
    const radiusTier =
      getUpgradeTier("attack_radius") +
      getRunUpgradeTier("run_attack_radius") +
      (shopBonuses.attackRadius || 0);
    return (weapon.radius || 0) * (1 + radiusTier * 0.12 + projectileSizeBonus);
  }

  function weaponDamage(weaponId) {
    const weapon = weaponDefs[weaponId];
    const flatTier = getUpgradeTier("flat_damage") + getRunUpgradeTier("run_flat_damage");
    const shopBonuses = getShopBonuses?.() || {};
    const percentTier =
      getUpgradeTier("percent_damage") +
      getRunUpgradeTier("run_percent_damage") +
      getUpgradeTier(weapon.upgradeId) * 2 +
      (shopBonuses.percentDamage || 0);
    const relicEffects = getRelicSpecialEffects?.() || {};
    return (
      (weapon.damage + flatTier * 4 + (shopBonuses.flatDamage || 0)) *
      (1 + percentTier * 0.12 + (relicEffects.damageBonus || 0)) *
      (getWeaponDamageMultiplier?.() || 1) *
      projectileSkillModifier(weapon, "projectileDamageMultiplier")
    );
  }

  function projectileSkillModifier(weapon, field) {
    if (weapon?.kind !== "projectile") return 1;
    return activeProjectileSkillUpgrades().reduce((multiplier, { tier, upgrade }) => {
      const value = upgrade[field];
      if (!tier || typeof value !== "number" || !Number.isFinite(value)) return multiplier;
      return multiplier * value ** tier;
    }, 1);
  }

  function activeProjectileSkillUpgrades() {
    const selectedByExclusiveGroup = new Map();
    const activeUpgrades = (Array.isArray(content?.runUpgrades) ? content.runUpgrades : [])
      .map((upgrade, registryIndex) => {
        const tier = Number(getRunUpgradeTier(upgrade.id));
        return {
          exclusiveGroup:
            typeof upgrade.exclusiveGroup === "string" && upgrade.exclusiveGroup
              ? upgrade.exclusiveGroup
              : "",
          registryIndex,
          tier,
          upgrade,
        };
      })
      .filter(({ tier }) => Number.isFinite(tier) && tier > 0);
    activeUpgrades.forEach((candidate) => {
      if (!candidate.exclusiveGroup) return;
      const selected = selectedByExclusiveGroup.get(candidate.exclusiveGroup);
      if (!selected || candidate.tier > selected.tier) {
        selectedByExclusiveGroup.set(candidate.exclusiveGroup, candidate);
      }
    });
    return activeUpgrades.filter(
      (candidate) =>
        !candidate.exclusiveGroup ||
        selectedByExclusiveGroup.get(candidate.exclusiveGroup) === candidate
    );
  }

  return {
    projectileRadius,
    projectileSkillModifier,
    weaponCooldown,
    weaponDamage,
    weaponReach,
    weaponSfxOptions,
    weaponWidth,
  };
}
