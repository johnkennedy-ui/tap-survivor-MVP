// GENERATED FILE. Do not edit directly.
// Source: src/modules/run-update.js
// Run: npm run build:bridges
// Retired global: TapSurvivorRunUpdate. Exports are supplied through the game dependency bag.
(() => {
  "use strict";

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
    getRelicSpecialEffects,
    mapSystem,
    clamp,
  }) {
    function movePlayer(player, dt) {
      const dx = player.targetX - player.x;
      const dy = player.targetY - player.y;
      const dist = Math.hypot(dx, dy);
      player.moving = dist > 3;
      if (dist > 3) {
        player.facingX = dx / dist;
        player.facingY = dy / dist;
        const step = Math.min(dist, player.speed * dt);
        player.x += player.facingX * step;
        player.y += player.facingY * step;
      }
      player.x = clamp(player.x, 18, canvas.width - 18);
      player.y = clamp(player.y, 18, canvas.height - 18);
    }

    function update(dt) {
      const game = getGame();
      if (!game || !game.running || game.paused) return;
      const player = game.player;
      if (game.awaitingFirstMoveInput) return;
      game.elapsed += dt;
      mapSystem?.applyToGame?.(game);
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
      updateRelicTimers(player, dt);
      updatePlayerAnimation(player, dt);
      pickupSystem.updateXpDrops(dt);
      pickupSystem.updateLootDrops(dt);
      pickupSystem.updatePickupTexts(dt);

      if (player.hp <= 0) endRun("Player defeated");
    }

    function updatePlayerAnimation(player, dt) {
      if (!player.actionTimer) return;
      player.actionTimer = Math.max(0, player.actionTimer - dt);
      if (player.actionTimer <= 0) player.actionSprite = "";
    }

    function updateRelicTimers(player, dt) {
      player.invincibleTimer = Math.max(0, (player.invincibleTimer || 0) - dt);
      player.blinkTimer = Math.max(0, (player.blinkTimer || 0) - dt);
      player.teleportCooldown = Math.max(0, (player.teleportCooldown || 0) - dt);
    }

    function collectXp(value) {
      const game = getGame();
      if (!game?.player) return;
      const player = game.player;
      const xpValue = Math.ceil(value * (1 + ((getRelicSpecialEffects?.() || {}).xpMultiplier || 0)));
      player.xp += xpValue;
      game.xpCollected += xpValue;
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
})();
