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
  getSave,
  getGame,
  getRunUpgradeTier,
  activeQuestWeaponIds,
}) {
  function showLevelUp() {
    const game = getGame();
    if (!game) return;
    const save = getSave();
    game.paused = true;
    game.pauseReason = "level";
    ui.choices.innerHTML = "";
    const weaponChoices = save.unlockedWeapons
      .filter((weaponId) => !game.player.equippedWeapons.includes(weaponId))
      .map((weaponId) => ({
        weaponId,
        name: weaponDefs[weaponId].name,
        description: `Equip ${weaponDefs[weaponId].name} for this run.`,
        apply: () => game.player.equippedWeapons.push(weaponId),
      }));
    const questWeaponIds = activeQuestWeaponIds();
    const questWeaponChoices = weaponChoices.filter((choice) =>
      questWeaponIds.includes(choice.weaponId),
    );
    const otherWeaponChoices = weaponChoices.filter((choice) => !questWeaponChoices.includes(choice));
    const runUpgradeChoices = runUpgradeDefs
      .filter((upgrade) => getRunUpgradeTier(upgrade.id) < upgrade.maxTier)
      .map((upgrade) => {
        const tier = getRunUpgradeTier(upgrade.id);
        return {
          name: `${upgrade.name} ${tier + 1}`,
          description: `${upgrade.description} Tier ${tier + 1}/${upgrade.maxTier}.`,
          family: upgrade.family || upgrade.id,
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
    const otherChoices = weightedChoices([...otherWeaponChoices, ...runUpgradeChoices], (choice) => {
      if (!choice.runUpgradeId) return 1;
      return 1 + (familyTiers[choice.family] || 0) * 1.4 + getRunUpgradeTier(choice.runUpgradeId) * 0.8;
    });
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

    choices.forEach((choice) => {
      const button = document.createElement("button");
      button.innerHTML = `<strong>${choice.name}</strong><br /><span>${choice.description}</span>`;
      button.addEventListener("click", () => {
        choice.apply();
        game.paused = false;
        game.pauseReason = "";
        ui.levelUp.classList.add("hidden");
      });
      ui.choices.appendChild(button);
    });
    ui.levelUp.classList.remove("hidden");
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
