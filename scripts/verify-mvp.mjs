import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;

const checks = [];

function check(name, pass, detail = "") {
  checks.push({ name, pass: Boolean(pass), detail });
}

function readRequired(path) {
  const fullPath = join(root, path);
  const exists = existsSync(fullPath);
  check(`file exists: ${path}`, exists);
  return exists ? readFileSync(fullPath, "utf8") : "";
}

const index = readRequired("index.html");
const game = readRequired("src/game.js");
const gameBanners = readRequired("src/game-banners.js");
const runLifecycle = readRequired("src/run-lifecycle.js");
const gameRuntime = readRequired("src/game-runtime.js");
const gameDependencies = readRequired("src/game-dependencies.js");
const moduleGameDependencies = readRequired("src/modules/game-dependencies.js");
const styles = readRequired("src/styles.css");
const contentSource = readRequired("content/tap-survivor-content.json");
const generatedContent = readRequired("src/content.generated.js");
const effects = readRequired("src/effects.js");
const math = readRequired("src/math.js");
const sprites = readRequired("src/sprites.js");
const nativeSprites = readRequired("src/modules/sprites.js");
const spriteSheetRenderer = readRequired("src/sprite-sheet-renderer.js");
const assets = readRequired("src/assets.js");
const nativeAssets = readRequired("src/modules/assets.js");
const audio = readRequired("src/audio.js");
const nativeAudioAdapter = readRequired("src/modules/module-runtime-audio-adapter.js");
const quests = readRequired("src/quests.js");
const storageAdapter = readRequired("src/storage-adapter.js");
const nativeStorageAdapter = readRequired("src/modules/storage-adapter.js");
const saveDefaults = readRequired("src/save-defaults.js");
const saveMigrations = readRequired("src/save-migrations.js");
const saveNormalize = readRequired("src/save-normalize.js");
const save = readRequired("src/save.js");
const upgrades = readRequired("src/upgrades.js");
const contentRegistry = readRequired("src/content-registry.js");
const progression = readRequired("src/progression.js");
const renderSkillRail = readRequired("src/render-skill-rail.js");
const renderHud = readRequired("src/render-hud.js");
const nativeRenderHud = readRequired("src/modules/render-hud.js");
const renderEnemies = readRequired("src/render-enemies.js");
const nativeRenderEnemies = readRequired("src/modules/render-enemies.js");
const rendering = readRequired("src/rendering.js");
const nativeRendering = readRequired("src/modules/rendering.js");
const balance = readRequired("src/balance.js");
const weaponProjectiles = readRequired("src/weapon-projectiles.js");
const weaponTargeting = readRequired("src/weapon-targeting.js");
const weaponFire = readRequired("src/weapon-fire.js");
const nativeWeaponFire = readRequired("src/modules/weapon-fire.js");
const nativeWeaponBehaviors = readRequired("src/modules/weapon-behaviors.js");
const nativeWeaponProjectiles = readRequired("src/modules/weapon-projectiles.js");
const nativeWeaponCooldowns = readRequired("src/modules/weapon-cooldowns.js");
const enemyBehaviors = readRequired("src/enemy-behaviors.js");
const enemySpawning = readRequired("src/enemy-spawning.js");
const enemies = readRequired("src/enemies.js");
const combatDamage = readRequired("src/combat-damage.js");
const combat = readRequired("src/combat.js");
const uiProgression = readRequired("src/ui-progression.js");
const ui = readRequired("src/ui.js");
const runUi = readRequired("src/run-ui.js");
const levelUpChoices = readRequired("src/level-up-choices.js");
const levelUp = readRequired("src/level-up.js");
const nativeLevelUp = readRequired("src/modules/level-up.js");
const input = readRequired("src/input.js");
const nativeInput = readRequired("src/modules/input.js");
const pickups = readRequired("src/pickups.js");
const shopPricing = readRequired("src/shop-pricing.js");
const shop = readRequired("src/shop.js");
const relics = readRequired("src/relics.js");
const runState = readRequired("src/run-state.js");
const runUpdate = readRequired("src/run-update.js");
const debugBridge = readRequired("src/debug.js");
const nativeDebug = readRequired("src/modules/debug.js");
const shellRelicUi = readRequired("src/shell-relic-ui.js");
const shellUi = readRequired("src/shell-ui.js");
const productionModuleEntrypoint = readRequired("src/app/production-module-entrypoint.js");
const productionModuleAutoboot = readRequired("src/app/production-module-autoboot.js");
const browserDependencyBag = readRequired("src/app/browser-dependency-bag.js");
const plan = readRequired("MVP_GAME_PLAN.md");
const pipeline = readRequired("PHONE_TEST_PIPELINE.md");
const agentContext = readRequired("docs/AGENT_CODEBASE_CONTEXT.md");
const extensionGuide = readRequired("docs/CONTENT_EXTENSION_GUIDE.md");
const taskTemplate = readRequired("docs/AGENT_TASK_TEMPLATE.md");
const agentInstructions = readRequired("AGENTS.md");
const workflow = readRequired(".github/workflows/tap-survivor-pages.yml");
const pkg = readRequired("package.json");
const agentCheck = readRequired("scripts/agent-check.mjs");
const agentPrepush = readRequired("scripts/agent-prepush.mjs");
const cacheBump = readRequired("scripts/bump-cache-keys.mjs");
const addContent = readRequired("scripts/add-content.mjs");
const addSfx = readRequired("scripts/add-sfx.mjs");
const extractSprites = readRequired("scripts/extract-sprites.mjs");
const smokeExtractSprites = readRequired("scripts/smoke-extract-sprites.mjs");
const smokeAssetResolver = readRequired("scripts/smoke-asset-resolver.mjs");
const smokeAudioScaling = readRequired("scripts/smoke-audio-scaling.mjs");
const contentTools = readRequired("scripts/content-tools.mjs");
const contentSchemaTools = readRequired("scripts/content/content-schema.mjs");
const content = contentSource ? JSON.parse(contentSource) : {};
const contentText = `${contentSource}\n${generatedContent}`;
const staleText = `${index}\n${contentSource}\n${generatedContent}\n${agentContext}`;
const runtime = [
  game,
  gameBanners,
  runLifecycle,
  combat,
  combatDamage,
  nativeWeaponFire,
  nativeWeaponBehaviors,
  nativeWeaponProjectiles,
  nativeWeaponCooldowns,
  enemyBehaviors,
  enemySpawning,
  enemies,
  runState,
  runUpdate,
].join("\n");
const runtimeEntry = `${game}\n${gameDependencies}`;
const metaUpgradeIds = new Set((content.metaUpgrades || []).map((upgrade) => upgrade.id));
const runUpgradeIds = new Set((content.runUpgrades || []).map((upgrade) => upgrade.id));

