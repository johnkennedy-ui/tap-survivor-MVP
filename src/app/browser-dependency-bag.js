import { createCombatSystem } from "../modules/combat.js";
import { createEnemyBehaviorSystem } from "../modules/enemy-behaviors.js";
import { createEnemySpawnSystem } from "../modules/enemy-spawning.js";
import { createEnemySystem } from "../modules/enemies.js";
import { createLevelUpSystem } from "../modules/level-up.js";
import { createRelicSystem } from "../modules/relics.js";
import { createProgressionSystem } from "../modules/progression.js";
import { createQuestSystem, questOpenIds } from "../modules/quests.js";
import { createShellRelicUi } from "../modules/shell-relic-ui.js";
import { createShopSystem } from "../modules/shop.js";
import { createUiProgressionRenderer } from "../modules/ui-progression.js";
import { createUpgradeContent } from "../modules/upgrades.js";
import { createWeaponBehaviorSystem } from "../modules/weapon-behaviors.js";
import { createWeaponFireSystem } from "../modules/weapon-fire.js";

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

  return {
    content,
    contentSchema: options.contentSchema || {},
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

function createBrowserUi({ documentRef, canvas }) {
  const get = (id) => documentRef?.getElementById?.(id) || createElementFallback(id);
  return {
    canvas,
    choices: get("choices"),
    closeEnd: get("closeEnd"),
    closeEndX: get("closeEndX"),
    closeLevelUp: get("closeLevelUp"),
    closeMenu: get("closeMenu"),
    closeShop: get("closeShop"),
    closeShopBottom: get("closeShopBottom"),
    debugPanel: get("debugPanel"),
    debugStats: get("debugStats"),
    endScreen: get("endScreen"),
    exitRun: get("exitRun"),
    fullscreenButton: get("fullscreenButton"),
    levelUp: get("levelUp"),
    menuInventoryPanel: get("menuInventoryPanel"),
    menuInventoryTab: get("menuInventoryTab"),
    menuProgressPanel: get("menuProgressPanel"),
    menuProgressTab: get("menuProgressTab"),
    menuQpHud: get("menuQpHud"),
    menuQuests: get("menuQuests"),
    menuRelicInventory: get("menuRelicInventory"),
    menuRelicSlots: get("menuRelicSlots"),
    menuShopCoinHud: get("menuShopCoinHud"),
    menuShopItems: get("menuShopItems"),
    menuShopNotice: get("menuShopNotice"),
    menuShopPanel: get("menuShopPanel"),
    menuShopTab: get("menuShopTab"),
    menuTree: get("menuTree"),
    muteAudio: get("muteAudio"),
    openMenu: get("openMenu"),
    questBanner: get("questBanner"),
    relicChoice: get("relicChoice"),
    relicChoices: get("relicChoices"),
    relicChoiceText: get("relicChoiceText"),
    relicChoiceTitle: get("relicChoiceTitle"),
    runHud: get("runHud"),
    runMenu: get("runMenu"),
    runStats: get("runStats"),
    shopCoinHud: get("shopCoinHud"),
    shopItems: get("shopItems"),
    shopModal: get("shopModal"),
    shopNotice: get("shopNotice"),
    speedButtons: [...(documentRef?.querySelectorAll?.("[data-speed]") || [])],
    startTransition: get("startTransition"),
    titleScreen: get("titleScreen"),
    titleStartGame: get("titleStartGame"),
    toggleDebug: get("toggleDebug"),
  };
}

function createBrowserPlatformAdapters({ canvas, globalRef, ui }) {
  let frameHandler = null;

  function loop(now) {
    frameHandler?.(now);
    globalRef.requestAnimationFrame?.(loop);
  }

  loop.attachFrameHandler = (handler) => {
    frameHandler = handler;
    return loop;
  };

  return {
    bannerSystem: createBrowserBannerSystem({ globalRef, ui }),
    bindMovementInput({ canvas: targetCanvas = canvas, getGame }) {
      const setTarget = (event) => {
        const game = getGame?.();
        if (!game || !game.running || game.paused) return;
        const rect = targetCanvas.getBoundingClientRect();
        const point = event.touches ? event.touches[0] : event;
        game.player.targetX = ((point.clientX - rect.left) / rect.width) * targetCanvas.width;
        game.player.targetY = ((point.clientY - rect.top) / rect.height) * targetCanvas.height;
      };
      targetCanvas.addEventListener?.("mousedown", setTarget);
      targetCanvas.addEventListener?.("mousemove", (event) => {
        if (event.buttons === 1) setTarget(event);
      });
      targetCanvas.addEventListener?.("touchstart", (event) => {
        event.preventDefault?.();
        setTarget(event);
      });
      targetCanvas.addEventListener?.("touchmove", (event) => {
        event.preventDefault?.();
        setTarget(event);
      });
      return { setTarget };
    },
    canvas,
    debugSystem: {
      bind() {},
      render() {},
    },
    loop,
  };
}

function createBrowserGameplaySystems() {
  return {
    combat: { createCombatSystem },
    enemies: { createEnemySystem },
    enemyBehaviors: { createEnemyBehaviorSystem },
    enemySpawning: { createEnemySpawnSystem },
    weaponBehaviors: { createWeaponBehaviorSystem },
    weaponFire: { createWeaponFireSystem },
  };
}

function createBrowserProgressionSystems({ documentRef, ui }) {
  return {
    levelUp: {
      createLevelUpSystem: (options = {}) =>
        createLevelUpSystem({
          ...options,
          documentRef: options.documentRef || documentRef,
          ui: options.ui || ui,
        }),
    },
    progression: { createProgressionSystem },
    quests: { createQuestSystem, questOpenIds },
    shop: {
      createShopSystem: (options = {}) => createShopSystem({ documentRef, ...options }),
    },
    uiProgression: {
      createUiProgressionRenderer: (options = {}) =>
        createUiProgressionRenderer({
          ...options,
          documentRef,
        }),
    },
    upgrades: { createUpgradeContent },
  };
}

function createBrowserBannerSystem({ globalRef, ui }) {
  let bannerTimer = 0;
  const clearTimer = () => globalRef.clearTimeout?.(bannerTimer);
  function showBanner(message, duration = 5200) {
    if (!ui.questBanner || !message) return;
    ui.questBanner.textContent = message;
    ui.questBanner.classList?.remove?.("hidden");
    clearTimer();
    if (duration > 0) {
      bannerTimer = globalRef.setTimeout?.(() => ui.questBanner.classList?.add?.("hidden"), duration) || 0;
    }
  }
  return {
    hideMovementGateBanner() {
      clearTimer();
      ui.questBanner?.classList?.add?.("hidden");
    },
    showBanner,
    showMovementGateBanner() {
      showBanner("Click/tap to move", 0);
    },
    showOnceBanner(_id, message, duration) {
      showBanner(message, duration);
      return true;
    },
    showQuestBanner(quest, reward) {
      showBanner(`${quest?.name || "Quest"} complete +${reward || 0} QP`);
    },
  };
}

function createBrowserAudioAdapters({ globalRef }) {
  return {
    audioContextFactory: () => {
      const AudioContextCtor = globalRef.AudioContext || globalRef.webkitAudioContext;
      return typeof AudioContextCtor === "function" ? new AudioContextCtor() : null;
    },
    audioFactory: (src) => (typeof globalRef.Audio === "function" ? new globalRef.Audio(src) : null),
    clock: () => globalRef.performance?.now?.() || 0,
  };
}

function createBrowserRenderingAdapters({ canvas, content = {} }) {
  const context = canvas.getContext?.("2d");
  const diagnostics = canvas?.ownerDocument?.__TapSurvivorBrowserSmoke?.diagnostics;
  const weaponDefs = content.weapons || content.weaponDefs || {};
  const runUpgradeDefs = Array.isArray(content.runUpgrades) ? content.runUpgrades : [];
  const skillEffectSprites = content.assets?.sprites?.weapons || {};

  const call = (method, ...args) => {
    try {
      return typeof context?.[method] === "function" ? context[method](...args) : undefined;
    } catch {
      return undefined;
    }
  };
  const set = (property, value) => {
    try {
      if (context) context[property] = value;
    } catch {
      // Canvas properties are optional in deterministic fixtures.
    }
  };
  const number = (value, fallback = 0) => {
    const resolved = Number(value);
    return Number.isFinite(resolved) ? resolved : fallback;
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, number(value, min)));
  const list = (value) => (Array.isArray(value) ? value : []);

  return {
    renderers: {
      clearFrame() {
        call("clearRect", 0, 0, canvas.width || 0, canvas.height || 0);
        return true;
      },
      renderEnemies({ enemies = [], spriteAdapters }) {
        list(enemies).forEach((enemy) => drawEnemy(enemy, spriteAdapters));
        return true;
      },
      renderFrame({ game, spriteAdapters }) {
        const width = canvas.width || 0;
        const height = canvas.height || 0;
        drawArena(game, spriteAdapters, width, height);
        if (!game) {
          drawMenuHint();
          return true;
        }
        list(game.areas).forEach((area) => drawArea(area, spriteAdapters));
        list(game.weaponBursts).forEach(drawWeaponBurst);
        list(game.bossAttacks).forEach(drawBossAttack);
        list(game.xpDrops).forEach(drawXp);
        list(game.lootDrops).forEach((drop) => drawLoot(drop, spriteAdapters));
        list(game.bolts).forEach((bolt) => drawBolt(bolt, spriteAdapters));
        list(game.enemyBolts).forEach(drawEnemyBolt);
        list(game.beams).forEach((beam) => drawBeam(beam, spriteAdapters));
        list(game.pickupTexts).forEach(drawPickupText);
        return true;
      },
      renderHud({ game }) {
        drawBossSpawnNotice(game);
        drawBossHealthBar(game);
        drawBossSpecialBar(game);
        return true;
      },
      renderPlayer({ game, spriteAdapters }) {
        const player = game?.player;
        if (!player) return true;
        drawPlayerHpBar(player);
        const previousAlpha = number(context?.globalAlpha, 1);
        if (number(player.blinkTimer) > 0) {
          set("globalAlpha", 0.35 + Math.abs(Math.sin(number(player.blinkTimer) * 24)) * 0.65);
        }
        const spriteId = playerSpriteId(player);
        const size = Math.max(70, (player.radius || 16) * 3.8);
        const drawn =
          spriteAdapters?.spriteSystem?.drawSprite?.(spriteId, player.x || 0, player.y || 0, size, 0, {
            flipX: playerFacesLeft(player),
          }) ||
          (spriteId !== "player" &&
            spriteAdapters?.spriteSystem?.drawSprite?.("player", player.x || 0, player.y || 0, size, 0, {
              flipX: playerFacesLeft(player),
            }));
        if (!drawn) drawPlayerFallback(player);
        set("globalAlpha", previousAlpha);
        if (number(player.invincibleTimer) > 0) {
          set("strokeStyle", "rgba(88, 255, 157, 0.72)");
          set("lineWidth", 3);
          circlePath(player.x, player.y, number(player.radius, 16) + 8);
          call("stroke");
        }
        set("strokeStyle", "rgba(105, 210, 255, 0.28)");
        set("lineWidth", 2);
        circlePath(player.x, player.y, number(player.pickupRadius, 54));
        call("stroke");
        set("strokeStyle", "#dff6ff");
        set("lineWidth", 1);
        call("beginPath");
        call("moveTo", number(player.x), number(player.y));
        call("lineTo", number(player.targetX, player.x), number(player.targetY, player.y));
        call("stroke");
        diagnostics?.spriteDraws?.push?.({
          id: spriteId,
          kind: "renderPlayer",
          success: Boolean(drawn),
        });
        return true;
      },
      renderSkillRail({ game, spriteAdapters }) {
        drawSkillRail(game, spriteAdapters);
        return true;
      },
    },
  };

  function drawArena(game, spriteAdapters, width, height) {
    const backgroundId = game?.background?.spriteId || "background:tower_floor";
    const backgroundDrawn = spriteAdapters?.spriteSystem?.drawImage?.(
      backgroundId,
      0,
      0,
      width,
      height
    );
    if (!backgroundDrawn) {
      set("fillStyle", "#17202c");
      call("fillRect", 0, 0, width, height);
    }
    set("fillStyle", "rgba(10, 14, 20, 0.16)");
    call("fillRect", 0, 0, width, height);
    set("strokeStyle", backgroundDrawn ? "rgba(223, 246, 255, 0.08)" : "#243244");
    set("lineWidth", 1);
    for (let x = 0; x < width; x += 48) {
      call("beginPath");
      call("moveTo", x, 0);
      call("lineTo", x, height);
      call("stroke");
    }
    for (let y = 0; y < height; y += 48) {
      call("beginPath");
      call("moveTo", 0, y);
      call("lineTo", width, y);
      call("stroke");
    }
    if (game) drawTowerFloorBadge(game);
  }

  function drawMenuHint() {
    set("fillStyle", "#f3f6fb");
    set("font", "700 28px sans-serif");
    call("fillText", "Tap Survivor", 36, 58);
    set("font", "16px sans-serif");
    call("fillText", "Unlock weapons, then start a run.", 36, 88);
  }

  function drawEnemy(enemy, spriteAdapters) {
    const boss = Boolean(enemy?.boss);
    const radius = Math.max(6, number(enemy?.radius, boss ? 38 : 14));
    const spriteSize = boss ? Math.max(116, radius * 3.3) : Math.max(48, radius * 4.0);
    const id = enemy?.assetId || enemy?.type || enemy?.kind || enemy?.id || "default";
    const spriteId = `enemy:${id}`;
    const animationId = boss
      ? enemy?.bossKind || enemy?.bossAbilities?.[0] || "warden"
      : id;
    const animationState = boss
      ? bossAnimationState(enemy)
      : enemyAnimationState(enemy);
    const drawn = spriteAdapters?.spriteSystem?.drawSprite?.(
      spriteId,
      number(enemy?.x),
      number(enemy?.y),
      spriteSize,
      0,
      {
        animationId,
        animationState,
        flipX: enemyFacesLeft(enemy),
        sheetId: boss ? "bosses" : "enemies",
        time: number(enemy?.animTime),
      }
    );
    if (!drawn) drawEnemyFallback(enemy, radius, boss);
    if (boss) {
      const charging = enemy?.chargeState === "windup";
      const ringColor = charging ? "#ff3b3b" : enemy?.superBoss ? "#ff74c8" : "#ffd166";
      strokeEnemyRing(enemy, ringColor, charging ? 7 : enemy?.superBoss ? 6 : 4);
      const label = enemy?.superBoss
        ? "SUPER"
        : enemy?.bossKind === "turret"
          ? "TURRET"
          : enemy?.bossKind === "charger"
            ? "CHARGE"
            : "BOSS";
      drawText(label, number(enemy?.x) - label.length * 3.6, number(enemy?.y) - radius - 10, {
        color: "#f3f6fb",
        font: "700 14px sans-serif",
      });
    } else {
      drawEnemyFloorTint(enemy, spriteSize);
    }
    drawEnemyHpBar(enemy, radius, boss);
    if (enemy?.type === "skitter") {
      set("fillStyle", "#17202c");
      circlePath(enemy.x, enemy.y, 3);
      call("fill");
    } else if (enemy?.type === "bulwark") {
      strokeEnemyRing(enemy, "#dff6ff", 3);
    }
  }

  function drawEnemyFallback(enemy, radius, boss) {
    const x = number(enemy?.x);
    const y = number(enemy?.y);
    set("fillStyle", boss ? enemy?.color || "#ff4f8b" : enemy?.color || "#63d6b0");
    if (boss) {
      call("beginPath");
      call("moveTo", x, y - radius * 1.3);
      call("lineTo", x + radius * 1.1, y);
      call("lineTo", x, y + radius * 1.3);
      call("lineTo", x - radius * 1.1, y);
      call("closePath");
    } else {
      circlePath(x, y, radius);
    }
    call("fill");
    if (boss) {
      set("fillStyle", "#10141d");
      circlePath(x - radius * 0.35, y - radius * 0.14, 4);
      call("fill");
      circlePath(x + radius * 0.35, y - radius * 0.14, 4);
      call("fill");
    }
  }

  function drawEnemyFloorTint(enemy, spriteSize) {
    const floor = clamp(Math.floor(number(enemy?.towerFloor, 1)), 1, 100);
    const bucket = Math.floor((floor - 1) / 5);
    const progress = bucket / 19;
    const red = Math.round(52 + progress * 154);
    const green = Math.round(230 - progress * 190);
    const blue = Math.round(190 - progress * 162);
    const alpha = 0.12 + progress * 0.14;
    const previousComposite = context?.globalCompositeOperation;
    set("globalCompositeOperation", "multiply");
    set("fillStyle", `rgba(${red}, ${green}, ${blue}, ${alpha})`);
    circlePath(enemy.x, enemy.y, Math.max(number(enemy.radius, 8) + 4, spriteSize * 0.36));
    call("fill");
    set("globalCompositeOperation", previousComposite || "source-over");
    strokeEnemyRing(enemy, `rgba(${red}, ${green}, ${blue}, ${0.48 + progress * 0.28})`, 2 + progress * 2);
  }

  function drawEnemyHpBar(enemy, radius, boss) {
    if (!Number.isFinite(Number(enemy?.maxHp)) || !Number.isFinite(Number(enemy?.hp))) return;
    const width = boss ? Math.max(76, radius * 2.8) : Math.max(34, radius * 2.2);
    const height = boss ? 6 : 4;
    const x = number(enemy.x) - width / 2;
    const y = number(enemy.y) - radius - (boss ? 25 : 9);
    drawBar(x, y, width, height, clamp(number(enemy.hp) / Math.max(1, number(enemy.maxHp)), 0, 1), {
      fill: boss ? (enemy.superBoss ? "#ff74c8" : "#ff5f7a") : "#ff6b6b",
      border: boss ? "#f3f6fb" : "rgba(243, 246, 251, 0.72)",
    });
  }

  function strokeEnemyRing(enemy, color, width) {
    set("strokeStyle", color);
    set("lineWidth", width);
    circlePath(enemy?.x, enemy?.y, Math.max(1, number(enemy?.radius, 8)));
    call("stroke");
  }

  function drawEnemyBolt(bolt) {
    const speed = Math.max(1, Math.hypot(number(bolt?.vx), number(bolt?.vy)));
    const radius = Math.max(2, number(bolt?.radius, 5));
    const tailX = number(bolt?.x) - (number(bolt?.vx) / speed) * radius * 3.2;
    const tailY = number(bolt?.y) - (number(bolt?.vy) / speed) * radius * 3.2;
    const alpha = clamp(number(bolt?.life, 1) / Math.max(0.01, number(bolt?.maxLife, 1)), 0.3, 1);
    const color = bolt?.color || "#b794ff";
    set("globalAlpha", alpha);
    set("strokeStyle", withAlpha(bolt?.glowColor || color, 0.55));
    set("lineWidth", Math.max(4, radius * 0.8));
    call("beginPath");
    call("moveTo", tailX, tailY);
    call("lineTo", number(bolt?.x), number(bolt?.y));
    call("stroke");
    set("strokeStyle", bolt?.trailColor || color);
    set("lineWidth", Math.max(2, radius * 0.45));
    call("beginPath");
    call("moveTo", tailX, tailY);
    call("lineTo", number(bolt?.x), number(bolt?.y));
    call("stroke");
    set("fillStyle", withAlpha(bolt?.glowColor || color, 0.42));
    circlePath(bolt?.x, bolt?.y, radius + 4);
    call("fill");
    set("fillStyle", color);
    circlePath(bolt?.x, bolt?.y, radius);
    call("fill");
    set("strokeStyle", "#10141d");
    set("lineWidth", 2);
    circlePath(bolt?.x, bolt?.y, radius);
    call("stroke");
    set("globalAlpha", 1);
  }

  function drawXp(drop) {
    const radius = Math.max(3, number(drop?.radius, 6));
    set("fillStyle", "#78e08f");
    circlePath(drop?.x, drop?.y, radius);
    call("fill");
    set("strokeStyle", "#d9ff9f");
    set("lineWidth", 1.5);
    circlePath(drop?.x, drop?.y, radius);
    call("stroke");
  }

  function drawLoot(drop, spriteAdapters) {
    const radius = Math.max(4, number(drop?.radius, 7));
    if (drop?.type === "coin") {
      if (spriteAdapters?.spriteSystem?.drawSprite?.("ui:coin", drop.x, drop.y, Math.max(26, radius * 3.1))) return;
      set("fillStyle", "#ffd166");
      circlePath(drop?.x, drop?.y, radius);
      call("fill");
      set("strokeStyle", "#fff0a8");
      set("lineWidth", 2);
      circlePath(drop?.x, drop?.y, radius);
      call("stroke");
      return;
    }
    if (drop?.type === "heart" && spriteAdapters?.spriteSystem?.drawSprite?.("ui:heart", drop.x, drop.y, Math.max(28, radius * 3))) return;
    set("fillStyle", "#ff5f7a");
    call("beginPath");
    call("arc", number(drop?.x) - radius * 0.34, number(drop?.y) - radius * 0.18, radius * 0.5, 0, Math.PI * 2);
    call("arc", number(drop?.x) + radius * 0.34, number(drop?.y) - radius * 0.18, radius * 0.5, 0, Math.PI * 2);
    call("moveTo", number(drop?.x) - radius, number(drop?.y));
    call("lineTo", number(drop?.x), number(drop?.y) + radius);
    call("lineTo", number(drop?.x) + radius, number(drop?.y));
    call("closePath");
    call("fill");
  }

  function drawPickupText(text) {
    const alpha = clamp(number(text?.life, 0) / Math.max(0.01, number(text?.maxLife, 1)), 0, 1);
    set("globalAlpha", alpha);
    drawText(text?.text || "", text?.x, text?.y, {
      color: text?.color || "#f3f6fb",
      font: "700 14px sans-serif",
      align: "center",
    });
    set("globalAlpha", 1);
  }

  function drawBolt(bolt, spriteAdapters) {
    const weapon = weaponDefs[bolt?.weaponId] || {};
    const weaponId = bolt?.weaponId || "spark_bolt";
    const rotation = Math.atan2(number(bolt?.vy), number(bolt?.vx, 1));
    const tuning = skillEffectTuning(weaponId, weapon);
    const radius = Math.max(3, number(bolt?.radius, 5));
    const drawn = spriteAdapters?.spriteSystem?.drawSprite?.(
      `weapon:${weapon.assetId || weaponId}`,
      number(bolt?.x),
      number(bolt?.y),
      radius * 2 * tuning.scale,
      rotation,
      { alpha: tuning.alpha }
    );
    if (drawn) return;
    set("fillStyle", bolt?.color || weapon.color || "#ffd166");
    circlePath(bolt?.x, bolt?.y, radius);
    call("fill");
    set("strokeStyle", "rgba(255,255,255,0.72)");
    set("lineWidth", 1.5);
    circlePath(bolt?.x, bolt?.y, radius + 2);
    call("stroke");
  }

  function drawBeam(beam, spriteAdapters) {
    const weapon = weaponDefs[beam?.weaponId] || {};
    const weaponId = beam?.weaponId || "prism_beam";
    const tuning = skillEffectTuning(weaponId, weapon);
    const x = number(beam?.x);
    const y = number(beam?.y);
    const endX = number(beam?.endX, x);
    const endY = number(beam?.endY, y);
    const length = Math.max(1, Math.hypot(endX - x, endY - y));
    const midX = (x + endX) / 2;
    const midY = (y + endY) / 2;
    const rotation = Math.atan2(endY - y, endX - x);
    const spriteHeight = Math.max(2, number(beam?.width, 8) * tuning.scale);
    const drawn = spriteAdapters?.spriteSystem?.drawSprite?.(
      `weapon:${weapon.assetId || weaponId}`,
      midX,
      midY,
      length,
      rotation,
      {
        alpha: tuning.alpha,
        height: spriteHeight,
        rasterHeight: spriteHeight,
        rasterWidth: 256,
        width: length,
      }
    );
    if (drawn) return;
    set("strokeStyle", beam?.color || weapon.color || "#b794ff");
    set("lineWidth", Math.max(2, number(beam?.width, 8) * 0.72));
    set("globalAlpha", Math.max(0.25, number(beam?.life, 0.16) / 0.24) * tuning.alpha);
    call("beginPath");
    call("moveTo", x, y);
    call("lineTo", endX, endY);
    call("stroke");
    set("globalAlpha", 1);
  }

  function drawArea(area, spriteAdapters) {
    const weapon = weaponDefs[area?.weaponId] || {};
    const weaponId = area?.weaponId || "area";
    const tuning = skillEffectTuning(weaponId, weapon);
    const radius = Math.max(4, number(area?.radius, 20));
    const spriteSize = Math.max(24, radius * 1.9 * tuning.scale);
    const spriteDrawn =
      area?.weaponId &&
      spriteAdapters?.spriteSystem?.drawSprite?.(
        `weapon:${weapon.assetId || weaponId}`,
        number(area?.x),
        number(area?.y),
        spriteSize,
        0,
        { alpha: Math.max(0.45, tuning.alpha * 1.25) }
      );
    if (spriteDrawn) return;
    set("fillStyle", area?.color || weapon.color || "#8de7ff");
    set("strokeStyle", area?.color || weapon.color || "#8de7ff");
    set("globalAlpha", Math.max(0.1, Math.min(0.34, number(area?.life, 0.2))) * tuning.alpha);
    circlePath(area?.x, area?.y, radius);
    call("fill");
    set("globalAlpha", 0.82 * tuning.alpha);
    set("lineWidth", 2);
    circlePath(area?.x, area?.y, radius);
    call("stroke");
    set("globalAlpha", 1);
  }

  function drawWeaponBurst(burst) {
    const life = Math.max(0, number(burst?.life, 0));
    const maxLife = Math.max(0.01, number(burst?.maxLife, 0.32));
    const progress = clamp(1 - life / maxLife, 0, 1);
    const radius = Math.max(8, number(burst?.radius, 24)) + progress * 26;
    set("globalAlpha", Math.max(0, life / maxLife) * 0.78);
    set("strokeStyle", burst?.color || "#ffd166");
    set("lineWidth", 3 + progress * 4);
    circlePath(burst?.x, burst?.y, radius);
    call("stroke");
    set("globalAlpha", Math.max(0, life / maxLife) * 0.22);
    set("fillStyle", burst?.color || "#ffd166");
    circlePath(burst?.x, burst?.y, Math.max(8, radius * 0.46));
    call("fill");
    set("globalAlpha", 1);
  }

  function drawBossAttack(attack) {
    if (attack?.type === "boss_slash") {
      drawBossSlash(attack);
      return;
    }
    const windup = Math.max(0.01, number(attack?.windup, 1));
    const age = Math.max(0, number(attack?.age));
    const charging = age < windup;
    const progress = clamp(age / windup, 0, 1);
    const radius = Math.max(8, number(attack?.radius, 40));
    const currentRadius = charging ? radius * progress : radius;
    const drop = attack?.type === "boss_drop";
    set("strokeStyle", charging ? (drop ? "#8de7ff" : "#ffd166") : "#ff5f7a");
    set("fillStyle", charging ? (drop ? "rgba(141, 231, 255, 0.14)" : "rgba(255, 209, 102, 0.12)") : "rgba(255, 95, 122, 0.2)");
    set("lineWidth", charging ? 3 : 5);
    circlePath(attack?.x, attack?.y, currentRadius);
    call("fill");
    call("stroke");
  }

  function drawBossSlash(attack) {
    const windup = Math.max(0.01, number(attack?.windup, 1));
    const age = Math.max(0, number(attack?.age));
    const charging = age < windup;
    const progress = clamp(age / windup, 0, 1);
    const reach = Math.max(8, number(attack?.radius, 60)) * (charging ? progress : 1);
    const angle = Math.atan2(number(attack?.dirY), number(attack?.dirX, 1));
    const arc = number(attack?.arc, Math.PI * 0.7);
    const left = angle - arc / 2;
    const right = angle + arc / 2;
    set("fillStyle", charging ? "rgba(255, 209, 102, 0.12)" : "rgba(255, 95, 122, 0.24)");
    set("strokeStyle", charging ? "#ffd166" : "#ff5f7a");
    set("lineWidth", charging ? 3 : 5);
    call("beginPath");
    call("moveTo", number(attack?.x), number(attack?.y));
    call("lineTo", number(attack?.x) + Math.cos(left) * reach, number(attack?.y) + Math.sin(left) * reach);
    call("arc", number(attack?.x), number(attack?.y), reach, left, right);
    call("closePath");
    call("fill");
    call("stroke");
  }

  function drawPlayerHpBar(player) {
    const width = 64;
    const height = 7;
    const radius = Math.max(8, number(player?.radius, 16));
    const x = number(player?.x) - width / 2;
    const y = number(player?.y) - radius - 19;
    const hp = clamp(number(player?.hp, 0) / Math.max(1, number(player?.maxHp, 1)), 0, 1);
    drawBar(x, y, width, height, hp, {
      fill: hp > 0.35 ? "#78e08f" : "#ff6b6b",
      border: "#f3f6fb",
    });
    const protection = player?.projectileBlockReady
      ? 1
      : clamp(number(player?.projectileBlockCharge) / Math.max(1, number(player?.projectileBlockNeeded, 1)), 0, 1);
    drawBar(x, y + height + 3, width, 4, protection, {
      fill: player?.projectileBlockReady ? "#8de7ff" : "#4aa3ff",
      border: "rgba(141, 231, 255, 0.7)",
    });
  }

  function drawPlayerFallback(player) {
    set("fillStyle", "#69d2ff");
    circlePath(player?.x, player?.y, Math.max(6, number(player?.radius, 16)));
    call("fill");
    set("strokeStyle", "#dff6ff");
    set("lineWidth", 2);
    circlePath(player?.x, player?.y, Math.max(6, number(player?.radius, 16)));
    call("stroke");
  }

  function drawBossSpawnNotice(game) {
    const notice = game?.bossSpawnNotice;
    if (!notice) return;
    const alpha = clamp(number(notice.life) / Math.max(0.01, number(notice.maxLife, 1)), 0, 1);
    set("globalAlpha", alpha);
    drawText(notice.text || "BOSS INCOMING", canvas.width / 2, 104, {
      align: "center",
      color: "#ffd166",
      font: "800 24px sans-serif",
    });
    set("globalAlpha", 1);
  }

  function drawTowerFloorBadge(game) {
    const width = 150;
    const height = 34;
    const x = canvas.width / 2 - width / 2;
    const y = 12;
    roundedRectPath(x, y, width, height, 8);
    set("fillStyle", "rgba(10, 14, 20, 0.76)");
    call("fill");
    set("strokeStyle", "rgba(255, 209, 102, 0.7)");
    set("lineWidth", 2);
    call("stroke");
    drawText(`Tower Floor ${Math.max(1, Math.floor(number(game?.towerFloor, 1)))}`, canvas.width / 2, y + 22, {
      align: "center",
      color: "#ffd166",
      font: "700 15px sans-serif",
    });
  }

  function drawBossHealthBar(game) {
    const boss = list(game?.enemies).find((enemy) => enemy?.boss);
    if (!boss) return;
    const width = Math.min(560, Math.max(240, canvas.width - 220));
    const height = 18;
    const x = canvas.width / 2 - width / 2;
    const y = 54;
    const progress = clamp(number(boss.hp) / Math.max(1, number(boss.maxHp, 1)), 0, 1);
    drawBar(x, y, width, height, progress, {
      fill: boss.superBoss ? "#ff74c8" : "#ff5f7a",
      border: boss.superBoss ? "#ffd166" : "#f3f6fb",
    });
    const kind = boss.superBoss
      ? "SUPER BOSS"
      : boss.bossKind === "charger"
        ? "CHARGER BOSS"
        : boss.bossKind === "turret"
          ? "TURRET BOSS"
          : "BOSS";
    drawText(`${kind} ${Math.max(0, Math.ceil(number(boss.hp)))} / ${Math.ceil(number(boss.maxHp))}`, canvas.width / 2, y + 13, {
      align: "center",
      color: "#ffffff",
      font: "700 12px sans-serif",
    });
  }

  function drawBossSpecialBar(game) {
    const boss = list(game?.enemies).find((enemy) => enemy?.boss);
    if (!boss || number(boss.dropTimer) > 0) return;
    const max = Math.max(0.1, number(game?.bossAttackCooldownMax, 3.8));
    const progress = clamp(1 - number(game?.bossAttackTimer) / max, 0, 1);
    const width = Math.min(390, Math.max(180, canvas.width - 320));
    const height = 10;
    const x = canvas.width / 2 - width / 2;
    const y = 78;
    drawBar(x, y, width, height, progress, {
      fill: progress > 0.82 ? "#ff5f56" : "#ffd166",
      border: progress > 0.82 ? "#ffffff" : "rgba(255, 209, 102, 0.75)",
    });
    drawText("SPECIAL", canvas.width / 2, y + 9, {
      align: "center",
      color: "#ffffff",
      font: "700 10px sans-serif",
    });
  }

  function drawBar(x, y, width, height, progress, colors) {
    roundedRectPath(x, y, width, height, Math.min(7, height / 2));
    set("fillStyle", "rgba(10, 14, 20, 0.84)");
    call("fill");
    if (progress > 0) {
      roundedRectPath(x, y, width * clamp(progress, 0, 1), height, Math.min(7, height / 2));
      set("fillStyle", colors.fill);
      call("fill");
    }
    roundedRectPath(x, y, width, height, Math.min(7, height / 2));
    set("strokeStyle", colors.border);
    set("lineWidth", height > 5 ? 2 : 1);
    call("stroke");
  }

  function drawSkillRail(game, spriteAdapters) {
    const equipped = list(game?.player?.equippedWeapons).filter((weaponId) => weaponDefs[weaponId]);
    if (!equipped.length) return;
    const maxRailHeight = canvas.height - 120;
    const gap = 8;
    const size = Math.max(32, Math.min(48, Math.floor((maxRailHeight - (equipped.length - 1) * gap - 16) / equipped.length)));
    const x = 18;
    const y = 108;
    const railHeight = equipped.length * size + (equipped.length - 1) * gap + 16;
    roundedRectPath(x - 8, y - 8, size + 16, railHeight, 8);
    set("fillStyle", "rgba(10, 14, 20, 0.78)");
    call("fill");
    set("strokeStyle", "rgba(243, 246, 251, 0.14)");
    set("lineWidth", 1);
    call("stroke");
    equipped.forEach((weaponId, index) => {
      const weapon = weaponDefs[weaponId] || {};
      drawSkillIcon(
        weaponId,
        weapon,
        x,
        y + index * (size + gap),
        size,
        number(game?.weaponIconFlashes?.[weaponId]),
        spriteAdapters
      );
    });

    const activeUpgrades = Object.entries(game?.runUpgradeTiers || {})
      .filter(([, tier]) => number(tier) > 0)
      .map(([id, tier]) => ({ id, tier, upgrade: runUpgradeDefs.find((item) => item?.id === id) }))
      .filter((item) => item.upgrade);
    if (!activeUpgrades.length) return;
    const upgradeSize = 34;
    const upgradeGap = 7;
    const upgradeX = 78;
    const upgradeY = 108;
    const railHeightUpgrade = activeUpgrades.length * upgradeSize + (activeUpgrades.length - 1) * upgradeGap + 14;
    roundedRectPath(upgradeX - 7, upgradeY - 7, upgradeSize + 14, railHeightUpgrade, 8);
    set("fillStyle", "rgba(10, 14, 20, 0.72)");
    call("fill");
    set("strokeStyle", "rgba(120, 224, 143, 0.24)");
    call("stroke");
    activeUpgrades.forEach(({ id, tier, upgrade }, index) => {
      drawUpgradeIcon(id, upgrade, tier, upgradeX, upgradeY + index * (upgradeSize + upgradeGap), upgradeSize, spriteAdapters);
    });
  }

  function drawSkillIcon(weaponId, weapon, x, y, size, flash, spriteAdapters) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const color = weapon.color || "#f3f6fb";
    const active = flash > 0;
    const pulse = 1 + flash * 0.14;
    const iconSize = size * (active ? 0.74 : 0.62) * pulse;
    roundedRectPath(x, y, size, size, 7);
    set("fillStyle", "rgba(18, 24, 34, 0.94)");
    call("fill");
    set("strokeStyle", active ? "#ffd166" : color);
    set("lineWidth", active ? 4 : 3);
    call("stroke");
    set("fillStyle", color);
    set("globalAlpha", active ? 0.3 : 0.16);
    roundedRectPath(x + 5, y + 5, size - 10, size - 10, 5);
    call("fill");
    set("globalAlpha", 1);
    if (active) {
      set("strokeStyle", color);
      set("globalAlpha", 0.35 + flash * 0.45);
      circlePath(centerX, centerY, size * (0.34 + flash * 0.22));
      call("stroke");
      set("globalAlpha", 1);
    }
    drawWeaponGlyph(weapon.kind, centerX, centerY, size, color, 0.44);
    spriteAdapters?.spriteSystem?.drawSprite?.(`weaponIcon:${weapon.assetId || weaponId}`, centerX, centerY, iconSize, 0, { trim: false }) ||
      spriteAdapters?.spriteSystem?.drawSprite?.(`weapon:${weapon.assetId || weaponId}`, centerX, centerY, iconSize);
  }

  function drawUpgradeIcon(upgradeId, upgrade, tier, x, y, size, spriteAdapters) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    roundedRectPath(x, y, size, size, 7);
    set("fillStyle", "rgba(18, 24, 34, 0.92)");
    call("fill");
    set("strokeStyle", "#78e08f");
    set("lineWidth", 2);
    call("stroke");
    drawUpgradeGlyph(upgradeId, centerX, centerY, size, "#78e08f", 0.5);
    spriteAdapters?.spriteSystem?.drawSprite?.(`runUpgradeIcon:${upgradeId}`, centerX, centerY, size * 0.68, 0, { trim: false });
    const badgeSize = 14;
    roundedRectPath(x + size - badgeSize, y + size - badgeSize, badgeSize, badgeSize, 5);
    set("fillStyle", "rgba(120, 224, 143, 0.92)");
    call("fill");
    drawText(String(tier), x + size - badgeSize / 2, y + size - 3, {
      align: "center",
      color: "#10141d",
      font: "800 10px sans-serif",
    });
  }

  function drawWeaponGlyph(kind, x, y, size, color, alpha = 1) {
    set("globalAlpha", alpha);
    set("strokeStyle", color);
    set("fillStyle", color);
    set("lineWidth", 4);
    set("lineCap", "round");
    set("lineJoin", "round");
    if (kind === "beam") {
      call("beginPath");
      call("moveTo", x - size * 0.22, y + size * 0.18);
      call("lineTo", x + size * 0.22, y - size * 0.18);
      call("stroke");
    } else if (kind === "cone") {
      call("beginPath");
      call("moveTo", x, y - size * 0.22);
      call("lineTo", x + size * 0.24, y + size * 0.2);
      call("lineTo", x - size * 0.24, y + size * 0.2);
      call("closePath");
      call("fill");
    } else if (kind === "radial") {
      circlePath(x, y, size * 0.2);
      call("stroke");
      circlePath(x, y, size * 0.08);
      call("fill");
    } else if (kind === "chain") {
      call("beginPath");
      call("moveTo", x - size * 0.18, y - size * 0.2);
      call("lineTo", x + size * 0.02, y - size * 0.02);
      call("lineTo", x - size * 0.04, y + size * 0.02);
      call("lineTo", x + size * 0.18, y + size * 0.2);
      call("stroke");
    } else if (kind === "target_area" || kind === "lingering_area") {
      circlePath(x, y, size * 0.2);
      call("stroke");
      call("beginPath");
      call("moveTo", x - size * 0.25, y);
      call("lineTo", x + size * 0.25, y);
      call("moveTo", x, y - size * 0.25);
      call("lineTo", x, y + size * 0.25);
      call("stroke");
    } else if (kind === "mine") {
      call("beginPath");
      call("moveTo", x, y - size * 0.24);
      call("lineTo", x + size * 0.24, y);
      call("lineTo", x, y + size * 0.24);
      call("lineTo", x - size * 0.24, y);
      call("closePath");
      call("fill");
    } else {
      circlePath(x, y, size * 0.16);
      call("fill");
    }
    set("globalAlpha", 1);
  }

  function drawUpgradeGlyph(id, x, y, size, color, alpha = 1) {
    set("globalAlpha", alpha);
    set("strokeStyle", color);
    set("fillStyle", color);
    set("lineWidth", 3);
    set("lineCap", "round");
    if (String(id).includes("fire_rate")) {
      circlePath(x, y, size * 0.18);
      call("stroke");
    } else if (String(id).includes("damage")) {
      call("beginPath");
      call("moveTo", x - size * 0.2, y + size * 0.16);
      call("lineTo", x + size * 0.2, y - size * 0.16);
      call("stroke");
    } else {
      circlePath(x, y, size * 0.16);
      call("fill");
    }
    set("globalAlpha", 1);
  }

  function roundedRectPath(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    call("beginPath");
    if (typeof context?.quadraticCurveTo !== "function") {
      call("moveTo", x, y);
      call("lineTo", x + width, y);
      call("lineTo", x + width, y + height);
      call("lineTo", x, y + height);
      call("closePath");
      return;
    }
    call("moveTo", x + r, y);
    call("lineTo", x + width - r, y);
    call("quadraticCurveTo", x + width, y, x + width, y + r);
    call("lineTo", x + width, y + height - r);
    call("quadraticCurveTo", x + width, y + height, x + width - r, y + height);
    call("lineTo", x + r, y + height);
    call("quadraticCurveTo", x, y + height, x, y + height - r);
    call("lineTo", x, y + r);
    call("quadraticCurveTo", x, y, x + r, y);
    call("closePath");
  }

  function circlePath(x, y, radius) {
    call("beginPath");
    call("arc", number(x), number(y), Math.max(0, number(radius)), 0, Math.PI * 2);
  }

  function drawText(text, x, y, { align = "start", color = "#f3f6fb", font = "14px sans-serif" } = {}) {
    set("fillStyle", color);
    set("font", font);
    set("textAlign", align);
    call("fillText", String(text), number(x), number(y));
    set("textAlign", "start");
  }

  function skillEffectTuning(weaponId, weapon) {
    const sprite = skillEffectSprites[weapon?.assetId || weaponId] || {};
    return {
      alpha: Math.max(0, Math.min(1, number(sprite.effectAlpha, 1))),
      scale: Math.max(0.1, number(sprite.effectScale, 1)),
    };
  }

  function enemyAnimationState(enemy) {
    if (enemy?.attackRange && enemy?.projectileCooldown && number(enemy.attackVisualTimer) > 0) return "attack";
    return "default";
  }

  function bossAnimationState(enemy) {
    if (enemy?.bossKind === "charger") {
      if (enemy.chargeState === "windup") return "windup";
      if (enemy.chargeState === "charging") return "release";
    }
    if (enemy?.bossKind === "turret") {
      if (number(enemy.attackVisualTimer) > 0) return "release";
      if (number(enemy.shootTimer) <= 0.45) return "windup";
    }
    if (enemy?.bossKind === "warden" && number(enemy.dropTimer) > 0) return "windup";
    return "idle";
  }

  function enemyFacesLeft(enemy) {
    if (Number.isFinite(Number(enemy?.vx))) return number(enemy.vx) < -1;
    if (Number.isFinite(Number(enemy?.chargeDirX))) return number(enemy.chargeDirX) < -0.1;
    return false;
  }

  function playerFacesLeft(player) {
    return Number.isFinite(Number(player?.targetX)) && Number.isFinite(Number(player?.x)) && number(player.targetX) < number(player.x) - 2;
  }

  function playerSpriteId(player) {
    if (number(player?.actionTimer) > 0 && player?.actionSprite) return `player:${player.actionSprite}`;
    if (player?.moving) return "player:walk";
    return "player";
  }

  function withAlpha(color, alpha) {
    const match = typeof color === "string" ? /^#([0-9a-f]{6})$/i.exec(color.trim()) : null;
    if (!match) return color;
    const value = Number.parseInt(match[1], 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  }
}

