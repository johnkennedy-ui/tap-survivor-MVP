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
export function createDebugRuntimeHarness({
  combat,
  contentRegistry,
  effects,
  getGame,
  pickupSystem,
  resetRun,
} = /** @type {any} */ ({})) {
  const registry = contentRegistry || {};
  const weaponDefs = registry.weaponDefs || {};
  const enemyTypes = Array.isArray(registry.enemyTypes) ? registry.enemyTypes : [];
  const bossAbilities = registry.bossAbilities || {};
  const bossIds = Array.isArray(registry.bossConfig?.abilityIds)
    ? registry.bossConfig.abilityIds
    : Object.keys(bossAbilities);
  const runUpgradeDefs = Array.isArray(registry.runUpgradeDefs)
    ? registry.runUpgradeDefs
    : [];
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
      return { error: failure(command, "MALFORMED_ARGS", "Arguments must contain only a non-empty id") };
    }
    return { id: args.id };
  }

  function resetArguments(command, args) {
    const malformed = argumentObject(command, args);
    if (malformed) return { error: malformed };
    const keys = Object.keys(args);
    if (keys.some((key) => key !== "towerFloor")) {
      return { error: failure(command, "MALFORMED_ARGS", "run.reset accepts only towerFloor") };
    }
    if (args.towerFloor === undefined) return { towerFloor: 1 };
    if (!Number.isInteger(args.towerFloor) || args.towerFloor < 1) {
      return { error: failure(command, "MALFORMED_ARGS", "towerFloor must be a positive integer") };
    }
    return { towerFloor: args.towerFloor };
  }

  function invoke(command, args = {}) {
    if (command === "catalog") {
      if (args !== undefined && (typeof args !== "object" || Array.isArray(args) || Object.keys(args).length)) {
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
      return result(command, { towerFloor: game.towerFloor });
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
      if (!Array.isArray(equipped)) return failure(command, "INVALID_STATE", "Run weapon state is invalid");
      if (typeof combat?.updateWeapons !== "function") return failure(command, "OWNER_UNAVAILABLE", "Weapon owner is unavailable");
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
      if (typeof combat?.spawnEnemies !== "function") return failure(command, "OWNER_UNAVAILABLE", "Enemy owner is unavailable");
      if (Number.isFinite(enemy.minTowerFloor) && game.towerFloor < enemy.minTowerFloor) {
        return failure(command, "UNAVAILABLE_ID", `Enemy is unavailable on tower floor ${game.towerFloor}`);
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
      if (typeof combat?.spawnBoss !== "function") return failure(command, "OWNER_UNAVAILABLE", "Boss owner is unavailable");
      if (game.bossSpawned) return failure(command, "ALREADY_SPAWNED", "The run already has a spawned boss");
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
      if (currentTier >= upgrade.maxTier) return failure(command, "MAX_TIER", `Upgrade is already at max tier: ${id}`);
      if (upgrade.exclusiveGroup && runUpgradeDefs.some((other) =>
        other.id !== id && other.exclusiveGroup === upgrade.exclusiveGroup && Number(game.runUpgradeTiers?.[other.id] || 0) > 0
      )) return failure(command, "EXCLUSIVE_GROUP", `Upgrade conflicts with an active upgrade: ${id}`);
      game.runUpgradeTiers ||= {};
      upgrade.apply?.(game);
      game.runUpgradeTiers[id] = currentTier + 1;
      return result(command, { id, tier: currentTier + 1 });
    }

    if (command === "effect.apply") {
      const entry = effectEntries.find((candidate) => candidate.id === id);
      if (typeof effects?.applyRunUpgradeEffects !== "function") return failure(command, "OWNER_UNAVAILABLE", "Effect owner is unavailable");
      effects?.applyRunUpgradeEffects?.(game, [entry.effect]);
      return result(command, { id, type: entry.effect.type });
    }

    const player = game.player;
    if (typeof pickupSystem?.updateXpDrops !== "function" || typeof pickupSystem?.updateLootDrops !== "function") return failure(command, "OWNER_UNAVAILABLE", "Pickup owner is unavailable");
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
      game.lootDrops = game.lootDrops.filter(
        (drop, index) => index < before || drop.type === id
      );
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
