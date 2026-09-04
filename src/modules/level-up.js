export const MODULE_NATIVE_LEVEL_UP_SLOTS = Object.freeze(["levelUp"]);

export const MODULE_NATIVE_LEVEL_UP_PROOF_SLOTS = Object.freeze(["createLevelUpSystem"]);

/**
 * @param {any} [options]
 */
export function createLevelUpSystem({
  documentRef,
  ui,
  assets,
  content,
  levelUpChoices,
  random,
  weaponDefs,
  runUpgradeDefs,
  relicDefs,
  getSave,
  getGame,
  getRunUpgradeTier,
  maxEquippedWeapons,
  activeQuestWeaponIds,
  playChoiceSfx,
} = {}) {
  if (!documentRef || typeof documentRef.createElement !== "function") {
    throw new Error("Missing Tap Survivor native level-up dependency: documentRef");
  }
  const { choiceId, shopFocusBonus, weightedChoices } = levelUpChoices;
  const fallbackIcon =
    content?.assets?.sprites?.ui?.quest ||
    "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610";
  const assetResolver = assets?.createAssetResolver?.(content) || {
    fallbackSkillIcon: fallbackIcon,
    choiceIconDefinition: () => fallbackIcon,
    choiceIconPath: () => fallbackIcon,
    spriteSource: (definition) =>
      typeof definition === "string"
        ? definition
        : definition?.src || definition?.path || definition?.iconSrc || "",
  };
  const fallbackSkillIcon = assetResolver.fallbackSkillIcon;

  function exclusiveGroupFor(upgrade) {
    return typeof upgrade?.exclusiveGroup === "string" && upgrade.exclusiveGroup
      ? upgrade.exclusiveGroup
      : "";
  }

  function levelUpTierGainFor(upgrade) {
    const tierGains = upgrade?.levelUpTierGains;
    if (!Array.isArray(tierGains) || !tierGains.length) return 1;
    let totalWeight = 0;
    for (const gain of tierGains) {
      if (
        !gain ||
        !Number.isInteger(gain.amount) ||
        gain.amount < 1 ||
        typeof gain.weight !== "number" ||
        !Number.isFinite(gain.weight) ||
        gain.weight <= 0
      ) {
        return 1;
      }
      totalWeight += gain.weight;
    }
    if (!Number.isFinite(totalWeight) || totalWeight <= 0) return 1;
    const randomValue = typeof random === "function" ? random() : Math.random();
    const roll = Math.max(
      0,
      Math.min(1 - Number.EPSILON, Number.isFinite(randomValue) ? randomValue : 0)
    );
    let remainingWeight = roll * totalWeight;
    for (const gain of tierGains) {
      if (remainingWeight < gain.weight) return gain.amount;
      remainingWeight -= gain.weight;
    }
    return tierGains[tierGains.length - 1].amount;
  }

  function uniqueExclusiveGroupChoices(choices) {
    const selectedGroups = new Set();
    return choices.filter((choice) => {
      const exclusiveGroup = exclusiveGroupFor(choice);
      if (!exclusiveGroup || !selectedGroups.has(exclusiveGroup)) {
        if (exclusiveGroup) selectedGroups.add(exclusiveGroup);
        return true;
      }
      return false;
    });
  }

  function showLevelUp() {
    const game = getGame();
    if (!game) return;
    const save = getSave();
    game.paused = true;
    game.pauseReason = "level";
    ui.choices.innerHTML = "";
    const maxWeapons = maxEquippedWeapons?.() || 4;
    const canEquipWeapon = game.player.equippedWeapons.length < maxWeapons;
    const weaponChoices = canEquipWeapon
      ? save.unlockedWeapons
          .filter((weaponId) => !game.player.equippedWeapons.includes(weaponId))
          .map((weaponId) => ({
            weaponId,
            name: weaponDefs[weaponId].name,
            description: `Equip ${weaponDefs[weaponId].name} for this run. Weapon ${game.player.equippedWeapons.length + 1}/${maxWeapons}.`,
            apply: () => game.player.equippedWeapons.push(weaponId),
          }))
      : [];
    const questWeaponIds = activeQuestWeaponIds();
    const questWeaponChoices = weaponChoices.filter((choice) =>
      questWeaponIds.includes(choice.weaponId)
    );
    const otherWeaponChoices = weaponChoices.filter(
      (choice) => !questWeaponChoices.includes(choice)
    );
    const activeRelics = (save.equippedRelics || [])
      .map((id) => (relicDefs || []).find((relic) => relic.id === id))
      .filter(Boolean);
    function relicBonusFor(upgradeId, field) {
      return activeRelics
        .filter((relic) => relic.targetUpgradeId === upgradeId)
        .reduce((total, relic) => total + (relic[field] || 0), 0);
    }
    function relicSpawnRateMultiplierFor(upgradeId) {
      return activeRelics
        .filter((relic) => relic.targetUpgradeId === upgradeId)
        .reduce(
          (multiplier, relic) => multiplier * Math.max(1, relic.selectionWeightBonus || 1),
          1
        );
    }
    const runUpgradeChoices = runUpgradeDefs
      .filter(
        (upgrade) =>
          (!upgrade.requiresWeapon || game.player.equippedWeapons.includes(upgrade.requiresWeapon)) &&
          getRunUpgradeTier(upgrade.id) <
            upgrade.maxTier + relicBonusFor(upgrade.id, "maxTierBonus") &&
          !runUpgradeDefs.some(
            (otherUpgrade) =>
              otherUpgrade.id !== upgrade.id &&
              exclusiveGroupFor(otherUpgrade) === exclusiveGroupFor(upgrade) &&
              Boolean(exclusiveGroupFor(upgrade)) &&
              getRunUpgradeTier(otherUpgrade.id) > 0
          )
      )
      .map((upgrade) => {
        const tier = getRunUpgradeTier(upgrade.id);
        const maxTier = upgrade.maxTier + relicBonusFor(upgrade.id, "maxTierBonus");
        const tierGain = Math.min(levelUpTierGainFor(upgrade), Math.max(0, maxTier - tier));
        return {
          name: `${upgrade.name} +${tierGain}`,
          description: `${upgrade.description} Tier ${tier + tierGain}/${maxTier}.`,
          exclusiveGroup: exclusiveGroupFor(upgrade),
          family: upgrade.family || upgrade.id,
          relicSpawnRateMultiplier: relicSpawnRateMultiplierFor(upgrade.id),
          runUpgradeId: upgrade.id,
          apply: () => {
            game.runUpgradeTiers[upgrade.id] = tier + tierGain;
            for (let appliedTier = 0; appliedTier < tierGain; appliedTier += 1) {
              upgrade.apply?.(game);
            }
          },
        };
      });
    const familyTiers = runUpgradeDefs.reduce((totals, upgrade) => {
      const family = upgrade.family || upgrade.id;
      totals[family] = (totals[family] || 0) + getRunUpgradeTier(upgrade.id);
      return totals;
    }, {});
    const recentChoiceIds = new Set(game.lastLevelUpChoiceIds || []);
    const otherChoicePool = [...otherWeaponChoices, ...runUpgradeChoices];
    const freshChoices = otherChoicePool.filter((choice) => !recentChoiceIds.has(choiceId(choice)));
    const repeatChoices = otherChoicePool.filter((choice) => recentChoiceIds.has(choiceId(choice)));
    const otherChoices = [
      ...weightedChoices(freshChoices, choiceWeight),
      ...weightedChoices(repeatChoices, choiceWeight),
    ];
    function choiceWeight(choice) {
      if (!choice.runUpgradeId) return 1;
      const shopFocus = shopFocusBonus(save);
      const baseWeight =
        1 +
        (familyTiers[choice.family] || 0) * 1.4 +
        getRunUpgradeTier(choice.runUpgradeId) * 0.8 +
        shopFocus;
      return baseWeight * choice.relicSpawnRateMultiplier;
    }
    const choices = uniqueExclusiveGroupChoices([...questWeaponChoices, ...otherChoices]).slice(
      0,
      3
    );

    if (!choices.length) {
      choices.push({
        name: "Repair",
        description: "Recover 30 HP.",
        apply: () => {
          game.player.hp = Math.min(game.player.maxHp, game.player.hp + 30);
        },
      });
    }
    game.lastLevelUpChoiceIds = choices.map(choiceId);

    choices.forEach((choice) => {
      const button = documentRef.createElement("button");
      button.className = "level-choice";
      button.disabled = true;
      button.appendChild(createChoiceIcon(choice));
      const copy = documentRef.createElement("span");
      copy.className = "level-choice-copy";
      const name = documentRef.createElement("strong");
      name.textContent = choice.name;
      const description = documentRef.createElement("span");
      description.textContent = choice.description;
      copy.appendChild(name);
      copy.appendChild(description);
      button.appendChild(copy);
      button.addEventListener("click", () => {
        if (button.disabled) return;
        choice.apply();
        playChoiceSfx?.(choice);
        game.paused = false;
        game.pauseReason = "";
        ui.levelUp.classList.add("hidden");
      });
      setTimeout(() => {
        if (!ui.levelUp.classList.contains("hidden")) button.disabled = false;
      }, 500);
      ui.choices.appendChild(button);
    });
    ui.levelUp.classList.remove("hidden");
  }

  function createChoiceIcon(choice) {
    const path = assetResolver.choiceIconPath(choice) || fallbackSkillIcon;
    const image = documentRef.createElement("img");
    image.className = "level-choice-icon";
    image.src = path;
    image.alt = "";
    return image;
  }

  function closeLevelUpMenu() {
    ui.levelUp.classList.add("hidden");
    const game = getGame();
    if (game?.pauseReason === "level") {
      game.paused = false;
      game.pauseReason = "";
    }
  }

  return {
    showLevelUp,
    closeLevelUpMenu,
  };
}
