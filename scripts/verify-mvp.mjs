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
const upgrades = readRequired("src/upgrades.js");
const rendering = readRequired("src/rendering.js");
const combat = readRequired("src/combat.js");
const plan = readRequired("MVP_GAME_PLAN.md");
const pipeline = readRequired("PHONE_TEST_PIPELINE.md");
const agentContext = readRequired("docs/AGENT_CODEBASE_CONTEXT.md");
const extensionGuide = readRequired("docs/CONTENT_EXTENSION_GUIDE.md");
const taskTemplate = readRequired("docs/AGENT_TASK_TEMPLATE.md");
const agentInstructions = readRequired("AGENTS.md");
const workflow = readRequired(".github/workflows/tap-survivor-pages.yml");
const content = contentSource ? JSON.parse(contentSource) : {};
const contentText = `${contentSource}\n${generatedContent}`;
const runtime = `${game}\n${combat}`;

check("index loads stylesheet", /href="src\/styles\.css(\?[^"]+)?"/.test(index));
check("index loads generated content", /src="src\/content\.generated\.js(\?[^"]+)?"/.test(index));
check("index loads upgrade definitions", /src="src\/upgrades\.js(\?[^"]+)?"/.test(index));
check("index loads rendering module", /src="src\/rendering\.js(\?[^"]+)?"/.test(index));
check("index loads combat module", /src="src\/combat\.js(\?[^"]+)?"/.test(index));
check("index loads game script", /src="src\/game\.js(\?[^"]+)?"/.test(index));
check("canvas exists", /<canvas[^>]+id="game"/.test(index));
check("canvas keeps 16:9 resolution", styles.includes("aspect-ratio: 16 / 9") && styles.includes("height: auto"));
check("speed controls exist", ["data-speed=\"1\"", "data-speed=\"2\"", "data-speed=\"5\""].every((id) => index.includes(id)) && styles.includes(".speed-controls"));
check("mobile viewport exists", index.includes('name="viewport"'));