function createBrowserSpriteSystem({ assetDefs = {}, canvas, globalRef }) {
  const context = canvas.getContext?.("2d");
  const ImageCtor = globalRef?.Image;
  const diagnostics = canvas?.ownerDocument?.__TapSurvivorBrowserSmoke?.diagnostics;
  const sprites = new Map();
  const spriteSheets = new Map();
  const spriteConfigs = new Map();
  const rasterCache = new Map();

  function createRasterCanvas(width, height) {
    const OffscreenCanvasCtor = globalRef?.OffscreenCanvas;
    if (typeof OffscreenCanvasCtor === "function") {
      try {
        return new OffscreenCanvasCtor(width, height);
      } catch {
        // Fall through to the document canvas when OffscreenCanvas is unavailable.
      }
    }
    const documentRef = globalRef?.document || canvas?.ownerDocument;
    const rasterCanvas = documentRef?.createElement?.("canvas");
    if (!rasterCanvas) return null;
    rasterCanvas.width = width;
    rasterCanvas.height = height;
    return rasterCanvas;
  }

  function registerSprite(id, definition) {
    const src = spriteSource(definition);
    if (!id || !src) return false;
    const config = definition && typeof definition === "object" && !Array.isArray(definition)
      ? definition
      : {};
    spriteConfigs.set(id, config);
    if (typeof ImageCtor !== "function") return false;
    const image = new ImageCtor();
    image.addEventListener?.("load", () => {
      rasterCache.clear();
      diagnostics?.spriteLoads?.push?.({
        id,
        naturalHeight: image.naturalHeight || image.height || 0,
        naturalWidth: image.naturalWidth || image.width || 0,
        src,
        success: true,
      });
    });
    image.addEventListener?.("error", () => {
      diagnostics?.spriteLoads?.push?.({
        id,
        naturalHeight: image.naturalHeight || image.height || 0,
        naturalWidth: image.naturalWidth || image.width || 0,
        src,
        success: false,
      });
    });
    image.src = src;
    sprites.set(id, image);
    diagnostics?.spriteRegistrations?.push?.({
      id,
      src,
    });
    return true;
  }

  function registerGroup(prefix, definitions = {}) {
    Object.entries(definitions || {}).forEach(([id, definition]) => {
      registerSprite(`${prefix}:${id}`, definition);
      if (definition && typeof definition === "object" && definition.iconSrc) {
        registerSprite(`${prefix}Icon:${id}`, definition.iconSrc);
      }
    });
  }

  function registerSpriteSheet(id, definition) {
    const src = spriteSource(definition);
    if (!id || !src || typeof ImageCtor !== "function") return false;
    const config = definition && typeof definition === "object" && !Array.isArray(definition)
      ? definition
      : {};
    const image = new ImageCtor();
    image.addEventListener?.("load", () => {
      diagnostics?.spriteLoads?.push?.({
        id: `spriteSheet:${id}`,
        naturalHeight: image.naturalHeight || image.height || 0,
        naturalWidth: image.naturalWidth || image.width || 0,
        src,
        success: true,
      });
    });
    image.addEventListener?.("error", () => {
      diagnostics?.spriteLoads?.push?.({
        id: `spriteSheet:${id}`,
        naturalHeight: image.naturalHeight || image.height || 0,
        naturalWidth: image.naturalWidth || image.width || 0,
        src,
        success: false,
      });
    });
    image.src = src;
    spriteSheets.set(id, { config, image });
    diagnostics?.spriteRegistrations?.push?.({
      id: `spriteSheet:${id}`,
      src,
    });
    return true;
  }

  function loadSprites(spriteDefs = assetDefs.sprites || assetDefs || {}) {
    diagnostics?.spriteLoadRequests?.push?.({
      backgrounds: Object.keys(spriteDefs.backgrounds || {}),
      enemies: Object.keys(spriteDefs.enemies || {}),
      player: Boolean(spriteDefs.player),
      playerAnimations: Object.keys(spriteDefs.playerAnimations || {}),
      runUpgradeIcons: Object.keys(spriteDefs.runUpgradeIcons || {}),
      runUpgrades: Object.keys(spriteDefs.runUpgrades || {}),
      spriteSheets: Object.keys(spriteDefs.spriteSheets || {}),
      ui: Object.keys(spriteDefs.ui || {}),
      weapons: Object.keys(spriteDefs.weapons || {}),
    });
    registerSprite("player", spriteDefs.player);
    registerGroup("player", spriteDefs.playerAnimations);
    registerGroup("background", spriteDefs.backgrounds);
    registerGroup("enemy", spriteDefs.enemies);
    registerGroup("weapon", spriteDefs.weapons);
    registerGroup("runUpgrade", spriteDefs.runUpgrades);
    registerGroup("runUpgradeIcon", spriteDefs.runUpgradeIcons);
    registerGroup("ui", spriteDefs.ui);
    Object.entries(spriteDefs.spriteSheets || {}).forEach(([id, definition]) => {
      registerSpriteSheet(id, definition);
    });
    return true;
  }

  function drawImage(id, x = 0, y = 0, width, height) {
    const image = sprites.get(id);
    if (!context || !isDrawableImage(image)) {
      diagnostics?.spriteDraws?.push?.({
        id,
        kind: "drawImage",
        success: false,
      });
      return false;
    }
    try {
      context.drawImage(
        image,
        x,
        y,
        width || image.naturalWidth || image.width,
        height || image.naturalHeight || image.height
      );
    } catch {
      diagnostics?.spriteDraws?.push?.({
        id,
        kind: "drawImage",
        success: false,
      });
      return false;
    }
    diagnostics?.spriteDraws?.push?.({
      id,
      kind: "drawImage",
      naturalHeight: image.naturalHeight || image.height || 0,
      naturalWidth: image.naturalWidth || image.width || 0,
      src: image.src || "",
      success: true,
    });
    return true;
  }

  function drawSprite(id, x = 0, y = 0, size = 32, rotation = 0, options = {}) {
    const width = Math.max(1, numberValue(options.width, size));
    const height = Math.max(1, numberValue(options.height, size));
    const sheetDraw = drawSpriteSheet({
      height,
      options,
      rotation,
      width,
      x,
      y,
    });
    if (sheetDraw?.drawn) {
      recordSpriteDraw({
        animationId: options.animationId,
        frameIndex: sheetDraw.frame,
        id,
        image: sheetDraw.image,
        row: sheetDraw.row,
        sheetId: options.sheetId,
        source: "spriteSheet",
        state: options.animationState,
        success: true,
      });
      return true;
    }

    const image = sprites.get(id);
    if (!context || !isDrawableImage(image)) {
      recordSpriteDraw({
        animationId: options.animationId,
        id,
        image,
        sheetId: options.sheetId,
        source: options.sheetId ? "staticFallbackAfterSpriteSheet" : "static",
        success: false,
      });
      return false;
    }
    const config = spriteConfigs.get(id) || {};
    const frameIndex = currentFrameIndex(config, options);
    const bounds = spriteSourceBounds(image, config, frameIndex);
    const rasterWidth = Math.max(1, Math.ceil(numberValue(options.rasterWidth, width)));
    const rasterHeight = Math.max(1, Math.ceil(numberValue(options.rasterHeight, height)));
    const source = options.trim === false
      ? null
      : rasterizedSprite(id, image, rasterWidth, rasterHeight, config, frameIndex, bounds);
    const previousAlpha = context.globalAlpha;
    let drawn = false;
    try {
      context.save?.();
      context.translate?.(x, y);
      context.rotate?.(rotation);
      context.scale?.(options.flipX ? -1 : 1, options.flipY ? -1 : 1);
      if (Number.isFinite(Number(options.alpha))) {
        context.globalAlpha = (Number.isFinite(previousAlpha) ? previousAlpha : 1) * clampValue(options.alpha, 0, 1);
      }
      if (source) {
        context.drawImage(source, -width / 2, -height / 2, width, height);
      } else {
        context.drawImage(
          image,
          bounds.x,
          bounds.y,
          bounds.width,
          bounds.height,
          -width / 2,
          -height / 2,
          width,
          height
        );
      }
      drawn = true;
    } catch {
      drawn = false;
    } finally {
      if (Number.isFinite(Number(options.alpha))) context.globalAlpha = previousAlpha;
      context.restore?.();
    }
    recordSpriteDraw({
      animationId: options.animationId,
      frameIndex,
      id,
      image,
      sheetId: options.sheetId,
      source: options.sheetId ? "staticFallbackAfterSpriteSheet" : "static",
      state: options.animationState,
      success: drawn,
    });
    return drawn;
  }

  function drawSpriteSheet({ height, options, rotation, width, x, y }) {
    const sheetId = options.sheetId;
    const sheet = spriteSheets.get(sheetId);
    const image = sheet?.image;
    const animation = resolveSpriteSheetAnimation(
      sheet?.config,
      options.animationId,
      options.animationState
    );
    if (!context || !isDrawableImage(image) || !animation) return null;
    const columns = Math.max(1, Math.floor(numberValue(sheet.config?.columns, 1)));
    const rows = Math.max(1, Math.floor(numberValue(sheet.config?.rows, 1)));
    const frame = selectedSpriteSheetFrame(animation, options.time);
    const row = Number(animation.row);
    if (!Number.isInteger(row) || row < 0 || row >= rows || frame < 0 || frame >= columns) return null;

    const frameWidth = (image.naturalWidth || image.width) / columns;
    const frameHeight = (image.naturalHeight || image.height) / rows;
    if (!Number.isFinite(frameWidth) || !Number.isFinite(frameHeight) || frameWidth <= 0 || frameHeight <= 0) {
      return null;
    }

    const previousAlpha = context.globalAlpha;
    let drawn = false;
    try {
      context.save?.();
      context.translate?.(x, y);
      context.rotate?.(rotation);
      context.scale?.(options.flipX ? -1 : 1, options.flipY ? -1 : 1);
      if (Number.isFinite(Number(options.alpha))) {
        context.globalAlpha = (Number.isFinite(previousAlpha) ? previousAlpha : 1) * clampValue(options.alpha, 0, 1);
      }
      context.imageSmoothingEnabled = false;
      context.drawImage(
        image,
        frame * frameWidth,
        row * frameHeight,
        frameWidth,
        frameHeight,
        -width / 2,
        -height / 2,
        width,
        height
      );
      drawn = true;
    } catch {
      drawn = false;
    } finally {
      if (Number.isFinite(Number(options.alpha))) context.globalAlpha = previousAlpha;
      context.restore?.();
    }
    return { drawn, frame, image, row };
  }

  function resolveSpriteSheetAnimation(sheet, animationId, state) {
    const definition = sheet?.animations?.[animationId];
    if (!definition) return null;
    if (Array.isArray(definition.frames)) return definition;
    const stateDefinition = definition[state] || definition.idle || definition.default;
    if (!stateDefinition) return null;
    return {
      ...definition,
      ...stateDefinition,
      row: stateDefinition.row ?? definition.row,
    };
  }

  function selectedSpriteSheetFrame(animation, suppliedTime) {
    const frames = Array.isArray(animation?.frames) ? animation.frames : [];
    if (!frames.length) return -1;
    if (frames.length === 1) return Number(frames[0]);
    const fps = Math.max(1, numberValue(animation.fps, 8));
    const time = Number(suppliedTime);
    const elapsed = Number.isFinite(time)
      ? Math.max(0, time)
      : Math.max(0, numberValue(globalRef?.performance?.now?.(), 0) / 1000);
    const frameIndex = Math.floor(elapsed * fps);
    return Number(frames[animation.loop === false ? Math.min(frames.length - 1, frameIndex) : frameIndex % frames.length]);
  }

  function recordSpriteDraw({ animationId, frameIndex, id, image, row, sheetId, source, state, success }) {
    diagnostics?.spriteDraws?.push?.({
      animationId,
      frameIndex,
      id,
      kind: "drawSprite",
      naturalHeight: image?.naturalHeight || image?.height || 0,
      naturalWidth: image?.naturalWidth || image?.width || 0,
      row,
      sheetId,
      source,
      src: image?.src || "",
      state,
      success,
    });
  }

  function rasterizedSprite(id, image, width, height, config, frameIndex, bounds) {
    const frames = Array.isArray(config?.frames) ? config.frames : [];
    const transparentColor = Array.isArray(config?.transparentColor) ? config.transparentColor : null;
    if (!frames.length && !transparentColor) return null;
    const key = `${id}:${width}x${height}:${frameIndex}`;
    if (rasterCache.has(key)) return rasterCache.get(key);
    const rasterCanvas = createRasterCanvas(width, height);
    const rasterContext = rasterCanvas?.getContext?.("2d");
    if (!rasterCanvas || !rasterContext) return null;
    try {
      rasterContext.clearRect?.(0, 0, width, height);
      rasterContext.imageSmoothingEnabled = false;
      rasterContext.drawImage(
        image,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        0,
        0,
        width,
        height
      );
      applyTransparentColor(rasterContext, width, height, config);
      rasterCache.set(key, rasterCanvas);
      return rasterCanvas;
    } catch {
      return null;
    }
  }

  function applyTransparentColor(rasterContext, width, height, config) {
    const color = config?.transparentColor;
    if (!Array.isArray(color) || color.length < 3 || typeof rasterContext.getImageData !== "function") return;
    try {
      const pixels = rasterContext.getImageData(0, 0, width, height);
      const data = pixels.data;
      const tolerance = Math.max(0, numberValue(config.transparentTolerance, 28));
      for (let index = 0; index < data.length; index += 4) {
        const delta =
          Math.abs(data[index] - color[0]) +
          Math.abs(data[index + 1] - color[1]) +
          Math.abs(data[index + 2] - color[2]);
        if (delta <= tolerance) data[index + 3] = 0;
      }
      rasterContext.putImageData?.(pixels, 0, 0);
    } catch {
      // Pixel reads can be unavailable for cross-origin images; retain the cropped frame.
    }
  }

  function currentFrameIndex(config, options) {
    const frames = Array.isArray(config?.frames) ? config.frames : [];
    if (frames.length <= 1) return 0;
    const fps = Math.max(1, numberValue(config.fps, 10));
    const suppliedTime = Number(options?.time);
    const now = Number.isFinite(suppliedTime)
      ? suppliedTime * 1000
      : numberValue(globalRef?.performance?.now?.(), Date.now());
    return Math.floor((now / 1000) * fps) % frames.length;
  }

  function spriteSourceBounds(image, config, frameIndex) {
    const frames = Array.isArray(config?.frames) ? config.frames : [];
    if (frames[frameIndex]) return normalizeBounds(frames[frameIndex], image);
    if (config && (config.x !== undefined || config.y !== undefined)) return normalizeBounds(config, image);
    return normalizeBounds({}, image);
  }

  function normalizeBounds(bounds, image) {
    const imageWidth = Math.max(1, image.naturalWidth || image.width || 1);
    const imageHeight = Math.max(1, image.naturalHeight || image.height || 1);
    const x = clampInteger(bounds?.x, 0, imageWidth - 1);
    const y = clampInteger(bounds?.y, 0, imageHeight - 1);
    const width = clampInteger(bounds?.width ?? bounds?.w, 1, imageWidth - x);
    const height = clampInteger(bounds?.height ?? bounds?.h, 1, imageHeight - y);
    return { x, y, width, height };
  }

  function clampInteger(value, min, max) {
    const resolved = Number(value);
    return Math.max(min, Math.min(max, Math.floor(Number.isFinite(resolved) ? resolved : min)));
  }

  function numberValue(value, fallback = 0) {
    const resolved = Number(value);
    return Number.isFinite(resolved) ? resolved : fallback;
  }

  function clampValue(value, min, max) {
    return Math.max(min, Math.min(max, numberValue(value, min)));
  }

  return {
    drawImage,
    drawSprite,
    loadSprites,
  };
}

