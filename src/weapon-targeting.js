(() => {
  function nearestEnemy(game, distance) {
    if (!game.enemies.length) return null;

    const p = game.player;
    return game.enemies.reduce((best, enemy) =>
      distance(p, enemy) < distance(p, best) ? enemy : best,
    );
  }

  globalThis.TapSurvivorWeaponTargeting = {
    nearestEnemy,
  };
})();
