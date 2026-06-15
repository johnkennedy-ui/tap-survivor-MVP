(() => {
const PLAYER_STAT_EFFECTS = {
  speed(player, value) {
    player.speed += value;
  },
  pickupRadius(player, value) {
    player.pickupRadius += value;
  },
  maxHp(player, value) {
    player.maxHp += value;
    player.hp += value;
  },
};

const SHOP_BONUS_STATS = [
  "speed",
  "pickupRadius",
  "maxHp",
  "flatDamage",
  "attackRadius",
  "fireRate",
  "percentDamage",
  "relicFocus",
];

function applyPlayerStatEffect(player, effect) {
  const handler = PLAYER_STAT_EFFECTS[effect?.stat];
  if (!player || !handler) return false;
  handler(player, effect.value || 0);
  return true;
}

function applyRunUpgradeEffects(game, effects) {
  (effects || []).forEach((effect) => {
    if (effect.type === "playerStatAdd") {
      applyPlayerStatEffect(game.player, effect);
      return;
    }
    if (effect.type === "playerHeal") {
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + effect.value);
    }
  });
}

function applyShopItemEffectToRun(game, item) {
  if (!game?.running || !game.player || !item?.effect) return false;
  return applyPlayerStatEffect(game.player, item.effect);
}

function emptyShopBonuses() {
  return Object.fromEntries(SHOP_BONUS_STATS.map((stat) => [stat, 0]));
}

function addShopItemBonus(bonuses, item, tier) {
  if (!item?.effect || !Object.prototype.hasOwnProperty.call(bonuses, item.effect.stat)) return;
  bonuses[item.effect.stat] += item.effect.value * tier;
}

globalThis.TapSurvivorEffects = {
  applyRunUpgradeEffects,
  applyShopItemEffectToRun,
  emptyShopBonuses,
  addShopItemBonus,
};
})();
