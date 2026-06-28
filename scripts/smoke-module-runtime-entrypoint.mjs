import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createModuleRuntimeTestEntrypoint } from "../src/app/module-runtime-test-entrypoint.js";
import { createBrowserPlatform } from "../src/app/compose-runtime.js";
import {
  CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS,
  INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS,
  MODULE_NATIVE_GAME_DEPENDENCY_SLOTS,
} from "../src/modules/module-game-dependencies.js";
import {
  MODULE_GAME_LIFECYCLE_OWNER_LOW_LEVEL_SLOTS,
  MODULE_GAME_LIFECYCLE_OWNER_PROOF_SLOTS,
  MODULE_GAME_LIFECYCLE_OWNER_SLOTS,
} from "../src/modules/module-game-lifecycle.js";
import {
  INJECTED_STATE_PERSISTENCE_SLOTS,
  MODULE_NATIVE_STATE_PERSISTENCE_SLOTS,
} from "../src/modules/game-state-store.js";
import {
  MODULE_RUNTIME_ASSETS_ADAPTER_LOW_LEVEL_SLOTS,
  MODULE_RUNTIME_ASSETS_ADAPTER_PROOF_SLOTS,
  MODULE_RUNTIME_ASSETS_ADAPTER_SLOTS,
} from "../src/modules/module-runtime-assets-adapter.js";
import {
  MODULE_RUNTIME_AUDIO_ADAPTER_LOW_LEVEL_SLOTS,
  MODULE_RUNTIME_AUDIO_ADAPTER_PROOF_SLOTS,
  MODULE_RUNTIME_AUDIO_ADAPTER_SLOTS,
} from "../src/modules/module-runtime-audio-adapter.js";
import {
  MODULE_RUNTIME_GAMEPLAY_ADAPTER_LOW_LEVEL_SLOTS,
  MODULE_RUNTIME_GAMEPLAY_ADAPTER_PROOF_SLOTS,
  MODULE_RUNTIME_GAMEPLAY_ADAPTER_SLOTS,
} from "../src/modules/module-runtime-gameplay-adapter.js";
import {
  MODULE_RUNTIME_PLATFORM_ADAPTER_PROOF_SLOTS,
  MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS,
} from "../src/modules/module-runtime-platform-adapter.js";
import {
  MODULE_RUNTIME_PROGRESSION_ADAPTER_LOW_LEVEL_SLOTS,
  MODULE_RUNTIME_PROGRESSION_ADAPTER_PROOF_SLOTS,
  MODULE_RUNTIME_PROGRESSION_ADAPTER_SLOTS,
} from "../src/modules/module-runtime-progression-adapter.js";
import {
  MODULE_RUNTIME_RENDERING_ADAPTER_LOW_LEVEL_SLOTS,
  MODULE_RUNTIME_RENDERING_ADAPTER_PROOF_SLOTS,
  MODULE_RUNTIME_RENDERING_ADAPTER_SLOTS,
} from "../src/modules/module-runtime-rendering-adapter.js";
import {
  MODULE_RUNTIME_SPRITE_ADAPTER_LOW_LEVEL_SLOTS,
  MODULE_RUNTIME_SPRITE_ADAPTER_PROOF_SLOTS,
  MODULE_RUNTIME_SPRITE_ADAPTER_SLOTS,
} from "../src/modules/module-runtime-sprite-adapter.js";
import {
  MODULE_RUNTIME_STORAGE_ADAPTER_LOW_LEVEL_SLOTS,
  MODULE_RUNTIME_STORAGE_ADAPTER_PROOF_SLOTS,
  MODULE_RUNTIME_STORAGE_ADAPTER_SLOTS,
} from "../src/modules/module-runtime-storage-adapter.js";
import {
  MODULE_RUNTIME_UI_ADAPTER_LOW_LEVEL_SLOTS,
  MODULE_RUNTIME_UI_ADAPTER_PROOF_SLOTS,
  MODULE_RUNTIME_UI_ADAPTER_SLOTS,
} from "../src/modules/module-runtime-ui-adapters.js";

const root = new URL("..", import.meta.url).pathname;
const content = JSON.parse(readFileSync(join(root, "content/tap-survivor-content.json"), "utf8"));
const entrypointSource = readFileSync(join(root, "src/app/module-runtime-test-entrypoint.js"), "utf8");
const fixtureHtml = readFileSync(join(root, "tests/fixtures/module-runtime-test-entrypoint.html"), "utf8");
const moduleDependencySource = readFileSync(join(root, "src/modules/module-game-dependencies.js"), "utf8");
const moduleLifecycleSource = readFileSync(join(root, "src/modules/module-game-lifecycle.js"), "utf8");
const assetsAdapterSource = readFileSync(
  join(root, "src/modules/module-runtime-assets-adapter.js"),
  "utf8"
);
const audioAdapterSource = readFileSync(
  join(root, "src/modules/module-runtime-audio-adapter.js"),
  "utf8"
);
const gameplayAdapterSource = readFileSync(
  join(root, "src/modules/module-runtime-gameplay-adapter.js"),
  "utf8"
);
const platformAdapterSource = readFileSync(
  join(root, "src/modules/module-runtime-platform-adapter.js"),
  "utf8"
);
const progressionAdapterSource = readFileSync(
  join(root, "src/modules/module-runtime-progression-adapter.js"),
  "utf8"
);
const renderingAdapterSource = readFileSync(
  join(root, "src/modules/module-runtime-rendering-adapter.js"),
  "utf8"
);
const spriteAdapterSource = readFileSync(
  join(root, "src/modules/module-runtime-sprite-adapter.js"),
  "utf8"
);
const storageAdapterSource = readFileSync(
  join(root, "src/modules/module-runtime-storage-adapter.js"),
  "utf8"
);
const uiAdapterSource = readFileSync(join(root, "src/modules/module-runtime-ui-adapters.js"), "utf8");
const stateStoreSource = readFileSync(join(root, "src/modules/game-state-store.js"), "utf8");
const calls = [];
const beforeTapGlobals = tapSurvivorGlobalNames();

