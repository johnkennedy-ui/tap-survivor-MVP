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

const content = context.TapSurvivorContent;
const assets = context.TapSurvivorAssets;
const originalContentDescriptor = Object.getOwnPropertyDescriptor(context, "TapSurvivorContent");
let explicitResolver;
let emptyResolver;
let explicitCreationError;
let emptyCreationError;
let poisonReads = 0;
let poisonReadsAfterExplicitCreation = 0;

try {
  Object.defineProperty(context, "TapSurvivorContent", {
    configurable: true,
    enumerable: originalContentDescriptor.enumerable,
    get() {
      poisonReads += 1;
      throw new Error("TapSurvivorContent must not be read by createAssetResolver");
    },
  });
  try {
    explicitResolver = assets.createAssetResolver(content);
  } catch (error) {
    explicitCreationError = error;
  }
  poisonReadsAfterExplicitCreation = poisonReads;
  try {
    emptyResolver = assets.createAssetResolver();
  } catch (error) {
    emptyCreationError = error;
  }
} finally {
  Object.defineProperty(context, "TapSurvivorContent", originalContentDescriptor);
}

const restoredContentDescriptor = Object.getOwnPropertyDescriptor(context, "TapSurvivorContent");
assert(
  "asset resolver explicit content creation does not read poisoned content global",
  explicitCreationError === undefined && poisonReadsAfterExplicitCreation === 0
);
assert(
  "asset resolver empty content creation does not read poisoned content global",
  emptyCreationError === undefined && poisonReads === 0
);
assert(
  "asset resolver restores exact content global descriptor",
  restoredContentDescriptor.configurable === originalContentDescriptor.configurable &&
    restoredContentDescriptor.enumerable === originalContentDescriptor.enumerable &&
    restoredContentDescriptor.writable === originalContentDescriptor.writable &&
    restoredContentDescriptor.value === originalContentDescriptor.value &&
    restoredContentDescriptor.get === originalContentDescriptor.get &&
    restoredContentDescriptor.set === originalContentDescriptor.set
);
assert(
  "asset resolver empty content fallback is deterministic",
  emptyResolver?.choiceIconPath({ weaponId: "spark_bolt" }) ===
    "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610"
);

const resolver = assets.createAssetResolver(content);
const sparkIcon = resolver.choiceIconPath({ weaponId: "spark_bolt" });
const moveSpeedIcon = resolver.choiceIconPath({ runUpgradeId: "run_move_speed" });
const moveSpeedRelic = content.relics.find((relic) => relic.id === "move_speed_focus_relic");
const relicIcon = resolver.relicIcon(moveSpeedRelic);
const sparkSprite = resolver.choiceIconDefinition({ weaponId: "spark_bolt" });

assert("asset resolver normal explicit content icon resolution recovers", sparkIcon.includes("assets/generated/tower/sprites/"));
assert("weapon choice uses clean icon source", sparkIcon.includes("assets/generated/tower/sprites/") && !sparkIcon.includes("skill-effects/split"));
assert("run upgrade choice uses clean icon source", moveSpeedIcon.includes("assets/generated/tower/sprites/") && !moveSpeedIcon.includes("skill-effects/split"));
assert("relic uses unique static relic icon source", relicIcon === moveSpeedRelic.iconPath && relicIcon.includes("assets/generated/tower/sprites/relics/"));
assert("weapon effect sprite remains available separately", sparkSprite.src.includes("skill-effects/split/skill-") && sparkSprite.iconSrc === sparkIcon);
