(() => {
  function createRelicSystem({ relicDefs }) {
    function equippedRelics(save) {
      const equipped = new Set(save.equippedRelics || []);
      return (relicDefs || []).filter((relic) => equipped.has(relic.id));
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

    function grantRandomRelic(save) {
      const unlocked = new Set(save.unlockedRelics || []);
      const locked = (relicDefs || []).filter((relic) => !unlocked.has(relic.id));
      if (!locked.length) return null;
      const relic = locked[Math.floor(Math.random() * locked.length)];
      save.unlockedRelics = [...unlocked, relic.id];
      save.equippedRelics = [...new Set([...(save.equippedRelics || []), relic.id])];
      return relic;
    }

    return {
      equippedRelics,
      maxEquippedWeapons,
      getWeaponDamageMultiplier,
      grantRandomRelic,
    };
  }

  globalThis.TapSurvivorRelics = {
    createRelicSystem,
  };
})();
