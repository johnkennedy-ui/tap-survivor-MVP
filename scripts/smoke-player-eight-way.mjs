import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { createBrowserRenderingAdapters } from "../src/app/browser-rendering-adapters.js";
import { createBrowserSpriteSystem } from "../src/app/browser-sprite-system.js";
import { content } from "../src/content.generated.mjs";
import { headingForEntity, resolveHeading } from "../src/modules/directional-facing.js";
import { createModuleGameLifecycleOwner } from "../src/modules/module-game-lifecycle.js";
import { createRenderer } from "../src/modules/rendering.js";
import { createRunStateSystem } from "../src/modules/run-state.js";
import { createRunUpdater } from "../src/modules/run-update.js";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/player-eight-way.json", import.meta.url))
);
const [expectedHash, expectedPath] = readFileSync(
  new URL("./fixtures/player-move.sha256", import.meta.url),
  "utf8"
)
  .trim()
  .split(/\s+/);
const sheet = content.assets.sprites.spriteSheets[fixture.sheetId];
const asset = readFileSync(new URL(`../${fixture.path}`, import.meta.url));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const noop = () => {};

assert.equal(fixture.path, expectedPath);
assert.equal(sheet.path.split("?")[0], fixture.path);
assert.equal(createHash("sha256").update(asset).digest("hex"), expectedHash);
assert.equal(asset.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
assert.equal(asset.toString("ascii", 12, 16), "IHDR");
assert.equal(asset.readUInt32BE(16), fixture.width);
assert.equal(asset.readUInt32BE(20), fixture.height);
assert.equal(asset[24], 8, "8-bit PNG");
assert.equal(asset[25], 6, "RGBA PNG");
assert.equal(sheet.columns, 3);
assert.equal(sheet.rows, 8);
for (const { id, row } of fixture.headings) {
  assert.deepEqual(sheet.animations.move[id], { row, frames: [0, 1, 2], fps: 8, loop: true });
}

verifySectorBoundaries();
verifyRunClocks();
for (const path of ["native", "browser"]) {
  verifyActualFrames(path);
  verifyFallbacks(path);
  verifyTickToDraw(path);
}
console.log(
  "Player eight-way PASS: exact approved RGBA atlas; 128 real frame crops across native/browser render paths; sector boundaries, tick-to-draw clocks, idle/pause/input gates, action/static/shape fallbacks, lazy loading and non-mutation."
);

function freshGame() {
  const save = {
    towerFloor: 3,
    selectedStartingWeapon: "spark_bolt",
    unlockedWeapons: ["spark_bolt"],
  };
  const before = JSON.stringify(save);
  const state = createRunStateSystem({
    canvas: { width: 1000, height: 1000 },
    getSave: () => save,
    getShopBonuses: () => ({ maxHp: 0, speed: 0, pickupRadius: 0 }),
    getUpgradeTier: () => 0,
    maxEquippedWeapons: () => 3,
    weaponDefs: { spark_bolt: {} },
  });
  const game = state.resetGameState();
  assert.equal(JSON.stringify(save), before, "run construction must not mutate save");
  return game;
}

function updaterFor(game, calls = []) {
  const combat = Object.fromEntries(
    [
      "spawnBoss",
      "spawnEnemies",
      "updateEnemies",
      "updateEnemyBolts",
      "updateBossSpecials",
      "updateWeapons",
      "updateBolts",
      "updateAreas",
      "updateBeams",
      "updateWeaponBursts",
    ].map((name) => [name, (dt) => calls.push([name, dt])])
  );
  const pickupSystem = Object.fromEntries(
    ["updateXpDrops", "updateLootDrops", "updatePickupTexts"].map((name) => [
      name,
      (dt) => calls.push([name, dt]),
    ])
  );
  return createRunUpdater({
    canvas: { width: 1000, height: 1000 },
    getGame: () => game,
    combat,
    pickupSystem,
    addQuestProgressGroup: noop,
    survivalQuestIds: [],
    xpQuestIds: [],
    levelQuestIds: [],
    showLevelUp: noop,
    endRun: noop,
    getRelicSpecialEffects: () => ({}),
    clamp,
  });
}

function ownerFor(game, runUpdater) {
  return createModuleGameLifecycleOwner({
    platform: { documentRef: {}, runtimeGlobal: {} },
    runtime: {},
    dependencies: { getGame: () => game, runUpdater, shellUi: {} },
  });
}

function withoutClock(game) {
  const copy = structuredClone(game);
  delete copy.player.animTime;
  return copy;
}

function verifyRunClocks() {
  const initial = freshGame().player;
  assert.equal(initial.animTime, 0);
  assert.equal(initial.moving, false);
  assert.equal(headingForEntity(initial), "s");
  assert.equal(initial.speed, 185);
  assert.equal(initial.radius, 16);
  for (const mode of ["updater", "owner-delegated", "owner-fallback"]) {
    for (const heading of fixture.headings) {
      const game = freshGame();
      const player = game.player;
      player.targetX += heading.x * 200;
      player.targetY += heading.y * 200;
      const updater = updaterFor(game);
      const owner = ownerFor(game, mode === "owner-delegated" ? updater : undefined);
      const tick = mode === "updater" ? updater.update : owner.tick;
      for (const key of ["paused", "awaitingFirstMoveInput"]) {
        game[key] = true;
        const before = JSON.stringify(game);
        tick(0.125);
        assert.equal(JSON.stringify(game), before, `${mode}: ${key} freezes all state`);
        game[key] = false;
      }
      game.running = false;
      const stopped = JSON.stringify(game);
      tick(0.125);
      assert.equal(JSON.stringify(game), stopped);
      game.running = true;
      const norm = Math.hypot(heading.x, heading.y);
      for (let i = 1; i <= 3; i++) {
        tick(0.125);
        assert.equal(player.animTime, i / 8, `${mode}: clock advances exactly once`);
        assert.equal(headingForEntity(player), heading.id);
        assert.ok(Math.abs(player.x - (500 + ((heading.x / norm) * 185 * i) / 8)) < 1e-9);
        assert.ok(Math.abs(player.y - (500 + ((heading.y / norm) * 185 * i) / 8)) < 1e-9);
      }
      player.targetX = player.x;
      player.targetY = player.y;
      tick(0.125);
      assert.equal(player.animTime, 0, `${mode}: idle rests at frame zero`);
      assert.equal(player.moving, false);
      assert.equal(headingForEntity(player), heading.id, "idle retains last facing");
      player.targetX += 100;
      tick(0.125);
      assert.equal(player.animTime, 0.125);
      assert.equal(headingForEntity(player), "e");
    }
  }

  const left = freshGame();
  const right = freshGame();
  const leftCalls = [];
  const rightCalls = [];
  left.player.animTime = 0;
  right.player.animTime = 1234;
  for (const game of [left, right]) {
    Object.assign(game.player, {
      x: 970,
      targetX: 1200,
      targetY: 500,
      actionSprite: "cast_orb",
      actionTimer: 0.2,
    });
  }
  updaterFor(left, leftCalls).update(0.125);
  updaterFor(right, rightCalls).update(0.125);
  assert.deepEqual(
    withoutClock(left),
    withoutClock(right),
    "presentation clock cannot affect gameplay state"
  );
  assert.deepEqual(
    leftCalls,
    rightCalls,
    "combat/pickup calls and dt cannot depend on presentation phase"
  );
  assert.equal(left.player.x, 982, "existing arena clamp");
  assert.equal(left.player.actionTimer, 0.07500000000000001, "existing action countdown");
  updaterFor(left).update(0.125);
  assert.equal(left.player.actionTimer, 0);
  assert.equal(left.player.actionSprite, "", "existing action expiry");
  const near = freshGame();
  near.player.targetX += 3;
  updaterFor(near).update(0.125);
  assert.equal(near.player.x, 500, "existing movement dead zone");
  assert.equal(near.player.animTime, 0);
}

function verifySectorBoundaries() {
  const circle = ["e", "ne", "n", "nw", "w", "sw", "s", "se"];
  for (let sector = 0; sector < circle.length; sector++) {
    for (const offset of [-22.499, 0, 22.499]) {
      const angle = ((sector * 45 + offset) * Math.PI) / 180;
      assert.equal(resolveHeading(Math.cos(angle), -Math.sin(angle)), circle[sector]);
    }
    const angle = ((sector * 45 + 22.501) * Math.PI) / 180;
    assert.equal(resolveHeading(Math.cos(angle), -Math.sin(angle)), circle[(sector + 1) % 8]);
  }
  assert.equal(resolveHeading(0, 0, "nw"), "nw");
  assert.equal(resolveHeading(Number.NaN, 0, "ne"), "ne");
}

function renderHarness(path, { ready = () => true, sprites = content.assets.sprites } = {}) {
  const events = [];
  const requested = [];
  const images = [];
  const diagnostics = { spriteDraws: [] };
  const context = new Proxy(
    { globalAlpha: 0.8, imageSmoothingEnabled: true },
    {
      get(target, key) {
        if (key in target) return target[key];
        return (...args) => events.push([key, ...args]);
      },
    }
  );
  class ImageStub {
    addEventListener() {}
    set src(value) {
      this._src = value;
      requested.push(value);
      images.push(this);
      const isPlayerSheet = value.split("?")[0] === fixture.path;
      this.naturalWidth = isPlayerSheet ? fixture.width : 384;
      this.naturalHeight = isPlayerSheet ? fixture.height : 384;
      this.complete = ready(value);
    }
    get src() {
      return this._src;
    }
  }
  const canvas = {
    width: 1000,
    height: 1000,
    getContext: () => context,
    ownerDocument: { __TapSurvivorBrowserSmoke: { diagnostics } },
  };
  const spriteSystem = createBrowserSpriteSystem({ canvas, globalRef: { Image: ImageStub } });
  spriteSystem.loadSprites(sprites);
  const draw =
    path === "browser"
      ? (game) =>
          createBrowserRenderingAdapters({ canvas, content }).renderers.renderPlayer({
            game,
            spriteAdapters: { spriteSystem },
          })
      : createRenderer({
          canvas,
          ctx: context,
          clamp,
          createEnemyRenderer: () => ({ drawEnemy: noop, drawEnemyBolt: noop }),
          createHudRenderer: () => ({
            drawBossSpawnNotice: noop,
            drawGameHud: noop,
            drawTowerFloorBadge: noop,
          }),
          createSkillRailRenderer: () => ({}),
          drawImage: () => false,
          drawSprite: spriteSystem.drawSprite,
          weaponDefs: {},
        }).draw;
  return { context, diagnostics, draw, events, images, requested };
}

function verifyActualFrames(path) {
  const harness = renderHarness(path);
  assert.equal(harness.requested.includes(sheet.path), false, "sheet loading is lazy");
  const game = freshGame();
  for (const heading of fixture.headings) {
    for (const sample of fixture.samples) {
      Object.assign(game.player, {
        facingX: heading.x,
        facingY: heading.y,
        moving: true,
        animTime: sample.time,
      });
      const before = JSON.stringify(game);
      harness.events.length = 0;
      harness.draw(game);
      assert.equal(JSON.stringify(game), before, `${path}: rendering must not mutate game/player`);
      const crop = harness.events.find(
        ([method, image]) => method === "drawImage" && image.src === sheet.path
      );
      assert.ok(crop, `${path}: real player sheet must draw`);
      assert.deepEqual(crop.slice(2, 6), [sample.frame * 128, heading.row * 128, 128, 128]);
      assert.equal(harness.context.imageSmoothingEnabled, true);
      assert.equal(harness.context.globalAlpha, 0.8);
      assert.equal(
        harness.events.some(([method, x, y]) => method === "scale" && (x < 0 || y < 0)),
        false,
        "directional frame must not be mirrored"
      );
    }
  }
  assert.equal(
    harness.requested.filter((src) => src === sheet.path).length,
    1,
    "sheet requested once"
  );
  for (const [id, other] of Object.entries(content.assets.sprites.spriteSheets)) {
    if (id !== fixture.sheetId)
      assert.equal(harness.requested.includes(other.path), false, `${id} stays lazy`);
  }
}

function verifyTickToDraw(path) {
  const harness = renderHarness(path);
  const game = freshGame();
  game.player.targetY -= 400;
  const owner = ownerFor(game, updaterFor(game));
  for (const frame of [1, 2, 0]) {
    owner.tick(0.125);
    harness.events.length = 0;
    harness.draw(game);
    const crop = harness.events.find(
      ([method, image]) => method === "drawImage" && image.src === sheet.path
    );
    assert.deepEqual(
      crop.slice(2, 6),
      [frame * 128, 128, 128, 128],
      `${path}: actual updater reaches actual frame selector`
    );
  }
}

function verifyFallbacks(path) {
  const game = freshGame();
  game.player.moving = true;
  const pending = renderHarness(path, { ready: (src) => src !== sheet.path });
  pending.draw(game);
  assert.ok(
    pending.diagnostics.spriteDraws.some(
      (entry) =>
        entry.success && entry.source === "staticFallbackAfterSpriteSheet" && entry.id === "player"
    )
  );
  assert.equal(pending.requested.filter((src) => src === sheet.path).length, 1);
  pending.images.find((image) => image.src === sheet.path).complete = true;
  pending.diagnostics.spriteDraws.length = 0;
  pending.draw(game);
  assert.ok(
    pending.diagnostics.spriteDraws.some((entry) => entry.success && entry.source === "spriteSheet")
  );

  const unavailable = renderHarness(path, { ready: () => false });
  const before = JSON.stringify(game);
  unavailable.draw(game);
  assert.equal(JSON.stringify(game), before);
  assert.ok(
    unavailable.events.some(
      ([method, , , radius], index) =>
        method === "arc" &&
        radius === game.player.radius &&
        unavailable.events[index + 1]?.[0] === "fill"
    ),
    "missing images use player shape"
  );

  const walk = renderHarness(path, {
    sprites: { playerAnimations: { walk: content.assets.sprites.playerAnimations.walk } },
  });
  walk.draw(game);
  assert.ok(
    walk.diagnostics.spriteDraws.some((entry) => entry.success && entry.id === "player:walk"),
    "legacy walk survives when sheet/static player are absent"
  );

  Object.assign(game.player, { actionTimer: 1, actionSprite: "cast_orb", targetX: 100 });
  const action = renderHarness(path);
  action.draw(game);
  assert.equal(action.requested.includes(sheet.path), false, "action does not demand move sheet");
  assert.ok(
    action.diagnostics.spriteDraws.some((entry) => entry.id === "player:cast_orb" && entry.success)
  );
  assert.ok(
    action.events.some(([method, x]) => method === "scale" && x === -1),
    "legacy action flip is retained"
  );
  const missingAction = renderHarness(path, {
    sprites: {
      player: content.assets.sprites.player,
      spriteSheets: content.assets.sprites.spriteSheets,
    },
  });
  missingAction.draw(game);
  assert.deepEqual(
    missingAction.diagnostics.spriteDraws
      .filter((entry) => entry.kind === "drawSprite")
      .map(({ id, success }) => [id, success]),
    [
      ["player:cast_orb", false],
      ["player", true],
    ]
  );
  assert.equal(
    missingAction.requested.includes(sheet.path),
    false,
    "missing action retains static fallback, not directional movement"
  );
}