function createBrowserUiAdapters({
  content,
  documentRef,
  globalRef,
  onStartAudio,
  onStartRun,
  saveConfig,
  shopPricingConfig,
  ui,
}) {
  const inventoryRenderer = createBrowserInventoryRenderer({
    content,
    documentRef,
    globalRef,
    saveConfig,
    ui,
  });
  const shopBinding = createBrowserShopSystemAdapter();
  const runtimeUiActions = createBrowserRuntimeUiActionBinding();
  const shopSystemAdapter = shopBinding.shopSystemAdapter;
  return {
    bindRuntimeUiActions: runtimeUiActions.bindRuntimeUiActions,
    bindShopSystem: shopBinding.bindShopSystem,
    runUi: {
      formatTime: formatBrowserTime,
      getGameSpeed: () => readBrowserGameSpeed({ documentRef, globalRef }),
      maxEquippedWeapons: () => 4,
      renderDebug: () => {},
    },
    runUiAdapter: createBrowserRunUiAdapter({ documentRef, globalRef, ui }),
    shellUiAdapter: createBrowserShellUiAdapter({
      closeEndScreen: runtimeUiActions.closeEndScreen,
      closeLevelUpMenu: runtimeUiActions.closeLevelUpMenu,
      closeShopMenu: runtimeUiActions.closeShopMenu,
      isAudioMuted: runtimeUiActions.isAudioMuted,
      onStartAudio,
      onStartRun,
      renderInventory: inventoryRenderer.renderInventory,
      renderShop: shopSystemAdapter.renderShop,
      setRunMenuOpen: runtimeUiActions.setRunMenuOpen,
      toggleAudioMute: runtimeUiActions.toggleAudioMute,
      ui,
    }),
    shopDocumentRef: documentRef,
    shopSystemAdapter,
    ui,
  };
}

