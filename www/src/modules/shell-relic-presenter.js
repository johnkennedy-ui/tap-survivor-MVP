const DEFAULT_RELIC_SLOT_LEVELS = Object.freeze([5, 10, 20, 30, 40, 50]);

/**
 * @param {any} [options]
 */
export function createShellRelicPresenter(options = {}) {
  const {
    content = {},
    relicDefs = [],
    relicSystem,
    assetResolver = {},
  } = options;
  if (!relicSystem) {
    throw new Error("Missing Tap Survivor module shell relic dependency: relicSystem");
  }

  const runUpgradeDefs = Array.isArray(content.runUpgrades) ? content.runUpgrades : [];
  const relicSlotLevels = Array.isArray(relicSystem.relicSlotLevels)
    ? relicSystem.relicSlotLevels
    : DEFAULT_RELIC_SLOT_LEVELS;

  function relicIcon(relic) {
    return assetResolver.relicIcon?.(relic) || relic?.iconPath || content?.assets?.sprites?.ui?.quest || "";
  }

  function linkedSkill(relic) {
    const skill = runUpgradeDefs.find((upgrade) => upgrade.id === relic?.targetUpgradeId);
    if (!skill) return null;
    return {
      id: skill.id,
      name: skill.name || skill.id,
    };
  }

  function relicSummary(relic, { equipped = false, unlocked = false } = {}) {
    const skill = linkedSkill(relic);
    return {
      id: relic.id,
      name: relic.name || relic.id,
      description: relic.description || "",
      iconSrc: relicIcon(relic),
      targetUpgradeId: relic.targetUpgradeId || "",
      linkedSkill: skill,
      rarity: relic.rarity || "",
      backgroundColor: relic.backgroundColor || "",
      equipped,
      unlocked,
      bonuses: {
        maxTierBonus: relic.maxTierBonus || 0,
        selectionWeightBonus: relic.selectionWeightBonus || 0,
        startingTierBonus: relic.startingTierBonus || 0,
        weaponSlotBonus: relic.weaponSlotBonus || 0,
        weaponDamageMultiplier: relic.weaponDamageMultiplier || 1,
      },
      specialAbility: relic.specialAbility
        ? {
            id: relic.specialAbility.id || "",
            label: relic.specialAbility.label || "",
            description: relic.specialAbility.description || "",
            modifiers: { ...(relic.specialAbility.modifiers || {}) },
          }
        : null,
    };
  }

  function createInventoryViewModel(save = {}) {
    const maxEquippedSlots = Math.min(relicSlotLevels.length, relicSystem.maxEquippedRelics(save));
    const equippedRelics = relicSystem.equippedRelics(save);
    const equippedIds = new Set(equippedRelics.map((relic) => relic.id));
    const unlockedIds = new Set(save.unlockedRelics || []);
    const nextSlotTowerLevel = maxEquippedSlots >= relicSlotLevels.length ? null : relicSlotLevels[maxEquippedSlots];
    const questCacheCost = relicSystem.questCacheCost || 1;
    const questCacheFallbackCoins = relicSystem.questCacheFallbackCoins || 25;
    const questPoints = Number.isInteger(save.questPoints) ? Math.max(0, save.questPoints) : 0;
    const lockedRelicCount = relicDefs.filter((relic) => !unlockedIds.has(relic.id)).length;

    const slots = relicSlotLevels.map((unlockLevel, index) => {
      const relic = equippedRelics[index] || null;
      const unlocked = index < maxEquippedSlots;
      return {
        index,
        label: `Slot ${index + 1}`,
        unlockLevel,
        unlocked,
        empty: unlocked && !relic,
        relic: relic ? relicSummary(relic, { equipped: true, unlocked: true }) : null,
      };
    });

    const availableRelics = relicDefs
      .filter((relic) => !equippedIds.has(relic.id))
      .map((relic) =>
        relicSummary(relic, {
          equipped: false,
          unlocked: unlockedIds.has(relic.id),
        })
      );
    const startingRunUpgradeTiers = relicSystem.startingRunUpgradeTiers(save);
    const specialEffects = relicSystem.specialEffects(save);

    return {
      towerFloor: Math.max(1, save.towerFloor || 1),
      maxEquippedSlots,
      nextSlotTowerLevel,
      canEquipMore: equippedRelics.length < maxEquippedSlots,
      slots,
      equippedRelics: equippedRelics.map((relic) => relicSummary(relic, { equipped: true, unlocked: true })),
      availableRelics,
      questReward: {
        canClaim: questPoints >= questCacheCost,
        cost: questCacheCost,
        description: lockedRelicCount
          ? `Spend ${questCacheCost} QP for a random locked relic.`
          : `All relics owned: spend ${questCacheCost} QP for ${questCacheFallbackCoins} coins.`,
        fallbackCoins: questCacheFallbackCoins,
        label: "Quest Cache",
      },
      bonuses: {
        startingRunUpgradeTiers,
        maxTierBonuses: Object.fromEntries(
          Object.keys(startingRunUpgradeTiers).map((upgradeId) => [
            upgradeId,
            relicSystem.relicBonusFor(save, upgradeId, "maxTierBonus"),
          ])
        ),
      },
      specialModifiers: Object.entries(specialEffects)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => ({ key, value })),
      summaryRows: [
        {
          label: "Relic slots",
          value: `${maxEquippedSlots}/${relicSlotLevels.length}`,
        },
        {
          label: "Next slot",
          value: nextSlotTowerLevel ? `Tower level ${nextSlotTowerLevel}` : "Maximum slots unlocked",
        },
      ],
    };
  }

  return {
    createInventoryViewModel,
  };
}
