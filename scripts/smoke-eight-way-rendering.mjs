import assert from "node:assert/strict";

import { createBrowserSpriteSystem } from "../src/app/browser-sprite-system.js";
import { createBrowserRenderingAdapters } from "../src/app/browser-rendering-adapters.js";
import { content } from "../src/content.generated.mjs";
import {
  DIRECTIONAL_HEADINGS,
  headingForEntity,
  resolveHeading,
} from "../src/modules/directional-facing.js";
import { createEnemyRenderer } from "../src/modules/render-enemies.js";
import { createRenderer } from "../src/modules/rendering.js";

const sectors = [
  [-1, -1, "nw"],
  [0, -1, "n"],
  [1, -1, "ne"],
  [-1, 0, "w"],
  [1, 0, "e"],
  [-1, 1, "sw"],
  [0, 1, "s"],
  [1, 1, "se"],
];

const enemyIds = [
  "drifter",
  "skitter",
  "bulwark",
  "hexer",
  "verdant_skitter",
  "dusk_crawler",
  "crimson_hexer",
  "obsidian_bulwark",
];
const bossIds = ["warden", "charger", "turret"];
const allDirectionalIds = ["player", ...enemyIds, ...bossIds];

verifyHeadingResolution();
verifyRegistryMappings();
verifyNativeEnemyRendering();
verifyNativePlayerRendering();
verifyBrowserRendering();
verifyBrowserSpriteSheetDemandLoading();

console.log(
  "Validated all eight sectors for the player, eight enemies, and three bosses in native and browser renderers.",
);
console.log(
  "Validated action/state priority, legacy/static/shape fallbacks, legacy flipping, directional no-flip, registry mappings, input non-mutation, and on-demand browser sheet loading.",
);

function verifyHeadingResolution() {
  assert.deepEqual(DIRECTIONAL_HEADINGS, sectors.map(([, , heading]) => heading));
  for (const [x, y, expected] of sectors) {
    assert.equal(resolveHeading(x, y), expected);
  }

  assert.equal(resolveHeading(0, 0), "s");
  assert.equal(resolveHeading(Number.NaN, 1, "ne"), "ne");
  assert.equal(resolveHeading(0, 0, "invalid"), "s");
  assert.equal(
    headingForEntity({
      chargeState: "charging",
      chargeDirX: -1,
      chargeDirY: 0,
      vx: 1,
      vy: 0,
      facingX: 0,
      facingY: 1,
    }),
    "w",
  );
  assert.equal(
    headingForEntity({ vx: 1, vy: 0, facingX: 0, facingY: -1 }),
    "e",
  );
  assert.equal(headingForEntity({ facingX: 0, facingY: -1 }), "n");
}

function verifyRegistryMappings() {
  const expectedFrames = {
    nw: [0, 0],
    n: [0, 1],
    ne: [0, 2],
    w: [1, 0],
    e: [1, 2],
    sw: [2, 0],
    s: [2, 1],
    se: [2, 2],
  };
  const sheets = content.assets.sprites.spriteSheets;
  const directionalIds = Object.keys(sheets)
    .filter((id) => id.startsWith("directional_"))
    .sort();

  assert.deepEqual(
    directionalIds,
    allDirectionalIds.map((id) => `directional_${id}`).sort(),
  );
  for (const id of allDirectionalIds) {
    const sheet = sheets[`directional_${id}`];
    assert.equal(sheet.id, `directional_${id}`);
    assert.equal(sheet.columns, 3);
    assert.equal(sheet.rows, 3);
    for (const [state, [row, frame]] of Object.entries(expectedFrames)) {
      assert.deepEqual(sheet.animations.move[state], {
        row,
        frames: [frame],
        fps: 1,
        loop: false,
      });
    }
  }
}