function createBrowserRuntimeUiActionBinding() {
  let runtimeUiActions = {};

  return {
    bindRuntimeUiActions(nextRuntimeUiActions = {}) {
      runtimeUiActions = nextRuntimeUiActions;
      return true;
    },
    closeEndScreen: () => runtimeUiActions.closeEndScreen?.(),
    closeLevelUpMenu: () => runtimeUiActions.closeLevelUpMenu?.(),
    closeShopMenu: () => runtimeUiActions.closeShopMenu?.(),
    isAudioMuted: () => Boolean(runtimeUiActions.isAudioMuted?.()),
    setRunMenuOpen: (open) => runtimeUiActions.setRunMenuOpen?.(Boolean(open)),
    toggleAudioMute: () => runtimeUiActions.toggleAudioMute?.(),
  };
}

function createBrowserInventoryRenderer({ content = {}, documentRef, globalRef, saveConfig = {}, ui }) {
  const relicDefs = Array.isArray(content.relics) ? content.relics : [];
  const weaponDefs = content.weapons || content.weaponDefs || {};
  const relicSystem = createRelicSystem({ relicDefs, weaponDefs });
  const relicUi = createShellRelicUi({
    ui,
    content,
    documentRef,
    assetResolver: {
      relicIcon: (relic) => relic?.iconPath || content?.assets?.sprites?.ui?.quest || "",
      runUpgradeSprite: () => null,
      spriteSource: () => "",
    },
    getSave: () => readBrowserSave({ globalRef, saveConfig }),
    relicDefs,
    relicSystem,
    persist: (save) => writeBrowserSave({ globalRef, saveConfig, save }),
    renderMeta: () => {},
    scheduler: {
      clearTimeout: (timer) => globalRef.clearTimeout?.(timer),
      setTimeout: (callback, delay) => globalRef.setTimeout?.(callback, delay),
      animationSetTimeout: (callback, delay) => globalRef.setTimeout?.(callback, delay),
    },
    imageFactory: () => (typeof globalRef?.Image === "function" ? new globalRef.Image() : null),
  });

  return {
    renderInventory() {
      relicUi.renderInventory();
      return true;
    },
  };
}