check(
  "module runtime test fixture uses module script",
  fixtureHtml.includes('type="module"') && fixtureHtml.includes("../../src/app/module-runtime-test-entrypoint.js")
);
check(
  "module runtime test entrypoint imports compose runtime",
  entrypointSource.includes("./compose-runtime.js")
);
check(
  "module runtime test entrypoint imports module game lifecycle owner",
  entrypointSource.includes("../modules/module-game-lifecycle.js")
);
check(
  "module game lifecycle owner imports module-native dependency bag",
  moduleLifecycleSource.includes("./module-game-dependencies.js")
);
check(
  "module runtime test entrypoint has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(entrypointSource)
);
check(
  "module-native dependency bag has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(moduleDependencySource)
);
check(
  "module game lifecycle owner has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(moduleLifecycleSource)
);
check(
  "module-native state store has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(stateStoreSource)
);
check(
  "module runtime assets adapter has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(assetsAdapterSource)
);
check(
  "module runtime audio adapter has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(audioAdapterSource)
);
check(
  "module runtime gameplay adapter has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(gameplayAdapterSource)
);
check(
  "module runtime platform adapter has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(platformAdapterSource)
);
check(
  "module runtime progression adapter has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(progressionAdapterSource)
);
check(
  "module runtime rendering adapter has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(renderingAdapterSource)
);
check(
  "module runtime sprite adapter has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(spriteAdapterSource)
);
check(
  "module runtime storage adapter has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(storageAdapterSource)
);
check(
  "module runtime UI adapter bundle has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(uiAdapterSource)
);
check(
  "module runtime test fixture has no classic TapSurvivor global reads",
  !/\b(?:globalThis|window)\s*\.\s*TapSurvivor[A-Za-z0-9_]*/.test(fixtureHtml)
);

const initialSave = {
  coins: 14.8,
  towerFloor: 0,
  unlockedWeapons: [],
  shopPurchases: {
    missing_item: 4,
  },
};
const initialGame = {
  bossSpawned: false,
  elapsed: 0,
  enemies: [],
  kills: 0,
  laserDamage: 0,
  lastFloorClear: null,
  running: true,
  paused: false,
  awaitingFirstMoveInput: true,
  towerFloor: 1,
  player: {
    equippedWeapons: ["spark_bolt"],
    hp: 100,
    level: 1,
    maxHp: 100,
    targetX: 0,
    targetY: 0,
  },
};
const canvas = {
  width: 960,
  height: 540,
  listeners: new Map(),
  addEventListener(type, handler) {
    this.listeners.set(type, handler);
    calls.push(`canvas:${type}`);
  },
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 960, height: 540 };
  },
};
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
const documentRef = {
  body: { dataset: {} },
  visibilityState: "visible",
  addEventListener(type) {
    calls.push(`document:${type}`);
  },
};
const uiSurface = {
  speedButtons,
  levelUp: { classList: { add: () => calls.push("level-up:hidden") } },
  runHud: { textContent: "" },
  runStats: { innerHTML: "" },
  endScreen: {
    classList: {
      add: () => calls.push("run-ui:end-hidden"),
      remove: () => calls.push("run-ui:end-open"),
    },
  },
};
const runtimeGlobal = {
  requestAnimationFrame(callback) {
    this.frameCallback = callback;
    calls.push("raf");
    return 1;
  },
  addEventListener(type) {
    calls.push(`global:${type}`);
  },
  Capacitor: {
    Plugins: {
      App: {
        addListener(type) {
          calls.push(`capacitor:${type}`);
          return { catch() {} };
        },
      },
    },
  },
};
const storage = createMemoryStorage();
storage.store.set("tap-survivor-mvp-save-v2", JSON.stringify(initialSave));

