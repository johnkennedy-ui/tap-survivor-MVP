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
const plan = readRequired("MVP_GAME_PLAN.md");
const pipeline = readRequired("PHONE_TEST_PIPELINE.md");
const workflow = readRequired(".github/workflows/tap-survivor-pages.yml");

check("index loads stylesheet", index.includes('href="src/styles.css"'));
check("index loads game script", index.includes('src="src/game.js"'));
check("canvas exists", /<canvas[^>]+id="game"/.test(index));
check("canvas keeps 16:9 resolution", styles.includes("aspect-ratio: 16 / 9") && styles.includes("height: auto"));
check("mobile viewport exists", index.includes('name="viewport"'));

check("tap/click target handler exists", game.includes("setTargetFromEvent"));
check("mouse movement input exists", game.includes('addEventListener("mousedown"'));
check("touch movement input exists", game.includes('addEventListener("touchstart"'));
check("enemy chase loop exists", game.includes("updateEnemies") && game.includes("enemy.speed"));
check("three enemy types exist", game.includes("enemyTypes") && (game.match(/id: "(drifter|skitter|bulwark)"/g) || []).length === 3);
check("enemy types unlock every 30 seconds", game.includes("Math.floor(game.elapsed / 30)") && game.includes("availableEnemyTypes"));
check("enemy spawns are doubled and patterned", game.includes("spawnPatternPositions(2)") && game.includes("spawnEnemy(type, position)"));
check("auto attack loop exists", game.includes("updateWeapons") && game.includes("fireWeapon"));
check("XP drops exist", game.includes("xpDrops") && game.includes("collectXp"));
check("coin and heart drops exist", game.includes("lootDrops") && game.includes("spawnLootDrops") && game.includes('type: "coin"') && game.includes('type: "heart"'));
check("coins persist in save", game.includes("coins: 0") && game.includes("save.coins +=") && game.includes("persist()"));
check("heart drops heal player", game.includes('drop.type === "heart"') && game.includes("game.player.hp = Math.min(game.player.maxHp"));
check("player HP bar renders above sprite", game.includes("drawPlayerHpBar") && game.includes("p.y - p.radius - 16"));
check("level-up choices exist", game.includes("showLevelUp") && game.includes("Prism Beam"));
check("Laser weapon exists", game.includes("fireBeam") && game.includes("prism_beam"));
check("10 new weapons exist", (game.match(/id: "unlock_(frost_orb|flame_wave|saw_drone|void_mine|chain_spark|moon_glaive|meteor_pin|acid_pool|shield_pulse|nova_burst)"/g) || []).length === 10);
check("Laser use quest exists", game.includes("use_laser_run"));
check("Quest Points are awarded", game.includes("rewardQp") && game.includes("save.questPoints += reward"));
check("more quest types exist", ["first_blood", "gatherer", "survivor_60", "crowd_control", "rapid_growth", "heavy_hits", "boss_hunter"].every((id) => game.includes(id)));
check("extended milestone quests exist", ["survivor_180", "survivor_300", "exterminator", "reaper", "power_climb", "apex_growth", "damage_dealer", "apocalypse_damage", "gem_hoarder", "gem_flood"].every((id) => game.includes(id)));
check("quest progress groups feed milestone chains", ["killQuestIds", "damageQuestIds", "survivalQuestIds", "xpQuestIds", "levelQuestIds", "addQuestProgressGroup"].every((id) => game.includes(id)));
check("quests can open multiple follow-ups", game.includes("opensQuests") && game.includes("questOpenIds"));
check("quest chains can open follow-up quests", game.includes("opensQuest") && game.includes("questOpenIds(questDefs[id]).forEach(openQuest)"));
check("combat stats feed quest progress", game.includes("addQuestProgressGroup(killQuestIds, 1)") && game.includes("addQuestProgressGroup(xpQuestIds, value)") && game.includes("addQuestProgressGroup(damageQuestIds, dealt)"));
check("meta upgrades are quest-gated", game.includes('requiresQuest: "first_blood"') && game.includes('requiresQuest: "boss_hunter"'));
check("Laser Damage upgrade exists", game.includes("laser_damage") && game.includes("maxTier: 3"));
check("upgrade tiers are tracked", game.includes("upgradeTiers") && game.includes("Buy Tier"));
check("skill tree gates by prerequisite and quest", game.includes("requiresNode") && game.includes("requiresQuest") && game.includes("nodeGateStatus"));
check("completed quests disappear from quest list", game.includes("activeQuestIds") && !game.includes("Status: ${complete"));
check("level-up choices are limited to 3 random options", game.includes("shuffleChoices") && game.includes(".slice(0, 3)"));
check("active quest weapons are offered on level-up", game.includes("activeQuestWeaponIds") && game.includes("questWeaponChoices"));
check("new combat upgrade types exist", game.includes("attack_radius") && game.includes("fire_rate") && game.includes("flat_damage") && game.includes("percent_damage"));
check("run menu pauses game", index.includes('id="openMenu"') && game.includes("openRunMenu") && game.includes('pauseReason = "menu"'));
check("menus have exit crosses", ["closeMenu", "closeLevelUp", "closeEndX"].every((id) => index.includes(`id="${id}"`)) && game.includes("closeLevelUpMenu") && game.includes("closeEndScreen"));
check("follow-up Laser quest opens", game.includes("laser_damage_5000"));
check("run lasts 6 minutes before boss", game.includes("duration: 360") && game.includes("spawnBoss"));
check("boss death completes run", game.includes('endRun("Boss defeated")') && game.includes("enemy.boss"));
check("local save exists", game.includes("localStorage") && game.includes("tap-survivor-mvp-save-v2"));

check("styles include mobile layout", styles.includes("@media (max-width: 920px)"));
check("pipeline documents test URL", pipeline.includes("https://johnkennedy-ui.github.io/tap-survivor-MVP/"));
check("pipeline documents Android flow", pipeline.includes("Android Test Steps"));
check("game plan documents MVP loop", plan.includes("Laser") && plan.includes("Quest Point"));

check("workflow publishes gh-pages", workflow.includes("git push --force origin gh-pages"));
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