function verifyNativeEnemyRendering() {
  const { context, events } = createCanvasRecorder();
  const animationCalls = [];
  const spriteCalls = [];
  let animationResult = ({ sheet }) => sheet.startsWith("directional_");
  let spriteResult = true;
  const renderer = createEnemyRenderer({
    ctx: context,
    clamp,
    drawSprite(...args) {
      spriteCalls.push(args);
      return spriteResult;
    },
    spriteSheetRenderer: {
      drawAnimation(sheet, animationId, state, x, y, width, height, options) {
        const call = { animationId, height, options, sheet, state, width, x, y };
        animationCalls.push(call);
        return animationResult(call);
      },
    },
  });

  for (const [vx, vy, expected] of sectors) {
    for (const id of [...enemyIds, ...bossIds]) {
      animationCalls.length = 0;
      spriteCalls.length = 0;
      const entity = makeEnemy(id, vx, vy);
      const before = JSON.stringify(entity);

      renderer.drawEnemy(entity, { bossAttacks: [] });

      assert.equal(animationCalls.length, 1);
      assert.equal(animationCalls[0].sheet, `directional_${id}`);
      assert.equal(animationCalls[0].animationId, "move");
      assert.equal(animationCalls[0].state, expected);
      assert.equal(animationCalls[0].options.flipX, undefined);
      assert.equal(spriteCalls.length, 0);
      assert.equal(JSON.stringify(entity), before);
    }
  }

  const activeCases = [
    {
      entity: makeEnemy("hexer", -8, 0, {
        attackRange: 100,
        attackVisualTimer: 1,
        projectileCooldown: 1,
      }),
      expectedAnimation: "hexer",
      expectedState: "attack",
      expectedSheet: "enemies",
      game: { bossAttacks: [] },
    },
    {
      entity: makeEnemy("charger", -8, 0, {
        chargeDirX: -1,
        chargeDirY: 0,
        chargeState: "windup",
      }),
      expectedAnimation: "charger",
      expectedState: "windup",
      expectedSheet: "bosses",
      game: { bossAttacks: [] },
    },
    {
      entity: makeEnemy("turret", -8, 0, { attackVisualTimer: 1 }),
      expectedAnimation: "turret",
      expectedState: "release",
      expectedSheet: "bosses",
      game: { bossAttacks: [] },
    },
    {
      entity: makeEnemy("warden", -8, 0, { dropTimer: 0.5 }),
      expectedAnimation: "warden",
      expectedState: "windup",
      expectedSheet: "bosses",
      game: { bossAttacks: [] },
    },
  ];
  for (const activeCase of activeCases) {
    animationCalls.length = 0;
    renderer.drawEnemy(activeCase.entity, activeCase.game);
    assert.equal(animationCalls.length, 1);
    assert.equal(animationCalls[0].sheet, activeCase.expectedSheet);
    assert.equal(animationCalls[0].animationId, activeCase.expectedAnimation);
    assert.equal(animationCalls[0].state, activeCase.expectedState);
    assert.equal(animationCalls[0].options.flipX, true);
  }

  animationCalls.length = 0;
  spriteCalls.length = 0;
  animationResult = ({ sheet }) => sheet === "enemies";
  renderer.drawEnemy(makeEnemy("drifter", -8, 0), { bossAttacks: [] });
  assert.deepEqual(
    animationCalls.map(({ sheet }) => sheet),
    ["directional_drifter", "enemies"],
  );
  assert.equal(animationCalls[1].options.flipX, true);
  assert.equal(spriteCalls.length, 0);

  animationCalls.length = 0;
  spriteCalls.length = 0;
  animationResult = () => false;
  spriteResult = true;
  renderer.drawEnemy(makeEnemy("drifter", -8, 0), { bossAttacks: [] });
  assert.equal(animationCalls.length, 2);
  assert.equal(spriteCalls.length, 1);
  assert.equal(spriteCalls[0][0], "enemy:drifter");
  assert.equal(spriteCalls[0][5].flipX, true);

  animationCalls.length = 0;
  spriteCalls.length = 0;
  events.length = 0;
  spriteResult = false;
  renderer.drawEnemy(makeEnemy("warden", 1, 0), { bossAttacks: [] });
  assert.ok(hasImmediatelyFilledCircle(events, 20));
}