check("index loads stylesheet", /href="src\/styles\.css(\?[^"]+)?"/.test(index));
check(
  "index selects ESM production autoboot",
  /src="src\/app\/production-module-autoboot\.js(\?[^"]+)?"/.test(index) &&
    !/src="src\/game\.js(\?[^"]+)?"/.test(index) &&
    !/src="src\/game-dependencies\.js(\?[^"]+)?"/.test(index)
);
check("index keeps generated shell bridge modules", /src="src\/shell-relic-ui\.js(\?[^"]+)?"/.test(index) && /src="src\/shell-ui\.js(\?[^"]+)?"/.test(index));
check("production module entrypoint is wired for the browser dependency bag", productionModuleEntrypoint.includes("./browser-dependency-bag.js") && productionModuleEntrypoint.includes("../modules/module-game-lifecycle.js") && productionModuleEntrypoint.includes("../modules/module-game-dependencies.js"));
check(
  "production module autoboot remains the explicit browser-global boundary",
  productionModuleAutoboot.includes("bootProductionModuleRuntime({ globalRef: globalThis });")
);
check("canvas exists", /<canvas[^>]+id="game"/.test(index));
check("canvas keeps 16:9 resolution", styles.includes("aspect-ratio: 16 / 9") && styles.includes("height: auto"));
check("speed controls exist", ["data-speed=\"1\"", "data-speed=\"2\"", "data-speed=\"5\""].every((id) => index.includes(id)) && styles.includes(".speed-controls"));
check("mute button exists", index.includes('id="muteAudio"') && ui.includes("muteAudio") && shellUi.includes("toggleAudioMute") && shellUi.includes("updateMuteButton") && audio.includes("toggleMuted"));
check("mobile viewport exists", index.includes('name="viewport"'));

check("tap/click target handler exists", input.includes("setTargetFromEvent"));
check("mouse movement input exists", input.includes('addEventListener?.("mousedown"'));
check("touch movement input exists", input.includes('addEventListener?.("touchstart"'));
check("enemy chase loop exists", runtime.includes("updateEnemies") && runtime.includes("enemy.speed"));
check("content source exists", contentSource.includes('"schemaVersion"') && generatedContent.includes("TapSurvivorContent"));
check("Kenney asset manifest exists", content.assets?.sources?.some((source) => source.id === "kenney_desert_shooter_pack" && source.commercialUse === true && source.attributionRequired === false));
check("Kenney sprites are wired", ["player", "drifter", "skitter", "bulwark", "spark_bolt", "prism_beam"].every((id) => contentText.includes(id)) && sprites.includes("drawSprite"));
check("generated tower background asset exists", content.assets?.sources?.some((source) => source.id === "generated_tower_floor" && source.commercialUse === true && source.attributionRequired === false) && content.assets?.sprites?.backgrounds?.tower_floor);
check("player uses wizard sprite", content.assets?.sprites?.player?.includes("wizard-idle-staff") && rendering.includes("Math.max(70"));
check("wizard sprite flips by facing", sprites.includes("flipX") && rendering.includes("playerFacesLeft") && rendering.includes("flipX: playerFacesLeft(p)"));
check("wizard uses movement and attack animation sprites", content.assets?.sprites?.playerAnimations?.walk && content.assets?.sprites?.playerAnimations?.cast_orb && sprites.includes("playerAnimations") && rendering.includes("playerSpriteId") && nativeWeaponFire.includes("setPlayerAttackAnimation") && runUpdate.includes("updatePlayerAnimation"));
check("projectile sprites rotate toward travel direction", rendering.includes("Math.atan2(bolt.vy || 0, bolt.vx || 1)") && rendering.includes("drawSprite(`weapon:${weapon?.assetId || bolt.weaponId}`") && rendering.includes("rotation"));
check("enemy floor tint steps every five floors to 100", enemySpawning.includes("towerFloor: game.towerFloor") && renderEnemies.includes("function drawEnemyFloorTint") && renderEnemies.includes("Math.floor((floor - 1) / 5)") && renderEnemies.includes("clamp(Math.floor(enemy.towerFloor || 1), 1, 100)"));
check("beam and cone effects can use weapon sprites", nativeWeaponFire.includes("weaponId,") && rendering.includes("drawSprite(`weapon:${weapon.assetId || beam.weaponId}`") && rendering.includes("spriteHeight"));
const drawAreaBody = rendering.match(/function drawArea\(area\) \{[\s\S]*?\n  \}/)?.[0] || "";
check("large AoE effects stay unflipped", drawAreaBody.includes("ctx.arc(area.x, area.y, area.radius") && !drawAreaBody.includes("flipX"));
check("weapon sound effects are wired", Object.keys(content.weapons || {}).every((id) => content.assets?.sfx?.weapons?.[id]) && audio.includes("createAudioSystem") && audio.includes("playbackRate") && nativeWeaponFire.includes("weaponSfxOptions") && nativeWeaponFire.includes("playWeaponSfx?.(weaponId, weaponSfxOptions(weapon))") && combat.includes("playWeaponSfx") && game.includes("audioSystem.playWeapon"));
check("run upgrade sound effects are wired", (content.runUpgrades || []).every((upgrade) => content.assets?.sfx?.runUpgrades?.[upgrade.id]) && audio.includes("playRunUpgrade") && levelUp.includes("playChoiceSfx?.(choice)") && game.includes("playLevelChoiceSfx"));
check("generated tower sprite set exists", content.assets?.sources?.some((source) => source.id === "generated_tower_sprites" && source.commercialUse === true && source.attributionRequired === false));
check("user enemy sprite sheet exists", content.assets?.sources?.some((source) => source.id === "user_enemy_sprite_sheet_20260614" && source.commercialUse === true && source.attributionRequired === false) && ["drifter", "skitter", "bulwark", "hexer", "boss"].every((id) => content.assets?.sprites?.enemies?.[id]?.includes("sheet-20260614")));
check("user skill effect atlases exist", [1, 2, 3, 4, 5].every((batch) => content.assets?.sources?.some((source) => source.id === `user_skill_effect_sheet_20260615_batch_${String(batch).padStart(2, "0")}` && source.commercialUse === true && source.attributionRequired === false)) && Object.keys(content.weapons || {}).every((id) => Array.isArray(content.assets?.sprites?.weapons?.[id]?.frames) && content.assets.sprites.weapons[id].src?.includes("skill-effects/split/skill-")) && (content.runUpgrades || []).every((upgrade) => Array.isArray(content.assets?.sprites?.runUpgrades?.[upgrade.id]?.frames) && content.assets.sprites.runUpgrades[upgrade.id].src?.includes("skill-effects/split/skill-")));
check("skill effects have tunable scale and transparency", Object.keys(content.weapons || {}).every((id) => Number.isFinite(content.assets?.sprites?.weapons?.[id]?.effectScale) && Number.isFinite(content.assets?.sprites?.weapons?.[id]?.effectAlpha)) && (content.runUpgrades || []).every((upgrade) => Number.isFinite(content.assets?.sprites?.runUpgrades?.[upgrade.id]?.effectScale) && Number.isFinite(content.assets?.sprites?.runUpgrades?.[upgrade.id]?.effectAlpha)) && sprites.includes("options.alpha") && rendering.includes("skillEffectTuning") && rendering.includes("effectAlpha") && rendering.includes("effectScale"));
check("tower background renders", sprites.includes("background:") && sprites.includes("drawImage") && rendering.includes('background:tower_floor') && game.includes("drawImage: spriteSystem.drawImage"));
check(
  "tower floors one through eight introduce enemies",
  [1, 2, 3, 4, 5, 6, 7, 8].every((floor) =>
    (content.enemyTypes || []).some((enemy) => enemy.minTowerFloor === floor),
  ),
);
check(
  "eight enemy types exist",
  (content.enemyTypes || []).filter((enemy) =>
    [
      "drifter",
      "skitter",
      "bulwark",
      "hexer",
      "verdant_skitter",
      "dusk_crawler",
      "crimson_hexer",
      "obsidian_bulwark",
    ].includes(enemy.id),
  ).length === 8,
);
check("ranged enemy unlocks after floor three", (content.enemyTypes || []).some((enemy) => enemy.id === "hexer" && enemy.minTowerFloor === 4 && enemy.attackRange && enemy.projectileCooldown) && enemySpawning.includes("isEnemyAvailable"));
check("default character registry entry exists", (content.characters || []).some((character) => character.id === "character_default" && character.spriteId === "player"));
check("content levels drive enemy waves", (content.levels || []).length >= 3 && content.levels.some((level) => level.enemyIds?.includes("bulwark")) && runtime.includes("activeLevelDef") && runtime.includes("levelEnemyTypes"));
check("boss ability tuning is content-driven", content.bossConfig?.abilityIds?.length === 3 && ["warden", "charger", "turret"].every((id) => content.bossAbilities?.[id]) && enemies.includes("bossConfig") && enemies.includes("bossAbilities"));
check("enemy spawns are content-counted and patterned", runtime.includes("spawnPatternPositions(spawnCount)") && runtime.includes("spawnEnemy(type, position)"));
check("enemy projectiles update through combat loop", runState.includes("enemyBolts") && combat.includes("updateEnemyBolts") && runUpdate.includes("combat.updateEnemyBolts(dt)") && renderEnemies.includes("drawEnemyBolt"));
check("enemy projectiles are high-visibility", content.bossConfig?.enemyBolt?.radius >= 7 && renderEnemies.includes("tailX") && renderEnemies.includes("bolt.radius + 4"));
check("enemy projectile pacing scales by tower floor", enemies.includes("projectileFireRateScale") && enemies.includes("scaledProjectileCooldown") && enemies.includes("scaledProjectileSpeed") && content.bossConfig?.projectileScaling?.fireRateBase < 1 && content.bossConfig?.projectileScaling?.fireRateMax > 1);
check("shield pulse clears enemy projectiles and charges block", nativeWeaponBehaviors.includes('weaponId === "shield_pulse"') && nativeWeaponBehaviors.includes("destroyEnemyProjectilesInRange") && nativeWeaponBehaviors.includes("chargeProjectileBlock") && runState.includes("projectileBlockCharge") && enemyBehaviors.includes("projectileBlockReady") && rendering.includes("drawProjectileBlockBar"));
check("speed multiplier scales game loop", gameRuntime.includes("let gameSpeed = 1") && game.includes("runUpdater.update(dt * (gameRuntime?.getGameSpeed() || 1))") && gameRuntime.includes("setGameSpeed"));
check("auto attack loop exists", runtime.includes("updateWeapons") && runtime.includes("fireWeapon"));
check("weapon kind dispatch table exists", nativeWeaponFire.includes("weaponKindHandlers") && ["radial", "beam", "cone", "chain", "projectile", "target_area", "lingering_area", "mine"].every((kind) => nativeWeaponFire.includes(`${kind}:`)));
check("XP drops exist", runState.includes("xpDrops") && runUpdate.includes("collectXp"));
check("coin and heart drops exist", runState.includes("lootDrops") && pickups.includes("spawnLootDrops") && pickups.includes('type: "coin"') && pickups.includes('type: "heart"'));
check("coin and heart pickups use sprites", content.assets?.sprites?.ui?.coin && content.assets?.sprites?.ui?.heart && rendering.includes("ui:coin") && rendering.includes("ui:heart"));
check("pickup attraction scales with speed", pickups.includes("pullDropTowardPlayer") && runUpdate.includes("pickupSystem.updateXpDrops(dt)") && runUpdate.includes("pickupSystem.updateLootDrops(dt)") && pickups.includes("pullDropTowardPlayer(drop, player, 480, dt)") && pickups.includes("pullDropTowardPlayer(drop, player, 540, dt)"));
check("pickup text updates through run loop", runState.includes("pickupTexts") && pickups.includes("addPickupText") && pickups.includes("updatePickupTexts") && runUpdate.includes("pickupSystem.updatePickupTexts(dt)") && rendering.includes("drawPickupText"));
check("floor four ranged enemies can spawn immediately", (content.levels || []).filter((level) => level.startsAt <= 30).every((level) => level.enemyIds?.includes("hexer")) && enemySpawning.includes("minTowerFloor"));
check("coins persist in save", saveDefaults.includes("coins: 0") && pickups.includes("save.coins +=") && pickups.includes("persist()"));
check("heart drops heal 20 percent max HP", pickups.includes('drop.type === "heart"') && pickups.includes("game.player.maxHp * drop.healPercent") && pickups.includes("healPercent: 0.2"));
check("player HP bar renders above sprite", rendering.includes("drawPlayerHpBar") && rendering.includes("p.y - p.radius - 16"));
check("level-up choices exist", runUpdate.includes("showLevelUp") && levelUp.includes("createLevelUpSystem") && contentText.includes("Prism Beam"));
check("Laser weapon exists", runtime.includes("fireBeam") && contentText.includes("prism_beam"));
check("10 new weapons exist", ["frost_orb", "flame_wave", "saw_drone", "void_mine", "chain_spark", "moon_glaive", "meteor_pin", "acid_pool", "shield_pulse", "nova_burst"].every((id) => content.weapons?.[id]));
check("Saw Drone is a heavy projectile weapon", content.weapons?.saw_drone?.kind === "projectile" && content.weapons?.saw_drone?.radius >= 20 && content.weapons?.saw_drone?.speed <= 180);
check("Laser use quest exists", contentText.includes("use_laser_run"));
check("Quest Points are awarded", contentText.includes("rewardQp") && quests.includes("save.questPoints += reward"));
check("more quest types exist", ["first_blood", "gatherer", "survivor_60", "crowd_control", "rapid_growth", "heavy_hits", "boss_hunter"].every((id) => content.quests?.[id]));
check("extended milestone quests exist", ["survivor_180", "survivor_300", "exterminator", "reaper", "power_climb", "apex_growth", "damage_dealer", "apocalypse_damage", "gem_hoarder", "gem_flood"].every((id) => content.quests?.[id]));
check("higher-tier milestone quests exist", ["survivor_420", "warlord", "transcendent_growth", "worldbreaker_damage", "gem_storm", "boss_slayer", "boss_reaper"].every((id) => content.quests?.[id]));
check("end-chain milestone quests exist", ["legion_breaker", "limitless_growth", "cataclysm_damage", "gem_typhoon", "boss_legend"].every((id) => content.quests?.[id]));
check("second-tier weapon quests exist", ["spark_bolt_expert", "prism_beam_expert", "frost_orb_expert", "flame_wave_expert", "chain_spark_expert", "void_mine_expert", "acid_pool_expert", "saw_drone_expert", "shield_pulse_expert", "moon_glaive_expert", "meteor_pin_expert", "nova_burst_expert"].every((id) => content.quests?.[id]));
check("third-tier quest extensions exist", ["survivor_600", "army_ender", "tower_transcendent", "oblivion_damage", "gem_singularity", "boss_myth", "spark_bolt_master", "nova_burst_master"].every((id) => content.quests?.[id]));
check("higher-tier quests reward more QP", [5, 6, 7, 8].every((reward) => Object.values(content.quests || {}).some((quest) => quest.rewardQp === reward)));
check("quest progress groups feed milestone chains", ["killQuestIds", "damageQuestIds", "survivalQuestIds", "xpQuestIds", "levelQuestIds", "bossQuestIds", "addQuestProgressGroup"].every((id) => runtime.includes(id)));
check("quests can open multiple follow-ups", quests.includes("opensQuests") && quests.includes("questOpenIds"));
check("quest chains can open follow-up quests", quests.includes("opensQuest") && quests.includes("questOpenIds(questDefs[id]).forEach(openQuest)"));
check("weapon quests progress by weapon ID", quests.includes("addQuestProgressForWeapon") && combatDamage.includes("addQuestProgressForWeapon(weaponId, dealt)"));
check("combat stats feed quest progress", runtime.includes("addQuestProgressGroup(killQuestIds, 1)") && runtime.includes("addQuestProgressGroup(xpQuestIds, value)") && runtime.includes("addQuestProgressGroup(damageQuestIds, dealt)"));
check("meta upgrades are content-driven", (content.metaUpgrades || []).length === 7 && upgrades.includes("metaUpgradeDefs"));
check("run upgrades are content-driven", (content.runUpgrades || []).length >= 12 && upgrades.includes("applyRunUpgradeEffects"));
check("meta upgrades are quest-gated", (content.metaUpgrades || []).some((upgrade) => upgrade.requiresQuest === "first_blood") && (content.metaUpgrades || []).some((upgrade) => upgrade.requiresQuest === "boss_hunter"));
check("Laser Damage upgrade exists", upgrades.includes("laser_damage") && upgrades.includes("maxTier: 5"));
check("upgrade tiers are tracked", progression.includes("upgradeTiers") && uiProgression.includes("Buy Tier"));
check("progression tier cap follows upgrade max tiers", progression.includes("maxTierByUpgradeId") && progression.includes("Math.min(maxTier || tier, tier)") && game.includes("upgradeDefs,"));
check("skill tree gates by prerequisite and quest", progression.includes("requiresNode") && progression.includes("requiresQuest") && progression.includes("nodeGateStatus"));
check("completed quests disappear from quest list", uiProgression.includes("activeQuestIds") && !uiProgression.includes("Status: ${complete"));
check("level-up choices are limited to 3 random options", levelUpChoices.includes("shuffleChoices") && levelUp.includes(".slice(0, 3)"));
check("level-up choices avoid immediate repeats", levelUp.includes("lastLevelUpChoiceIds") && levelUp.includes("freshChoices") && levelUp.includes("repeatChoices"));
check("level-up choices have icons and click guard", levelUp.includes("level-choice-icon") && levelUp.includes("button.disabled = true") && levelUp.includes("}, 500)") && styles.includes("#levelUp .modal-box") && styles.includes("grid-template-columns: repeat(3"));
check("level-up skill select uses static icons", levelUp.includes("createChoiceIcon") && levelUp.includes("assetResolver.choiceIconPath") && !levelUp.includes("renderChoiceSprite") && !levelUp.includes("requestAnimationFrame(drawFrame)") && Object.keys(content.weapons || {}).every((id) => content.assets?.sprites?.weapons?.[id]?.iconSrc?.includes("assets/generated/tower/sprites/")) && (content.runUpgrades || []).every((upgrade) => content.assets?.sprites?.runUpgrades?.[upgrade.id]?.iconSrc?.includes("assets/generated/tower/sprites/")));
check("clean icons render and flash on left HUD", sprites.includes("weaponIcon:") && sprites.includes("options.trim === false") && sprites.includes("runUpgradeIcons") && renderSkillRail.includes("weaponFlashAmount") && renderSkillRail.includes("drawFallbackWeaponGlyph") && renderSkillRail.includes("weaponIcon:") && renderSkillRail.includes("drawUpgradeRail") && renderSkillRail.includes("drawFallbackUpgradeGlyph") && renderSkillRail.includes("runUpgradeIcon:") && runState.includes("weaponIconFlashes") && nativeWeaponFire.includes("flashWeaponIcon") && nativeWeaponFire.includes("weaponIconFlashes[weaponId] = 1") && (content.runUpgrades || []).every((upgrade) => content.assets?.sprites?.runUpgradeIcons?.[upgrade.id]?.includes("assets/generated/tower/sprites/")));
check("unique weapons are capped", levelUp.includes("maxEquippedWeapons") && levelUp.includes("equippedWeapons.length < maxWeapons") && game.includes("maxEquippedWeapons"));
check("active quest weapons are offered on level-up", levelUp.includes("activeQuestWeaponIds") && levelUp.includes("questWeaponChoices"));
check("new combat upgrade types exist", ["attack_radius", "fire_rate", "flat_damage", "percent_damage"].every((id) => metaUpgradeIds.has(id)));
check("new run upgrade types exist", ["run_attack_radius", "run_fire_rate", "run_flat_damage", "run_percent_damage"].every((id) => runUpgradeIds.has(id)));
check("projectile behavior run upgrades exist", ["run_projectile_pierce", "run_wall_bounce", "run_split_shot", "run_explosive_hit", "run_split_on_hit"].every((id) => runUpgradeIds.has(id)));
check("more attack speed and damage levels exist", content.runUpgrades?.find((upgrade) => upgrade.id === "run_fire_rate")?.maxTier === 8 && content.runUpgrades?.find((upgrade) => upgrade.id === "run_percent_damage")?.maxTier === 8 && content.metaUpgrades?.find((upgrade) => upgrade.id === "fire_rate")?.maxTier === 5 && content.metaUpgrades?.find((upgrade) => upgrade.id === "percent_damage")?.maxTier === 5);
check("weapon damage upgrades have more tiers", upgrades.includes("cost: [1, 2, 3, 4, 5]") && upgrades.includes("maxTier: 5"));
check("projectile behavior hooks exist", ["run_projectile_pierce", "run_wall_bounce", "run_split_shot", "run_explosive_hit", "run_split_on_hit", "spawnProjectileBolt", "splitBoltOnHit", "explodeBolt"].every((token) => nativeWeaponProjectiles.includes(token)));
check("level-up choices favor started upgrade families", levelUpChoices.includes("weightedChoices") && levelUp.includes("familyTiers") && levelUp.includes("choice.runUpgradeId"));
check("relic content exists for run skills", (content.relics || []).length >= 24 && (content.runUpgrades || []).every((upgrade) => (content.relics || []).filter((relic) => relic.targetUpgradeId === upgrade.id).length >= 2));
check("relics affect level-up choices and run starts", levelUp.includes("relicSpawnRateMultiplier") && levelUp.includes("maxTierBonus") && levelUp.includes("equippedRelics") && levelUpChoices.includes("relic_compass") && relics.includes("startingRunUpgradeTiers") && game.includes("applyRelicStartingRunUpgrades") && game.includes("upgrade.apply?.(run)") && (content.relics || []).filter((relic) => relic.id.includes("_focus_relic")).every((relic) => relic.startingTierBonus === 1 && relic.maxTierBonus === 1 && relic.selectionWeightBonus === 2) && (content.relics || []).filter((relic) => /^random_.*_obsessed_relic$/.test(relic.id)).every((relic) => relic.startingTierBonus === 2 && relic.maxTierBonus === 2 && relic.selectionWeightBonus === 3) && (content.relics || []).filter((relic) => /^random_.*_mastery_relic$/.test(relic.id)).every((relic) => relic.startingTierBonus === 3 && relic.maxTierBonus === 3 && relic.selectionWeightBonus === 5) && (content.relics || []).filter((relic) => !relic.id.startsWith("random_") && relic.id.includes("_mastery_relic")).every((relic) => relic.startingTierBonus === 2 && relic.maxTierBonus === 2 && relic.selectionWeightBonus === 3));
check("boss relics are choice based", index.includes('id="relicChoice"') && runLifecycle.includes("showRelicChoice") && runLifecycle.includes("relicSystem.relicChoices") && relics.includes("relevantRunUpgradeIds"));
check("relic inventory menu exists", index.includes('id="menuInventoryTab"') && index.includes('id="menuRelicInventory"') && ui.includes("menuRelicInventory") && shellUi.includes("renderInventory") && shellRelicUi.includes("createCharacterPanel") && shellRelicUi.includes("createRelicSlot") && shellRelicUi.includes("openRelicDetail") && shellRelicUi.includes("createRelicSkillPreview") && shellRelicUi.includes("showRelicLockedMessage") && shellRelicUi.includes("Locked, play more to unlock this skill.") && shellRelicUi.includes("assetResolver.relicIcon") && shellRelicUi.includes("relic-lock-badge") && shellRelicUi.includes("Equip relic") && styles.includes(".relic-loadout") && styles.includes(".relic-slot.locked") && styles.includes(".relic-icon-grid") && styles.includes(".relic-icon-button.locked") && styles.includes(".relic-lock-badge") && styles.includes(".relic-lock-popup") && styles.includes(".relic-detail-screen"));
check("relic slots unlock by tower floor", saveDefaults.includes("towerFloor: 1") && !save.includes("maxPlayerLevel") && !runUpdate.includes("recordPlayerLevel") && relics.includes("maxEquippedRelics") && relics.includes("Math.floor(Math.max(0, save.towerFloor || 1) / 10)") && shellRelicUi.includes("tower level ${nextLevel}") && shellRelicUi.includes("Unlocked at tower level ${unlockLevel}") && relics.includes("Math.min(5"));
check("relics have inventory icons", (content.relics || []).every((relic) => relic.iconPath) && assets.includes("relicIcon") && shellRelicUi.includes("assetResolver.relicIcon"));
check("weapon slot relics exist", (content.relics || []).some((relic) => relic.weaponSlotBonus > 0) && (content.relics || []).some((relic) => relic.weaponSlotBonus < 0 && relic.weaponDamageMultiplier === 2) && relics.includes("getWeaponDamageMultiplier"));
check("run move speed spreads over five tiers", content.runUpgrades?.find((upgrade) => upgrade.id === "run_move_speed")?.maxTier === 5 && content.runUpgrades?.find((upgrade) => upgrade.id === "run_move_speed")?.effects?.some((effect) => effect.stat === "speed" && effect.value === 20));
check("coin shop exists", index.includes('id="shopItems"') && shop.includes("createShopSystem"));
check("shop items are content-driven", (content.shopItems || []).length >= 12 && shop.includes("shopItemDefs"));
check("shop items have distinct sprites", (content.shopItems || []).every((item) => item.spritePath) && shop.includes("shop-item-sprite"));
check("shop purchases persist", saveDefaults.includes("shopPurchases") && saveNormalize.includes("normalizeShopPurchases") && shop.includes("save.shopPurchases"));
check("shop purchase SFX is wired", audio.includes("function playShopPurchase") && shop.includes("playPurchaseSfx?.()") && game.includes("playPurchaseSfx: audioSystem.playShopPurchase"));
check("shop prices scale with tower floor", shopPricing.includes("SHOP_FLOOR_PRICE_RATE = 0.03") && shopPricing.includes("towerFloor") && shop.includes("Cost: ${cost} coins"));
check(
  "shop prices inflate after purchases",
    shopPricing.includes("purchasedTierCount") &&
    shopPricing.includes("SHOP_INFLATION_RATE = 0.025") &&
    shopPricing.includes("taperedInflationMultiplier") &&
    shop.includes("onPurchaseNotice?.(message)") &&
    game.includes("onPurchaseNotice: (message) => bannerSystem.showBanner(message)") &&
    shop.includes("Inflation huh."),
);
check("coin rewards scale toward floor 100 shop buyout", pickups.includes("function coinValue") && pickups.includes("(floor - 1) * coinFloorRewardRate") && pickups.includes("game.towerFloor") && shopPricing.includes("SHOP_FLOOR_PRICE_RATE = 0.03") && content.tuning?.loot?.coinFloorRewardRate === 0.06);
check("shop bonuses affect run starts", game.includes("shopSystem.getShopBonuses") && runState.includes("shopBonuses.speed") && runState.includes("shopBonuses.maxHp"));
check("shop damage bonus affects combat", ["shopBonuses.flatDamage", "shopBonuses.fireRate", "shopBonuses.attackRadius", "shopBonuses.percentDamage"].every((token) => nativeWeaponCooldowns.includes(token)) && game.includes("getShopBonuses"));
check("title screen starts first", index.includes('id="titleScreen" class="modal"') && !index.includes('id="startMenu"') && shellUi.includes('currentScreen = "title"'));
check("title Start Game starts run after transition", index.includes('id="titleStartGame"') && shellUi.includes("function startGameFromTitle") && shellUi.includes("startRun();"));
check("title Start Game plays procedural laugh once", audio.includes("function playStartLaugh") && audio.includes("createOscillator") && shellUi.includes("if (currentScreen !== \"title\") return") && shellUi.includes("playStartLaugh?.()") && game.includes("playStartLaugh: audioSystem.playStartLaugh"));
check("title Start Game runs one brief transition", index.includes('id="startTransition" class="modal hidden"') && ui.includes("startTransition") && shellUi.includes('currentScreen = "startingTransition"') && shellUi.includes("startTransitionTimer") && shellUi.includes("setTimeout") && shellUi.includes("}, 450);"));
check("pre-game movement gate blocks gameplay update", runLifecycle.includes("game.awaitingFirstMoveInput = true") && runUpdate.includes("if (game.awaitingFirstMoveInput) return;") && gameBanners.includes('showBanner("Click/tap to move", 0)'));
check("pre-game movement gate clears on first arena input", gameRuntime.includes("function bindFirstMoveGate") && gameRuntime.includes("game.awaitingFirstMoveInput = false") && gameRuntime.includes("hideMovementGateBanner") && input.includes("game.player.targetX"));
check("intermediate start run screen is absent", !index.includes('id="startMenu"') && !index.includes('id="startMenuStartRun"') && !index.includes('id="startMenuOpenShop"'));
check("shop has reliable close controls", index.includes('id="closeShop"') && index.includes('id="closeShopBottom"') && shellUi.includes("function closeShopMenu"));
check("modal boxes scroll", styles.includes(".modal-box") && styles.includes("overflow-y: auto") && styles.includes("overscroll-behavior: contain"));
check("run menu pauses game", index.includes('id="openMenu"') && shellUi.includes("openRunMenu") && shellUi.includes('pauseReason = "menu"'));
check("quest rewards moved to menu tab", index.includes('id="menuProgressTab"') && index.includes(">Rewards</button>") && index.includes('id="menuTree"') && index.includes('id="menuQuests"') && !index.includes('id="qpHud"') && !index.includes('id="tree"') && !index.includes('id="quests"') && !ui.includes("ui.qpHud"));
check("run menu includes shop tab", index.includes('id="menuShopTab"') && index.includes('id="menuShopItems"') && shellUi.includes('showRunMenuTab("shop")') && shop.includes("menuShopItems"));
check("run menu button toggles menu", shellUi.includes("function toggleRunMenu") && shellUi.includes("ui.openMenu.addEventListener(\"click\", toggleRunMenu)") && index.includes('aria-expanded="false"'));
check("runs can be exited", index.includes('id="exitRun"') && game.includes('endRun("Run exited")'));
check("fullscreen button exists", index.includes('id="fullscreenButton"') && shellUi.includes("function toggleFullscreen") && shellUi.includes("requestFullscreen"));
check("menus have exit crosses", ["closeMenu", "closeLevelUp", "closeEndX"].every((id) => index.includes(`id="${id}"`)) && game.includes("closeLevelUpMenu") && game.includes("closeEndScreen"));
check("follow-up Laser quest opens", contentText.includes("laser_damage_5000"));
check("run lasts 2.5 minutes before boss", runtime.includes("duration: 150") && runtime.includes("spawnBoss"));
check("stale six-minute run text is absent", !/6-minute boss|survive 6 minutes|survives six minutes/i.test(staleText));
check("boss death advances tower floor", runtime.includes("advanceTowerFloor") && game.includes("function advanceTowerFloor") && runtime.includes("enemy.boss"));
check("tower floor progresses after boss clear", saveDefaults.includes("towerFloor: 1") && runLifecycle.includes("save.towerFloor") && runUi.includes("Cleared Floor") && renderHud.includes("Tower Floor"));
check("boss clears grant relics", saveDefaults.includes("unlockedRelics") && saveDefaults.includes("equippedRelics") && relics.includes("grantRandomRelic") && runLifecycle.includes("lastFloorClear"));
check("every fifth floor has super boss relic drop", enemies.includes("superBoss") && runLifecycle.includes("relicDropCount") && runLifecycle.includes("clearedFloor % 5 === 0 ? 2 : 1"));
check("boss kills feed boss quest chain", runtime.includes("addQuestProgressGroup(bossQuestIds, 1)"));
check("reusable banner system exists", index.includes('id="questBanner"') && quests.includes("onQuestComplete") && gameBanners.includes("showBanner") && game.includes("first_shop_visit") && gameBanners.includes("first_quest_completion") && game.includes("first_boss_fight") && game.includes("first_super_boss_fight") && styles.includes(".quest-banner"));
check("boss health bar renders at screen top", renderHud.includes("drawBossHealthBar") && renderHud.includes("boss.hp / boss.maxHp") && renderHud.includes("SUPER BOSS"));
check("boss special charge bar renders at screen top", renderHud.includes("drawBossSpecialBar") && renderHud.includes("bossAttackCooldownMax") && renderHud.includes("SPECIAL"));
check("boss spawn warning and sky drop exist", enemies.includes("bossSpawnNotice") && enemies.includes('type: "boss_drop"') && enemies.includes("landingX") && renderHud.includes("drawBossSpawnNotice") && rendering.includes("boss_drop"));
check("boss shockwave special exists", runtime.includes("updateBossSpecials") && rendering.includes("drawBossAttack") && runtime.includes('type: "shockwave"'));
check("boss variants include charger and turret", content.bossAbilities?.charger && content.bossAbilities?.turret && enemyBehaviors.includes("startBossCharge") && enemyBehaviors.includes('type: "boss_slash"') && enemies.includes("projectileCooldown") && rendering.includes("drawBossSlash"));
check("super bosses combine two boss abilities", enemies.includes("superBossAbilityCount") && enemies.includes("chooseBossAbilities") && enemies.includes("bossAbilities") && enemies.includes("hasBossAbility"));
check("weapon attack animations exist", runState.includes("weaponBursts") && nativeWeaponFire.includes("addWeaponBurst") && nativeWeaponFire.includes("updateWeaponBursts") && rendering.includes("drawWeaponBurst"));
check("all weapons have sprite mappings", Object.keys(content.weapons || {}).every((id) => content.assets?.sprites?.weapons?.[id]));
check("first three floors have explicit balance tuning", balance.includes("floorTable") && balance.includes("hp: 0.9") && balance.includes("hp: 1.1") && balance.includes("hp: 1.33") && enemies.includes("balance.floorDifficulty") && game.includes("balance,"));
check(
  "debug balance system exists",
  nativeDebug.includes("createDebugSystem") &&
    gameDependencies.includes("debug: { createDebugSystem }") &&
    !runtimeEntry.includes("TapSurvivorDebug")
);
check(
  "debug overlay reports balance stats",
  ["Enemy HP", "Enemy DMG", "Weapon slots", "Weapon damage", "Run upgrades", "Relics"].every((token) =>
    nativeDebug.includes(token)
  )
);
check("local save exists", game.includes("tap-survivor-mvp-save-v2") && storageAdapter.includes("localStorage") && storageAdapter.includes("getSaveRaw"));
check(
  "shared quest helpers are explicitly dependency-injected without a classic publisher",
  quests.includes("function createQuestSystem") &&
    !quests.includes("globalThis.TapSurvivorQuests =") &&
    gameDependencies.includes("quests: { createQuestSystem, questOpenIds }") &&
    game.includes("quests.createQuestSystem") &&
    game.includes("questOpenIds")
);
check(
  "shared save helpers are explicitly dependency-injected without a classic publisher",
  save.includes("function createSaveSystem") &&
    !save.includes("globalThis.TapSurvivorSave =") &&
    saveDefaults.includes("TapSurvivorSaveDefaults") &&
    saveMigrations.includes("TapSurvivorSaveMigrations") &&
    saveNormalize.includes("TapSurvivorSaveNormalize") &&
    gameDependencies.includes("const save = { createSaveSystem };") &&
    gameDependencies.includes("      save,") &&
    game.includes("saveDependencies.createSaveSystem") &&
    storageAdapter.includes("// Retired global: TapSurvivorStorage."),
);
check(
  "storage provider is source-owned while the generated publisher is retired",
  nativeStorageAdapter.includes("export function createStorageProvider") &&
    !nativeStorageAdapter.includes("TapSurvivorStorage") &&
    !nativeStorageAdapter.includes("globalThis") &&
    storageAdapter.includes("// GENERATED FILE.") &&
    storageAdapter.includes("// Source: src/modules/storage-adapter.js") &&
    !storageAdapter.includes("globalThis.TapSurvivorStorage =") &&
    storageAdapter.includes(
      "// Retired global: TapSurvivorStorage. Exports are supplied through the game dependency bag."
    ) &&
    moduleGameDependencies.includes(
      'import { createStorageProvider } from "./storage-adapter.js";'
    ) &&
    moduleGameDependencies.includes("const storage = createStorageProvider({") &&
    moduleGameDependencies.includes("    storage,") &&
    !moduleGameDependencies.includes("TapSurvivorStorage") &&
    gameDependencies.includes("function createStorageProvider") &&
    !gameDependencies.includes("TapSurvivorStorage"),
);
check(
  "shared math helpers exist",
  math.includes("function clamp") &&
    gameDependencies.includes("math: { clamp, distance, formatTime, randomRange }") &&
    game.includes("const { clamp, distance, randomRange, formatTime } = math") &&
    rendering.includes("clamp") &&
    renderHud.includes("clamp") &&
    !math.includes("globalThis.TapSurvivorMath") &&
    !gameDependencies.includes("TapSurvivorMath") &&
    !rendering.includes("globalThis.TapSurvivorMath") &&
    !renderHud.includes("globalThis.TapSurvivorMath"),
);
check(
  "shared sprite helpers are source-owned with a retired generated compatibility publisher",
  nativeSprites.includes("export function createSpriteSystem") &&
    nativeSprites.includes("export function createSpriteSheetRenderer") &&
    !nativeSprites.includes("TapSurvivorSprites") &&
    !nativeSprites.includes("globalThis") &&
    sprites.includes("// GENERATED FILE.") &&
    sprites.includes("// Source: src/modules/sprites.js") &&
    sprites.includes(
      "// Retired global: TapSurvivorSprites. Exports are supplied through the game dependency bag."
    ) &&
    !sprites.includes("globalThis.TapSurvivorSprites") &&
    !sprites.includes("window.TapSurvivorSprites") &&
    sprites.includes("createSpriteSystem") &&
    sprites.includes("createSpriteSheetRenderer") &&
    moduleGameDependencies.includes(
      'import { createSpriteSheetRenderer, createSpriteSystem } from "./sprites.js";'
    ) &&
    moduleGameDependencies.includes("sprites: { createSpriteSystem, createSpriteSheetRenderer }") &&
    gameDependencies.includes("sprites: { createSpriteSystem, createSpriteSheetRenderer }") &&
    !moduleGameDependencies.includes("TapSurvivorSprites") &&
    !gameDependencies.includes("TapSurvivorSprites") &&
    spriteSheetRenderer.includes("Script-order compatibility shim") &&
    !spriteSheetRenderer.includes("globalThis") &&
    !spriteSheetRenderer.includes("function createSpriteSheetRenderer")
);
check(
  "effects and upgrade content are explicitly dependency-injected without classic publishers",
  !effects.includes("globalThis.TapSurvivorEffects =") &&
    !upgrades.includes("globalThis.TapSurvivorUpgrades =") &&
    gameDependencies.includes("const effects = createEffects();") &&
    gameDependencies.includes("const upgrades = { createUpgradeContent };") &&
    gameDependencies.includes("      upgrades,") &&
    game.includes("effects,") &&
    game.includes("upgrades: upgradeContent"),
);
check(
  "enemy and boss sprite-sheet renderer is wired through the source-owned sprite factories",
  nativeSprites.includes("export function createSpriteSheetRenderer") &&
    game.includes("createSpriteSheetRenderer") &&
    renderEnemies.includes("spriteSheetRenderer")
);
check(
  "shared asset resolver is explicitly dependency-injected without a classic publisher",
  nativeAssets.includes("function createAssetResolver") &&
    !assets.includes("globalThis.TapSurvivorAssets =") &&
    assets.includes("// Retired global: TapSurvivorAssets.") &&
    moduleGameDependencies.includes('import { createAssetResolver } from "./assets.js"') &&
    moduleGameDependencies.includes("createAssetResolver(assetContent)") &&
    !gameDependencies.includes("TapSurvivorAssets") &&
    game.includes("assets,") &&
    levelUp.includes("assets?.createAssetResolver?.(content)") &&
    levelUp.includes("content?.assets?.sprites?.ui?.quest") &&
    !assets.includes("globalThis.TapSurvivorContent") &&
    !levelUp.includes("globalThis.TapSurvivorAssets") &&
    !levelUp.includes("globalThis.TapSurvivorContent") &&
    shellUi.includes("assets?.createAssetResolver?.(content)") &&
    !shellUi.includes("globalThis.TapSurvivorAssets"),
);
check(
  "shared audio helper is source-owned and globally retired",
  nativeAudioAdapter.includes("export function createModuleRuntimeAudioAdapter") &&
    audio.includes(
      "// Retired global: TapSurvivorAudio. Exports are supplied through the game dependency bag."
    ) &&
    !audio.includes("globalThis.TapSurvivorAudio") &&
    moduleGameDependencies.includes('import { createModuleRuntimeAudioAdapter } from "./module-runtime-audio-adapter.js"') &&
    gameDependencies.includes("createModuleRuntimeAudioAdapter") &&
    !gameDependencies.includes("TapSurvivorAudio") &&
    !runtimeEntry.includes("TapSurvivorAudio") &&
    game.includes("audioDependencies.createAudioSystem({ sfxDefs })") &&
    audio.includes("setMuted")
);
check("sprite drawing caches rasterized sizes", sprites.includes("spriteCache") && sprites.includes("rasterizedSprite") && sprites.includes("OffscreenCanvas"));
check("sprite cache trims transparent padding", sprites.includes("trimmedSpriteBounds") && sprites.includes("getImageData") && sprites.includes("spriteBounds"));
check("sprite atlases support animated frames", sprites.includes("currentFrameIndex") && sprites.includes("transparentColor") && sprites.includes("spriteSourceBounds"));
check("enemy sprites draw larger than hit radius", renderEnemies.includes("spriteSize") && renderEnemies.includes("Math.max(34") && renderEnemies.includes("Math.max(92"));
check(
  "shared content registry exists",
  contentRegistry.includes("function createContentRegistry") &&
    gameDependencies.includes("contentRegistry: { createContentRegistry }") &&
    game.includes("contentRegistry.createContentRegistry") &&
    !contentRegistry.includes("globalThis.TapSurvivorContentRegistry") &&
    !gameDependencies.includes("TapSurvivorContentRegistry"),
);
check(
  "shared progression helper is explicitly dependency-injected without a classic publisher",
  progression.includes("function createProgressionSystem") &&
    !progression.includes("globalThis.TapSurvivorProgression =") &&
    gameDependencies.includes("progression: { createProgressionSystem }") &&
    game.includes("progression.createProgressionSystem")
);
check(
  "shared HUD renderer is source-owned with retired publisher provenance and direct dependency-bag injection",
  nativeRenderHud.includes('import { createSkillRailRenderer } from "./render-skill-rail.js"') &&
    nativeRenderHud.includes("export function createHudRenderer") &&
    !nativeRenderHud.includes("TapSurvivorRenderHud") &&
    !nativeRenderHud.includes("globalThis") &&
    renderHud.includes("// GENERATED FILE.") &&
    renderHud.includes(
      "// Retired global: TapSurvivorRenderHud. Exports are supplied through the game dependency bag."
    ) &&
    !renderHud.includes("globalThis.TapSurvivorRenderHud") &&
    !renderSkillRail.includes("globalThis.TapSurvivorRenderSkillRail") &&
    renderSkillRail.includes(
      "// Retired global: TapSurvivorRenderSkillRail. Exports are supplied through the game dependency bag."
    ) &&
    moduleGameDependencies.includes('import { createHudRenderer } from "./render-hud.js"') &&
    moduleGameDependencies.includes("renderHud: { createHudRenderer }") &&
    !moduleGameDependencies.includes("TapSurvivorRenderHud") &&
    gameDependencies.includes("renderHud: { createHudRenderer }") &&
    !gameDependencies.includes("TapSurvivorRenderHud") &&
    moduleGameDependencies.includes("renderSkillRail: { createSkillRailRenderer }") &&
    gameDependencies.includes("renderSkillRail: { createSkillRailRenderer }") &&
    rendering.includes("createHudRenderer") &&
    !rendering.includes("globalThis.TapSurvivorRenderHud"),
);
check(
  "shared enemy renderer is source-owned, globally retired, and direct dependency-injected",
  nativeRenderEnemies.includes("export function createEnemyRenderer") &&
    nativeRenderEnemies.includes("MODULE_NATIVE_RENDER_ENEMIES_SLOTS") &&
    nativeRenderEnemies.includes("MODULE_NATIVE_RENDER_ENEMIES_PROOF_SLOTS") &&
    !nativeRenderEnemies.includes("TapSurvivorRenderEnemies") &&
    !nativeRenderEnemies.includes("globalThis") &&
    renderEnemies.includes("// GENERATED FILE.") &&
    renderEnemies.includes(
      "// Retired global: TapSurvivorRenderEnemies. Exports are supplied through the game dependency bag."
    ) &&
    !renderEnemies.includes("globalThis.TapSurvivorRenderEnemies") &&
    renderEnemies.includes("createEnemyRenderer") &&
    moduleGameDependencies.includes('import { createEnemyRenderer } from "./render-enemies.js"') &&
    moduleGameDependencies.includes("renderEnemies: { createEnemyRenderer }") &&
    !moduleGameDependencies.includes("TapSurvivorRenderEnemies") &&
    gameDependencies.includes("renderEnemies: { createEnemyRenderer }") &&
    !gameDependencies.includes("TapSurvivorRenderEnemies") &&
    rendering.includes("createEnemyRenderer") &&
    !rendering.includes("globalThis.TapSurvivorRenderEnemies"),
);
check(
  "rendering factory is source-owned, globally retired, and direct dependency-injected",
  nativeRendering.includes("export function createRenderer") &&
    !nativeRendering.includes("TapSurvivorRendering") &&
    !nativeRendering.includes("globalThis") &&
    rendering.includes("// GENERATED FILE.") &&
    rendering.includes("// Source: src/modules/rendering.js") &&
    rendering.includes(
      "// Retired global: TapSurvivorRendering. Exports are supplied through the game dependency bag."
    ) &&
    !rendering.includes("globalThis.TapSurvivorRendering") &&
    rendering.includes("function createRenderer") &&
    moduleGameDependencies.includes('import { createRenderer } from "./rendering.js"') &&
    moduleGameDependencies.includes("rendering: { createRenderer }") &&
    !moduleGameDependencies.includes("TapSurvivorRendering") &&
    gameDependencies.includes("rendering: { createRenderer }") &&
    !gameDependencies.includes("TapSurvivorRendering"),
);
check(
  "shared UI helpers are explicitly dependency-injected without classic publishers",
  ui.includes("function createUi") &&
    uiProgression.includes("function createUiProgressionRenderer") &&
    !ui.includes("globalThis.TapSurvivorUi =") &&
    !uiProgression.includes("globalThis.TapSurvivorUiProgression =") &&
    moduleGameDependencies.includes("createUi: (options = {})") &&
    moduleGameDependencies.includes("createUiRenderer: (options = {})") &&
    moduleGameDependencies.includes("createUiProgressionRenderer: (options = {})") &&
    game.includes("uiDependencies.createUiRenderer")
);
check(
  "shared run UI helper exists",
  runUi.includes("createRunUi") && gameDependencies.includes("createRunUi"),
);
check(
  "shared level-up helper is explicitly dependency-injected without a classic publisher",
  nativeLevelUp.includes("function createLevelUpSystem") &&
    levelUp.includes("levelUpChoices") &&
    levelUpChoices.includes("function choiceId") &&
    !levelUp.includes("globalThis.TapSurvivorLevelUp =") &&
    levelUp.includes("// Retired global: TapSurvivorLevelUp.") &&
    moduleGameDependencies.includes('import { createLevelUpSystem } from "./level-up.js"') &&
    !gameDependencies.includes("TapSurvivorLevelUp") &&
    gameDependencies.includes("levelUpChoices: { choiceId, shopFocusBonus, shuffleChoices, weightedChoices }") &&
    game.includes("levelUpChoices,") &&
    !levelUpChoices.includes("globalThis.TapSurvivorLevelUpChoices") &&
    !levelUp.includes("globalThis.TapSurvivorLevelUpChoices") &&
    !gameDependencies.includes("TapSurvivorLevelUpChoices"),
);
check(
  "shared input helper is source-derived and explicitly injected",
  nativeInput.includes("export function setTargetFromEvent") &&
    nativeInput.includes("export function bindMovementInput") &&
    !nativeInput.includes("globalThis") &&
    input.includes("// Retired global: TapSurvivorInput.") &&
    !input.includes("globalThis.TapSurvivorInput") &&
    moduleGameDependencies.includes('import { bindMovementInput } from "./input.js"') &&
    moduleGameDependencies.includes("input: { bindMovementInput }") &&
    !moduleGameDependencies.includes("TapSurvivorInput") &&
    !gameDependencies.includes("TapSurvivorInput") &&
    !runtimeEntry.includes("TapSurvivorInput") &&
    gameDependencies.includes("bindMovementInput") &&
    gameRuntime.includes("bindMovementInput") &&
    !gameRuntime.includes("globalThis.TapSurvivorInput") &&
    browserDependencyBag.includes('import { bindMovementInput } from "../modules/input.js"') &&
    browserDependencyBag.includes("return bindMovementInput({ canvas: targetCanvas, getGame });"),
);
check(
  "combat, pickup, and relic helpers are native-injected without classic publishers",
  !combat.includes("globalThis.TapSurvivorCombat") &&
    !pickups.includes("globalThis.TapSurvivorPickups") &&
    !relics.includes("globalThis.TapSurvivorRelics") &&
    moduleGameDependencies.includes('import { createCombatSystem } from "./combat.js"') &&
    moduleGameDependencies.includes('import { createPickupSystem } from "./pickups.js"') &&
    moduleGameDependencies.includes('import { createRelicSystem } from "./relics.js"') &&
    moduleGameDependencies.includes("combat: { createCombatSystem }") &&
    moduleGameDependencies.includes("pickups: { createPickupSystem }") &&
    moduleGameDependencies.includes("relics: { createRelicSystem }") &&
    !gameDependencies.includes("TapSurvivorCombat") &&
    !gameDependencies.includes("TapSurvivorPickups") &&
    !gameDependencies.includes("TapSurvivorRelics") &&
    gameDependencies.includes("combat: { createCombatSystem }") &&
    gameDependencies.includes("pickups: { createPickupSystem }") &&
    gameDependencies.includes("relics: { createRelicSystem }") &&
    game.includes("combat,") &&
    game.includes("pickups,") &&
    game.includes("relics,")
);
check(
  "shared shop helper is explicitly wired without the retired global",
  shop.includes("createShopSystem") &&
    shop.includes("shopPricing") &&
    shopPricing.includes("function createShopPricing") &&
    gameDependencies.includes("createShopSystem") &&
    gameDependencies.includes("shopPricing: { createShopPricing }") &&
    game.includes("shopPricing,") &&
    !shopPricing.includes("globalThis.TapSurvivorShopPricing") &&
    !gameDependencies.includes("TapSurvivorShopPricing") &&
    !shop.includes("globalThis.TapSurvivorShop") &&
    !gameDependencies.includes("globalThis.TapSurvivorShop"),
);
check(
  "shared run state helper exists",
  runState.includes("createRunStateSystem") && gameDependencies.includes("createRunStateSystem"),
);
check(
  "shared run update helper is explicitly dependency-injected without a classic publisher",
  runUpdate.includes("function createRunUpdater") &&
    !runUpdate.includes("globalThis.TapSurvivorRunUpdate =") &&
    gameDependencies.includes("runUpdate: { createRunUpdater }") &&
    game.includes("runUpdate.createRunUpdater"),
);
check(
  "shared weapon helpers exist",
  weaponProjectiles.includes("function createWeaponProjectileSystem") &&
    !weaponProjectiles.includes("globalThis.TapSurvivorWeaponProjectiles =") &&
    weaponTargeting.includes("function nearestEnemy") &&
    weaponFire.includes("function createWeaponFireSystem") &&
    !weaponFire.includes("globalThis.TapSurvivorWeaponFire =") &&
    gameDependencies.includes("weaponBehaviors: { createWeaponBehaviorSystem }") &&
    gameDependencies.includes("weaponFire: { createWeaponFireSystem }") &&
    gameDependencies.includes("weaponProjectiles: { createWeaponProjectileSystem, rotateVector }") &&
    gameDependencies.includes("weaponTargeting: { nearestEnemy }") &&
    game.includes("weaponBehaviors,") &&
    game.includes("weaponFire,") &&
    game.includes("weaponTargeting,") &&
    combat.includes("weaponFire.createWeaponFireSystem") &&
    combat.includes("weaponBehaviors,") &&
    weaponFire.includes("weaponBehaviors.createWeaponBehaviorSystem") &&
    !weaponTargeting.includes("globalThis.TapSurvivorWeaponTargeting") &&
    !gameDependencies.includes("TapSurvivorWeaponTargeting") &&
    !weaponFire.includes("globalThis.TapSurvivorWeaponBehaviors") &&
    !combat.includes("globalThis.TapSurvivorWeaponFire"),
);
check(
  "enemy helpers are native-injected without classic publishers",
  !enemies.includes("TapSurvivorEnemies") &&
    !enemySpawning.includes("TapSurvivorEnemySpawning") &&
    !enemyBehaviors.includes("TapSurvivorEnemyBehaviors") &&
    moduleGameDependencies.includes('import { createEnemySystem } from "./enemies.js"') &&
    moduleGameDependencies.includes(
      'import { createEnemyBehaviorSystem } from "./enemy-behaviors.js"'
    ) &&
    moduleGameDependencies.includes(
      'import { createEnemySpawnSystem } from "./enemy-spawning.js"'
    ) &&
    moduleGameDependencies.includes("enemies: { createEnemySystem }") &&
    moduleGameDependencies.includes("enemyBehaviors: { createEnemyBehaviorSystem }") &&
    moduleGameDependencies.includes("enemySpawning: { createEnemySpawnSystem }") &&
    !gameDependencies.includes("TapSurvivorEnemies") &&
    !gameDependencies.includes("TapSurvivorEnemyBehaviors") &&
    !gameDependencies.includes("TapSurvivorEnemySpawning") &&
    gameDependencies.includes("enemies: { createEnemySystem }") &&
    gameDependencies.includes("enemyBehaviors: { createEnemyBehaviorSystem }") &&
    gameDependencies.includes("enemySpawning: { createEnemySpawnSystem }") &&
    game.includes("enemies,") &&
    game.includes("enemyBehaviors,") &&
    game.includes("enemySpawning,") &&
    combat.includes("enemies.createEnemySystem") &&
    combat.includes("enemyBehaviors,") &&
    combat.includes("enemySpawning,") &&
    !combat.includes("globalThis.TapSurvivorEnemies"),
);
check(
  "enemy behavior helper remains factory-wired",
  !enemyBehaviors.includes("TapSurvivorEnemyBehaviors") &&
    enemies.includes("enemyBehaviors.createEnemyBehaviorSystem") &&
    !enemies.includes("globalThis.TapSurvivorEnemyBehaviors"),
);
check(
  "shared balance helper exists",
  balance.includes("function floorDifficulty") &&
    gameDependencies.includes("balance: { floorDifficulty }") &&
    game.includes("balance,") &&
    enemies.includes("balance.floorDifficulty") &&
    !balance.includes("globalThis.TapSurvivorBalance") &&
    !/\bTapSurvivorBalance\b/.test(gameDependencies) &&
    !enemies.includes("globalThis.TapSurvivorBalance"),
);
check(
  "shared debug helper is native and publisher-free",
  nativeDebug.includes("export function createDebugSystem") &&
    debugBridge.includes("// Retired global: TapSurvivorDebug. Exports are supplied through the game dependency bag.") &&
    !debugBridge.includes("globalThis.TapSurvivorDebug") &&
    moduleGameDependencies.includes('import { createDebugSystem } from "./debug.js";') &&
    moduleGameDependencies.includes("debug: { createDebugSystem }") &&
    !moduleGameDependencies.includes("TapSurvivorDebug") &&
    !gameDependencies.includes("TapSurvivorDebug")
);
check(
  "shared shell UI helper uses a source-owned provider without a publisher",
  shellUi.includes(
    "// Retired global: TapSurvivorShellUi. Exports are supplied through the game dependency bag."
  ) &&
    !shellUi.includes("globalThis.TapSurvivorShellUi") &&
    moduleGameDependencies.includes(
      'import { createShellUiController } from "./shell-ui-classic-adapter.js";'
    ) &&
    moduleGameDependencies.includes("const shellUi = {") &&
    moduleGameDependencies.includes("createShellUiController(options = {})") &&
    gameDependencies.includes("const shellUi = {") &&
    gameDependencies.includes("createShellUiController(options = {})") &&
    !gameDependencies.includes("TapSurvivorShellUi") &&
    !productionModuleEntrypoint.includes("TapSurvivorShellUi") &&
    shellRelicUi.includes("function createShellRelicUi") &&
    !shellRelicUi.includes("globalThis.TapSurvivorShellRelicUi =") &&
    gameDependencies.includes("function createShellRelicUiDependency") &&
    game.includes("shellRelicUi,"),
);

check("styles include mobile layout", styles.includes("@media (max-width: 920px)"));
check("pipeline documents test URL", pipeline.includes("https://johnkennedy-ui.github.io/tap-survivor-MVP/"));
check("pipeline documents Android flow", pipeline.includes("Android Test Steps"));
check("game plan documents MVP loop", plan.includes("Laser") && plan.includes("Quest Point"));
check("agent context pack exists", agentContext.includes("Where To Add Content") && extensionGuide.includes("Add A Weapon") && taskTemplate.includes("Stop Condition"));
check("root agent instructions load docs first", agentInstructions.includes("docs/AGENT_CODEBASE_CONTEXT.md") && agentInstructions.includes("docs/CONTENT_EXTENSION_GUIDE.md"));

check("workflow publishes gh-pages", workflow.includes("git push --force origin gh-pages"));
check("workflow installs dependencies", workflow.includes("actions/setup-node@v4") && workflow.includes("npm ci"));
check("workflow runs agent check", workflow.includes("npm run agent:check"));
check("workflow builds shared www runtime", workflow.includes("npm run build:web"));
check("workflow checks runtime parity", workflow.includes("npm run check:runtime-parity"));
check("workflow publishes only www", workflow.includes("cp -R www/.") && !workflow.includes("cp -R assets content docs src scripts"));
check("cache keys auto-bump before prepush", pkg.includes('"cache:bump"') && agentPrepush.includes("Cache Key Bump") && cacheBump.includes("content/tap-survivor-content.json") && cacheBump.includes("auto-"));
check(
  "quest chain helper can link follow-ups",
  pkg.includes('"smoke:content-tools"') &&
    addContent.includes("--after previous_id") &&
    addContent.includes("linkQuestAfter") &&
    contentTools.includes("linkQuestAfter") &&
    contentTools.includes('from "./content/content-schema.mjs"') &&
    contentSchemaTools.includes("function linkQuestAfter"),
);
check("sound effect wiring helper exists", pkg.includes('"sfx:add"') && addSfx.includes("run-upgrade") && addSfx.includes("content.assets.sfx[bucket]") && agentCheck.includes("scripts/add-sfx.mjs"));
check("focused agent maintenance tooling exists", pkg.includes('"agent:finish"') && pkg.includes('"content:check"') && pkg.includes('"verify:assets"') && agentCheck.includes("focusedChecks") && agentPrepush.includes("--full"));
check("asset and audio regression smokes exist", pkg.includes('"smoke:assets"') && pkg.includes('"smoke:spritesheets"') && pkg.includes('"smoke:audio"') && smokeAssetResolver.includes("weapon choice uses clean icon source") && smokeAudioScaling.includes("fast weapon playback rate is applied") && agentCheck.includes("smoke:assets") && agentCheck.includes("smoke:spritesheets") && agentCheck.includes("smoke:audio"));
check("sprite sheet extraction helper exists", pkg.includes('"sprites:extract"') && extractSprites.includes("autoDetectSprites") && extractSprites.includes("trimBounds") && extractSprites.includes("writePng"));
check("sprite extraction smoke exists", pkg.includes('"smoke:sprite-extract"') && smokeExtractSprites.includes("auto extraction writes two sprites") && agentCheck.includes("smoke:sprite-extract"));

const failed = checks.filter((item) => !item.pass);

console.log("# Tap Survivor MVP Verification");
for (const item of checks) {
  console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}${item.detail ? ` - ${item.detail}` : ""}`);
}

if (failed.length) {
  console.error(`\n${failed.length} check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} checks passed.`);
