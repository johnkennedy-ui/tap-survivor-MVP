// GENERATED FILE. Do not edit directly.
// Source: src/modules/game-dependencies.js
// Run: npm run build:bridges
(() => {
  "use strict";

  const MODULE_NATIVE_ASSET_RESOLVER_SLOTS = Object.freeze([
    "choiceIconDefinition",
    "choiceIconPath",
    "fallbackSkillIcon",
    "relicIcon",
    "runUpgradeIcon",
    "runUpgradeSprite",
    "spriteSource",
    "weaponIcon",
    "weaponSprite",
  ]);

  const MODULE_NATIVE_ASSET_RESOLVER_PROOF_SLOTS = Object.freeze([
    "createAssetResolver",
    ...MODULE_NATIVE_ASSET_RESOLVER_SLOTS,
  ]);

  const MODULE_NATIVE_ASSET_RESOLVER_LOW_LEVEL_SLOTS = Object.freeze([
    "assetDefs",
    "fallbackSkillIcon",
  ]);

  const DEFAULT_SKILL_ICON = "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610";

  function createAssetResolver(options = {}) {
    const resolvedOptions = requireObject(options, "options");
    const assetDefs = requireObject(
      resolvedOptions.assetDefs || resolvedOptions.content?.assets || {},
      "options.assetDefs"
    );
    const sprites = assetDefs.sprites || {};
    const fallbackSkillIcon =
      resolvedOptions.fallbackSkillIcon || sprites.ui?.quest || DEFAULT_SKILL_ICON;

    function spriteSource(definition) {
      if (typeof definition === "string") return definition;
      if (definition && typeof definition === "object") {
        return definition.src || definition.path || definition.iconSrc || "";
      }
      return "";
    }

    function weaponSprite(weaponId) {
      return sprites.weapons?.[weaponId] || fallbackSkillIcon;
    }

    function weaponIcon(weaponId) {
      const definition = weaponSprite(weaponId);
      return definition?.iconSrc || spriteSource(definition) || fallbackSkillIcon;
    }

    function runUpgradeSprite(upgradeId) {
      return sprites.runUpgrades?.[upgradeId] || fallbackSkillIcon;
    }

    function runUpgradeIcon(upgradeId) {
      const definition = runUpgradeSprite(upgradeId);
      return (
        sprites.runUpgradeIcons?.[upgradeId] ||
        definition?.iconSrc ||
        spriteSource(definition) ||
        fallbackSkillIcon
      );
    }

    function relicIcon(relic) {
      return relic?.iconPath || runUpgradeIcon(relic?.targetUpgradeId) || fallbackSkillIcon;
    }

    function choiceIconDefinition(choice) {
      if (choice?.weaponId) return weaponSprite(choice.weaponId);
      if (choice?.runUpgradeId) return runUpgradeSprite(choice.runUpgradeId);
      return fallbackSkillIcon;
    }

    function choiceIconPath(choice) {
      if (choice?.weaponId) return weaponIcon(choice.weaponId);
      if (choice?.runUpgradeId) return runUpgradeIcon(choice.runUpgradeId);
      return fallbackSkillIcon;
    }

    return {
      choiceIconDefinition,
      choiceIconPath,
      fallbackSkillIcon,
      relicIcon,
      runUpgradeIcon,
      runUpgradeSprite,
      spriteSource,
      weaponIcon,
      weaponSprite,
    };
  }

  function requireObject(value, name) {
    if (!value || typeof value !== "object") {
      throw new Error(`Missing Tap Survivor module assets dependency: ${name}`);
    }
    return value;
  }

  /**
   * @typedef {{ hp: number, damage: number, spawnRate: number }} FloorDifficulty
   */

  const floorTable = [
    { hp: 0.9, damage: 0.85, spawnRate: 0.9 },
    { hp: 1.1, damage: 1, spawnRate: 1 },
    { hp: 1.33, damage: 1.15, spawnRate: 1.08 },
  ];

  /**
   * @param {number | null | undefined} floor
   * @returns {FloorDifficulty}
   */
  function floorDifficulty(floor) {
    const floorNumber = Math.max(1, Math.floor(floor || 1));
    const tableEntry = floorTable[floorNumber - 1];
    if (tableEntry) return { ...tableEntry };

    const extraFloors = floorNumber - floorTable.length;
    const floorThree = floorTable[floorTable.length - 1];
    return {
      hp: floorThree.hp + extraFloors * 0.2,
      damage: floorThree.damage + extraFloors * 0.13,
      spawnRate: floorThree.spawnRate + extraFloors * 0.05,
    };
  }

  const MODULE_RUNTIME_AUDIO_ADAPTER_SLOTS = Object.freeze(["audio"]);

  const MODULE_RUNTIME_AUDIO_ADAPTER_PROOF_SLOTS = Object.freeze([
    "createAudioSystem",
    "isBgmPlaying",
    "isMuted",
    "play",
    "playRunUpgrade",
    "playShopPurchase",
    "playStartLaugh",
    "playWeapon",
    "startBgm",
    "stopBgm",
    "setMuted",
    "toggleMuted",
  ]);

  const MODULE_RUNTIME_AUDIO_ADAPTER_LOW_LEVEL_SLOTS = Object.freeze([
    "audioContextFactory",
    "audioFactory",
    "clock",
    "onError",
    "sfxDefs",
  ]);

  function createModuleRuntimeAudioAdapter(options = {}) {
    const resolvedOptions = requireObject(options, "options");
    const baseSfxDefs = requireObject(resolvedOptions.sfxDefs || {}, "options.sfxDefs");

    return {
      audio: {
        createAudioSystem: (audioOptions = {}) =>
          createAudioSystem({
            audioContextFactory: audioOptions.audioContextFactory || resolvedOptions.audioContextFactory,
            audioFactory: audioOptions.audioFactory || resolvedOptions.audioFactory,
            clock: audioOptions.clock || resolvedOptions.clock,
            onError: audioOptions.onError || resolvedOptions.onError,
            sfxDefs: audioOptions.sfxDefs || baseSfxDefs,
          }),
      },
    };
  }

  function createAudioSystem({ audioContextFactory, audioFactory, clock, onError, sfxDefs }) {
    const audioById = new Map();
    const lastPlayed = new Map();
    const weaponSfx = sfxDefs.weapons || {};
    const runUpgradeSfx = sfxDefs.runUpgrades || {};
    const volume = Number.isFinite(sfxDefs.volume) ? sfxDefs.volume : 0.45;
    const bgmVolume = Number.isFinite(sfxDefs.bgmVolume)
      ? Math.max(0, Math.min(0.12, sfxDefs.bgmVolume))
      : Math.min(0.1, volume * 0.18);
    const minGapMs = Number.isFinite(sfxDefs.minGapMs) ? sfxDefs.minGapMs : 70;
    const now = typeof clock === "function" ? clock : () => 0;
    let muted = false;
    let bgmContext = null;
    let bgmMaster = null;
    let bgmVoices = [];
    let bgmRequested = false;

    function audioFor(src) {
      if (!src || typeof audioFactory !== "function") return null;
      if (!audioById.has(src)) {
        audioById.set(src, audioFactory(src));
      }
      return audioById.get(src);
    }

    function play(src, options = {}) {
      const currentTime = now();
      const gapMs = Number.isFinite(options.minGapMs) ? Math.max(0, options.minGapMs) : minGapMs;
      if (muted) return false;
      const previousTime = lastPlayed.has(src) ? lastPlayed.get(src) : -Infinity;
      if (!src || currentTime - previousTime < gapMs) return false;

      const audio = audioFor(src);
      if (!audio) return false;

      try {
        lastPlayed.set(src, currentTime);
        const player = typeof audio.cloneNode === "function" ? audio.cloneNode() : audio;
        player.volume = Number.isFinite(options.volume)
          ? Math.max(0, Math.min(1, options.volume))
          : volume;
        player.playbackRate = Number.isFinite(options.playbackRate)
          ? Math.max(0.5, Math.min(2.5, options.playbackRate))
          : 1;
        player.currentTime = 0;
        player.play?.();
        return true;
      } catch (error) {
        reportError(onError, "play", error);
        return false;
      }
    }

    function playWeapon(weaponId, options = {}) {
      return play(weaponSfx[weaponId], options);
    }

    function playRunUpgrade(runUpgradeId) {
      return play(runUpgradeSfx[runUpgradeId]);
    }

    function playStartLaugh() {
      if (muted || typeof audioContextFactory !== "function") return false;

      try {
        const context = audioContextFactory("start-laugh");
        if (!context) return false;
        resumeContext(context, "start-laugh");
        if (!hasStartLaughContext(context)) return false;

        const startAt = context.currentTime;
        const master = context.createGain();
        const tone = context.createBiquadFilter();
        const throat = context.createBiquadFilter();
        if (!hasStartLaughGain(master) || !hasStartLaughFilter(tone) || !hasStartLaughFilter(throat)) {
          return false;
        }

        master.gain.setValueAtTime(0.0001, startAt);
        master.gain.exponentialRampToValueAtTime(volume * 0.55, startAt + 0.04);
        master.gain.exponentialRampToValueAtTime(0.0001, startAt + 1.02);
        tone.type = "lowpass";
        tone.frequency.setValueAtTime(920, startAt);
        tone.Q.setValueAtTime(2.2, startAt);
        throat.type = "bandpass";
        throat.frequency.setValueAtTime(360, startAt);
        throat.Q.setValueAtTime(4.6, startAt);
        tone.connect(throat);
        throat.connect(master);
        master.connect(context.destination);

        for (const [index, offset] of [0, 0.23, 0.48].entries()) {
          const oscillator = context.createOscillator();
          const syllable = context.createGain();
          if (!hasStartLaughOscillator(oscillator) || !hasStartLaughGain(syllable)) return false;

          oscillator.type = "sawtooth";
          oscillator.frequency.setValueAtTime(118 - index * 16, startAt + offset);
          oscillator.frequency.exponentialRampToValueAtTime(64 - index * 7, startAt + offset + 0.18);
          syllable.gain.setValueAtTime(0.0001, startAt + offset);
          syllable.gain.exponentialRampToValueAtTime(0.74, startAt + offset + 0.035);
          syllable.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + 0.24);
          oscillator.connect(syllable);
          syllable.connect(tone);
          oscillator.start(startAt + offset);
          oscillator.stop(startAt + offset + 0.26);
        }
        return true;
      } catch (error) {
        reportError(onError, "start-laugh", error);
        return false;
      }
    }

    function playShopPurchase() {
      if (muted || typeof audioContextFactory !== "function") return false;

      try {
        const context = audioContextFactory("shop-purchase");
        if (!context) return false;
        resumeContext(context, "shop-purchase");
        if (
          !Number.isFinite(context.currentTime) ||
          !context.destination ||
          typeof context.createGain !== "function" ||
          typeof context.createOscillator !== "function"
        ) {
          return false;
        }

        const startAt = context.currentTime;
        const master = context.createGain();
        master.gain.setValueAtTime(0.0001, startAt);
        master.gain.exponentialRampToValueAtTime(volume * 0.42, startAt + 0.015);
        master.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.48);
        master.connect(context.destination);

        [880, 1175, 1480, 1976].forEach((frequency, index) => {
          const offset = index * 0.055;
          const osc = context.createOscillator();
          const note = context.createGain();
          osc.type = index % 2 ? "sine" : "triangle";
          osc.frequency.setValueAtTime(frequency, startAt + offset);
          osc.frequency.exponentialRampToValueAtTime(frequency * 0.82, startAt + offset + 0.16);
          note.gain.setValueAtTime(0.0001, startAt + offset);
          note.gain.exponentialRampToValueAtTime(0.6, startAt + offset + 0.012);
          note.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + 0.19);
          osc.connect(note);
          note.connect(master);
          osc.start(startAt + offset);
          osc.stop(startAt + offset + 0.22);
        });
        return true;
      } catch (error) {
        reportError(onError, "shop-purchase", error);
        return false;
      }
    }

    function playProceduralCue(cueId) {
      if (muted || typeof audioContextFactory !== "function") return false;

      try {
        const context = audioContextFactory(cueId);
        resumeContext(context, cueId);
        return Boolean(context);
      } catch (error) {
        reportError(onError, cueId, error);
        return false;
      }
    }

    function startBgm() {
      bgmRequested = true;
      if (muted || typeof audioContextFactory !== "function") return false;
      if (bgmVoices.length > 0) {
        resumeContext(bgmContext, "bgm");
        return true;
      }

      try {
        bgmContext ||= audioContextFactory("bgm");
        const context = bgmContext;
        resumeContext(context, "bgm");
        if (
          !Number.isFinite(context?.currentTime) ||
          !context.destination ||
          typeof context.createGain !== "function" ||
          typeof context.createOscillator !== "function"
        ) {
          return false;
        }

        const startAt = context.currentTime;
        const master = context.createGain();
        if (!master?.gain || typeof master.connect !== "function") return false;
        setAudioParam(master.gain, 0.0001, startAt);
        rampAudioParam(master.gain, bgmVolume, startAt + 0.24);
        master.connect(context.destination);

        const voices = [
          { frequency: 110, gain: 0.42, type: "triangle" },
          { frequency: 164.81, gain: 0.22, type: "sine" },
          { frequency: 220, gain: 0.12, type: "sine" },
        ]
          .map((voice) => createBgmVoice(context, master, startAt, voice))
          .filter(Boolean);
        if (voices.length === 0) {
          master.disconnect?.();
          return false;
        }

        bgmMaster = master;
        bgmVoices = voices;
        return true;
      } catch (error) {
        reportError(onError, "bgm", error);
        stopBgm({ clearRequest: false });
        return false;
      }
    }

    function stopBgm({ clearRequest = true } = {}) {
      if (clearRequest) bgmRequested = false;
      const context = bgmContext;
      const stopAt = Number.isFinite(context?.currentTime) ? context.currentTime + 0.02 : undefined;
      bgmVoices.forEach(({ oscillator, gain }) => {
        try {
          if (stopAt === undefined) oscillator.stop?.();
          else oscillator.stop?.(stopAt);
        } catch (error) {
          reportError(onError, "bgm-stop", error);
        }
        oscillator.disconnect?.();
        gain.disconnect?.();
      });
      if (bgmMaster) {
        try {
          setAudioParam(bgmMaster.gain, 0.0001, stopAt ?? 0);
          bgmMaster.disconnect?.();
        } catch (error) {
          reportError(onError, "bgm-stop", error);
        }
      }
      bgmVoices = [];
      bgmMaster = null;
      return true;
    }

    function isBgmPlaying() {
      return bgmVoices.length > 0;
    }

    function createBgmVoice(context, master, startAt, voice) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      if (
        !oscillator ||
        !gain?.gain ||
        typeof oscillator.connect !== "function" ||
        typeof oscillator.start !== "function" ||
        typeof gain.connect !== "function"
      ) {
        return null;
      }
      oscillator.type = voice.type;
      setAudioParam(oscillator.frequency, voice.frequency, startAt);
      setAudioParam(gain.gain, voice.gain, startAt);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(startAt);
      return { gain, oscillator };
    }

    function resumeContext(context, operation) {
      try {
        const result = context?.resume?.();
        result?.catch?.((error) => reportError(onError, operation, error));
      } catch (error) {
        reportError(onError, operation, error);
      }
    }

    function setAudioParam(param, value, at) {
      if (!param) return;
      if (typeof param.setValueAtTime === "function" && Number.isFinite(at)) {
        param.setValueAtTime(value, at);
        return;
      }
      param.value = value;
    }

    function rampAudioParam(param, value, at) {
      if (!param) return;
      if (typeof param.exponentialRampToValueAtTime === "function" && Number.isFinite(at)) {
        param.exponentialRampToValueAtTime(Math.max(0.0001, value), at);
        return;
      }
      if (typeof param.linearRampToValueAtTime === "function" && Number.isFinite(at)) {
        param.linearRampToValueAtTime(value, at);
        return;
      }
      param.value = value;
    }

    function setMuted(nextMuted) {
      muted = Boolean(nextMuted);
      if (muted) stopBgm({ clearRequest: false });
      else if (bgmRequested) startBgm();
      return muted;
    }

    function toggleMuted() {
      return setMuted(!muted);
    }

    function isMuted() {
      return muted;
    }

    return {
      isBgmPlaying,
      isMuted,
      play,
      playRunUpgrade,
      playShopPurchase,
      playStartLaugh,
      playWeapon,
      startBgm,
      stopBgm,
      setMuted,
      toggleMuted,
    };
  }

  function reportError(onError, operation, error) {
    if (typeof onError === "function") {
      onError({ error, operation });
    }
  }

  function hasStartLaughContext(context) {
    return Boolean(
      Number.isFinite(context?.currentTime) &&
        context.destination &&
        typeof context.createGain === "function" &&
        typeof context.createBiquadFilter === "function" &&
        typeof context.createOscillator === "function"
    );
  }

  function hasStartLaughGain(node) {
    return Boolean(
      node?.gain &&
        typeof node.connect === "function" &&
        typeof node.gain.setValueAtTime === "function" &&
        typeof node.gain.exponentialRampToValueAtTime === "function"
    );
  }

  function hasStartLaughFilter(node) {
    return Boolean(
      node?.frequency &&
        node?.Q &&
        typeof node.connect === "function" &&
        typeof node.frequency.setValueAtTime === "function" &&
        typeof node.Q.setValueAtTime === "function"
    );
  }

  function hasStartLaughOscillator(node) {
    return Boolean(
      node?.frequency &&
        typeof node.connect === "function" &&
        typeof node.start === "function" &&
        typeof node.stop === "function" &&
        typeof node.frequency.setValueAtTime === "function" &&
        typeof node.frequency.exponentialRampToValueAtTime === "function"
    );
  }

  function requireObject(value, name) {
    if (!value || typeof value !== "object") {
      throw new Error(`Missing Tap Survivor module runtime audio adapter options: ${name}`);
    }
    return value;
  }

  const MODULE_NATIVE_COMBAT_SLOTS = Object.freeze(["combat"]);

  const MODULE_NATIVE_COMBAT_PROOF_SLOTS = Object.freeze(["createCombatSystem"]);

  /**
   * @param {any} [options]
   */
  function createCombatSystem({
    canvas,
    balance,
    combatDamage,
    content,
    enemies,
    enemyBehaviors,
    enemySpawning,
    enemyTypes,
    bossConfig,
    bossAbilities,
    levelDefs,
    getActiveFloorDef,
    weaponDefs,
    getGame,
    getUpgradeTier,
    getShopBonuses,
    getRelicSpecialEffects,
    addQuestProgress,
    addQuestProgressForWeapon,
    addQuestProgressGroup,
    killQuestIds,
    damageQuestIds,
    bossQuestIds,
    spawnLootDrops,
    getWeaponDamageMultiplier,
    playWeaponSfx,
    advanceTowerFloor,
    endRun,
    onBossSpawn,
    distance,
    clamp,
    weaponBehaviors,
    weaponCooldowns,
    weaponFire,
    weaponProjectiles,
    weaponTargeting,
  } = {}) {
    const damageSystem = combatDamage.createCombatDamageSystem({
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
    });
    const enemySystem = enemies.createEnemySystem({
      canvas,
      balance,
      enemyBehaviors,
      enemySpawning,
      enemyTypes,
      bossConfig,
      bossAbilities,
      levelDefs,
      getActiveFloorDef,
      getGame,
      distance,
      clamp,
      damagePlayer: damageSystem.damagePlayer,
      onBossSpawn,
    });
    const weaponFireSystem = weaponFire.createWeaponFireSystem({
      canvas,
      content,
      weaponDefs,
      getGame,
      getUpgradeTier,
      getRunUpgradeTier,
      getShopBonuses,
      getRelicSpecialEffects,
      getWeaponDamageMultiplier,
      playWeaponSfx,
      addQuestProgress,
      damageEnemy: damageSystem.damageEnemy,
      reapEnemies: damageSystem.reapEnemies,
      distance,
      clamp,
      weaponBehaviors,
      weaponCooldowns,
      weaponProjectiles,
      weaponTargeting,
      damagePlayer: damageSystem.damagePlayer,
    });

    function getRunUpgradeTier(id) {
      const game = getGame();
      return game?.runUpgradeTiers?.[id] || 0;
    }

    return {
      spawnEnemies: enemySystem.spawnEnemies,
      spawnBoss: enemySystem.spawnBoss,
      updateBossSpecials: enemySystem.updateBossSpecials,
      updateEnemies: enemySystem.updateEnemies,
      updateEnemyBolts: enemySystem.updateEnemyBolts,
      updateWeapons: weaponFireSystem.updateWeapons,
      updateBolts: weaponFireSystem.updateBolts,
      updateAreas: weaponFireSystem.updateAreas,
      updateBeams: weaponFireSystem.updateBeams,
      updateWeaponBursts: weaponFireSystem.updateWeaponBursts,
      getRunUpgradeTier,
    };
  }

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

  function createContentRegistry({ content, upgradeContent }) {
    const weaponDefs = content.weapons || {};
    const weaponUnlocks = content.weaponUnlocks || [];
    const questDefs = content.quests || {};
    const questGroups = content.questGroups || {};
    const bossConfig = content.bossConfig || {};
    const bossAbilities = content.bossAbilities || {};
    const assetDefs = content.assets || {};

    return {
      weaponDefs,
      weaponUnlocks,
      spriteDefs: assetDefs.sprites || {},
      sfxDefs: assetDefs.sfx || {},
      upgradeDefs: upgradeContent.createUpgradeDefs?.(weaponDefs) || [],
      questDefs,
      questGroups,
      starterQuestIds: questGroups.starter || [],
      killQuestIds: questGroups.kill || [],
      damageQuestIds: questGroups.damage || [],
      survivalQuestIds: questGroups.survival || [],
      xpQuestIds: questGroups.xp || [],
      levelQuestIds: questGroups.level || [],
      bossQuestIds: questGroups.boss || [],
      runUpgradeDefs: upgradeContent.runUpgradeDefs || [],
      enemyTypes: content.enemyTypes || [],
      bossConfig,
      bossAbilities,
      shopItemDefs: content.shopItems || [],
      relicDefs: content.relics || [],
      levelDefs: content.levels || [],
      mapDefs: content.maps || [],
      tuningDefs: content.tuning || {},
    };
  }

  function createDebugSystem({
    ui,
    floorDifficulty,
    getGame,
    getSave,
    getRunUpgradeTier,
    maxEquippedWeapons,
    getWeaponDamageMultiplier,
    getActiveProfile,
    relicDefs,
    runUpgradeDefs,
  }) {
    let enabled = false;

    function relicNames(save) {
      const equipped = new Set(save.equippedRelics || []);
      return (relicDefs || [])
        .filter((relic) => equipped.has(relic.id))
        .map((relic) => relic.name || relic.id);
    }

    function activeRunUpgrades() {
      return (runUpgradeDefs || [])
        .map((upgrade) => ({ upgrade, tier: getRunUpgradeTier(upgrade.id) }))
        .filter(({ tier }) => tier > 0)
        .map(({ upgrade, tier }) => `${upgrade.name || upgrade.id} ${tier}`);
    }

    function weaponDamageLines(game) {
      return Object.entries(game?.weaponDamage || {})
        .sort((left, right) => right[1] - left[1])
        .slice(0, 6)
        .map(([weaponId, damage]) => `${weaponId}: ${Math.floor(damage)}`);
    }

    function render() {
      if (!enabled || !ui.debugStats) return;
      const game = getGame();
      const save = getSave();
      const floor = game?.towerFloor || save.towerFloor || 1;
      const difficulty = floorDifficulty(floor);
      const equippedWeapons = game?.player?.equippedWeapons?.length || 0;
      const runUpgrades = activeRunUpgrades();
      const relics = relicNames(save);
      const damageLines = weaponDamageLines(game);

      ui.debugStats.textContent = [
        `Floor: ${floor}`,
        `Balance profile: ${getActiveProfile?.() || "default"}`,
        `Map: ${game?.activeMap?.name || game?.activeMap?.id || "default"}`,
        `Floor content: ${game?.activeFloor?.name || game?.activeFloor?.id || "none"}`,
        `Map modifiers: ${Object.keys(game?.mapModifiers || {}).length ? JSON.stringify(game.mapModifiers) : "none"}`,
        `Enemy HP x${difficulty.hp.toFixed(2)}`,
        `Enemy DMG x${difficulty.damage.toFixed(2)}`,
        `Spawn pressure x${difficulty.spawnRate.toFixed(2)}`,
        `Weapon slots: ${equippedWeapons}/${maxEquippedWeapons()}`,
        `Weapon damage x${getWeaponDamageMultiplier().toFixed(2)}`,
        `Kills: ${game?.kills || 0}`,
        `Level: ${game?.player?.level || 0}`,
        `Run upgrades: ${runUpgrades.length ? runUpgrades.join(", ") : "none"}`,
        `Relics: ${relics.length ? relics.join(", ") : "none"}`,
        `Weapon damage totals: ${damageLines.length ? damageLines.join(", ") : "none"}`,
      ].join("\n");
    }

    function setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);
      ui.debugPanel?.classList.toggle("hidden", !enabled);
      ui.toggleDebug?.setAttribute("aria-pressed", String(enabled));
      render();
    }

    function toggle() {
      setEnabled(!enabled);
    }

    function bind() {
      ui.toggleDebug?.addEventListener("click", toggle);
      setEnabled(false);
    }

    return {
      bind,
      render,
      floorDifficulty,
      isEnabled: () => enabled,
    };
  }

  const DEFAULT_SHOP_BONUS_STATS = [
    "speed",
    "pickupRadius",
    "maxHp",
    "flatDamage",
    "attackRadius",
    "fireRate",
    "percentDamage",
    "relicFocus",
  ];

  function createEffects({ contentSchema = {} } = {}) {
    const shopBonusStats =
      contentSchema["effectRegistries"]?.["shopItem"]?.["stats"] ||
      DEFAULT_SHOP_BONUS_STATS;

    function applyPlayerStatEffect(player, effect) {
      const handler = PLAYER_STAT_EFFECTS[effect?.stat];
      if (!player || !handler) return false;
      handler(player, effect.value || 0);
      return true;
    }

    function applyRunUpgradeEffects(game, effects) {
      (effects || []).forEach((effect) => {
        if (effect.type === "playerStatAdd") {
          applyPlayerStatEffect(game.player, effect);
          return;
        }
        if (effect.type === "playerHeal") {
          game.player.hp = Math.min(game.player.maxHp, game.player.hp + effect.value);
        }
      });
    }

    function applyShopItemEffectToRun(game, item) {
      if (!game?.running || !game.player || !item?.effect) return false;
      return applyPlayerStatEffect(game.player, item.effect);
    }

    function emptyShopBonuses() {
      return Object.fromEntries(shopBonusStats.map((stat) => [stat, 0]));
    }

    function addShopItemBonus(bonuses, item, tier) {
      if (!item?.effect || !Object.prototype.hasOwnProperty.call(bonuses, item.effect.stat)) return;
      bonuses[item.effect.stat] += item.effect.value * tier;
    }

    function applyRelicSpecialEffects(game, effects = {}) {
      const player = game?.player;
      if (!player) return;
      if (effects.maxHpBonus) {
        player.maxHp += effects.maxHpBonus;
        player.hp += effects.maxHpBonus;
      }
      if (effects.maxHpMultiplier) {
        const nextMaxHp = Math.ceil(player.maxHp * (1 + effects.maxHpMultiplier));
        player.hp += nextMaxHp - player.maxHp;
        player.maxHp = nextMaxHp;
      }
      if (effects.speedBonus) player.speed += effects.speedBonus;
      if (effects.speedMultiplier) player.speed *= 1 + effects.speedMultiplier;
      if (effects.pickupRadiusBonus) player.pickupRadius += effects.pickupRadiusBonus;
      if (effects.pickupRadiusMultiplier) player.pickupRadius *= 1 + effects.pickupRadiusMultiplier;
    }

    return {
      applyRunUpgradeEffects,
      applyShopItemEffectToRun,
      emptyShopBonuses,
      addShopItemBonus,
      applyRelicSpecialEffects,
    };
  }

  const PLAYER_STAT_EFFECTS = {
    speed(player, value) {
      player.speed += value;
    },
    pickupRadius(player, value) {
      player.pickupRadius += value;
    },
    maxHp(player, value) {
      player.maxHp += value;
      player.hp += value;
    },
  };

  const MODULE_NATIVE_ENEMY_SLOTS = Object.freeze(["enemies"]);

  const MODULE_NATIVE_ENEMY_PROOF_SLOTS = Object.freeze(["createEnemySystem"]);

  /**
   * @param {any} [options]
   */
  function createEnemySystem({
    canvas,
    balance,
    enemyBehaviors,
    enemySpawning,
    enemyTypes,
    bossConfig = {},
    bossAbilities = {},
    levelDefs = [],
    getActiveFloorDef,
    getGame,
    distance,
    clamp,
    damagePlayer,
    onBossSpawn,
  } = {}) {
    const bossKinds = bossConfig.abilityIds?.length ? bossConfig.abilityIds : Object.keys(bossAbilities);
    const normalBossAbilityCount = bossConfig.normalAbilityCount || 1;
    const superBossAbilityCount = bossConfig.superAbilityCount || 2;
    const bossBaseHp = bossConfig.baseHp || 1400;
    const bossHpPerKill = bossConfig.hpPerKill || 6;
    const superBossHpMultiplier = bossConfig.superHpMultiplier || 1.35;
    const bossTouchDamage = bossConfig.touchDamage || 22;
    const bossTouchCooldown = bossConfig.touchCooldown || 0.8;
    const bossNoticeLife = bossConfig.noticeLife || 2.1;
    const dropWindup = bossConfig.dropWindup || 1.15;
    const sideEntryMargin = bossConfig.sideEntryMargin || 150;
    const entryOffsetX = bossConfig.entryOffsetX || 52;
    const entryOffsetY = bossConfig.entryOffsetY || 72;
    const spawnEntryMargin = bossConfig.spawnEntryMargin || 72;
    const boltConfig = bossConfig.enemyBolt || {};
    const projectileScaling = bossConfig.projectileScaling || {};
    const fallbackAbility = bossKinds[0] || "warden";
    const floorDifficulty = balance.floorDifficulty;
    const behaviorSystem = enemyBehaviors.createEnemyBehaviorSystem({
      canvas,
      bossAbilities,
      boltConfig,
      getGame,
      distance,
      clamp,
      damagePlayer,
    });
    const spawnSystem = enemySpawning.createEnemySpawnSystem({
      canvas,
      enemyTypes,
      levelDefs,
      getActiveFloorDef,
      getGame,
      floorDifficulty,
      spawnEntryMargin,
      scaledProjectileCooldown,
      scaledProjectileSpeed,
      resolveEnemyProjectileColor: behaviorSystem.resolveEnemyProjectileColor,
    });

    function spawnBoss() {
      const game = getGame();
      if (game.bossSpawned) return;
      game.bossSpawned = true;
      const difficulty = floorDifficulty(game.towerFloor);
      const superBoss = game.towerFloor % 5 === 0;
      const selectedAbilities = chooseBossAbilities(superBoss ? superBossAbilityCount : normalBossAbilityCount);
      const bossKind = selectedAbilities[0] || fallbackAbility;
      const bossHp = (bossBaseHp + game.kills * bossHpPerKill) * difficulty.hp;
      const landingX = 72 + Math.random() * (canvas.width - 144);
      const landingY = 90 + Math.random() * (canvas.height - 180);
      const sideEntry = landingX < sideEntryMargin || landingX > canvas.width - sideEntryMargin;
      const startX = sideEntry ? (landingX < canvas.width / 2 ? -entryOffsetX : canvas.width + entryOffsetX) : landingX;
      const startY = sideEntry ? landingY : -entryOffsetY;
      if (!sideEntry) {
        const drop = bossConfig.drop || {};
        game.bossAttacks.push({
          type: "boss_drop",
          x: landingX,
          y: landingY,
          radius: superBoss ? drop.superRadius : drop.radius,
          damage: (superBoss ? drop.superDamage : drop.damage) * difficulty.damage,
          age: 0,
          windup: dropWindup,
          hit: false,
        });
      }
      game.bossSpawnNotice = {
        text: superBoss ? "SUPER BOSS INCOMING" : "BOSS INCOMING",
        life: bossNoticeLife,
        maxLife: bossNoticeLife,
      };
      onBossSpawn?.({ superBoss, abilities: selectedAbilities });
      const turretBoss = hasAbility(selectedAbilities, "turret");
      const turretCooldown = turretBoss ? scaledProjectileCooldown(bossAbilities.turret.projectileCooldown, game) : 0;
      const turretSpeed = turretBoss ? scaledProjectileSpeed(bossAbilities.turret.projectileSpeed, game) : 0;
      const boss = {
        boss: true,
        superBoss,
        bossKind,
        bossAbilities: selectedAbilities,
        assetId: "boss",
        color: bossColor(selectedAbilities),
        x: startX,
        y: startY,
        startX,
        startY,
        landingX,
        landingY,
        dropTimer: sideEntry ? 0 : dropWindup,
        dropWindup,
        radius: 38,
        hp: superBoss ? bossHp * superBossHpMultiplier : bossHp,
        maxHp: superBoss ? bossHp * superBossHpMultiplier : bossHp,
        speed: bossSpeed(selectedAbilities),
        damage: bossTouchDamage * difficulty.damage,
        touchCooldown: bossTouchCooldown,
        touchTimer: 0,
        attackRange: turretBoss ? bossAbilities.turret.attackRange : 0,
        projectileCooldown: turretCooldown,
        projectileSpeed: turretSpeed,
        projectileDamage: (superBoss ? bossAbilities.turret.superProjectileDamage : bossAbilities.turret.projectileDamage) * difficulty.damage,
        projectileColor: turretBoss ? behaviorSystem.resolveBossProjectileColor(bossAbilities.turret) : undefined,
        shootTimer: turretBoss ? bossAbilities.turret.initialShootTimer / projectileFireRateScale(game) : 0,
        animTime: 0,
        attackVisualTimer: 0,
        vx: 0,
        vy: 0,
      };
      const cooldown = nextBossAttackCooldown(boss);
      game.bossAttackTimer = cooldown;
      game.bossAttackCooldownMax = cooldown;
      game.enemies.push(boss);
    }

    function projectileFireRateScale(game) {
      const floor = Math.max(1, game?.towerFloor || 1);
      const base = projectileScaling.fireRateBase || 0.68;
      const perFloor = projectileScaling.fireRatePerFloor || 0.07;
      const max = projectileScaling.fireRateMax || 1.35;
      return Math.min(max, base + (floor - 1) * perFloor);
    }

    function projectileSpeedScale(game) {
      const floor = Math.max(1, game?.towerFloor || 1);
      const base = projectileScaling.speedBase || 0.72;
      const perFloor = projectileScaling.speedPerFloor || 0.06;
      const max = projectileScaling.speedMax || 1.35;
      return Math.min(max, base + (floor - 1) * perFloor);
    }

    function scaledProjectileCooldown(cooldown, game) {
      if (!cooldown) return 0;
      return cooldown / projectileFireRateScale(game);
    }

    function scaledProjectileSpeed(speed, game) {
      if (!speed) return 0;
      return speed * projectileSpeedScale(game);
    }

    function bossColor(abilities) {
      const priority = bossKinds.slice().reverse().find((ability) => hasAbility(abilities, ability));
      return bossAbilities[priority]?.color || "#ff4f8b";
    }

    function bossSpeed(abilities) {
      if (hasAbility(abilities, "turret")) return bossAbilities.turret.speed;
      if (hasAbility(abilities, "charger")) return bossAbilities.charger.speed;
      return bossAbilities.warden?.speed || 42;
    }

    function hasAbility(abilities, ability) {
      return abilities.includes(ability);
    }

    function chooseBossAbilities(count) {
      const available = [...bossKinds];
      const abilities = [];
      while (abilities.length < count && available.length) {
        const index = Math.floor(Math.random() * available.length);
        abilities.push(available.splice(index, 1)[0]);
      }
      return abilities;
    }

    function updateBossSpecials(dt) {
      const game = getGame();
      if (game.bossSpawnNotice) {
        game.bossSpawnNotice.life -= dt;
        if (game.bossSpawnNotice.life <= 0) game.bossSpawnNotice = null;
      }
      behaviorSystem.updateBossAttacks(dt);
      const boss = game.enemies.find((enemy) => enemy.boss);
      if (!boss || boss.dropTimer > 0) return;
      game.bossAttackTimer -= dt;
      if (game.bossAttackTimer <= 0) {
        const chargerBoss = hasBossAbility(boss, "charger");
        const wardenBoss = hasBossAbility(boss, "warden");
        if (chargerBoss) {
          behaviorSystem.startBossCharge(boss);
        }
        if (wardenBoss) {
          const shockwave = bossAbilities.warden.shockwave;
          game.bossAttacks.push({
            type: "shockwave",
            x: boss.x,
            y: boss.y,
            radius: shockwave.radius,
            damage: shockwave.damage,
            age: 0,
            windup: shockwave.windup,
            hit: false,
          });
        }
        game.bossAttackTimer = nextBossAttackCooldown(boss);
        game.bossAttackCooldownMax = game.bossAttackTimer;
      }
    }

    function nextBossAttackCooldown(boss) {
      const activeCooldowns = boss.bossAbilities
        .map((ability) => bossAbilities[ability]?.attackCooldown)
        .filter(Number.isFinite);
      return Math.min(...activeCooldowns, bossConfig.defaultAttackCooldown || 3.2);
    }

    function hasBossAbility(boss, ability) {
      return boss.bossAbilities?.includes(ability) || boss.bossKind === ability;
    }

    return {
      resolveBossProjectileColor: behaviorSystem.resolveBossProjectileColor,
      resolveEnemyProjectileColor: behaviorSystem.resolveEnemyProjectileColor,
      spawnEnemies: spawnSystem.spawnEnemies,
      spawnBoss,
      updateBossSpecials,
      updateEnemies: behaviorSystem.updateEnemies,
      updateEnemyBolts: behaviorSystem.updateEnemyBolts,
    };
  }

  const MODULE_NATIVE_ENEMY_BEHAVIOR_SLOTS = Object.freeze(["enemyBehaviors"]);

  const MODULE_NATIVE_ENEMY_BEHAVIOR_PROOF_SLOTS = Object.freeze(["createEnemyBehaviorSystem"]);

  /**
   * @param {any} [options]
   */
  function createEnemyBehaviorSystem({
    canvas,
    bossAbilities = {},
    boltConfig = {},
    getGame,
    distance,
    clamp,
    damagePlayer,
  } = {}) {
    const safeProjectileColor = "#b794ff";

    function resolveEnemyProjectileColor(enemyType) {
      return firstColor(
        enemyType?.projectileColor,
        enemyType?.spriteAccentColor,
        enemyType?.accentColor,
        enemyType?.color,
        safeProjectileColor
      );
    }

    function resolveBossProjectileColor(bossAbility) {
      return firstColor(
        bossAbility?.projectileColor,
        bossAbility?.spriteAccentColor,
        bossAbility?.accentColor,
        bossAbility?.color,
        safeProjectileColor
      );
    }

    function firstColor(...colors) {
      return colors.find((color) => typeof color === "string" && color.trim()) || safeProjectileColor;
    }

    function updateEnemies(dt) {
      const game = getGame();
      const p = game.player;
      game.enemies.forEach((enemy) => {
        const previousX = enemy.x;
        const previousY = enemy.y;
        enemy.animTime = (enemy.animTime || 0) + dt;
        enemy.attackVisualTimer = Math.max(0, (enemy.attackVisualTimer || 0) - dt);
        if (enemy.boss && enemy.dropTimer > 0) {
          enemy.dropTimer = Math.max(0, enemy.dropTimer - dt);
          const progress = 1 - enemy.dropTimer / enemy.dropWindup;
          enemy.x = enemy.startX + (enemy.landingX - enemy.startX) * progress;
          enemy.y = enemy.startY + (enemy.landingY - enemy.startY) * progress;
          updateEnemyVelocity(enemy, previousX, previousY, dt);
          return;
        }
        const dx = p.x - enemy.x;
        const dy = p.y - enemy.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        if (hasBossAbility(enemy, "charger") && updateBossCharge(enemy, dt)) {
          updateEnemyVelocity(enemy, previousX, previousY, dt);
          applyEnemyTouch(enemy, dt);
          return;
        }
        const ranged = enemy.attackRange && enemy.projectileCooldown;
        if (!ranged || dist > enemy.attackRange * 0.72) {
          enemy.x += (dx / dist) * enemy.speed * dt;
          enemy.y += (dy / dist) * enemy.speed * dt;
        }
        if (ranged && dist <= enemy.attackRange) {
          enemy.shootTimer -= dt;
          if (enemy.shootTimer <= 0) {
            enemy.shootTimer = enemy.projectileCooldown;
            spawnEnemyBolt(enemy, dx / dist, dy / dist);
          }
        }
        applyEnemyTouch(enemy, dt);
        updateEnemyVelocity(enemy, previousX, previousY, dt);
      });
    }

    function updateBossCharge(boss, dt) {
      if (!boss.chargeState) return false;
      const game = getGame();
      boss.chargeTimer -= dt;
      if (boss.chargeState === "windup") {
        if (boss.chargeTimer <= 0) {
          boss.chargeState = "charging";
          boss.chargeTimer = bossAbilities.charger.duration;
        }
        return true;
      }
      boss.x = clamp(
        boss.x + boss.chargeDirX * boss.chargeSpeed * dt,
        boss.radius,
        canvas.width - boss.radius
      );
      boss.y = clamp(
        boss.y + boss.chargeDirY * boss.chargeSpeed * dt,
        boss.radius,
        canvas.height - boss.radius
      );
      if (boss.chargeTimer <= 0) {
        const slash = bossAbilities.charger.slash;
        game.bossAttacks.push({
          type: "boss_slash",
          x: boss.x + boss.chargeDirX * slash.offset,
          y: boss.y + boss.chargeDirY * slash.offset,
          dirX: boss.chargeDirX,
          dirY: boss.chargeDirY,
          arc: Math.PI * slash.arcPi,
          radius: boss.superBoss ? slash.superRadius : slash.radius,
          damage: boss.damage * (boss.superBoss ? slash.superDamageMultiplier : slash.damageMultiplier),
          age: 0,
          windup: slash.windup,
          hit: false,
        });
        boss.chargeState = "";
      }
      return true;
    }

    function startBossCharge(boss) {
      const game = getGame();
      const p = game.player;
      const dx = p.x - boss.x;
      const dy = p.y - boss.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      boss.chargeState = "windup";
      boss.chargeTimer = bossAbilities.charger.windup;
      boss.chargeDirX = dx / dist;
      boss.chargeDirY = dy / dist;
      boss.chargeSpeed = boss.superBoss
        ? bossAbilities.charger.superChargeSpeed
        : bossAbilities.charger.chargeSpeed;
    }

    function updateBossAttacks(dt) {
      const game = getGame();
      const p = game.player;
      game.bossAttacks.forEach((attack) => {
        attack.age += dt;
        if (!attack.hit && attack.age >= attack.windup) {
          attack.hit = true;
          if (
            attack.type === "boss_slash"
              ? playerInSlash(p, attack)
              : distance(p, attack) <= p.radius + attack.radius
          ) {
            damagePlayer?.(attack.damage, { type: attack.type, attack });
          }
        }
      });
      game.bossAttacks = game.bossAttacks.filter((attack) => attack.age <= attack.windup + 0.35);
    }

    function playerInSlash(player, attack) {
      const dx = player.x - attack.x;
      const dy = player.y - attack.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const dot = (dx / dist) * attack.dirX + (dy / dist) * attack.dirY;
      return dist <= attack.radius + player.radius && dot >= Math.cos(attack.arc / 2);
    }

    function applyEnemyTouch(enemy, dt) {
      const game = getGame();
      const p = game.player;
      enemy.touchTimer -= dt;
      if (distance(enemy, p) < p.radius + enemy.radius && enemy.touchTimer <= 0) {
        damagePlayer?.(enemy.damage, { type: "touch", enemy });
        enemy.touchTimer = enemy.touchCooldown;
      }
    }

    function spawnEnemyBolt(enemy, dirX, dirY) {
      const game = getGame();
      const projectileColor = resolveEnemyProjectileColor(enemy);
      enemy.attackVisualTimer = 0.26;
      game.enemyBolts.push({
        x: enemy.x,
        y: enemy.y,
        vx: dirX * enemy.projectileSpeed,
        vy: dirY * enemy.projectileSpeed,
        radius: boltConfig.radius || 5,
        damage: enemy.projectileDamage,
        life: boltConfig.life || 2.2,
        maxLife: boltConfig.life || 2.2,
        color: projectileColor,
        trailColor: projectileColor,
        glowColor: projectileColor,
      });
    }

    function updateEnemyVelocity(enemy, previousX, previousY, dt) {
      const divisor = Math.max(dt, 0.0001);
      enemy.vx = (enemy.x - previousX) / divisor;
      enemy.vy = (enemy.y - previousY) / divisor;
    }

    function updateEnemyBolts(dt) {
      const game = getGame();
      const p = game.player;
      game.enemyBolts.forEach((bolt) => {
        bolt.x += bolt.vx * dt;
        bolt.y += bolt.vy * dt;
        bolt.life -= dt;
        if (distance(bolt, p) <= bolt.radius + p.radius) {
          if (p.projectileBlockReady) {
            p.projectileBlockReady = false;
            p.projectileBlockCharge = 0;
          } else {
            damagePlayer?.(bolt.damage, { type: "projectile", bolt });
          }
          bolt.life = 0;
        }
      });
      game.enemyBolts = game.enemyBolts.filter(
        (bolt) =>
          bolt.life > 0 &&
          bolt.x > -24 &&
          bolt.x < canvas.width + 24 &&
          bolt.y > -24 &&
          bolt.y < canvas.height + 24
      );
    }

    function hasBossAbility(boss, ability) {
      return boss.bossAbilities?.includes(ability) || boss.bossKind === ability;
    }

    return {
      resolveBossProjectileColor,
      resolveEnemyProjectileColor,
      startBossCharge,
      updateBossAttacks,
      updateEnemies,
      updateEnemyBolts,
    };
  }

  const MODULE_NATIVE_ENEMY_SPAWN_SLOTS = Object.freeze(["enemySpawning"]);

  const MODULE_NATIVE_ENEMY_SPAWN_PROOF_SLOTS = Object.freeze(["createEnemySpawnSystem"]);

  /**
   * @param {any} [options]
   */
  function createEnemySpawnSystem({
    canvas,
    enemyTypes,
    levelDefs = [],
    getActiveFloorDef,
    getGame,
    floorDifficulty,
    spawnEntryMargin = 72,
    scaledProjectileCooldown,
    scaledProjectileSpeed,
    resolveEnemyProjectileColor,
  } = {}) {
    const enemyTypeById = Object.fromEntries(enemyTypes.map((enemy) => [enemy.id, enemy]));
    const orderedLevelDefs = [...levelDefs].sort((a, b) => a.startsAt - b.startsAt);

    function spawnEnemies(dt) {
      const game = getGame();
      game.spawnTimer -= dt;
      if (game.spawnTimer > 0) return;
      const level = activeLevelDef();
      const levelSpawnRate = level?.spawnRateMultiplier || 1;
      const spawnCount = Math.max(1, Math.floor(level?.spawnCount || 2));
      game.spawnTimer = Math.max(
        0.32,
        (1.1 - game.elapsed / 150) / (floorDifficulty(game.towerFloor).spawnRate * levelSpawnRate)
      );
      const availableTypes = levelEnemyTypes(level);
      if (!availableTypes.length) return;
      spawnPatternPositions(spawnCount).forEach((position, index) => {
        const type = chooseEnemyType(index, availableTypes);
        spawnEnemy(type, position);
      });
    }

    function activeLevelDef() {
      const resolved = getActiveFloorDef?.();
      if (resolved) return resolved;
      const game = getGame();
      return orderedLevelDefs.reduce(
        (active, level) => (game.elapsed >= level.startsAt ? level : active),
        null
      );
    }

    function levelEnemyTypes(level) {
      if (!level?.enemyIds?.length) return availableEnemyTypes();
      const game = getGame();
      const configured = level.enemyIds
        .map((id) => enemyTypeById[id])
        .filter((type) => type && isEnemyAvailable(type, game));
      return configured.length ? configured : availableEnemyTypes();
    }

    function availableEnemyTypes() {
      const game = getGame();
      return enemyTypes
        .slice(0, Math.min(enemyTypes.length, 1 + Math.floor(game.elapsed / 30)))
        .filter((type) => isEnemyAvailable(type, game));
    }

    function isEnemyAvailable(type, game) {
      return !type.minTowerFloor || game.towerFloor >= type.minTowerFloor;
    }

    function chooseEnemyType(offset = 0, available = availableEnemyTypes()) {
      if (!available.length) return null;
      return available[(Math.floor(Math.random() * available.length) + offset) % available.length];
    }

    function spawnPatternPositions(count) {
      const game = getGame();
      const baseAngle = Math.random() * Math.PI * 2;
      const pattern = Math.floor(Math.random() * 4);
      return Array.from({ length: count }, (_, index) => {
        const mirrored = index % 2 === 0 ? 0 : Math.PI;
        const angleOffsets = [mirrored, index * 0.85, (index - 0.5) * 0.55, index * 1.7];
        const angle = baseAngle + angleOffsets[pattern];
        return offscreenSpawnPosition(game.player, angle);
      });
    }

    function offscreenSpawnPosition(player, angle) {
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      const edgeDistance = distanceToExpandedCanvasEdge(player, dirX, dirY);
      return {
        x: player.x + dirX * edgeDistance,
        y: player.y + dirY * edgeDistance,
      };
    }

    function distanceToExpandedCanvasEdge(player, dirX, dirY) {
      const edgeDistances = [];
      if (Math.abs(dirX) > 0.0001) {
        edgeDistances.push(
          ((dirX > 0 ? canvas.width + spawnEntryMargin : -spawnEntryMargin) - player.x) / dirX
        );
      }
      if (Math.abs(dirY) > 0.0001) {
        edgeDistances.push(
          ((dirY > 0 ? canvas.height + spawnEntryMargin : -spawnEntryMargin) - player.y) / dirY
        );
      }
      return Math.min(...edgeDistances.filter((value) => value > 0));
    }

    function spawnEnemy(type, position) {
      if (!type) return;
      const game = getGame();
      const difficulty = floorDifficulty(game.towerFloor);
      const cooldown = scaledProjectileCooldown(type.projectileCooldown || 0, game);
      const speed = scaledProjectileSpeed(type.projectileSpeed || 0, game);
      game.enemies.push({
        type: type.id,
        name: type.name,
        color: type.color,
        assetId: type.assetId || type.id,
        towerFloor: game.towerFloor,
        x: position.x,
        y: position.y,
        radius: type.radius,
        hp: type.hp,
        speed: type.speed,
        damage: type.damage * difficulty.damage,
        touchCooldown: type.touchCooldown,
        xp: type.xp,
        touchTimer: 0,
        attackRange: type.attackRange || 0,
        projectileCooldown: cooldown,
        projectileSpeed: speed,
        projectileDamage: (type.projectileDamage || type.damage) * difficulty.damage,
        projectileColor: resolveEnemyProjectileColor?.(type) || type.projectileColor || type.color,
        shootTimer: Math.random() * cooldown,
        animTime: Math.random(),
        attackVisualTimer: 0,
        vx: 0,
        vy: 0,
      });
    }

    return {
      spawnEnemies,
    };
  }

  function createGameBannerSystem({ ui, getSave, persist }) {
    /** @type {ReturnType<typeof setTimeout> | number} */
    let bannerTimer = 0;

    function hasSeenBanner(id) {
      return getSave().seenBanners?.includes(id);
    }

    function markBannerSeen(id) {
      const save = getSave();
      save.seenBanners = [...new Set([...(save.seenBanners || []), id])];
      persist();
    }

    function showBanner(message, duration = 5200) {
      if (!ui.questBanner || !message) return;
      ui.questBanner.textContent = message;
      ui.questBanner.classList.remove("hidden");
      clearTimeout(bannerTimer);
      if (duration > 0) {
        bannerTimer = setTimeout(() => ui.questBanner.classList.add("hidden"), duration);
      }
    }

    function showMovementGateBanner() {
      showBanner("Click/tap to move", 0);
    }

    function hideMovementGateBanner() {
      if (!ui.questBanner || ui.questBanner.textContent !== "Click/tap to move") return;
      clearTimeout(bannerTimer);
      ui.questBanner.classList.add("hidden");
    }

    function showOnceBanner(id, message, duration) {
      if (hasSeenBanner(id)) return false;
      markBannerSeen(id);
      showBanner(message, duration);
      return true;
    }

    function showQuestBanner(quest, reward) {
      if (!quest) return;
      const firstQuest = !hasSeenBanner("first_quest_completion");
      if (firstQuest) {
        markBannerSeen("first_quest_completion");
      }
      showBanner(
        firstQuest
          ? `${quest.name} complete +${reward} QP. Open Menu > Rewards to spend Quest Points and review quests.`
          : `${quest.name} complete +${reward} QP`,
      );
    }

    return {
      hideMovementGateBanner,
      showBanner,
      showMovementGateBanner,
      showOnceBanner,
      showQuestBanner,
    };
  }

  function createGameRuntimeController({
    canvas,
    ui,
    documentRef,
    globalRef,
    getGame,
    setGame,
    getSave,
    setSave,
    saveSystem,
    shellUi,
    shopSystem,
    runUi,
    debugSystem,
    spriteSystem,
    bannerSystem,
    bindMovementInput,
    persist,
    renderMeta,
    loop,
  }) {
    if (typeof bindMovementInput !== "function") {
      throw new Error("Missing Tap Survivor runtime dependency: bindMovementInput must be a function");
    }

    let gameSpeed = 1;

    function getGameSpeed() {
      return gameSpeed;
    }

    function setGameSpeed(speed) {
      if (![1, 2, 5].includes(speed)) return;
      gameSpeed = speed;
      documentRef.body.dataset.gameSpeed = String(speed);
      ui.speedButtons.forEach((button) => {
        const active = Number(button.dataset.speed) === speed;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      runUi.updateRunHud();
    }

    function resetSave() {
      const resetAfterRemove = () => {
        setSave(saveSystem.defaultSave());
        setGame(null);
        runUi.hideEndScreen();
        ui.levelUp.classList.add("hidden");
        shopSystem.closeShop();
        shellUi.closeRunMenu(false);
        shellUi.showTitleScreen();
        persist();
        renderMeta();
      };
      const removed = saveSystem.removeSave();
      if (removed && typeof removed.then === "function") {
        void removed.then(resetAfterRemove);
      } else {
        resetAfterRemove();
      }
    }

    function startRuntime() {
      shellUi.bind();
      debugSystem.bind();
      setGameSpeed(1);
      ui.speedButtons.forEach((button) => {
        button.addEventListener?.("click", () => {
          setGameSpeed(Number(button.dataset.speed));
        });
      });
      bindLifecycleFlush();

      bindMovementInput({
        canvas,
        getGame,
      });
      bindFirstMoveGate();

      spriteSystem.loadSprites();
      renderMeta();
      globalRef.requestAnimationFrame(loop);
    }

    function bindFirstMoveGate() {
      const clearGate = (event) => {
        const game = getGame();
        if (!game?.running || game.paused || !game.awaitingFirstMoveInput) return;
        const rect = canvas.getBoundingClientRect();
        const point = event.touches ? event.touches[0] : event;
        game.player.targetX = ((point.clientX - rect.left) / rect.width) * canvas.width;
        game.player.targetY = ((point.clientY - rect.top) / rect.height) * canvas.height;
        game.awaitingFirstMoveInput = false;
        bannerSystem.hideMovementGateBanner();
      };
      canvas.addEventListener("mousedown", clearGate);
      canvas.addEventListener("touchstart", clearGate);
    }

    function bindLifecycleFlush() {
      const flush = () => {
        void persist();
      };
      if (documentRef?.addEventListener) {
        documentRef.addEventListener("visibilitychange", () => {
          if (documentRef.visibilityState === "hidden") flush();
        });
      }
      globalRef.addEventListener?.("pagehide", flush);
      globalRef.addEventListener?.("beforeunload", flush);
      bindCapacitorAppLifecycle(flush);
    }

    function bindCapacitorAppLifecycle(flush) {
      const app = globalRef.Capacitor?.Plugins?.App;
      if (!app?.addListener) return;
      try {
        const listener = app.addListener("appStateChange", ({ isActive }) => {
          if (!isActive) flush();
        });
        if (listener?.catch) listener.catch(() => {});
      } catch {
        // Browser and test runtimes may not expose Capacitor App events.
      }
    }

    function initializeRuntime() {
      const loaded = saveSystem.loadSave();
      if (loaded && typeof loaded.then === "function") {
        void loaded
          .then((loadedSave) => {
            setSave(loadedSave);
            startRuntime();
          })
          .catch(() => {
            setSave(saveSystem.defaultSave());
            startRuntime();
          });
        return;
      }
      setSave(loaded || getSave());
      startRuntime();
    }

    return {
      getGameSpeed,
      setGameSpeed,
      resetSave,
      initializeRuntime,
    };
  }

  function setTargetFromEvent({ event, canvas, game }) {
    if (!game || !game.running || game.paused) return;

    const rect = canvas.getBoundingClientRect();
    const point = event.touches ? event.touches[0] : event;
    game.player.targetX = ((point.clientX - rect.left) / rect.width) * canvas.width;
    game.player.targetY = ((point.clientY - rect.top) / rect.height) * canvas.height;
  }

  function bindMovementInput({ canvas, getGame }) {
    function setTarget(event) {
      setTargetFromEvent({ event, canvas, game: getGame?.() });
    }

    canvas.addEventListener?.("mousedown", setTarget);
    canvas.addEventListener?.("mousemove", (event) => {
      if (event.buttons === 1) setTarget(event);
    });
    canvas.addEventListener?.("touchstart", (event) => {
      event.preventDefault?.();
      setTarget(event);
    });
    canvas.addEventListener?.("touchmove", (event) => {
      event.preventDefault?.();
      setTarget(event);
    });

    return { setTarget };
  }

  /**
   * @typedef {{ src?: string, path?: string } | string} SpriteBackgroundDef
   * @typedef {Record<string, SpriteBackgroundDef>} SpriteBackgroundDefs
   * @typedef {{ backgrounds?: SpriteBackgroundDefs }} SpriteDefs
   * @typedef {{
   *   id?: string,
   *   name?: string,
   *   floorIds?: string[],
   *   backgroundAsset?: string | SpriteBackgroundDef,
   *   modifiers?: Record<string, unknown>
   * }} MapDef
   * @typedef {{
   *   id?: string,
   *   startsAt?: number,
   *   backgroundAsset?: string | SpriteBackgroundDef,
   *   modifiers?: Record<string, unknown>
   * }} LevelDef
   * @typedef {{
   *   map: MapDef,
   *   floor: LevelDef | null,
   *   modifiers: Record<string, unknown>,
   *   background: { id: string, spriteId: string, asset: string | SpriteBackgroundDef },
   *   floorPool: LevelDef[]
   * }} ResolvedMapState
   * @typedef {{
   *   towerFloor?: number,
   *   elapsed?: number,
   *   activeMap?: MapDef,
   *   activeFloor?: LevelDef | null,
   *   mapModifiers?: Record<string, unknown>,
   *   background?: { id: string, spriteId: string, asset: string | SpriteBackgroundDef },
   *   floorPool?: LevelDef[]
   * }} MapGame
   */

  /**
   * @param {{ mapDefs?: MapDef[], levelDefs?: LevelDef[], spriteDefs?: SpriteDefs }} options
   * @returns {{
   *   applyToGame(game: MapGame | null | undefined): ResolvedMapState | null,
   *   resolve(input?: { towerFloor?: number, elapsed?: number }): ResolvedMapState
   * }}
   */
  function createMapSystem({ mapDefs = [], levelDefs = [], spriteDefs = {} }) {
    const backgroundSprites = spriteDefs.backgrounds || {};
    const fallbackBackgroundId = backgroundSprites.tower_floor ? "tower_floor" : "";
    const fallbackMap = {
      id: "default_tower",
      name: "Default Tower",
      floorIds: levelDefs.map((level) => level.id).filter(Boolean),
      backgroundAsset: backgroundSprites[fallbackBackgroundId] || "",
      modifiers: {},
    };

    function usableMaps() {
      const maps = (mapDefs || []).filter((map) => map?.id);
      return maps.length ? maps : [fallbackMap];
    }

    function floorPoolForMap(map) {
      const ids = new Set(map?.floorIds || []);
      const floors = ids.size ? levelDefs.filter((level) => ids.has(level.id)) : levelDefs;
      return floors.length ? floors : levelDefs;
    }

    function resolveMap(towerFloor = 1) {
      const maps = usableMaps();
      const index = Math.max(0, Math.floor((Math.max(1, towerFloor) - 1) % maps.length));
      return maps[index] || fallbackMap;
    }

    function resolveFloor({ map, elapsed = 0 }) {
      const pool = floorPoolForMap(map).slice().sort((left, right) => (left.startsAt || 0) - (right.startsAt || 0));
      return pool.reduce((active, floor) => (elapsed >= (floor.startsAt || 0) ? floor : active), pool[0] || null);
    }

    function backgroundIdFor(entry) {
      const asset = entry?.backgroundAsset;
      if (!asset) return fallbackBackgroundId;
      const direct = Object.entries(backgroundSprites).find(([, value]) => {
        if (typeof value === "string") return value === asset;
        return value?.src === asset || value?.path === asset;
      });
      return direct?.[0] || fallbackBackgroundId;
    }

    function resolve({ towerFloor = 1, elapsed = 0 } = {}) {
      const map = resolveMap(towerFloor);
      const floor = resolveFloor({ map, elapsed });
      const backgroundId = backgroundIdFor(floor) || backgroundIdFor(map);
      return {
        map,
        floor,
        modifiers: { ...(map?.modifiers || {}), ...(floor?.modifiers || {}) },
        background: {
          id: backgroundId,
          spriteId: backgroundId ? `background:${backgroundId}` : "",
          asset: floor?.backgroundAsset || map?.backgroundAsset || "",
        },
        floorPool: floorPoolForMap(map),
      };
    }

    function applyToGame(game) {
      if (!game) return null;
      const resolved = resolve({ towerFloor: game.towerFloor || 1, elapsed: game.elapsed || 0 });
      game.activeMap = resolved.map;
      game.activeFloor = resolved.floor;
      game.mapModifiers = resolved.modifiers;
      game.background = resolved.background;
      game.floorPool = resolved.floorPool;
      return resolved;
    }

    return {
      applyToGame,
      resolve,
    };
  }

  const CURRENT_SAVE_VERSION = 3;

  function createDefaultSave({ starterQuestIds }) {
    return {
      saveVersion: CURRENT_SAVE_VERSION,
      coins: 0,
      towerFloor: 1,
      questPoints: 0,
      totalQuestPoints: 0,
      unlockedNodes: [],
      unlockedWeapons: ["spark_bolt"],
      selectedStartingWeapon: "spark_bolt",
      upgradeTiers: {},
      unlockedUpgrades: [],
      shopPurchases: {},
      seenBanners: [],
      unlockedRelics: [],
      equippedRelics: [],
      activeQuests: [...starterQuestIds],
      completedQuests: [],
      questProgress: {},
    };
  }

  const DEFAULT_CURRENT_SAVE_VERSION = 3;

  /**
   * Minimal persisted save shape used while stepping old saves forward.
   *
   * @typedef {Record<string, unknown> & {
   *   saveVersion?: number,
   *   shopPurchases?: Record<string, number>,
   *   seenBanners?: string[]
   * }} MigratingSave
   */

  /** @type {Record<number, (save: MigratingSave) => MigratingSave>} */
  const saveMigrations = {
    2(save) {
      return {
        ...save,
        shopPurchases: save.shopPurchases || {},
      };
    },
    3(save) {
      return {
        ...save,
        seenBanners: save.seenBanners || [],
      };
    },
  };

  /**
   * Guard for plain object save payloads before migration copies fields.
   *
   * @param {unknown} value
   * @returns {value is MigratingSave}
   */
  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  /**
   * Migrates an unknown persisted save payload to the current save schema version.
   *
   * @param {unknown} input
   * @param {{ currentSaveVersion?: number }} [options]
   * @returns {MigratingSave}
   */
  function migrateSave(input, options = {}) {
    const currentSaveVersion =
      options && typeof options === "object" && Number.isFinite(options.currentSaveVersion)
        ? options.currentSaveVersion
        : DEFAULT_CURRENT_SAVE_VERSION;
    let migrated = { ...(isPlainObject(input) ? input : {}) };
    let version = Math.max(1, Math.floor(migrated.saveVersion || 1));

    while (version < currentSaveVersion) {
      version += 1;
      migrated = saveMigrations[version]?.(migrated) || migrated;
      migrated.saveVersion = version;
    }

    migrated.saveVersion = currentSaveVersion;
    return migrated;
  }

  /**
   * @typedef {Record<string, unknown>} SaveData
   * @typedef {{ setCorruptBackupRaw?: (raw: string) => void }} CorruptBackupStorage
   * @typedef {() => SaveData} DefaultSaveFn
   * @typedef {(save: SaveData) => SaveData} NormalizeAndMigrateSaveFn
   * @typedef {{
   *   fromRaw(raw: string | null | undefined): SaveData,
   *   getLastLoadWarning(): string | null,
   *   storageReadFailed(): SaveData
   * }} SaveLoadHandler
   */

  /**
   * @param {{
   *   defaultSave: DefaultSaveFn,
   *   normalizeAndMigrateSave: NormalizeAndMigrateSaveFn,
   *   storage?: CorruptBackupStorage
   * }} options
   * @returns {SaveLoadHandler}
   */
  function createSaveLoadHandler({ defaultSave, normalizeAndMigrateSave, storage }) {
    let lastLoadWarning = null;

    function fromRaw(raw) {
      lastLoadWarning = null;

      if (!raw) {
        return normalizeAndMigrateSave({});
      }

      try {
        return normalizeAndMigrateSave(JSON.parse(raw));
      } catch {
        lastLoadWarning = "corrupt-save";
        storage?.setCorruptBackupRaw?.(raw);
        return defaultSave();
      }
    }

    function storageReadFailed() {
      lastLoadWarning = "storage-read-failed";
      return defaultSave();
    }

    function getLastLoadWarning() {
      return lastLoadWarning;
    }

    return {
      fromRaw,
      getLastLoadWarning,
      storageReadFailed,
    };
  }

  const DEFAULT_SAVE_NORMALIZE_VERSION = 3;

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function arrayValue(value) {
    return Array.isArray(value) ? value : [];
  }

  function objectValue(value) {
    return isPlainObject(value) ? value : {};
  }

  function createSaveNormalizer({
    currentSaveVersion = DEFAULT_SAVE_NORMALIZE_VERSION,
    defaultSave,
    isPlainObject: isPlainObjectValue = isPlainObject,
    questDefs,
    weaponUnlocks,
    upgradeDefs,
    shopItemById,
    questOpenIds,
  }) {
    const questDefinitions = isPlainObjectValue(questDefs) ? questDefs : {};
    const knownQuestIds = new Set(Object.keys(questDefinitions));
    const knownWeaponIds = new Set([
      "spark_bolt",
      ...arrayValue(weaponUnlocks)
        .map((unlock) => unlock.weaponId)
        .filter(Boolean),
    ]);

    function normalizeShopPurchases(purchases) {
      const normalizedPurchases = {};

      Object.entries(objectValue(purchases)).forEach(([id, rawTier]) => {
        const item = shopItemById.get(id);
        if (shopItemById.size && !item) return;

        const maxTier = Math.max(0, Math.floor(item?.maxTier || rawTier || 0));
        const tier = Math.min(maxTier, Math.max(0, Math.floor(rawTier || 0)));
        if (tier > 0) normalizedPurchases[id] = tier;
      });

      return normalizedPurchases;
    }

    function normalizeQuestIds(value) {
      return [
        ...new Set(
          arrayValue(value).filter(
            (questId) => typeof questId === "string" && knownQuestIds.has(questId)
          )
        ),
      ];
    }

    function normalizeQuestProgress(progress) {
      const normalizedProgress = {};

      Object.entries(objectValue(progress)).forEach(([questId, rawProgress]) => {
        const quest = questDefinitions[questId];
        if (!quest) return;
        const numericProgress = Number(rawProgress);
        if (!Number.isFinite(numericProgress)) return;
        const target = Number(quest.target);
        const upperBound = Number.isFinite(target) ? Math.max(0, target) : numericProgress;
        normalizedProgress[questId] = Math.min(upperBound, Math.max(0, numericProgress));
      });

      return normalizedProgress;
    }

    function nonNegativeInteger(value) {
      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? Math.max(0, Math.floor(numericValue)) : 0;
    }

    function normalizeSave(input) {
      const normalized = { ...defaultSave(), ...(isPlainObjectValue(input) ? input : {}) };
      normalized.saveVersion = currentSaveVersion;
      normalized.unlockedWeapons = [
        ...new Set(["spark_bolt", ...arrayValue(normalized.unlockedWeapons)]),
      ];
      normalized.selectedStartingWeapon = normalizeSelectedStartingWeapon(
        normalized.selectedStartingWeapon,
        normalized.unlockedWeapons
      );
      normalized.coins = Math.max(0, Math.floor(normalized.coins || 0));
      normalized.towerFloor = Math.max(1, Math.floor(normalized.towerFloor || 1));
      normalized.unlockedNodes = arrayValue(normalized.unlockedNodes);
      normalized.upgradeTiers = objectValue(normalized.upgradeTiers);
      normalized.shopPurchases = normalizeShopPurchases(normalized.shopPurchases);
      normalized.seenBanners = [...new Set(arrayValue(normalized.seenBanners))];
      normalized.unlockedRelics = [...new Set(arrayValue(normalized.unlockedRelics))];
      normalized.equippedRelics = [
        ...new Set(
          arrayValue(normalized.equippedRelics).length
            ? arrayValue(normalized.equippedRelics)
            : normalized.unlockedRelics
        ),
      ]
        .filter((id) => normalized.unlockedRelics.includes(id))
        .slice(0, 5);
      normalized.questPoints = nonNegativeInteger(normalized.questPoints);
      normalized.totalQuestPoints = Math.max(
        normalized.questPoints,
        nonNegativeInteger(normalized.totalQuestPoints)
      );
      normalized.completedQuests = normalizeQuestIds(normalized.completedQuests);
      const completedQuestIds = new Set(normalized.completedQuests);
      normalized.activeQuests = normalizeQuestIds(normalized.activeQuests).filter(
        (questId) => !completedQuestIds.has(questId)
      );
      normalized.questProgress = normalizeQuestProgress(normalized.questProgress);

      const ensureQuestOpen = (questId) => {
        if (!questId || !questDefinitions[questId]) return;
        if (
          !normalized.activeQuests.includes(questId) &&
          !normalized.completedQuests.includes(questId)
        ) {
          normalized.activeQuests.push(questId);
        }
        normalized.questProgress[questId] = normalized.questProgress[questId] || 0;
      };

      starterQuestAndUnlocks(normalized, ensureQuestOpen);

      normalized.unlockedUpgrades = Object.entries(normalized.upgradeTiers)
        .filter(([, tier]) => tier > 0)
        .map(([id]) => id);

      return normalized;
    }

    function normalizeSelectedStartingWeapon(value, unlockedWeapons) {
      if (
        typeof value === "string" &&
        knownWeaponIds.has(value) &&
        unlockedWeapons.includes(value)
      ) {
        return value;
      }
      return "spark_bolt";
    }

    function starterQuestAndUnlocks(normalized, ensureQuestOpen) {
      defaultSave().activeQuests.forEach((questId) => {
        ensureQuestOpen(questId);
      });

      normalized.completedQuests.forEach((questId) => {
        questOpenIds(questDefinitions[questId]).forEach(ensureQuestOpen);
      });

      normalized.unlockedNodes.forEach((nodeId) => {
        const unlock = weaponUnlocks.find((node) => node.id === nodeId);
        ensureQuestOpen(unlock?.opensQuest);
      });

      arrayValue(normalized.unlockedUpgrades).forEach((id) => {
        normalized.upgradeTiers[id] = Math.max(normalized.upgradeTiers[id] || 0, 1);
      });

      Object.entries(normalized.upgradeTiers).forEach(([upgradeId, tier]) => {
        if (tier > 0) {
          const upgrade = upgradeDefs.find((item) => item.id === upgradeId);
          ensureQuestOpen(upgrade?.opensQuest);
        }
      });
    }

    return {
      normalizeSave,
    };
  }

  function createSaveSystem({
    saveKey,
    legacySaveKey,
    saveNormalize,
    saveCorruption,
    saveDefaults,
    saveMigrations,
    starterQuestIds,
    questDefs,
    weaponUnlocks,
    upgradeDefs,
    shopItemDefs = [],
    questOpenIds,
    storage,
    storageAdapter,
  }) {
    const { createSaveNormalizer } = saveNormalize;
    const { createSaveLoadHandler } = saveCorruption;
    const { createDefaultSave } = saveDefaults;
    const { migrateSave } = saveMigrations;
    const currentSaveVersion = saveDefaults.CURRENT_SAVE_VERSION;
    const shopItemById = new Map(shopItemDefs.map((item) => [item.id, item]));
    const activeStorage =
      storageAdapter ||
      storage?.createStorageAdapter({
        saveKey,
        legacySaveKey,
      });

    function defaultSave() {
      return createDefaultSave({ starterQuestIds });
    }

    const { normalizeSave } = createSaveNormalizer({
      currentSaveVersion,
      defaultSave,
      isPlainObject: saveMigrations.isPlainObject,
      questDefs,
      weaponUnlocks,
      upgradeDefs,
      shopItemById,
      questOpenIds,
    });

    const saveLoadHandler = createSaveLoadHandler({
      defaultSave,
      normalizeAndMigrateSave,
      storage: activeStorage,
    });

    function loadSave() {
      try {
        const raw = activeStorage?.getSaveRaw?.();
        if (raw && typeof raw.then === "function") {
          return raw.then(saveLoadHandler.fromRaw).catch(saveLoadHandler.storageReadFailed);
        }

        return saveLoadHandler.fromRaw(raw);
      } catch {
        return saveLoadHandler.storageReadFailed();
      }
    }

    function normalizeAndMigrateSave(input) {
      return normalizeSave({
        ...defaultSave(),
        ...migrateSave(input, { currentSaveVersion }),
      });
    }

    function persist(save) {
      const unlockedUpgrades = Object.entries(save.upgradeTiers)
        .filter(([, tier]) => tier > 0)
        .map(([id]) => id);

      save.unlockedUpgrades = unlockedUpgrades;
      return activeStorage?.setSaveRaw?.(JSON.stringify(save)) ?? false;
    }

    function removeSave() {
      return activeStorage?.removeSaveRaw?.() ?? false;
    }

    function getLastLoadWarning() {
      return saveLoadHandler.getLastLoadWarning();
    }

    return {
      defaultSave,
      loadSave,
      getLastLoadWarning,
      normalizeSave,
      persist,
      removeSave,
    };
  }

  /**
   * @typedef {{
   *   weaponId?: string,
   *   runUpgradeId?: string,
   *   name?: string,
   *   [key: string]: unknown
   * }} LevelUpChoice
   * @typedef {{ shopPurchases?: Record<string, number> }} ChoiceSave
   * @typedef {(choice: LevelUpChoice) => number} ChoiceWeightFn
   */

  /**
   * @param {LevelUpChoice[]} choices
   * @returns {LevelUpChoice[]}
   */
  function shuffleChoices(choices) {
    return choices
      .map((choice) => ({ choice, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ choice }) => choice);
  }

  /**
   * @param {LevelUpChoice[]} choices
   * @param {ChoiceWeightFn} weightForChoice
   * @returns {LevelUpChoice[]}
   */
  function weightedChoices(choices, weightForChoice) {
    return choices
      .map((choice) => ({
        choice,
        sort: Math.random() / Math.max(1, weightForChoice(choice)),
      }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ choice }) => choice);
  }

  /**
   * @param {LevelUpChoice} choice
   * @returns {string}
   */
  function choiceId(choice) {
    return choice.weaponId ? `weapon:${choice.weaponId}` : `run:${choice.runUpgradeId || choice.name}`;
  }

  /**
   * @param {ChoiceSave} save
   * @returns {number}
   */
  function shopFocusBonus(save) {
    return (save.shopPurchases?.relic_compass || 0) * 0.5;
  }

  const MODULE_NATIVE_LEVEL_UP_SLOTS = Object.freeze(["levelUp"]);

  const MODULE_NATIVE_LEVEL_UP_PROOF_SLOTS = Object.freeze(["createLevelUpSystem"]);

  /**
   * @param {any} [options]
   */
  function createLevelUpSystem({
    documentRef,
    ui,
    assets,
    content,
    levelUpChoices,
    weaponDefs,
    runUpgradeDefs,
    relicDefs,
    getSave,
    getGame,
    getRunUpgradeTier,
    maxEquippedWeapons,
    activeQuestWeaponIds,
    playChoiceSfx,
  } = {}) {
    if (!documentRef || typeof documentRef.createElement !== "function") {
      throw new Error("Missing Tap Survivor native level-up dependency: documentRef");
    }
    const { choiceId, shopFocusBonus, weightedChoices } = levelUpChoices;
    const fallbackIcon =
      content?.assets?.sprites?.ui?.quest || "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610";
    const assetResolver = assets?.createAssetResolver?.(content) || {
      fallbackSkillIcon: fallbackIcon,
      choiceIconDefinition: () => fallbackIcon,
      choiceIconPath: () => fallbackIcon,
      spriteSource: (definition) =>
        typeof definition === "string" ? definition : definition?.src || definition?.path || definition?.iconSrc || "",
    };
    const fallbackSkillIcon = assetResolver.fallbackSkillIcon;

    function showLevelUp() {
      const game = getGame();
      if (!game) return;
      const save = getSave();
      game.paused = true;
      game.pauseReason = "level";
      ui.choices.innerHTML = "";
      const maxWeapons = maxEquippedWeapons?.() || 4;
      const canEquipWeapon = game.player.equippedWeapons.length < maxWeapons;
      const weaponChoices = canEquipWeapon
        ? save.unlockedWeapons
            .filter((weaponId) => !game.player.equippedWeapons.includes(weaponId))
            .map((weaponId) => ({
              weaponId,
              name: weaponDefs[weaponId].name,
              description: `Equip ${weaponDefs[weaponId].name} for this run. Weapon ${game.player.equippedWeapons.length + 1}/${maxWeapons}.`,
              apply: () => game.player.equippedWeapons.push(weaponId),
            }))
        : [];
      const questWeaponIds = activeQuestWeaponIds();
      const questWeaponChoices = weaponChoices.filter((choice) => questWeaponIds.includes(choice.weaponId));
      const otherWeaponChoices = weaponChoices.filter((choice) => !questWeaponChoices.includes(choice));
      const activeRelics = (save.equippedRelics || [])
        .map((id) => (relicDefs || []).find((relic) => relic.id === id))
        .filter(Boolean);
      function relicBonusFor(upgradeId, field) {
        return activeRelics
          .filter((relic) => relic.targetUpgradeId === upgradeId)
          .reduce((total, relic) => total + (relic[field] || 0), 0);
      }
      function relicSpawnRateMultiplierFor(upgradeId) {
        return activeRelics
          .filter((relic) => relic.targetUpgradeId === upgradeId)
          .reduce((multiplier, relic) => multiplier * Math.max(1, relic.selectionWeightBonus || 1), 1);
      }
      const runUpgradeChoices = runUpgradeDefs
        .filter(
          (upgrade) =>
            getRunUpgradeTier(upgrade.id) < upgrade.maxTier + relicBonusFor(upgrade.id, "maxTierBonus")
        )
        .map((upgrade) => {
          const tier = getRunUpgradeTier(upgrade.id);
          const maxTier = upgrade.maxTier + relicBonusFor(upgrade.id, "maxTierBonus");
          return {
            name: `${upgrade.name} ${tier + 1}`,
            description: `${upgrade.description} Tier ${tier + 1}/${maxTier}.`,
            family: upgrade.family || upgrade.id,
            relicSpawnRateMultiplier: relicSpawnRateMultiplierFor(upgrade.id),
            runUpgradeId: upgrade.id,
            apply: () => {
              game.runUpgradeTiers[upgrade.id] = tier + 1;
              upgrade.apply?.(game);
            },
          };
        });
      const familyTiers = runUpgradeDefs.reduce((totals, upgrade) => {
        const family = upgrade.family || upgrade.id;
        totals[family] = (totals[family] || 0) + getRunUpgradeTier(upgrade.id);
        return totals;
      }, {});
      const recentChoiceIds = new Set(game.lastLevelUpChoiceIds || []);
      const otherChoicePool = [...otherWeaponChoices, ...runUpgradeChoices];
      const freshChoices = otherChoicePool.filter((choice) => !recentChoiceIds.has(choiceId(choice)));
      const repeatChoices = otherChoicePool.filter((choice) => recentChoiceIds.has(choiceId(choice)));
      const otherChoices = [
        ...weightedChoices(freshChoices, choiceWeight),
        ...weightedChoices(repeatChoices, choiceWeight),
      ];
      function choiceWeight(choice) {
        if (!choice.runUpgradeId) return 1;
        const shopFocus = shopFocusBonus(save);
        const baseWeight =
          1 +
          (familyTiers[choice.family] || 0) * 1.4 +
          getRunUpgradeTier(choice.runUpgradeId) * 0.8 +
          shopFocus;
        return baseWeight * choice.relicSpawnRateMultiplier;
      }
      const choices = [...questWeaponChoices, ...otherChoices].slice(0, 3);

      if (!choices.length) {
        choices.push({
          name: "Repair",
          description: "Recover 30 HP.",
          apply: () => {
            game.player.hp = Math.min(game.player.maxHp, game.player.hp + 30);
          },
        });
      }
      game.lastLevelUpChoiceIds = choices.map(choiceId);

      choices.forEach((choice) => {
        const button = documentRef.createElement("button");
        button.className = "level-choice";
        button.disabled = true;
        button.appendChild(createChoiceIcon(choice));
        const copy = documentRef.createElement("span");
        copy.className = "level-choice-copy";
        const name = documentRef.createElement("strong");
        name.textContent = choice.name;
        const description = documentRef.createElement("span");
        description.textContent = choice.description;
        copy.appendChild(name);
        copy.appendChild(description);
        button.appendChild(copy);
        button.addEventListener("click", () => {
          if (button.disabled) return;
          choice.apply();
          playChoiceSfx?.(choice);
          game.paused = false;
          game.pauseReason = "";
          ui.levelUp.classList.add("hidden");
        });
        setTimeout(() => {
          if (!ui.levelUp.classList.contains("hidden")) button.disabled = false;
        }, 500);
        ui.choices.appendChild(button);
      });
      ui.levelUp.classList.remove("hidden");
    }

    function createChoiceIcon(choice) {
      const path = assetResolver.choiceIconPath(choice) || fallbackSkillIcon;
      const image = documentRef.createElement("img");
      image.className = "level-choice-icon";
      image.src = path;
      image.alt = "";
      return image;
    }

    function closeLevelUpMenu() {
      ui.levelUp.classList.add("hidden");
      const game = getGame();
      if (game?.pauseReason === "level") {
        game.paused = false;
        game.pauseReason = "";
      }
    }

    return {
      showLevelUp,
      closeLevelUpMenu,
    };
  }

  /**
   * @typedef {{ x: number, y: number }} Point
   */

  /**
   * @param {Point} a
   * @param {Point} b
   * @returns {number}
   */
  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /**
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  /**
   * @param {number} seconds
   * @returns {string}
   */
  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(total / 60);
    const secs = String(total % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }

  /**
   * @typedef {object} PickupLootConfig
   * @property {number=} coinFloorRewardRate
   * @property {number=} normalCoinBaseValue
   * @property {number=} bossCoinBaseValue
   */

  function createPickupSystem({
    getGame,
    getSave,
    lootConfig = {},
    getRelicSpecialEffects,
    persist,
    renderMeta,
    collectXp,
    distance,
    randomRange,
  }) {
    const lootSettings = /** @type {PickupLootConfig} */ (lootConfig || {});

    function coinFloorRewardRate() {
      return Number.isFinite(lootSettings.coinFloorRewardRate)
        ? lootSettings.coinFloorRewardRate
        : 0.06;
    }

    function normalCoinBaseValue() {
      return Number.isFinite(lootSettings.normalCoinBaseValue)
        ? lootSettings.normalCoinBaseValue
        : 1;
    }

    function bossCoinBaseValue() {
      return Number.isFinite(lootSettings.bossCoinBaseValue) ? lootSettings.bossCoinBaseValue : 12;
    }

    function spawnLootDrops(enemy) {
      const game = getGame();
      if (enemy.boss || Math.random() < 0.34) {
        const value = coinValue(enemy.boss ? bossCoinBaseValue() : normalCoinBaseValue(), game.towerFloor);
        game.lootDrops.push({
          type: "coin",
          x: enemy.x + randomRange(-10, 10),
          y: enemy.y + randomRange(-10, 10),
          radius: enemy.boss ? 10 : 7,
          value,
        });
      }
      if (enemy.boss || Math.random() < 0.12) {
        game.lootDrops.push({
          type: "heart",
          x: enemy.x + randomRange(-12, 12),
          y: enemy.y + randomRange(-12, 12),
          radius: enemy.boss ? 11 : 8,
          healPercent: 0.2,
        });
      }
    }

    function coinValue(baseValue, towerFloor) {
      const floor = Math.max(1, Math.floor(towerFloor || 1));
      return Math.ceil(baseValue * (1 + (floor - 1) * coinFloorRewardRate()));
    }

    function pullDropTowardPlayer(drop, player, speed, dt) {
      const dx = player.x - drop.x;
      const dy = player.y - drop.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const step = Math.min(dist, speed * dt);
      drop.x += (dx / dist) * step;
      drop.y += (dy / dist) * step;
    }

    function updateXpDrops(dt) {
      const game = getGame();
      const player = game.player;
      game.xpDrops.forEach((drop) => {
        if (distance(player, drop) < player.pickupRadius) {
          pullDropTowardPlayer(drop, player, 480, dt);
        }
        if (distance(player, drop) < player.radius + drop.radius) {
          drop.collected = true;
          addPickupText(`+${drop.value} XP`, drop.x, drop.y, "#78e08f");
          collectXp(drop.value);
        }
      });
      game.xpDrops = game.xpDrops.filter((drop) => !drop.collected);
    }

    function updateLootDrops(dt) {
      const game = getGame();
      const player = game.player;
      game.lootDrops.forEach((drop) => {
        if (distance(player, drop) < player.pickupRadius) {
          pullDropTowardPlayer(drop, player, 540, dt);
        }
        if (distance(player, drop) < player.radius + drop.radius) {
          drop.collected = true;
          collectLoot(drop);
        }
      });
      game.lootDrops = game.lootDrops.filter((drop) => !drop.collected);
    }

    function collectLoot(drop) {
      const game = getGame();
      const save = getSave();
      if (drop.type === "coin") {
        const value = Math.ceil(drop.value * (1 + ((getRelicSpecialEffects?.() || {}).coinMultiplier || 0)));
        save.coins += value;
        addPickupText(`+${value}`, drop.x, drop.y, "#ffd166");
        persist();
        renderMeta();
      }
      if (drop.type === "heart") {
        const healAmount = Math.ceil(game.player.maxHp * drop.healPercent);
        game.player.hp = Math.min(game.player.maxHp, game.player.hp + healAmount);
        addPickupText(`+${healAmount} HP`, drop.x, drop.y, "#ff8fa3");
      }
    }

    function addPickupText(text, x, y, color) {
      const game = getGame();
      game.pickupTexts.push({ text, x, y, color, life: 0.85, maxLife: 0.85 });
    }

    function updatePickupTexts(dt) {
      const game = getGame();
      game.pickupTexts.forEach((text) => {
        text.y -= 28 * dt;
        text.life -= dt;
      });
      game.pickupTexts = game.pickupTexts.filter((text) => text.life > 0);
    }

    return {
      spawnLootDrops,
      updateXpDrops,
      updateLootDrops,
      updatePickupTexts,
    };
  }

  const MODULE_NATIVE_PROGRESSION_SLOTS = Object.freeze(["progression"]);

  const MODULE_NATIVE_PROGRESSION_PROOF_SLOTS = Object.freeze(["createProgressionSystem"]);

  /**
   * @param {{
   *   weaponDefs: Record<string, any>,
   *   weaponUnlocks: Array<any>,
   *   upgradeDefs: Array<any>,
   *   questDefs: Record<string, any>,
   *   getSave: () => any,
   *   openQuest: (id: string) => void,
   *   persist: () => void,
   *   renderMeta: () => void,
   *   applyRunMetaUpgrades: () => void,
   * }} options
   */
  function createProgressionSystem({
    weaponDefs,
    weaponUnlocks,
    upgradeDefs,
    questDefs,
    getSave,
    openQuest,
    persist,
    renderMeta,
    applyRunMetaUpgrades,
  }) {
    const maxTierByUpgradeId = new Map(upgradeDefs.map((upgrade) => [upgrade.id, upgrade.maxTier]));

    function hasNode(id) {
      return getSave().unlockedNodes.includes(id);
    }

    function getUpgradeTier(id) {
      const tier = getSave().upgradeTiers[id] || 0;
      const maxTier = maxTierByUpgradeId.get(id);
      return Math.min(maxTier || tier, tier);
    }

    function isQuestComplete(id) {
      return !id || getSave().completedQuests.includes(id);
    }

    function labelUnlock(id) {
      const unlock = weaponUnlocks.find((node) => node.id === id);
      return unlock ? weaponDefs[unlock.weaponId].name : id;
    }

    function isNodeVisible(node) {
      return !node.requiresNode || hasNode(node.requiresNode);
    }

    function nodeGateStatus(node) {
      const save = getSave();
      if (node.requiresNode && !hasNode(node.requiresNode)) {
        return `Requires ${labelUnlock(node.requiresNode)}`;
      }
      if (node.requiresQuest && !isQuestComplete(node.requiresQuest)) {
        return `Complete quest: ${questDefs[node.requiresQuest]?.name || node.requiresQuest}`;
      }
      if (save.questPoints < node.cost) {
        return `Needs ${node.cost} QP`;
      }
      return "";
    }

    function buyWeaponUnlock(unlock) {
      const save = getSave();
      if (hasNode(unlock.id) || nodeGateStatus(unlock)) return;
      save.questPoints -= unlock.cost;
      save.unlockedNodes.push(unlock.id);
      if (!save.unlockedWeapons.includes(unlock.weaponId)) {
        save.unlockedWeapons.push(unlock.weaponId);
      }
      if (unlock.opensQuest) openQuest(unlock.opensQuest);
      persist();
      renderMeta();
    }

    function buyUpgrade(upgrade) {
      const save = getSave();
      const tier = getUpgradeTier(upgrade.id);
      if (tier >= upgrade.maxTier) return;
      if (upgrade.requiresWeapon && !save.unlockedWeapons.includes(upgrade.requiresWeapon)) return;
      if (upgrade.requiresNode && !hasNode(upgrade.requiresNode)) return;
      if (upgrade.requiresQuest && !isQuestComplete(upgrade.requiresQuest)) return;
      const cost = upgrade.cost[tier];
      if (save.questPoints < cost) return;
      save.questPoints -= cost;
      save.upgradeTiers[upgrade.id] = tier + 1;
      if (upgrade.opensQuest && tier === 0) openQuest(upgrade.opensQuest);
      persist();
      applyRunMetaUpgrades();
      renderMeta();
    }

    return {
      hasNode,
      getUpgradeTier,
      isQuestComplete,
      isNodeVisible,
      nodeGateStatus,
      buyWeaponUnlock,
      buyUpgrade,
    };
  }

  const MODULE_NATIVE_QUEST_SLOTS = Object.freeze(["quests"]);

  const MODULE_NATIVE_QUEST_PROOF_SLOTS = Object.freeze([
    "createQuestSystem",
    "questOpenIds",
  ]);

  /**
   * @param {any} quest
   */
  function questOpenIds(quest) {
    return [quest?.opensQuest, ...(quest?.opensQuests || [])].filter(Boolean);
  }

  /**
   * @param {{
   *   getSave: () => any,
   *   onQuestComplete?: (quest: any, reward: number) => void,
   *   persist: () => void,
   *   questDefs: Record<string, any>,
   *   renderMeta: () => void,
   * }} options
   */
  function createQuestSystem({ questDefs, getSave, persist, renderMeta, onQuestComplete }) {
    function hasQuest(id) {
      const save = getSave();
      return save.activeQuests.includes(id) || save.completedQuests.includes(id);
    }

    function openQuest(id) {
      const save = getSave();
      if (!questDefs[id] || hasQuest(id)) return;
      save.activeQuests.push(id);
      save.questProgress[id] = save.questProgress[id] || 0;
      persist();
    }

    function completeQuest(id) {
      const save = getSave();
      if (!save.activeQuests.includes(id) || save.completedQuests.includes(id)) return;
      save.activeQuests = save.activeQuests.filter((questId) => questId !== id);
      save.completedQuests.push(id);
      const reward = questDefs[id].rewardQp || 0;
      save.questPoints += reward;
      save.totalQuestPoints += reward;
      questOpenIds(questDefs[id]).forEach(openQuest);
      persist();
      renderMeta();
      onQuestComplete?.(questDefs[id], reward);
    }

    function addQuestProgress(id, amount) {
      const save = getSave();
      if (!questDefs[id] || !save.activeQuests.includes(id)) return;
      save.questProgress[id] = Math.min(
        questDefs[id].target,
        (save.questProgress[id] || 0) + amount,
      );
      if (save.questProgress[id] >= questDefs[id].target) completeQuest(id);
    }

    function addQuestProgressGroup(ids, amount) {
      ids.forEach((questId) => addQuestProgress(questId, amount));
    }

    function addQuestProgressForWeapon(weaponId, amount) {
      const save = getSave();
      save.activeQuests
        .filter((questId) => questDefs[questId]?.weaponId === weaponId)
        .forEach((questId) => addQuestProgress(questId, amount));
    }

    function activeQuestWeaponIds() {
      const save = getSave();
      return save.activeQuests
        .map((questId) => questDefs[questId]?.weaponId)
        .filter(Boolean);
    }

    return {
      activeQuestWeaponIds,
      addQuestProgress,
      addQuestProgressForWeapon,
      addQuestProgressGroup,
      completeQuest,
      hasQuest,
      openQuest,
    };
  }

  function createRelicSystem({ relicDefs, weaponDefs = {}, random = Math.random }) {
    function equippedRelics(save) {
      const equipped = new Set(save.equippedRelics || []);
      return (relicDefs || []).filter((relic) => equipped.has(relic.id)).slice(0, maxEquippedRelics(save));
    }

    function maxEquippedRelics(save) {
      return Math.min(5, Math.floor(Math.max(0, save.towerFloor || 1) / 10));
    }

    function relicNumber(save, field) {
      return equippedRelics(save).reduce((total, relic) => total + (relic[field] || 0), 0);
    }

    function relicBonusFor(save, upgradeId, field) {
      return equippedRelics(save)
        .filter((relic) => relic.targetUpgradeId === upgradeId)
        .reduce((total, relic) => total + (relic[field] || 0), 0);
    }

    function startingRunUpgradeTiers(save) {
      return equippedRelics(save).reduce((tiers, relic) => {
        const bonus = relic.startingTierBonus || 0;
        if (relic.targetUpgradeId && bonus > 0) {
          tiers[relic.targetUpgradeId] = (tiers[relic.targetUpgradeId] || 0) + bonus;
        }
        return tiers;
      }, {});
    }

    function maxEquippedWeapons(save) {
      return Math.max(1, 4 + relicNumber(save, "weaponSlotBonus"));
    }

    function getWeaponDamageMultiplier(save) {
      return equippedRelics(save).reduce((multiplier, relic) => multiplier * (relic.weaponDamageMultiplier || 1), 1);
    }

    function specialEffects(save) {
      return equippedRelics(save).reduce((effects, relic) => mergeSpecialAbility(effects, relic.specialAbility), {});
    }

    function mergeSpecialAbility(effects, ability) {
      if (!ability?.modifiers) return effects;
      Object.entries(ability.modifiers).forEach(([key, value]) => {
        if (!Number.isFinite(value)) return;
        effects[key] = (effects[key] || 0) + value;
      });
      return effects;
    }

    function grantRelic(save, relic) {
      if (!relic) return null;
      const unlocked = new Set(save.unlockedRelics || []);
      if (unlocked.has(relic.id)) return null;
      save.unlockedRelics = [...unlocked, relic.id];
      if ((save.equippedRelics || []).length < maxEquippedRelics(save)) {
        save.equippedRelics = [...new Set([...(save.equippedRelics || []), relic.id])];
      }
      return relic;
    }

    function setRelicEquipped(save, relicId, equipped) {
      const unlocked = new Set(save.unlockedRelics || []);
      if (!unlocked.has(relicId)) return false;
      const current = (save.equippedRelics || []).filter((id) => unlocked.has(id)).slice(0, maxEquippedRelics(save));
      if (!equipped) {
        save.equippedRelics = current.filter((id) => id !== relicId);
        return true;
      }
      if (current.includes(relicId)) return true;
      if (current.length >= maxEquippedRelics(save)) return false;
      save.equippedRelics = [...current, relicId];
      return true;
    }

    function grantRandomRelic(save) {
      const unlocked = new Set(save.unlockedRelics || []);
      const locked = (relicDefs || []).filter((relic) => !unlocked.has(relic.id));
      if (!locked.length) return null;
      const relic = locked[Math.floor(random() * locked.length)];
      return grantRelic(save, relic);
    }

    function relicChoices(save, equippedWeaponIds, count = 3) {
      const unlocked = new Set(save.unlockedRelics || []);
      const locked = (relicDefs || []).filter((relic) => !unlocked.has(relic.id));
      const relevantIds = relevantRunUpgradeIds(equippedWeaponIds);
      const relevant = locked.filter((relic) => relevantIds.has(relic.targetUpgradeId));
      const fallback = locked.filter((relic) => !relevantIds.has(relic.targetUpgradeId));
      return [...shuffleRelics(relevant), ...shuffleRelics(fallback)].slice(0, count);
    }

    function relevantRunUpgradeIds(equippedWeaponIds) {
      const ids = new Set(["run_fire_rate", "run_flat_damage", "run_percent_damage"]);
      const kinds = new Set((equippedWeaponIds || []).map((id) => weaponDefs[id]?.kind).filter(Boolean));
      if (kinds.has("projectile")) {
        ["run_projectile_pierce", "run_wall_bounce", "run_split_shot", "run_split_on_hit"].forEach((id) => ids.add(id));
      }
      if (["beam", "cone", "radial", "target_area", "lingering_area", "mine"].some((kind) => kinds.has(kind))) {
        ids.add("run_attack_radius");
      }
      return ids;
    }

    function shuffleRelics(relics) {
      return relics
        .map((relic) => ({ relic, sort: random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ relic }) => relic);
    }

    return {
      equippedRelics,
      maxEquippedRelics,
      maxEquippedWeapons,
      getWeaponDamageMultiplier,
      specialEffects,
      relicBonusFor,
      grantRelic,
      grantRandomRelic,
      relicChoices,
      setRelicEquipped,
      startingRunUpgradeTiers,
    };
  }

  /**
   * @typedef {{
   *   canvas?: HTMLCanvasElement,
   *   ctx?: CanvasRenderingContext2D,
   *   roundedRectPath?: (x: number, y: number, width: number, height: number, radius: number) => void,
   *   drawSprite?: (spriteId: string, x: number, y: number, size: number, rotation?: number, options?: { trim?: boolean }) => boolean | void,
   *   weaponDefs?: Record<string, { assetId?: string, color?: string, kind?: string }>,
   *   runUpgradeDefs?: { id: string }[],
   * }} SkillRailRendererOptions
   */

  /**
   * @param {SkillRailRendererOptions} [options]
   */
  function createSkillRailRenderer({
    canvas: suppliedCanvas,
    ctx: suppliedCtx,
    roundedRectPath: suppliedRoundedRectPath,
    drawSprite: suppliedDrawSprite,
    weaponDefs: suppliedWeaponDefs,
    runUpgradeDefs: suppliedRunUpgradeDefs,
  } = {}) {
    const canvas = requireSkillRailObject(suppliedCanvas, "canvas");
    const ctx = requireSkillRailObject(suppliedCtx, "ctx");
    const roundedRectPath = requireSkillRailFunction(suppliedRoundedRectPath, "roundedRectPath");
    const drawSprite = requireSkillRailFunction(suppliedDrawSprite, "drawSprite");
    const weaponDefs = requireSkillRailObject(suppliedWeaponDefs, "weaponDefs");
    const runUpgradeDefs = requireSkillRailObject(suppliedRunUpgradeDefs, "runUpgradeDefs");

    function drawSkillRail(game) {
      const equipped = game.player.equippedWeapons.filter((weaponId) => weaponDefs[weaponId]);
      if (!equipped.length) return;

      const maxRailHeight = canvas.height - 120;
      const gap = 8;
      const size = Math.max(32, Math.min(48, Math.floor((maxRailHeight - (equipped.length - 1) * gap - 16) / equipped.length)));
      const x = 18;
      const y = 78;
      const railHeight = equipped.length * size + (equipped.length - 1) * gap + 16;

      roundedRectPath(x - 8, y - 8, size + 16, railHeight, 8);
      ctx.fillStyle = "rgba(10, 14, 20, 0.78)";
      ctx.fill();
      ctx.strokeStyle = "rgba(243, 246, 251, 0.14)";
      ctx.lineWidth = 1;
      ctx.stroke();

      equipped.forEach((weaponId, index) => {
        const weapon = weaponDefs[weaponId];
        const top = y + index * (size + gap);
        drawSkillIcon(weaponId, weapon, x, top, size, weaponFlashAmount(game, weaponId));
      });
    }

    function weaponFlashAmount(game, weaponId) {
      const iconFlash = Math.max(0, game.weaponIconFlashes?.[weaponId] || 0);
      const burstFlash = game.weaponBursts.some((burst) => burst.weaponId === weaponId) ? 0.45 : 0;
      return Math.min(1, Math.max(iconFlash, burstFlash));
    }

    function drawSkillIcon(weaponId, weapon, x, y, size, flash = 0) {
      const centerX = x + size / 2;
      const centerY = y + size / 2;
      const color = weapon.color || "#f3f6fb";
      const active = flash > 0;
      const pulse = 1 + flash * 0.14;
      const iconSize = size * (active ? 0.74 : 0.62) * pulse;

      roundedRectPath(x, y, size, size, 7);
      ctx.fillStyle = "rgba(18, 24, 34, 0.94)";
      ctx.fill();
      ctx.strokeStyle = active ? "#ffd166" : color;
      ctx.lineWidth = active ? 4 : 3;
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.globalAlpha = active ? 0.3 : 0.16;
      roundedRectPath(x + 5, y + 5, size - 10, size - 10, 5);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (active) {
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.35 + flash * 0.45;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * (0.34 + flash * 0.22), 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = flash * 0.32;
        roundedRectPath(x + 3, y + 3, size - 6, size - 6, 6);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      drawFallbackWeaponGlyph(weapon.kind, centerX, centerY, size, color);
      drawSprite(`weaponIcon:${weapon.assetId || weaponId}`, centerX, centerY, iconSize, 0, { trim: false }) ||
        drawSprite(`weapon:${weapon.assetId || weaponId}`, centerX, centerY, iconSize);
    }

    function drawUpgradeRail(game) {
      const activeUpgrades = Object.entries(game.runUpgradeTiers || {})
        .filter(([, tier]) => tier > 0)
        .map(([id, tier]) => ({
          id,
          tier,
          upgrade: runUpgradeDefs.find((item) => item.id === id),
        }))
        .filter((item) => item.upgrade);
      if (!activeUpgrades.length) return;

      const size = 34;
      const gap = 7;
      const x = 78;
      const y = 78;
      const railHeight = activeUpgrades.length * size + (activeUpgrades.length - 1) * gap + 14;

      roundedRectPath(x - 7, y - 7, size + 14, railHeight, 8);
      ctx.fillStyle = "rgba(10, 14, 20, 0.72)";
      ctx.fill();
      ctx.strokeStyle = "rgba(120, 224, 143, 0.24)";
      ctx.lineWidth = 1;
      ctx.stroke();

      activeUpgrades.forEach(({ id, tier, upgrade }, index) => {
        drawUpgradeIcon(id, upgrade, tier, x, y + index * (size + gap), size);
      });
    }

    function drawUpgradeIcon(upgradeId, upgrade, tier, x, y, size) {
      const centerX = x + size / 2;
      const centerY = y + size / 2;
      roundedRectPath(x, y, size, size, 7);
      ctx.fillStyle = "rgba(18, 24, 34, 0.92)";
      ctx.fill();
      ctx.strokeStyle = "#78e08f";
      ctx.lineWidth = 2;
      ctx.stroke();

      drawFallbackUpgradeGlyph(upgradeId, centerX, centerY, size, "#78e08f");
      drawSprite(`runUpgradeIcon:${upgradeId}`, centerX, centerY, size * 0.68, 0, { trim: false });

      const label = String(tier);
      const badgeSize = 14;
      roundedRectPath(x + size - badgeSize, y + size - badgeSize, badgeSize, badgeSize, 5);
      ctx.fillStyle = "rgba(120, 224, 143, 0.92)";
      ctx.fill();
      ctx.fillStyle = "#10141d";
      ctx.font = "800 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, x + size - badgeSize / 2, y + size - 3);
      ctx.textAlign = "start";
    }

    function drawUpgradeGlyph(id, x, y, size, color) {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      if (id.includes("fire_rate")) {
        ctx.beginPath();
        ctx.arc(x, y, size * 0.18, 0, Math.PI * 2);
        ctx.stroke();
        return;
      }
      if (id.includes("damage")) {
        ctx.beginPath();
        ctx.moveTo(x - size * 0.2, y + size * 0.16);
        ctx.lineTo(x + size * 0.2, y - size * 0.16);
        ctx.stroke();
        return;
      }
      ctx.beginPath();
      ctx.arc(x, y, size * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawFallbackUpgradeGlyph(id, x, y, size, color) {
      const previousAlpha = ctx.globalAlpha ?? 1;
      ctx.globalAlpha = 0.5;
      drawUpgradeGlyph(id, x, y, size, color);
      ctx.globalAlpha = previousAlpha;
    }

    function drawFallbackWeaponGlyph(kind, x, y, size, color) {
      const previousAlpha = ctx.globalAlpha ?? 1;
      ctx.globalAlpha = 0.44;
      drawWeaponGlyph(kind, x, y, size, color);
      ctx.globalAlpha = previousAlpha;
    }

    function drawWeaponGlyph(kind, x, y, size, color) {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (kind === "beam") {
        ctx.beginPath();
        ctx.moveTo(x - size * 0.22, y + size * 0.18);
        ctx.lineTo(x + size * 0.22, y - size * 0.18);
        ctx.stroke();
        return;
      }
      if (kind === "cone") {
        ctx.beginPath();
        ctx.moveTo(x, y - size * 0.22);
        ctx.lineTo(x + size * 0.24, y + size * 0.2);
        ctx.lineTo(x - size * 0.24, y + size * 0.2);
        ctx.closePath();
        ctx.fill();
        return;
      }
      if (kind === "radial") {
        ctx.beginPath();
        ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, size * 0.08, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      if (kind === "chain") {
        ctx.beginPath();
        ctx.moveTo(x - size * 0.18, y - size * 0.2);
        ctx.lineTo(x + size * 0.02, y - size * 0.02);
        ctx.lineTo(x - size * 0.04, y + size * 0.02);
        ctx.lineTo(x + size * 0.18, y + size * 0.2);
        ctx.stroke();
        return;
      }
      if (kind === "target_area" || kind === "lingering_area") {
        ctx.beginPath();
        ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - size * 0.25, y);
        ctx.lineTo(x + size * 0.25, y);
        ctx.moveTo(x, y - size * 0.25);
        ctx.lineTo(x, y + size * 0.25);
        ctx.stroke();
        return;
      }
      if (kind === "mine") {
        ctx.beginPath();
        ctx.moveTo(x, y - size * 0.24);
        ctx.lineTo(x + size * 0.24, y);
        ctx.lineTo(x, y + size * 0.24);
        ctx.lineTo(x - size * 0.24, y);
        ctx.closePath();
        ctx.fill();
        return;
      }

      ctx.beginPath();
      ctx.arc(x, y, size * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }

    return {
      drawSkillRail,
      drawUpgradeRail,
    };
  }

  /**
   * @template T
   * @param {T | null | undefined} value
   * @param {string} name
   * @returns {NonNullable<T>}
   */
  function requireSkillRailObject(value, name) {
    if (!value || typeof value !== "object") {
      throw new Error(`Missing Tap Survivor skill rail dependency: ${name}`);
    }
    return /** @type {NonNullable<T>} */ (value);
  }

  /**
   * @template T
   * @param {T | null | undefined} value
   * @param {string} name
   * @returns {NonNullable<T>}
   */
  function requireSkillRailFunction(value, name) {
    if (typeof value !== "function") {
      throw new Error(`Missing Tap Survivor skill rail dependency: ${name}`);
    }
    return /** @type {NonNullable<T>} */ (value);
  }

  function createHudRenderer({ canvas, ctx, roundedRectPath, drawSprite, weaponDefs, runUpgradeDefs = [], clamp }) {
    const skillRail = createSkillRailRenderer({
      canvas,
      ctx,
      roundedRectPath,
      drawSprite,
      weaponDefs,
      runUpgradeDefs,
    });

    function drawTowerFloorBadge(game) {
      const floor = game?.towerFloor || 1;
      const width = 132;
      const height = 34;
      const x = canvas.width / 2 - width / 2;
      const y = 12;
      roundedRectPath(x, y, width, height, 8);
      ctx.fillStyle = "rgba(10, 14, 20, 0.76)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 209, 102, 0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#ffd166";
      ctx.font = "700 15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Tower Floor ${floor}`, canvas.width / 2, y + 22);
      ctx.textAlign = "start";
    }

    function drawBossSpawnNotice(game) {
      const notice = game.bossSpawnNotice;
      if (!notice) return;
      const alpha = clamp(notice.life / notice.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ffd166";
      ctx.font = "800 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(notice.text, canvas.width / 2, 104);
      ctx.restore();
      ctx.textAlign = "start";
    }

    function drawGameHud(game) {
      drawBossHealthBar(game);
      drawBossSpecialBar(game);
      skillRail.drawSkillRail(game);
      skillRail.drawUpgradeRail(game);
    }

    function drawBossHealthBar(game) {
      const boss = game.enemies.find((enemy) => enemy.boss);
      if (!boss) return;
      const width = Math.min(520, canvas.width - 220);
      const height = 18;
      const x = canvas.width / 2 - width / 2;
      const y = 54;
      const fillWidth = width * clamp(boss.hp / boss.maxHp, 0, 1);

      roundedRectPath(x, y, width, height, 7);
      ctx.fillStyle = "rgba(10, 14, 20, 0.84)";
      ctx.fill();
      roundedRectPath(x, y, fillWidth, height, 7);
      ctx.fillStyle = boss.superBoss ? "#ff74c8" : "#ff5f7a";
      ctx.fill();
      ctx.strokeStyle = boss.superBoss ? "#ffd166" : "#f3f6fb";
      ctx.lineWidth = 2;
      roundedRectPath(x, y, width, height, 7);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 12px sans-serif";
      ctx.textAlign = "center";
      const kind = boss.superBoss ? "SUPER BOSS" : boss.bossKind === "charger" ? "CHARGER BOSS" : boss.bossKind === "turret" ? "TURRET BOSS" : "BOSS";
      ctx.fillText(`${kind} ${Math.max(0, Math.ceil(boss.hp))}/${Math.ceil(boss.maxHp)}`, canvas.width / 2, y + 13);
      ctx.textAlign = "start";
    }

    function drawBossSpecialBar(game) {
      const boss = game.enemies.find((enemy) => enemy.boss);
      if (!boss || boss.dropTimer > 0) return;
      const max = Math.max(0.1, game.bossAttackCooldownMax || 3.8);
      const progress = clamp(1 - (game.bossAttackTimer || 0) / max, 0, 1);
      const width = Math.min(360, canvas.width - 320);
      const height = 10;
      const x = canvas.width / 2 - width / 2;
      const y = 78;
      roundedRectPath(x, y, width, height, 5);
      ctx.fillStyle = "rgba(10, 14, 20, 0.86)";
      ctx.fill();
      roundedRectPath(x, y, width * progress, height, 5);
      ctx.fillStyle = progress > 0.82 ? "#ff5f56" : "#ffd166";
      ctx.fill();
      ctx.strokeStyle = progress > 0.82 ? "#ffffff" : "rgba(255, 209, 102, 0.75)";
      ctx.lineWidth = 1.5;
      roundedRectPath(x, y, width, height, 5);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SPECIAL", canvas.width / 2, y + 9);
      ctx.textAlign = "start";
    }

    return {
      drawBossSpawnNotice,
      drawGameHud,
      drawBossSpecialBar,
      drawTowerFloorBadge,
    };
  }

  const MODULE_NATIVE_RENDER_ENEMIES_SLOTS = Object.freeze(["renderEnemies"]);

  const MODULE_NATIVE_RENDER_ENEMIES_PROOF_SLOTS = Object.freeze(["createEnemyRenderer"]);

  function createEnemyRenderer({ ctx, drawSprite, spriteSheetRenderer, clamp }) {
    function drawEnemy(enemy, game) {
      const enemySprite = enemy.boss ? "enemy:boss" : `enemy:${enemy.assetId || enemy.type}`;
      const spriteSize = enemy.boss ? Math.max(92, enemy.radius * 2.9) : Math.max(34, enemy.radius * 3.8);
      const enemyDrawn = drawEnemySpriteSheet(enemy, game, spriteSize) || drawSprite(enemySprite, enemy.x, enemy.y, spriteSize, 0, {
        flipX: enemyFacesLeft(enemy),
      });
      if (!enemyDrawn) {
        ctx.fillStyle = enemy.boss ? "#ff4f8b" : enemy.color;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      if (enemy.boss) {
        const charging = (enemy.bossAbilities?.includes("charger") || enemy.bossKind === "charger") && enemy.chargeState === "windup";
        const ringColor = charging ? "#ff3b3b" : enemy.superBoss ? "#ff74c8" : "#ffd166";
        strokeEnemyRing(enemy, ringColor, charging ? 7 : enemy.superBoss ? 6 : 4);
        ctx.fillStyle = "#f3f6fb";
        ctx.font = "700 14px sans-serif";
        const label = enemy.superBoss ? "SUPER" : enemy.bossKind === "turret" ? "TURRET" : enemy.bossKind === "charger" ? "CHARGE" : "BOSS";
        ctx.fillText(label, enemy.x - label.length * 3.6, enemy.y - enemy.radius - 10);
      } else {
        drawEnemyFloorTint(enemy, spriteSize);
      }
      if (enemy.type === "skitter") {
        ctx.fillStyle = "#17202c";
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === "bulwark") {
        strokeEnemyRing(enemy, "#dff6ff", 3);
      }
    }

    function drawEnemySpriteSheet(enemy, game, spriteSize) {
      if (!spriteSheetRenderer?.drawAnimation) return false;
      const animationTime = Number(enemy.animTime || 0);
      if (enemy.boss) {
        const bossAnimationId = bossAnimationIdFor(enemy);
        return spriteSheetRenderer.drawAnimation(
          "bosses",
          bossAnimationId,
          bossAnimationState(enemy, game, bossAnimationId),
          enemy.x,
          enemy.y,
          spriteSize,
          spriteSize,
          { flipX: enemyFacesLeft(enemy), time: animationTime },
        );
      }
      return spriteSheetRenderer.drawAnimation(
        "enemies",
        enemy.assetId || enemy.type,
        enemyAnimationState(enemy),
        enemy.x,
        enemy.y,
        spriteSize,
        spriteSize,
        { flipX: enemyFacesLeft(enemy), time: animationTime },
      );
    }

    function enemyAnimationState(enemy) {
      if (isRangedEnemy(enemy) && (enemy.attackVisualTimer || 0) > 0) return "attack";
      return "default";
    }

    function isRangedEnemy(enemy) {
      return !enemy?.boss && Boolean(enemy?.attackRange && enemy?.projectileCooldown);
    }

    function bossAnimationIdFor(enemy) {
      if (enemy.bossKind) return enemy.bossKind;
      return enemy.bossAbilities?.[0] || "warden";
    }

    function bossAnimationState(enemy, game, animationId) {
      if (animationId === "charger") {
        if (enemy.chargeState === "windup") return "windup";
        if (enemy.chargeState === "charging") return "release";
      }
      if (animationId === "warden") {
        const shockwave = activeBossAttack(game, "shockwave", enemy);
        if (shockwave) return shockwave.age < shockwave.windup ? "windup" : "release";
        if (enemy.dropTimer > 0) return "windup";
      }
      if (animationId === "turret") {
        if ((enemy.attackVisualTimer || 0) > 0) return "release";
        if (enemy.shootTimer <= Math.min(0.45, (enemy.projectileCooldown || 1) * 0.28)) return "windup";
      }
      return "idle";
    }

    function activeBossAttack(game, type, enemy) {
      return game?.bossAttacks?.find((attack) => attack.type === type && Math.hypot(attack.x - enemy.x, attack.y - enemy.y) <= Math.max(190, enemy.radius * 5));
    }

    function enemyFacesLeft(enemy) {
      if (Number.isFinite(enemy.vx)) return enemy.vx < -1;
      if (Number.isFinite(enemy.chargeDirX)) return enemy.chargeDirX < -0.1;
      return false;
    }

    function drawEnemyFloorTint(enemy, spriteSize) {
      const floor = clamp(Math.floor(enemy.towerFloor || 1), 1, 100);
      const bucket = Math.floor((floor - 1) / 5);
      const progress = bucket / 19;
      const red = Math.round(52 + progress * 154);
      const green = Math.round(230 - progress * 190);
      const blue = Math.round(190 - progress * 162);
      const alpha = 0.12 + progress * 0.14;
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, Math.max(enemy.radius + 4, spriteSize * 0.36), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      strokeEnemyRing(enemy, `rgba(${red}, ${green}, ${blue}, ${0.48 + progress * 0.28})`, 2 + progress * 2);
    }

    function strokeEnemyRing(enemy, color, width) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    function drawEnemyBolt(bolt) {
      const speed = Math.max(1, Math.hypot(bolt.vx || 0, bolt.vy || 0));
      const tailX = bolt.x - (bolt.vx / speed) * bolt.radius * 3.2;
      const tailY = bolt.y - (bolt.vy / speed) * bolt.radius * 3.2;
      const alpha = clamp((bolt.life || 0) / (bolt.maxLife || 1), 0.3, 1);
      const color = bolt.color || "#b794ff";
      const trailColor = bolt.trailColor || color;
      const glowColor = bolt.glowColor || color;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = withAlpha(glowColor, 0.55);
      ctx.lineWidth = Math.max(4, bolt.radius * 0.8);
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(bolt.x, bolt.y);
      ctx.stroke();
      ctx.strokeStyle = trailColor;
      ctx.lineWidth = Math.max(2, bolt.radius * 0.45);
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(bolt.x, bolt.y);
      ctx.stroke();
      ctx.fillStyle = withAlpha(glowColor, 0.42);
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, bolt.radius + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, bolt.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#10141d";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    function withAlpha(color, alpha) {
      const match = typeof color === "string" ? /^#([0-9a-f]{6})$/i.exec(color.trim()) : null;
      if (!match) return color;
      const value = Number.parseInt(match[1], 16);
      const r = (value >> 16) & 255;
      const g = (value >> 8) & 255;
      const b = value & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    return {
      drawEnemy,
      drawEnemyBolt,
      enemyAnimationState,
    };
  }

  const BEAM_SPRITE_RASTER_WIDTH = 256;

  function createRenderer({ canvas, ctx, clamp, createEnemyRenderer, createHudRenderer, createSkillRailRenderer, drawImage, drawSprite, runUpgradeDefs = [], skillEffectSprites = {}, spriteSheetRenderer, weaponDefs }) {
    const hudRenderer = createHudRenderer({
      canvas,
      ctx,
      roundedRectPath,
      clamp,
      createSkillRailRenderer,
      drawSprite,
      runUpgradeDefs,
      weaponDefs,
    });
    const enemyRenderer = createEnemyRenderer({
      ctx,
      drawSprite,
      spriteSheetRenderer,
      clamp,
    });

    function draw(game) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawArena(game);
      if (!game) {
        drawMenuHint();
        return;
      }

      game.areas.forEach(drawArea);
      game.weaponBursts.forEach(drawWeaponBurst);
      game.bossAttacks.forEach(drawBossAttack);
      game.xpDrops.forEach(drawXp);
      game.lootDrops.forEach(drawLoot);
      game.bolts.forEach(drawBolt);
      game.enemyBolts.forEach(enemyRenderer.drawEnemyBolt);
      game.enemies.forEach((enemy) => enemyRenderer.drawEnemy(enemy, game));
      game.beams.forEach(drawBeam);
      game.pickupTexts.forEach(drawPickupText);
      drawPlayer(game.player);
      hudRenderer.drawBossSpawnNotice(game);
      hudRenderer.drawGameHud(game);
    }

    function roundedRectPath(x, y, width, height, radius) {
      const r = Math.min(radius, width / 2, height / 2);
      ctx.beginPath();
      if (!ctx.quadraticCurveTo) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x, y + height);
        ctx.closePath();
        return;
      }
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + width - r, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + r);
      ctx.quadraticCurveTo(x + width, y + height, x + width, y + height - r);
      ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      ctx.lineTo(x + r, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - r);
      ctx.quadraticCurveTo(x, y + height, x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function drawArena(game) {
      const backgroundId = game?.background?.spriteId || "background:tower_floor";
      const backgroundDrawn = drawImage?.(backgroundId, 0, 0, canvas.width, canvas.height);
      if (!backgroundDrawn) {
        ctx.fillStyle = "#17202c";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.fillStyle = "rgba(10, 14, 20, 0.16)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = backgroundDrawn ? "rgba(223, 246, 255, 0.08)" : "#243244";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      hudRenderer.drawTowerFloorBadge(game);
    }

    function drawMenuHint() {
      ctx.fillStyle = "#f3f6fb";
      ctx.font = "700 28px sans-serif";
      ctx.fillText("Tap Survivor", 36, 58);
      ctx.font = "16px sans-serif";
      ctx.fillText("Unlock weapons, then start a run.", 36, 88);
    }

    function drawPlayer(p) {
      drawPlayerHpBar(p);
      const previousAlpha = ctx.globalAlpha;
      if (p.blinkTimer > 0) ctx.globalAlpha = 0.35 + Math.abs(Math.sin(p.blinkTimer * 24)) * 0.65;
      const spriteId = playerSpriteId(p);
      const playerDrawn = drawSprite(spriteId, p.x, p.y, Math.max(70, p.radius * 3.8), 0, {
        flipX: playerFacesLeft(p),
      }) || (spriteId !== "player" && drawSprite("player", p.x, p.y, Math.max(70, p.radius * 3.8), 0, {
        flipX: playerFacesLeft(p),
      }));
      if (!playerDrawn) {
        ctx.fillStyle = "#69d2ff";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = previousAlpha;
      if (p.invincibleTimer > 0) {
        ctx.strokeStyle = "rgba(88, 255, 157, 0.72)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(105, 210, 255, 0.28)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.pickupRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#dff6ff";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.targetX, p.targetY);
      ctx.stroke();
    }

    function playerFacesLeft(p) {
      return p.targetX < p.x - 2;
    }

    function playerSpriteId(p) {
      if (p.actionTimer > 0 && p.actionSprite) return `player:${p.actionSprite}`;
      if (p.moving) return "player:walk";
      return "player";
    }

    function drawPlayerHpBar(p) {
      const width = 44;
      const height = 6;
      const x = p.x - width / 2;
      const y = p.y - p.radius - 16;
      const fillWidth = width * clamp(p.hp / p.maxHp, 0, 1);
      ctx.fillStyle = "rgba(10, 14, 20, 0.82)";
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = fillWidth > width * 0.35 ? "#78e08f" : "#ff6b6b";
      ctx.fillRect(x, y, fillWidth, height);
      ctx.strokeStyle = "#f3f6fb";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);
      drawProjectileBlockBar(p, x, y + height + 3, width);
    }

    function drawProjectileBlockBar(p, x, y, width) {
      const progress = p.projectileBlockReady ? 1 : clamp((p.projectileBlockCharge || 0) / (p.projectileBlockNeeded || 1), 0, 1);
      if (progress <= 0) return;
      ctx.fillStyle = "rgba(10, 14, 20, 0.82)";
      ctx.fillRect(x, y, width, 4);
      ctx.fillStyle = p.projectileBlockReady ? "#8de7ff" : "#4aa3ff";
      ctx.fillRect(x, y, width * progress, 4);
    }

    function drawXp(drop) {
      ctx.fillStyle = "#78e08f";
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawLoot(drop) {
      if (drop.type === "coin") {
        if (drawSprite("ui:coin", drop.x, drop.y, Math.max(24, drop.radius * 3.1))) return;
        ctx.fillStyle = "#ffd166";
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff0a8";
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
      }

      if (drop.type === "heart" && drawSprite("ui:heart", drop.x, drop.y, Math.max(26, drop.radius * 3))) return;
      ctx.fillStyle = "#ff5f7a";
      ctx.beginPath();
      ctx.arc(drop.x - drop.radius * 0.34, drop.y - drop.radius * 0.18, drop.radius * 0.5, 0, Math.PI * 2);
      ctx.arc(drop.x + drop.radius * 0.34, drop.y - drop.radius * 0.18, drop.radius * 0.5, 0, Math.PI * 2);
      ctx.moveTo(drop.x - drop.radius, drop.y);
      ctx.lineTo(drop.x, drop.y + drop.radius);
      ctx.lineTo(drop.x + drop.radius, drop.y);
      ctx.closePath();
      ctx.fill();
    }

    function drawPickupText(text) {
      const alpha = clamp(text.life / text.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = text.color;
      ctx.font = "700 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(text.text, text.x, text.y);
      ctx.restore();
      ctx.textAlign = "start";
    }

    function drawBolt(bolt) {
      const weapon = weaponDefs[bolt.weaponId];
      const rotation = Math.atan2(bolt.vy || 0, bolt.vx || 1);
      const tuning = skillEffectTuning(bolt.weaponId, weapon);
      const boltDrawn = drawSprite(`weapon:${weapon?.assetId || bolt.weaponId}`, bolt.x, bolt.y, bolt.radius * 2 * tuning.scale, rotation, { alpha: tuning.alpha });
      if (!boltDrawn) {
        ctx.fillStyle = bolt.color;
        ctx.beginPath();
        ctx.arc(bolt.x, bolt.y, bolt.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawBeam(beam) {
      const weapon = weaponDefs[beam.weaponId];
      const tuning = skillEffectTuning(beam.weaponId, weapon);
      const length = Math.max(1, Math.hypot(beam.endX - beam.x, beam.endY - beam.y));
      const midX = (beam.x + beam.endX) / 2;
      const midY = (beam.y + beam.endY) / 2;
      const rotation = Math.atan2(beam.endY - beam.y, beam.endX - beam.x);
      const spriteHeight = Math.max(1, beam.width * tuning.scale);
      if (weapon && drawSprite(`weapon:${weapon.assetId || beam.weaponId}`, midX, midY, length, rotation, {
        width: length,
        height: spriteHeight,
        rasterWidth: BEAM_SPRITE_RASTER_WIDTH,
        rasterHeight: spriteHeight,
        alpha: tuning.alpha,
      })) {
        return;
      }
      ctx.save();
      ctx.strokeStyle = beam.color;
      ctx.lineWidth = beam.width;
      ctx.globalAlpha = Math.max(0.2, beam.life / 0.24) * tuning.alpha;
      ctx.beginPath();
      ctx.moveTo(beam.x, beam.y);
      ctx.lineTo(beam.endX, beam.endY);
      ctx.stroke();
      ctx.restore();
    }

    function drawArea(area) {
      const weapon = weaponDefs[area.weaponId];
      const tuning = skillEffectTuning(area.weaponId, weapon);
      const spriteSize = area.radius * 2 * tuning.scale;
      const spriteDrawn = weapon && drawSprite(`weapon:${weapon.assetId || area.weaponId}`, area.x, area.y, spriteSize, 0, {
        width: spriteSize,
        height: spriteSize,
        alpha: Math.max(0.1, Math.min(1, area.life)) * tuning.alpha,
      });
      ctx.save();
      ctx.strokeStyle = area.color;
      ctx.fillStyle = area.color;
      ctx.globalAlpha = spriteDrawn ? 0.12 * tuning.alpha : Math.max(0.1, Math.min(0.32, area.life)) * tuning.alpha;
      ctx.beginPath();
      ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.8 * tuning.alpha;
      ctx.stroke();
      ctx.restore();
    }

    function drawWeaponBurst(burst) {
      const progress = 1 - burst.life / burst.maxLife;
      const radius = burst.radius + progress * 26;
      ctx.globalAlpha = Math.max(0, burst.life / burst.maxLife) * 0.78;
      ctx.strokeStyle = burst.color;
      ctx.lineWidth = 3 + progress * 4;
      ctx.beginPath();
      ctx.arc(burst.x, burst.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha *= 0.22;
      ctx.fillStyle = burst.color;
      ctx.beginPath();
      ctx.arc(burst.x, burst.y, Math.max(8, radius * 0.46), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    function skillEffectTuning(weaponId, weapon) {
      const sprite = skillEffectSprites[weapon?.assetId || weaponId] || {};
      return {
        scale: Math.max(0.1, Number(sprite.effectScale || 1)),
        alpha: Math.max(0, Math.min(1, Number(sprite.effectAlpha ?? 1))),
      };
    }

    function drawBossAttack(attack) {
      if (attack.type === "boss_slash") {
        drawBossSlash(attack);
        return;
      }
      const charging = attack.age < attack.windup;
      const progress = clamp(attack.age / attack.windup, 0, 1);
      const radius = charging ? attack.radius * progress : attack.radius;
      const drop = attack.type === "boss_drop";
      ctx.strokeStyle = charging ? (drop ? "#8de7ff" : "#ffd166") : "#ff5f7a";
      ctx.fillStyle = charging ? (drop ? "rgba(141, 231, 255, 0.14)" : "rgba(255, 209, 102, 0.12)") : "rgba(255, 95, 122, 0.2)";
      ctx.lineWidth = charging ? 3 : 5;
      ctx.beginPath();
      ctx.arc(attack.x, attack.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    function drawBossSlash(attack) {
      const charging = attack.age < attack.windup;
      const progress = clamp(attack.age / attack.windup, 0, 1);
      const reach = charging ? attack.radius * progress : attack.radius;
      const angle = Math.atan2(attack.dirY, attack.dirX);
      const left = angle - attack.arc / 2;
      const right = angle + attack.arc / 2;
      ctx.fillStyle = charging ? "rgba(255, 209, 102, 0.12)" : "rgba(255, 95, 122, 0.24)";
      ctx.strokeStyle = charging ? "#ffd166" : "#ff5f7a";
      ctx.lineWidth = charging ? 3 : 5;
      ctx.beginPath();
      ctx.moveTo(attack.x, attack.y);
      ctx.lineTo(attack.x + Math.cos(left) * reach, attack.y + Math.sin(left) * reach);
      ctx.arc(attack.x, attack.y, reach, left, right);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    return { draw };
  }

  const SHOP_FLOOR_PRICE_RATE = 0.03;
  const SHOP_INFLATION_RATE = 0.025;

  /**
   * @typedef {{ id: string, cost: number | number[], maxTier: number }} ShopPricingItem
   * @typedef {{ floorPriceRate?: number, inflationRate?: number }} ShopPricingConfig
   * @typedef {{
   *   coins: number,
   *   towerFloor?: number,
   *   shopPurchases?: Record<string, number>
   * }} ShopPricingSave
   * @typedef {{
   *   canBuy(item: ShopPricingItem): boolean,
   *   costFor(item: ShopPricingItem, tier: number): number,
   *   tierFor(item: ShopPricingItem): number
   * }} ShopPricingApi
   */

  /**
   * @param {{
   *   shopItemDefs: ShopPricingItem[],
   *   pricingConfig?: ShopPricingConfig,
   *   getSave: () => ShopPricingSave
   * }} options
   * @returns {ShopPricingApi}
   */
  function createShopPricing({ shopItemDefs, pricingConfig = {}, getSave }) {
    function floorPriceRate() {
      return Number.isFinite(pricingConfig.floorPriceRate)
        ? pricingConfig.floorPriceRate
        : SHOP_FLOOR_PRICE_RATE;
    }

    function inflationRate() {
      return Number.isFinite(pricingConfig.inflationRate)
        ? pricingConfig.inflationRate
        : SHOP_INFLATION_RATE;
    }

    function tierFor(item) {
      return getSave().shopPurchases?.[item.id] || 0;
    }

    function costFor(item, tier) {
      const baseCost = Array.isArray(item.cost) ? item.cost[tier] : item.cost;
      const floor = Math.max(1, getSave().towerFloor || 1);
      const floorMultiplier = floor <= 1 ? 1 : 1 + (floor - 1) * floorPriceRate();
      const inflationMultiplier = taperedInflationMultiplier(purchasedTierCount(item.id));
      return Math.ceil(baseCost * floorMultiplier * inflationMultiplier);
    }

    function taperedInflationMultiplier(purchasedTierCount) {
      return 1 + Math.log1p(Math.max(0, purchasedTierCount)) * inflationRate();
    }

    function purchasedTierCount(excludedItemId = "") {
      const purchases = getSave().shopPurchases || {};
      return shopItemDefs.reduce((total, item) => {
        if (item.id === excludedItemId) return total;
        return total + (purchases[item.id] || 0);
      }, 0);
    }

    function canBuy(item) {
      const save = getSave();
      const tier = tierFor(item);
      const cost = costFor(item, tier);
      return tier < item.maxTier && save.coins >= cost;
    }

    return {
      canBuy,
      costFor,
      tierFor,
    };
  }

  const MODULE_NATIVE_SHOP_SLOTS = Object.freeze(["shop"]);

  const MODULE_NATIVE_SHOP_PROOF_SLOTS = Object.freeze(["createShopSystem"]);

  /**
   * @param {any} [options]
   */
  function createShopSystem(options = {}) {
    const resolvedOptions = requireObject(options, "options");
    const documentRef = requireDocumentRef(resolvedOptions.documentRef);
    const ui = requireObject(resolvedOptions.ui, "ui");
    const effects = requireObject(resolvedOptions.effects, "effects");
    const shopPricing = requireObject(resolvedOptions.shopPricing, "shopPricing");
    const shopItemDefs = requireArray(resolvedOptions.shopItemDefs, "shopItemDefs");
    const getSave = requireFunction(resolvedOptions.getSave, "getSave");
    const getGame = requireFunction(resolvedOptions.getGame, "getGame");
    const persist = requireFunction(resolvedOptions.persist, "persist");
    const renderMeta = requireFunction(resolvedOptions.renderMeta, "renderMeta");
    const pricing = shopPricing.createShopPricing({
      shopItemDefs,
      pricingConfig: resolvedOptions.pricingConfig,
      getSave,
    });

    function canBuy(item) {
      return pricing.canBuy(item);
    }

    function buyItem(item) {
      if (!canBuy(item)) return;
      const save = getSave();
      const tier = pricing.tierFor(item);
      const cost = pricing.costFor(item, tier);
      save.coins -= cost;
      save.shopPurchases[item.id] = tier + 1;
      resolvedOptions.playPurchaseSfx?.();
      applyItemEffectToRun(item);
      persist();
      renderShop();
      showPurchaseNotice();
      renderMeta();
    }

    function showPurchaseNotice() {
      const message = "eh? The prices went up! Inflation huh.";
      resolvedOptions.onPurchaseNotice?.(message);
    }

    function applyItemEffectToRun(item) {
      effects.applyShopItemEffectToRun(getGame(), item);
    }

    function renderShop() {
      const save = getSave();
      if (isShopVisible()) resolvedOptions.onShopVisit?.();
      renderShopList(ui.shopItems, ui.shopCoinHud, save);
      renderShopList(ui.menuShopItems, ui.menuShopCoinHud, save);
      const notice = "Browser shop ready.";
      if (ui.shopNotice && !ui.shopNotice.textContent) ui.shopNotice.textContent = notice;
      if (ui.menuShopNotice && !ui.menuShopNotice.textContent) ui.menuShopNotice.textContent = notice;
    }

    function isShopVisible() {
      return !ui.shopModal?.classList.contains("hidden") || !ui.menuShopPanel?.classList.contains("hidden");
    }

    function renderShopList(container, coinHud, save) {
      if (!container || !coinHud) return;
      coinHud.textContent = `Coins: ${save.coins} | Tower Floor ${Math.max(1, save.towerFloor || 1)}`;
      container.innerHTML = "";
      if (!shopItemDefs.length) {
        const empty = documentRef.createElement("div");
        empty.className = "shop-item";
        empty.textContent = "No shop items yet.";
        container.appendChild(empty);
        return;
      }

      const groupedItems = groupShopItems(shopItemDefs);
      groupedItems.forEach((items, stat) => {
        const section = documentRef.createElement("section");
        section.className = "shop-section";
        if (section.dataset) section.dataset.shopStat = stat;
        else section.setAttribute?.("data-shop-stat", stat);

        const header = documentRef.createElement("div");
        header.className = "shop-section-header";
        const title = documentRef.createElement("h3");
        title.textContent = shopStatLabel(stat);
        const count = documentRef.createElement("span");
        count.className = "shop-section-count";
        count.textContent = `${items.length} items`;
        header.appendChild(title);
        header.appendChild(count);
        section.appendChild(header);

        const sectionGrid = documentRef.createElement("div");
        sectionGrid.className = "shop-section-grid";
        items.forEach((item) => sectionGrid.appendChild(renderShopItem(item, save)));
        section.appendChild(sectionGrid);
        container.appendChild(section);
      });
    }

    function renderShopItem(item, save) {
        const tier = pricing.tierFor(item);
        const maxed = tier >= item.maxTier;
        const cost = pricing.costFor(item, tier);
        const affordable = !maxed && save.coins >= cost;
        const el = documentRef.createElement("div");
        el.className = `shop-item ${affordable ? "available" : "locked"}`;
        if (el.dataset) el.dataset.shopItemId = item.id;
        else el.setAttribute?.("data-shop-item-id", item.id);
        el.innerHTML = `
          <div class="shop-item-icon">
            ${item.spritePath ? `<img class="shop-item-sprite" src="${item.spritePath}" alt="" />` : ""}
          </div>
          <div class="shop-item-copy">
            <strong>${item.name}</strong>
            <span>${item.description}</span><br />
            <span>Tier: ${tier}/${item.maxTier}</span><br />
            <span>${maxed ? "Maxed" : affordable ? `Cost: ${cost} coins` : `Needs ${cost} coins`}</span>
          </div>
        `;
        const button = documentRef.createElement("button");
        button.textContent = maxed ? "Maxed" : `Buy Tier ${tier + 1}`;
        button.disabled = maxed || !affordable;
        button.addEventListener("click", () => buyItem(item));
        el.appendChild(button);
        return el;
    }

    function openShop() {
      ui.shopModal.classList.remove("hidden");
      ui.menuShopPanel?.classList.remove("hidden");
      const game = getGame();
      if (game?.running && !game.paused) {
        game.paused = true;
        game.pauseReason = "shop";
      }
      renderShop();
    }

    function closeShop() {
      ui.shopModal.classList.add("hidden");
      ui.menuShopPanel?.classList.add("hidden");
      const game = getGame();
      if (game?.pauseReason === "shop") {
        game.paused = false;
        game.pauseReason = "";
      }
    }

    function getShopBonuses() {
      const save = getSave();
      const bonuses = effects.emptyShopBonuses();
      shopItemDefs.forEach((item) => {
        const tier = save.shopPurchases?.[item.id] || 0;
        effects.addShopItemBonus(bonuses, item, tier);
      });
      return bonuses;
    }

    return {
      closeShop,
      getShopBonuses,
      openShop,
      renderShop,
    };
  }

  function groupShopItems(items) {
    const groupedItems = new Map();
    items.forEach((item) => {
      const stat = item.effect?.stat || "other";
      const group = groupedItems.get(stat) || [];
      group.push(item);
      groupedItems.set(stat, group);
    });
    return groupedItems;
  }

  function shopStatLabel(stat) {
    const labels = {
      speed: "Movement Speed",
      pickupRadius: "Pickup Radius",
      maxHp: "Max Health",
      flatDamage: "Flat Damage",
      attackRadius: "Attack Radius",
      fireRate: "Fire Rate",
      percentDamage: "Percent Damage",
      relicFocus: "Relic Focus",
      other: "Other Boosts",
    };
    return labels[stat] || stat.replace(/([a-z])([A-Z])/g, "$1 $2");
  }

  function requireArray(value, name) {
    if (!Array.isArray(value)) {
      throw new Error(`Missing Tap Survivor native shop dependency: ${name}`);
    }
    return value;
  }

  function requireDocumentRef(value) {
    if (!value || typeof value.createElement !== "function") {
      throw new Error("Missing Tap Survivor native shop dependency: documentRef");
    }
    return value;
  }

  function requireFunction(value, name) {
    if (typeof value !== "function") {
      throw new Error(`Missing Tap Survivor native shop dependency: ${name}`);
    }
    return value;
  }

  function requireObject(value, name) {
    if (!value || typeof value !== "object") {
      throw new Error(`Missing Tap Survivor native shop dependency: ${name}`);
    }
    return value;
  }

  /**
   * @param {any} [options]
   */
  function createShellRelicUiAdapter(options = {}) {
    const {
      presenter,
      documentRef,
      root,
      onEquip,
      onUnequip,
      onSelect,
      onLockedSelect,
      getSave,
      relicSystem,
      persist,
      renderMeta,
      scheduler = {},
      lockPopupDelayMs = 1800,
      previewAdapter = {},
    } = options;
    let lockPopup = null;
    let lockPopupHideTimer = null;
    const previewDisposers = [];

    if (!presenter || typeof presenter.createInventoryViewModel !== "function") {
      throw new Error("Missing Tap Survivor module shell relic UI dependency: presenter");
    }
    if (!documentRef || typeof documentRef.createElement !== "function") {
      throw new Error("Missing Tap Survivor module shell relic UI dependency: documentRef");
    }
    if (!root || typeof root.appendChild !== "function") {
      throw new Error("Missing Tap Survivor module shell relic UI dependency: root");
    }

    function renderShellRelics(save = {}, renderOptions = {}) {
      return renderViewModel(presenter.createInventoryViewModel(save), renderOptions);
    }

    function renderViewModel(model, renderOptions = {}) {
      const selectedRelicId = renderOptions.selectedRelicId || model.selectedRelicId || "";
      const selectedRelic = findRelic(model, selectedRelicId);
      clearRoot(root);
      root.appendChild(createCharacterPanel(model));
      root.appendChild(createSummary(model));
      root.appendChild(createSlotList(model));
      root.appendChild(createAvailableList(model, selectedRelicId));
      if (selectedRelic) root.appendChild(createDetail(model, selectedRelic));
      return model;
    }

    function createCharacterPanel(model) {
      const panel = documentRef.createElement("section");
      panel.className = "relic-character-panel";
      appendText(documentRef, panel, "strong", "Character");
      appendText(documentRef, panel, "span", `Tower level ${model.towerFloor}`);
      return panel;
    }

    function createSummary(model) {
      const summary = documentRef.createElement("section");
      summary.className = "shell-relic-summary";
      model.summaryRows.forEach((row) => {
        const item = documentRef.createElement("div");
        item.className = "shell-relic-summary-row";
        item.textContent = `${row.label}: ${row.value}`;
        summary.appendChild(item);
      });
      appendText(documentRef, summary, "div", `Can equip more: ${model.canEquipMore ? "Yes" : "No"}`, {
        className: "shell-relic-summary-row",
      });
      appendBonusRows(documentRef, summary, "Run-start bonuses", model.bonuses?.startingRunUpgradeTiers);
      appendBonusRows(documentRef, summary, "Max-tier bonuses", model.bonuses?.maxTierBonuses);
      appendModifierRows(documentRef, summary, model.specialModifiers);
      return summary;
    }

    function createSlotList(model) {
      const list = documentRef.createElement("section");
      list.className = "shell-relic-slots";
      model.slots.forEach((slot) => {
        const item = documentRef.createElement("article");
        const relic = slot.relic;
        item.className = [
          "relic-slot",
          slot.unlocked ? "unlocked" : "locked",
          relic ? "equipped" : "empty",
          relic?.rarity === "green" ? "green-relic" : "",
        ]
          .filter(Boolean)
          .join(" ");
        item.dataset.slotIndex = String(slot.index);
        if (relic) item.dataset.relicId = relic.id;
        setRelicBackground(item, relic);
        appendText(documentRef, item, "span", slot.label, { className: "relic-slot-index" });
        if (!slot.unlocked) {
          appendText(documentRef, item, "strong", "Locked");
          appendText(documentRef, item, "span", `Unlocked at tower level ${slot.unlockLevel}.`);
        } else if (!relic) {
          appendText(documentRef, item, "strong", "Empty relic slot");
          appendText(documentRef, item, "span", "Equip an unlocked relic below.");
        } else {
          item.appendChild(createRelicImage(documentRef, relic));
          appendText(documentRef, item, "strong", relic.name);
          appendText(documentRef, item, "span", relic.description);
          const button = documentRef.createElement("button");
          button.type = "button";
          button.textContent = "Unequip";
          button.dataset.action = "unequip";
          button.addEventListener("click", () => {
            const changed = commitRelicState(relic, false);
            onUnequip?.(relic, model, { changed });
          });
          item.appendChild(button);
        }
        list.appendChild(item);
      });
      return list;
    }

    function createAvailableList(model, selectedRelicId) {
      const list = documentRef.createElement("section");
      list.className = "relic-icon-grid shell-relic-available";
      if (!model.availableRelics.length) {
        appendText(documentRef, list, "div", "All relics are equipped.", { className: "relic-item locked" });
        return list;
      }
      model.availableRelics.forEach((relic) => {
        const button = documentRef.createElement("button");
        button.type = "button";
        button.className = [
          "relic-icon-button",
          "shell-relic-row",
          relic.unlocked ? "available" : "locked",
          relic.id === selectedRelicId ? "selected" : "",
          relic.rarity === "green" ? "green-relic" : "",
        ]
          .filter(Boolean)
          .join(" ");
        button.disabled = false;
        button.dataset.relicId = relic.id;
        button.dataset.unlocked = String(relic.unlocked);
        setAriaLabel(button, relic.unlocked ? `View ${relic.name}` : `${relic.name} locked`);
        setRelicBackground(button, relic);
        button.appendChild(createRelicImage(documentRef, relic));
        appendText(documentRef, button, "span", relic.name);
        if (!relic.unlocked) appendText(documentRef, button, "em", "Locked", { className: "relic-lock-badge" });
        if (relic.linkedSkill) appendText(documentRef, button, "span", `Linked skill: ${relic.linkedSkill.name}`);
        button.addEventListener("click", () => {
          if (relic.unlocked) onSelect?.(relic, model);
          else {
            showLockedMessage();
            onLockedSelect?.(relic, model);
          }
        });
        list.appendChild(button);
      });
      return list;
    }

    function createDetail(model, relic) {
      const detail = documentRef.createElement("section");
      detail.className = `relic-detail-screen ${relic.rarity === "green" ? "green-relic" : ""}`;
      detail.dataset.relicId = relic.id;
      setRelicBackground(detail, relic);
      detail.appendChild(createRelicPreview(relic));
      appendText(documentRef, detail, "span", "Selected relic", { className: "relic-slot-index" });
      appendText(documentRef, detail, "strong", relic.name);
      appendText(documentRef, detail, "p", relic.description);
      if (relic.specialAbility) {
        appendText(documentRef, detail, "p", `${relic.specialAbility.label}: ${relic.specialAbility.description}`, {
          className: "relic-special-ability",
        });
      }
      if (relic.linkedSkill) appendText(documentRef, detail, "p", `Linked skill: ${relic.linkedSkill.name}`);

      const actions = documentRef.createElement("div");
      actions.className = "relic-detail-actions";
      const equipButton = documentRef.createElement("button");
      equipButton.type = "button";
      equipButton.textContent = "Equip relic";
      equipButton.dataset.action = "equip";
      equipButton.disabled = !relic.unlocked || relic.equipped || !model.canEquipMore;
      equipButton.addEventListener("click", () => {
        if (!equipButton.disabled) {
          const changed = commitRelicState(relic, true);
          onEquip?.(relic, model, { changed });
        }
      });
      const cancelButton = documentRef.createElement("button");
      cancelButton.type = "button";
      cancelButton.textContent = "Cancel";
      cancelButton.dataset.action = "cancel";
      cancelButton.addEventListener("click", () => onSelect?.(null, model));
      actions.appendChild(equipButton);
      actions.appendChild(cancelButton);
      detail.appendChild(actions);
      return detail;
    }

    return {
      dispose,
      renderShellRelics,
      renderViewModel,
      showLockedMessage,
    };

    function commitRelicState(relic, equipped) {
      const save = getSave?.();
      const changed = Boolean(save && relicSystem?.setRelicEquipped?.(save, relic.id, equipped));
      if (!changed) return false;
      persist?.(save);
      renderShellRelics(save);
      renderMeta?.(save);
      return true;
    }

    function showLockedMessage() {
      if (!lockPopup) {
        lockPopup = documentRef.createElement("div");
        lockPopup.className = "relic-lock-popup";
        root.appendChild(lockPopup);
      }
      lockPopup.textContent = "Locked, play more to unlock this skill.";
      removeClass(lockPopup, "hidden");
      if (lockPopupHideTimer) scheduler.clearTimeout?.(lockPopupHideTimer);
      lockPopupHideTimer =
        scheduler.setTimeout?.(() => {
          if (lockPopup?.isConnected !== false) addClass(lockPopup, "hidden");
          lockPopupHideTimer = null;
        }, lockPopupDelayMs) || null;
      return lockPopup;
    }

    function dispose() {
      if (lockPopupHideTimer) scheduler.clearTimeout?.(lockPopupHideTimer);
      lockPopupHideTimer = null;
      while (previewDisposers.length) previewDisposers.pop()?.();
    }

    function createRelicPreview(relic) {
      const sprite = previewAdapter.runUpgradeSprite?.(relic.targetUpgradeId);
      const frames = Array.isArray(sprite?.frames) ? sprite.frames : [];
      const source = previewAdapter.spriteSource?.(sprite) || sprite?.src || sprite?.path || sprite?.iconSrc || "";
      if (frames.length && source && previewAdapter.createCanvas && previewAdapter.createImage) {
        const canvas =
          previewAdapter.createCanvas({
            className: "relic-detail-preview relic-detail-canvas",
            height: 112,
            relic,
            sprite,
            width: 112,
          }) || documentRef.createElement("canvas");
        canvas.className = "relic-detail-preview relic-detail-canvas";
        canvas.width = 112;
        canvas.height = 112;
        if (startAnimatedPreview({ canvas, frames, relic, source, sprite })) return canvas;
      }
      return createRelicImage(documentRef, relic, "relic-detail-preview");
    }

    function startAnimatedPreview({ canvas, frames, relic, source, sprite }) {
      const context = previewAdapter.getContext?.(canvas, { willReadFrequently: true }) || canvas.getContext?.("2d", { willReadFrequently: true });
      const image = previewAdapter.createImage?.({ relic, source, sprite });
      if (!context || !image) return false;
      let frameIndex = 0;
      let timer = null;
      let stopped = false;

      function drawFrame() {
        if (stopped || canvas.isConnected === false) return;
        const frame = frames[frameIndex % frames.length];
        frameIndex += 1;
        previewAdapter.clearFrame?.({ canvas, context, sprite });
        if (!previewAdapter.clearFrame) context.clearRect?.(0, 0, canvas.width, canvas.height);
        context.imageSmoothingEnabled = false;
        previewAdapter.drawFrame?.({ canvas, context, frame, image, sprite });
        if (!previewAdapter.drawFrame) {
          context.drawImage?.(image, frame.x, frame.y, frame.width, frame.height, 0, 0, canvas.width, canvas.height);
        }
        previewAdapter.applyTransparency?.({ canvas, context, sprite });
        timer = scheduler.setTimeout?.(drawFrame, 1000 / Math.max(1, sprite.fps || 10)) || null;
      }

      const onLoad = () => drawFrame();
      if (typeof image.addEventListener === "function") image.addEventListener("load", onLoad, { once: true });
      else previewAdapter.onImageLoad?.(image, onLoad) ?? onLoad();
      if ("src" in image) image.src = source;
      else previewAdapter.setImageSource?.(image, source);
      previewDisposers.push(() => {
        stopped = true;
        if (timer) scheduler.clearTimeout?.(timer);
        previewAdapter.disposeImage?.(image);
      });
      return true;
    }
  }

  /**
   * Classic shell relic UI compatibility adapter.
   *
   * This preserves the production API consumed by src/shell-ui.js while keeping
   * the implementation in the module tree for generated bridge output.
   *
   * @param {any} [options]
   */
  function createShellRelicUi(options = {}) {
    const {
      ui,
      content = {},
      documentRef = document,
      assetResolver,
      getSave,
      relicDefs = [],
      relicSystem,
      persist,
      renderMeta,
      scheduler = {
        clearTimeout: (timer) => clearTimeout(timer),
        setTimeout: (callback, delay) => setTimeout(callback, delay),
        animationSetTimeout: (callback, delay) => setTimeout(callback, delay),
      },
      imageFactory = () => (typeof Image === "undefined" ? null : new Image()),
    } = options;

    function renderInventory() {
      if (!ui.menuRelicSlots || !ui.menuRelicInventory || !relicSystem) return;
      const save = getSave();
      const slots = relicSystem.maxEquippedRelics(save);
      const equippedRelics = relicSystem.equippedRelics(save);
      const equipped = new Set(equippedRelics.map((relic) => relic.id));
      const unlocked = new Set(save.unlockedRelics || []);
      const nextLevel = slots >= 5 ? null : (slots + 1) * 10;
      ui.menuRelicSlots.textContent = `Relic slots: ${slots}/5 unlocked. ${
        nextLevel ? `Next slot at tower level ${nextLevel}.` : "Maximum slots unlocked."
      }`;
      ui.menuRelicInventory.innerHTML = "";
      const loadout = documentRef.createElement("div");
      loadout.className = "relic-loadout";
      loadout.appendChild(createCharacterPanel(save));

      const slotGrid = documentRef.createElement("div");
      slotGrid.className = "relic-slots";
      for (let index = 0; index < 5; index += 1) {
        slotGrid.appendChild(createRelicSlot(index, slots, equippedRelics[index]));
      }
      loadout.appendChild(slotGrid);
      ui.menuRelicInventory.appendChild(loadout);

      const inventoryRelics = relicDefs.filter((relic) => !equipped.has(relic.id));
      const list = documentRef.createElement("div");
      list.className = "relic-icon-grid";
      if (!inventoryRelics.length) {
        const empty = documentRef.createElement("div");
        empty.className = "relic-item locked";
        empty.textContent = "All relics are equipped.";
        list.appendChild(empty);
        ui.menuRelicInventory.appendChild(list);
        return;
      }
      inventoryRelics.forEach((relic) => {
        list.appendChild(createRelicIconButton(relic, unlocked.has(relic.id)));
      });
      ui.menuRelicInventory.appendChild(list);
    }

    function createRelicIconButton(relic, isUnlocked = true) {
      const button = documentRef.createElement("button");
      button.className = `relic-icon-button ${isUnlocked ? "available" : "locked"} ${
        relic.rarity === "green" ? "green-relic" : ""
      }`;
      setRelicBackground(button, relic);
      button.type = "button";
      button.setAttribute("aria-label", isUnlocked ? `View ${relic.name}` : `${relic.name} locked`);
      button.innerHTML = `
        <img class="relic-icon" src="${relicIconSrc(relic)}" alt="" />
        <span>${relic.name}</span>
        ${isUnlocked ? "" : '<em class="relic-lock-badge">Locked</em>'}
      `;
      button.addEventListener("click", () => {
        if (!isUnlocked) {
          showRelicLockedMessage();
          return;
        }
        openRelicDetail(relic);
      });
      return button;
    }

    function relicIconSrc(relic) {
      return assetResolver.relicIcon(relic);
    }

    function showRelicLockedMessage() {
      if (!ui.menuRelicInventory) return;
      let popup = ui.menuRelicInventory.querySelector?.(".relic-lock-popup");
      if (!popup) {
        popup = documentRef.createElement("div");
        popup.className = "relic-lock-popup";
        ui.menuRelicInventory.prepend?.(popup) || ui.menuRelicInventory.appendChild(popup);
      }
      popup.textContent = "Locked, play more to unlock this skill.";
      popup.classList.remove("hidden");
      scheduler.clearTimeout?.(popup.hideTimer);
      popup.hideTimer = scheduler.setTimeout?.(() => {
        if (popup.isConnected) popup.classList.add("hidden");
      }, 1800);
    }

    function openRelicDetail(relic) {
      const save = getSave();
      const slots = relicSystem.maxEquippedRelics(save);
      const equippedRelics = relicSystem.equippedRelics(save);
      const canEquip = equippedRelics.length < slots;
      const skill = (content?.runUpgrades || []).find((upgrade) => upgrade.id === relic.targetUpgradeId);
      ui.menuRelicSlots.textContent = relic.name;
      ui.menuRelicInventory.innerHTML = "";

      const detail = documentRef.createElement("div");
      detail.className = `relic-detail-screen ${relic.rarity === "green" ? "green-relic" : ""}`;
      setRelicBackground(detail, relic);
      const preview = createRelicSkillPreview(relic);
      detail.appendChild(preview);
      const copy = documentRef.createElement("div");
      copy.className = "relic-detail-copy";
      copy.innerHTML = `
        <span class="relic-slot-index">Selected relic</span>
        <strong>${relic.name}</strong>
        <p>${relic.description}</p>
        ${relic.specialAbility ? `<p><strong>${relic.specialAbility.label}</strong>: ${relic.specialAbility.description}</p>` : ""}
        ${skill ? `<p>Linked skill: ${skill.name}</p>` : ""}
      `;
      detail.appendChild(copy);

      const actions = documentRef.createElement("div");
      actions.className = "relic-detail-actions";
      const equipButton = documentRef.createElement("button");
      equipButton.type = "button";
      equipButton.textContent = "Equip relic";
      equipButton.disabled = !canEquip;
      equipButton.addEventListener("click", () => {
        if (relicSystem.setRelicEquipped(save, relic.id, true)) {
          persist?.();
          renderInventory();
          renderMeta();
        }
      });
      const cancelButton = documentRef.createElement("button");
      cancelButton.type = "button";
      cancelButton.textContent = "Cancel";
      cancelButton.addEventListener("click", renderInventory);
      actions.appendChild(equipButton);
      actions.appendChild(cancelButton);
      detail.appendChild(actions);
      ui.menuRelicInventory.appendChild(detail);
    }

    function createRelicSkillPreview(relic) {
      const sprite = assetResolver.runUpgradeSprite(relic.targetUpgradeId);
      const frames = Array.isArray(sprite?.frames) ? sprite.frames : [];
      const image = imageFactory();
      if (frames.length && image) {
        const canvas = documentRef.createElement("canvas");
        canvas.className = "relic-detail-preview relic-detail-canvas";
        canvas.width = 112;
        canvas.height = 112;
        if (animateRelicSkillPreview(canvas, sprite, image)) return canvas;
      }
      const fallbackImage = documentRef.createElement("img");
      fallbackImage.className = "relic-detail-preview";
      fallbackImage.src = relicIconSrc(relic);
      fallbackImage.alt = "";
      return fallbackImage;
    }

    function animateRelicSkillPreview(canvas, sprite, image) {
      const ctx = canvas.getContext?.("2d", { willReadFrequently: true });
      const frames = Array.isArray(sprite?.frames) ? sprite.frames : [];
      const src = assetResolver.spriteSource(sprite);
      if (!ctx || !frames.length || !src) return false;
      let frameIndex = 0;
      function drawFrame() {
        if (canvas.isConnected === false) return;
        const frame = frames[frameIndex % frames.length];
        frameIndex += 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height, 0, 0, canvas.width, canvas.height);
        applyPreviewTransparency(ctx, canvas.width, canvas.height, sprite);
        scheduler.animationSetTimeout?.(drawFrame, 1000 / Math.max(1, sprite.fps || 10));
      }
      image.addEventListener?.("load", drawFrame, { once: true });
      image.src = src;
      return true;
    }

    function applyPreviewTransparency(ctx, width, height, sprite) {
      const color = sprite?.transparentColor;
      if (!Array.isArray(color) || color.length < 3) return;
      const tolerance = Math.max(0, Number(sprite.transparentTolerance ?? 28));
      try {
        const pixels = ctx.getImageData(0, 0, width, height);
        const data = pixels.data;
        for (let index = 0; index < data.length; index += 4) {
          const delta = Math.abs(data[index] - color[0]) + Math.abs(data[index + 1] - color[1]) + Math.abs(data[index + 2] - color[2]);
          if (delta <= tolerance) data[index + 3] = 0;
        }
        ctx.putImageData(pixels, 0, 0);
      } catch {
        // If a browser blocks pixel reads, the preview still shows the untrimmed frame.
      }
    }

    function createCharacterPanel(save) {
      const panel = documentRef.createElement("div");
      panel.className = "relic-character-panel";
      const playerSprite = content?.assets?.sprites?.player || "assets/kenney/desert-shooter/player.png?v=kenney-20260610";
      panel.innerHTML = `
        <img class="relic-character-sprite" src="${playerSprite}" alt="" />
        <span>
          <strong>Character</strong>
          <span>Tower level ${Math.max(1, save.towerFloor || 1)}</span>
        </span>
      `;
      return panel;
    }

    function createRelicSlot(index, unlockedSlots, relic) {
      const slot = documentRef.createElement("div");
      const unlockLevel = (index + 1) * 10;
      const unlocked = index < unlockedSlots;
      slot.className = `relic-slot ${unlocked ? (relic ? "equipped" : "empty") : "locked"} ${relic?.rarity === "green" ? "green-relic" : ""}`;
      setRelicBackground(slot, relic);
      if (!unlocked) {
        slot.innerHTML = `
          <span class="relic-slot-index">Slot ${index + 1}</span>
          <strong>Locked</strong>
          <span>Unlocked at tower level ${unlockLevel}.</span>
        `;
        return slot;
      }
      if (!relic) {
        slot.innerHTML = `
          <span class="relic-slot-index">Slot ${index + 1}</span>
          <strong>Empty relic slot</strong>
          <span>Equip an unlocked relic below.</span>
        `;
        return slot;
      }

      slot.innerHTML = `
        <img class="relic-icon" src="${relicIconSrc(relic)}" alt="" />
        <span>
          <span class="relic-slot-index">Slot ${index + 1}</span>
          <strong>${relic.name}</strong>
          <span>${relic.description}</span>
        </span>
      `;
      const button = documentRef.createElement("button");
      button.textContent = "Unequip";
      button.addEventListener("click", () => {
        const save = getSave();
        if (relicSystem.setRelicEquipped(save, relic.id, false)) {
          persist?.();
          renderInventory();
          renderMeta();
        }
      });
      slot.appendChild(button);
      return slot;
    }

    return {
      renderInventory,
    };
  }

  function appendBonusRows(documentRef, parent, label, values = {}) {
    Object.entries(values)
      .filter(([, value]) => value)
      .sort(([left], [right]) => left.localeCompare(right))
      .forEach(([key, value]) => {
        appendText(documentRef, parent, "div", `${label}: ${key} +${value}`, { className: "shell-relic-bonus-row" });
      });
  }

  function appendModifierRows(documentRef, parent, modifiers = []) {
    modifiers.forEach((modifier) => {
      appendText(documentRef, parent, "div", `Special modifier: ${modifier.key} +${modifier.value}`, {
        className: "shell-relic-special-row",
      });
    });
  }

  function findRelic(model, relicId) {
    if (!relicId) return null;
    return [...(model.equippedRelics || []), ...(model.availableRelics || [])].find((relic) => relic.id === relicId) || null;
  }

  function createRelicImage(documentRef, relic, className = "relic-icon") {
    const image = documentRef.createElement("img");
    image.className = className;
    image.src = relic?.iconSrc || "";
    image.alt = "";
    return image;
  }

  function appendText(documentRef, parent, tagName, text, attributes = {}) {
    const item = documentRef.createElement(tagName);
    item.textContent = text;
    Object.assign(item, attributes);
    parent.appendChild(item);
    return item;
  }

  function setAriaLabel(element, label) {
    if (typeof element.setAttribute === "function") element.setAttribute("aria-label", label);
    else element.ariaLabel = label;
  }

  function setRelicBackground(element, relic) {
    if (!element?.style || !relic?.backgroundColor) return;
    if (typeof element.style.setProperty === "function") element.style.setProperty("--relic-bg", relic.backgroundColor);
    else element.style["--relic-bg"] = relic.backgroundColor;
  }

  function addClass(element, className) {
    const current = new Set(String(element.className || "").split(/\s+/).filter(Boolean));
    current.add(className);
    element.className = [...current].join(" ");
  }

  function removeClass(element, className) {
    const current = new Set(String(element.className || "").split(/\s+/).filter(Boolean));
    current.delete(className);
    element.className = [...current].join(" ");
  }

  function clearRoot(root) {
    if (typeof root.replaceChildren === "function") {
      root.replaceChildren();
      return;
    }
    root.innerHTML = "";
    if (Array.isArray(root.children)) root.children.length = 0;
  }

  const DEFAULT_PANELS = [
    { id: "progress", label: "Progress", type: "progress" },
    { id: "shop", label: "Shop", type: "shop" },
    { id: "inventory", label: "Inventory", type: "relics" },
  ];

  /**
   * Builds deterministic shell UI view models without touching DOM state.
   *
   * @param {any} [options]
   */
  function createShellUiPresenter(options = {}) {
    const { panelDefs = DEFAULT_PANELS } = options;
    const normalizedPanels = normalizePanelDefs(panelDefs);

    function createShellViewModel(state = {}) {
      const panelIds = new Set(normalizedPanels.map((panel) => panel.id));
      const activePanel = panelIds.has(state.panel) ? state.panel : normalizedPanels[0]?.id || "progress";
      const screen = state.screen || "title";
      const menuOpen = Boolean(state.menuOpen);
      const initialized = Boolean(state.initialized);
      const disposed = Boolean(state.disposed);
      const startingTransition = screen === "startingTransition";
      const panels = normalizedPanels.map((panel) => ({
        ...panel,
        active: panel.id === activePanel,
        ariaSelected: panel.id === activePanel ? "true" : "false",
        className: panel.id === activePanel ? "active" : "",
        hidden: panel.id !== activePanel,
      }));

      return {
        activePanel,
        actions: {
          canExitRun: Boolean(state.canExitRun ?? screen === "game"),
          canOpenMenu: !disposed,
          canStartRun: Boolean(state.canStartRun ?? screen === "title"),
          fullscreenLabel: state.fullscreen ? "Exit Full Screen" : "Full Screen",
          muteLabel: state.muted ? "Muted" : "Sound",
          muted: Boolean(state.muted),
          openMenuExpanded: String(menuOpen),
        },
        disposed,
        initialized,
        menuOpen,
        panels,
        screen,
        sections: Object.fromEntries(
          panels.map((panel) => [
            panel.id,
            {
              active: panel.active,
              className: ["module-shell-panel", panel.active ? "active" : "hidden"].filter(Boolean).join(" "),
              hidden: panel.hidden,
              label: panel.label,
              text: sectionCopy(panel),
              type: panel.type,
            },
          ])
        ),
        startTransitionVisible: startingTransition,
        titleVisible: screen === "title",
        visible: {
          runMenu: menuOpen,
          startTransition: startingTransition,
          title: screen === "title",
        },
      };
    }

    return {
      createShellViewModel,
    };
  }

  function sectionCopy(panel) {
    if (panel.type === "relics") return "Relic inventory";
    if (panel.type === "shop") return "Shop panel";
    return "Progress panel";
  }

  function normalizePanelDefs(panelDefs) {
    const seen = new Set();
    return panelDefs
      .filter((panel) => panel?.id && !seen.has(panel.id))
      .map((panel) => {
        seen.add(panel.id);
        return {
          id: String(panel.id),
          label: String(panel.label || panel.id),
          type: String(panel.type || panel.id),
        };
      });
  }

  /**
   * Applies shell UI presenter models to injected DOM dependencies.
   *
   * @param {any} [options]
   */
  function createShellUiDomAdapter(options = {}) {
    const {
      presenter = createShellUiPresenter(),
      documentRef,
      root,
      shellRelicController,
      getSave = () => ({}),
      onCloseMenu,
      onExitRun,
      onMuteToggle,
      onOpenPanel,
      onOpenShop,
      onResetSave,
      onSetGameSpeed,
      onToggleFullscreen,
      onStartRun,
      speedOptions = [1, 2, 5],
    } = options;

    if (!presenter || typeof presenter.createShellViewModel !== "function") {
      throw new Error("Missing Tap Survivor module shell UI adapter dependency: presenter");
    }
    if (!documentRef || typeof documentRef.createElement !== "function") {
      throw new Error("Missing Tap Survivor module shell UI adapter dependency: documentRef");
    }
    if (!root || typeof root.appendChild !== "function") {
      throw new Error("Missing Tap Survivor module shell UI adapter dependency: root");
    }

    let currentModel = null;
    const eventCleanups = [];

    function render(state = {}) {
      cleanupEvents();
      currentModel = presenter.createShellViewModel(state);
      clearRoot(root);
      root.appendChild(createShellFrame(currentModel));
      if (currentModel.activePanel === "inventory") shellRelicController?.render?.(getSave());
      return currentModel;
    }

    function update(state = {}) {
      return render(state);
    }

    function openPanel(panelId, state = {}) {
      onOpenPanel?.(panelId, currentModel);
      return render({ ...state, panel: panelId, menuOpen: true });
    }

    function dispose() {
      cleanupEvents();
      clearRoot(root);
    }

    function setMenuOpen(open, state = {}) {
      return render({ ...state, menuOpen: Boolean(open) });
    }

    function setScreen(screen, state = {}) {
      return render({ ...state, screen });
    }

    function showPanel(panelId, state = {}) {
      return openPanel(panelId, state);
    }

    function createShellFrame(model) {
      const frame = documentRef.createElement("section");
      frame.className = "module-shell-frame";
      frame.dataset.screen = model.screen;
      frame.dataset.activePanel = model.activePanel;

      appendText(frame, "strong", model.titleVisible ? "Tap Survivor" : "Run Menu", {
        className: "module-shell-title",
      });

      const actions = documentRef.createElement("div");
      actions.className = "module-shell-actions";
      const startButton = documentRef.createElement("button");
      startButton.type = "button";
      startButton.textContent = "Start Run";
      startButton.dataset.action = "start-run";
      startButton.disabled = !model.actions.canStartRun;
      addListener(startButton, "click", () => {
        if (!startButton.disabled) onStartRun?.(model);
      });
      actions.appendChild(startButton);

      const openMenuButton = createActionButton("open-menu", "Menu", () => onOpenPanel?.(model.activePanel, model));
      openMenuButton.setAttribute("aria-expanded", model.actions.openMenuExpanded);
      actions.appendChild(openMenuButton);
      actions.appendChild(createActionButton("close-menu", "Close", () => onCloseMenu?.(model)));
      actions.appendChild(createActionButton("open-shop", "Shop", () => onOpenShop?.(model)));
      actions.appendChild(createActionButton("exit-run", "Exit Run", () => onExitRun?.(model), !model.actions.canExitRun));
      actions.appendChild(createActionButton("reset-save", "Reset Save", () => onResetSave?.(model)));
      actions.appendChild(createActionButton("fullscreen", model.actions.fullscreenLabel, () => onToggleFullscreen?.(model)));
      const muteButton = createActionButton("mute", model.actions.muteLabel, () => onMuteToggle?.(model));
      muteButton.setAttribute("aria-pressed", String(model.actions.muted));
      actions.appendChild(muteButton);
      speedOptions.forEach((speed) => {
        const speedButton = createActionButton(`speed-${speed}`, `x${speed}`, () => onSetGameSpeed?.(speed, model));
        speedButton.dataset.speed = String(speed);
        actions.appendChild(speedButton);
      });
      frame.appendChild(actions);

      const tabs = documentRef.createElement("nav");
      tabs.className = "module-shell-tabs";
      model.panels.forEach((panel) => {
        const tab = documentRef.createElement("button");
        tab.type = "button";
        tab.textContent = panel.label;
        tab.className = panel.active ? "active" : "";
        tab.dataset.panelId = panel.id;
        tab.setAttribute("aria-selected", panel.ariaSelected);
        addListener(tab, "click", () => openPanel(panel.id, model));
        tabs.appendChild(tab);
      });
      frame.appendChild(tabs);

      const panels = documentRef.createElement("div");
      panels.className = "module-shell-panels";
      model.panels.forEach((panel) => {
        const section = documentRef.createElement("section");
        const sectionModel = model.sections[panel.id];
        section.className = sectionModel.className;
        section.dataset.panelId = panel.id;
        section.dataset.sectionType = panel.type;
        section.hidden = sectionModel.hidden;
        appendText(section, "h2", panel.label);
        appendText(section, "span", sectionModel.text);
        if (panel.type === "relics") {
          const mount = documentRef.createElement("div");
          mount.className = "module-shell-relic-mount";
          mount.dataset.delegate = "shell-relic-controller";
          section.appendChild(mount);
        }
        panels.appendChild(section);
      });
      frame.appendChild(panels);
      return frame;
    }

    function appendText(parent, tagName, text, options = {}) {
      const element = documentRef.createElement(tagName);
      element.textContent = text;
      if (options.className) element.className = options.className;
      parent.appendChild(element);
      return element;
    }

    function createActionButton(action, label, callback, disabled = false) {
      const button = documentRef.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.dataset.action = action;
      button.disabled = Boolean(disabled);
      addListener(button, "click", () => {
        if (!button.disabled) callback?.();
      });
      return button;
    }

    function addListener(element, type, handler) {
      element.addEventListener(type, handler);
      eventCleanups.push(() => element.removeEventListener?.(type, handler));
    }

    function cleanupEvents() {
      while (eventCleanups.length) eventCleanups.pop()?.();
    }

    return {
      dispose,
      openPanel,
      render,
      setMenuOpen,
      setScreen,
      showPanel,
      update,
    };
  }

  function clearRoot(root) {
    if (typeof root.replaceChildren === "function") root.replaceChildren();
    else root.children = [];
    if ("textContent" in root) root.textContent = "";
  }

  /**
   * Owns only the module-native shell UI lifecycle contract.
   *
   * Production shell-ui DOM wiring stays classic for now; this controller is the
   * module-native seam for future ownership handoff.
   *
   * @param {any} [options]
   */
  function createModuleShellUiController(options = {}) {
    const {
      shellRelicController,
      getSave = () => ({}),
      shellView,
      presenter = createShellUiPresenter(),
      createShellView = createShellUiDomAdapter,
      documentRef,
      root,
      initialScreen = "title",
      initialPanel = "progress",
      onStartRun,
      onExitRun,
      onResetSave,
      onOpenShop,
      onCloseShop,
      onSetGameSpeed,
    } = options;

    if (!shellRelicController || typeof shellRelicController.render !== "function") {
      throw new Error("Missing Tap Survivor module shell UI dependency: shellRelicController");
    }
    if (!presenter || typeof presenter.createShellViewModel !== "function") {
      throw new Error("Missing Tap Survivor module shell UI dependency: presenter");
    }

    const viewOwnsRelicPanel = Boolean(!shellView && documentRef && root);
    const view =
      shellView ||
      (documentRef && root
        ? createShellView({
            documentRef,
            getSave,
            onCloseMenu: () => closeMenu(),
            onExitRun: () => exitRun(),
            onMuteToggle: () => toggleMute(),
            onOpenPanel: (panel) => {
              state = {
                ...state,
                menuOpen: true,
                panel,
              };
              options.onOpenPanel?.(panel, snapshot());
            },
            onOpenShop: () => openShop(),
            onResetSave: () => resetSave(),
            onSetGameSpeed: (speed) => setGameSpeed(speed),
            onStartRun: () => startRun(),
            onToggleFullscreen: () => toggleFullscreen(),
            presenter,
            root,
            shellRelicController,
          })
        : {});

    let state = {
      disposed: false,
      initialized: false,
      menuOpen: false,
      panel: initialPanel,
      screen: initialScreen,
    };

    function init(nextState = {}) {
      state = {
        ...state,
        ...nextState,
        initialized: true,
      };
      return render();
    }

    function render(nextState = {}) {
      state = {
        ...state,
        ...nextState,
      };
      view.render?.(snapshot());
      if (state.panel === "inventory" && !viewOwnsRelicPanel) shellRelicController.render(getSave());
      return snapshot();
    }

    function update(nextState = {}) {
      state = {
        ...state,
        ...nextState,
      };
      view.update?.(snapshot());
      if (state.panel === "inventory" && !viewOwnsRelicPanel) shellRelicController.update?.(getSave());
      return snapshot();
    }

    function openMenu(panel = state.panel) {
      state = {
        ...state,
        menuOpen: true,
      };
      view.setMenuOpen?.(true, snapshot());
      return openPanel(panel);
    }

    function closeMenu() {
      state = {
        ...state,
        menuOpen: false,
      };
      view.setMenuOpen?.(false, snapshot());
      return snapshot();
    }

    function openPanel(panel) {
      state = {
        ...state,
        panel,
      };
      if (typeof view.openPanel === "function") view.openPanel(panel, snapshot());
      else view.showPanel?.(panel, snapshot());
      if (panel === "inventory" && !viewOwnsRelicPanel) shellRelicController.render(getSave());
      return snapshot();
    }

    function selectRelic(relicId) {
      return shellRelicController.selectRelic?.(relicId);
    }

    function startRun() {
      onStartRun?.(snapshot());
      state = {
        ...state,
        screen: "game",
      };
      view.setScreen?.("game", snapshot());
      return snapshot();
    }

    function exitRun() {
      onExitRun?.(snapshot());
      return snapshot();
    }

    function resetSave() {
      onResetSave?.(snapshot());
      return snapshot();
    }

    function openShop() {
      onOpenShop?.(snapshot());
      return openPanel("shop");
    }

    function closeShop() {
      onCloseShop?.(snapshot());
      return openPanel("progress");
    }

    function setGameSpeed(speed) {
      onSetGameSpeed?.(speed, snapshot());
      return snapshot();
    }

    function toggleFullscreen() {
      options.onToggleFullscreen?.(snapshot());
      return snapshot();
    }

    function toggleMute() {
      options.onMuteToggle?.(snapshot());
      return snapshot();
    }

    function dispose() {
      state = {
        ...state,
        disposed: true,
      };
      shellRelicController.dispose?.();
      view.dispose?.(snapshot());
      return snapshot();
    }

    function snapshot() {
      return { ...state };
    }

    return {
      closeMenu,
      closeShop,
      dispose,
      exitRun,
      init,
      openMenu,
      openPanel,
      openShop,
      render,
      resetSave,
      selectRelic,
      setGameSpeed,
      startRun,
      toggleFullscreen,
      toggleMute,
      update,
    };
  }

  /**
   * Classic production shell UI adapter.
   *
   * Keeps the legacy dependency-bag and returned API shape while routing shell
   * state through the module-native controller.
   *
   * @param {any} options
   */
  function createShellUiController({
    ui,
    assets,
    content = {},
    shellRelicUi,
    documentRef = document,
    scheduler = {
      clearTimeout: (timer) => clearTimeout(timer),
      setTimeout: (callback, delay) => setTimeout(callback, delay),
    },
    getGame,
    getSave,
    weaponDefs = {},
    relicDefs = [],
    relicSystem,
    shopSystem,
    startRun,
    exitRun,
    resetSave,
    closeLevelUpMenu,
    closeEndScreen,
    setGameSpeed,
    playStartLaugh,
    toggleAudioMute,
    isAudioMuted,
    persist,
    renderMeta,
  }) {
    const assetResolver = assets?.createAssetResolver?.(content) || {
      relicIcon: (relic) =>
        relic?.iconPath || content?.assets?.sprites?.ui?.quest || "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610",
      runUpgradeSprite: (upgradeId) => content?.assets?.sprites?.runUpgrades?.[upgradeId],
      spriteSource: (definition) =>
        typeof definition === "string" ? definition : definition?.src || definition?.path || definition?.iconSrc || "",
    };
    const relicUi = shellRelicUi.createShellRelicUi({
      ui,
      content,
      documentRef,
      assetResolver,
      getSave,
      relicDefs,
      relicSystem,
      persist,
      renderMeta,
    });
    const moduleController = createModuleShellUiController({
      getSave,
      shellRelicController: {
        dispose() {},
        render: () => renderInventory(),
        selectRelic() {},
        update: () => renderInventory(),
      },
      shellView: {
        dispose() {},
        render() {},
        setMenuOpen() {},
        setScreen() {},
        showPanel() {},
        update() {},
      },
    });
    moduleController.init();

    let currentScreen = "title";
    /** @type {ReturnType<typeof setTimeout> | null} */
    let startTransitionTimer = null;

    function openRunMenu() {
      if (currentScreen === "startingTransition") return;
      moduleController.openMenu("progress");
      ui.runMenu.classList.remove("hidden");
      ui.openMenu.setAttribute("aria-expanded", "true");
      ui.exitRun.disabled = !getGame()?.running;
      const game = getGame();
      if (game?.running && !game.paused) {
        game.paused = true;
        game.pauseReason = "menu";
      }
      showRunMenuTab("progress");
      shopSystem.renderShop();
      renderInventory();
      renderMeta();
    }

    function closeRunMenu(resume = true) {
      moduleController.closeMenu();
      ui.runMenu.classList.add("hidden");
      ui.openMenu.setAttribute("aria-expanded", "false");
      const game = getGame();
      if (resume && game?.pauseReason === "menu") {
        game.paused = false;
        game.pauseReason = "";
      }
    }

    function showTitleScreen() {
      moduleController.render({ screen: "title" });
      ui.titleScreen?.classList.remove("hidden");
      ui.startTransition?.classList.add("hidden");
      currentScreen = "title";
    }

    function closeStartFlow() {
      moduleController.render({ screen: "game" });
      ui.titleScreen?.classList.add("hidden");
      ui.startTransition?.classList.add("hidden");
      currentScreen = "game";
    }

    function startGameFromTitle() {
      if (currentScreen !== "title") return;
      playStartLaugh?.();
      moduleController.render({ screen: "startingTransition" });
      currentScreen = "startingTransition";
      ui.titleScreen?.classList.add("hidden");
      ui.startTransition?.classList.remove("hidden");
      if (startTransitionTimer) scheduler.clearTimeout(startTransitionTimer);
      startTransitionTimer = scheduler.setTimeout(() => {
        startTransitionTimer = null;
        moduleController.startRun();
        startRun();
      }, 450);
    }

    function toggleRunMenu() {
      if (ui.runMenu.classList.contains("hidden")) {
        openRunMenu();
        return;
      }
      closeRunMenu(true);
    }

    function isFullscreen() {
      return documentRef.fullscreenElement || documentRef.webkitFullscreenElement;
    }

    function updateFullscreenButton() {
      const fullscreen = Boolean(isFullscreen());
      const label = fullscreen ? "Exit Full Screen" : "Full Screen";
      ui.fullscreenButton.textContent = label;
      ui.fullscreenButton.setAttribute("aria-pressed", String(fullscreen));
    }

    function toggleFullscreen() {
      moduleController.toggleFullscreen();
      const target = ui.canvas.parentElement || documentRef.documentElement;
      if (isFullscreen()) {
        const exitFullscreen = documentRef.exitFullscreen || documentRef.webkitExitFullscreen;
        const result = exitFullscreen?.call(documentRef);
        result?.catch?.(() => {});
        return;
      }

      const requestFullscreen = target.requestFullscreen || target.webkitRequestFullscreen;
      const result = requestFullscreen?.call(target);
      result?.catch?.(() => {});
    }

    function openShopMenu() {
      moduleController.openShop();
      closeStartFlow();
      shopSystem.openShop();
    }

    function closeShopMenu() {
      moduleController.closeShop();
      shopSystem.closeShop();
      if (!getGame()?.running) showTitleScreen();
    }

    function showRunMenuTab(tab) {
      moduleController.openPanel(tab);
      const shop = tab === "shop";
      const inventory = tab === "inventory";
      ui.menuProgressTab.classList.toggle("active", tab === "progress");
      ui.menuShopTab.classList.toggle("active", shop);
      ui.menuInventoryTab.classList.toggle("active", inventory);
      ui.menuProgressPanel.classList.toggle("hidden", tab !== "progress");
      ui.menuShopPanel.classList.toggle("hidden", !shop);
      ui.menuInventoryPanel.classList.toggle("hidden", !inventory);
      if (shop) shopSystem.renderShop();
      if (inventory) renderInventory();
    }

    function renderInventory() {
      relicUi.renderInventory();
      renderStartingWeaponSelector();
    }

    function renderStartingWeaponSelector() {
      if (!ui.menuRelicInventory || !ui.menuRelicSlots) return;
      const save = getSave();
      const availableWeapons = (save.unlockedWeapons || [])
        .filter((weaponId) => weaponDefs[weaponId])
        .map((weaponId) => ({ id: weaponId, ...weaponDefs[weaponId] }));
      if (!availableWeapons.length) return;
      if (!availableWeapons.some((weapon) => weapon.id === save.selectedStartingWeapon)) {
        save.selectedStartingWeapon = "spark_bolt";
      }

      const panel = documentRef.createElement("div");
      panel.className = "relic-item available starting-weapon-panel";
      const copy = documentRef.createElement("span");
      copy.innerHTML = `
        <strong>MVP starting weapon</strong>
        <span>Choose the first weapon for your next run.</span>
      `;

      const select = documentRef.createElement("select");
      select.className = "starting-weapon-select";
      select.setAttribute("aria-label", "Starting weapon for next run");
      availableWeapons.forEach((weapon) => {
        const option = documentRef.createElement("option");
        option.value = weapon.id;
        option.textContent = weapon.name || weapon.id;
        select.appendChild(option);
      });
      select.value = save.selectedStartingWeapon || "spark_bolt";
      select.addEventListener("change", () => {
        const nextWeaponId = select.value;
        if (!weaponDefs[nextWeaponId] || !(save.unlockedWeapons || []).includes(nextWeaponId)) return;
        save.selectedStartingWeapon = nextWeaponId;
        persist?.();
        renderMeta();
      });

      panel.appendChild(copy);
      panel.appendChild(select);
      ui.menuRelicInventory.prepend?.(panel) || ui.menuRelicInventory.appendChild(panel);
    }

    function bind() {
      ui.titleStartGame?.addEventListener("click", startGameFromTitle);
      ui.openShop?.addEventListener("click", openShopMenu);
      ui.closeShop.addEventListener("click", closeShopMenu);
      ui.closeShopBottom.addEventListener("click", closeShopMenu);
      ui.openMenu.addEventListener("click", toggleRunMenu);
      ui.closeMenu.addEventListener("click", () => closeRunMenu(true));
      ui.menuProgressTab.addEventListener("click", () => showRunMenuTab("progress"));
      ui.menuShopTab.addEventListener("click", () => showRunMenuTab("shop"));
      ui.menuInventoryTab.addEventListener("click", () => showRunMenuTab("inventory"));
      ui.closeLevelUp.addEventListener("click", closeLevelUpMenu);
      ui.fullscreenButton.addEventListener("click", toggleFullscreen);
      ui.exitRun.addEventListener("click", () => {
        moduleController.exitRun();
        exitRun();
      });
      ui.resetSave?.addEventListener("click", () => {
        moduleController.resetSave();
        resetSave();
      });
      ui.closeEnd.addEventListener("click", closeEndScreen);
      ui.closeEndX.addEventListener("click", closeEndScreen);
      documentRef.addEventListener?.("fullscreenchange", updateFullscreenButton);
      documentRef.addEventListener?.("webkitfullscreenchange", updateFullscreenButton);
      ui.speedButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const speed = Number(button.dataset.speed);
          moduleController.setGameSpeed(speed);
          setGameSpeed(speed);
        });
      });
      ui.muteAudio?.addEventListener("click", () => {
        moduleController.toggleMute();
        updateMuteButton(toggleAudioMute?.());
      });
      updateMuteButton(isAudioMuted?.());
      updateFullscreenButton();
    }

    function updateMuteButton(muted = false) {
      if (!ui.muteAudio) return;
      ui.muteAudio.classList.toggle("active", Boolean(muted));
      ui.muteAudio.textContent = muted ? "Muted" : "Sound";
      ui.muteAudio.setAttribute("aria-pressed", String(Boolean(muted)));
    }

    return {
      bind,
      closeStartFlow,
      closeRunMenu,
      closeShopMenu,
      startGameFromTitle,
      showTitleScreen,
    };
  }

  /** @typedef {import("../types/content.js").GeneratedContent} GeneratedContent */
  /** @typedef {import("../types/content.js").ContentEntry} ContentEntry */
  /** @typedef {import("../types/content.js").RunUpgradeDef} RunUpgradeDef */
  /** @typedef {import("../types/content.js").WeaponDef} WeaponDef */
  /** @typedef {Record<string, WeaponDef>} WeaponDefs */
  /** @typedef {{ applyRunUpgradeEffects(game: object, effects: ContentEntry[]): void }} UpgradeEffects */
  /** @typedef {{ content?: GeneratedContent, effects?: UpgradeEffects }} CreateUpgradeContentOptions */

  /** @param {WeaponDefs} weaponDefs @param {WeaponDef} weapon @returns {string | undefined} */
  function weaponIdForDef(weaponDefs, weapon) {
    return Object.keys(weaponDefs).find((id) => weaponDefs[id] === weapon);
  }

  /** @param {CreateUpgradeContentOptions} [options] */
  function createUpgradeContent({ content = {}, effects } = {}) {
    const metaUpgradeDefs = content.metaUpgrades || [];
    /** @param {WeaponDefs} weaponDefs @returns {ContentEntry[]} */
    function createUpgradeDefs(weaponDefs) {
      return [
        ...Object.values(weaponDefs).map((weapon) => {
          const weaponId = weaponIdForDef(weaponDefs, weapon);
          return {
            id: weapon.upgradeId,
            name: `${weapon.name} Damage`,
            description: `Increase ${weapon.name} damage.`,
            cost: [1, 2, 3, 4, 5],
            maxTier: 5,
            requiresWeapon: weaponId,
            requiresQuest: weapon.upgradeId === "laser_damage" ? "use_laser_run" : `${weaponId}_mastery`,
            opensQuest: weapon.upgradeId === "laser_damage" ? "laser_damage_5000" : null,
          };
        }),
        ...metaUpgradeDefs,
      ];
    }

    /** @type {RunUpgradeDef[]} */
    const runUpgradeDefs = (content.runUpgrades || []).map((upgrade) => ({
      ...upgrade,
      apply: upgrade.effects?.length ? (game) => effects.applyRunUpgradeEffects(game, upgrade.effects) : undefined,
    }));

    return {
      createUpgradeDefs,
      runUpgradeDefs,
    };
  }

  const MODULE_NATIVE_UI_SLOTS = Object.freeze([
    "canvas",
    "choices",
    "closeEnd",
    "closeEndX",
    "closeLevelUp",
    "closeMenu",
    "closeShop",
    "closeShopBottom",
    "debugPanel",
    "debugStats",
    "endScreen",
    "exitRun",
    "fullscreenButton",
    "levelUp",
    "menuInventoryPanel",
    "menuInventoryTab",
    "menuProgressPanel",
    "menuProgressTab",
    "menuQpHud",
    "menuQuests",
    "menuRelicInventory",
    "menuRelicSlots",
    "menuShopCoinHud",
    "menuShopItems",
    "menuShopNotice",
    "menuShopPanel",
    "menuShopTab",
    "menuTree",
    "muteAudio",
    "openMenu",
    "questBanner",
    "relicChoice",
    "relicChoices",
    "relicChoiceText",
    "relicChoiceTitle",
    "runHud",
    "runMenu",
    "runStats",
    "shopCoinHud",
    "shopItems",
    "shopModal",
    "shopNotice",
    "speedButtons",
    "startTransition",
    "titleScreen",
    "titleStartGame",
    "toggleDebug",
  ]);

  const MODULE_NATIVE_UI_RENDERER_PROOF_SLOTS = Object.freeze([
    "createUi",
    "createUiRenderer",
  ]);

  /**
   * @typedef {object} UiRendererOptions
   * @property {*} [ui]
   * @property {*} [uiProgression]
   * @property {Document} [documentRef]
   * @property {*} [weaponDefs]
   * @property {*} [weaponUnlocks]
   * @property {*} [upgradeDefs]
   * @property {*} [questDefs]
   * @property {() => *} [getSave]
   * @property {(upgradeId: string) => number} [getUpgradeTier]
   * @property {(nodeId: string) => boolean} [hasNode]
   * @property {(unlock: *) => boolean} [isNodeVisible]
   * @property {(questId: string) => boolean} [isQuestComplete]
   * @property {(unlock: *) => string | null | undefined} [nodeGateStatus]
   * @property {(unlock: *) => *} [buyWeaponUnlock]
   * @property {(upgrade: *) => *} [buyUpgrade]
   */

  function createUi(options = {}) {
    const documentRef = options.documentRef;
    const canvas = options.canvas || documentRef?.getElementById?.("game") || null;
    const get = (id) => documentRef?.getElementById?.(id) || null;

    return {
      canvas,
      choices: get("choices"),
      closeEnd: get("closeEnd"),
      closeEndX: get("closeEndX"),
      closeLevelUp: get("closeLevelUp"),
      closeMenu: get("closeMenu"),
      closeShop: get("closeShop"),
      closeShopBottom: get("closeShopBottom"),
      debugPanel: get("debugPanel"),
      debugStats: get("debugStats"),
      endScreen: get("endScreen"),
      exitRun: get("exitRun"),
      fullscreenButton: get("fullscreenButton"),
      levelUp: get("levelUp"),
      menuInventoryPanel: get("menuInventoryPanel"),
      menuInventoryTab: get("menuInventoryTab"),
      menuProgressPanel: get("menuProgressPanel"),
      menuProgressTab: get("menuProgressTab"),
      menuQpHud: get("menuQpHud"),
      menuQuests: get("menuQuests"),
      menuRelicInventory: get("menuRelicInventory"),
      menuRelicSlots: get("menuRelicSlots"),
      menuShopCoinHud: get("menuShopCoinHud"),
      menuShopItems: get("menuShopItems"),
      menuShopNotice: get("menuShopNotice"),
      menuShopPanel: get("menuShopPanel"),
      menuShopTab: get("menuShopTab"),
      menuTree: get("menuTree"),
      muteAudio: get("muteAudio"),
      openMenu: get("openMenu"),
      questBanner: get("questBanner"),
      relicChoice: get("relicChoice"),
      relicChoices: get("relicChoices"),
      relicChoiceText: get("relicChoiceText"),
      relicChoiceTitle: get("relicChoiceTitle"),
      runHud: get("runHud"),
      runMenu: get("runMenu"),
      runStats: get("runStats"),
      shopCoinHud: get("shopCoinHud"),
      shopItems: get("shopItems"),
      shopModal: get("shopModal"),
      shopNotice: get("shopNotice"),
      speedButtons: [...(documentRef?.querySelectorAll?.("[data-speed]") || [])],
      startTransition: get("startTransition"),
      titleScreen: get("titleScreen"),
      titleStartGame: get("titleStartGame"),
      toggleDebug: get("toggleDebug"),
    };
  }

  /**
   * @param {UiRendererOptions} [options]
   */
  function createUiRenderer({
    ui,
    uiProgression,
    documentRef,
    weaponDefs,
    weaponUnlocks,
    upgradeDefs,
    questDefs,
    getSave,
    getUpgradeTier,
    hasNode,
    isNodeVisible,
    isQuestComplete,
    nodeGateStatus,
    buyWeaponUnlock,
    buyUpgrade,
  } = {}) {
    if (!ui || typeof ui !== "object") {
      throw new Error("Missing Tap Survivor module UI dependency: ui");
    }
    if (!uiProgression || typeof uiProgression.createUiProgressionRenderer !== "function") {
      throw new Error("Missing Tap Survivor module UI dependency: uiProgression");
    }

    return uiProgression.createUiProgressionRenderer({
      ui,
      weaponDefs,
      weaponUnlocks,
      upgradeDefs,
      questDefs,
      getSave,
      documentRef,
      getUpgradeTier,
      hasNode,
      isNodeVisible,
      isQuestComplete,
      nodeGateStatus,
      buyWeaponUnlock,
      buyUpgrade,
    });
  }

  const MODULE_NATIVE_UI_PROGRESSION_RENDERER_PROOF_SLOTS = Object.freeze([
    "renderMeta",
    "renderTree",
    "renderQuests",
  ]);

  /**
   * @typedef {object} UiProgressionRendererOptions
   * @property {*} [ui]
   * @property {*} [assets]
   * @property {*} [weaponDefs]
   * @property {*} [weaponUnlocks]
   * @property {*} [upgradeDefs]
   * @property {*} [questDefs]
   * @property {() => *} [getSave]
   * @property {(upgradeId: string) => number} [getUpgradeTier]
   * @property {(nodeId: string) => boolean} [hasNode]
   * @property {(unlock: *) => boolean} [isNodeVisible]
   * @property {(questId: string) => boolean} [isQuestComplete]
   * @property {(unlock: *) => string | null | undefined} [nodeGateStatus]
   * @property {(unlock: *) => *} [buyWeaponUnlock]
   * @property {(upgrade: *) => *} [buyUpgrade]
   * @property {Document} [documentRef]
   */

  /**
   * @param {UiProgressionRendererOptions} [options]
   */
  function createUiProgressionRenderer({
    ui,
    assets,
    weaponDefs,
    weaponUnlocks,
    upgradeDefs,
    questDefs,
    getSave,
    getUpgradeTier,
    hasNode,
    isNodeVisible,
    isQuestComplete,
    nodeGateStatus,
    buyWeaponUnlock,
    buyUpgrade,
    documentRef,
  } = {}) {
    const resolvedUi = requireObject(ui, "ui");
    const assetResolver = assets?.createAssetResolver?.();

    function renderMeta() {
      const save = getSave();
      const qpText = `Coins: ${save.coins} | Quest Points: ${save.questPoints} available, ${save.totalQuestPoints} earned.`;
      if (resolvedUi.menuQpHud) resolvedUi.menuQpHud.textContent = qpText;

      if (resolvedUi.menuTree) renderTree(resolvedUi.menuTree);
      if (resolvedUi.menuQuests) renderQuests(resolvedUi.menuQuests);
    }

    function renderTree(container) {
      if (!container) return;
      const doc = requireDocument(documentRef);
      const save = getSave();
      container.innerHTML = "";
      const availableWeaponUnlocks = weaponUnlocks.filter(
        (unlock) => !hasNode(unlock.id) && isNodeVisible(unlock)
      );
      const availableUpgrades = upgradeDefs.filter((upgrade) => {
        if (!Array.isArray(upgrade.cost) || !Number.isFinite(upgrade.maxTier)) return false;
        const tier = getUpgradeTier(upgrade.id);
        if (tier >= upgrade.maxTier) return false;
        if (upgrade.requiresWeapon && !save.unlockedWeapons.includes(upgrade.requiresWeapon)) return false;
        if (upgrade.requiresNode && !hasNode(upgrade.requiresNode)) return false;
        return !upgrade.requiresQuest || isQuestComplete(upgrade.requiresQuest);
      });

      if (!availableWeaponUnlocks.length && !availableUpgrades.length) {
        const empty = doc.createElement("div");
        empty.className = "node";
        empty.textContent = "No available skill nodes. Complete active quests to reveal the next branch.";
        container.appendChild(empty);
        return;
      }

      availableWeaponUnlocks.forEach((unlock) => {
        const weapon = weaponDefs[unlock.weaponId];
        const gateStatus = nodeGateStatus(unlock);
        const el = doc.createElement("div");
        el.className = `node ${gateStatus ? "locked" : "available"}`;
        el.innerHTML = `
          <strong>Unlock ${weapon.name}</strong>
          <span>${weapon.description}</span><br />
          <span>Branch: ${unlock.branch} | Cost: ${unlock.cost} QP</span><br />
          <span>${gateStatus || "Ready to unlock"}</span>
        `;
        const iconSource = assetResolver?.weaponIcon?.(unlock.weaponId);
        if (iconSource) {
          const icon = doc.createElement("img");
          icon.className = "level-choice-icon";
          icon.src = iconSource;
          icon.alt = `${weapon.name} skill icon`;
          el.prepend?.(icon);
        }
        const button = doc.createElement("button");
        button.textContent = gateStatus ? "Locked" : "Unlock";
        button.disabled = Boolean(gateStatus);
        button.addEventListener("click", () => buyWeaponUnlock(unlock));
        el.appendChild(button);
        container.appendChild(el);
      });

      availableUpgrades.forEach((upgrade) => {
        const save = getSave();
        const tier = getUpgradeTier(upgrade.id);
        const nextCost = upgrade.cost[tier];
        const canBuy = save.questPoints >= nextCost;
        const el = doc.createElement("div");
        el.className = `node ${canBuy ? "available" : "locked"}`;
        el.innerHTML = `
          <strong>${upgrade.name}</strong>
          <span>${upgrade.description}</span><br />
          <span>Tier: ${tier}/${upgrade.maxTier}</span><br />
          <span>${canBuy ? `Next cost: ${nextCost} QP` : `Needs ${nextCost} QP`}</span>
        `;
        const button = doc.createElement("button");
        button.textContent = `Buy Tier ${tier + 1}`;
        button.disabled = !canBuy;
        button.addEventListener("click", () => buyUpgrade(upgrade));
        el.appendChild(button);
        container.appendChild(el);
      });
    }

    function renderQuests(container) {
      if (!container) return;
      const doc = requireDocument(documentRef);
      const save = getSave();
      container.innerHTML = "";
      const activeQuestIds = Object.keys(questDefs).filter((id) => save.activeQuests.includes(id));
      if (!activeQuestIds.length) {
        const empty = doc.createElement("div");
        empty.className = "quest";
        empty.textContent = "No active quests. Unlock the next available skill node to reveal one.";
        container.appendChild(empty);
        return;
      }

      activeQuestIds.forEach((id) => {
        const quest = questDefs[id];
        const progress = save.questProgress[id] || 0;
        const el = doc.createElement("div");
        el.className = "quest active";
        el.innerHTML = `
          <strong>${quest.name}</strong>
          <span>${quest.description}</span><br />
          <span>Status: Active</span><br />
          <span>Progress: ${Math.floor(progress)} / ${quest.target}</span><br />
          <span>Reward: ${quest.rewardQp} QP</span>
        `;
        container.appendChild(el);
      });
    }

    return {
      renderMeta,
      renderQuests,
      renderTree,
    };
  }

  function requireObject(value, name) {
    if (!value || typeof value !== "object") {
      throw new Error(`Missing Tap Survivor module UI progression dependency: ${name}`);
    }
    return value;
  }

  function requireDocument(documentRef) {
    if (!documentRef || typeof documentRef.createElement !== "function") {
      throw new Error("Missing Tap Survivor module UI progression dependency: documentRef");
    }
    return documentRef;
  }

  const MODULE_NATIVE_WEAPON_BEHAVIORS_SLOTS = Object.freeze(["weaponBehaviors"]);

  const MODULE_NATIVE_WEAPON_BEHAVIORS_PROOF_SLOTS = Object.freeze(["createWeaponBehaviorSystem"]);

  /**
   * @param {any} [options]
   */
  function createWeaponBehaviorSystem({
    weaponDefs,
    getGame,
    nearestEnemy,
    weaponDamage,
    weaponReach,
    weaponWidth,
    damageEnemy,
    reapEnemies,
    addQuestProgress,
    distance,
  } = {}) {
    function fireBeam(weaponId) {
      const game = getGame();
      const weapon = weaponDefs[weaponId];
      const target = nearestEnemy();
      const p = game.player;
      const { x: dirX, y: dirY } = target
        ? normalizeVector(target.x - p.x, target.y - p.y)
        : playerFacingVector(p);
      let dealt = 0;

      game.enemies.forEach((enemy) => {
        const toEnemyX = enemy.x - p.x;
        const toEnemyY = enemy.y - p.y;
        const along = toEnemyX * dirX + toEnemyY * dirY;
        const reach = weaponReach(weapon);
        if (along < 0 || along > reach) return;
        const side = Math.abs(toEnemyX * dirY - toEnemyY * dirX);
        if (side <= weaponWidth(weapon) + enemy.radius) {
          dealt += damageEnemy(enemy, weaponDamage(weaponId), weaponId);
        }
      });

      if (dealt > 0 && weaponId === "prism_beam") {
        game.laserDamage += dealt;
        addQuestProgress("use_laser_run", 1);
      }

      game.beams.push({
        weaponId,
        x: p.x,
        y: p.y,
        endX: p.x + dirX * weaponReach(weapon),
        endY: p.y + dirY * weaponReach(weapon),
        width: weaponWidth(weapon),
        color: weapon.color,
        life: 0.16,
      });
      reapEnemies();
    }

    function fireCone(weaponId) {
      const game = getGame();
      const weapon = weaponDefs[weaponId];
      const target = nearestEnemy();
      const p = game.player;
      const { x: dirX, y: dirY } = target
        ? normalizeVector(target.x - p.x, target.y - p.y)
        : playerFacingVector(p);
      game.enemies.forEach((enemy) => {
        const toEnemyX = enemy.x - p.x;
        const toEnemyY = enemy.y - p.y;
        const along = toEnemyX * dirX + toEnemyY * dirY;
        const reach = weaponReach(weapon);
        if (along < 0 || along > reach) return;
        const side = Math.abs(toEnemyX * dirY - toEnemyY * dirX);
        if (side <= weaponWidth(weapon)) damageEnemy(enemy, weaponDamage(weaponId), weaponId);
      });
      game.beams.push({
        weaponId,
        x: p.x,
        y: p.y,
        endX: p.x + dirX * weaponReach(weapon),
        endY: p.y + dirY * weaponReach(weapon),
        width: weaponWidth(weapon),
        color: weapon.color,
        life: 0.14,
      });
      reapEnemies();
    }

    function fireRadial(weaponId) {
      const game = getGame();
      const weapon = weaponDefs[weaponId];
      const p = game.player;
      const reach = weaponReach(weapon);
      game.enemies.forEach((enemy) => {
        if (distance(p, enemy) <= reach + enemy.radius) {
          damageEnemy(enemy, weaponDamage(weaponId), weaponId);
        }
      });
      if (weaponId === "shield_pulse") {
        chargeProjectileBlock(destroyEnemyProjectilesInRange(p, reach));
      }
      game.areas.push({
        weaponId,
        x: p.x,
        y: p.y,
        radius: reach,
        color: weapon.color,
        life: 0.24,
        visualOnly: true,
      });
      reapEnemies();
    }

    function destroyEnemyProjectilesInRange(player, reach) {
      const game = getGame();
      let destroyed = 0;
      game.enemyBolts.forEach((bolt) => {
        if (bolt.life > 0 && distance(player, bolt) <= reach + bolt.radius) {
          bolt.life = 0;
          destroyed += 1;
        }
      });
      game.enemyBolts = game.enemyBolts.filter((bolt) => bolt.life > 0);
      return destroyed;
    }

    function chargeProjectileBlock(amount) {
      const game = getGame();
      const p = game.player;
      if (!amount || p.projectileBlockReady) return;
      p.projectileBlockCharge = Math.min(p.projectileBlockNeeded, p.projectileBlockCharge + amount);
      if (p.projectileBlockCharge >= p.projectileBlockNeeded) {
        p.projectileBlockReady = true;
        p.projectileBlockCharge = p.projectileBlockNeeded;
      }
    }

    function fireChain(weaponId) {
      const game = getGame();
      const weapon = weaponDefs[weaponId];
      const p = game.player;
      const targets = [...game.enemies]
        .sort((a, b) => distance(p, a) - distance(p, b))
        .slice(0, weapon.jumps);
      let from = p;
      let emitted = false;
      targets.forEach((enemy) => {
        if (distance(from, enemy) > weaponReach(weapon)) return;
        damageEnemy(enemy, weaponDamage(weaponId), weaponId);
        game.beams.push({
          weaponId,
          x: from.x,
          y: from.y,
          endX: enemy.x,
          endY: enemy.y,
          width: 4,
          color: weapon.color,
          life: 0.12,
        });
        emitted = true;
        from = enemy;
      });
      if (!emitted) {
        const { x: dirX, y: dirY } = playerFacingVector(p);
        game.beams.push({
          weaponId,
          x: p.x,
          y: p.y,
          endX: p.x + dirX * weaponReach(weapon),
          endY: p.y + dirY * weaponReach(weapon),
          width: 4,
          color: weapon.color,
          life: 0.12,
        });
      }
      reapEnemies();
    }

    function fireTargetArea(weaponId) {
      const game = getGame();
      const weapon = weaponDefs[weaponId];
      const target = nearestEnemy();
      if (!target) return;
      game.enemies.forEach((enemy) => {
        if (distance(target, enemy) <= weaponReach(weapon) + enemy.radius) {
          damageEnemy(enemy, weaponDamage(weaponId), weaponId);
        }
      });
      game.areas.push({
        weaponId,
        x: target.x,
        y: target.y,
        radius: weaponReach(weapon),
        color: weapon.color,
        life: 0.28,
        visualOnly: true,
      });
      reapEnemies();
    }

    function fireLingeringArea(weaponId) {
      const game = getGame();
      const weapon = weaponDefs[weaponId];
      const target = nearestEnemy();
      if (!target) return;
      game.areas.push({
        weaponId,
        x: target.x,
        y: target.y,
        radius: weaponReach(weapon),
        color: weapon.color,
        life: weapon.duration,
        tick: weapon.tick,
        tickTimer: 0,
        damage: weaponDamage(weaponId),
      });
    }

    function fireMine(weaponId) {
      const game = getGame();
      const weapon = weaponDefs[weaponId];
      const p = game.player;
      const facing = playerFacingVector(p);
      const armDelay = mineArmDelay(weapon);
      game.areas.push({
        weaponId,
        x: p.x - facing.x * mineSpawnOffset(weapon),
        y: p.y - facing.y * mineSpawnOffset(weapon),
        radius: weaponReach(weapon),
        color: weapon.color,
        life: armDelay + mineExplosionLife(weapon),
        armDelay,
        explosionLife: mineExplosionLife(weapon),
        damageOnce: true,
        damage: weaponDamage(weaponId),
      });
    }

    function updateAreas(dt) {
      const game = getGame();
      game.areas.forEach((area) => {
        area.life -= dt;
        if (area.visualOnly || !area.weaponId) return;
        if (area.armDelay > 0) {
          area.armDelay = Math.max(0, area.armDelay - dt);
          if (area.armDelay > 0) return;
        }
        if (area.damageOnce) {
          if (!area.exploded) {
            damageEnemiesInArea(area);
            area.exploded = true;
            area.life = Math.min(area.life, area.explosionLife || 0.28);
          }
          return;
        }
        area.tickTimer -= dt;
        if (area.tickTimer > 0) return;
        area.tickTimer = area.tick;
        damageEnemiesInArea(area);
      });
      game.areas = game.areas.filter((area) => area.life > 0);
      reapEnemies();
    }

    function damageEnemiesInArea(area) {
      const game = getGame();
      game.enemies.forEach((enemy) => {
        if (distance(area, enemy) <= area.radius + enemy.radius) {
          damageEnemy(enemy, area.damage, area.weaponId);
        }
      });
    }

    function playerFacingVector(player) {
      if (Number.isFinite(player.facingX) && Number.isFinite(player.facingY)) {
        const length = Math.hypot(player.facingX, player.facingY);
        if (length > 0) return { x: player.facingX / length, y: player.facingY / length };
      }
      const dx = player.targetX - player.x;
      const dy = player.targetY - player.y;
      const distanceToTarget = Math.hypot(dx, dy);
      if (distanceToTarget > 0) return { x: dx / distanceToTarget, y: dy / distanceToTarget };
      return { x: 0, y: 1 };
    }

    function normalizeVector(x, y) {
      const length = Math.max(1, Math.hypot(x, y));
      return { x: x / length, y: y / length };
    }

    function mineArmDelay(weapon) {
      return Number.isFinite(weapon.armDelay) ? weapon.armDelay : 2;
    }

    function mineExplosionLife(weapon) {
      return Number.isFinite(weapon.explosionLife) ? weapon.explosionLife : 0.32;
    }

    function mineSpawnOffset(weapon) {
      return Math.max(24, weapon.spawnOffset || 58);
    }

    function updateBeams(dt) {
      const game = getGame();
      game.beams.forEach((beam) => (beam.life -= dt));
      game.beams = game.beams.filter((beam) => beam.life > 0);
    }

    function updateWeaponBursts(dt) {
      const game = getGame();
      game.weaponBursts.forEach((burst) => (burst.life -= dt));
      game.weaponBursts = game.weaponBursts.filter((burst) => burst.life > 0);
      Object.entries(game.weaponIconFlashes || {}).forEach(([weaponId, flash]) => {
        const next = flash - dt * 3.6;
        if (next > 0) game.weaponIconFlashes[weaponId] = next;
        else delete game.weaponIconFlashes[weaponId];
      });
    }

    return {
      fireBeam,
      fireChain,
      fireCone,
      fireLingeringArea,
      fireMine,
      fireRadial,
      fireTargetArea,
      updateAreas,
      updateBeams,
      updateWeaponBursts,
    };
  }

  /**
   * @typedef {{
   *   id?: string,
   *   kind?: string,
   *   cooldown: number,
   *   damage: number,
   *   range?: number,
   *   radius?: number,
   *   upgradeId?: string,
   *   width?: number
   * }} WeaponDef
   * @typedef {Record<string, WeaponDef>} WeaponDefs
   * @typedef {{ fireRate?: number, attackRadius?: number, percentDamage?: number, flatDamage?: number }} ShopBonuses
   * @typedef {{
   *   areaRadiusBonus?: number,
   *   beamWidthBonus?: number,
   *   cooldownReduction?: number,
   *   damageBonus?: number,
   *   projectileSizeBonus?: number
   * }} RelicSpecialEffects
   * @typedef {{
   *   id: string,
   *   [key: string]: number | string | undefined
   * }} RunUpgradeDef
   * @typedef {{ playbackRate: number, minGapMs: number }} WeaponSfxOptions
   * @typedef {{
   *   projectileRadius(weapon: WeaponDef): number,
   *   projectileSkillModifier(weapon: WeaponDef, field: string): number,
   *   weaponCooldown(weapon: WeaponDef): number,
   *   weaponDamage(weaponId: string): number,
   *   weaponReach(weapon: WeaponDef): number,
   *   weaponSfxOptions(weapon: WeaponDef): WeaponSfxOptions,
   *   weaponWidth(weapon: WeaponDef): number
   * }} WeaponScalingApi
   */

  /**
   * @param {{
   *   content?: { runUpgrades?: RunUpgradeDef[] },
   *   weaponDefs: WeaponDefs,
   *   getUpgradeTier: (id: string | undefined) => number,
   *   getRunUpgradeTier: (id: string) => number,
   *   getShopBonuses?: () => ShopBonuses,
   *   getRelicSpecialEffects?: () => RelicSpecialEffects,
   *   getWeaponDamageMultiplier?: () => number,
   *   clamp: (value: number, min: number, max: number) => number
   * }} options
   * @returns {WeaponScalingApi}
   */
  function createWeaponScaling({
    content = {},
    weaponDefs,
    getUpgradeTier,
    getRunUpgradeTier,
    getShopBonuses,
    getRelicSpecialEffects,
    getWeaponDamageMultiplier,
    clamp,
  }) {
    function weaponCooldown(weapon) {
      const shopBonuses = getShopBonuses?.() || {};
      const relicEffects = getRelicSpecialEffects?.() || {};
      const rateTier =
        getUpgradeTier("fire_rate") +
        getRunUpgradeTier("run_fire_rate") +
        (shopBonuses.fireRate || 0);
      return (
        (weapon.cooldown / (1 + rateTier * 0.12 + (relicEffects.cooldownReduction || 0))) *
        projectileSkillModifier(weapon, "projectileCooldownMultiplier")
      );
    }

    function weaponSfxOptions(weapon) {
      const cooldown = Math.max(0.1, weaponCooldown(weapon));
      return {
        playbackRate: clamp(1.15 / cooldown, 0.75, 2.35),
        minGapMs: clamp(cooldown * 320, 35, 120),
      };
    }

    function weaponReach(weapon) {
      const shopBonuses = getShopBonuses?.() || {};
      const relicEffects = getRelicSpecialEffects?.() || {};
      const radiusTier =
        getUpgradeTier("attack_radius") +
        getRunUpgradeTier("run_attack_radius") +
        (shopBonuses.attackRadius || 0);
      return (weapon.range || 0) * (1 + radiusTier * 0.12 + (relicEffects.areaRadiusBonus || 0));
    }

    function weaponWidth(weapon) {
      const shopBonuses = getShopBonuses?.() || {};
      const relicEffects = getRelicSpecialEffects?.() || {};
      const radiusTier =
        getUpgradeTier("attack_radius") +
        getRunUpgradeTier("run_attack_radius") +
        (shopBonuses.attackRadius || 0);
      return (weapon.width || 0) * (1 + radiusTier * 0.1 + (relicEffects.beamWidthBonus || 0));
    }

    function projectileRadius(weapon) {
      const shopBonuses = getShopBonuses?.() || {};
      const relicEffects = getRelicSpecialEffects?.() || {};
      const radiusTier =
        getUpgradeTier("attack_radius") +
        getRunUpgradeTier("run_attack_radius") +
        (shopBonuses.attackRadius || 0);
      return (
        (weapon.radius || 0) * (1 + radiusTier * 0.12 + (relicEffects.projectileSizeBonus || 0))
      );
    }

    function weaponDamage(weaponId) {
      const weapon = weaponDefs[weaponId];
      const flatTier = getUpgradeTier("flat_damage") + getRunUpgradeTier("run_flat_damage");
      const shopBonuses = getShopBonuses?.() || {};
      const percentTier =
        getUpgradeTier("percent_damage") +
        getRunUpgradeTier("run_percent_damage") +
        getUpgradeTier(weapon.upgradeId) * 2 +
        (shopBonuses.percentDamage || 0);
      const relicEffects = getRelicSpecialEffects?.() || {};
      return (
        (weapon.damage + flatTier * 4 + (shopBonuses.flatDamage || 0)) *
        (1 + percentTier * 0.12 + (relicEffects.damageBonus || 0)) *
        (getWeaponDamageMultiplier?.() || 1) *
        projectileSkillModifier(weapon, "projectileDamageMultiplier")
      );
    }

    function projectileSkillModifier(weapon, field) {
      if (weapon?.kind !== "projectile") return 1;
      return (content?.runUpgrades || []).reduce((multiplier, upgrade) => {
        const tier = getRunUpgradeTier(upgrade.id);
        const value = upgrade[field];
        if (!tier || typeof value !== "number" || !Number.isFinite(value)) return multiplier;
        return multiplier * value ** tier;
      }, 1);
    }

    return {
      projectileRadius,
      projectileSkillModifier,
      weaponCooldown,
      weaponDamage,
      weaponReach,
      weaponSfxOptions,
      weaponWidth,
    };
  }

  const MODULE_NATIVE_WEAPON_FIRE_SLOTS = Object.freeze(["weaponFire"]);

  const MODULE_NATIVE_WEAPON_FIRE_PROOF_SLOTS = Object.freeze(["createWeaponFireSystem"]);

  /**
   * @param {any} [options]
   */
  function createWeaponFireSystem({
    canvas,
    content,
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
    weaponBehaviors,
    weaponCooldowns,
    weaponProjectiles,
    weaponTargeting,
  } = {}) {
    const nearestEnemy = () => weaponTargeting.nearestEnemy(getGame(), distance);
    const scaling = weaponCooldowns.createWeaponScaling({
      content,
      weaponDefs,
      getUpgradeTier,
      getRunUpgradeTier,
      getShopBonuses,
      getRelicSpecialEffects,
      getWeaponDamageMultiplier,
      clamp,
    });
    const projectileSystem = weaponProjectiles.createWeaponProjectileSystem({
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
    const behaviorSystem = weaponBehaviors.createWeaponBehaviorSystem({
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

  /**
   * @typedef {{ x: number, y: number, radius?: number, hp?: number }} PointLike
   * @typedef {{
   *   id?: string,
   *   kind?: string,
   *   speed: number,
   *   color?: string,
   *   pierce?: number
   * }} WeaponDef
   * @typedef {Record<string, WeaponDef>} WeaponDefs
   * @typedef {{ width: number, height: number }} ProjectileCanvas
   * @typedef {{ x: number, y: number }} Player
   * @typedef {{ x: number, y: number, radius: number, hp?: number }} Enemy
   * @typedef {{
   *   weaponId: string,
   *   x: number,
   *   y: number,
   *   vx: number,
   *   vy: number,
   *   radius: number,
   *   damage: number,
   *   life: number,
   *   pierce: number,
   *   bounces: number,
   *   splitDepth: number,
   *   hit: Set<Enemy>,
   *   color?: string
   * }} ProjectileBolt
   * @typedef {{ x: number, y: number, radius: number, color?: string, life: number, visualOnly: boolean }} AreaEffect
   * @typedef {{ player: Player, bolts: ProjectileBolt[], enemies: Enemy[], areas: AreaEffect[] }} ProjectileGame
   * @typedef {{
   *   fireProjectile(weaponId: string): void,
   *   spawnProjectileBolt(
   *     weaponId: string,
   *     x: number,
   *     y: number,
   *     vx: number,
   *     vy: number,
   *     overrides?: Partial<ProjectileBolt>
   *   ): void,
   *   updateBolts(dt: number): void
   * }} WeaponProjectileSystem
   */

  /**
   * @param {number} vx
   * @param {number} vy
   * @param {number} angle
   * @returns {[number, number]}
   */
  function rotateVector(vx, vy, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [vx * cos - vy * sin, vx * sin + vy * cos];
  }

  /**
   * @param {{
   *   canvas: ProjectileCanvas,
   *   weaponDefs: WeaponDefs,
   *   getGame: () => ProjectileGame,
   *   getRunUpgradeTier: (id: string) => number,
   *   getRelicSpecialEffects?: () => { doubleShotCount?: number, projectileSpeedBonus?: number },
   *   nearestEnemy: () => Enemy | null,
   *   projectileRadius: (weapon: WeaponDef) => number,
   *   weaponDamage: (weaponId: string) => number,
   *   projectileSkillModifier: (weapon: WeaponDef, field: string) => number,
   *   damageEnemy: (enemy: Enemy, damage: number, weaponId: string) => void,
   *   reapEnemies: () => void,
   *   distance: (a: PointLike, b: PointLike) => number,
   *   clamp: (value: number, min: number, max: number) => number
   * }} options
   * @returns {WeaponProjectileSystem}
   */
  function createWeaponProjectileSystem({
    canvas,
    weaponDefs,
    getGame,
    getRunUpgradeTier,
    getRelicSpecialEffects,
    nearestEnemy,
    projectileRadius,
    weaponDamage,
    projectileSkillModifier,
    damageEnemy,
    reapEnemies,
    distance,
    clamp,
  }) {
    function fireProjectile(weaponId) {
      const game = getGame();
      const weapon = weaponDefs[weaponId];
      const target = nearestEnemy();
      const p = game.player;
      const direction = target
        ? normalizeVector(target.x - p.x, target.y - p.y)
        : playerFacingVector(p);
      const relicEffects = getRelicSpecialEffects?.() || {};
      const speed =
        weapon.speed *
        (1 + (relicEffects.projectileSpeedBonus || 0)) *
        projectileSkillModifier(weapon, "projectileSpeedMultiplier");
      const baseVx = direction.x * speed;
      const baseVy = direction.y * speed;
      const splitTier = getRunUpgradeTier("run_split_shot");
      const spread = 0.26;

      spawnProjectileBolt(weaponId, p.x, p.y, baseVx, baseVy);
      if (relicEffects.doubleShotCount) {
        spawnProjectileBolt(weaponId, p.x, p.y, ...rotateVector(baseVx, baseVy, -spread * 0.5));
      }
      if (splitTier >= 1) {
        spawnProjectileBolt(weaponId, p.x, p.y, ...rotateVector(baseVx, baseVy, -spread));
        spawnProjectileBolt(weaponId, p.x, p.y, ...rotateVector(baseVx, baseVy, spread));
      }
      if (splitTier >= 2) {
        spawnProjectileBolt(weaponId, p.x, p.y, ...rotateVector(baseVx, baseVy, -spread * 2));
        spawnProjectileBolt(weaponId, p.x, p.y, ...rotateVector(baseVx, baseVy, spread * 2));
      }
    }

    function normalizeVector(x, y) {
      const length = Math.max(1, Math.hypot(x, y));
      return { x: x / length, y: y / length };
    }

    function playerFacingVector(player) {
      if (Number.isFinite(player.facingX) && Number.isFinite(player.facingY)) {
        const length = Math.hypot(player.facingX, player.facingY);
        if (length > 0) return { x: player.facingX / length, y: player.facingY / length };
      }
      const dx = player.targetX - player.x;
      const dy = player.targetY - player.y;
      const distanceToTarget = Math.hypot(dx, dy);
      if (distanceToTarget > 0) return { x: dx / distanceToTarget, y: dy / distanceToTarget };
      return { x: 0, y: 1 };
    }

    function spawnProjectileBolt(weaponId, x, y, vx, vy, overrides = {}) {
      const game = getGame();
      const weapon = weaponDefs[weaponId];
      game.bolts.push({
        weaponId,
        x,
        y,
        vx,
        vy,
        radius: projectileRadius(weapon),
        damage: weaponDamage(weaponId),
        life: 1.8,
        pierce: (weapon.pierce || 0) + getRunUpgradeTier("run_projectile_pierce"),
        bounces: getRunUpgradeTier("run_wall_bounce"),
        splitDepth: 0,
        hit: new Set(),
        color: weapon.color,
        ...overrides,
      });
    }

    function updateBolts(dt) {
      const game = getGame();
      game.bolts.forEach((bolt) => {
        bolt.x += bolt.vx * dt;
        bolt.y += bolt.vy * dt;
        bolt.life -= dt;
        if (bolt.bounces > 0 && (bolt.x < bolt.radius || bolt.x > canvas.width - bolt.radius)) {
          bolt.vx *= -1;
          bolt.x = clamp(bolt.x, bolt.radius, canvas.width - bolt.radius);
          bolt.bounces -= 1;
        }
        if (bolt.bounces > 0 && (bolt.y < bolt.radius || bolt.y > canvas.height - bolt.radius)) {
          bolt.vy *= -1;
          bolt.y = clamp(bolt.y, bolt.radius, canvas.height - bolt.radius);
          bolt.bounces -= 1;
        }
        const enemy = game.enemies.find((candidate) => {
          if (bolt.hit.has(candidate)) return false;
          const radius = bolt.radius + candidate.radius;
          const x = bolt.x - candidate.x;
          const y = bolt.y - candidate.y;
          return x * x + y * y < radius * radius && distance(bolt, candidate) < radius;
        });
        if (enemy) {
          damageEnemy(enemy, bolt.damage, bolt.weaponId);
          explodeBolt(bolt, enemy);
          splitBoltOnHit(bolt);
          bolt.hit.add(enemy);
          if (bolt.pierce > 0) {
            bolt.pierce -= 1;
          } else {
            bolt.life = 0;
          }
        }
      });
      game.bolts = game.bolts.filter((bolt) => bolt.life > 0);
      reapEnemies();
    }

    function explodeBolt(bolt, enemy) {
      const explosionTier = getRunUpgradeTier("run_explosive_hit");
      if (!explosionTier) return;
      const radius = 42 + explosionTier * 18;
      const damage = bolt.damage * (0.28 + explosionTier * 0.08);
      const game = getGame();
      game.enemies.forEach((candidate) => {
        if (candidate === enemy || candidate.hp <= 0) return;
        if (distance(enemy, candidate) <= radius + candidate.radius) {
          damageEnemy(candidate, damage, bolt.weaponId);
        }
      });
      game.areas.push({
        x: enemy.x,
        y: enemy.y,
        radius,
        color: bolt.color,
        life: 0.18,
        visualOnly: true,
      });
    }

    function splitBoltOnHit(bolt) {
      const splitTier = getRunUpgradeTier("run_split_on_hit");
      if (!splitTier || bolt.splitDepth >= splitTier) return;
      const speed = Math.max(1, Math.hypot(bolt.vx, bolt.vy));
      const left = rotateVector(bolt.vx, bolt.vy, -0.72);
      const right = rotateVector(bolt.vx, bolt.vy, 0.72);
      [left, right].forEach(([vx, vy]) => {
        const magnitude = Math.max(1, Math.hypot(vx, vy));
        spawnProjectileBolt(
          bolt.weaponId,
          bolt.x,
          bolt.y,
          (vx / magnitude) * speed,
          (vy / magnitude) * speed,
          {
            damage: bolt.damage * 0.55,
            life: 0.9,
            pierce: 0,
            bounces: 0,
            splitDepth: bolt.splitDepth + 1,
            hit: new Set(bolt.hit),
          }
        );
      });
    }

    return {
      fireProjectile,
      spawnProjectileBolt,
      updateBolts,
    };
  }

  /**
   * @typedef {{ x: number, y: number }} Point
   * @typedef {{ player: Point, enemies: Point[] }} TargetingGame
   * @typedef {(a: Point, b: Point) => number} DistanceFn
   */

  /**
   * @param {TargetingGame} game
   * @param {DistanceFn} distance
   * @returns {Point | null}
   */
  function nearestEnemy(game, distance) {
    if (!game.enemies.length) return null;

    const p = game.player;
    return game.enemies.reduce((best, enemy) =>
      distance(p, enemy) < distance(p, best) ? enemy : best
    );
  }

  function createRunLifecycle({
    documentRef,
    ui,
    getGame,
    getSave,
    resetGameState,
    shopSystem,
    shellUi,
    runUi,
    relicSystem,
    persist,
    renderMeta,
    updateRunHud,
    showMovementGateBanner,
  }) {
    function startRun() {
      shellUi.closeStartFlow();
      shopSystem.closeShop();
      runUi.hideEndScreen();
      ui.levelUp.classList.add("hidden");
      shellUi.closeRunMenu(false);
      const game = resetGameState();
      game.awaitingFirstMoveInput = true;
      showMovementGateBanner();
    }

    function endRun(reason) {
      const game = getGame();
      if (!game) return;
      game.running = false;
      game.endReason = reason;
      runUi.showEndScreen(reason);
      persist();
      renderMeta();
    }

    function advanceTowerFloor() {
      const game = getGame();
      if (!game) return;
      const clearedFloor = game.towerFloor || 1;
      const relicDropCount = clearedFloor % 5 === 0 ? 2 : 1;
      showRelicChoice(clearedFloor, relicDropCount, []);
    }

    function showRelicChoice(clearedFloor, remainingPicks, awardedRelics) {
      const save = getSave();
      const game = getGame();
      const choices = relicSystem.relicChoices(save, game.player.equippedWeapons, 3);
      if (!choices.length) {
        finishBossClear(clearedFloor, awardedRelics);
        return;
      }
      game.paused = true;
      game.pauseReason = "relic";
      ui.relicChoiceTitle.textContent =
        remainingPicks > 1 ? `Choose Relic ${awardedRelics.length + 1}` : "Choose Relic";
      ui.relicChoiceText.textContent = "Pick one reward shaped by your current weapons.";
      ui.relicChoices.innerHTML = "";
      choices.forEach((relic) => {
        const button = documentRef?.createElement?.("button");
        if (!button) {
          throw new Error("Missing Tap Survivor run lifecycle dependency: documentRef.createElement");
        }
        button.className = relic.rarity === "green" ? "green-relic" : "";
        if (relic.backgroundColor && typeof button.style?.setProperty === "function") {
          button.style.setProperty("--relic-bg", relic.backgroundColor);
        } else if (relic.backgroundColor && button.style) {
          button.style["--relic-bg"] = relic.backgroundColor;
        }
        button.innerHTML = `
          <img class="level-choice-icon" src="${relic.iconPath || "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610"}" alt="" />
          <strong>${relic.name}</strong><br /><span>${relic.description}</span>
          ${relic.specialAbility ? `<br /><span>${relic.specialAbility.label}: ${relic.specialAbility.description}</span>` : ""}
        `;
        button.addEventListener("click", () => {
          const granted = relicSystem.grantRelic(save, relic);
          const nextAwarded = granted ? [...awardedRelics, granted] : awardedRelics;
          if (remainingPicks > 1) {
            showRelicChoice(clearedFloor, remainingPicks - 1, nextAwarded);
          } else {
            finishBossClear(clearedFloor, nextAwarded);
          }
        });
        ui.relicChoices.appendChild(button);
      });
      ui.relicChoice.classList.remove("hidden");
    }

    function finishBossClear(clearedFloor, awardedRelics) {
      const save = getSave();
      ui.relicChoice.classList.add("hidden");
      save.towerFloor = Math.max(save.towerFloor || 1, clearedFloor + 1);
      persist();
      const game = resetGameState();
      game.lastFloorClear = {
        floor: clearedFloor,
        relicName: awardedRelics.length
          ? awardedRelics.map((relic) => relic.name).join(" + ")
          : "No locked relics remaining",
      };
      updateRunHud();
      renderMeta();
    }

    return {
      advanceTowerFloor,
      endRun,
      startRun,
    };
  }

  function createRunStateSystem({
    canvas,
    mapSystem,
    getSave,
    getShopBonuses,
    getUpgradeTier,
    maxEquippedWeapons,
    weaponDefs = {},
  }) {
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

  function createRunUi({
    ui,
    formatTime,
    getGame,
    getSave,
    getGameSpeed,
    maxEquippedWeapons,
    renderDebug,
  }) {
    function updateRunHud() {
      const game = getGame();
      if (!game) {
        if (ui.runHud)
          ui.runHud.textContent = `Speed x${getGameSpeed()} | Start a run to test movement, auto-attacks, XP, Laser, quests, and Quest Points.`;
        renderDebug();
        return;
      }
      const save = getSave();
      const boss = game.enemies.find((enemy) => enemy.boss);
      const bossText = boss
        ? ` | Boss HP ${Math.max(0, Math.ceil(boss.hp))}/${boss.maxHp}`
        : game.bossSpawned
          ? " | Boss defeated"
          : "";
      const floorText = game.lastFloorClear
        ? ` | Cleared Floor ${game.lastFloorClear.floor}: ${game.lastFloorClear.relicName}`
        : "";
      if (ui.runHud) {
        ui.runHud.textContent = [
          `Time ${formatTime(game.elapsed)}`,
          `Floor ${game.towerFloor}`,
          `Speed x${getGameSpeed()}`,
          `HP ${Math.max(0, Math.ceil(game.player.hp))}/${game.player.maxHp}`,
          `Coins ${save.coins}`,
          `Level ${game.player.level}`,
          `Kills ${game.kills}`,
          `Laser damage ${Math.floor(game.laserDamage)}`,
          `Weapons ${game.player.equippedWeapons.length}/${maxEquippedWeapons()}${bossText}${floorText}`,
        ].join(" | ");
      }
      renderDebug();
    }

    function showEndScreen(reason) {
      const game = getGame();
      const save = getSave();
      if (!game) return;
      ui.runStats.innerHTML = `
          <p>Result: ${reason}</p>
          <p>Tower floor: ${game.towerFloor}</p>
          <p>Time survived: ${formatTime(game.elapsed)}</p>
          <p>Enemies defeated: ${game.kills}</p>
          <p>Level reached: ${game.player.level}</p>
          <p>XP collected: ${game.xpCollected}</p>
          <p>Coins banked: ${save.coins}</p>
          <p>Laser damage dealt: ${Math.floor(game.laserDamage)}</p>
          <p>Quest Points: ${save.questPoints} available</p>
        `;
      ui.endScreen.classList.remove("hidden");
    }

    function hideEndScreen() {
      ui.endScreen.classList.add("hidden");
    }

    return {
      updateRunHud,
      showEndScreen,
      hideEndScreen,
    };
  }

  function createRunUpdater({
    canvas,
    getGame,
    combat,
    pickupSystem,
    addQuestProgressGroup,
    survivalQuestIds,
    xpQuestIds,
    levelQuestIds,
    showLevelUp,
    endRun,
    getRelicSpecialEffects,
    mapSystem,
    clamp,
  }) {
    function movePlayer(player, dt) {
      const dx = player.targetX - player.x;
      const dy = player.targetY - player.y;
      const dist = Math.hypot(dx, dy);
      player.moving = dist > 3;
      if (dist > 3) {
        player.facingX = dx / dist;
        player.facingY = dy / dist;
        const step = Math.min(dist, player.speed * dt);
        player.x += player.facingX * step;
        player.y += player.facingY * step;
      }
      player.x = clamp(player.x, 18, canvas.width - 18);
      player.y = clamp(player.y, 18, canvas.height - 18);
    }

    function update(dt) {
      const game = getGame();
      if (!game || !game.running || game.paused) return;
      const player = game.player;
      if (game.awaitingFirstMoveInput) return;
      game.elapsed += dt;
      mapSystem?.applyToGame?.(game);
      addQuestProgressGroup(survivalQuestIds, dt);
      if (game.elapsed >= game.duration) {
        combat.spawnBoss();
      }

      movePlayer(player, dt);
      combat.spawnEnemies(dt);
      combat.updateEnemies(dt);
      combat.updateEnemyBolts(dt);
      combat.updateBossSpecials(dt);
      combat.updateWeapons(dt);
      combat.updateBolts(dt);
      combat.updateAreas(dt);
      combat.updateBeams(dt);
      combat.updateWeaponBursts(dt);
      updateRelicTimers(player, dt);
      updatePlayerAnimation(player, dt);
      pickupSystem.updateXpDrops(dt);
      pickupSystem.updateLootDrops(dt);
      pickupSystem.updatePickupTexts(dt);

      if (player.hp <= 0) endRun("Player defeated");
    }

    function updatePlayerAnimation(player, dt) {
      if (!player.actionTimer) return;
      player.actionTimer = Math.max(0, player.actionTimer - dt);
      if (player.actionTimer <= 0) player.actionSprite = "";
    }

    function updateRelicTimers(player, dt) {
      player.invincibleTimer = Math.max(0, (player.invincibleTimer || 0) - dt);
      player.blinkTimer = Math.max(0, (player.blinkTimer || 0) - dt);
      player.teleportCooldown = Math.max(0, (player.teleportCooldown || 0) - dt);
    }

    function collectXp(value) {
      const game = getGame();
      if (!game?.player) return;
      const player = game.player;
      const xpValue = Math.ceil(value * (1 + ((getRelicSpecialEffects?.() || {}).xpMultiplier || 0)));
      player.xp += xpValue;
      game.xpCollected += xpValue;
      addQuestProgressGroup(xpQuestIds, value);
      if (player.xp >= player.xpToLevel) {
        player.xp -= player.xpToLevel;
        player.level += 1;
        player.xpToLevel += 4;
        game.levelUps += 1;
        addQuestProgressGroup(levelQuestIds, 1);
        showLevelUp();
      }
    }

    return {
      update,
      collectXp,
    };
  }

  function createGameDependencyBag({ globalRef, documentRef = globalRef?.document }) {
    const rawContent = globalRef.TapSurvivorContent;
    const balanceRuntime = globalRef.TapSurvivorBalanceRuntime;
    if (typeof balanceRuntime?.configureDefaultProviders === "function") {
      balanceRuntime.configureDefaultProviders({
        content: rawContent,
        profiles: rawContent?.balanceProfiles,
        profileSearch: createBalanceProfileSearchProvider(globalRef),
        storage: createBalanceStorageProvider(globalRef),
      });
    }
    const configuredContent = balanceRuntime?.content?.() || rawContent;
    const content = configuredContent || {};
    const assets = {
      createAssetResolver(assetContent) {
        return createAssetResolver({ content: assetContent });
      },
    };
    const effects = createEffects();
    const levelUp = {
      createLevelUpSystem(options = {}) {
        return createLevelUpSystem({
          ...options,
          documentRef: options.documentRef || documentRef,
        });
      },
    };
    const upgrades = { createUpgradeContent };
    const save = { createSaveSystem };
    const storage = requireGlobal(globalRef, "TapSurvivorStorage");
    if (typeof storage.configureDefaultProviders === "function") {
      storage.configureDefaultProviders({
        platformCapabilities: createStoragePlatformCapabilities(globalRef),
      });
    }
    const audio = createModuleRuntimeAudioAdapter({
      audioContextFactory: createAudioContextFactory(globalRef),
      audioFactory: createAudioFactory(globalRef),
      clock: createClock(globalRef),
    }).audio;
    const shellRelicUi = createShellRelicUiDependency(globalRef);
    const shellUi = {
      createShellUiController(options = {}) {
        return createShellUiController({
          ...options,
          documentRef: options.documentRef || documentRef,
        });
      },
    };

    return {
      audio,
      assets,
      balance: { floorDifficulty },
      balanceRuntime,
      combat: { createCombatSystem },
      combatDamage: { createCombatDamageSystem },
      content,
      contentRegistry: { createContentRegistry },
      debug: { createDebugSystem },
      debugBalance: balanceRuntime,
      effects,
      enemies: { createEnemySystem },
      enemyBehaviors: { createEnemyBehaviorSystem },
      enemySpawning: { createEnemySpawnSystem },
      gameBanners: { createGameBannerSystem },
      gameRuntime: { createGameRuntimeController },
      input: { bindMovementInput },
      levelUp,
      levelUpChoices: { choiceId, shopFocusBonus, shuffleChoices, weightedChoices },
      mapSystem: { createMapSystem },
      math: { clamp, distance, formatTime, randomRange },
      pickups: { createPickupSystem },
      progression: { createProgressionSystem },
      quests: { createQuestSystem, questOpenIds },
      relics: { createRelicSystem },
      renderEnemies: { createEnemyRenderer },
      renderHud: { createHudRenderer },
      renderSkillRail: { createSkillRailRenderer },
      rendering: { createRenderer },
      runLifecycle: { createRunLifecycle },
      runState: { createRunStateSystem },
      runUi: { createRunUi },
      runUpdate: { createRunUpdater },
      save,
      saveCorruption: { createSaveLoadHandler },
      saveDefaults: { CURRENT_SAVE_VERSION, createDefaultSave },
      saveMigrations: { isPlainObject, migrateSave },
      saveNormalize: { arrayValue, createSaveNormalizer, objectValue },
      shellRelicUi,
      shellUi,
      shop: {
        createShopSystem: (options = {}) =>
          createShopSystem({
            ...options,
            documentRef: options.documentRef || documentRef,
          }),
      },
      shopPricing: { createShopPricing },
      sprites: requireGlobal(globalRef, "TapSurvivorSprites"),
      storage,
      ui: {
        createUi: (options = {}) =>
          createUi({
            ...options,
            documentRef: options.documentRef || documentRef,
          }),
        createUiRenderer: (options = {}) =>
          createUiRenderer({
            ...options,
            documentRef: options.documentRef || documentRef,
          }),
      },
      uiProgression: {
        createUiProgressionRenderer: (options = {}) =>
          createUiProgressionRenderer({
            ...options,
            documentRef: options.documentRef || documentRef,
          }),
      },
      upgrades,
      weaponBehaviors: { createWeaponBehaviorSystem },
      weaponCooldowns: { createWeaponScaling },
      weaponFire: { createWeaponFireSystem },
      weaponProjectiles: { createWeaponProjectileSystem, rotateVector },
      weaponTargeting: { nearestEnemy },
    };
  }

  function requireGlobal(globalRef, name) {
    return requireValue(globalRef?.[name], name);
  }

  function createAudioContextFactory(globalRef) {
    return () => {
      const AudioContextRef = globalRef?.AudioContext || globalRef?.webkitAudioContext;
      return typeof AudioContextRef === "function" ? new AudioContextRef() : null;
    };
  }

  function createAudioFactory(globalRef) {
    return (src) => {
      const AudioRef = globalRef?.Audio;
      return typeof AudioRef === "function" ? new AudioRef(src) : null;
    };
  }

  function createClock(globalRef) {
    return () => globalRef?.performance?.now?.() || 0;
  }

  function createBalanceStorageProvider(globalRef) {
    return {
      getItem: (key) => globalRef?.localStorage?.getItem?.(key),
      removeItem: (key) => globalRef?.localStorage?.removeItem?.(key),
      setItem: (key, value) => globalRef?.localStorage?.setItem?.(key, value),
    };
  }

  function createBalanceProfileSearchProvider(globalRef) {
    return () => globalRef?.location?.search || "";
  }

  function createStoragePlatformCapabilities(globalRef) {
    return {
      getLocalStorage: () => globalRef?.localStorage || null,
      getPreferences: () => globalRef?.Capacitor?.Plugins?.Preferences || null,
    };
  }

  function createShellRelicSchedulerProvider(globalRef) {
    return {
      clearTimeout: (timer) => globalRef?.clearTimeout?.(timer),
      setTimeout: (callback, delay) => globalRef?.setTimeout?.(callback, delay),
      animationSetTimeout: (callback, delay) => globalRef?.setTimeout?.(callback, delay),
    };
  }

  function createShellRelicUiDependency(globalRef) {
    const scheduler = createShellRelicSchedulerProvider(globalRef);
    const imageFactory = () => {
      const ImageRef = globalRef?.Image;
      return typeof ImageRef === "function" ? new ImageRef() : null;
    };
    return {
      createShellRelicUi(options = {}) {
        return createShellRelicUi({
          ...options,
          scheduler: options.scheduler || scheduler,
          imageFactory: options.imageFactory || imageFactory,
        });
      },
    };
  }

  function requireValue(value, name) {
    if (!value) {
      throw new Error(`Missing Tap Survivor runtime dependency: globalThis.${name}`);
    }
    return value;
  }

  function requireFunction(value, name) {
    if (typeof value !== "function") {
      throw new Error(`Missing Tap Survivor runtime dependency: ${name}`);
    }
    return value;
  }

  globalThis.TapSurvivorGameDependencies = {
    createGameDependencyBag,
  };
})();
