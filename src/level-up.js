(() => {
function createLevelUpSystem({
  ui,
  weaponDefs,
  runUpgradeDefs,
  relicDefs,
  getSave,
  getGame,
  getRunUpgradeTier,
  maxEquippedWeapons,
  activeQuestWeaponIds,
  playChoiceSfx,
}) {
  const { choiceId, shopFocusBonus, weightedChoices } = globalThis.TapSurvivorLevelUpChoices;
  const assetResolver = globalThis.TapSurvivorAssets?.createAssetResolver?.() || {
    fallbackSkillIcon: globalThis.TapSurvivorContent?.assets?.sprites?.ui?.quest || "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610",
    choiceIconDefinition: () => globalThis.TapSurvivorContent?.assets?.sprites?.ui?.quest || "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610",
    choiceIconPath: () => globalThis.TapSurvivorContent?.assets?.sprites?.ui?.quest || "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610",
    spriteSource: (definition) => typeof definition === "string" ? definition : definition?.src || definition?.path || definition?.iconSrc || "",
  };
  const fallbackSkillIcon = assetResolver.fallbackSkillIcon;

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
      questWeaponIds.includes(choice.weaponId),
    );
    const otherWeaponChoices = weaponChoices.filter((choice) => !questWeaponChoices.includes(choice));
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
        .reduce((multiplier, relic) => multiplier * Math.max(1, relic.selectionWeightBonus || 1), 1);
    }
    const runUpgradeChoices = runUpgradeDefs
      .filter((upgrade) => getRunUpgradeTier(upgrade.id) < upgrade.maxTier + relicBonusFor(upgrade.id, "maxTierBonus"))
      .map((upgrade) => {
        const tier = getRunUpgradeTier(upgrade.id);
        const maxTier = upgrade.maxTier + relicBonusFor(upgrade.id, "maxTierBonus");
        return {
          name: `${upgrade.name} ${tier + 1}`,
          description: `${upgrade.description} Tier ${tier + 1}/${maxTier}.`,
          family: upgrade.family || upgrade.id,
          relicSpawnRateMultiplier: relicSpawnRateMultiplierFor(upgrade.id),
          runUpgradeId: upgrade.id,
          apply: () => {
            game.runUpgradeTiers[upgrade.id] = tier + 1;
            upgrade.apply?.(game);
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
        1 + (familyTiers[choice.family] || 0) * 1.4 + getRunUpgradeTier(choice.runUpgradeId) * 0.8 + shopFocus;
      return baseWeight * choice.relicSpawnRateMultiplier;
    }
    const choices = [
      ...questWeaponChoices,
      ...otherChoices,
    ].slice(0, 3);

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
      const button = document.createElement("button");
      button.className = "level-choice";
      button.disabled = true;
      button.appendChild(createChoiceIcon(choice));
      const copy = document.createElement("span");
      copy.className = "level-choice-copy";
      const name = document.createElement("strong");
      name.textContent = choice.name;
      const description = document.createElement("span");
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
    const image = document.createElement("img");
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

globalThis.TapSurvivorLevelUp = {
  createLevelUpSystem,
};
})();