function createBrowserRunUiAdapter({ documentRef, globalRef, ui }) {
  const getGameSpeed = () => readBrowserGameSpeed({ documentRef, globalRef });
  return {
    hideEndScreen() {
      toggleHidden(ui.endScreen, true);
    },
    showEndScreen(reason = "Run ended") {
      if (ui.runStats) ui.runStats.textContent = `Result: ${reason}`;
      toggleHidden(ui.endScreen, false);
    },
    updateRunHud() {
      if (ui.runHud) {
        ui.runHud.textContent = `Speed x${getGameSpeed()} | Browser UI default ready.`;
      }
      return true;
    },
  };
}

function createBrowserShellUiAdapter({
  closeEndScreen,
  closeLevelUpMenu,
  closeShopMenu,
  isAudioMuted,
  onStartAudio,
  onStartRun,
  renderInventory,
  renderShop,
  setRunMenuOpen,
  toggleAudioMute,
  ui,
}) {
  let bound = false;
  const renderInventoryPanel = renderInventory || (() => {});
  const renderShopPanel = renderShop || (() => {});
  const setMenuOpen = (open) => {
    setRunMenuOpen?.(Boolean(open));
    toggleHidden(ui.runMenu, !open);
    ui.openMenu?.setAttribute?.("aria-expanded", String(Boolean(open)));
    if (ui.exitRun) ui.exitRun.disabled = !open;
  };
  const showMenuTab = (tab) => {
    const shop = tab === "shop";
    const inventory = tab === "inventory";
    ui.menuProgressTab?.classList?.toggle("active", tab === "progress");
    ui.menuShopTab?.classList?.toggle("active", shop);
    ui.menuInventoryTab?.classList?.toggle("active", inventory);
    toggleHidden(ui.menuProgressPanel, tab !== "progress");
    toggleHidden(ui.menuShopPanel, !shop);
    toggleHidden(ui.menuInventoryPanel, !inventory);
    if (shop) renderShopPanel();
    if (inventory) renderInventoryPanel();
  };
  const showTitle = () => {
    toggleHidden(ui.titleScreen, false);
    toggleHidden(ui.startTransition, true);
    setMenuOpen(false);
    return true;
  };
  const closeStartFlow = () => {
    toggleHidden(ui.titleScreen, true);
    toggleHidden(ui.startTransition, true);
    setMenuOpen(false);
    return true;
  };
  const startFromTitle = () => {
    if (typeof onStartAudio === "function") onStartAudio();
    if (typeof onStartRun === "function") onStartRun();
  };
  const toggleMenu = () => {
    const nextOpen = ui.runMenu?.classList?.contains?.("hidden") ?? true;
    setMenuOpen(nextOpen);
    if (nextOpen) showMenuTab("progress");
  };
  const toggleFullscreen = () => {
    const documentRef = ui.canvas?.ownerDocument;
    if (!documentRef) return;
    const target = ui.canvas?.parentElement || documentRef?.documentElement;
    const fullscreenElement = documentRef?.fullscreenElement || documentRef?.webkitFullscreenElement;
    if (fullscreenElement) {
      const exitFullscreen = documentRef.exitFullscreen || documentRef.webkitExitFullscreen;
      const result = exitFullscreen?.call(documentRef);
      result?.catch?.(() => {});
      return;
    }
    const requestFullscreen = target?.requestFullscreen || target?.webkitRequestFullscreen;
    const result = requestFullscreen?.call(target);
    result?.catch?.(() => {});
  };
  const updateMuteButton = (muted = false) => {
    if (!ui.muteAudio) return;
    ui.muteAudio?.setAttribute?.("aria-pressed", String(muted));
    ui.muteAudio?.classList?.toggle("active", muted);
    if (ui.muteAudio) ui.muteAudio.textContent = muted ? "Muted" : "Sound";
  };
  const toggleMute = () => {
    const muted = toggleAudioMute?.();
    if (typeof muted === "boolean") updateMuteButton(muted);
    return muted;
  };
  return {
    bind() {
      if (bound) return true;
      bound = true;
      ui.titleStartGame?.addEventListener?.("click", startFromTitle);
      ui.openMenu?.addEventListener?.("click", toggleMenu);
      ui.closeMenu?.addEventListener?.("click", () => setMenuOpen(false));
      ui.closeLevelUp?.addEventListener?.("click", closeLevelUpMenu);
      ui.closeEnd?.addEventListener?.("click", closeEndScreen);
      ui.closeEndX?.addEventListener?.("click", closeEndScreen);
      ui.closeShop?.addEventListener?.("click", closeShopMenu);
      ui.closeShopBottom?.addEventListener?.("click", closeShopMenu);
      ui.menuProgressTab?.addEventListener?.("click", () => showMenuTab("progress"));
      ui.menuShopTab?.addEventListener?.("click", () => showMenuTab("shop"));
      ui.menuInventoryTab?.addEventListener?.("click", () => showMenuTab("inventory"));
      ui.fullscreenButton?.addEventListener?.("click", toggleFullscreen);
      ui.muteAudio?.addEventListener?.("click", toggleMute);
      updateMuteButton(isAudioMuted?.());
      showTitle();
      return true;
    },
    closeRunMenu() {
      setMenuOpen(false);
      return true;
    },
    closeStartFlow,
    showTitleScreen: showTitle,
  };
}