const entrypoint = createModuleRuntimeTestEntrypoint({
  autoInitialize: true,
  lifecycleHooks: {
    dispose: () => calls.push("lifecycle:dispose"),
    resetGameState: () => {
      calls.push("lifecycle:reset");
      return {
        bossSpawned: false,
        duration: 150,
        elapsed: 0,
        enemies: [],
        kills: 0,
        laserDamage: 0,
        lastFloorClear: null,
        running: true,
        paused: false,
        awaitingFirstMoveInput: true,
        towerFloor: 1,
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
      };
    },
    update: ({ dependencies, dt }) => {
      calls.push(`lifecycle:update:${dt}`);
      const game = dependencies.getGame();
      game.awaitingFirstMoveInput = false;
      const updater = dependencies.moduleSystems.runUpdate.createRunUpdater({
        canvas: dependencies.canvas,
        getGame: dependencies.getGame,
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
        pickupSystem: {
          updateLootDrops: () => calls.push("lifecycle:pickup:loot"),
          updatePickupTexts: () => calls.push("lifecycle:pickup:texts"),
          updateXpDrops: () => calls.push("lifecycle:pickup:xp"),
        },
        addQuestProgressGroup: (ids, amount) =>
          calls.push(`lifecycle:quests:${ids.join(",")}:${amount}`),
        survivalQuestIds: ["survive"],
        xpQuestIds: [],
        levelQuestIds: [],
        showLevelUp: () => calls.push("lifecycle:level-up"),
        endRun: (reason) => calls.push(`lifecycle:end:${reason}`),
        getRelicSpecialEffects: () => ({}),
        mapSystem: {
          applyToGame: () => calls.push("lifecycle:map"),
        },
        clamp: dependencies.moduleSystems.math.clamp,
      });
      updater.update(dt);
      return true;
    },
  },
  platform: createBrowserPlatform({ globalRef: runtimeGlobal, documentRef }),
  dependencyBagOptions: {
    content,
    contentSchema: {
      effectRegistries: {
        shopItem: {
          stats: [
            "speed",
            "pickupRadius",
            "maxHp",
            "flatDamage",
            "attackRadius",
            "fireRate",
            "percentDamage",
            "relicFocus",
          ],
        },
      },
    },
    upgradeContent: {
      createUpgradeDefs: (weaponDefs) =>
        Object.entries(weaponDefs).map(([weaponId, weapon]) => ({
          id: weapon.upgradeId || `${weaponId}_damage`,
          weaponId,
        })),
      runUpgradeDefs: content.runUpgrades || [],
    },
    saveConfig: {
      saveKey: "tap-survivor-mvp-save-v2",
      legacySaveKey: "tap-survivor-mvp-save-v1",
      questOpenIds: (quest) => quest?.opens || [],
    },
    adapters: {
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
      initialGame,
      initialSave,
      gameplayAdapters: {
        onMissingAdapter: ({ name }) => calls.push(`gameplay:missing:${name}`),
        gameplaySystems: {
          combat: {
            createCombatSystem: (options) => {
              calls.push(
                `gameplay:combat:${Boolean(options.combatDamage?.createCombatDamageSystem)}:${Boolean(options.weaponFire?.createWeaponFireSystem)}`
              );
              return { updateWeapons: () => calls.push("gameplay:combat:update-weapons") };
            },
          },
          enemies: {
            createEnemySystem: (options) => {
              calls.push(
                `gameplay:enemies:${Boolean(options.enemyBehaviors?.createEnemyBehaviorSystem)}:${Boolean(options.enemySpawning?.createEnemySpawnSystem)}`
              );
              return { spawnEnemies: () => calls.push("gameplay:enemies:spawn") };
            },
          },
          enemyBehaviors: {
            createEnemyBehaviorSystem: () => {
              calls.push("gameplay:enemy-behaviors");
              return { updateEnemies: () => calls.push("gameplay:enemy-behaviors:update") };
            },
          },
          enemySpawning: {
            createEnemySpawnSystem: () => {
              calls.push("gameplay:enemy-spawning");
              return { spawnEnemies: () => calls.push("gameplay:enemy-spawning:spawn") };
            },
          },
          weaponBehaviors: {
            createWeaponBehaviorSystem: () => {
              calls.push("gameplay:weapon-behaviors");
              return { updateAreas: () => calls.push("gameplay:weapon-behaviors:update") };
            },
          },
          weaponFire: {
            createWeaponFireSystem: (options) => {
              calls.push(
                `gameplay:weapon-fire:${Boolean(options.weaponCooldowns?.createWeaponScaling)}:${Boolean(options.weaponTargeting?.nearestEnemy)}`
              );
              return { updateWeapons: () => calls.push("gameplay:weapon-fire:update") };
            },
          },
        },
      },
      progressionAdapters: {
        onMissingAdapter: ({ name }) => calls.push(`progression:missing:${name}`),
        progressionSystems: {
          levelUp: {
            createLevelUpSystem: (options) => {
              calls.push(
                `progression:level-up:${Boolean(options.levelUpChoices?.weightedChoices)}:${Boolean(options.contentRegistry?.weaponDefs)}`
              );
              return { showLevelUp: () => calls.push("progression:level-up:show") };
            },
          },
          progression: {
            createProgressionSystem: (options) => {
              calls.push(
                `progression:progression:${Boolean(options.contentRegistry?.questDefs)}:${Boolean(options.save?.persist)}`
              );
              return { getUpgradeTier: () => 2 };
            },
          },
          quests: {
            createQuestSystem: (options) => {
              calls.push(
                `progression:quests:${Boolean(options.contentRegistry?.questDefs)}:${Boolean(options.save?.persist)}`
              );
              return { openQuest: () => calls.push("progression:quests:open") };
            },
            questOpenIds: (quest) => {
              calls.push("progression:quests:open-ids");
              return [quest?.opensQuest, ...(quest?.opensQuests || [])].filter(Boolean);
            },
          },
          shop: {
            createShopSystem: (options) => {
              calls.push(
                `progression:shop:${Boolean(options.shopPricing?.createShopPricing)}:${Boolean(options.effects?.emptyShopBonuses)}`
              );
              return { renderShop: () => calls.push("progression:shop:render") };
            },
          },
          uiProgression: {
            createUiProgressionRenderer: (options) => {
              calls.push(
                `progression:ui:${Boolean(options.contentRegistry?.weaponDefs)}:${Boolean(options.levelUpChoices?.choiceId)}`
              );
              return { renderMeta: () => calls.push("progression:ui:render") };
            },
          },
          upgrades: {
            createUpgradeContent: (options) => {
              calls.push(
                `progression:upgrades:${Boolean(options.content?.weapons)}:${Boolean(options.effects?.applyRunUpgradeEffects)}`
              );
              return { runUpgradeDefs: [] };
            },
          },
        },
      },
      uiAdapters: {
        ui: uiSurface,
        runUi: {
          formatTime: (seconds) => `t:${Math.round(seconds)}`,
          getGameSpeed: () => Number(documentRef.body.dataset.gameSpeed || 1),
          maxEquippedWeapons: () => 6,
          renderDebug: () => calls.push("run-ui:render-debug"),
        },
        shellUi: {
          shellRelicController: {
            render: () => calls.push("shell-module:relic-render"),
          },
          shellView: {
            render: (state) => calls.push(`shell-module:render:${state.screen}`),
            setMenuOpen: (open) => calls.push(`shell-module:menu:${open}`),
            setScreen: (screen) => calls.push(`shell-module:screen:${screen}`),
          },
        },
        shopSystemAdapter: {
          closeShop: () => calls.push("shop:close"),
        },
      },
      spriteAdapters: {
        spriteSystem: {
          drawImage: (id) => calls.push(`sprites:draw-image:${id}`),
          drawSprite: (id) => calls.push(`sprites:draw-sprite:${id}`),
          loadSprites: () => calls.push("sprites:load"),
        },
      },
      platformAdapters: {
        canvas,
        debugSystem: {
          bind: () => calls.push("debug:bind"),
        },
        bannerSystem: {
          hideMovementGateBanner: () => calls.push("banner:hide-movement-gate"),
        },
        bindMovementInput: () => calls.push("input:bind"),
        loop: () => calls.push("loop"),
      },
      storageAdapters: {
        storage,
      },
      renderingAdapters: {
        onMissingRenderer: ({ name }) => calls.push(`render:missing:${name}`),
        renderers: {
          clearFrame: ({ platformAdapters }) => {
            calls.push(`render:clear:${platformAdapters.canvas.width}`);
            return true;
          },
          renderEnemies: ({ enemies, spriteAdapters }) => {
            calls.push(`render:enemies:${enemies.length}`);
            spriteAdapters.spriteSystem.drawSprite("enemy:render-fixture");
            return true;
          },
          renderFrame: ({ assetAdapters, game, spriteAdapters }) => {
            const resolver = assetAdapters.assets.createAssetResolver();
            calls.push(`render:frame:${Boolean(game)}:${resolver.weaponIcon("spark_bolt")}`);
            spriteAdapters.spriteSystem.drawImage("background:tower_floor");
            return true;
          },
          renderHud: ({ game, uiAdapters }) => {
            calls.push(`render:hud:${game?.towerFloor}:${uiAdapters.ui === uiSurface}`);
            return true;
          },
          renderSkillRail: ({ game, spriteAdapters }) => {
            calls.push(`render:skill-rail:${game?.player?.equippedWeapons?.length || 0}`);
            spriteAdapters.spriteSystem.drawSprite("weaponIcon:spark_bolt");
            return true;
          },
        },
      },
      renderMetaSink: ({ game, save }) => {
        calls.push(`render-meta:${Boolean(game)}:${save.coins}`);
      },
    },
  },
});

