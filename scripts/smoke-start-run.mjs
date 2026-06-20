import { createGameHarness } from "./smoke-game-harness.mjs";

const harness = createGameHarness({ fakeCombat: true });

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

function startDefaultRun(testHarness) {
  testHarness.elements.get("titleStartGame").click();
}

function startAndClearMovementGate(testHarness) {
  startDefaultRun(testHarness);
  testHarness.elements.get("game").listeners.get("mousedown")({ clientX: 640, clientY: 270, buttons: 1 });
}

check("initial HUD is idle", harness.elements.get("runHud").textContent.includes("Start a run"));
check("title screen is visible first", !harness.elements.get("titleScreen").classList.contains("hidden"));

startDefaultRun(harness);
harness.elements.get("titleStartGame").click();
check("start game plays one procedural laugh", harness.context.__startLaughOscillators === 3);
check("start game schedules one transition", harness.context.__timeouts === 1);
check("start game ignores duplicate title activation", harness.context.__startLaughOscillators === 3);
harness.frame(1000);

const startedGame = harness.context.__tapSurvivorHarness.getGame();
check("start game enters running state", startedGame.running === true);
check("movement gate starts frozen", startedGame.awaitingFirstMoveInput === true);
check("movement gate banner is visible", harness.elements.get("questBanner").textContent === "Click/tap to move");
check("movement gate blocks timer progression", startedGame.elapsed === 0);

harness.elements.get("game").listeners.get("mousedown")({ clientX: 640, clientY: 270, buttons: 1 });
harness.frame(1050);
check("movement input sets target", startedGame.player.targetX > startedGame.player.x);
check("first movement input clears gate", startedGame.awaitingFirstMoveInput === false);
check("movement gate banner hides", harness.elements.get("questBanner").classList.contains("hidden"));
check("start game advances timer after first movement input", startedGame.elapsed > 0);

const hud = harness.elements.get("runHud").textContent;
check("start game begins a timed run", hud.includes("Time 0:00"));
check("run HUD includes HP", hud.includes("HP 100/100"));
check("run HUD includes level and weapon count", hud.includes("Level 1") && hud.includes("Weapons 1"));
check("end screen stays closed at run start", harness.elements.get("endScreen").classList.contains("hidden"));

harness.elements.get("openMenu").click();
const game = harness.context.__tapSurvivorHarness.getGame();
check("menu button pauses the run", game.paused === true && game.pauseReason === "menu");
harness.elements.get("openMenu").click();
check("menu button resumes the run", game.paused === false && game.pauseReason === "");

const save = harness.context.__tapSurvivorHarness.getSave();
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
  startAndClearMovementGate(skillHarness);
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

function voidMineShot() {
  const mineHarness = createGameHarness();
  startAndClearMovementGate(mineHarness);
  mineHarness.frame(1000);
  const save = mineHarness.context.__tapSurvivorHarness.getSave();
  save.towerFloor = 10;
  save.unlockedRelics = ["attack_radius_focus_relic"];
  save.equippedRelics = ["attack_radius_focus_relic"];
  const game = mineHarness.context.__tapSurvivorHarness.getGame();
  const player = game.player;
  player.targetX = player.x + 200;
  mineHarness.frame(1050);
  game.player.equippedWeapons = ["void_mine"];
  game.weaponTimers = { void_mine: -1 };
  game.bolts = [];
  game.runUpgradeTiers.run_attack_radius = 2;
  game.enemies = [
    {
      x: game.player.x - 62,
      y: game.player.y,
      radius: 12,
      hp: 100,
      maxHp: 100,
      damage: 0,
      speed: 0,
    },
  ];
  mineHarness.frame(1100);
  const armedMine = game.areas.find((area) => area.weaponId === "void_mine");
  const armDelayBeforeExplosion = armedMine.armDelay;
  const enemyHpBeforeExplosion = game.enemies[0].hp;
  mineHarness.runFrames(44, 1150, 50);
  return {
    armedMine,
    armDelayBeforeExplosion,
    enemyHpBeforeExplosion,
    enemyHpAfterExplosion: game.enemies[0]?.hp,
    playerX: game.player.x,
  };
}

const voidMine = voidMineShot();
check("void mine spawns behind player", voidMine.armedMine.x < voidMine.playerX);
check("void mine waits before exploding", voidMine.armDelayBeforeExplosion > 1.8 && voidMine.enemyHpBeforeExplosion === 100);
check("void mine area scales with upgrades and relics", voidMine.armedMine.radius > 160);
check("void mine explodes after delay", voidMine.enemyHpAfterExplosion < 100);

function normalEnemySpawnShot(towerFloor = 1) {
  const spawnHarness = createGameHarness();
  spawnHarness.context.__tapSurvivorHarness.getSave().towerFloor = towerFloor;
  startAndClearMovementGate(spawnHarness);
  spawnHarness.frame(1000);
  spawnHarness.frame(1050);
  const game = spawnHarness.context.__tapSurvivorHarness.getGame();
  return {
    enemies: game.enemies,
    width: spawnHarness.elements.get("game").width,
    height: spawnHarness.elements.get("game").height,
  };
}

function enemyStartsOffscreen(enemy, width, height) {
  return (
    enemy.x + enemy.radius < 0 ||
    enemy.x - enemy.radius > width ||
    enemy.y + enemy.radius < 0 ||
    enemy.y - enemy.radius > height
  );
}

const normalSpawn = normalEnemySpawnShot();
check("normal enemies spawn off screen", normalSpawn.enemies.length > 0 && normalSpawn.enemies.every((enemy) => enemyStartsOffscreen(enemy, normalSpawn.width, normalSpawn.height)));
check(
  "normal enemies use fixed content hp and speed",
  normalSpawn.enemies[0]?.type === "drifter" && normalSpawn.enemies[0]?.hp === 18 && normalSpawn.enemies[0]?.speed === 52,
);
check("floor one only spawns floor-one enemies", normalSpawn.enemies.every((enemy) => enemy.type === "drifter"));

const floorFourSpawn = normalEnemySpawnShot(4);
check(
  "floor four excludes higher-floor enemies",
  floorFourSpawn.enemies.length > 0 &&
    floorFourSpawn.enemies.every((enemy) => ["drifter", "skitter", "bulwark", "hexer"].includes(enemy.type)),
);

if (process.exitCode) {
  console.error("\nStart-run smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nStart-run smoke passed.");
