import { createGameHarness } from "./smoke-game-harness.mjs";

function assert(name, condition) {
  if (!condition) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${name}`);
}

const focusRelic = "move_speed_focus_relic";
const masteryRelic = "fire_rate_mastery_relic";
const harness = createGameHarness({
  initialSave: {
    towerFloor: 20,
    coins: 0,
    shopPurchases: {},
    unlockedWeapons: ["spark_bolt"],
    unlockedRelics: [focusRelic, masteryRelic],
    equippedRelics: [focusRelic, masteryRelic],
  },
});

harness.elements.get("startMenuStartRun").click();
const game = harness.context.__tapSurvivorHarness.getGame();

assert("focus relic starts linked run skill at +1", game?.runUpgradeTiers?.run_move_speed === 1);
assert("mastery relic starts linked run skill at +2", game?.runUpgradeTiers?.run_fire_rate === 2);
assert("focus relic applies player stat tier on run start", game?.player?.speed > 185);
