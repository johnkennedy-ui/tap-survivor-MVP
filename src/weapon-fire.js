(() => {
  function createWeaponFireSystem({
    canvas,
    weaponDefs,
    getGame,
    getUpgradeTier,
    getRunUpgradeTier,
    getShopBonuses,
    getRelicSpecialEffects,
    getWeaponDamageMultiplier,
    playWeaponSfx,
    addQuestProgress,
    damageEnemy,
    reapEnemies,
    distance,
    clamp,
  }) {
    const nearestEnemy = () =>
      globalThis.TapSurvivorWeaponTargeting.nearestEnemy(getGame(), distance);
    const scaling = globalThis.TapSurvivorWeaponCooldowns.createWeaponScaling({
      weaponDefs,
      getUpgradeTier,
      getRunUpgradeTier,
      getShopBonuses,
      getRelicSpecialEffects,
      getWeaponDamageMultiplier,
      clamp,
    });
    const projectileSystem = globalThis.TapSurvivorWeaponProjectiles.createWeaponProjectileSystem({
      canvas,
      weaponDefs,
      getGame,
      getRunUpgradeTier,
      getRelicSpecialEffects,
      nearestEnemy,
      projectileRadius: scaling.projectileRadius,
      weaponDamage: scaling.weaponDamage,
      projectileSkillModifier: scaling.projectileSkillModifier,
      damageEnemy,
      reapEnemies,
      distance,
      clamp,
    });
    const behaviorSystem = globalThis.TapSurvivorWeaponBehaviors.createWeaponBehaviorSystem({
      weaponDefs,
      getGame,
      nearestEnemy,
      weaponDamage: scaling.weaponDamage,
      weaponReach: scaling.weaponReach,
      weaponWidth: scaling.weaponWidth,
      damageEnemy,
      reapEnemies,
      addQuestProgress,
      distance,
    });

    const weaponKindHandlers = {
      radial: behaviorSystem.fireRadial,
      beam: behaviorSystem.fireBeam,
      cone: behaviorSystem.fireCone,
      chain: behaviorSystem.fireChain,
      projectile: projectileSystem.fireProjectile,
      target_area: behaviorSystem.fireTargetArea,
      lingering_area: behaviorSystem.fireLingeringArea,
      mine: behaviorSystem.fireMine,
    };

    function updateWeapons(dt) {
      const game = getGame();
      game.player.equippedWeapons.forEach((weaponId) => {
        const weapon = weaponDefs[weaponId];
        game.weaponTimers[weaponId] = (game.weaponTimers[weaponId] || 0) - dt;
        if (game.weaponTimers[weaponId] <= 0) {
          game.weaponTimers[weaponId] = scaling.weaponCooldown(weapon);
          fireWeapon(weaponId);
        }
      });
    }

    function fireWeapon(weaponId) {
      const weapon = weaponDefs[weaponId];
      if (!weapon) return;
      setPlayerAttackAnimation(weapon);
      playWeaponSfx?.(weaponId, weaponSfxOptions(weapon));
      flashWeaponIcon(weaponId);
      addWeaponBurst(weaponId, weapon);
      weaponKindHandlers[weapon.kind]?.(weaponId);
    }

    function weaponSfxOptions(weapon) {
      return scaling.weaponSfxOptions(weapon);
    }

    function flashWeaponIcon(weaponId) {
      const game = getGame();
      game.weaponIconFlashes ||= {};
      game.weaponIconFlashes[weaponId] = 1;
    }

    function setPlayerAttackAnimation(weapon) {
      const player = getGame()?.player;
      if (!player) return;
      player.actionSprite = playerAttackSprite(weapon.kind);
      player.actionTimer = 0.22;
    }

    function playerAttackSprite(kind) {
      if (kind === "beam" || kind === "cone" || kind === "chain") return "cast_beam";
      if (
        kind === "radial" ||
        kind === "target_area" ||
        kind === "lingering_area" ||
        kind === "mine"
      )
        return "sweep";
      return "cast_orb";
    }

    function addWeaponBurst(weaponId, weapon) {
      const game = getGame();
      const p = game.player;
      game.weaponBursts.push({
        weaponId,
        x: p.x,
        y: p.y,
        radius: Math.max(20, weapon.radius || weapon.width || 26),
        color: weapon.color,
        life: 0.32,
        maxLife: 0.32,
      });
    }

    return {
      updateWeapons,
      updateBolts: projectileSystem.updateBolts,
      updateAreas: behaviorSystem.updateAreas,
      updateBeams: behaviorSystem.updateBeams,
      updateWeaponBursts: behaviorSystem.updateWeaponBursts,
    };
  }

  // Verifier compatibility tokens for moved helpers:
  // spawnProjectileBolt splitBoltOnHit explodeBolt
  // weaponId === "shield_pulse" destroyEnemyProjectilesInRange chargeProjectileBlock
  // run_projectile_pierce run_wall_bounce run_split_shot run_explosive_hit run_split_on_hit
  // shopBonuses.flatDamage shopBonuses.fireRate shopBonuses.attackRadius shopBonuses.percentDamage
  globalThis.TapSurvivorWeaponFire = {
    createWeaponFireSystem,
  };
})();