function createBrowserShopSystemAdapter() {
  let nativeShopSystem = null;

  function requireNativeShopSystem() {
    if (!nativeShopSystem) {
      throw new Error("Missing Tap Survivor browser native shop binding");
    }
    return nativeShopSystem;
  }

  const shopSystemAdapter = {
    closeShop(...args) {
      return requireNativeShopSystem().closeShop(...args);
    },
    getShopBonuses(...args) {
      return requireNativeShopSystem().getShopBonuses(...args);
    },
    openShop(...args) {
      return requireNativeShopSystem().openShop(...args);
    },
    renderShop(...args) {
      return requireNativeShopSystem().renderShop(...args);
    },
  };

  return {
    bindShopSystem(shopSystem) {
      if (
        !shopSystem ||
        ["closeShop", "getShopBonuses", "openShop", "renderShop"].some(
          (name) => typeof shopSystem[name] !== "function"
        )
      ) {
        throw new Error("Missing Tap Survivor browser native shop binding");
      }
      nativeShopSystem = shopSystem;
      return shopSystemAdapter;
    },
    shopSystemAdapter,
  };
}

function readBrowserSave({ globalRef, saveConfig = {} }) {
  const storage = globalRef?.localStorage;
  if (!storage) return {};
  const saveKey = saveConfig.saveKey || "tap-survivor-mvp-save-v2";
  const legacySaveKey = saveConfig.legacySaveKey || "tap-survivor-mvp-save-v1";
  const raw = storage.getItem(saveKey) || storage.getItem(legacySaveKey);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeBrowserSave({ globalRef, saveConfig = {}, save }) {
  const storage = globalRef?.localStorage;
  if (!storage) return false;
  const saveKey = saveConfig.saveKey || "tap-survivor-mvp-save-v2";
  try {
    storage.setItem(saveKey, JSON.stringify(save || {}));
    return true;
  } catch {
    return false;
  }
}

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) || null,
    removeItem: (key) => store.delete(key),
    setItem: (key, value) => store.set(key, String(value)),
  };
}

