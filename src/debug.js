// GENERATED FILE. Do not edit directly.
// Source: src/modules/debug.js
// Run: npm run build:bridges
// Retired global: TapSurvivorDebug. Exports are supplied through the game dependency bag.
(() => {
  "use strict";

  function createDebugSystem({
    ui,
    floorDifficulty,
    getGame,
    getSave,
    getRunUpgradeTier,
    maxEquippedWeapons,
    getWeaponDamageMultiplier,
    getActiveProfile,
    relicDefs,
    runUpgradeDefs,
  }) {
    let enabled = false;

    function relicNames(save) {
      const equipped = new Set(save.equippedRelics || []);
      return (relicDefs || [])
        .filter((relic) => equipped.has(relic.id))
        .map((relic) => relic.name || relic.id);
    }

    function activeRunUpgrades() {
      return (runUpgradeDefs || [])
        .map((upgrade) => ({ upgrade, tier: getRunUpgradeTier(upgrade.id) }))
        .filter(({ tier }) => tier > 0)
        .map(({ upgrade, tier }) => `${upgrade.name || upgrade.id} ${tier}`);
    }

    function weaponDamageLines(game) {
      return Object.entries(game?.weaponDamage || {})
        .sort((left, right) => right[1] - left[1])
        .slice(0, 6)
        .map(([weaponId, damage]) => `${weaponId}: ${Math.floor(damage)}`);
    }

    function render() {
      if (!enabled || !ui.debugStats) return;
      const game = getGame();
      const save = getSave();
      const floor = game?.towerFloor || save.towerFloor || 1;
      const difficulty = floorDifficulty(floor);
      const equippedWeapons = game?.player?.equippedWeapons?.length || 0;
      const runUpgrades = activeRunUpgrades();
      const relics = relicNames(save);
      const damageLines = weaponDamageLines(game);

      ui.debugStats.textContent = [
        `Floor: ${floor}`,
        `Balance profile: ${getActiveProfile?.() || "default"}`,
        `Map: ${game?.activeMap?.name || game?.activeMap?.id || "default"}`,
        `Floor content: ${game?.activeFloor?.name || game?.activeFloor?.id || "none"}`,
        `Map modifiers: ${Object.keys(game?.mapModifiers || {}).length ? JSON.stringify(game.mapModifiers) : "none"}`,
        `Enemy HP x${difficulty.hp.toFixed(2)}`,
        `Enemy DMG x${difficulty.damage.toFixed(2)}`,
        `Spawn pressure x${difficulty.spawnRate.toFixed(2)}`,
        `Weapon slots: ${equippedWeapons}/${maxEquippedWeapons()}`,
        `Weapon damage x${getWeaponDamageMultiplier().toFixed(2)}`,
        `Kills: ${game?.kills || 0}`,
        `Level: ${game?.player?.level || 0}`,
        `Run upgrades: ${runUpgrades.length ? runUpgrades.join(", ") : "none"}`,
        `Relics: ${relics.length ? relics.join(", ") : "none"}`,
        `Weapon damage totals: ${damageLines.length ? damageLines.join(", ") : "none"}`,
      ].join("\n");
    }

    function setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);
      ui.debugPanel?.classList.toggle("hidden", !enabled);
      ui.toggleDebug?.setAttribute("aria-pressed", String(enabled));
      render();
    }

    function toggle() {
      setEnabled(!enabled);
    }

    function bind() {
      ui.toggleDebug?.addEventListener("click", toggle);
      setEnabled(false);
    }

    return {
      bind,
      render,
      floorDifficulty,
      isEnabled: () => enabled,
    };
  }
})();
