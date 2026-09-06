export const MODULE_RUNTIME_GAMEPLAY_ADAPTER_SLOTS = Object.freeze([
  "combat",
  "enemies",
  "enemyBehaviors",
  "enemySpawning",
  "weaponBehaviors",
  "weaponFire",
]);

export const MODULE_RUNTIME_GAMEPLAY_ADAPTER_PROOF_SLOTS = Object.freeze([
  "createCombatSystem",
  "createEnemyBehaviorSystem",
  "createEnemySpawnSystem",
  "createEnemySystem",
  "createWeaponBehaviorSystem",
  "createWeaponFireSystem",
  "missingGameplayAdapterFallback",
]);

export const MODULE_RUNTIME_GAMEPLAY_ADAPTER_LOW_LEVEL_SLOTS = Object.freeze([
  "balance",
  "combatDamage",
  "effects",
  "gameplaySystems",
  "math",
  "pickups",
  "runState",
  "runUpdate",
  "weaponCooldowns",
  "weaponProjectiles",
  "weaponTargeting",
]);

export function createModuleRuntimeGameplayAdapter(options = {}) {
  const resolvedOptions = requireObject(options, "options");
  const gameplaySystems = requireObject(resolvedOptions.gameplaySystems, "options.gameplaySystems");
  const canonicalSystems = {
    balance: resolvedOptions.balance,
    combatDamage: resolvedOptions.combatDamage,
    effects: resolvedOptions.effects,
    math: resolvedOptions.math,
    pickups: resolvedOptions.pickups,
    runState: resolvedOptions.runState,
    runUpdate: resolvedOptions.runUpdate,
    weaponCooldowns: resolvedOptions.weaponCooldowns,
    weaponProjectiles: resolvedOptions.weaponProjectiles,
    weaponTargeting: resolvedOptions.weaponTargeting,
  };
  const onMissingAdapter = resolvedOptions.onMissingAdapter;
  const facades = {};

  function missingGameplayAdapterFallback(name, payload = {}) {
    if (typeof onMissingAdapter === "function") {
      onMissingAdapter({
        name,
        payload,
      });
    }
    return false;
  }

  function invokeFactory(adapterName, factoryName, optionsForFactory = {}) {
    const adapter = gameplaySystems[adapterName];
    const factory = adapter?.[factoryName];
    if (typeof factory !== "function") {
      return missingGameplayAdapterFallback(`${adapterName}.${factoryName}`, optionsForFactory);
    }
    return factory(optionsForFactory);
  }

  facades.enemyBehaviors = {
    createEnemyBehaviorSystem(optionsForFactory = {}) {
      return invokeFactory("enemyBehaviors", "createEnemyBehaviorSystem", optionsForFactory);
    },
  };
  facades.enemySpawning = {
    createEnemySpawnSystem(optionsForFactory = {}) {
      return invokeFactory("enemySpawning", "createEnemySpawnSystem", optionsForFactory);
    },
  };
  facades.weaponBehaviors = {
    createWeaponBehaviorSystem(optionsForFactory = {}) {
      return invokeFactory("weaponBehaviors", "createWeaponBehaviorSystem", optionsForFactory);
    },
  };
  facades.enemies = {
    createEnemySystem(optionsForFactory = {}) {
      return invokeFactory("enemies", "createEnemySystem", {
        balance: canonicalSystems.balance,
        enemyBehaviors: facades.enemyBehaviors,
        enemySpawning: facades.enemySpawning,
        ...optionsForFactory,
      });
    },
  };
  facades.weaponFire = {
    createWeaponFireSystem(optionsForFactory = {}) {
      return invokeFactory("weaponFire", "createWeaponFireSystem", {
        weaponBehaviors: facades.weaponBehaviors,
        weaponCooldowns: canonicalSystems.weaponCooldowns,
        weaponProjectiles: canonicalSystems.weaponProjectiles,
        weaponTargeting: canonicalSystems.weaponTargeting,
        ...optionsForFactory,
      });
    },
  };
  facades.combat = {
    createCombatSystem(optionsForFactory = {}) {
      return invokeFactory("combat", "createCombatSystem", {
        balance: canonicalSystems.balance,
        combatDamage: canonicalSystems.combatDamage,
        effects: canonicalSystems.effects,
        math: canonicalSystems.math,
        pickups: canonicalSystems.pickups,
        runState: canonicalSystems.runState,
        runUpdate: canonicalSystems.runUpdate,
        enemies: facades.enemies,
        enemyBehaviors: facades.enemyBehaviors,
        enemySpawning: facades.enemySpawning,
        weaponBehaviors: facades.weaponBehaviors,
        weaponCooldowns: canonicalSystems.weaponCooldowns,
        weaponFire: facades.weaponFire,
        weaponProjectiles: canonicalSystems.weaponProjectiles,
        weaponTargeting: canonicalSystems.weaponTargeting,
        ...optionsForFactory,
      });
    },
  };

  return {
    combat: facades.combat,
    enemies: facades.enemies,
    enemyBehaviors: facades.enemyBehaviors,
    enemySpawning: facades.enemySpawning,
    missingGameplayAdapterFallback,
    weaponBehaviors: facades.weaponBehaviors,
    weaponFire: facades.weaponFire,
  };
}

function requireObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing Tap Survivor module runtime gameplay adapter options: ${name}`);
  }
  return value;
}