const dependencySlots = entrypoint.dependencies.moduleSystems;
const stateStore = dependencySlots.gameStateStore;
check(
  "module runtime test entrypoint uses module-native dependency bag path",
  Boolean(dependencySlots?.contentRegistry?.weaponDefs?.spark_bolt) &&
    typeof dependencySlots?.effects?.applyShopItemEffectToRun === "function"
);
check(
  "module-native dependency bag exposes expected module-native slot inventory",
  MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("contentRegistry") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("gameStateStore") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("gameRuntime") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("moduleRuntimeAssetsAdapter") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("moduleRuntimeAudioAdapter") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("moduleRuntimeGameplayAdapter") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("moduleRuntimeProgressionAdapter") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("moduleRuntimeRenderingAdapter") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("moduleRuntimeStorageAdapter") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("levelUpChoices") &&
    MODULE_NATIVE_GAME_DEPENDENCY_SLOTS.includes("runUpdate")
);
check(
  "module-native state store owns state persistence slot inventory",
  MODULE_NATIVE_STATE_PERSISTENCE_SLOTS.includes("getGame") &&
    MODULE_NATIVE_STATE_PERSISTENCE_SLOTS.includes("persist") &&
    MODULE_NATIVE_STATE_PERSISTENCE_SLOTS.includes("renderMeta")
);
check(
  "module-native state store routes storage through storage adapter bundle",
  INJECTED_STATE_PERSISTENCE_SLOTS.includes("storageAdapters") &&
    !INJECTED_STATE_PERSISTENCE_SLOTS.includes("storageAdapter")
);
check(
  "module game lifecycle owner exposes deterministic lifecycle API",
  ["init", "bind", "showTitle", "startRun", "tick", "render", "persist", "stop", "dispose"].every(
    (slot) =>
      MODULE_GAME_LIFECYCLE_OWNER_SLOTS.includes(slot) &&
      MODULE_GAME_LIFECYCLE_OWNER_PROOF_SLOTS.includes(slot)
  )
);
check(
  "module game lifecycle owner keeps low-level lifecycle dependencies explicit",
  MODULE_GAME_LIFECYCLE_OWNER_LOW_LEVEL_SLOTS.includes("dependencyBagOptions") &&
    MODULE_GAME_LIFECYCLE_OWNER_LOW_LEVEL_SLOTS.includes("dependencies") &&
    MODULE_GAME_LIFECYCLE_OWNER_LOW_LEVEL_SLOTS.includes("lifecycleHooks") &&
    MODULE_GAME_LIFECYCLE_OWNER_LOW_LEVEL_SLOTS.includes("platform")
);
check(
  "module runtime assets adapter owns asset proof slots",
  ["createAssetResolver", "weaponIcon", "runUpgradeIcon", "relicIcon", "choiceIconPath"].every(
    (slot) => MODULE_RUNTIME_ASSETS_ADAPTER_PROOF_SLOTS.includes(slot)
  ) && MODULE_RUNTIME_ASSETS_ADAPTER_SLOTS.includes("assets")
);
check(
  "module runtime assets adapter keeps low-level asset manifest explicit",
  MODULE_RUNTIME_ASSETS_ADAPTER_LOW_LEVEL_SLOTS.includes("assetDefs")
);
check(
  "module runtime audio adapter owns audio proof slots",
  ["createAudioSystem", "play", "playWeapon", "playRunUpgrade", "playStartLaugh"].every(
    (slot) => MODULE_RUNTIME_AUDIO_ADAPTER_PROOF_SLOTS.includes(slot)
  ) && MODULE_RUNTIME_AUDIO_ADAPTER_SLOTS.includes("audio")
);
check(
  "module runtime audio adapter keeps low-level audio dependencies explicit",
  MODULE_RUNTIME_AUDIO_ADAPTER_LOW_LEVEL_SLOTS.includes("audioFactory") &&
    MODULE_RUNTIME_AUDIO_ADAPTER_LOW_LEVEL_SLOTS.includes("audioContextFactory")
);
check(
  "module runtime platform adapter owns completed platform proof slots",
  ["bindMovementInput", "canvas", "loop", "bannerSystem", "debugSystem"].every(
    (slot) =>
      MODULE_RUNTIME_PLATFORM_ADAPTER_PROOF_SLOTS.includes(slot) &&
      MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS.includes(slot)
  )
);
check(
  "module runtime platform adapter binds residual debug banner and input systems",
  ["debugSystem", "bannerSystem", "bindMovementInput"].every(
    (slot) =>
      MODULE_RUNTIME_PLATFORM_ADAPTER_PROOF_SLOTS.includes(slot) &&
      MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS.includes(slot)
  )
);
check(
  "module runtime platform adapter excludes non-platform runtime adapters",
  !MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS.includes("shellUiAdapter") &&
    !MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS.includes("spriteSystem") &&
    !MODULE_RUNTIME_PLATFORM_ADAPTER_SLOTS.includes("ui")
);
check(
  "module runtime rendering adapter owns rendering proof slots",
  ["clearFrame", "renderFrame", "renderHud", "renderEnemies", "renderSkillRail"].every((slot) =>
    MODULE_RUNTIME_RENDERING_ADAPTER_PROOF_SLOTS.includes(slot)
  ) &&
    ["rendering", "renderHud", "renderEnemies", "renderSkillRail"].every((slot) =>
      MODULE_RUNTIME_RENDERING_ADAPTER_SLOTS.includes(slot)
    )
);
check(
  "module runtime rendering adapter keeps low-level render dependencies explicit",
  MODULE_RUNTIME_RENDERING_ADAPTER_LOW_LEVEL_SLOTS.includes("renderers") &&
    MODULE_RUNTIME_RENDERING_ADAPTER_LOW_LEVEL_SLOTS.includes("platformAdapters") &&
    MODULE_RUNTIME_RENDERING_ADAPTER_LOW_LEVEL_SLOTS.includes("spriteAdapters") &&
    MODULE_RUNTIME_RENDERING_ADAPTER_LOW_LEVEL_SLOTS.includes("assetAdapters") &&
    MODULE_RUNTIME_RENDERING_ADAPTER_LOW_LEVEL_SLOTS.includes("uiAdapters")
);
check(
  "module runtime gameplay adapter owns gameplay facade proof slots",
  ["createCombatSystem", "createEnemySystem", "createEnemyBehaviorSystem", "createEnemySpawnSystem", "createWeaponBehaviorSystem", "createWeaponFireSystem"].every(
    (slot) => MODULE_RUNTIME_GAMEPLAY_ADAPTER_PROOF_SLOTS.includes(slot)
  ) &&
    ["combat", "enemies", "enemyBehaviors", "enemySpawning", "weaponBehaviors", "weaponFire"].every(
      (slot) => MODULE_RUNTIME_GAMEPLAY_ADAPTER_SLOTS.includes(slot)
    )
);
check(
  "module runtime gameplay adapter keeps low-level gameplay dependencies explicit",
  MODULE_RUNTIME_GAMEPLAY_ADAPTER_LOW_LEVEL_SLOTS.includes("gameplaySystems") &&
    MODULE_RUNTIME_GAMEPLAY_ADAPTER_LOW_LEVEL_SLOTS.includes("combatDamage") &&
    MODULE_RUNTIME_GAMEPLAY_ADAPTER_LOW_LEVEL_SLOTS.includes("weaponCooldowns") &&
    MODULE_RUNTIME_GAMEPLAY_ADAPTER_LOW_LEVEL_SLOTS.includes("weaponProjectiles") &&
    MODULE_RUNTIME_GAMEPLAY_ADAPTER_LOW_LEVEL_SLOTS.includes("weaponTargeting")
);
check(
  "module runtime progression adapter owns progression shop facade proof slots",
  [
    "createProgressionSystem",
    "createQuestSystem",
    "createUpgradeContent",
    "createLevelUpSystem",
    "createShopSystem",
    "createUiProgressionRenderer",
  ].every((slot) => MODULE_RUNTIME_PROGRESSION_ADAPTER_PROOF_SLOTS.includes(slot)) &&
    ["progression", "quests", "upgrades", "levelUp", "shop", "uiProgression"].every((slot) =>
      MODULE_RUNTIME_PROGRESSION_ADAPTER_SLOTS.includes(slot)
    )
);
check(
  "module runtime progression adapter keeps low-level progression dependencies explicit",
  MODULE_RUNTIME_PROGRESSION_ADAPTER_LOW_LEVEL_SLOTS.includes("progressionSystems") &&
    MODULE_RUNTIME_PROGRESSION_ADAPTER_LOW_LEVEL_SLOTS.includes("contentRegistry") &&
    MODULE_RUNTIME_PROGRESSION_ADAPTER_LOW_LEVEL_SLOTS.includes("levelUpChoices") &&
    MODULE_RUNTIME_PROGRESSION_ADAPTER_LOW_LEVEL_SLOTS.includes("shopPricing") &&
    MODULE_RUNTIME_PROGRESSION_ADAPTER_LOW_LEVEL_SLOTS.includes("save")
);
check(
  "module runtime sprite adapter owns sprite/render proof slots",
  ["loadSprites", "drawImage", "drawSprite"].every((slot) =>
    MODULE_RUNTIME_SPRITE_ADAPTER_PROOF_SLOTS.includes(slot)
  ) && MODULE_RUNTIME_SPRITE_ADAPTER_SLOTS.includes("spriteSystem")
);
check(
  "module runtime sprite and asset adapters bind residual sprite system",
  MODULE_RUNTIME_SPRITE_ADAPTER_SLOTS.includes("spriteSystem") &&
    MODULE_RUNTIME_ASSETS_ADAPTER_SLOTS.includes("assets") &&
    ["loadSprites", "drawImage", "drawSprite"].every((slot) =>
      MODULE_RUNTIME_SPRITE_ADAPTER_PROOF_SLOTS.includes(slot)
    ) &&
    MODULE_RUNTIME_ASSETS_ADAPTER_PROOF_SLOTS.includes("createAssetResolver")
);
check(
  "module runtime sprite adapter keeps low-level sprite system explicit",
  MODULE_RUNTIME_SPRITE_ADAPTER_LOW_LEVEL_SLOTS.includes("spriteSystem")
);
check(
  "module runtime storage adapter owns storage proof slots",
  ["getSaveRaw", "setSaveRaw", "removeSaveRaw", "setCorruptBackupRaw"].every((slot) =>
    MODULE_RUNTIME_STORAGE_ADAPTER_PROOF_SLOTS.includes(slot)
  ) && MODULE_RUNTIME_STORAGE_ADAPTER_SLOTS.includes("storageAdapter")
);
check(
  "module runtime storage adapter keeps low-level storage backend explicit",
  MODULE_RUNTIME_STORAGE_ADAPTER_LOW_LEVEL_SLOTS.includes("storage")
);
check(
  "module runtime UI adapter bundle owns targeted UI proof slots",
  ["runUiAdapter", "shellUiAdapter", "shopSystemAdapter", "ui"].every(
    (slot) =>
      MODULE_RUNTIME_UI_ADAPTER_PROOF_SLOTS.includes(slot) &&
      MODULE_RUNTIME_UI_ADAPTER_SLOTS.includes(slot)
  )
);
check(
  "module runtime UI adapter bundle keeps low-level UI dependencies explicit",
  MODULE_RUNTIME_UI_ADAPTER_LOW_LEVEL_SLOTS.includes("ui") &&
    MODULE_RUNTIME_UI_ADAPTER_LOW_LEVEL_SLOTS.includes("shopSystemAdapter")
);
check(
  "module-native dependency bag reclassifies platform services into platform adapter",
  !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("getGame") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("assetAdapters") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("audioAdapters") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("gameplayAdapters") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("progressionAdapters") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("persist") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("bindMovementInput") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("canvas") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("loop") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("bannerSystem") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("debugSystem") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("platformAdapters") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("renderingAdapters") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("uiAdapters") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("runUiAdapter") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("shellUiAdapter") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("shopSystemAdapter") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("spriteSystem") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("ui") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("renderMetaSink") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("spriteAdapters") &&
    INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("storageAdapters") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("storageAdapter") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("rendering") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("renderHud") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("renderEnemies") &&
    !INJECTED_GAME_DEPENDENCY_ADAPTER_SLOTS.includes("renderSkillRail")
);
check(
  "module-native dependency bag keeps classic-only slots explicit",
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("assets") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("audio") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("rendering") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("renderHud") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("renderEnemies") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("renderSkillRail") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("combat") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("enemyBehaviors") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("enemySpawning") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("enemies") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("levelUp") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("progression") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("quests") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("shop") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("uiProgression") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("upgrades") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("weaponBehaviors") &&
    !CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes("weaponFire")
);
check(
  "module-native dependency bag has no unresolved residual classic-only subsystem slots",
  CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.length === 0 &&
    !["debug", "gameBanners", "input", "sprites"].some((slot) =>
      CLASSIC_ONLY_GAME_DEPENDENCY_SLOTS.includes(slot)
    )
);
check(
  "module-native state store normalizes initial save through canonical save modules",
  stateStore.getSave().coins === 14 &&
    stateStore.getSave().towerFloor === 1 &&
    stateStore.getSave().unlockedWeapons.includes("spark_bolt") &&
    Object.keys(stateStore.getSave().shopPurchases).length === 0
);
check(
  "module runtime test entrypoint loadSave routes through storage adapter bundle",
  calls.includes("storage:getItem:tap-survivor-mvp-save-v2")
);

