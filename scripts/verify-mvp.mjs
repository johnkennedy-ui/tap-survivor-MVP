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
const styles = readRequired("src/styles.css");
const contentSource = readRequired("content/tap-survivor-content.json");
const generatedContent = readRequired("src/content.generated.js");
const math = readRequired("src/math.js");
const sprites = readRequired("src/sprites.js");
const quests = readRequired("src/quests.js");
const save = readRequired("src/save.js");
const upgrades = readRequired("src/upgrades.js");
const contentRegistry = readRequired("src/content-registry.js");
const progression = readRequired("src/progression.js");
const rendering = readRequired("src/rendering.js");
const balance = readRequired("src/balance.js");
const combat = readRequired("src/combat.js");
const ui = readRequired("src/ui.js");
const runUi = readRequired("src/run-ui.js");
const levelUp = readRequired("src/level-up.js");
const input = readRequired("src/input.js");
const pickups = readRequired("src/pickups.js");
const shop = readRequired("src/shop.js");
const relics = readRequired("src/relics.js");
const runState = readRequired("src/run-state.js");
const runUpdate = readRequired("src/run-update.js");
const debug = readRequired("src/debug.js");
const shellUi = readRequired("src/shell-ui.js");
const plan = readRequired("MVP_GAME_PLAN.md");
const pipeline = readRequired("PHONE_TEST_PIPELINE.md");
const agentContext = readRequired("docs/AGENT_CODEBASE_CONTEXT.md");
const extensionGuide = readRequired("docs/CONTENT_EXTENSION_GUIDE.md");
const taskTemplate = readRequired("docs/AGENT_TASK_TEMPLATE.md");
const agentInstructions = readRequired("AGENTS.md");
const workflow = readRequired(".github/workflows/tap-survivor-pages.yml");
const content = contentSource ? JSON.parse(contentSource) : {};
const contentText = `${contentSource}\n${generatedContent}`;
const runtime = `${game}\n${combat}\n${runState}\n${runUpdate}`;
const metaUpgradeIds = new Set((content.metaUpgrades || []).map((upgrade) => upgrade.id));
const runUpgradeIds = new Set((content.runUpgrades || []).map((upgrade) => upgrade.id));

check("index loads stylesheet", /href="src\/styles\.css(\?[^"]+)?"/.test(index));
check("index loads generated content", /src="src\/content\.generated\.js(\?[^"]+)?"/.test(index));
check("index loads shared math utilities", /src="src\/math\.js(\?[^"]+)?"/.test(index));
check("index loads sprite utilities", /src="src\/sprites\.js(\?[^"]+)?"/.test(index));
check("index loads quest utilities", /src="src\/quests\.js(\?[^"]+)?"/.test(index));
check("index loads save utilities", /src="src\/save\.js(\?[^"]+)?"/.test(index));
check("index loads upgrade definitions", /src="src\/upgrades\.js(\?[^"]+)?"/.test(index));
check("index loads content registry", /src="src\/content-registry\.js(\?[^"]+)?"/.test(index));
check("index loads progression module", /src="src\/progression\.js(\?[^"]+)?"/.test(index));
check("index loads rendering module", /src="src\/rendering\.js(\?[^"]+)?"/.test(index));
check("index loads balance module", /src="src\/balance\.js(\?[^"]+)?"/.test(index));
check("index loads combat module", /src="src\/combat\.js(\?[^"]+)?"/.test(index));
check("index loads UI module", /src="src\/ui\.js(\?[^"]+)?"/.test(index));
check("index loads run UI module", /src="src\/run-ui\.js(\?[^"]+)?"/.test(index));
check("index loads level-up module", /src="src\/level-up\.js(\?[^"]+)?"/.test(index));
check("index loads input module", /src="src\/input\.js(\?[^"]+)?"/.test(index));
check("index loads shell UI module", /src="src\/shell-ui\.js(\?[^"]+)?"/.test(index));
check("index loads pickup module", /src="src\/pickups\.js(\?[^"]+)?"/.test(index));
check("index loads shop module", /src="src\/shop\.js(\?[^"]+)?"/.test(index));
check("index loads relic module", /src="src\/relics\.js(\?[^"]+)?"/.test(index));
check("index loads run state module", /src="src\/run-state\.js(\?[^"]+)?"/.test(index));
check("index loads run update module", /src="src\/run-update\.js(\?[^"]+)?"/.test(index));
check("index loads debug module", /src="src\/debug\.js(\?[^"]+)?"/.test(index));
check("index loads game script", /src="src\/game\.js(\?[^"]+)?"/.test(index));
check("canvas exists", /<canvas[^>]+id="game"/.test(index));
check("canvas keeps 16:9 resolution", styles.includes("aspect-ratio: 16 / 9") && styles.includes("height: auto"));
check("speed controls exist", ["data-speed=\"1\"", "data-speed=\"2\"", "data-speed=\"5\""].every((id) => index.includes(id)) && styles.includes(".speed-controls"));
check("mobile viewport exists", index.includes('name="viewport"'));

