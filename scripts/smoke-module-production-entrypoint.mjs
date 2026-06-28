import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  bootProductionModuleEntrypoint,
  createProductionModuleEntrypoint,
  PRODUCTION_MODULE_ENTRYPOINT_PROOF_SLOTS,
} from "../src/app/production-module-entrypoint.js";

const root = new URL("..", import.meta.url).pathname;
const content = JSON.parse(readFileSync(join(root, "content/tap-survivor-content.json"), "utf8"));
const indexHtmlBefore = readFileSync(join(root, "index.html"), "utf8");
const candidateSource = readFileSync(join(root, "src/app/production-module-entrypoint.js"), "utf8");
const calls = [];
const beforeTapGlobals = tapSurvivorGlobalNames();

check("production module entrypoint candidate imports successfully", typeof createProductionModuleEntrypoint === "function");
check(
  "production module entrypoint candidate imports compose runtime helper",
  candidateSource.includes("./compose-runtime.js")
);
check(
  "production module entrypoint candidate imports module dependency bag",
  candidateSource.includes("../modules/module-game-dependencies.js")
);
check(
  "production module entrypoint candidate imports module lifecycle owner",
  candidateSource.includes("../modules/module-game-lifecycle.js")
);
check(
  "production module entrypoint candidate exposes expected proof slots",
  ["boot", "createDependencyBag", "createLifecycleOwner", "init", "startRun", "tick", "render", "persist", "dispose"].every(
    (slot) => PRODUCTION_MODULE_ENTRYPOINT_PROOF_SLOTS.includes(slot)
  )
);
check(
  "production module entrypoint candidate has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(candidateSource)
);

const initialSave = {
  coins: 21,
  selectedStartingWeapon: "spark_bolt",
  shopPurchases: {},
  towerFloor: 1,
  unlockedWeapons: ["spark_bolt"],
};
const canvas = {
  height: 540,
  listeners: new Map(),
  width: 960,
  addEventListener(type, handler) {
    this.listeners.set(type, handler);
    calls.push(`canvas:${type}`);
  },
  getBoundingClientRect() {
    return { height: 540, left: 0, top: 0, width: 960 };
  },
};
const documentRef = {
  body: { dataset: {} },
  visibilityState: "visible",
  addEventListener(type) {
    calls.push(`document:${type}`);
  },
};
const runtimeGlobal = {
  addEventListener(type) {
    calls.push(`global:${type}`);
  },
  requestAnimationFrame(callback) {
    this.frameCallback = callback;
    calls.push("raf");
    return 1;
  },
};
let browserDefaultBootError = "";
try {
  createProductionModuleEntrypoint({
    globalRef: {
      document: documentRef,
      requestAnimationFrame: runtimeGlobal.requestAnimationFrame.bind(runtimeGlobal),
    },
  });
} catch (error) {
  browserDefaultBootError = error?.message || String(error);
}
check(
  "production module entrypoint candidate still requires explicit browser dependency bag options",
  browserDefaultBootError.includes("dependencyBagOptions")
);
const speedButtons = [1, 2, 5].map((speed) => ({
  dataset: { speed: String(speed) },
  classList: {
    toggle(name, value) {
      calls.push(`speed:${speed}:${name}:${value}`);
    },
  },
  setAttribute(name, value) {
    calls.push(`speed:${speed}:${name}:${value}`);
  },
}));
const uiSurface = {
  endScreen: {
    classList: {
      add: () => calls.push("run-ui:end-hidden"),
      remove: () => calls.push("run-ui:end-open"),
    },
  },
  levelUp: {
    classList: {
      add: () => calls.push("level-up:hidden"),
    },
  },
  runHud: { textContent: "" },
  runStats: { innerHTML: "" },
  speedButtons,
};
const storage = createMemoryStorage();
storage.setItem("tap-survivor-mvp-save-v2", JSON.stringify(initialSave));

