(() => {
  function createRunStateSystem({ canvas, getSave, getShopBonuses, getUpgradeTier, maxEquippedWeapons }) {
    function createPlayer() {
      const moveTier = getUpgradeTier("move_speed");
      const pickupTier = getUpgradeTier("pickup_radius");
      const hpTier = getUpgradeTier("max_hp");
      const shopBonuses = getShopBonuses();
      const maxHp = 100 + hpTier * 20 + shopBonuses.maxHp;
      return {
        x: canvas.width / 2,
        y: canvas.height / 2,
        targetX: canvas.width / 2,
        targetY: canvas.height / 2,
        radius: 16,
        speed: 185 + moveTier * 24 + shopBonuses.speed,
        hp: maxHp,
        maxHp,
        pickupRadius: 54 + pickupTier * 18 + shopBonuses.pickupRadius,
        xp: 0,
        level: 1,
        xpToLevel: 5,
        maxWeapons: maxEquippedWeapons(),
        equippedWeapons: ["spark_bolt"],
      };
    }

    function resetGameState() {
      return {
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
        bolts: [],
        beams: [],
        areas: [],
        weaponBursts: [],
        bossAttacks: [],
        weaponTimers: {},
        runUpgradeTiers: {},
        spawnTimer: 0,
        bossAttackTimer: 3.8,
        kills: 0,
        xpCollected: 0,
        laserDamage: 0,
        weaponDamage: {},
        levelUps: 0,
        endReason: "",
      };
    }

    function applyRunMetaUpgrades(game) {
      if (!game?.player) return;
      const p = game.player;
      p.speed = Math.max(p.speed, 185 + getUpgradeTier("move_speed") * 24);
      p.pickupRadius = Math.max(p.pickupRadius, 54 + getUpgradeTier("pickup_radius") * 18);
      const newMaxHp = 100 + getUpgradeTier("max_hp") * 20;
      if (newMaxHp > p.maxHp) {
        p.hp += newMaxHp - p.maxHp;
        p.maxHp = newMaxHp;
      }
    }

    return {
      resetGameState,
      applyRunMetaUpgrades,
    };
  }

  globalThis.TapSurvivorRunState = {
    createRunStateSystem,
  };
})();