function isDrawableImage(image) {
  return Boolean(image?.complete && (image.naturalWidth || image.width));
}

function playerFacesLeft(player) {
  return Number.isFinite(player?.targetX) && Number.isFinite(player?.x) && player.targetX < player.x - 2;
}

function playerSpriteId(player) {
  if (player?.actionTimer > 0 && player?.actionSprite) return `player:${player.actionSprite}`;
  if (player?.moving) return "player:walk";
  return "player";
}

function spriteSource(definition) {
  if (typeof definition === "string") return definition;
  if (definition && typeof definition === "object") {
    return definition.src || definition.path || definition.iconSrc || "";
  }
  return "";
}

function formatBrowserTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function readBrowserGameSpeed({ documentRef, globalRef }) {
  const speedFromBody = Number(documentRef?.body?.dataset?.gameSpeed);
  if (Number.isFinite(speedFromBody) && speedFromBody > 0) return speedFromBody;
  const speedFromGlobalBody = Number(globalRef?.document?.body?.dataset?.gameSpeed);
  if (Number.isFinite(speedFromGlobalBody) && speedFromGlobalBody > 0) return speedFromGlobalBody;
  const speedButtons = [...(documentRef?.querySelectorAll?.("[data-speed]") || [])];
  const activeButton = speedButtons.find((button) => button.classList?.contains?.("active"));
  const speedFromButton = Number(activeButton?.dataset?.speed);
  return Number.isFinite(speedFromButton) && speedFromButton > 0 ? speedFromButton : 1;
}