const entrypoint = bootProductionModuleEntrypoint({
  globalRef: runtimeGlobal,
  lifecycleHooks: {
    dispose: () => calls.push("lifecycle:dispose"),
    resetGameState: () => {
      calls.push("lifecycle:reset");
      return createFakeRun();
    },
    update: ({ dependencies, dt }) => {
      calls.push(`lifecycle:update:${dt}`);
      const game = dependencies.getGame();
      game.awaitingFirstMoveInput = false;
      const updater = dependencies.moduleSystems.runUpdate.createRunUpdater({
        addQuestProgressGroup: (ids, amount) =>
          calls.push(`lifecycle:quests:${ids.join(",")}:${amount}`),
        canvas: dependencies.canvas,
        clamp: dependencies.moduleSystems.math.clamp,
        combat: {
          spawnBoss: () => calls.push("lifecycle:combat:spawn-boss"),
          spawnEnemies: () => calls.push("lifecycle:combat:spawn-enemies"),
          updateAreas: () => calls.push("lifecycle:combat:update-areas"),
          updateBeams: () => calls.push("lifecycle:combat:update-beams"),
          updateBolts: () => calls.push("lifecycle:combat:update-bolts"),
          updateBossSpecials: () => calls.push("lifecycle:combat:update-boss-specials"),
          updateEnemies: () => calls.push("lifecycle:combat:update-enemies"),
          updateEnemyBolts: () => calls.push("lifecycle:combat:update-enemy-bolts"),
          updateWeaponBursts: () => calls.push("lifecycle:combat:update-weapon-bursts"),
          updateWeapons: () => calls.push("lifecycle:combat:update-weapons"),
        },
        endRun: (reason) => calls.push(`lifecycle:end:${reason}`),
        getGame: dependencies.getGame,
        getRelicSpecialEffects: () => ({}),
        levelQuestIds: [],
        mapSystem: {
          applyToGame: () => calls.push("lifecycle:map"),
        },
        pickupSystem: {
          updateLootDrops: () => calls.push("lifecycle:pickup:loot"),
          updatePickupTexts: () => calls.push("lifecycle:pickup:texts"),
          updateXpDrops: () => calls.push("lifecycle:pickup:xp"),
        },
        showLevelUp: () => calls.push("lifecycle:level-up"),
        survivalQuestIds: ["survive"],
        xpQuestIds: [],
      });
      updater.update(dt);
      return true;
    },
  },
  platform: {
    documentRef,
    runtimeGlobal,
  },
  dependencyBagOptions: {
    adapters: createFakeAdapters({ canvas, calls, initialSave, storage, uiSurface }),
    content,
    contentSchema: {
      effectRegistries: {
        shopItem: {
          stats: [
            "attackRadius",
            "fireRate",
            "flatDamage",
            "maxHp",
            "percentDamage",
            "pickupRadius",
            "relicFocus",
            "speed",
          ],
        },
      },
    },
    saveConfig: {
      legacySaveKey: "tap-survivor-mvp-save-v1",
      questOpenIds: (quest) => quest?.opens || [],
      saveKey: "tap-survivor-mvp-save-v2",
    },
    upgradeContent: {
      createUpgradeDefs: (weaponDefs) =>
        Object.entries(weaponDefs).map(([weaponId, weapon]) => ({
          id: weapon.upgradeId || `${weaponId}_damage`,
          weaponId,
        })),
      runUpgradeDefs: content.runUpgrades || [],
    },
  },
});

check("production module entrypoint creates lifecycle owner", Boolean(entrypoint.lifecycle));
check(
  "production module entrypoint uses module game dependency bag",
  Boolean(entrypoint.dependencies.moduleSystems?.contentRegistry?.weaponDefs?.spark_bolt) &&
    typeof entrypoint.dependencies.moduleSystems?.runUpdate?.createRunUpdater === "function"
);
check(
  "production module entrypoint reaches module runtime adapters",
  Boolean(entrypoint.dependencies.moduleSystems?.moduleRuntimeAssetsAdapter?.assets) &&
    Boolean(entrypoint.dependencies.moduleSystems?.moduleRuntimeAudioAdapter?.audio) &&
    Boolean(entrypoint.dependencies.moduleSystems?.moduleRuntimeGameplayAdapter?.combat) &&
    Boolean(entrypoint.dependencies.moduleSystems?.moduleRuntimeProgressionAdapter?.shop) &&
    Boolean(entrypoint.dependencies.moduleSystems?.moduleRuntimeRenderingAdapter?.rendering) &&
    Boolean(entrypoint.dependencies.moduleSystems?.moduleRuntimeSpriteAdapter?.spriteSystem) &&
    Boolean(entrypoint.dependencies.moduleSystems?.moduleRuntimeStorageAdapter?.storageAdapter) &&
    Boolean(entrypoint.dependencies.moduleSystems?.moduleRuntimeUiAdapters?.ui)
);
check(
  "production-style init binds input through platform adapter",
  calls.includes("input:bind") && calls.includes("canvas:mousedown") && calls.includes("raf")
);

entrypoint.startRun();
entrypoint.tick(0.016);
entrypoint.render({ frameId: "production-candidate" });
entrypoint.persist();
entrypoint.dispose();

check(
  "production-style startRun reaches module lifecycle path",
  calls.includes("lifecycle:reset") && calls.includes("shop:close") && calls.includes("level-up:hidden")
);
check(
  "production-style tick reaches module run update path",
  calls.includes("lifecycle:update:0.016") &&
    calls.includes("lifecycle:map") &&
    calls.includes("lifecycle:quests:survive:0.016") &&
    calls.includes("lifecycle:combat:update-weapons")
);
check(
  "production-style render reaches rendering adapter",
  calls.includes("render:clear:960") &&
    calls.some((call) => call.startsWith("render:frame:true:")) &&
    calls.includes("render:hud:1") &&
    calls.includes("render:skill-rail:1")
);
check(
  "production-style persist reaches storage adapter",
  calls.some((call) => call.startsWith("storage:set:tap-survivor-mvp-save-v2:"))
);
check("production-style dispose reaches lifecycle owner", calls.includes("lifecycle:dispose"));
check(
  "production module entrypoint publishes no TapSurvivor globals",
  sameNames(beforeTapGlobals, tapSurvivorGlobalNames())
);
check(
  "production index.html remains untouched by candidate smoke",
  readFileSync(join(root, "index.html"), "utf8") === indexHtmlBefore
);

