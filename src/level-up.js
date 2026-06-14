(() => {
function shuffleChoices(choices) {
  return choices
    .map((choice) => ({ choice, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ choice }) => choice);
}

function weightedChoices(choices, weightForChoice) {
  return choices
    .map((choice) => ({
      choice,
      sort: Math.random() / Math.max(1, weightForChoice(choice)),
    }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ choice }) => choice);
}

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
  const skillIconByRunUpgrade = {
    run_move_speed: "speed",
    run_pickup_radius: "pickupRadius",
    run_max_hp: "maxHp",
    run_attack_radius: "attackRadius",
    run_fire_rate: "fireRate",
    run_flat_damage: "flatDamage",
    run_percent_damage: "percentDamage",
  };
  const shopIconByStat = new Map(
    (globalThis.TapSurvivorContent?.shopItems || [])
      .filter((item) => item.effect?.stat && item.spritePath)
      .map((item) => [item.effect.stat, item.spritePath]),
  );
  const weaponIcons = globalThis.TapSurvivorContent?.assets?.sprites?.weapons || {};
  const fallbackSkillIcon = globalThis.TapSurvivorContent?.assets?.sprites?.ui?.quest || "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610";

  function iconForChoice(choice) {
    if (choice.weaponId) return weaponIcons[choice.weaponId] || fallbackSkillIcon;
    if (choice.runUpgradeId) return shopIconByStat.get(skillIconByRunUpgrade[choice.runUpgradeId]) || fallbackSkillIcon;
    return fallbackSkillIcon;
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
    const runUpgradeChoices = runUpgradeDefs
      .filter((upgrade) => getRunUpgradeTier(upgrade.id) < upgrade.maxTier + relicBonusFor(upgrade.id, "maxTierBonus"))
      .map((upgrade) => {
        const tier = getRunUpgradeTier(upgrade.id);
        const maxTier = upgrade.maxTier + relicBonusFor(upgrade.id, "maxTierBonus");
        return {
          name: `${upgrade.name} ${tier + 1}`,
          description: `${upgrade.description} Tier ${tier + 1}/${maxTier}.`,
          family: upgrade.family || upgrade.id,
          relicWeightBonus: relicBonusFor(upgrade.id, "selectionWeightBonus"),
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
      return 1 + (familyTiers[choice.family] || 0) * 1.4 + getRunUpgradeTier(choice.runUpgradeId) * 0.8 + choice.relicWeightBonus + shopFocus;
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
      button.innerHTML = `
        <img class="level-choice-icon" src="${iconForChoice(choice)}" alt="" />
        <span class="level-choice-copy">
          <strong>${choice.name}</strong>
          <span>${choice.description}</span>
        </span>
      `;
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

  function shopFocusBonus(save) {
    return (save.shopPurchases?.relic_compass || 0) * 0.5;
  }

  function choiceId(choice) {
    return choice.weaponId ? `weapon:${choice.weaponId}` : `run:${choice.runUpgradeId || choice.name}`;
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
