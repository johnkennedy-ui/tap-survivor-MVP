(() => {
  function createRelicSystem({ relicDefs, weaponDefs = {} }) {
    function equippedRelics(save) {
      const equipped = new Set(save.equippedRelics || []);
      return (relicDefs || []).filter((relic) => equipped.has(relic.id)).slice(0, maxEquippedRelics(save));
    }

    function maxEquippedRelics(save) {
      return Math.min(5, Math.floor(Math.max(0, save.maxPlayerLevel || 1) / 10));
    }

    function relicNumber(save, field) {
      return equippedRelics(save).reduce((total, relic) => total + (relic[field] || 0), 0);
    }

    function maxEquippedWeapons(save) {
      return Math.max(1, 4 + relicNumber(save, "weaponSlotBonus"));
    }

    function getWeaponDamageMultiplier(save) {
      return equippedRelics(save).reduce((multiplier, relic) => multiplier * (relic.weaponDamageMultiplier || 1), 1);
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
      const relic = locked[Math.floor(Math.random() * locked.length)];
      return grantRelic(save, relic);
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
        .map((relic) => ({ relic, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ relic }) => relic);
    }

    return {
      equippedRelics,
      maxEquippedRelics,
      maxEquippedWeapons,
      getWeaponDamageMultiplier,
      grantRelic,
      grantRandomRelic,
      relicChoices,
      setRelicEquipped,
    };
  }

  globalThis.TapSurvivorRelics = {
    createRelicSystem,
  };
})();