if (process.exitCode) {
  console.error("\nModule production entrypoint smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nModule production entrypoint smoke passed.");

function createFakeAdapters({ canvas, calls, initialSave, storage, uiSurface }) {
  return {
    assetAdapters: {
      fallbackSkillIcon: "fallback.png",
    },
    audioAdapters: {
      audioContextFactory: (cueId) => ({
        cueId,
        resume: () => calls.push(`audio-context:${cueId}`),
      }),
      audioFactory: (src) => ({
        cloneNode: () => ({
          play: () => calls.push(`audio:play:${src}`),
        }),
      }),
      clock: () => 1000,
    },
    gameplayAdapters: {
      gameplaySystems: {},
      onMissingAdapter: ({ name }) => calls.push(`gameplay:missing:${name}`),
    },
    initialGame: null,
    initialSave,
    platformAdapters: {
      bannerSystem: {
        hideMovementGateBanner: () => calls.push("banner:hide-movement-gate"),
        showMovementGateBanner: () => calls.push("banner:show-movement-gate"),
      },
      bindMovementInput: () => calls.push("input:bind"),
      canvas,
      debugSystem: {
        bind: () => calls.push("debug:bind"),
      },
      loop: () => calls.push("loop"),
    },
    progressionAdapters: {
      onMissingAdapter: ({ name }) => calls.push(`progression:missing:${name}`),
      progressionSystems: {},
    },
    renderingAdapters: {
      renderers: {
        clearFrame: ({ platformAdapters }) => {
          calls.push(`render:clear:${platformAdapters.canvas.width}`);
          return true;
        },
        renderEnemies: ({ enemies }) => {
          calls.push(`render:enemies:${enemies.length}`);
          return true;
        },
        renderFrame: ({ assetAdapters, game }) => {
          const resolver = assetAdapters.assets.createAssetResolver();
          calls.push(`render:frame:${Boolean(game)}:${resolver.weaponIcon("spark_bolt")}`);
          return true;
        },
        renderHud: ({ game }) => {
          calls.push(`render:hud:${game?.towerFloor}`);
          return true;
        },
        renderSkillRail: ({ game }) => {
          calls.push(`render:skill-rail:${game?.player?.equippedWeapons?.length || 0}`);
          return true;
        },
      },
    },
    renderMetaSink: ({ game, save }) => calls.push(`render-meta:${Boolean(game)}:${save.coins}`),
    spriteAdapters: {
      spriteSystem: {
        drawImage: (id) => calls.push(`sprites:draw-image:${id}`),
        drawSprite: (id) => calls.push(`sprites:draw-sprite:${id}`),
        loadSprites: () => calls.push("sprites:load"),
      },
    },
    storageAdapters: {
      storage,
    },
    uiAdapters: {
      runUi: {
        formatTime: (seconds) => `t:${Math.round(seconds)}`,
        getGameSpeed: () => 1,
        maxEquippedWeapons: () => 6,
        renderDebug: () => calls.push("run-ui:render-debug"),
      },
      shellUi: {
        shellRelicController: {
          render: () => calls.push("shell:relic-render"),
        },
        shellView: {
          render: (state) => calls.push(`shell:render:${state.screen}`),
          setMenuOpen: (open) => calls.push(`shell:menu:${open}`),
          setScreen: (screen) => calls.push(`shell:screen:${screen}`),
        },
      },
      shopSystemAdapter: {
        closeShop: () => calls.push("shop:close"),
      },
      ui: uiSurface,
    },
  };
}

function createFakeRun() {
  return {
    awaitingFirstMoveInput: false,
    bossSpawned: false,
    duration: 150,
    elapsed: 0,
    enemies: [],
    kills: 0,
    laserDamage: 0,
    lastFloorClear: null,
    paused: false,
    player: {
      equippedWeapons: ["spark_bolt"],
      hp: 100,
      level: 1,
      maxHp: 100,
      speed: 200,
      targetX: 480,
      targetY: 270,
      x: 480,
      y: 270,
    },
    running: true,
    towerFloor: 1,
  };
}

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(key) {
      calls.push(`storage:get:${key}`);
      return store.get(key) || null;
    },
    removeItem(key) {
      calls.push(`storage:remove:${key}`);
      store.delete(key);
    },
    setItem(key, value) {
      calls.push(`storage:set:${key}:${String(value).length}`);
      store.set(key, String(value));
    },
  };
}

function tapSurvivorGlobalNames() {
  return Object.getOwnPropertyNames(globalThis)
    .filter((name) => name.startsWith("TapSurvivor"))
    .sort();
}

function sameNames(left, right) {
  return left.length === right.length && left.every((name, index) => name === right[index]);
}

function check(name, pass) {
  if (pass) {
    console.log(`PASS ${name}`);
    return;
  }
  console.error(`FAIL ${name}`);
  process.exitCode = 1;
}