check("tap/click target handler exists", input.includes("setTargetFromEvent"));
check("mouse movement input exists", input.includes('addEventListener("mousedown"'));
check("touch movement input exists", input.includes('addEventListener("touchstart"'));
check("enemy chase loop exists", runtime.includes("updateEnemies") && runtime.includes("enemy.speed"));
check("content source exists", contentSource.includes('"schemaVersion"') && generatedContent.includes("TapSurvivorContent"));
check("Kenney asset manifest exists", content.assets?.sources?.some((source) => source.id === "kenney_desert_shooter_pack" && source.commercialUse === true && source.attributionRequired === false));
check("Kenney sprites are wired", ["player", "drifter", "skitter", "bulwark", "spark_bolt", "prism_beam"].every((id) => contentText.includes(id)) && sprites.includes("drawSprite"));
check("generated tower background asset exists", content.assets?.sources?.some((source) => source.id === "generated_tower_floor" && source.commercialUse === true && source.attributionRequired === false) && content.assets?.sprites?.backgrounds?.tower_floor);
check("generated tower sprite set exists", content.assets?.sources?.some((source) => source.id === "generated_tower_sprites" && source.commercialUse === true && source.attributionRequired === false) && content.assets?.sprites?.player?.includes("player-tower-mage") && content.assets?.sprites?.enemies?.boss?.includes("tower-warden"));
check("tower background renders", sprites.includes("background:") && sprites.includes("drawImage") && rendering.includes('background:tower_floor') && game.includes("drawImage: spriteSystem.drawImage"));
check("three enemy types exist", (content.enemyTypes || []).filter((enemy) => ["drifter", "skitter", "bulwark"].includes(enemy.id)).length === 3);
check("default character registry entry exists", (content.characters || []).some((character) => character.id === "character_default" && character.spriteId === "player"));
check("enemy types unlock every 30 seconds", runtime.includes("Math.floor(game.elapsed / 30)") && runtime.includes("availableEnemyTypes"));
check("enemy spawns are doubled and patterned", runtime.includes("spawnPatternPositions(2)") && runtime.includes("spawnEnemy(type, position)"));
check("speed multiplier scales game loop", game.includes("let gameSpeed = 1") && game.includes("runUpdater.update(dt * gameSpeed)") && game.includes("setGameSpeed"));
check("auto attack loop exists", runtime.includes("updateWeapons") && runtime.includes("fireWeapon"));
check("XP drops exist", runState.includes("xpDrops") && runUpdate.includes("collectXp"));
check("coin and heart drops exist", runState.includes("lootDrops") && pickups.includes("spawnLootDrops") && pickups.includes('type: "coin"') && pickups.includes('type: "heart"'));
check("pickup attraction scales with speed", pickups.includes("pullDropTowardPlayer") && runUpdate.includes("pickupSystem.updateXpDrops(dt)") && runUpdate.includes("pickupSystem.updateLootDrops(dt)") && pickups.includes("pullDropTowardPlayer(drop, player, 480, dt)") && pickups.includes("pullDropTowardPlayer(drop, player, 540, dt)"));
check("coins persist in save", save.includes("coins: 0") && pickups.includes("save.coins +=") && pickups.includes("persist()"));
check("heart drops heal 20 percent max HP", pickups.includes('drop.type === "heart"') && pickups.includes("game.player.maxHp * drop.healPercent") && pickups.includes("healPercent: 0.2"));
check("player HP bar renders above sprite", rendering.includes("drawPlayerHpBar") && rendering.includes("p.y - p.radius - 16"));
check("level-up choices exist", runUpdate.includes("showLevelUp") && levelUp.includes("createLevelUpSystem") && contentText.includes("Prism Beam"));
check("Laser weapon exists", runtime.includes("fireBeam") && contentText.includes("prism_beam"));
check("10 new weapons exist", ["frost_orb", "flame_wave", "saw_drone", "void_mine", "chain_spark", "moon_glaive", "meteor_pin", "acid_pool", "shield_pulse", "nova_burst"].every((id) => content.weapons?.[id]));
check("Laser use quest exists", contentText.includes("use_laser_run"));
check("Quest Points are awarded", contentText.includes("rewardQp") && quests.includes("save.questPoints += reward"));
check("more quest types exist", ["first_blood", "gatherer", "survivor_60", "crowd_control", "rapid_growth", "heavy_hits", "boss_hunter"].every((id) => content.quests?.[id]));
check("extended milestone quests exist", ["survivor_180", "survivor_300", "exterminator", "reaper", "power_climb", "apex_growth", "damage_dealer", "apocalypse_damage", "gem_hoarder", "gem_flood"].every((id) => content.quests?.[id]));
check("higher-tier milestone quests exist", ["survivor_420", "warlord", "transcendent_growth", "worldbreaker_damage", "gem_storm", "boss_slayer", "boss_reaper"].every((id) => content.quests?.[id]));
check("end-chain milestone quests exist", ["legion_breaker", "limitless_growth", "cataclysm_damage", "gem_typhoon", "boss_legend"].every((id) => content.quests?.[id]));
check("second-tier weapon quests exist", ["spark_bolt_expert", "prism_beam_expert", "frost_orb_expert", "flame_wave_expert", "chain_spark_expert", "void_mine_expert", "acid_pool_expert", "saw_drone_expert", "shield_pulse_expert", "moon_glaive_expert", "meteor_pin_expert", "nova_burst_expert"].every((id) => content.quests?.[id]));
check("higher-tier quests reward more QP", [5, 6, 7, 8].every((reward) => Object.values(content.quests || {}).some((quest) => quest.rewardQp === reward)));
check("quest progress groups feed milestone chains", ["killQuestIds", "damageQuestIds", "survivalQuestIds", "xpQuestIds", "levelQuestIds", "bossQuestIds", "addQuestProgressGroup"].every((id) => runtime.includes(id)));
check("quests can open multiple follow-ups", quests.includes("opensQuests") && quests.includes("questOpenIds"));
check("quest chains can open follow-up quests", quests.includes("opensQuest") && quests.includes("questOpenIds(questDefs[id]).forEach(openQuest)"));
check("weapon quests progress by weapon ID", quests.includes("addQuestProgressForWeapon") && combat.includes("addQuestProgressForWeapon(weaponId, dealt)"));
check("combat stats feed quest progress", runtime.includes("addQuestProgressGroup(killQuestIds, 1)") && runtime.includes("addQuestProgressGroup(xpQuestIds, value)") && runtime.includes("addQuestProgressGroup(damageQuestIds, dealt)"));
check("meta upgrades are content-driven", (content.metaUpgrades || []).length === 7 && upgrades.includes("metaUpgradeDefs"));
check("run upgrades are content-driven", (content.runUpgrades || []).length >= 12 && upgrades.includes("applyRunUpgradeEffects"));
check("meta upgrades are quest-gated", (content.metaUpgrades || []).some((upgrade) => upgrade.requiresQuest === "first_blood") && (content.metaUpgrades || []).some((upgrade) => upgrade.requiresQuest === "boss_hunter"));
check("Laser Damage upgrade exists", upgrades.includes("laser_damage") && upgrades.includes("maxTier: 5"));
check("upgrade tiers are tracked", progression.includes("upgradeTiers") && ui.includes("Buy Tier"));
check("skill tree gates by prerequisite and quest", progression.includes("requiresNode") && progression.includes("requiresQuest") && progression.includes("nodeGateStatus"));
check("completed quests disappear from quest list", ui.includes("activeQuestIds") && !ui.includes("Status: ${complete"));
check("level-up choices are limited to 3 random options", levelUp.includes("shuffleChoices") && levelUp.includes(".slice(0, 3)"));
check("unique weapons are capped", levelUp.includes("maxEquippedWeapons") && levelUp.includes("equippedWeapons.length < maxWeapons") && game.includes("maxEquippedWeapons"));
check("active quest weapons are offered on level-up", levelUp.includes("activeQuestWeaponIds") && levelUp.includes("questWeaponChoices"));
check("new combat upgrade types exist", ["attack_radius", "fire_rate", "flat_damage", "percent_damage"].every((id) => metaUpgradeIds.has(id)));
check("new run upgrade types exist", ["run_attack_radius", "run_fire_rate", "run_flat_damage", "run_percent_damage"].every((id) => runUpgradeIds.has(id)));
check("projectile behavior run upgrades exist", ["run_projectile_pierce", "run_wall_bounce", "run_split_shot", "run_explosive_hit", "run_split_on_hit"].every((id) => runUpgradeIds.has(id)));
check("more attack speed and damage levels exist", content.runUpgrades?.find((upgrade) => upgrade.id === "run_fire_rate")?.maxTier === 8 && content.runUpgrades?.find((upgrade) => upgrade.id === "run_percent_damage")?.maxTier === 8 && content.metaUpgrades?.find((upgrade) => upgrade.id === "fire_rate")?.maxTier === 5 && content.metaUpgrades?.find((upgrade) => upgrade.id === "percent_damage")?.maxTier === 5);
check("weapon damage upgrades have more tiers", upgrades.includes("cost: [1, 2, 3, 4, 5]") && upgrades.includes("maxTier: 5"));
check("projectile behavior hooks exist", ["run_projectile_pierce", "run_wall_bounce", "run_split_shot", "run_explosive_hit", "run_split_on_hit", "spawnProjectileBolt", "splitBoltOnHit", "explodeBolt"].every((token) => combat.includes(token)));
check("level-up choices favor started upgrade families", levelUp.includes("weightedChoices") && levelUp.includes("familyTiers") && levelUp.includes("choice.runUpgradeId"));
check("relic content exists for run skills", (content.relics || []).length >= 24 && (content.runUpgrades || []).every((upgrade) => (content.relics || []).filter((relic) => relic.targetUpgradeId === upgrade.id).length >= 2));
check("relics affect level-up choices", levelUp.includes("selectionWeightBonus") && levelUp.includes("maxTierBonus") && levelUp.includes("equippedRelics") && levelUp.includes("relic_compass"));
check("weapon slot relics exist", (content.relics || []).some((relic) => relic.weaponSlotBonus > 0) && (content.relics || []).some((relic) => relic.weaponSlotBonus < 0 && relic.weaponDamageMultiplier === 2) && relics.includes("getWeaponDamageMultiplier"));
check("coin shop exists", index.includes('id="openShop"') && index.includes('id="shopItems"') && shop.includes("createShopSystem"));
check("shop items are content-driven", (content.shopItems || []).length >= 8 && shop.includes("shopItemDefs"));
check("shop purchases persist", save.includes("shopPurchases") && shop.includes("save.shopPurchases"));
check("shop bonuses affect run starts", game.includes("shopSystem.getShopBonuses") && runState.includes("shopBonuses.speed") && runState.includes("shopBonuses.maxHp"));
check("shop damage bonus affects combat", ["shopBonuses.flatDamage", "shopBonuses.fireRate", "shopBonuses.attackRadius", "shopBonuses.percentDamage"].every((token) => combat.includes(token)) && game.includes("getShopBonuses"));
check("start menu exists", index.includes('id="startMenu"') && index.includes('id="startMenuStartRun"') && shellUi.includes("function showStartMenu"));
check("shop has reliable close controls", index.includes('id="closeShop"') && index.includes('id="closeShopBottom"') && shellUi.includes("function closeShopMenu"));
check("modal boxes scroll", styles.includes(".modal-box") && styles.includes("overflow-y: auto") && styles.includes("overscroll-behavior: contain"));
check("run menu pauses game", index.includes('id="openMenu"') && shellUi.includes("openRunMenu") && shellUi.includes('pauseReason = "menu"'));
check("run menu button toggles menu", shellUi.includes("function toggleRunMenu") && shellUi.includes("ui.openMenu.addEventListener(\"click\", toggleRunMenu)") && index.includes('aria-expanded="false"'));
check("runs can be exited", index.includes('id="exitRun"') && game.includes('endRun("Run exited")'));
check("fullscreen button exists", index.includes('id="fullscreenButton"') && shellUi.includes("function toggleFullscreen") && shellUi.includes("requestFullscreen"));
check("menus have exit crosses", ["closeMenu", "closeLevelUp", "closeEndX"].every((id) => index.includes(`id="${id}"`)) && game.includes("closeLevelUpMenu") && game.includes("closeEndScreen"));
check("follow-up Laser quest opens", contentText.includes("laser_damage_5000"));
check("run lasts 6 minutes before boss", runtime.includes("duration: 360") && runtime.includes("spawnBoss"));
check("boss death advances tower floor", runtime.includes("advanceTowerFloor") && game.includes("function advanceTowerFloor") && runtime.includes("enemy.boss"));
check("tower floor progresses after boss clear", save.includes("towerFloor: 1") && game.includes("save.towerFloor") && runUi.includes("Cleared Floor") && rendering.includes("Tower Floor"));
check("boss clears grant relics", save.includes("unlockedRelics") && save.includes("equippedRelics") && relics.includes("grantRandomRelic") && game.includes("lastFloorClear"));
check("boss kills feed boss quest chain", runtime.includes("addQuestProgressGroup(bossQuestIds, 1)"));
check("boss shockwave special exists", runtime.includes("updateBossSpecials") && rendering.includes("drawBossAttack") && runtime.includes('type: "shockwave"'));
check("weapon attack animations exist", runState.includes("weaponBursts") && combat.includes("addWeaponBurst") && combat.includes("updateWeaponBursts") && rendering.includes("drawWeaponBurst"));
check("first three floors have explicit balance tuning", balance.includes("floorTable") && balance.includes("hp: 0.9") && balance.includes("hp: 1.1") && balance.includes("hp: 1.33") && combat.includes("TapSurvivorBalance") && debug.includes("TapSurvivorBalance"));
check("debug balance overlay exists", index.includes('id="toggleDebug"') && index.includes('id="debugStats"') && debug.includes("createDebugSystem") && game.includes("TapSurvivorDebug"));
check("debug overlay reports balance stats", ["Enemy HP", "Enemy DMG", "Weapon slots", "Weapon damage", "Run upgrades", "Relics"].every((token) => debug.includes(token)));
check("local save exists", game.includes("localStorage") && game.includes("tap-survivor-mvp-save-v2"));
check("shared quest helpers exist", quests.includes("TapSurvivorQuests") && game.includes("TapSurvivorQuests"));
check("shared save helpers exist", save.includes("TapSurvivorSave") && game.includes("TapSurvivorSave"));
check("shared math helpers exist", math.includes("TapSurvivorMath") && game.includes("TapSurvivorMath") && rendering.includes("TapSurvivorMath"));
check("shared sprite helpers exist", sprites.includes("TapSurvivorSprites") && game.includes("TapSurvivorSprites"));
check("shared content registry exists", contentRegistry.includes("TapSurvivorContentRegistry") && game.includes("TapSurvivorContentRegistry"));
check("shared progression helper exists", progression.includes("TapSurvivorProgression") && game.includes("TapSurvivorProgression"));
check("shared UI helper exists", ui.includes("TapSurvivorUi") && game.includes("TapSurvivorUi") && game.includes("createUiRenderer"));
check("shared run UI helper exists", runUi.includes("TapSurvivorRunUi") && game.includes("TapSurvivorRunUi"));
check("shared level-up helper exists", levelUp.includes("TapSurvivorLevelUp") && game.includes("TapSurvivorLevelUp"));
check("shared input helper exists", input.includes("TapSurvivorInput") && game.includes("TapSurvivorInput"));
check("shared pickup helper exists", pickups.includes("TapSurvivorPickups") && game.includes("TapSurvivorPickups"));
check("shared shop helper exists", shop.includes("TapSurvivorShop") && game.includes("TapSurvivorShop"));
check("shared relic helper exists", relics.includes("TapSurvivorRelics") && game.includes("TapSurvivorRelics"));
check("shared run state helper exists", runState.includes("TapSurvivorRunState") && game.includes("TapSurvivorRunState"));
check("shared run update helper exists", runUpdate.includes("TapSurvivorRunUpdate") && game.includes("TapSurvivorRunUpdate"));
check("shared balance helper exists", balance.includes("TapSurvivorBalance") && combat.includes("TapSurvivorBalance") && debug.includes("TapSurvivorBalance"));
check("shared debug helper exists", debug.includes("TapSurvivorDebug") && game.includes("TapSurvivorDebug"));
check("shared shell UI helper exists", shellUi.includes("TapSurvivorShellUi") && game.includes("TapSurvivorShellUi"));

check("styles include mobile layout", styles.includes("@media (max-width: 920px)"));
check("pipeline documents test URL", pipeline.includes("https://johnkennedy-ui.github.io/tap-survivor-MVP/"));
check("pipeline documents Android flow", pipeline.includes("Android Test Steps"));
check("game plan documents MVP loop", plan.includes("Laser") && plan.includes("Quest Point"));
check("agent context pack exists", agentContext.includes("Where To Add Content") && extensionGuide.includes("Add A Weapon") && taskTemplate.includes("Stop Condition"));
check("root agent instructions load docs first", agentInstructions.includes("docs/AGENT_CODEBASE_CONTEXT.md") && agentInstructions.includes("docs/CONTENT_EXTENSION_GUIDE.md"));

check("workflow publishes gh-pages", workflow.includes("git push --force origin gh-pages"));
check("workflow publishes content and assets", workflow.includes("assets content") && workflow.includes("src scripts"));
check("workflow publishes agent docs", workflow.includes("AGENTS.md") && workflow.includes("docs"));
check("workflow writes nojekyll marker", workflow.includes("touch .nojekyll"));
check("workflow runs reusable MVP test", workflow.includes("node scripts/verify-mvp.mjs"));

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
