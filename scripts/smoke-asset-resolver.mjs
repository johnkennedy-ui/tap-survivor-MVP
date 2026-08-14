import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

import { createAssetResolver } from "../src/modules/assets.js";

function assert(name, condition) {
  if (!condition) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${name}`);
}

const root = new URL("..", import.meta.url).pathname;
const assetsSource = readFileSync(join(root, "src/assets.js"), "utf8");
const contentSource = readFileSync(join(root, "src/content.generated.js"), "utf8");
const gameDependenciesSource = readFileSync(join(root, "src/game-dependencies.js"), "utf8");

function createAssetContext({ loadContent = false } = {}) {
  const context = { console };
  vm.createContext(context);
  if (loadContent) vm.runInContext(contentSource, context);
  return context;
}

function createResolverSafely(content) {
  try {
    return { resolver: createAssetResolver({ content }) };
  } catch (error) {
    return { error };
  }
}

function descriptorsMatch(left, right) {
  return (
    left?.configurable === right?.configurable &&
    left?.enumerable === right?.enumerable &&
    left?.writable === right?.writable &&
    left?.value === right?.value &&
    left?.get === right?.get &&
    left?.set === right?.set
  );
}

function withPoisonedContent(context, callback) {
  const originalContentDescriptor = Object.getOwnPropertyDescriptor(context, "TapSurvivorContent");
  let poisonReads = 0;
  let result;
  let error;
  let cleanupSucceeded = false;

  try {
    Object.defineProperty(context, "TapSurvivorContent", {
      configurable: true,
      enumerable: originalContentDescriptor?.enumerable ?? false,
      get() {
        poisonReads += 1;
        throw new Error("TapSurvivorContent must not be read by createAssetResolver");
      },
    });
    result = callback(() => poisonReads);
  } catch (caughtError) {
    error = caughtError;
  } finally {
    if (originalContentDescriptor) {
      Object.defineProperty(context, "TapSurvivorContent", originalContentDescriptor);
      cleanupSucceeded = true;
    } else {
      cleanupSucceeded = Reflect.deleteProperty(context, "TapSurvivorContent");
    }
  }

  return {
    cleanupSucceeded,
    error,
    originalContentDescriptor,
    poisonReads,
    restoredContentDescriptor: Object.getOwnPropertyDescriptor(context, "TapSurvivorContent"),
    result,
  };
}

const context = createAssetContext({ loadContent: true });
const content = context.TapSurvivorContent;
const presentContentScenario = withPoisonedContent(context, (getPoisonReads) => {
  const explicit = createResolverSafely(content);
  const poisonReadsAfterExplicitCreation = getPoisonReads();
  const empty = createResolverSafely();
  return { empty, explicit, poisonReadsAfterExplicitCreation };
});

assert(
  "generated asset bridge is global-free with retired provenance",
  !assetsSource.includes("globalThis.TapSurvivorAssets =") &&
    assetsSource.includes(
      "// Retired global: TapSurvivorAssets. Exports are supplied through the game dependency bag."
    )
);
assert(
  "generated dependency bridge bundles the native asset resolver without an asset global",
  gameDependenciesSource.includes("function createAssetResolver(options = {})") &&
    gameDependenciesSource.includes("createAssetResolver(assetContent)") &&
    !gameDependenciesSource.includes("TapSurvivorAssets")
);

assert(
  "asset resolver explicit content creation does not read poisoned content global",
  presentContentScenario.error === undefined &&
    presentContentScenario.result?.explicit.error === undefined &&
    presentContentScenario.result?.poisonReadsAfterExplicitCreation === 0
);
assert(
  "asset resolver empty content creation does not read poisoned content global",
  presentContentScenario.result?.empty.error === undefined && presentContentScenario.poisonReads === 0
);
assert(
  "asset resolver restores exact content global descriptor",
  presentContentScenario.cleanupSucceeded &&
    descriptorsMatch(presentContentScenario.restoredContentDescriptor, presentContentScenario.originalContentDescriptor)
);
assert(
  "asset resolver empty content fallback is deterministic",
  presentContentScenario.result?.empty.resolver?.choiceIconPath({ weaponId: "spark_bolt" }) ===
    "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610"
);

const resolver = createAssetResolver({ content });
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

const absentContentContext = createAssetContext();
const absentContentScenario = withPoisonedContent(absentContentContext, () =>
  createResolverSafely()
);

assert(
  "asset resolver context without generated content begins with absent content global",
  absentContentScenario.originalContentDescriptor === undefined
);
assert(
  "asset resolver absent content creation does not read poisoned content global",
  absentContentScenario.error === undefined &&
    absentContentScenario.result?.error === undefined &&
    absentContentScenario.poisonReads === 0
);
assert(
  "asset resolver absent content fallback is deterministic",
  absentContentScenario.result?.resolver?.choiceIconPath({ weaponId: "spark_bolt" }) ===
    "assets/kenney/desert-shooter/ui-quest.png?v=kenney-20260610"
);
assert(
  "asset resolver absent content cleanup restores global absence",
  absentContentScenario.cleanupSucceeded &&
    absentContentScenario.restoredContentDescriptor === undefined &&
    !Reflect.has(absentContentContext, "TapSurvivorContent")
);
