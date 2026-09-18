// GENERATED FILE. Do not edit directly.
// Source: src/modules/run-ui.js
// Run: npm run build:bridges
// Retired global: TapSurvivorRunUi. Exports are supplied through the game dependency bag.
(() => {
  "use strict";

  function createRunUi({
    ui,
    formatTime,
    getGame,
    getSave,
    getGameSpeed,
    maxEquippedWeapons,
    renderDebug,
  }) {
    function updateRunHud() {
      const game = getGame();
      if (!game) {
        if (ui.runHud)
          ui.runHud.textContent = `Speed x${getGameSpeed()} | Start a run to test movement, auto-attacks, XP, Laser, quests, and Quest Points.`;
        renderDebug();
        return;
      }
      const save = getSave();
      const boss = game.enemies.find((enemy) => enemy.boss);
      const bossText = boss
        ? ` | Boss HP ${Math.max(0, Math.ceil(boss.hp))}/${boss.maxHp}`
        : game.bossSpawned
          ? " | Boss defeated"
          : "";
      const floorText = game.lastFloorClear
        ? ` | Cleared Floor ${game.lastFloorClear.floor}: ${game.lastFloorClear.relicName}`
        : "";
      if (ui.runHud) {
        ui.runHud.textContent = [
          `Time ${formatTime(game.elapsed)}`,
          `Floor ${game.towerFloor}`,
          `Speed x${getGameSpeed()}`,
          `HP ${Math.max(0, Math.ceil(game.player.hp))}/${game.player.maxHp}`,
          `Coins ${save.coins}`,
          `Level ${game.player.level}`,
          `Kills ${game.kills}`,
          `Laser damage ${Math.floor(game.laserDamage)}`,
          `Weapons ${game.player.equippedWeapons.length}/${maxEquippedWeapons()}${bossText}${floorText}`,
        ].join(" | ");
      }
      renderDebug();
    }

    function showEndScreen(reason) {
      const game = getGame();
      const save = getSave();
      if (!game) return;
      ui.runStats.replaceChildren(
        ...[
          `Result: ${reason}`,
          `Tower floor: ${game.towerFloor}`,
          `Time survived: ${formatTime(game.elapsed)}`,
          `Enemies defeated: ${game.kills}`,
          `Level reached: ${game.player.level}`,
          `XP collected: ${game.xpCollected}`,
          `Coins banked: ${save.coins}`,
          `Laser damage dealt: ${Math.floor(game.laserDamage)}`,
          `Quest Points: ${save.questPoints} available`,
        ].map((text) => {
          const line = ui.runStats.ownerDocument.createElement("p");
          line.textContent = text;
          return line;
        })
      );
      ui.endScreen.classList.remove("hidden");
    }

    function hideEndScreen() {
      ui.endScreen.classList.add("hidden");
    }

    return {
      updateRunHud,
      showEndScreen,
      hideEndScreen,
    };
  }
})();
