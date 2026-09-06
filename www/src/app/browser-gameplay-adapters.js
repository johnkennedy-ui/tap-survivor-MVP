import { createCombatSystem } from "../modules/combat.js";
import { createEnemyBehaviorSystem } from "../modules/enemy-behaviors.js";
import { createEnemySpawnSystem } from "../modules/enemy-spawning.js";
import { createEnemySystem } from "../modules/enemies.js";
import { createWeaponBehaviorSystem } from "../modules/weapon-behaviors.js";
import { createWeaponFireSystem } from "../modules/weapon-fire.js";

export function createBrowserGameplaySystems() {
  return {
    combat: { createCombatSystem },
    enemies: { createEnemySystem },
    enemyBehaviors: { createEnemyBehaviorSystem },
    enemySpawning: { createEnemySpawnSystem },
    weaponBehaviors: { createWeaponBehaviorSystem },
    weaponFire: { createWeaponFireSystem },
  };
}