entrypoint.runtime.setGameSpeed(5);
canvas.listeners.get("mousedown")({ clientX: 640, clientY: 270 });
const afterTapGlobals = tapSurvivorGlobalNames();

const replacedGame = {
  bossSpawned: false,
  elapsed: 12,
  enemies: [],
  kills: 1,
  laserDamage: 2,
  lastFloorClear: null,
  running: true,
  paused: false,
  awaitingFirstMoveInput: false,
  towerFloor: 1,
  player: { equippedWeapons: ["spark_bolt"], hp: 80, level: 2, maxHp: 100, targetX: 5, targetY: 6 },
};
entrypoint.dependencies.setGame(replacedGame);
entrypoint.dependencies.setSave({ coins: 3.9, towerFloor: 0, unlockedWeapons: [] });
entrypoint.dependencies.persist();
entrypoint.dependencies.renderMeta();
entrypoint.lifecycle.showTitle();
entrypoint.lifecycle.startRun();
entrypoint.lifecycle.tick(0.016);
entrypoint.lifecycle.render({ source: "lifecycle-smoke" });
entrypoint.lifecycle.persist();
entrypoint.lifecycle.stop("manual-stop");
const stoppedRenderResult = entrypoint.lifecycle.render({ source: "stopped-smoke" });
const lifecycleStoppedGame = entrypoint.dependencies.getGame();
entrypoint.lifecycle.dispose();
const disposedTickResult = entrypoint.lifecycle.tick(0.016);
entrypoint.dependencies.setGame(replacedGame);
entrypoint.dependencies.setSave({ coins: 3.9, towerFloor: 0, unlockedWeapons: [] });
entrypoint.dependencies.runUi.hideEndScreen();
entrypoint.dependencies.shellUi.closeRunMenu(false);
entrypoint.dependencies.shellUi.showTitleScreen();
entrypoint.dependencies.shopSystem.closeShop();
entrypoint.dependencies.spriteSystem.drawImage("player");
entrypoint.dependencies.spriteSystem.drawSprite("player");
entrypoint.dependencies.rendering.clearFrame();
entrypoint.dependencies.rendering.renderFrame(entrypoint.dependencies.getGame());
entrypoint.dependencies.renderHud.renderHud(entrypoint.dependencies.getGame());
entrypoint.dependencies.renderEnemies.renderEnemies([{ id: "enemy-fixture" }]);
entrypoint.dependencies.renderSkillRail.renderSkillRail(entrypoint.dependencies.getGame());
entrypoint.dependencies.combat.createCombatSystem({ marker: "combat" }).updateWeapons();
entrypoint.dependencies.enemies.createEnemySystem({ marker: "enemies" }).spawnEnemies();
entrypoint.dependencies.enemyBehaviors.createEnemyBehaviorSystem({ marker: "enemy-behaviors" }).updateEnemies();
entrypoint.dependencies.enemySpawning.createEnemySpawnSystem({ marker: "enemy-spawning" }).spawnEnemies();
entrypoint.dependencies.weaponBehaviors.createWeaponBehaviorSystem({ marker: "weapon-behaviors" }).updateAreas();
entrypoint.dependencies.weaponFire.createWeaponFireSystem({ marker: "weapon-fire" }).updateWeapons();
entrypoint.dependencies.levelUp.createLevelUpSystem({ marker: "level-up" }).showLevelUp();
entrypoint.dependencies.progression.createProgressionSystem({ marker: "progression" }).getUpgradeTier();
entrypoint.dependencies.quests.createQuestSystem({ marker: "quests" }).openQuest();
entrypoint.dependencies.quests.questOpenIds({ opensQuest: "a", opensQuests: ["b"] });
entrypoint.dependencies.upgrades.createUpgradeContent({ marker: "upgrades" });
entrypoint.dependencies.shop.createShopSystem({ marker: "shop" }).renderShop();
entrypoint.dependencies.uiProgression.createUiProgressionRenderer({ marker: "ui" }).renderMeta();
entrypoint.dependencies.moduleSystems.moduleRuntimeProgressionAdapter.missingProgressionAdapterFallback(
  "manual-missing"
);
entrypoint.dependencies.moduleSystems.moduleRuntimeGameplayAdapter.missingGameplayAdapterFallback(
  "manual-missing"
);
entrypoint.dependencies.moduleSystems.moduleRuntimeRenderingAdapter.rendering.missingRendererFallback(
  "manual-missing"
);
const assetResolver = entrypoint.dependencies.assets.createAssetResolver();
const audioSystem = entrypoint.dependencies.audio.createAudioSystem();
audioSystem.playWeapon("spark_bolt", { minGapMs: 0 });
audioSystem.playStartLaugh();

