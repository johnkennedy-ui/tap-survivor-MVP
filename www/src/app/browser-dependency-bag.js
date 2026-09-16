import { createBrowserAudioAdapters } from "./browser-audio-adapters.js";
import { createBrowserGameplaySystems } from "./browser-gameplay-adapters.js";
import { createBrowserPlatformAdapters } from "./browser-platform-adapters.js";
import { createBrowserProgressionSystems } from "./browser-progression-adapters.js";
import { createBrowserRenderingAdapters } from "./browser-rendering-adapters.js";
import { createBrowserSpriteSystem } from "./browser-sprite-system.js";
import { createBrowserUi, createBrowserUiAdapters } from "./browser-ui-adapters.js";
import { createBrowserPerformanceTrace } from "./performance-trace.js";

export const BROWSER_DEPENDENCY_BAG_PROOF_SLOTS = Object.freeze([
  "assetAdapters",
  "audioAdapters",
  "gameplayAdapters",
  "platformAdapters",
  "progressionAdapters",
  "renderingAdapters",
  "spriteAdapters",
  "storageAdapters",
  "uiAdapters",
]);

export const BROWSER_PLATFORM_ADAPTER_PROOF_SLOTS = Object.freeze([
  "bannerSystem",
  "bindMovementInput",
  "canvas",
  "debugSystem",
  "loop",
]);

export const BROWSER_RENDERING_ADAPTER_PROOF_SLOTS = Object.freeze([
  "clearFrame",
  "renderEnemies",
  "renderFrame",
  "renderHud",
  "renderPlayer",
  "renderSkillRail",
]);

export const BROWSER_SPRITE_ADAPTER_PROOF_SLOTS = Object.freeze([
  "drawImage",
  "drawSprite",
  "loadSprites",
]);

export const BROWSER_GAMEPLAY_ADAPTER_PROOF_SLOTS = Object.freeze([
  "combat",
  "enemies",
  "enemyBehaviors",
  "enemySpawning",
  "weaponBehaviors",
  "weaponFire",
]);

export const BROWSER_PROGRESSION_ADAPTER_PROOF_SLOTS = Object.freeze([
  "levelUp",
  "progression",
  "quests",
  "shop",
  "uiProgression",
  "upgrades",
]);

export const BROWSER_UI_ADAPTER_PROOF_SLOTS = Object.freeze([
  "runUiAdapter",
  "shellUiAdapter",
  "shopSystemAdapter",
  "ui",
]);

export function createBrowserDependencyBagOptions(options = {}) {
  const globalRef = requireBrowserGlobalRef(options.globalRef);
  const documentRef = options.documentRef || globalRef.document;
  const content = options.content || {};
  const canvas = options.canvas || documentRef?.getElementById?.("game") || createCanvasFallback();
  const ui = options.ui || createBrowserUi({ documentRef, canvas });
  const storage = options.storage || globalRef.localStorage || createMemoryStorage();
  const performanceTrace = createBrowserPerformanceTrace({
    canvas,
    documentRef,
    globalRef,
  });

  return {
    content,
    contentSchema: options.contentSchema || {},
    performanceTrace,
    random: options.random,
    saveConfig: {
      legacySaveKey: "tap-survivor-mvp-save-v1",
      questOpenIds: (quest) => [quest?.opensQuest, ...(quest?.opensQuests || [])].filter(Boolean),
      saveKey: "tap-survivor-mvp-save-v2",
      ...(options.saveConfig || {}),
    },
    shopPricingConfig: options.shopPricingConfig || content.tuning?.shop || {},
    upgradeContent: options.upgradeContent || {
      createUpgradeDefs: (weaponDefs = {}) =>
        Object.entries(weaponDefs).map(([weaponId, weapon]) => ({
          id: weapon.upgradeId || `${weaponId}_damage`,
          requiresWeapon: weaponId,
        })),
      runUpgradeDefs: content.runUpgrades || [],
    },
    adapters: {
      assetAdapters: options.assetAdapters || {},
      audioAdapters:
        options.audioAdapters ||
        createBrowserAudioAdapters({
          globalRef,
        }),
      gameplayAdapters: options.gameplayAdapters || {
        gameplaySystems: createBrowserGameplaySystems(),
      },
      initialGame: options.initialGame || null,
      initialSave: options.initialSave,
      platformAdapters:
        options.platformAdapters ||
        createBrowserPlatformAdapters({
          canvas,
          globalRef,
          ui,
        }),
      progressionAdapters: options.progressionAdapters || {
        progressionSystems: createBrowserProgressionSystems({
          documentRef,
          ui,
        }),
      },
      renderingAdapters:
        options.renderingAdapters ||
        createBrowserRenderingAdapters({
          canvas,
          canvasCommandSink: performanceTrace?.recordCanvasCommand,
          content,
          globalRef,
        }),
      renderMetaSink: options.renderMetaSink || (() => {}),
      spriteAdapters:
        options.spriteAdapters ||
        {
          spriteSystem: createBrowserSpriteSystem({
            assetDefs: content.assets || {},
            canvas,
            globalRef,
          }),
        },
      storageAdapters:
        options.storageAdapters ||
        {
          storage,
        },
      uiAdapters:
        options.uiAdapters ||
        createBrowserUiAdapters({
          documentRef,
          content,
          globalRef,
          onStartAudio: options.onStartAudio,
          onStartRun: options.onStartRun,
          saveConfig: {
            legacySaveKey: "tap-survivor-mvp-save-v1",
            saveKey: "tap-survivor-mvp-save-v2",
            ...(options.saveConfig || {}),
          },
          shopPricingConfig: options.shopPricingConfig || content.tuning?.shop || {},
          ui,
        }),
    },
  };
}

function requireBrowserGlobalRef(globalRef) {
  if (
    !globalRef ||
    (typeof globalRef !== "object" && typeof globalRef !== "function")
  ) {
    throw new Error("Missing Tap Survivor platform capability: globalRef");
  }
  return globalRef;
}

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) || null,
    removeItem: (key) => store.delete(key),
    setItem: (key, value) => store.set(key, String(value)),
  };
}

function playerFacesLeft(player) {
  return Number.isFinite(player?.targetX) && Number.isFinite(player?.x) && player.targetX < player.x - 2;
}

function playerSpriteId(player) {
  if (player?.actionTimer > 0 && player?.actionSprite) return `player:${player.actionSprite}`;
  if (player?.moving) return "player:walk";
  return "player";
}

function createCanvasFallback() {
  return {
    height: 540,
    width: 960,
    addEventListener() {},
    getBoundingClientRect: () => ({ height: 540, left: 0, top: 0, width: 960 }),
    getContext: () => null,
  };
}
