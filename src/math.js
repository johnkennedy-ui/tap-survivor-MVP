// GENERATED FILE. Do not edit directly.
// Source: src/modules/math.js
// Run: npm run build:bridges
(() => {
  "use strict";

  /**
   * @typedef {{ x: number, y: number }} Point
   */

  /**
   * @param {Point} a
   * @param {Point} b
   * @returns {number}
   */
  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /**
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  /**
   * @param {number} seconds
   * @returns {string}
   */
  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(total / 60);
    const secs = String(total % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }

})();