function verifyNativePlayerRendering() {
  const { context, events } = createCanvasRecorder();
  const spriteCalls = [];
  let spriteResult = (...args) => args[5]?.sheetId === "directional_player";
  const renderer = createRenderer({
    canvas: { height: 100, width: 100 },
    ctx: context,
    clamp,
    createEnemyRenderer: () => ({ drawEnemy() {}, drawEnemyBolt() {} }),
    createHudRenderer: () => ({
      drawBossSpawnNotice() {},
      drawGameHud() {},
      drawTowerFloorBadge() {},
    }),
    createSkillRailRenderer: () => ({}),
    drawImage: () => false,
    drawSprite(...args) {
      spriteCalls.push(args);
      return spriteResult(...args);
    },
    runUpgradeDefs: [],
    skillEffectSprites: {},
    spriteSheetRenderer: {},
    weaponDefs: {},
  });
  const game = makeNativeGame();

  for (const [x, y, expected] of sectors) {
    Object.assign(game.player, {
      actionSprite: "",
      actionTimer: 0,
      facingX: x,
      facingY: y,
      moving: true,
      vx: 0,
      vy: 0,
    });
    const before = JSON.stringify(game);
    spriteCalls.length = 0;

    renderer.draw(game);

    assert.equal(spriteCalls.length, 1);
    assert.equal(spriteCalls[0][0], "player");
    assert.equal(spriteCalls[0][4], 0);
    assert.equal(spriteCalls[0][5].sheetId, "directional_player");
    assert.equal(spriteCalls[0][5].animationId, "move");
    assert.equal(spriteCalls[0][5].animationState, expected);
    assert.equal(spriteCalls[0][5].flipX, undefined);
    assert.equal(JSON.stringify(game), before);
  }

  Object.assign(game.player, {
    actionSprite: "cast_orb",
    actionTimer: 1,
    targetX: 20,
    x: 50,
  });
  spriteCalls.length = 0;
  spriteResult = () => true;
  renderer.draw(game);
  assert.equal(spriteCalls.length, 1);
  assert.equal(spriteCalls[0][0], "player:cast_orb");
  assert.equal(spriteCalls[0][5].flipX, true);
  assert.equal(spriteCalls[0][5].sheetId, undefined);

  Object.assign(game.player, {
    actionSprite: "",
    actionTimer: 0,
    moving: true,
  });
  spriteCalls.length = 0;
  spriteResult = (...args) => args[0] === "player:walk";
  renderer.draw(game);
  assert.equal(spriteCalls.length, 2);
  assert.equal(spriteCalls[0][5].sheetId, "directional_player");
  assert.equal(spriteCalls[1][0], "player:walk");
  assert.equal(spriteCalls[1][5].flipX, true);

  spriteCalls.length = 0;
  events.length = 0;
  spriteResult = () => false;
  renderer.draw(game);
  assert.ok(hasImmediatelyFilledCircle(events, game.player.radius));
}

