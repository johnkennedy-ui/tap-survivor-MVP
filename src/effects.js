// GENERATED FILE. Do not edit directly.
// Source: src/modules/effects.js
// Run: npm run build:bridges
// Retired global: TapSurvivorEffects. Exports are supplied through the game dependency bag.
(() => {
  "use strict";

  const DEFAULT_SHOP_BONUS_STATS = [
    "speed",
    "pickupRadius",
    "maxHp",
    "flatDamage",
    "attackRadius",
    "fireRate",
    "percentDamage",
    "relicFocus",
  ];

  function createEffects({ contentSchema = {} } = {}) {
    const shopBonusStats =
      contentSchema["effectRegistries"]?.["shopItem"]?.["stats"] ||
      DEFAULT_SHOP_BONUS_STATS;

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
      return Object.fromEntries(shopBonusStats.map((stat) => [stat, 0]));
    }

    function addShopItemBonus(bonuses, item, tier) {
      if (!item?.effect || !Object.prototype.hasOwnProperty.call(bonuses, item.effect.stat)) return;
      bonuses[item.effect.stat] += item.effect.value * tier;
    }

    function applyRelicSpecialEffects(game, effects = {}) {
      const player = game?.player;
      if (!player) return;
      if (effects.maxHpBonus) {
        player.maxHp += effects.maxHpBonus;
        player.hp += effects.maxHpBonus;
      }
      if (effects.maxHpMultiplier) {
        const nextMaxHp = Math.ceil(player.maxHp * (1 + effects.maxHpMultiplier));
        player.hp += nextMaxHp - player.maxHp;
        player.maxHp = nextMaxHp;
      }
      if (effects.speedBonus) player.speed += effects.speedBonus;
      if (effects.speedMultiplier) player.speed *= 1 + effects.speedMultiplier;
      if (effects.pickupRadiusBonus) player.pickupRadius += effects.pickupRadiusBonus;
      if (effects.pickupRadiusMultiplier) player.pickupRadius *= 1 + effects.pickupRadiusMultiplier;
    }

    return {
      applyRunUpgradeEffects,
      applyShopItemEffectToRun,
      emptyShopBonuses,
      addShopItemBonus,
      applyRelicSpecialEffects,
    };
  }

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
})();
