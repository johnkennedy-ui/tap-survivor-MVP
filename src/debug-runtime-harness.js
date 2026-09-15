export const DEBUG_RUNTIME_API_VERSION = 1;
export const DEBUG_RUNTIME_QUERY = "debugRuntime=1";
export const DEBUG_RUNTIME_GLOBAL_NAME = "TapSurvivorDebugRuntime";

/**
 * Builds the browser-facing debug command surface.  The returned object has no
 * browser side effects; the platform adapter calls bind() after the runtime is
 * composed.  This keeps the harness useful in node fixtures and keeps the
 * browser globalRef boundary in one place.
 *
 * @param {any} dependencies
 */
export function createDebugRuntimeHarness(
  {
    combat,
    contentRegistry,
    effects,
    getGame,
    pickupSystem,
    resetRun,
    runUpdater,
    setDebugSpecialEffects,
    spatial,
  } = /** @type {any} */ ({})
) {
  const registry = contentRegistry || {};
  const weaponDefs = registry.weaponDefs || {};
  const enemyTypes = Array.isArray(registry.enemyTypes) ? registry.enemyTypes : [];
  const bossAbilities = registry.bossAbilities || {};
  const bossIds = Array.isArray(registry.bossConfig?.abilityIds)
    ? registry.bossConfig.abilityIds
    : Object.keys(bossAbilities);
  const runUpgradeDefs = Array.isArray(registry.runUpgradeDefs) ? registry.runUpgradeDefs : [];
  const effectEntries = runUpgradeDefs.flatMap((upgrade) =>
    (upgrade.effects || []).map((effect, index) => ({
      id: `${upgrade.id}:${index}`,
      upgradeId: upgrade.id,
      effect,
    }))
  );

  const catalog = Object.freeze({
    protocol: "tap-survivor-debug-runtime",
    version: DEBUG_RUNTIME_API_VERSION,
    commands: Object.freeze([
      "catalog",
      "run.reset",
      "weapon.fire",
      "enemy.spawn",
      "boss.spawn",
      "runUpgrade.apply",
      "effect.apply",
      "pickup.collect",
      "physics.scenario",
      "frame.step",
      "snapshot",
    ]),
    // This is the authoritative mapping between descriptor arrays in this
    // catalog and their invocation command. Browser QA must never infer a
    // command from an array name, since future families may use a different
    // naming convention.
    families: Object.freeze([
      Object.freeze({ key: "weapons", command: "weapon.fire" }),
      Object.freeze({ key: "enemies", command: "enemy.spawn" }),
      Object.freeze({ key: "bosses", command: "boss.spawn" }),
      Object.freeze({ key: "runUpgrades", command: "runUpgrade.apply" }),
      Object.freeze({ key: "effects", command: "effect.apply" }),
      Object.freeze({ key: "pickups", command: "pickup.collect" }),
    ]),
    weapons: Object.freeze(
      Object.entries(weaponDefs).map(([id, weapon]) =>
        Object.freeze({ id, name: weapon.name, kind: weapon.kind })
      )
    ),
    enemies: Object.freeze(
      enemyTypes.map((enemy) =>
        Object.freeze({ id: enemy.id, name: enemy.name, minTowerFloor: enemy.minTowerFloor || 1 })
      )
    ),
    bosses: Object.freeze(
      bossIds.map((id) => Object.freeze({ id, name: bossAbilities[id]?.name || id }))
    ),
    runUpgrades: Object.freeze(
      runUpgradeDefs.map((upgrade) =>
        Object.freeze({
          id: upgrade.id,
          name: upgrade.name,
          maxTier: upgrade.maxTier,
        })
      )
    ),
    effects: Object.freeze(
      effectEntries.map(({ id, upgradeId, effect }) =>
        Object.freeze({ id, upgradeId, type: effect.type })
      )
    ),
    pickups: Object.freeze([
      Object.freeze({ id: "xp", kind: "experience" }),
      Object.freeze({ id: "coin", kind: "loot" }),
      Object.freeze({ id: "heart", kind: "loot" }),
    ]),
    physics: Object.freeze({
      scenarios: Object.freeze([
        "actor-player-enemy-crossing",
        "actor-enemy-enemy-crossing",
        "actor-wall-left",
        "actor-wall-right",
        "actor-wall-top",
        "actor-wall-bottom",
        "actor-highspeed",
        "actor-crowd-feasible",
        "actor-crowd-overfull",
        "climb-wall-face",
        "climb-wall-slide",
        "climb-wall-corner",
        "climb-wall-knockback",
        "climb-wall-touch-immunity",
        "climb-wall-spawn-clearance",
        "climb-wall-head-on-route",
        "climb-maze-pursuit",
        "projectile-explosive-hit",
        "mine-triggered",
        "target-area-triggered",
        "relic-kill-explosion",
        "boss-radial-blast",
        "protection-mitigation",
        "protection-invulnerability",
        "protection-dodge",
        "protection-teleport",
        "protection-death",
        "control-boss-slash",
        "control-lingering-area",
      ]),
    }),
  });

  function result(command, value) {
    return {
      ok: true,
      version: DEBUG_RUNTIME_API_VERSION,
      command,
      result: value,
    };
  }

  function failure(command, code, message) {
    return {
      ok: false,
      version: DEBUG_RUNTIME_API_VERSION,
      command,
      error: { code, message },
    };
  }

  function activeGame(command) {
    const game = getGame?.();
    if (!game?.running || !game.player) {
      return { game: null, error: failure(command, "INACTIVE_RUN", "An active run is required") };
    }
    return { game };
  }

  function argumentObject(command, args) {
    if (!args || typeof args !== "object" || Array.isArray(args)) {
      return failure(command, "MALFORMED_ARGS", "Arguments must be an object");
    }
    return null;
  }

  function idArgument(command, args) {
    const malformed = argumentObject(command, args);
    if (malformed) return { error: malformed };
    if (typeof args.id !== "string" || !args.id || Object.keys(args).some((key) => key !== "id")) {
      return {
        error: failure(command, "MALFORMED_ARGS", "Arguments must contain only a non-empty id"),
      };
    }
    return { id: args.id };
  }

  function resetArguments(command, args) {
    const malformed = argumentObject(command, args);
    if (malformed) return { error: malformed };
    const keys = Object.keys(args);
    if (keys.some((key) => key !== "towerFloor" && key !== "modeId")) {
      return {
        error: failure(command, "MALFORMED_ARGS", "run.reset accepts only towerFloor and modeId"),
      };
    }
    const towerFloor = args.towerFloor === undefined ? 1 : args.towerFloor;
    if (!Number.isInteger(towerFloor) || towerFloor < 1) {
      return { error: failure(command, "MALFORMED_ARGS", "towerFloor must be a positive integer") };
    }
    if (args.modeId !== undefined && typeof args.modeId !== "string") {
      return { error: failure(command, "MALFORMED_ARGS", "modeId must be a string") };
    }
    return { towerFloor, modeId: args.modeId };
  }

  function stepArguments(command, args) {
    const malformed = argumentObject(command, args);
    if (malformed) return { error: malformed };
    if (Object.keys(args).some((key) => key !== "frames" && key !== "dt"))
      return { error: failure(command, "MALFORMED_ARGS", "frame.step accepts only frames and dt") };
    const frames = args.frames === undefined ? 1 : args.frames;
    const dt = args.dt === undefined ? 1 / 60 : args.dt;
    if (
      !Number.isInteger(frames) ||
      frames < 1 ||
      frames > 120 ||
      !Number.isFinite(dt) ||
      dt <= 0 ||
      dt > 0.1
    )
      return {
        error: failure(command, "MALFORMED_ARGS", "frames and dt must be bounded finite values"),
      };
    return { frames, dt };
  }

  let stepRandom = null;
  let scenarioObservation = null;
  function numeric(value) {
    return Number.isFinite(value) ? value : null;
  }

  function snapshot(game) {
    const world = game.world || {};
    const width = numeric(world.width);
    const height = numeric(world.height);
    const playerInset =
      Number.isFinite(world.width) && Number.isFinite(world.height)
        ? Object.freeze({
            minX: numeric(Math.min(56, world.width / 2)),
            maxX: numeric(Math.max(world.width - 56, world.width / 2)),
            minY: numeric(Math.min(56, world.height / 2)),
            maxY: numeric(Math.max(world.height - 56, world.height / 2)),
          })
        : null;
    const actor = (entry, index) =>
      Object.freeze({
        id: String(entry?.id || `${entry?.type || "actor"}:${index}`),
        hp: numeric(entry?.hp),
        x: numeric(entry?.x),
        y: numeric(entry?.y),
        vx: numeric(entry?.vx),
        vy: numeric(entry?.vy),
        radius: numeric(entry?.radius),
        targetX: numeric(entry?.targetX),
        targetY: numeric(entry?.targetY),
        touchTimer: numeric(entry?.touchTimer),
        valid: [entry?.hp, entry?.x, entry?.y, entry?.radius].every(Number.isFinite),
      });
    const effect = (entry, index) =>
      Object.freeze({
        id: String(entry?.id || `${entry?.weaponId || entry?.type || "effect"}:${index}`),
        weaponId: entry?.weaponId || null,
        type: entry?.type || null,
        x: numeric(entry?.x),
        y: numeric(entry?.y),
        vx: numeric(entry?.vx),
        vy: numeric(entry?.vy),
        radius: numeric(entry?.radius),
        lifetime: numeric(entry?.life ?? entry?.timer),
        age: numeric(entry?.age),
        armDelay: numeric(entry?.armDelay),
        hit: Boolean(entry?.hit),
        exploded: Boolean(entry?.exploded),
        visualOnly: Boolean(entry?.visualOnly),
        valid: [entry?.x, entry?.y, entry?.radius].every(Number.isFinite),
      });
    return Object.freeze({
      running: Boolean(game.running),
      paused: Boolean(game.paused),
      world: Object.freeze({
        modeId: typeof world.modeId === "string" ? world.modeId : null,
        width,
        height,
        zoom: numeric(world.zoom),
        valid: Number.isFinite(world.width) && Number.isFinite(world.height),
      }),
      bounds: Object.freeze({ playerMovement: playerInset }),
      scenario: scenarioObservation,
      walls: Object.freeze(
        (spatial?.solidWalls?.(game) || []).map((wall) =>
          Object.freeze({
            id: wall.id,
            x: wall.x,
            y: wall.y,
            width: wall.width,
            height: wall.height,
            thickness: Math.min(wall.width, wall.height),
            mode: game.world?.modeId || null,
            floor: game.towerFloor || 1,
          })
        )
      ),
      player: actor(game.player, 0),
      playerTimers: Object.freeze({
        invincible: numeric(game.player?.invincibleTimer),
        hitInvincibilityTimer: numeric(game.player?.hitInvincibilityTimer),
        teleport: numeric(game.player?.teleportCooldown),
        blink: numeric(game.player?.blinkTimer),
      }),
      enemies: Object.freeze((game.enemies || []).map(actor)),
      projectiles: Object.freeze((game.bolts || []).map(effect)),
      enemyBolts: Object.freeze((game.enemyBolts || []).map(effect)),
      areas: Object.freeze((game.areas || []).map(effect)),
      bossAttacks: Object.freeze((game.bossAttacks || []).map(effect)),
    });
  }

  function setupPhysicsScenario(game, id) {
    if (!catalog.physics.scenarios.includes(id) || typeof combat?.spawnEnemies !== "function")
      return false;
    if (id === "actor-crowd-overfull") {
      game.world = Object.freeze({ ...(game.world || {}), width: 64, height: 64 });
    }
    const bounds = game.world || { width: 960, height: 540 };
    const cx = bounds.width / 2;
    const cy = bounds.height / 2;
    const p = game.player;
    const climbWallScenario = id.startsWith("climb-wall-");
    game.awaitingFirstMoveInput = false;
    game.paused = true;
    game.spawnTimer = 1e9;
    game.weaponTimers = {};
    game.activeFloor = { enemyIds: [enemyTypes[0]?.id], spawnCount: 1 };
    p.x = p.targetX = cx;
    p.y = p.targetY = cy;
    p.vx = p.vy = 0;
    p.equippedWeapons = [];
    scenarioObservation = Object.freeze({ id, parameters: Object.freeze({}) });
    const observe = (parameters) => {
      scenarioObservation = Object.freeze({ id, parameters: Object.freeze(parameters) });
      return true;
    };
    const spawn = (placements) => {
      if (!enemyTypes[0]) return [];
      const start = game.enemies.length;
      for (let index = 0; index < placements.length; index += 1) {
        game.spawnTimer = 0;
        combat.spawnEnemies(0);
      }
      game.spawnTimer = 1e9;
      return game.enemies.slice(start).map((entry, index) => {
        const placement = placements[index];
        entry.id = `debug:${id}:enemy:${index}`;
        entry.x = placement[0];
        entry.y = placement[1];
        entry.targetX = entry.x;
        entry.targetY = entry.y;
        entry.vx = entry.vy = 0;
        entry.hp = placement[2] ?? entry.hp;
        entry.maxHp = Math.max(entry.maxHp || 0, entry.hp);
        entry.speed = placement[3] ?? 0;
        entry.damage = placement[4] ?? entry.damage;
        entry.touchTimer = 999;
        return entry;
      });
    };
    const queueWeapon = (weaponId) => {
      p.equippedWeapons = [weaponId];
      game.weaponTimers[weaponId] = 0;
    };
    const fireWeaponOnce = (weaponId) => {
      if (typeof combat?.updateWeapons !== "function") return false;
      queueWeapon(weaponId);
      combat.updateWeapons(0);
      p.equippedWeapons = [];
      game.weaponTimers = {};
      return game.areas.filter((area) => area?.weaponId === weaponId).length === 1;
    };
    const applyUpgrade = (upgradeId) => {
      const upgrade = runUpgradeDefs.find((entry) => entry.id === upgradeId);
      if (!upgrade) return false;
      const tier = Number(game.runUpgradeTiers?.[upgradeId] || 0);
      if (tier >= upgrade.maxTier) return false;
      game.runUpgradeTiers ||= {};
      upgrade.apply?.(game);
      game.runUpgradeTiers[upgradeId] = tier + 1;
      return true;
    };
    const addBlast = (type, x, y, damage = 20) =>
      game.bossAttacks.push({
        id: `debug:${id}:attack`,
        type,
        x,
        y,
        radius: 90,
        age: 0,
        windup: 0.01,
        damage,
        hit: false,
      });
    // Physics fixtures select their protection profile explicitly rather than
    // inheriting incidental dodge/healing effects from the current relic state.
    // This override is transient, query-gated, and cleared by resetDebugRun.
    const neutralEffects = {
      dodgeChance: 0,
      damageReduction: 0,
      teleportOnHitCooldown: 0,
      blinkInvulnerabilitySeconds: 0,
      thornDamage: 0,
      lifestealOnKill: 0,
      killExplosionDamage: 0,
      killExplosionRadius: 0,
    };
    const setEffects = (effects, random = null) => {
      if (typeof setDebugSpecialEffects !== "function") return false;
      setDebugSpecialEffects({ ...neutralEffects, ...effects });
      stepRandom = random;
      return true;
    };
    if (typeof setDebugSpecialEffects === "function") setEffects({});
    if (id === "climb-maze-pursuit") {
      const walls = spatial?.solidWalls?.(game) || [];
      const radius = Math.max(p.radius, enemyTypes[0]?.radius || 0) + 12;
      const open = (point) =>
        walls.every(
          (wall) =>
            Math.hypot(
              point.x - Math.max(wall.x, Math.min(wall.x + wall.width, point.x)),
              point.y - Math.max(wall.y, Math.min(wall.y + wall.height, point.y))
            ) >= radius
        );
      const crosses = (start, end, wall) => {
        let first = 0,
          last = 1;
        for (const [origin, delta, min, max] of [
          [start.x, end.x - start.x, wall.x, wall.x + wall.width],
          [start.y, end.y - start.y, wall.y, wall.y + wall.height],
        ]) {
          if (Math.abs(delta) < 1e-8) {
            if (origin < min || origin > max) return false;
          } else {
            const near = (min - origin) / delta,
              far = (max - origin) / delta;
            first = Math.max(first, Math.min(near, far));
            last = Math.min(last, Math.max(near, far));
            if (first > last) return false;
          }
        }
        return first <= last && last > 0 && first < 1;
      };
      const points = [];
      for (let column = 1; column <= 9; column += 1)
        for (let row = 1; row <= 9; row += 1) {
          const point = { x: (bounds.width * column) / 10, y: (bounds.height * row) / 10 };
          if (open(point)) points.push(point);
        }
      let chosen = null;
      for (const start of points)
        for (const target of points) {
          const blocked = walls.filter((wall) => crosses(start, target, wall));
          const score =
            blocked.length * (bounds.width + bounds.height) +
            Math.hypot(start.x - target.x, start.y - target.y);
          if (blocked.length >= 2 && (!chosen || score > chosen.score))
            chosen = { start, target, blocked, score };
        }
      if (!chosen) return false;
      p.x = p.targetX = chosen.target.x;
      p.y = p.targetY = chosen.target.y;
      const [enemy] = spawn([[chosen.start.x, chosen.start.y, 1000, 360]]);
      if (!enemy) return false;
      return observe({
        kind: "real-enemy-multi-wall-pursuit",
        initialPlayer: Object.freeze({
          id: String(p.id || "actor:0"),
          x: p.x,
          y: p.y,
          radius: p.radius,
        }),
        initialEnemy: Object.freeze({ id: enemy.id, x: enemy.x, y: enemy.y, radius: enemy.radius }),
        blockedWallIds: Object.freeze(chosen.blocked.map((wall) => wall.id)),
        frames: 1000,
        dt: 0.05,
      });
    }
    if (climbWallScenario) {
      const wall = spatial?.solidWalls?.(game)?.[0];
      if (!wall) return false;
      const radius = p.radius;
      p.x = p.targetX = wall.x - radius - 80;
      p.y = p.targetY = wall.y + wall.height / 2;
      const spawnWallWitness = () => {
        spawn([[wall.x - radius - 140, wall.y + wall.height / 2, undefined, 0]]);
      };
      if (id === "climb-wall-face") {
        spawnWallWitness();
        p.targetX = wall.x + wall.width + radius + 120;
        p.speed = 1800;
        return observe({ kind: "face", wallId: wall.id, before: { x: p.x, y: p.y, radius } });
      }
      if (id === "climb-wall-slide") {
        spawnWallWitness();
        p.y = p.targetY = wall.y + 4;
        p.targetX = wall.x + 80;
        p.targetY = wall.y + wall.height + radius + 120;
        p.speed = 1800;
        return observe({ kind: "slide", wallId: wall.id, before: { x: p.x, y: p.y, radius } });
      }
      if (id === "climb-wall-corner") {
        spawnWallWitness();
        p.y = p.targetY = wall.y - radius - 50;
        p.targetX = wall.x + 60;
        p.targetY = wall.y + 60;
        p.speed = 1800;
        return observe({ kind: "corner", wallId: wall.id, before: { x: p.x, y: p.y, radius } });
      }
      if (id === "climb-wall-knockback") {
        const wallClearance = 4;
        p.x = p.targetX = wall.x - radius - wallClearance;
        const [enemy, farWitness] = spawn([
          [p.x, p.y + radius + 18, 100, 0],
          [p.x - 200, p.y, 100, 0],
        ]);
        if (!enemy) return false;
        const blastCenter = Object.freeze({ x: p.x - 70, y: p.y });
        addBlast("shockwave", blastCenter.x, blastCenter.y, 20);
        return observe({
          kind: "owner-fired-wall-limited-knockback",
          wallId: wall.id,
          wallClearance,
          blastCenter,
          prearmed: { frames: 1, dt: 0.005 },
          impact: { frames: 1, dt: 0.01 },
          expired: { frames: 5, dt: 0.1 },
          before: {
            player: { x: p.x, y: p.y, radius },
            enemy: { x: enemy.x, y: enemy.y, radius: enemy.radius },
            farWitness: {
              id: farWitness?.id,
              x: farWitness?.x,
              y: farWitness?.y,
              hp: farWitness?.hp,
            },
          },
        });
      }
      if (id === "climb-wall-touch-immunity") {
        p.x = p.targetX = wall.x - radius - 80;
        const [enemy] = spawn([[p.x - 100, p.y, 100, 260]]);
        if (!enemy) return false;
        enemy.x = p.x - p.radius - enemy.radius - 1;
        enemy.touchTimer = 0;
        enemy.touchCooldown = 0;
        return observe({
          kind: "real-rapid-recurring-contact",
          wallId: wall.id,
          rapidTouchCooldown: enemy.touchCooldown,
          firstHit: { frames: 1, dt: 0.01 },
          immuneWindow: { frames: 48, dt: 0.01 },
          postExpiry: { frames: 3, dt: 0.01 },
          before: {
            player: { x: p.x, y: p.y, radius },
            enemy: { x: enemy.x, y: enemy.y, radius: enemy.radius },
          },
        });
      }
      if (id === "climb-wall-spawn-clearance") {
        spawn([[wall.x + wall.width / 2, wall.y + wall.height / 2, undefined, 0]]);
        return observe({
          kind: "spawn-clearance",
          wallId: wall.id,
          before: { x: p.x, y: p.y, radius },
        });
      }
      if (id === "climb-wall-head-on-route") {
        p.x = p.targetX = wall.x + wall.width + radius + 80;
        p.y = p.targetY = wall.y + wall.height / 2;
        spawn([[wall.x - radius - 90, p.y, undefined, 240]]);
        return observe({
          kind: "head-on-route",
          wallId: wall.id,
          before: { x: p.x, y: p.y, radius },
        });
      }
    }
    if (id === "actor-player-enemy-crossing") {
      p.x = cx - 70;
      p.targetX = cx + 130;
      p.speed = 900;
      spawn([[cx, cy, undefined, 0]]);
      return observe({ frames: 1, dt: 0.1, initialGap: 70, kind: "separated-moving-contact" });
    }
    if (id === "actor-enemy-enemy-crossing") {
      p.y = p.targetY = cy - 200;
      p.speed = 0;
      spawn([
        [cx - 80, cy, undefined, 3000],
        [cx + 80, cy, undefined, 3000],
      ]);
      return observe({ frames: 1, dt: 0.1, initialGap: 160, kind: "separated-moving-crossing" });
    }
    const walls = {
      "actor-wall-left": [p.radius - 2, cy],
      "actor-wall-right": [bounds.width - p.radius + 2, cy],
      "actor-wall-top": [cx, p.radius - 2],
      "actor-wall-bottom": [cx, bounds.height - p.radius + 2],
    };
    if (Object.hasOwn(walls, id)) {
      [p.x, p.y] = walls[id];
      p.targetX = p.x;
      p.targetY = p.y;
      spawn([[p.x, p.y]]);
      return true;
    }
    if (id === "actor-highspeed") {
      p.x = cx - 120;
      p.targetX = cx + 220;
      p.speed = 2000;
      spawn([[cx, cy, undefined, 0]]);
      return observe({
        frames: 1,
        dt: 0.1,
        initialGap: 120,
        attemptedTravel: 200,
        kind: "swept-crossing",
      });
    }
    if (id === "actor-crowd-feasible") {
      spawn(
        Array.from({ length: 12 }, (_, i) => [
          cx - 44 + (i % 4) * 28,
          cy - 28 + Math.floor(i / 4) * 28,
        ])
      );
      return true;
    }
    if (id === "actor-crowd-overfull") {
      const enemyCount = 18;
      const enemyRadius = 13;
      const playerRadius = p.radius;
      spawn(Array.from({ length: enemyCount }, () => [cx, cy]));
      return observe({
        frames: 2,
        dt: 0.1,
        kind: "geometrically-impossible-crowd",
        actorCount: enemyCount + 1,
        arenaArea: bounds.width * bounds.height,
        minimumDiscArea:
          Math.PI * (playerRadius * playerRadius + enemyCount * enemyRadius * enemyRadius),
      });
    }
    if (id === "projectile-explosive-hit") {
      spawn([
        [cx + 22, cy, 100],
        [cx + 52, cy, 100],
      ]);
      if (!applyUpgrade("run_explosive_hit")) return false;
      queueWeapon("spark_bolt");
      return true;
    }
    if (id === "mine-triggered") {
      p.facingX = 1;
      p.facingY = 0;
      if (!fireWeaponOnce("void_mine")) return false;
      p.x = p.targetX = cx + 140;
      spawn([
        [cx - 62, cy, 100, 0],
        [cx + 180, cy, 100, 0],
      ]);
      return observe({
        arm: Object.freeze({ frames: 19, dt: 0.1 }),
        explode: Object.freeze({ frames: 1, dt: 0.1 }),
        expire: Object.freeze({ frames: 4, dt: 0.1 }),
        kind: "single-owner-fired-mine",
      });
    }
    if (id === "target-area-triggered") {
      spawn([
        [cx + 64, cy, 100, 0],
        [cx + 100, cy, 100, 0],
        [cx + 180, cy, 100, 0],
      ]);
      queueWeapon("meteor_pin");
      return observe({ frames: 1, dt: 1 / 60, radius: 72, kind: "target-area-in-out-radius" });
    }
    if (id === "relic-kill-explosion") {
      if (!setEffects({ killExplosionDamage: 70, killExplosionRadius: 90 })) return false;
      spawn([
        [cx + 40, cy, 1],
        [cx + 140, cy, 100],
      ]);
      queueWeapon("meteor_pin");
      return true;
    }
    if (id === "boss-radial-blast") {
      spawn([
        [cx + 38, cy, 100],
        [cx - 38, cy, 100],
      ]);
      addBlast("shockwave", cx, cy);
      return true;
    }
    if (id === "protection-mitigation") {
      if (!setEffects({ damageReduction: 0.5 })) return false;
      // Keep the required real actor alive through the blast.  A default-health
      // witness can drop and immediately collect a heart on the second frame,
      // masking the mitigation damage with random fixture-owned healing.
      spawn([[cx + 20, cy, 100]]);
      addBlast("shockwave", cx, cy);
      return true;
    }
    if (id === "protection-invulnerability") {
      p.invincibleTimer = 1;
      spawn([[cx + 20, cy]]);
      addBlast("shockwave", cx, cy);
      return true;
    }
    if (id === "protection-dodge") {
      if (!setEffects({ dodgeChance: 0.95 }, 0)) return false;
      spawn([[cx + 20, cy]]);
      addBlast("shockwave", cx, cy);
      return true;
    }
    if (id === "protection-teleport") {
      if (!setEffects({ teleportOnHitCooldown: 3.5, teleportDistance: 140 }, 0)) return false;
      spawn([[cx + 20, cy]]);
      addBlast("shockwave", cx, cy);
      return true;
    }
    if (id === "protection-death") {
      p.hp = 5;
      spawn([[cx + 20, cy]]);
      addBlast("shockwave", cx, cy, 20);
      return true;
    }
    if (id === "control-boss-slash") {
      spawn([[cx + 20, cy]]);
      game.bossAttacks.push({
        id: `debug:${id}:attack`,
        type: "boss_slash",
        x: cx - 30,
        y: cy,
        radius: 90,
        age: 0,
        windup: 0.01,
        damage: 20,
        dirX: 1,
        dirY: 0,
        arc: Math.PI,
        hit: false,
      });
      return true;
    }
    if (id === "control-lingering-area") {
      spawn([[cx + 50, cy, 100]]);
      queueWeapon("acid_pool");
      return true;
    }
    return false;
  }

  function invoke(command, args = {}) {
    if (command === "catalog") {
      if (
        args !== undefined &&
        (typeof args !== "object" || Array.isArray(args) || Object.keys(args).length)
      ) {
        return failure(command, "MALFORMED_ARGS", "catalog accepts no arguments");
      }
      return result(command, catalog);
    }
    if (typeof command !== "string") {
      return failure(command, "UNKNOWN_COMMAND", "Unknown debug command");
    }

    if (command === "run.reset") {
      const parsedReset = resetArguments(command, args);
      if (parsedReset.error) return parsedReset.error;
      if (typeof resetRun !== "function") {
        return failure(command, "OWNER_UNAVAILABLE", "Run-state owner is unavailable");
      }
      const game = resetRun(parsedReset);
      if (!game?.running || !game.player) {
        return failure(command, "OWNER_REJECTED", "Run-state owner did not create an active run");
      }
      return result(command, { modeId: game.modeId, towerFloor: game.towerFloor });
    }

    if (command === "snapshot") {
      if (!args || typeof args !== "object" || Array.isArray(args) || Object.keys(args).length)
        return failure(command, "MALFORMED_ARGS", "snapshot accepts no arguments");
      const active = activeGame(command);
      if (active.error) return active.error;
      return result(command, snapshot(active.game));
    }
    if (command === "frame.step") {
      const parsedStep = stepArguments(command, args);
      if (parsedStep.error) return parsedStep.error;
      const active = activeGame(command);
      if (active.error) return active.error;
      if (typeof runUpdater?.update !== "function")
        return failure(command, "OWNER_UNAVAILABLE", "Run updater is unavailable");
      const wasPaused = active.game.paused;
      active.game.paused = false;
      const originalRandom = Math.random;
      if (Number.isFinite(stepRandom)) Math.random = () => stepRandom;
      try {
        for (let index = 0; index < parsedStep.frames; index += 1) runUpdater.update(parsedStep.dt);
      } finally {
        Math.random = originalRandom;
        stepRandom = null;
        active.game.paused = wasPaused;
      }
      return result(command, snapshot(active.game));
    }
    if (command === "physics.scenario") {
      const parsedScenario = idArgument(command, args);
      if (parsedScenario.error) return parsedScenario.error;
      if (!catalog.physics.scenarios.includes(parsedScenario.id))
        return failure(command, "UNKNOWN_ID", `Unknown physics scenario: ${parsedScenario.id}`);
      if (typeof resetRun !== "function")
        return failure(command, "OWNER_UNAVAILABLE", "Run-state owner is unavailable");
      const game = resetRun({
        towerFloor: 1,
        modeId: parsedScenario.id.startsWith("climb-") ? "climb" : undefined,
      });
      if (!game?.running || !game.player || !setupPhysicsScenario(game, parsedScenario.id))
        return failure(command, "OWNER_REJECTED", "Scenario owner did not create a valid run");
      return result(command, snapshot(game));
    }

    const parsed = idArgument(command, args);
    if (parsed.error) return parsed.error;
    const { id } = parsed;

    if (command === "weapon.fire") {
      if (!Object.prototype.hasOwnProperty.call(weaponDefs, id)) {
        return failure(command, "UNKNOWN_ID", `Unknown weapon id: ${id}`);
      }
    } else if (command === "enemy.spawn") {
      if (!enemyTypes.some((enemy) => enemy.id === id)) {
        return failure(command, "UNKNOWN_ID", `Unknown enemy id: ${id}`);
      }
    } else if (command === "boss.spawn") {
      if (!Object.prototype.hasOwnProperty.call(bossAbilities, id)) {
        return failure(command, "UNKNOWN_ID", `Unknown boss id: ${id}`);
      }
    } else if (command === "runUpgrade.apply") {
      if (!runUpgradeDefs.some((upgrade) => upgrade.id === id)) {
        return failure(command, "UNKNOWN_ID", `Unknown run upgrade id: ${id}`);
      }
    } else if (command === "effect.apply") {
      if (!effectEntries.some((entry) => entry.id === id)) {
        return failure(command, "UNKNOWN_ID", `Unknown effect id: ${id}`);
      }
    } else if (command === "pickup.collect") {
      if (!["xp", "coin", "heart"].includes(id)) {
        return failure(command, "UNKNOWN_ID", `Unknown pickup id: ${id}`);
      }
    } else {
      return failure(command, "UNKNOWN_COMMAND", `Unknown debug command: ${command}`);
    }

    const active = activeGame(command);
    if (active.error) return active.error;
    const game = active.game;

    if (command === "weapon.fire") {
      const equipped = game.player.equippedWeapons;
      if (!Array.isArray(equipped))
        return failure(command, "INVALID_STATE", "Run weapon state is invalid");
      if (typeof combat?.updateWeapons !== "function")
        return failure(command, "OWNER_UNAVAILABLE", "Weapon owner is unavailable");
      const wasEquipped = equipped.includes(id);
      const previousTimers = game.weaponTimers || {};
      const hadTimer = Object.prototype.hasOwnProperty.call(previousTimers, id);
      const previousTimer = previousTimers[id];
      if (!wasEquipped) equipped.push(id);
      previousTimers[id] = 0;
      combat?.updateWeapons?.(0);
      if (!wasEquipped) equipped.splice(equipped.indexOf(id), 1);
      if (hadTimer) previousTimers[id] = previousTimer;
      else delete previousTimers[id];
      return result(command, { id, kind: weaponDefs[id].kind });
    }

    if (command === "enemy.spawn") {
      const previousFloor = game.activeFloor;
      const hadFloor = Object.prototype.hasOwnProperty.call(game, "activeFloor");
      const previousTimer = game.spawnTimer;
      const enemy = enemyTypes.find((entry) => entry.id === id);
      if (typeof combat?.spawnEnemies !== "function")
        return failure(command, "OWNER_UNAVAILABLE", "Enemy owner is unavailable");
      if (Number.isFinite(enemy.minTowerFloor) && game.towerFloor < enemy.minTowerFloor) {
        return failure(
          command,
          "UNAVAILABLE_ID",
          `Enemy is unavailable on tower floor ${game.towerFloor}`
        );
      }
      game.activeFloor = { ...(previousFloor || {}), enemyIds: [id], spawnCount: 1 };
      game.spawnTimer = 0;
      combat?.spawnEnemies?.(0);
      game.spawnTimer = previousTimer;
      if (hadFloor) game.activeFloor = previousFloor;
      else delete game.activeFloor;
      return result(command, { id, count: 1 });
    }

    if (command === "boss.spawn") {
      if (typeof combat?.spawnBoss !== "function")
        return failure(command, "OWNER_UNAVAILABLE", "Boss owner is unavailable");
      if (game.bossSpawned)
        return failure(command, "ALREADY_SPAWNED", "The run already has a spawned boss");
      const previousRandom = Math.random;
      const bossIndex = bossIds.indexOf(id);
      try {
        Math.random = () => (bossIndex < 0 ? 0 : (bossIndex + 0.01) / Math.max(1, bossIds.length));
        combat?.spawnBoss?.();
      } finally {
        Math.random = previousRandom;
      }
      const boss = game.enemies?.find((enemy) => enemy.boss);
      if (!boss || !boss.bossAbilities?.includes(id)) {
        return failure(command, "OWNER_REJECTED", `Boss owner did not select ability: ${id}`);
      }
      return result(command, { id, abilities: [...boss.bossAbilities] });
    }

    if (command === "runUpgrade.apply") {
      const upgrade = runUpgradeDefs.find((entry) => entry.id === id);
      const currentTier = Number(game.runUpgradeTiers?.[id] || 0);
      if (currentTier >= upgrade.maxTier)
        return failure(command, "MAX_TIER", `Upgrade is already at max tier: ${id}`);
      if (
        upgrade.exclusiveGroup &&
        runUpgradeDefs.some(
          (other) =>
            other.id !== id &&
            other.exclusiveGroup === upgrade.exclusiveGroup &&
            Number(game.runUpgradeTiers?.[other.id] || 0) > 0
        )
      )
        return failure(
          command,
          "EXCLUSIVE_GROUP",
          `Upgrade conflicts with an active upgrade: ${id}`
        );
      game.runUpgradeTiers ||= {};
      upgrade.apply?.(game);
      game.runUpgradeTiers[id] = currentTier + 1;
      return result(command, { id, tier: currentTier + 1 });
    }

    if (command === "effect.apply") {
      const entry = effectEntries.find((candidate) => candidate.id === id);
      if (typeof effects?.applyRunUpgradeEffects !== "function")
        return failure(command, "OWNER_UNAVAILABLE", "Effect owner is unavailable");
      effects?.applyRunUpgradeEffects?.(game, [entry.effect]);
      return result(command, { id, type: entry.effect.type });
    }

    const player = game.player;
    if (
      typeof pickupSystem?.updateXpDrops !== "function" ||
      typeof pickupSystem?.updateLootDrops !== "function"
    )
      return failure(command, "OWNER_UNAVAILABLE", "Pickup owner is unavailable");
    if (id === "xp") {
      game.xpDrops ||= [];
      game.xpDrops.push({ x: player.x, y: player.y, radius: player.radius || 7, value: 1 });
      pickupSystem?.updateXpDrops?.(0);
      return result(command, { id, collected: true });
    }
    game.lootDrops ||= [];
    if (typeof pickupSystem.spawnLootDrops === "function") {
      const before = game.lootDrops.length;
      pickupSystem.spawnLootDrops({ boss: true, x: player.x, y: player.y });
      game.lootDrops = game.lootDrops.filter((drop, index) => index < before || drop.type === id);
    } else {
      game.lootDrops.push({
        type: id,
        x: player.x,
        y: player.y,
        radius: player.radius || 7,
        ...(id === "coin" ? { value: 1 } : { healPercent: 0.2 }),
      });
    }
    pickupSystem?.updateLootDrops?.(0);
    return result(command, { id, collected: true });
  }

  function bind(globalRef) {
    if (!hasExactOptIn(globalRef)) return false;
    const api = {
      protocol: catalog.protocol,
      version: DEBUG_RUNTIME_API_VERSION,
      catalog: () => result("catalog", catalog),
      invoke,
      execute: invoke,
    };
    Object.defineProperty(globalRef, DEBUG_RUNTIME_GLOBAL_NAME, {
      configurable: true,
      enumerable: false,
      value: Object.freeze(api),
      writable: false,
    });
    return true;
  }

  return { bind, catalog, invoke, execute: invoke };
}

export function hasExactOptIn(globalRef) {
  const search = globalRef?.location?.search;
  if (typeof search !== "string") return false;
  const query = search.startsWith("?") ? search.slice(1) : search;
  return query.split("&").some((entry) => entry === DEBUG_RUNTIME_QUERY);
}