function verifyBrowserRendering() {
  const { context, events } = createCanvasRecorder();
  const browser = createBrowserRenderingAdapters({
    canvas: {
      getContext: () => context,
      height: 100,
      width: 100,
    },
    content: {},
  });
  const spriteCalls = [];
  let spriteResult = () => true;
  const spriteAdapters = {
    spriteSystem: {
      drawImage: () => false,
      drawSprite(...args) {
        spriteCalls.push(args);
        return spriteResult(...args);
      },
    },
  };

  const player = makePlayer();
  for (const [x, y, expected] of sectors) {
    Object.assign(player, {
      actionSprite: "",
      actionTimer: 0,
      facingX: x,
      facingY: y,
      vx: 0,
      vy: 0,
    });
    const before = JSON.stringify(player);
    spriteCalls.length = 0;

    browser.renderers.renderPlayer({ game: { player }, spriteAdapters });

    assert.equal(spriteCalls.length, 1);
    assert.equal(spriteCalls[0][0], "player");
    assert.equal(spriteCalls[0][4], 0);
    assert.equal(spriteCalls[0][5].sheetId, "directional_player");
    assert.equal(spriteCalls[0][5].animationState, expected);
    assert.equal(spriteCalls[0][5].flipX, undefined);
    assert.equal(JSON.stringify(player), before);
  }

  for (const [vx, vy, expected] of sectors) {
    for (const id of [...enemyIds, ...bossIds]) {
      const entity = makeEnemy(id, vx, vy);
      const before = JSON.stringify(entity);
      spriteCalls.length = 0;

      browser.renderers.renderEnemies({ enemies: [entity], spriteAdapters });

      assert.equal(spriteCalls.length, 1);
      assert.equal(spriteCalls[0][4], 0);
      assert.equal(spriteCalls[0][5].sheetId, `directional_${id}`);
      assert.equal(spriteCalls[0][5].animationId, "move");
      assert.equal(spriteCalls[0][5].animationState, expected);
      assert.equal(spriteCalls[0][5].flipX, undefined);
      assert.equal(JSON.stringify(entity), before);
    }
  }

  const activeCases = [
    {
      entity: makeEnemy("hexer", -8, 0, {
        attackRange: 100,
        attackVisualTimer: 1,
        projectileCooldown: 1,
      }),
      expectedAnimation: "hexer",
      expectedState: "attack",
      expectedSheet: "enemies",
    },
    {
      entity: makeEnemy("charger", -8, 0, {
        chargeDirX: -1,
        chargeDirY: 0,
        chargeState: "windup",
      }),
      expectedAnimation: "charger",
      expectedState: "windup",
      expectedSheet: "bosses",
    },
    {
      entity: makeEnemy("turret", -8, 0, { attackVisualTimer: 1 }),
      expectedAnimation: "turret",
      expectedState: "release",
      expectedSheet: "bosses",
    },
    {
      entity: makeEnemy("warden", -8, 0, { dropTimer: 0.5 }),
      expectedAnimation: "warden",
      expectedState: "windup",
      expectedSheet: "bosses",
    },
  ];
  for (const activeCase of activeCases) {
    spriteCalls.length = 0;
    browser.renderers.renderEnemies({
      enemies: [activeCase.entity],
      spriteAdapters,
    });
    assert.equal(spriteCalls.length, 1);
    assert.equal(spriteCalls[0][5].sheetId, activeCase.expectedSheet);
    assert.equal(spriteCalls[0][5].animationId, activeCase.expectedAnimation);
    assert.equal(spriteCalls[0][5].animationState, activeCase.expectedState);
    assert.equal(spriteCalls[0][5].flipX, true);
  }

  Object.assign(player, {
    actionSprite: "cast_orb",
    actionTimer: 1,
    targetX: 20,
    x: 50,
  });
  spriteCalls.length = 0;
  browser.renderers.renderPlayer({ game: { player }, spriteAdapters });
  assert.equal(spriteCalls.length, 1);
  assert.equal(spriteCalls[0][0], "player:cast_orb");
  assert.equal(spriteCalls[0][5].flipX, true);

  Object.assign(player, {
    actionSprite: "",
    actionTimer: 0,
    moving: true,
  });
  spriteCalls.length = 0;
  spriteResult = (...args) => args[0] === "player:walk";
  browser.renderers.renderPlayer({ game: { player }, spriteAdapters });
  assert.equal(spriteCalls.length, 2);
  assert.equal(spriteCalls[0][5].sheetId, "directional_player");
  assert.equal(spriteCalls[1][0], "player:walk");
  assert.equal(spriteCalls[1][5].flipX, true);

  spriteCalls.length = 0;
  spriteResult = (...args) => args[5]?.sheetId === "enemies";
  browser.renderers.renderEnemies({
    enemies: [makeEnemy("drifter", -8, 0)],
    spriteAdapters,
  });
  assert.equal(spriteCalls.length, 2);
  assert.equal(spriteCalls[0][5].sheetId, "directional_drifter");
  assert.equal(spriteCalls[1][5].sheetId, "enemies");
  assert.equal(spriteCalls[1][5].flipX, true);

  events.length = 0;
  spriteCalls.length = 0;
  spriteResult = () => false;
  browser.renderers.renderEnemies({
    enemies: [makeEnemy("warden", 1, 0)],
    spriteAdapters,
  });
  assert.ok(hasImmediatelyFilledBossShape(events));

  events.length = 0;
  spriteCalls.length = 0;
  browser.renderers.renderPlayer({ game: { player }, spriteAdapters });
  assert.ok(hasImmediatelyFilledCircle(events, player.radius));
}

