(() => {
  function rotateVector(vx, vy, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [vx * cos - vy * sin, vx * sin + vy * cos];
  }

  globalThis.TapSurvivorWeaponProjectiles = {
    rotateVector,
  };
})();
