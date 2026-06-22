// GENERATED FILE. Do not edit directly.
// Source: src/modules/combat-damage.js
// Run: npm run build:bridges
(() => {
  "use strict";

  function createCombatDamageSystem({
    canvas,
    getGame,
    getRelicSpecialEffects,
    addQuestProgressForWeapon,
    addQuestProgressGroup,
    killQuestIds,
    damageQuestIds,
    bossQuestIds,
    spawnLootDrops,
    advanceTowerFloor,
    distance,
    clamp,
  }) {
    function damageEnemy(enemy, amount, weaponId) {
      const game = getGame();
      const before = enemy.hp;
      const effects = getRelicSpecialEffects?.() || {};
      const finalAmount = enemy.boss ? amount * (1 + (effects.bossDamageBonus || 0)) : amount;
      enemy.hp -= finalAmount;
      const dealt = Math.max(0, Math.min(before, finalAmount));
      game.weaponDamage[weaponId] = (game.weaponDamage[weaponId] || 0) + dealt;
      addQuestProgressGroup(damageQuestIds, dealt);
      addQuestProgressForWeapon(weaponId, dealt);
      return dealt;
    }

    function damagePlayer(amount, source = {}) {
      const game = getGame();
      const p = game?.player;
      if (!p || p.invincibleTimer > 0) return 0;
      const effects = getRelicSpecialEffects?.() || {};
      if (effects.dodgeChance && Math.random() < Math.min(0.95, effects.dodgeChance)) {
        p.blinkTimer = Math.max(p.blinkTimer || 0, 0.35);
        return 0;
      }
      let finalDamage = amount * Math.max(0, 1 - (effects.damageReduction || 0));
      if (source.enemy && effects.thornDamage) {
        damageEnemy(source.enemy, effects.thornDamage, "relic_thorns");
      }
      if (effects.teleportOnHitCooldown && !(p.teleportCooldown > 0)) {
        p.x = clamp(
          p.x + (Math.random() < 0.5 ? -1 : 1) * (effects.teleportDistance || 140),
          p.radius,
          canvas.width - p.radius
        );
        p.y = clamp(
          p.y + (Math.random() < 0.5 ? -1 : 1) * (effects.teleportDistance || 140),
          p.radius,
          canvas.height - p.radius
        );
        p.targetX = p.x;
        p.targetY = p.y;
        p.teleportCooldown = effects.teleportOnHitCooldown;
      }
      p.hp -= finalDamage;
      if (effects.blinkInvulnerabilitySeconds) {
        p.invincibleTimer = Math.max(p.invincibleTimer || 0, effects.blinkInvulnerabilitySeconds);
        p.blinkTimer = Math.max(p.blinkTimer || 0, effects.blinkInvulnerabilitySeconds);
      }
      return finalDamage;
    }

    function reapEnemies() {
      const game = getGame();
      const dead = game.enemies.filter((enemy) => enemy.hp <= 0);
      dead.forEach((enemy) => {
        const effects = getRelicSpecialEffects?.() || {};
        if (effects.lifestealOnKill && game.player) {
          game.player.hp = Math.min(
            game.player.maxHp,
            game.player.hp + Math.ceil(game.player.maxHp * effects.lifestealOnKill)
          );
        }
        if (effects.killExplosionDamage && effects.killExplosionRadius) {
          game.enemies.forEach((candidate) => {
            if (candidate === enemy || candidate.hp <= 0) return;
            if (distance(enemy, candidate) <= effects.killExplosionRadius + candidate.radius) {
              damageEnemy(candidate, effects.killExplosionDamage, "relic_kill_explosion");
            }
          });
        }
        game.kills += 1;
        addQuestProgressGroup(killQuestIds, 1);
        game.xpDrops.push({ x: enemy.x, y: enemy.y, radius: enemy.boss ? 12 : 7, value: enemy.boss ? 8 : enemy.xp });
        spawnLootDrops(enemy);
        if (enemy.boss) {
          game.bossDefeated = true;
          addQuestProgressGroup(bossQuestIds, 1);
          advanceTowerFloor?.();
        }
      });
      game.enemies = game.enemies.filter((enemy) => enemy.hp > 0);
    }

    return {
      damageEnemy,
      damagePlayer,
      reapEnemies,
    };
  }

  globalThis.TapSurvivorCombatDamage = {
    createCombatDamageSystem,
  };
})();
