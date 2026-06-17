import { createGameHarness } from "./smoke-game-harness.mjs";

const harness = createGameHarness({ fakeCombat: true });

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

check("initial HUD is idle", harness.elements.get("runHud").textContent.includes("Start a run"));

harness.elements.get("startRun").click();
harness.frame(1000);

const hud = harness.elements.get("runHud").textContent;
check("first run movement banner is recorded", harness.context.__tapSurvivorHarness.getSave().seenBanners.includes("first_run_movement"));
check("start button begins a timed run", hud.includes("Time 0:00"));
check("run HUD includes HP", hud.includes("HP 100/100"));
check("run HUD includes level and weapon count", hud.includes("Level 1") && hud.includes("Weapons 1"));
check("end screen stays closed at run start", harness.elements.get("endScreen").classList.contains("hidden"));

harness.elements.get("openMenu").click();
const game = harness.context.__tapSurvivorHarness.getGame();
check("menu button pauses the run", game.paused === true && game.pauseReason === "menu");
harness.elements.get("openMenu").click();
check("menu button resumes the run", game.paused === false && game.pauseReason === "");

const save = harness.context.__tapSurvivorHarness.getSave();
const bannerPersisted = JSON.parse(harness.context.localStorage.store.get("tap-survivor-mvp-save-v2"));
check("tutorial banner flag persists", bannerPersisted.seenBanners.includes("first_run_movement"));
save.coins = 41;
harness.elements.get("exitRun").click();
const exitedRunSave = JSON.parse(harness.context.localStorage.store.get("tap-survivor-mvp-save-v2"));
check("run completion persists current save", exitedRunSave.coins === 41);
save.coins = 42;
harness.dispatchPagehide();
const persisted = JSON.parse(harness.context.localStorage.store.get("tap-survivor-mvp-save-v2"));
check("pagehide flush persists current save", persisted.coins === 42);

function projectileSkillShot(upgradeId) {
  const skillHarness = createGameHarness();
  skillHarness.elements.get("startRun").click();
  skillHarness.frame(1000);
  const game = skillHarness.context.__tapSurvivorHarness.getGame();
  const player = game.player;
  game.runUpgradeTiers[upgradeId] = 1;
  game.weaponTimers.spark_bolt = -1;
  game.bolts = [];
  game.enemies = [
    {
      x: player.x + 300,
      y: player.y,
      radius: 12,
      hp: 999,
      maxHp: 999,
      damage: 0,
      speed: 0,
    },
  ];
  skillHarness.frame(1050);
  return {
    bolt: game.bolts[0],
    timer: game.weaponTimers.spark_bolt,
  };
}

const hasteShot = projectileSkillShot("run_haste_projectiles");
check("haste projectiles fly faster", Math.abs(hasteShot.bolt.vx) > 680 && Math.abs(hasteShot.bolt.vx) < 705);
check("haste projectiles deal reduced damage", hasteShot.bolt.damage > 8 && hasteShot.bolt.damage < 9);
check("haste projectiles fire faster", hasteShot.timer > 0.34 && hasteShot.timer < 0.37);

const heavyShot = projectileSkillShot("run_heavy_projectiles");
check("heavy projectiles fly slower", Math.abs(heavyShot.bolt.vx) > 220 && Math.abs(heavyShot.bolt.vx) < 240);
check("heavy projectiles deal triple base damage", heavyShot.bolt.damage === 36);
check("heavy projectiles fire slower", heavyShot.timer > 0.78 && heavyShot.timer < 0.82);

if (process.exitCode) {
  console.error("\nStart-run smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nStart-run smoke passed.");
