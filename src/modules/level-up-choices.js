/**
 * @typedef {{
 *   weaponId?: string,
 *   runUpgradeId?: string,
 *   name?: string,
 *   [key: string]: unknown
 * }} LevelUpChoice
 * @typedef {{ shopPurchases?: Record<string, number> }} ChoiceSave
 * @typedef {(choice: LevelUpChoice) => number} ChoiceWeightFn
 */

/**
 * @param {LevelUpChoice[]} choices
 * @returns {LevelUpChoice[]}
 */
export function shuffleChoices(choices) {
  return choices
    .map((choice) => ({ choice, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ choice }) => choice);
}

/**
 * @param {LevelUpChoice[]} choices
 * @param {ChoiceWeightFn} weightForChoice
 * @returns {LevelUpChoice[]}
 */
export function weightedChoices(choices, weightForChoice) {
  return choices
    .map((choice) => ({
      choice,
      sort: Math.random() / Math.max(1, weightForChoice(choice)),
    }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ choice }) => choice);
}

/**
 * @param {LevelUpChoice} choice
 * @returns {string}
 */
export function choiceId(choice) {
  return choice.weaponId ? `weapon:${choice.weaponId}` : `run:${choice.runUpgradeId || choice.name}`;
}

/**
 * @param {ChoiceSave} save
 * @returns {number}
 */
export function shopFocusBonus(save) {
  return (save.shopPurchases?.relic_compass || 0) * 0.5;
}
