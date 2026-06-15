import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

function assert(name, condition) {
  if (!condition) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${name}`);
}

const root = new URL("..", import.meta.url).pathname;
const context = { console };
vm.createContext(context);
["src/content.generated.js", "src/assets.js"].forEach((path) => {
  vm.runInContext(readFileSync(join(root, path), "utf8"), context);
});

const resolver = context.TapSurvivorAssets.createAssetResolver(context.TapSurvivorContent);
const content = context.TapSurvivorContent;
const sparkIcon = resolver.choiceIconPath({ weaponId: "spark_bolt" });
const moveSpeedIcon = resolver.choiceIconPath({ runUpgradeId: "run_move_speed" });
const moveSpeedRelic = content.relics.find((relic) => relic.id === "move_speed_focus_relic");
const relicIcon = resolver.relicIcon(moveSpeedRelic);
const sparkSprite = resolver.choiceIconDefinition({ weaponId: "spark_bolt" });

assert("weapon choice uses clean icon source", sparkIcon.includes("assets/generated/tower/sprites/") && !sparkIcon.includes("skill-effects/split"));
assert("run upgrade choice uses clean icon source", moveSpeedIcon.includes("assets/generated/tower/sprites/") && !moveSpeedIcon.includes("skill-effects/split"));
assert("relic uses unique static relic icon source", relicIcon === moveSpeedRelic.iconPath && relicIcon.includes("assets/generated/tower/sprites/relics/"));
assert("weapon effect sprite remains available separately", sparkSprite.src.includes("skill-effects/split/skill-") && sparkSprite.iconSrc === sparkIcon);