function toggleHidden(element, hidden) {
  if (!element) return;
  if (element.classList?.add && element.classList?.remove) {
    if (hidden) element.classList.add("hidden");
    else element.classList.remove("hidden");
  }
  element.hidden = Boolean(hidden);
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

function createElementFallback(id = "") {
  const attributes = {};
  const children = [];
  let textValue = "";
  let htmlValue = "";
  return {
    id,
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
    dataset: {},
    children,
    appendChild(child) {
      children.push(child);
      return child;
    },
    prepend(child) {
      children.unshift(child);
      return child;
    },
    replaceChildren(...nextChildren) {
      children.splice(0, children.length, ...nextChildren);
    },
    addEventListener() {},
    removeEventListener() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    getAttribute(name) {
      return attributes[name];
    },
    removeAttribute(name) {
      delete attributes[name];
    },
    hidden: false,
    setAttribute(name, value) {
      attributes[name] = String(value);
    },
    get innerHTML() {
      return htmlValue;
    },
    set innerHTML(value) {
      htmlValue = String(value);
      textValue = String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      children.splice(0, children.length);
    },
    get textContent() {
      return textValue;
    },
    set textContent(value) {
      textValue = String(value);
      htmlValue = String(value);
      children.splice(0, children.length);
    },
  };
}
