(() => {
function createPickupSystem({
  getGame,
  getSave,
  persist,
  renderMeta,
  collectXp,
  distance,
  randomRange,
}) {
  function spawnLootDrops(enemy) {
    const game = getGame();
    if (enemy.boss || Math.random() < 0.34) {
      game.lootDrops.push({
        type: "coin",
        x: enemy.x + randomRange(-10, 10),
        y: enemy.y + randomRange(-10, 10),
        radius: enemy.boss ? 10 : 7,
        value: enemy.boss ? 12 : 1,
      });
    }
    if (enemy.boss || Math.random() < 0.12) {
      game.lootDrops.push({
        type: "heart",
        x: enemy.x + randomRange(-12, 12),
        y: enemy.y + randomRange(-12, 12),
        radius: enemy.boss ? 11 : 8,
        healPercent: 0.2,
      });
    }
  }

  function pullDropTowardPlayer(drop, player, speed, dt) {
    const dx = player.x - drop.x;
    const dy = player.y - drop.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const step = Math.min(dist, speed * dt);
    drop.x += (dx / dist) * step;
    drop.y += (dy / dist) * step;
  }

  function updateXpDrops(dt) {
    const game = getGame();
    const player = game.player;
    game.xpDrops.forEach((drop) => {
      if (distance(player, drop) < player.pickupRadius) {
        pullDropTowardPlayer(drop, player, 480, dt);
      }
      if (distance(player, drop) < player.radius + drop.radius) {
        drop.collected = true;
        collectXp(drop.value);
      }
    });
    game.xpDrops = game.xpDrops.filter((drop) => !drop.collected);
  }

  function updateLootDrops(dt) {
    const game = getGame();
    const player = game.player;
    game.lootDrops.forEach((drop) => {
      if (distance(player, drop) < player.pickupRadius) {
        pullDropTowardPlayer(drop, player, 540, dt);
      }
      if (distance(player, drop) < player.radius + drop.radius) {
        drop.collected = true;
        collectLoot(drop);
      }
    });
    game.lootDrops = game.lootDrops.filter((drop) => !drop.collected);
  }

  function collectLoot(drop) {
    const game = getGame();
    const save = getSave();
    if (drop.type === "coin") {
      save.coins += drop.value;
      persist();
      renderMeta();
    }
    if (drop.type === "heart") {
      const healAmount = Math.ceil(game.player.maxHp * drop.healPercent);
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + healAmount);
    }
  }

  return {
    spawnLootDrops,
    updateXpDrops,
    updateLootDrops,
  };
}

globalThis.TapSurvivorPickups = {
  createPickupSystem,
};
})();
