(() => {
  function createRunUpdater({
    canvas,
    getGame,
    combat,
    pickupSystem,
    addQuestProgressGroup,
    survivalQuestIds,
    xpQuestIds,
    levelQuestIds,
    showLevelUp,
    endRun,
    clamp,
  }) {
    function movePlayer(player, dt) {
      const dx = player.targetX - player.x;
      const dy = player.targetY - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 3) {
        const step = Math.min(dist, player.speed * dt);
        player.x += (dx / dist) * step;
        player.y += (dy / dist) * step;
      }
      player.x = clamp(player.x, 18, canvas.width - 18);
      player.y = clamp(player.y, 18, canvas.height - 18);
    }

    function update(dt) {
      const game = getGame();
      if (!game || !game.running || game.paused) return;
      const player = game.player;
      game.elapsed += dt;
      addQuestProgressGroup(survivalQuestIds, dt);
      if (game.elapsed >= game.duration) {
        combat.spawnBoss();
      }

      movePlayer(player, dt);
      combat.spawnEnemies(dt);
      combat.updateEnemies(dt);
      combat.updateEnemyBolts(dt);
      combat.updateBossSpecials(dt);
      combat.updateWeapons(dt);
      combat.updateBolts(dt);
      combat.updateAreas(dt);
      combat.updateBeams(dt);
      combat.updateWeaponBursts(dt);
      pickupSystem.updateXpDrops(dt);
      pickupSystem.updateLootDrops(dt);
      pickupSystem.updatePickupTexts(dt);

      if (player.hp <= 0) endRun("Player defeated");
    }

    function collectXp(value) {
      const game = getGame();
      if (!game?.player) return;
      const player = game.player;
      player.xp += value;
      game.xpCollected += value;
      addQuestProgressGroup(xpQuestIds, value);
      if (player.xp >= player.xpToLevel) {
        player.xp -= player.xpToLevel;
        player.level += 1;
        player.xpToLevel += 4;
        game.levelUps += 1;
        addQuestProgressGroup(levelQuestIds, 1);
        showLevelUp();
      }
    }

    return {
      update,
      collectXp,
    };
  }

  globalThis.TapSurvivorRunUpdate = {
    createRunUpdater,
  };
})();
