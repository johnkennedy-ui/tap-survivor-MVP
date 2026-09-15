import { DEFAULT_RUN_MODE, normalizeRunMode } from "./run-mode.js";

export function createRunStateSystem({
  canvas,
  spatial,
  mapSystem,
  getSave,
  getShopBonuses,
  getUpgradeTier,
  maxEquippedWeapons,
  weaponDefs = {},
}) {
  function createPlayer(world) {
    const shopBonuses = getShopBonuses();
    const maxHp = 100 + shopBonuses.maxHp;
    return {
      x: world.width / 2,
      y: world.height / 2,
      targetX: world.width / 2,
      targetY: world.height / 2,
      facingX: 0,
      facingY: 1,
      moving: false,
      animTime: 0,
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

  /**
   * @param {{ modeId?: unknown, world?: { width?: number, height?: number, zoom?: number } }} [options]
   */
  function resetGameState({ modeId = DEFAULT_RUN_MODE, world } = {}) {
    const runMode = normalizeRunMode(modeId);
    const bounds = spatial?.createRunWorld({ modeId: runMode, world }) || Object.freeze({
      modeId: runMode,
      width: Number.isFinite(world?.width) && world.width > 0 ? world.width : canvas.width,
      height: Number.isFinite(world?.height) && world.height > 0 ? world.height : canvas.height,
      zoom: 1,
    });
    const run = {
      modeId: runMode,
      world: bounds,
      running: true,
      paused: false,
      pauseReason: "",
      elapsed: 0,
      duration: 150,
      towerFloor: getSave().towerFloor || 1,
      bossSpawned: false,
      bossDefeated: false,
      player: createPlayer(bounds),
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