function verifyBrowserSpriteSheetDemandLoading() {
  const requests = [];
  const images = new Map();
  class DeferredImage {
    constructor() {
      this.complete = false;
      this.listeners = new Map();
      this.naturalHeight = 0;
      this.naturalWidth = 0;
      this.source = "";
    }

    addEventListener(type, callback) {
      this.listeners.set(type, callback);
    }

    get src() {
      return this.source;
    }

    set src(value) {
      this.source = value;
      requests.push(value);
      images.set(value, this);
      if (!String(value).includes("directional-")) this.finish(64, 64);
    }

    finish(width, height) {
      this.complete = true;
      this.naturalHeight = height;
      this.naturalWidth = width;
      this.listeners.get("load")?.();
    }
  }

  const { context } = createCanvasRecorder();
  const spriteSystem = createBrowserSpriteSystem({
    assetDefs: {
      sprites: {
        enemies: { drifter: "static-drifter.png" },
        player: "static-player.png",
        spriteSheets: {
          directional_drifter: directionalSheet("directional-drifter.png"),
          directional_player: directionalSheet("directional-player.png"),
          directional_skitter: directionalSheet("directional-skitter.png"),
        },
      },
    },
    canvas: { getContext: () => context },
    globalRef: { Image: DeferredImage, performance: { now: () => 0 } },
  });

  assert.equal(spriteSystem.loadSprites(), true);
  assert.deepEqual(requests, ["static-player.png", "static-drifter.png"]);

  assert.equal(
    spriteSystem.drawSprite("player", 20, 20, 32, 0, {
      animationId: "move",
      animationState: "n",
      sheetId: "directional_player",
    }),
    true,
  );
  assert.deepEqual(requests, [
    "static-player.png",
    "static-drifter.png",
    "directional-player.png",
  ]);

  spriteSystem.drawSprite("player", 20, 20, 32, 0, {
    animationId: "move",
    animationState: "n",
    sheetId: "directional_player",
  });
  assert.equal(requests.filter((src) => src === "directional-player.png").length, 1);

  images.get("directional-player.png").finish(576, 576);
  assert.equal(
    spriteSystem.drawSprite("player", 20, 20, 32, 0, {
      animationId: "move",
      animationState: "n",
      sheetId: "directional_player",
    }),
    true,
  );

  assert.equal(
    spriteSystem.drawSprite("enemy:drifter", 20, 20, 32, 0, {
      animationId: "move",
      animationState: "e",
      sheetId: "directional_drifter",
    }),
    true,
  );
  assert.equal(requests.filter((src) => src === "directional-drifter.png").length, 1);
  assert.equal(requests.includes("directional-skitter.png"), false);

  spriteSystem.drawSprite("enemy:drifter", 20, 20, 32, 0, {
    animationId: "missing",
    animationState: "e",
    sheetId: "directional_skitter",
  });
  assert.equal(requests.includes("directional-skitter.png"), false);
}

function directionalSheet(path) {
  return {
    animations: {
      move: Object.fromEntries(
        sectors.map(([, , heading], index) => [
          heading,
          {
            fps: 1,
            frames: [index >= 4 ? index + 1 : index],
            loop: false,
            row: Math.floor((index >= 4 ? index + 1 : index) / 3),
          },
        ]),
      ),
    },
    columns: 3,
    path,
    rows: 3,
  };
}

function makeEnemy(id, vx, vy, overrides = {}) {
  const boss = bossIds.includes(id);
  const base = {
    animTime: 1.25,
    color: "#63d6b0",
    facingX: vx,
    facingY: vy,
    hp: 10,
    maxHp: 10,
    radius: boss ? 20 : 8,
    towerFloor: 1,
    vx,
    vy,
    x: 10,
    y: 10,
  };
  if (boss) {
    Object.assign(base, {
      boss: true,
      bossAbilities: [id],
      bossKind: id,
      chargeState: "",
      dropTimer: 0,
      projectileCooldown: 1,
      shootTimer: 1,
    });
  } else {
    Object.assign(base, { assetId: id, type: id });
  }
  return Object.assign(base, overrides);
}

function makePlayer() {
  return {
    actionSprite: "",
    actionTimer: 0,
    animTime: 1.25,
    blinkTimer: 0,
    facingX: 0,
    facingY: 1,
    hp: 10,
    invincibleTimer: 0,
    maxHp: 10,
    moving: true,
    pickupRadius: 24,
    projectileBlockCharge: 0,
    projectileBlockNeeded: 1,
    projectileBlockReady: false,
    radius: 10,
    targetX: 50,
    targetY: 50,
    vx: 0,
    vy: 0,
    x: 50,
    y: 50,
  };
}

function makeNativeGame() {
  return {
    areas: [],
    beams: [],
    bolts: [],
    bossAttacks: [],
    enemies: [],
    enemyBolts: [],
    lootDrops: [],
    pickupTexts: [],
    player: makePlayer(),
    weaponBursts: [],
    xpDrops: [],
  };
}

function createCanvasRecorder() {
  const events = [];
  const target = {
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
  };
  const context = new Proxy(target, {
    get(object, property) {
      if (Reflect.has(object, property)) return Reflect.get(object, property);
      return (...args) => {
        events.push([String(property), ...args]);
      };
    },
    set(object, property, value) {
      events.push([`set:${String(property)}`, value]);
      return Reflect.set(object, property, value);
    },
  });
  return { context, events };
}

function hasImmediatelyFilledCircle(events, radius) {
  return events.some(
    (event, index) =>
      event[0] === "arc" &&
      event[3] === radius &&
      events[index + 1]?.[0] === "fill",
  );
}

function hasImmediatelyFilledBossShape(events) {
  return events.some(
    (event, index) =>
      event[0] === "closePath" && events[index + 1]?.[0] === "fill",
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
