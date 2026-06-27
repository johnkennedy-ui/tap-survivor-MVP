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
    const maxEquippedSlots = relicSystem.maxEquippedRelics(save);
    const equippedRelics = relicSystem.equippedRelics(save);
    const equippedIds = new Set(equippedRelics.map((relic) => relic.id));
    const unlockedIds = new Set(save.unlockedRelics || []);
    const nextSlotTowerLevel = maxEquippedSlots >= 5 ? null : (maxEquippedSlots + 1) * 10;

    const slots = Array.from({ length: 5 }, (_, index) => {
      const relic = equippedRelics[index] || null;
      const unlocked = index < maxEquippedSlots;
      return {
        index,
        label: `Slot ${index + 1}`,
        unlockLevel: (index + 1) * 10,
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
          value: `${maxEquippedSlots}/5`,
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