check(
  "module runtime test entrypoint initializes runtime through UI adapter bundle",
  calls.includes("shell-module:render:title") && calls.includes("raf")
);
check(
  "module runtime test entrypoint routes run UI adapter through UI adapter bundle",
  uiSurface.runHud.textContent.includes("Speed x5") &&
    calls.includes("run-ui:render-debug") &&
    calls.includes("run-ui:end-hidden")
);
check(
  "module runtime test entrypoint routes shell UI adapter through UI adapter bundle",
  calls.includes("shell-module:menu:false") && calls.includes("shell-module:render:title")
);
check(
  "module runtime test entrypoint routes shop system adapter through UI adapter bundle",
  calls.includes("shop:close")
);
check(
  "module runtime test entrypoint routes sprite/render services through sprite adapter bundle",
  calls.includes("sprites:load") &&
    calls.includes("sprites:draw-image:player") &&
    calls.includes("sprites:draw-sprite:player")
);
check(
  "module runtime test entrypoint routes frame render facade through rendering adapter",
  calls.includes("render:clear:960") &&
    calls.some((call) => call.startsWith("render:frame:true:")) &&
    calls.includes("sprites:draw-image:background:tower_floor")
);
check(
  "module runtime test entrypoint routes HUD render facade through rendering adapter",
  calls.includes("render:hud:1:true")
);
check(
  "module runtime test entrypoint routes enemy render facade through rendering adapter",
  calls.includes("render:enemies:1") && calls.includes("sprites:draw-sprite:enemy:render-fixture")
);
check(
  "module runtime test entrypoint routes skill rail render facade through rendering adapter",
  calls.includes("render:skill-rail:1") && calls.includes("sprites:draw-sprite:weaponIcon:spark_bolt")
);
check(
  "module runtime test entrypoint keeps missing renderers safe",
  calls.includes("render:missing:manual-missing")
);
check(
  "module runtime test entrypoint routes gameplay facades through gameplay adapter",
  calls.includes("gameplay:combat:true:true") &&
    calls.includes("gameplay:enemies:true:true") &&
    calls.includes("gameplay:enemy-behaviors") &&
    calls.includes("gameplay:enemy-spawning") &&
    calls.includes("gameplay:weapon-behaviors") &&
    calls.includes("gameplay:weapon-fire:true:true")
);
check(
  "module runtime test entrypoint keeps missing gameplay adapters safe",
  calls.includes("gameplay:missing:manual-missing")
);
check(
  "module runtime test entrypoint routes progression shop facades through progression adapter",
  calls.includes("progression:progression:true:true") &&
    calls.includes("progression:quests:true:true") &&
    calls.includes("progression:upgrades:true:true") &&
    calls.includes("progression:level-up:true:true") &&
    calls.includes("progression:shop:true:true") &&
    calls.includes("progression:ui:true:true") &&
    calls.includes("progression:quests:open-ids")
);
check(
  "module runtime test entrypoint keeps missing progression adapters safe",
  calls.includes("progression:missing:manual-missing")
);
check(
  "module runtime test entrypoint routes asset services through assets adapter",
  assetResolver.weaponIcon("spark_bolt") === content.assets.sprites.weapons.spark_bolt.iconSrc &&
    assetResolver.choiceIconPath({ runUpgradeId: "run_move_speed" }) ===
      content.assets.sprites.runUpgrades.run_move_speed.iconSrc &&
    assetResolver.weaponIcon("missing_weapon") === "fallback.png"
);
check(
  "module runtime test entrypoint routes audio services through audio adapter",
  calls.includes(`audio:play:${content.assets.sfx.weapons.spark_bolt}`) &&
    calls.includes("audio-context:start-laugh")
);
check(
  "module runtime test entrypoint routes generic UI surface through UI adapter bundle",
  entrypoint.dependencies.ui === uiSurface
);
check(
  "module runtime test entrypoint routes movement input through platform adapter",
  calls.includes("input:bind")
);
check(
  "module runtime test entrypoint routes debug hooks through platform adapter",
  calls.includes("debug:bind")
);
check(
  "module runtime test entrypoint routes loop scheduling through platform adapter",
  runtimeGlobal.frameCallback === entrypoint.dependencies.loop && calls.includes("raf")
);
check("module runtime test entrypoint updates speed through injected document", documentRef.body.dataset.gameSpeed === "5");
check(
  "module runtime test entrypoint routes canvas and banner hooks through platform adapter",
  initialGame.awaitingFirstMoveInput === false && calls.includes("banner:hide-movement-gate")
);
check(
  "module runtime test entrypoint routes residual systems through existing adapters",
  calls.includes("debug:bind") &&
    calls.includes("input:bind") &&
    calls.includes("banner:hide-movement-gate") &&
    calls.includes("sprites:load") &&
    calls.includes("sprites:draw-image:player") &&
    calls.includes("sprites:draw-sprite:player")
);
check(
  "module runtime test entrypoint creates lifecycle owner",
  typeof entrypoint.lifecycle?.init === "function" &&
    entrypoint.lifecycle.dependencies === entrypoint.dependencies &&
    entrypoint.lifecycle.runtime === entrypoint.runtime
);
check(
  "module lifecycle init and shell title route through module dependency bag",
  calls.includes("shell-module:render:title") && calls.includes("raf")
);
check(
  "module lifecycle startRun reaches run-start-adjacent module path",
  calls.includes("lifecycle:reset") &&
    calls.includes("shop:close") &&
    calls.includes("level-up:hidden")
);
check(
  "module lifecycle tick routes through canonical run update path",
  calls.includes("lifecycle:update:0.016") &&
    calls.includes("lifecycle:map") &&
    calls.includes("lifecycle:quests:survive:0.016") &&
    calls.includes("lifecycle:combat:update-weapons") &&
    calls.includes("lifecycle:pickup:xp")
);
check(
  "module lifecycle render routes through rendering adapter",
  calls.includes("render:clear:960") &&
    calls.some((call) => call.startsWith("render:frame:true:")) &&
    calls.includes("render:hud:1:true") &&
    calls.includes("render:skill-rail:1")
);
check(
  "module lifecycle persist routes through state store and storage adapter",
  calls.includes("storage:setItem")
);
check(
  "module lifecycle stop and dispose close lifecycle ownership",
  stoppedRenderResult === false &&
    disposedTickResult === false &&
    calls.includes("lifecycle:dispose")
);
check(
  "module runtime test entrypoint getGame setGame route through state store",
  entrypoint.dependencies.getGame() === replacedGame && stateStore.getGame() === replacedGame
);
check(
  "module runtime test entrypoint getSave setSave route through state store",
  entrypoint.dependencies.getSave().coins === 3 &&
    entrypoint.dependencies.getSave().towerFloor === 1 &&
    stateStore.getSave() === entrypoint.dependencies.getSave()
);
check(
  "module runtime test entrypoint persist writes through injected storage backend",
  JSON.parse(storage.store.get("tap-survivor-mvp-save-v2")).coins === 3 && calls.includes("storage:setItem")
);
entrypoint.dependencies.saveSystem.removeSave();
check(
  "module runtime test entrypoint removeSave routes through storage adapter bundle",
  !storage.store.has("tap-survivor-mvp-save-v2") && calls.includes("storage:removeItem")
);
storage.store.set("tap-survivor-mvp-save-v2", "{not-json");
const corruptLoadedSave = entrypoint.dependencies.saveSystem.loadSave();
check(
  "module runtime test entrypoint handles corrupt save safely through canonical save modules",
  corruptLoadedSave.saveVersion >= 1 &&
    entrypoint.dependencies.saveSystem.getLastLoadWarning() === "corrupt-save" &&
    storage.store.get("tap-survivor-mvp-save-v2-corrupt-backup") === "{not-json"
);
check(
  "module runtime test entrypoint renderMeta reads state through injected sink",
  calls.includes("render-meta:true:3")
);
check(
  "module runtime test entrypoint does not publish TapSurvivor globals",
  JSON.stringify(afterTapGlobals) === JSON.stringify(beforeTapGlobals)
);

if (process.exitCode) {
  console.error("\nModule runtime entrypoint smoke failed.");
  process.exit(process.exitCode);
}

console.log("\nModule runtime entrypoint smoke passed.");

function check(name, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) process.exitCode = 1;
}

function tapSurvivorGlobalNames() {
  return Object.getOwnPropertyNames(globalThis)
    .filter((name) => name.startsWith("TapSurvivor"))
    .sort();
}

function createMemoryStorage() {
  const store = new Map();
  return {
    store,
    getItem: (key) => {
      calls.push(`storage:getItem:${key}`);
      return store.get(key) || null;
    },
    removeItem: (key) => {
      calls.push("storage:removeItem");
      return store.delete(key);
    },
    setItem: (key, value) => {
      calls.push("storage:setItem");
      store.set(key, String(value));
    },
  };
}
