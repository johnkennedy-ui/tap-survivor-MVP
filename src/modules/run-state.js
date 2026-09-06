export function createRunStateSystem({
  canvas,
  mapSystem,
  getSave,
  getShopBonuses,
  getUpgradeTier,
  maxEquippedWeapons,
  weaponDefs = {},
}) {
  function createPlayer() {
    const shopBonuses = getShopBonuses();
    const maxHp = 100 + shopBonuses.maxHp;
    return {
      x: canvas.width / 2,
      y: canvas.height / 2,
      targetX: canvas.width / 2,
      targetY: canvas.height / 2,
      radius: 16,
      speed: 185 + shopBonuses.speed,
      hp: maxHp,
      maxHp,
      pickupRadius: 54 + shopBonuses.pickupRadius,
      projectileBlockCharge: 0,
      projectileBlockNeeded: 5,
      projectileBlockReady: false,
      xp: 0,
      level: 1,
      xpToLevel: 5,
      maxWeapons: maxEquippedWeapons(),
      equippedWeapons: [startingWeaponId()],
    };
  }

  function startingWeaponId() {
    const save = getSave();
    const selected = save?.selectedStartingWeapon;
    if (
      typeof selected === "string" &&
      weaponDefs[selected] &&
      (save.unlockedWeapons || []).includes(selected)
    ) {
      return selected;
    }
    return "spark_bolt";
  }

  function resetGameState() {
    const run = {
      running: true,
      paused: false,
      pauseReason: "",
      elapsed: 0,
      duration: 150,
      towerFloor: getSave().towerFloor || 1,
      bossSpawned: false,
      bossDefeated: false,
      player: createPlayer(),
      enemies: [],
      xpDrops: [],
      lootDrops: [],
      pickupTexts: [],
      bolts: [],
      enemyBolts: [],
      beams: [],
      areas: [],
      weaponBursts: [],
      weaponIconFlashes: {},
      bossAttacks: [],
      bossSpawnNotice: null,
      weaponTimers: {},
      runUpgradeTiers: {},
      // Tracks only tiers selected through this run's level-up flow; it is never saved.
      levelUpRunUpgradeTiers: {},
      spawnTimer: 0,
      bossAttackTimer: 3.8,
      bossAttackCooldownMax: 3.8,
      kills: 0,
      xpCollected: 0,
      laserDamage: 0,
      weaponDamage: {},
      levelUps: 0,
      endReason: "",
    };
    mapSystem?.applyToGame?.(run);
    return run;
  }

  function applyRunMetaUpgrades(game) {
    // Retained as a no-op compatibility seam after permanent upgrades moved in-run.
    void game;
  }

  return {
    resetGameState,
    applyRunMetaUpgrades,
  };
}
