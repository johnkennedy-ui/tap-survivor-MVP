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

function choiceId(choice) {
  return choice.weaponId ? `weapon:${choice.weaponId}` : `run:${choice.runUpgradeId || choice.name}`;
}

function shopFocusBonus(save) {
  return (save.shopPurchases?.relic_compass || 0) * 0.5;
}

globalThis.TapSurvivorLevelUpChoices = {
  choiceId,
  shopFocusBonus,
  shuffleChoices,
  weightedChoices,
};
})();
