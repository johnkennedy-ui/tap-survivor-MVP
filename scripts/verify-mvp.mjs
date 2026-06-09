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
check("mobile viewport exists", index.includes('name="viewport"'));

check("tap/click target handler exists", game.includes("setTargetFromEvent"));
check("mouse movement input exists", game.includes('addEventListener("mousedown"'));
check("touch movement input exists", game.includes('addEventListener("touchstart"'));
check("enemy chase loop exists", game.includes("updateEnemies") && game.includes("enemy.speed"));
check("auto attack loop exists", game.includes("updateWeapons") && game.includes("fireSparkBolt"));
check("XP drops exist", game.includes("xpDrops") && game.includes("collectXp"));
check("level-up choices exist", game.includes("showLevelUp") && game.includes("Prism Beam"));
check("Laser weapon exists", game.includes("fireLaser") && game.includes("prism_beam"));
check("Laser use quest exists", game.includes("use_laser_run"));
check("Quest Points are awarded", game.includes("rewardQp") && game.includes("save.questPoints += reward"));
check("Laser Damage I node exists", game.includes("laser_damage_1") && game.includes("cost: 1"));
check("follow-up Laser quest opens", game.includes("laser_damage_5000"));
check("local save exists", game.includes("localStorage") && game.includes("tap-survivor-mvp-save-v1"));

check("styles include mobile layout", styles.includes("@media (max-width: 920px)"));
check("pipeline documents test URL", pipeline.includes("https://johnkennedy-ui.github.io/tap-survivor-MVP/"));
check("pipeline documents Android flow", pipeline.includes("Android Test Steps"));
check("game plan documents MVP loop", plan.includes("Laser") && plan.includes("Quest Point"));

check("workflow deploys Pages", workflow.includes("actions/deploy-pages@v4"));
check("workflow publishes repo root", workflow.includes("path: ."));
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
