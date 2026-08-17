const RELIC_SLOT_LEVELS = Object.freeze([5, 10, 20, 30, 40, 50]);
const QUEST_CACHE_COST = 1;
const QUEST_CACHE_FALLBACK_COINS = 25;

export function createRelicSystem({ relicDefs, weaponDefs = {}, random = Math.random }) {
  function equippedRelics(save) {
    const equipped = new Set(save.equippedRelics || []);
    return (relicDefs || []).filter((relic) => equipped.has(relic.id)).slice(0, maxEquippedRelics(save));
  }

  function maxEquippedRelics(save) {
    const towerFloor = Math.max(0, Math.floor(Number(save?.towerFloor) || 0));
    return RELIC_SLOT_LEVELS.filter((unlockLevel) => towerFloor >= unlockLevel).length;
  }

  function relicNumber(save, field) {
    return equippedRelics(save).reduce((total, relic) => total + (relic[field] || 0), 0);
  }

  function relicBonusFor(save, upgradeId, field) {
    return equippedRelics(save)
      .filter((relic) => relic.targetUpgradeId === upgradeId)
      .reduce((total, relic) => total + (relic[field] || 0), 0);
  }

  function startingRunUpgradeTiers(save) {
    return equippedRelics(save).reduce((tiers, relic) => {
      const bonus = relic.startingTierBonus || 0;
      if (relic.targetUpgradeId && bonus > 0) {
        tiers[relic.targetUpgradeId] = (tiers[relic.targetUpgradeId] || 0) + bonus;
      }
      return tiers;
    }, {});
  }

  function maxEquippedWeapons(save) {
    return Math.max(1, 4 + relicNumber(save, "weaponSlotBonus"));
  }

  function getWeaponDamageMultiplier(save) {
    return equippedRelics(save).reduce((multiplier, relic) => multiplier * (relic.weaponDamageMultiplier || 1), 1);
  }

  function specialEffects(save) {
    return equippedRelics(save).reduce((effects, relic) => mergeSpecialAbility(effects, relic.specialAbility), {});
  }

  function mergeSpecialAbility(effects, ability) {
    if (!ability?.modifiers) return effects;
    Object.entries(ability.modifiers).forEach(([key, value]) => {
      if (!Number.isFinite(value)) return;
      effects[key] = (effects[key] || 0) + value;
    });
    return effects;
  }

  function grantRelic(save, relic) {
    if (!relic) return null;
    const unlocked = new Set(save.unlockedRelics || []);
    if (unlocked.has(relic.id)) return null;
    save.unlockedRelics = [...unlocked, relic.id];
    if ((save.equippedRelics || []).length < maxEquippedRelics(save)) {
      save.equippedRelics = [...new Set([...(save.equippedRelics || []), relic.id])];
    }
    return relic;
  }

  function setRelicEquipped(save, relicId, equipped) {
    const unlocked = new Set(save.unlockedRelics || []);
    if (!unlocked.has(relicId)) return false;
    const current = (save.equippedRelics || []).filter((id) => unlocked.has(id)).slice(0, maxEquippedRelics(save));
    if (!equipped) {
      save.equippedRelics = current.filter((id) => id !== relicId);
      return true;
    }
    if (current.includes(relicId)) return true;
    if (current.length >= maxEquippedRelics(save)) return false;
    save.equippedRelics = [...current, relicId];
    return true;
  }

  function grantRandomRelic(save) {
    const unlocked = new Set(save.unlockedRelics || []);
    const locked = (relicDefs || []).filter((relic) => !unlocked.has(relic.id));
    if (!locked.length) return null;
    const relic = locked[Math.floor(random() * locked.length)];
    return grantRelic(save, relic);
  }

  function claimQuestReward(save) {
    if (!hasValidQuestRewardState(save)) return null;
    const unlocked = new Set(save.unlockedRelics);
    const locked = (relicDefs || []).filter((relic) => relic?.id && !unlocked.has(relic.id));
    if (locked.length) {
      const relic = locked[Math.floor(random() * locked.length)];
      if (!relic) return null;
      const granted = grantRelic(save, relic);
      if (!granted) return null;
      save.questPoints -= QUEST_CACHE_COST;
      return {
        coins: 0,
        questPointsSpent: QUEST_CACHE_COST,
        relic: granted,
        type: "relic",
      };
    }

    save.questPoints -= QUEST_CACHE_COST;
    save.coins += QUEST_CACHE_FALLBACK_COINS;
    return {
      coins: QUEST_CACHE_FALLBACK_COINS,
      questPointsSpent: QUEST_CACHE_COST,
      relic: null,
      type: "coins",
    };
  }

  function hasValidQuestRewardState(save) {
    return Boolean(
      save &&
        typeof save === "object" &&
        !Array.isArray(save) &&
        Array.isArray(save.unlockedRelics) &&
        Array.isArray(save.equippedRelics) &&
        Number.isInteger(save.coins) &&
        save.coins >= 0 &&
        Number.isInteger(save.questPoints) &&
        save.questPoints >= QUEST_CACHE_COST
    );
  }

  function relicChoices(save, equippedWeaponIds, count = 3) {
    const unlocked = new Set(save.unlockedRelics || []);
    const locked = (relicDefs || []).filter((relic) => !unlocked.has(relic.id));
    const relevantIds = relevantRunUpgradeIds(equippedWeaponIds);
    const relevant = locked.filter((relic) => relevantIds.has(relic.targetUpgradeId));
    const fallback = locked.filter((relic) => !relevantIds.has(relic.targetUpgradeId));
    return [...shuffleRelics(relevant), ...shuffleRelics(fallback)].slice(0, count);
  }

  function relevantRunUpgradeIds(equippedWeaponIds) {
    const ids = new Set(["run_fire_rate", "run_flat_damage", "run_percent_damage"]);
    const kinds = new Set((equippedWeaponIds || []).map((id) => weaponDefs[id]?.kind).filter(Boolean));
    if (kinds.has("projectile")) {
      ["run_projectile_pierce", "run_wall_bounce", "run_split_shot", "run_split_on_hit"].forEach((id) => ids.add(id));
    }
    if (["beam", "cone", "radial", "target_area", "lingering_area", "mine"].some((kind) => kinds.has(kind))) {
      ids.add("run_attack_radius");
    }
    return ids;
  }

  function shuffleRelics(relics) {
    return relics
      .map((relic) => ({ relic, sort: random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ relic }) => relic);
  }

  return {
    equippedRelics,
    maxEquippedRelics,
    maxEquippedWeapons,
    getWeaponDamageMultiplier,
    specialEffects,
    relicBonusFor,
    grantRelic,
    grantRandomRelic,
    claimQuestReward,
    questCacheCost: QUEST_CACHE_COST,
    questCacheFallbackCoins: QUEST_CACHE_FALLBACK_COINS,
    relicSlotLevels: RELIC_SLOT_LEVELS,
    relicChoices,
    setRelicEquipped,
    startingRunUpgradeTiers,
  };
}