check("tap/click target handler exists", game.includes("setTargetFromEvent"));
check("mouse movement input exists", game.includes('addEventListener("mousedown"'));
check("touch movement input exists", game.includes('addEventListener("touchstart"'));
check("enemy chase loop exists", runtime.includes("updateEnemies") && runtime.includes("enemy.speed"));
check("content source exists", contentSource.includes('"schemaVersion"') && generatedContent.includes("TapSurvivorContent"));
check("Kenney asset manifest exists", content.assets?.sources?.some((source) => source.id === "kenney_desert_shooter_pack" && source.commercialUse === true && source.attributionRequired === false));
check("Kenney sprites are wired", ["player", "drifter", "skitter", "bulwark", "spark_bolt", "prism_beam"].every((id) => contentText.includes(id)) && game.includes("drawSprite"));
check("three enemy types exist", (content.enemyTypes || []).filter((enemy) => ["drifter", "skitter", "bulwark"].includes(enemy.id)).length === 3);
check("default character registry entry exists", (content.characters || []).some((character) => character.id === "character_default" && character.spriteId === "player"));
check("enemy types unlock every 30 seconds", runtime.includes("Math.floor(game.elapsed / 30)") && runtime.includes("availableEnemyTypes"));
check("enemy spawns are doubled and patterned", runtime.includes("spawnPatternPositions(2)") && runtime.includes("spawnEnemy(type, position)"));
check("speed multiplier scales game loop", game.includes("let gameSpeed = 1") && game.includes("update(dt * gameSpeed)") && game.includes("setGameSpeed"));
check("auto attack loop exists", runtime.includes("updateWeapons") && runtime.includes("fireWeapon"));
check("XP drops exist", game.includes("xpDrops") && game.includes("collectXp"));
check("coin and heart drops exist", game.includes("lootDrops") && game.includes("spawnLootDrops") && game.includes('type: "coin"') && game.includes('type: "heart"'));
check("pickup attraction scales with speed", game.includes("pullDropTowardPlayer") && game.includes("updateXpDrops(dt)") && game.includes("updateLootDrops(dt)") && game.includes("pullDropTowardPlayer(drop, p, 480, dt)") && game.includes("pullDropTowardPlayer(drop, p, 540, dt)"));
check("coins persist in save", game.includes("coins: 0") && game.includes("save.coins +=") && game.includes("persist()"));
check("heart drops heal player", game.includes('drop.type === "heart"') && game.includes("game.player.hp = Math.min(game.player.maxHp"));
check("player HP bar renders above sprite", rendering.includes("drawPlayerHpBar") && rendering.includes("p.y - p.radius - 16"));
check("level-up choices exist", game.includes("showLevelUp") && contentText.includes("Prism Beam"));
check("Laser weapon exists", runtime.includes("fireBeam") && contentText.includes("prism_beam"));
check("10 new weapons exist", ["frost_orb", "flame_wave", "saw_drone", "void_mine", "chain_spark", "moon_glaive", "meteor_pin", "acid_pool", "shield_pulse", "nova_burst"].every((id) => content.weapons?.[id]));
check("Laser use quest exists", contentText.includes("use_laser_run"));
check("Quest Points are awarded", contentText.includes("rewardQp") && game.includes("save.questPoints += reward"));
check("more quest types exist", ["first_blood", "gatherer", "survivor_60", "crowd_control", "rapid_growth", "heavy_hits", "boss_hunter"].every((id) => content.quests?.[id]));
check("extended milestone quests exist", ["survivor_180", "survivor_300", "exterminator", "reaper", "power_climb", "apex_growth", "damage_dealer", "apocalypse_damage", "gem_hoarder", "gem_flood"].every((id) => content.quests?.[id]));
check("higher-tier milestone quests exist", ["survivor_420", "warlord", "transcendent_growth", "worldbreaker_damage", "gem_storm", "boss_slayer", "boss_reaper"].every((id) => content.quests?.[id]));
check("higher-tier quests reward more QP", [5, 6, 7, 8].every((reward) => Object.values(content.quests || {}).some((quest) => quest.rewardQp === reward)));
check("quest progress groups feed milestone chains", ["killQuestIds", "damageQuestIds", "survivalQuestIds", "xpQuestIds", "levelQuestIds", "bossQuestIds", "addQuestProgressGroup"].every((id) => runtime.includes(id)));
check("quests can open multiple follow-ups", game.includes("opensQuests") && game.includes("questOpenIds"));
check("quest chains can open follow-up quests", game.includes("opensQuest") && game.includes("questOpenIds(questDefs[id]).forEach(openQuest)"));
check("combat stats feed quest progress", runtime.includes("addQuestProgressGroup(killQuestIds, 1)") && runtime.includes("addQuestProgressGroup(xpQuestIds, value)") && runtime.includes("addQuestProgressGroup(damageQuestIds, dealt)"));
check("meta upgrades are quest-gated", upgrades.includes('requiresQuest: "first_blood"') && upgrades.includes('requiresQuest: "boss_hunter"'));
check("Laser Damage upgrade exists", upgrades.includes("laser_damage") && upgrades.includes("maxTier: 3"));
check("upgrade tiers are tracked", game.includes("upgradeTiers") && game.includes("Buy Tier"));
check("skill tree gates by prerequisite and quest", game.includes("requiresNode") && game.includes("requiresQuest") && game.includes("nodeGateStatus"));
check("completed quests disappear from quest list", game.includes("activeQuestIds") && !game.includes("Status: ${complete"));
check("level-up choices are limited to 3 random options", game.includes("shuffleChoices") && game.includes(".slice(0, 3)"));
check("active quest weapons are offered on level-up", game.includes("activeQuestWeaponIds") && game.includes("questWeaponChoices"));
check("new combat upgrade types exist", upgrades.includes("attack_radius") && upgrades.includes("fire_rate") && upgrades.includes("flat_damage") && upgrades.includes("percent_damage"));
check("run menu pauses game", index.includes('id="openMenu"') && game.includes("openRunMenu") && game.includes('pauseReason = "menu"'));
check("menus have exit crosses", ["closeMenu", "closeLevelUp", "closeEndX"].every((id) => index.includes(`id="${id}"`)) && game.includes("closeLevelUpMenu") && game.includes("closeEndScreen"));
check("follow-up Laser quest opens", contentText.includes("laser_damage_5000"));
check("run lasts 6 minutes before boss", runtime.includes("duration: 360") && runtime.includes("spawnBoss"));
check("boss death completes run", runtime.includes('endRun("Boss defeated")') && runtime.includes("enemy.boss"));
check("boss kills feed boss quest chain", runtime.includes("addQuestProgressGroup(bossQuestIds, 1)"));
check("boss shockwave special exists", runtime.includes("updateBossSpecials") && rendering.includes("drawBossAttack") && runtime.includes('type: "shockwave"'));
check("local save exists", game.includes("localStorage") && game.includes("tap-survivor-mvp-save-v2"));

check("styles include mobile layout", styles.includes("@media (max-width: 920px)"));
check("pipeline documents test URL", pipeline.includes("https://johnkennedy-ui.github.io/tap-survivor-MVP/"));
check("pipeline documents Android flow", pipeline.includes("Android Test Steps"));
check("game plan documents MVP loop", plan.includes("Laser") && plan.includes("Quest Point"));
check("agent context pack exists", agentContext.includes("Where To Add Content") && extensionGuide.includes("Add A Weapon") && taskTemplate.includes("Stop Condition"));
check("root agent instructions load docs first", agentInstructions.includes("docs/AGENT_CODEBASE_CONTEXT.md") && agentInstructions.includes("docs/CONTENT_EXTENSION_GUIDE.md"));

check("workflow publishes gh-pages", workflow.includes("git push --force origin gh-pages"));
check("workflow publishes content and assets", workflow.includes("cp -R assets content src scripts"));
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
