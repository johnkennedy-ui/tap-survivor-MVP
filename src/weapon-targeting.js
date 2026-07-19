// GENERATED FILE. Do not edit directly.
// Source: src/modules/weapon-targeting.js
// Run: npm run build:bridges
(() => {
  "use strict";

  /**
   * @typedef {{ x: number, y: number }} Point
   * @typedef {{ player: Point, enemies: Point[] }} TargetingGame
   * @typedef {(a: Point, b: Point) => number} DistanceFn
   */

  /**
   * @param {TargetingGame} game
   * @param {DistanceFn} distance
   * @returns {Point | null}
   */
  function nearestEnemy(game, distance) {
    if (!game.enemies.length) return null;

    const p = game.player;
    return game.enemies.reduce((best, enemy) =>
      distance(p, enemy) < distance(p, best) ? enemy : best
    );
  }

})();
